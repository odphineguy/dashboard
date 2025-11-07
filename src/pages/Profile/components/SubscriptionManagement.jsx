import React, { useState, useEffect } from 'react'
import { CreditCard, Crown, Users, CheckCircle, XCircle, Calendar, X } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { useSupabase } from '../../../hooks/useSupabase'
import { useAuth } from '@clerk/clerk-react'

const SubscriptionManagement = ({ userData, onUpdateSubscription }) => {
  const supabase = useSupabase() // Use authenticated Supabase client with Clerk JWT
  const { getToken } = useAuth() // Get Clerk token getter
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showPlanSelector, setShowPlanSelector] = useState(false)

  // Load subscription data
  useEffect(() => {
    const loadSubscription = async () => {
      if (!userData?.subscriptionTier || userData.subscriptionTier === 'basic') {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading subscription:', error)
        }

        setSubscription(data)
      } catch (error) {
        console.error('Error loading subscription:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSubscription()
  }, [userData?.id, userData?.subscriptionTier])

  const getTierDisplayName = (tier) => {
    switch (tier) {
      case 'basic':
        return 'Basic'
      case 'premium':
        return 'Premium'
      case 'household_premium':
        return 'Household Premium'
      default:
        return 'Basic'
    }
  }

  const getTierIcon = (tier) => {
    switch (tier) {
      case 'basic':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'premium':
        return <Crown className="h-5 w-5 text-yellow-600" />
      case 'household_premium':
        return <Users className="h-5 w-5 text-purple-600" />
      default:
        return <CheckCircle className="h-5 w-5 text-green-600" />
    }
  }

  const getTierColor = (tier) => {
    switch (tier) {
      case 'basic':
        return 'bg-green-100 text-green-800'
      case 'premium':
        return 'bg-yellow-100 text-yellow-800'
      case 'household_premium':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-green-100 text-green-800'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'past_due':
        return 'bg-red-100 text-red-800'
      case 'canceled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleManageSubscription = async () => {
    try {
      setActionLoading(true)

      // Get Clerk session token for Supabase edge function authentication
      const clerkToken = await getToken().catch(() => null)

      if (!clerkToken) {
        console.error('Failed to get Clerk token')
        alert('Failed to authenticate. Please try signing in again.')
        return
      }

      // Prepare request body
      const requestBody = {
        returnUrl: window.location.href,
        clerkUserId: userData.id,
      }

      console.log('Invoking create-customer-portal-session with:', {
        hasClerkUser: !!userData.id,
        hasClerkToken: !!clerkToken,
        clerkUserId: requestBody.clerkUserId,
        returnUrl: requestBody.returnUrl,
      })

      // Manually call the edge function with Authorization header
      // Supabase's functions.invoke() may not use global fetch interceptor properly
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      // Manually call the edge function with Authorization header
      // Supabase's functions.invoke() may not use global fetch interceptor properly
      const response = await fetch(`${supabaseUrl}/functions/v1/create-customer-portal-session`, {
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
        let errorMessage = 'Failed to open subscription management'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = errorText || `Edge Function returned status ${response.status}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      if (!data) {
        throw new Error('No data returned from customer portal session')
      }

      // Redirect to portal
      window.location.href = data.url
    } catch (error) {
      console.error('Error opening customer portal:', error)
      
      // Better error message for missing customer ID
      if (error.message?.includes('No Stripe customer found') || error.message?.includes('Please subscribe first')) {
        alert('Your subscription is still being set up. Please wait a few moments and try again.')
      } else {
        alert(`Failed to open subscription management: ${error.message || 'Please try again.'}`)
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpgrade = () => {
    // Basic users: show plan selector modal
    if (userData?.subscriptionTier === 'basic') {
      setShowPlanSelector(true)
    } else {
      // Paid users: use customer portal
      handleManageSubscription()
    }
  }

  const handlePlanSelect = async (planTier, billingInterval) => {
    try {
      setActionLoading(true)
      setShowPlanSelector(false)

      const PRICE_IDS = {
        premium: {
          month: 'price_1SOSNiIWZQ4LZaTjtxDaAhDe',
          year: 'price_1SOSLDIWZQ4LZaTju4d1x4Kl'
        },
        household_premium: {
          month: 'price_1SOSMNIWZQ4LZaTjUFica6uR',
          year: 'price_1SOSMzIWZQ4LZaTjv77IRyqJ'
        }
      }

      const priceId = PRICE_IDS[planTier][billingInterval]

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId,
          successUrl: `${window.location.origin}/profile?upgrade=success`,
          cancelUrl: `${window.location.origin}/profile?upgrade=canceled`,
          planTier,
          billingInterval,
          clerkUserId: userData.id,
          userEmail: userData.email,
          userName: userData.name
        }
      })

      if (error) {
        console.error('Error creating checkout session:', error)
        alert('Failed to start upgrade process. Please try again.')
        return
      }

      window.location.href = data.url
    } catch (error) {
      console.error('Error upgrading:', error)
      alert('Failed to start upgrade process. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </Card>
    )
  }

  return (
    <>
      {/* Plan Selector Modal */}
      {showPlanSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Choose Your Plan</h2>
              <button onClick={() => setShowPlanSelector(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Premium Plan */}
              <Card className="p-6 border-2 hover:border-primary cursor-pointer transition-colors">
                <div className="text-center mb-4">
                  <Crown className="h-12 w-12 text-yellow-600 mx-auto mb-2" />
                  <h3 className="text-xl font-bold">Premium</h3>
                  <p className="text-sm text-muted-foreground">Advanced features for power users</p>
                </div>

                <div className="space-y-4">
                  <Button
                    onClick={() => handlePlanSelect('premium', 'month')}
                    className="w-full"
                    disabled={actionLoading}
                  >
                    $9.99/month
                  </Button>
                  <Button
                    onClick={() => handlePlanSelect('premium', 'year')}
                    variant="outline"
                    className="w-full"
                    disabled={actionLoading}
                  >
                    $99.99/year <span className="text-xs text-green-600 ml-2">(Save $19.89)</span>
                  </Button>
                </div>

                <ul className="mt-4 text-sm space-y-2">
                  <li>✓ Unlimited pantry items</li>
                  <li>✓ Unlimited AI scanner</li>
                  <li>✓ Advanced recipe generation</li>
                  <li>✓ Detailed analytics & insights</li>
                  <li>✓ Expiry notifications</li>
                  <li>✓ Priority support</li>
                  <li>✓ Export data</li>
                  <li>✓ Advanced meal planning</li>
                  <li>✓ Up to 3 household members</li>
                </ul>
              </Card>

              {/* Household Premium Plan */}
              <Card className="p-6 border-2 hover:border-primary cursor-pointer transition-colors">
                <div className="text-center mb-4">
                  <Users className="h-12 w-12 text-purple-600 mx-auto mb-2" />
                  <h3 className="text-xl font-bold">Household Premium</h3>
                  <p className="text-sm text-muted-foreground">Perfect for families</p>
                </div>

                <div className="space-y-4">
                  <Button
                    onClick={() => handlePlanSelect('household_premium', 'month')}
                    className="w-full"
                    disabled={actionLoading}
                  >
                    $14.99/month
                  </Button>
                  <Button
                    onClick={() => handlePlanSelect('household_premium', 'year')}
                    variant="outline"
                    className="w-full"
                    disabled={actionLoading}
                  >
                    $149.99/year <span className="text-xs text-green-600 ml-2">(Save $29.89)</span>
                  </Button>
                </div>

                <ul className="mt-4 text-sm space-y-2">
                  <li>✓ Everything in Premium</li>
                  <li>✓ Up to 6 household members</li>
                  <li>✓ Shared pantry management</li>
                  <li>✓ Family meal planning</li>
                  <li>✓ Household analytics</li>
                  <li>✓ Role-based permissions</li>
                  <li>✓ Bulk operations</li>
                  <li>✓ Advanced storage locations</li>
                  <li>✓ Family notifications</li>
                  <li>✓ Priority support</li>
                </ul>
              </Card>
            </div>
          </Card>
        </div>
      )}

      <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">Subscription</h2>
        </div>
        <Badge className={getTierColor(userData.subscriptionTier)}>
          {getTierDisplayName(userData.subscriptionTier)}
        </Badge>
      </div>

      {userData.subscriptionTier === 'basic' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {getTierIcon(userData.subscriptionTier)}
            <div>
              <p className="font-medium">Basic Plan</p>
              <p className="text-sm text-muted-foreground">
                Perfect for individuals getting started
              </p>
            </div>
          </div>
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">What's included:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Up to 50 pantry items</li>
              <li>• Basic AI scanner (10 scans/month)</li>
              <li>• Recipe suggestions</li>
              <li>• Basic analytics</li>
              <li>• Email support</li>
              <li>• Mobile app access</li>
            </ul>
          </div>

          <Button onClick={handleUpgrade} className="w-full">
            Upgrade to Premium
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {getTierIcon(userData.subscriptionTier)}
            <div>
              <p className="font-medium">{getTierDisplayName(userData.subscriptionTier)}</p>
              <p className="text-sm text-muted-foreground">
                {userData.subscriptionTier === 'premium' 
                  ? 'Advanced features for power users'
                  : 'Perfect for families and shared households'
                }
              </p>
            </div>
          </div>

          {subscription && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge className={getStatusColor(subscription.status)}>
                    {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Billing</span>
                  <span className="text-sm font-medium">
                    {subscription.billing_interval === 'year' || subscription.billing_interval === 'yearly' 
                      ? `$${subscription.plan_tier === 'premium' ? '99.99' : '149.99'}/year`
                      : `$${subscription.plan_tier === 'premium' ? '9.99' : '14.99'}/month`
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Next billing</span>
                  <span className="text-sm font-medium">
                    {formatDate(subscription.current_period_end)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">What's included:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {userData.subscriptionTier === 'premium' ? (
                <>
                  <li>• Unlimited pantry items</li>
                  <li>• Unlimited AI scanner</li>
                  <li>• Advanced recipe generation</li>
                  <li>• Detailed analytics & insights</li>
                  <li>• Expiry notifications</li>
                  <li>• Priority support</li>
                  <li>• Export data</li>
                  <li>• Advanced meal planning</li>
                  <li>• Up to 3 household members</li>
                </>
              ) : (
                <>
                  <li>• Everything in Premium</li>
                  <li>• Up to 6 household members</li>
                  <li>• Shared pantry management</li>
                  <li>• Family meal planning</li>
                  <li>• Household analytics</li>
                  <li>• Role-based permissions</li>
                  <li>• Bulk operations</li>
                  <li>• Advanced storage locations</li>
                  <li>• Family notifications</li>
                  <li>• Priority support</li>
                </>
              )}
            </ul>
          </div>

          <Button 
            onClick={handleManageSubscription} 
            disabled={actionLoading}
            className="w-full"
          >
            {actionLoading ? 'Opening...' : 'Manage Subscription'}
          </Button>
        </div>
      )}
    </Card>
    </>
  )
}

export default SubscriptionManagement
