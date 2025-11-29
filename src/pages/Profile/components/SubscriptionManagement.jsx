import React, { useState, useEffect } from 'react'
import { CreditCard, Crown, Users, CheckCircle, XCircle, Calendar, X, RefreshCw } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { useSupabase } from '../../../hooks/useSupabase'
import { useAuth } from '../../../contexts/AuthContext'
import { useSubscription } from '../../../contexts/SubscriptionContext'

const SubscriptionManagement = ({ userData, onUpdateSubscription }) => {
  const supabase = useSupabase()
  const { user } = useAuth()
  const { syncSubscriptionFromStripe, refreshSubscription } = useSubscription()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [showPlanSelector, setShowPlanSelector] = useState(false)

  // Helper to check if tier is the basic (free) tier
  const isBasicTier = (tier) => !tier || tier === 'basic'

  // Load subscription data
  useEffect(() => {
    const loadSubscription = async () => {
      if (isBasicTier(userData?.subscriptionTier)) {
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
  }, [userData?.id, userData?.subscriptionTier, supabase])

  const getTierDisplayName = (tier) => {
    switch (tier) {
      case 'basic':
        return 'Basic (Free)'
      case 'premium':
        return 'Premium'
      case 'household_premium':
        return 'Household Premium'
      default:
        return 'Basic (Free)'
    }
  }

  const getTierIcon = (tier) => {
    if (isBasicTier(tier)) return <CheckCircle className="h-5 w-5 text-green-600" />
    switch (tier) {
      case 'premium':
        return <Crown className="h-5 w-5 text-yellow-600" />
      case 'household_premium':
        return <Users className="h-5 w-5 text-purple-600" />
      default:
        return <CheckCircle className="h-5 w-5 text-green-600" />
    }
  }

  const getTierColor = (tier) => {
    if (isBasicTier(tier)) return 'bg-green-100 text-green-800'
    switch (tier) {
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

      // Pass userId in body for Clerk compatibility
      const { data, error } = await supabase.functions.invoke('create-customer-portal-session', {
        body: { 
          return_url: window.location.href,
          userId: user?.id || userData?.id
        }
      })

      if (error) {
        console.error('Error creating customer portal session:', error)

        // Better error message for missing customer ID
        if (error.message?.includes('No Stripe customer found')) {
          alert('Your subscription is still being set up. Please wait a few moments and try again.')
        } else {
          alert('Failed to open subscription management. Please try again.')
        }
        return
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url
    } catch (error) {
      console.error('Error opening customer portal:', error)
      alert('Failed to open subscription management. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpgrade = () => {
    // Basic tier users: show plan selector modal
    if (isBasicTier(userData?.subscriptionTier)) {
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

      // Official Stripe Price IDs from STRIPE_PRICE_IDS.md (Sandbox/Test Mode)
      const PRICE_IDS = {
        premium: {
          month: 'price_1SKiIoIqliEA9Uot0fgA3c8M',
          year: 'price_1SIuGNIqliEA9UotGD93WZdc'
        },
        household_premium: {
          month: 'price_1SIuGPIqliEA9UotfLjoddkj',
          year: 'price_1SIuGSIqliEA9UotuHlR3qoH'
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
          userId: user?.id || userData?.id,
          userEmail: user?.email || userData?.email,
          userName: user?.user_metadata?.full_name || userData?.fullName
        }
      })

      if (error) {
        console.error('Error creating checkout session:', error)
        // Try to get the actual error message
        let errorMsg = 'Failed to start upgrade process. Please try again.'
        if (error.message) {
          errorMsg = error.message
        }
        if (error.context?.body) {
          try {
            const body = JSON.parse(error.context.body)
            if (body.error) errorMsg = body.error
          } catch (e) { /* ignore parse errors */ }
        }
        console.error('Detailed error:', errorMsg)
        alert(errorMsg)
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

  // Sync subscription from Stripe (fix webhook failures)
  const handleSyncSubscription = async () => {
    try {
      setSyncLoading(true)
      const result = await syncSubscriptionFromStripe()
      
      if (result?.synced) {
        // Reload page to show updated subscription
        window.location.reload()
      } else {
        alert('Subscription synced. If you recently made a payment and still see Basic tier, please try again in a few seconds.')
      }
    } catch (error) {
      console.error('Error syncing subscription:', error)
      alert('Failed to sync subscription. Please try again.')
    } finally {
      setSyncLoading(false)
    }
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
                  <li>✓ Up to 3 household members</li>
                  <li>✓ 5 storage locations</li>
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
                  <li>✓ Unlimited household members</li>
                  <li>✓ Unlimited storage locations</li>
                  <li>✓ Shared inventory management</li>
                  <li>✓ Family meal planning</li>
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

      {isBasicTier(userData.subscriptionTier) ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {getTierIcon(userData.subscriptionTier)}
            <div>
              <p className="font-medium">Basic Plan (Free)</p>
              <p className="text-sm text-muted-foreground">
                Perfect for getting started with meal planning
              </p>
            </div>
          </div>
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">What's included:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Up to 50 pantry items</li>
              <li>• AI scanner (10 scans/month)</li>
              <li>• Basic recipe suggestions (3/week)</li>
              <li>• 3 storage locations</li>
              <li>• Basic analytics</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleUpgrade} className="flex-1">
              Upgrade to Premium
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSyncSubscription}
              disabled={syncLoading}
              title="Sync subscription status from Stripe"
            >
              <RefreshCw className={`h-4 w-4 ${syncLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Recently upgraded? Click the sync button to refresh your subscription status.
          </p>
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
                    ${subscription.plan_tier === 'premium' ? '9.99' : '14.99'}/{subscription.billing_interval}
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
                  <li>• Up to 3 household members</li>
                  <li>• Advanced analytics</li>
                  <li>• Priority support</li>
                </>
              ) : (
                <>
                  <li>• Everything in Premium</li>
                  <li>• Unlimited household members</li>
                  <li>• Unlimited storage locations</li>
                  <li>• Shared household inventory</li>
                  <li>• Family meal planning</li>
                  <li>• Household analytics</li>
                </>
              )}
            </ul>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleManageSubscription} 
              disabled={actionLoading}
              className="flex-1"
            >
              {actionLoading ? 'Opening...' : 'Manage Subscription'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleUpgrade}
              className="flex-1"
            >
              Change Plan
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSyncSubscription}
              disabled={syncLoading}
              title="Sync subscription status from Stripe"
            >
              <RefreshCw className={`h-4 w-4 ${syncLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      )}
    </Card>
    </>
  )
}

export default SubscriptionManagement

