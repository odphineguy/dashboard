import React from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'

/**
 * SubscriptionGuard Component
 * Protects premium features based on subscription tier
 *
 * Usage:
 * <SubscriptionGuard requiredTier="premium" fallback={<UpgradePrompt />}>
 *   <PremiumFeature />
 * </SubscriptionGuard>
 */
const SubscriptionGuard = ({
  children,
  requiredTier = 'premium',
  requiredFeature = null,
  fallback = null,
  showFallback = true
}) => {
  const { subscription, loading, checkFeatureAccess } = useSubscription()

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Check access by feature name if provided
  if (requiredFeature) {
    const hasAccess = checkFeatureAccess(requiredFeature)
    if (!hasAccess) {
      return showFallback ? fallback : null
    }
    return <>{children}</>
  }

  // Check access by tier
  const hasAccess = checkTierAccess(subscription?.tier, requiredTier, subscription?.status)

  if (!hasAccess) {
    return showFallback ? fallback : null
  }

  return <>{children}</>
}

// Helper function to check tier access
function checkTierAccess(userTier, requiredTier, status) {
  // Must have active subscription
  if (!['active', 'trialing'].includes(status)) {
    return false
  }

  const tierHierarchy = {
    free: 0,
    premium: 1,
    household_premium: 2,
  }

  const userLevel = tierHierarchy[userTier] || 0
  const requiredLevel = tierHierarchy[requiredTier] || 0

  return userLevel >= requiredLevel
}

export default SubscriptionGuard
