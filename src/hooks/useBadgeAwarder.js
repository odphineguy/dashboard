import { useState, useCallback } from 'react'
import { checkBadgesAfterAction } from '../services/badgeChecker'

/**
 * Custom hook for managing badge awarding and celebrations
 * Usage:
 * const { checkBadges, celebrationBadge, closeCelebration } = useBadgeAwarder(user?.id)
 * 
 * // After user action:
 * await checkBadges('pantry_consumed')
 */
export function useBadgeAwarder(userId) {
  const [celebrationBadge, setCelebrationBadge] = useState(null)
  const [isChecking, setIsChecking] = useState(false)

  /**
   * Check for new badges after a specific action
   * @param {string} actionType - Type of action: 'pantry_consumed', 'recipe_saved', 'login', 'inventory_updated'
   * @returns {Promise<Array>} Array of newly awarded badges
   */
  const checkBadges = useCallback(async (actionType) => {
    if (!userId || isChecking) return []

    setIsChecking(true)
    try {
      const newBadges = await checkBadgesAfterAction(userId, actionType)
      
      // Show celebration for the first new badge
      if (newBadges.length > 0) {
        setCelebrationBadge(newBadges[0])
        
        // If multiple badges earned, show them one by one
        if (newBadges.length > 1) {
          for (let i = 1; i < newBadges.length; i++) {
            setTimeout(() => {
              setCelebrationBadge(newBadges[i])
            }, i * 5000) // 5 seconds apart
          }
        }
      }

      return newBadges
    } catch (error) {
      console.error('Error checking badges:', error)
      return []
    } finally {
      setIsChecking(false)
    }
  }, [userId, isChecking])

  /**
   * Close the celebration modal
   */
  const closeCelebration = useCallback(() => {
    setCelebrationBadge(null)
  }, [])

  /**
   * Manually trigger a celebration (useful for testing)
   */
  const triggerCelebration = useCallback((badge) => {
    setCelebrationBadge(badge)
  }, [])

  return {
    checkBadges,
    celebrationBadge,
    closeCelebration,
    triggerCelebration,
    isChecking
  }
}

export default useBadgeAwarder

