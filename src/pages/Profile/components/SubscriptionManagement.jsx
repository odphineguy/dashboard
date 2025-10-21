import React, { useState, useEffect } from 'react'
import { CreditCard, Crown, Users, CheckCircle, XCircle, Calendar } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { supabase } from '../../../lib/supabaseClient'

const SubscriptionManagement = ({ userData, onUpdateSubscription }) => {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Load subscription data
  useEffect(() => {
    const loadSubscription = async () => {
      if (!userData?.subscriptionTier || userData.subscriptionTier === 'free') {
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
      case 'free':
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
    switch (tier) {
      case 'free':
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
      case 'free':
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
      
      const { data, error } = await supabase.functions.invoke('create-customer-portal-session', {
        body: { return_url: window.location.href }
      })

      if (error) {
        console.error('Error creating customer portal session:', error)
        alert('Failed to open subscription management. Please try again.')
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
    // Redirect to onboarding to select a new plan
    window.location.href = '/onboarding'
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

      {userData.subscriptionTier === 'free' ? (
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
          </div>
        </div>
      )}
    </Card>
  )
}

export default SubscriptionManagement
