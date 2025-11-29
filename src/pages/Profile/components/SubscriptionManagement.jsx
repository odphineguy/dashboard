import React, { useState, useEffect } from 'react'
import { CreditCard, Crown, Users, CheckCircle, XCircle, Calendar, X, RefreshCw, AlertTriangle, ArrowRight, ArrowDown, Sparkles } from 'lucide-react'
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
  const [showChangePlanModal, setShowChangePlanModal] = useState(false)
  const [changePlanLoading, setChangePlanLoading] = useState(null) // Track which action is loading

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
      // Paid users: show change plan modal with downgrade/cancel options
      setShowChangePlanModal(true)
    }
  }

  // Price IDs for plan changes
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

  const handleDowngradeToPremium = async () => {
    try {
      setChangePlanLoading('premium')
      
      // Use the same billing interval as current subscription
      const billingInterval = subscription?.billing_interval || 'month'
      const newPriceId = PRICE_IDS.premium[billingInterval]
      
      const { data, error } = await supabase.functions.invoke('update-subscription', {
        body: {
          newPriceId,
          newPlanTier: 'premium',
          userId: user?.id || userData?.id
        }
      })

      if (error) {
        console.error('Error downgrading to premium:', error)
        alert('Failed to change plan. Please try again or contact support.')
        return
      }

      alert('Successfully changed to Premium plan! Your account has been updated.')
      setShowChangePlanModal(false)
      window.location.reload()
    } catch (error) {
      console.error('Error downgrading to premium:', error)
      alert('Failed to change plan. Please try again.')
    } finally {
      setChangePlanLoading(null)
    }
  }

  const handleUpgradeToHousehold = async () => {
    try {
      setChangePlanLoading('household')
      
      // Use the same billing interval as current subscription
      const billingInterval = subscription?.billing_interval || 'month'
      const newPriceId = PRICE_IDS.household_premium[billingInterval]
      
      const { data, error } = await supabase.functions.invoke('update-subscription', {
        body: {
          newPriceId,
          newPlanTier: 'household_premium',
          userId: user?.id || userData?.id
        }
      })

      if (error) {
        console.error('Error upgrading to household premium:', error)
        alert('Failed to change plan. Please try again or contact support.')
        return
      }

      alert('Successfully upgraded to Household Premium! Your account has been updated.')
      setShowChangePlanModal(false)
      window.location.reload()
    } catch (error) {
      console.error('Error upgrading to household premium:', error)
      alert('Failed to change plan. Please try again.')
    } finally {
      setChangePlanLoading(null)
    }
  }

  const handleCancelSubscription = async (cancelImmediately = false) => {
    try {
      setChangePlanLoading('cancel')
      
      const confirmMessage = cancelImmediately
        ? 'Are you sure you want to cancel immediately? You will lose access to premium features right away.'
        : 'Are you sure you want to cancel? You will keep access until your current billing period ends.'
      
      if (!confirm(confirmMessage)) {
        setChangePlanLoading(null)
        return
      }

      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { 
          cancelImmediately,
          userId: user?.id || userData?.id
        }
      })

      if (error) {
        console.error('Error canceling subscription:', error)
        alert('Failed to cancel subscription. Please try again or contact support.')
        return
      }

      if (cancelImmediately) {
        alert('Your subscription has been canceled. You now have a Basic (Free) account.')
      } else {
        const endDate = data.currentPeriodEnd 
          ? new Date(data.currentPeriodEnd * 1000).toLocaleDateString()
          : 'the end of your billing period'
        alert(`Your subscription will be canceled at ${endDate}. You will keep access until then.`)
      }
      
      setShowChangePlanModal(false)
      window.location.reload()
    } catch (error) {
      console.error('Error canceling subscription:', error)
      alert('Failed to cancel subscription. Please try again.')
    } finally {
      setChangePlanLoading(null)
    }
  }

  const handlePlanSelect = async (planTier, billingInterval) => {
    try {
      setActionLoading(true)
      setShowPlanSelector(false)

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
      {/* Change Plan Modal */}
      {showChangePlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold">Change Your Plan</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Current plan: <span className="font-semibold">{getTierDisplayName(userData?.subscriptionTier)}</span>
                </p>
              </div>
              <button onClick={() => setShowChangePlanModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Upgrade option (only for Premium users) */}
              {userData?.subscriptionTier === 'premium' && (
                <Card className="p-4 border-2 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <Users className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">Upgrade to Household Premium</h3>
                        <Badge className="bg-purple-100 text-purple-800">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Recommended
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Unlimited household members, unlimited storage locations, family meal planning
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">$14.99/month</span>
                        <Button 
                          onClick={handleUpgradeToHousehold}
                          disabled={changePlanLoading !== null}
                          size="sm"
                        >
                          {changePlanLoading === 'household' ? 'Upgrading...' : 'Upgrade'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Downgrade to Premium (only for Household Premium users) */}
              {userData?.subscriptionTier === 'household_premium' && (
                <Card className="p-4 border hover:border-yellow-300 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                        <Crown className="h-6 w-6 text-yellow-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Downgrade to Premium</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Keep unlimited items & AI scanner. Limited to 3 household members & 6 storage locations.
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">$9.99/month</span>
                        <span className="text-sm text-green-600">Save $5/month</span>
                        <Button 
                          onClick={handleDowngradeToPremium}
                          disabled={changePlanLoading !== null}
                          variant="outline"
                          size="sm"
                        >
                          {changePlanLoading === 'premium' ? 'Changing...' : 'Downgrade'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Downgrade to Basic (Free) */}
              <Card className="p-4 border hover:border-gray-300 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-gray-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Downgrade to Basic (Free)</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      50 items limit, 10 AI scans/month, 3 storage locations. Your data will be preserved.
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">$0/month</span>
                      <Button 
                        onClick={() => handleCancelSubscription(false)}
                        disabled={changePlanLoading !== null}
                        variant="outline"
                        size="sm"
                      >
                        {changePlanLoading === 'cancel' ? 'Processing...' : 'Cancel at Period End'}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Info box */}
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">How plan changes work</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                  <li>• <strong>Upgrades</strong> take effect immediately with prorated billing</li>
                  <li>• <strong>Downgrades</strong> take effect at your next billing date</li>
                  <li>• <strong>Cancellation</strong> keeps access until your current period ends</li>
                  <li>• Your data is always preserved - nothing is deleted</li>
                </ul>
              </div>

              {/* Manage payment method */}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm text-muted-foreground">Need to update payment method?</span>
                <Button 
                  variant="link" 
                  onClick={handleManageSubscription}
                  disabled={actionLoading}
                  className="text-sm"
                >
                  Manage in Stripe →
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

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

