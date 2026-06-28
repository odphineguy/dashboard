import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
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
  const { user } = useAuth()
  const supabase = useSupabase()

  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [limits, setLimits] = useState(null)

  const loadSubscription = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, stripe_customer_id')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        throw profileError
      }

      if (!profile) {
        setSubscription({ tier: 'basic', status: 'active', stripeCustomerId: null })
        setLoading(false)
        return
      }

      let subscriptionDetails = null
      if (profile.subscription_tier !== 'basic') {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing', 'past_due'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        subscriptionDetails = subData
      }

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
      setSubscription({ tier: 'basic', status: 'active', stripeCustomerId: null })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubscription()
  }, [user?.id])

  const checkFeatureAccess = (feature) => {
    if (!subscription) return false
    const tier = subscription.tier
    const status = subscription.status

    if (!['active', 'trialing'].includes(status)) {
      return false
    }

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

  const canAddPantryItem = async () => {
    if (!user?.id) return false
    try {
      const { data } = await supabase.rpc('can_add_pantry_item', { p_user_id: user.id })
      return data
    } catch (error) {
      console.error('Error checking pantry item limit:', error)
      return false
    }
  }

  const getUsageCounts = async () => {
    if (!user?.id) return null
    try {
      const [pantryCount, storageCount, membersCount] = await Promise.all([
        supabase.from('pantry_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('storage_locations').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('household_members').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
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

  const stripeUnavailable = async () => {
    throw new Error('Subscriptions are managed in the Meal Saver iOS app.')
  }

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
    createCheckoutSession: stripeUnavailable,
    openCustomerPortal: stripeUnavailable,
    cancelSubscription: stripeUnavailable,
    upgradeSubscription: stripeUnavailable,
    syncSubscriptionFromStripe: stripeUnavailable,
    refreshSubscription,
  }

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}
