import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react'
import { useSupabase } from '../hooks/useSupabase'

const SubscriptionContext = createContext({})

export const useSubscription = () => {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider')
  }
  return context
}

export const SubscriptionProvider = ({ children }) => {
  const { user: supabaseUser } = useAuth()
  const { user: clerkUser } = useUser()
  const clerkAuth = useClerkAuth() // Get Clerk auth hook
  const getToken = clerkAuth?.getToken || null // Safely extract getToken
  const supabase = useSupabase() // Use authenticated Supabase client

  // Use Clerk user if available, otherwise Supabase
  const user = clerkUser || supabaseUser

  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [limits, setLimits] = useState(null)

  // Load subscription data
  const loadSubscription = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Get profile with subscription info
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, stripe_customer_id')
        .eq('id', user.id)
        .maybeSingle() // Use maybeSingle to allow 0 rows without throwing error

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        throw profileError
      }

      // If no profile exists yet, wait for it to be created
      if (!profile) {
        console.log('Profile not found yet, waiting for sync...')
        setSubscription({
          tier: 'basic',
          status: 'active',
          stripeCustomerId: null,
        })
        setLoading(false)
        return
      }

      // Get active subscription details if not basic tier
      let subscriptionDetails = null
      if (profile.subscription_tier !== 'basic') {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing', 'past_due'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        subscriptionDetails = subData
      }

      // Get subscription limits
      const { data: limitsData } = await supabase.rpc('get_subscription_limits', {
        p_user_id: user.id,
      })

      setSubscription({
        tier: profile.subscription_tier || 'basic',
        status: profile.subscription_status || 'active',
        stripeCustomerId: profile.stripe_customer_id,
        ...subscriptionDetails,
      })

      setLimits(limitsData?.[0] || null)
    } catch (error) {
      console.error('Error loading subscription:', error)
      // Set defaults on error
      setSubscription({
        tier: 'basic',
        status: 'active',
        stripeCustomerId: null,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubscription()
  }, [user?.id, supabase])

  // Check if user has access to a feature
  const checkFeatureAccess = (feature) => {
    if (!subscription) return false

    const tier = subscription.tier
    const status = subscription.status

    // Must have active subscription
    if (!['active', 'trialing'].includes(status)) {
      return false
    }

    // Feature access rules
    const basicFeatures = ['basic_inventory', 'basic_scanner', 'basic_recipes', 'basic_analytics']
    const premiumFeatures = [
      'unlimited_items',
      'unlimited_scanner',
      'advanced_recipes',
      'advanced_analytics',
      'priority_support',
      'all_notifications',
      'extra_storage_locations',
      'household_members_3',
    ]
    const householdFeatures = [
      'household_management',
      'unlimited_household_members',
      'unlimited_storage_locations',
      'household_analytics',
      'role_permissions',
    ]

    if (basicFeatures.includes(feature)) return true
    if (premiumFeatures.includes(feature)) return ['premium', 'household_premium'].includes(tier)
    if (householdFeatures.includes(feature)) return tier === 'household_premium'

    return false
  }

  // Check if user can add more pantry items
  const canAddPantryItem = async () => {
    if (!user?.id) return false

    try {
      const { data } = await supabase.rpc('can_add_pantry_item', {
        p_user_id: user.id,
      })
      return data
    } catch (error) {
      console.error('Error checking pantry item limit:', error)
      return false
    }
  }

  // Get current usage counts
  const getUsageCounts = async () => {
    if (!user?.id) return null

    try {
      const [pantryCount, storageCount, membersCount] = await Promise.all([
        supabase
          .from('pantry_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('storage_locations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('household_members')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ])

      return {
        pantryItems: pantryCount.count || 0,
        storageLocations: storageCount.count || 0,
        householdMembers: membersCount.count || 0,
      }
    } catch (error) {
      console.error('Error getting usage counts:', error)
      return null
    }
  }

  // Create checkout session
  const createCheckoutSession = async ({ priceId, planTier, billingInterval }) => {
    if (!user) throw new Error('User not authenticated')

    const successUrl = `${window.location.origin}/?payment_success=true&tier=${planTier}`
    const cancelUrl = `${window.location.origin}/?payment_canceled=true`

    // Get Clerk session token for Supabase edge function authentication
    const clerkToken = clerkUser && getToken ? await getToken().catch(() => null) : null

    if (!clerkToken && clerkUser) {
      throw new Error('Failed to get authentication token. Please try signing in again.')
    }

    const requestBody = {
      priceId,
      successUrl,
      cancelUrl,
      planTier,
      billingInterval,
      // Pass Clerk user data if available
      clerkUserId: clerkUser?.id || user?.id || null,
      userEmail: clerkUser?.primaryEmailAddress?.emailAddress || supabaseUser?.email || null,
      userName: clerkUser?.fullName || clerkUser?.firstName || supabaseUser?.user_metadata?.full_name || null,
    }

    // Manually call the edge function with Authorization header
    // Supabase's functions.invoke() may not use global fetch interceptor properly
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Always use anon key for Supabase gateway auth; pass Clerk token separately
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
        ...(clerkToken ? { 'x-clerk-token': clerkToken } : {}),
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = 'Failed to create checkout session'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.error || errorMessage
      } catch {
        errorMessage = errorText || `Edge Function returned a non-2xx status code`
      }
      throw new Error(errorMessage)
    }

    const data = await response.json()

    if (!data) {
      throw new Error('No data returned from checkout session')
    }

    console.log('Checkout session response:', data)
    return data
  }

  // Open customer portal
  const openCustomerPortal = async () => {
    if (!user) throw new Error('User not authenticated')
    if (!subscription?.stripeCustomerId) {
      throw new Error('No Stripe customer found. Please subscribe first.')
    }

    const returnUrl = `${window.location.origin}/profile`

    const { data, error } = await supabase.functions.invoke('create-customer-portal-session', {
      body: { returnUrl },
    })

    if (error) throw error

    // Redirect to portal
    window.location.href = data.url
  }

  // Cancel subscription
  const cancelSubscription = async (cancelImmediately = false) => {
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase.functions.invoke('cancel-subscription', {
      body: { cancelImmediately },
    })

    if (error) throw error

    // Reload subscription data
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', user.id)
      .single()

    setSubscription((prev) => ({
      ...prev,
      tier: profile.subscription_tier,
      status: profile.subscription_status,
    }))

    return data
  }

  // Upgrade subscription (create new checkout session)
  const upgradeSubscription = async ({ tier, billingInterval = 'month' }) => {
    // Map tier to price ID
    const PRICE_IDS = {
      premium: {
        month: 'price_1SKiIoIqliEA9Uot0fgA3c8M',
        year: 'price_1SIuGNIqliEA9UotGD93WZdc',
      },
      household_premium: {
        month: 'price_1SIuGPIqliEA9UotfLjoddkj',
        year: 'price_1SIuGSIqliEA9UotuHlR3qoH',
      },
    }

    const priceId = PRICE_IDS[tier]?.[billingInterval]
    if (!priceId) throw new Error('Invalid tier or billing interval')

    return await createCheckoutSession({
      priceId,
      planTier: tier,
      billingInterval,
    })
  }

  // Refresh subscription data (useful after payment completion)
  const refreshSubscription = async () => {
    await loadSubscription()
  }

  const value = {
    subscription,
    limits,
    loading,
    checkFeatureAccess,
    canAddPantryItem,
    getUsageCounts,
    createCheckoutSession,
    openCustomerPortal,
    cancelSubscription,
    upgradeSubscription,
    refreshSubscription,
  }

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}
