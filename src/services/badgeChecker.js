import { supabase } from '../lib/supabaseClient'
import { awardAchievement, updateAchievementProgress } from './achievements'

/**
 * Badge Checker Service
 * Monitors user actions and automatically awards badges when requirements are met
 */

// Badge definitions with requirements
const BADGE_REQUIREMENTS = {
  // Waste Reduction Badges
  'waste-warrior': {
    type: 'consumed_count',
    requirement: 50,
    description: 'Consume 50 items before they expire'
  },
  'eco-champion': {
    type: 'waste_reduction_percentage',
    requirement: 50,
    description: 'Maintain 50% waste reduction for 3 consecutive weeks'
  },
  'zero-waste': {
    type: 'zero_waste_week',
    requirement: 1,
    description: 'Achieve a week with zero food waste'
  },
  'sustainability-champion': {
    type: 'co2_saved',
    requirement: 100,
    description: 'Save 100kg CO2 through waste reduction'
  },
  'food-saver-pro': {
    type: 'items_saved',
    requirement: 500,
    description: 'Prevent 500 items from going to waste'
  },

  // Recipe Badges
  'recipe-novice': {
    type: 'recipes_tried',
    requirement: 5,
    description: 'Try 5 different recipes'
  },
  'culinary-explorer': {
    type: 'recipes_tried',
    requirement: 25,
    description: 'Try 25 different recipes'
  },
  'master-chef': {
    type: 'recipes_tried',
    requirement: 100,
    description: 'Try 100 different recipes'
  },

  // Consistency Badges
  'week-streak': {
    type: 'login_streak_days',
    requirement: 7,
    description: 'Log in for 7 consecutive days'
  },
  'month-streak': {
    type: 'login_streak_days',
    requirement: 30,
    description: 'Log in for 30 consecutive days'
  },
  'year-streak': {
    type: 'login_streak_days',
    requirement: 365,
    description: 'Log in for 365 consecutive days'
  },
  'early-adopter': {
    type: 'days_since_signup',
    requirement: 30,
    description: 'Use the app for 30 days'
  },
  'inventory-master': {
    type: 'inventory_accuracy',
    requirement: 95,
    description: 'Maintain 95% inventory accuracy for 30 days'
  },
  'money-saver': {
    type: 'money_saved',
    requirement: 200,
    description: 'Save $200 through waste reduction'
  },
  'perfect-week': {
    type: 'zero_waste_week',
    requirement: 1,
    description: 'Complete a week with perfect inventory management'
  }
}

/**
 * Calculate consumed items count
 */
async function getConsumedItemsCount(userId) {
  const { data, error } = await supabase
    .from('pantry_events')
    .select('quantity')
    .eq('user_id', userId)
    .eq('type', 'consumed')

  if (error) {
    console.error('Error fetching consumed items:', error)
    return 0
  }

  return data?.reduce((sum, event) => sum + (event.quantity || 1), 0) || 0
}

/**
 * Calculate waste reduction percentage
 */
async function getWasteReductionPercentage(userId) {
  const { data, error } = await supabase
    .from('pantry_events')
    .select('type, quantity')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching pantry events:', error)
    return 0
  }

  const consumed = data?.filter(e => e.type === 'consumed').length || 0
  const wasted = data?.filter(e => e.type === 'wasted').length || 0
  const total = consumed + wasted

  return total > 0 ? Math.round((consumed / total) * 100) : 0
}

/**
 * Check for zero waste week
 */
async function hasZeroWasteWeek(userId) {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const { data, error } = await supabase
    .from('pantry_events')
    .select('type')
    .eq('user_id', userId)
    .eq('type', 'wasted')
    .gte('created_at', oneWeekAgo.toISOString())

  if (error) {
    console.error('Error checking zero waste week:', error)
    return false
  }

  return (data?.length || 0) === 0
}

/**
 * Calculate recipes tried count
 */
async function getRecipesTried(userId) {
  const { data, error } = await supabase
    .from('ai_saved_recipes')
    .select('id')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching recipes:', error)
    return 0
  }

  return data?.length || 0
}

/**
 * Calculate login streak
 */
async function getLoginStreak(userId) {
  // This would require a login_history table
  // For now, return 0 as placeholder
  // TODO: Implement login tracking
  return 0
}

/**
 * Calculate days since signup
 */
async function getDaysSinceSignup(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('id', userId)
    .single()

  if (error || !data) {
    console.error('Error fetching profile:', error)
    return 0
  }

  const signupDate = new Date(data.created_at)
  const today = new Date()
  const diffTime = Math.abs(today - signupDate)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Get user's current progress for a specific badge
 */
async function getBadgeProgress(userId, badgeKey) {
  const requirement = BADGE_REQUIREMENTS[badgeKey]
  if (!requirement) return 0

  let progress = 0

  switch (requirement.type) {
    case 'consumed_count':
      progress = await getConsumedItemsCount(userId)
      break
    case 'waste_reduction_percentage':
      progress = await getWasteReductionPercentage(userId)
      break
    case 'zero_waste_week':
      progress = await hasZeroWasteWeek(userId) ? 1 : 0
      break
    case 'recipes_tried':
      progress = await getRecipesTried(userId)
      break
    case 'login_streak_days':
      progress = await getLoginStreak(userId)
      break
    case 'days_since_signup':
      progress = await getDaysSinceSignup(userId)
      break
    case 'items_saved':
      progress = await getConsumedItemsCount(userId)
      break
    default:
      progress = 0
  }

  return progress
}

/**
 * Check if user has earned a specific badge
 */
async function checkBadgeEarned(userId, badgeKey) {
  const requirement = BADGE_REQUIREMENTS[badgeKey]
  if (!requirement) return false

  const progress = await getBadgeProgress(userId, badgeKey)
  return progress >= requirement.requirement
}

/**
 * Check if badge is already awarded
 */
async function isBadgeAwarded(userId, badgeKey) {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('unlocked_at')
    .eq('user_id', userId)
    .eq('achievement_key', badgeKey)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking badge:', error)
    return false
  }

  return data && data.unlocked_at !== null
}

/**
 * Main function: Check and award all badges for a user
 * Returns newly awarded badges
 */
export async function checkAndAwardBadges(userId) {
  if (!userId) return { newBadges: [], updatedProgress: [] }

  const newBadges = []
  const updatedProgress = []

  try {
    // Check each badge
    for (const [badgeKey, requirement] of Object.entries(BADGE_REQUIREMENTS)) {
      // Skip if already awarded
      const alreadyAwarded = await isBadgeAwarded(userId, badgeKey)
      if (alreadyAwarded) continue

      // Get current progress
      const progress = await getBadgeProgress(userId, badgeKey)

      // Update progress in database
      await updateAchievementProgress(userId, badgeKey, progress)
      updatedProgress.push({ badgeKey, progress, requirement: requirement.requirement })

      // Check if badge should be awarded
      if (progress >= requirement.requirement) {
        const awarded = await awardAchievement(userId, badgeKey)
        if (awarded) {
          newBadges.push({
            key: badgeKey,
            name: badgeKey.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' '),
            description: requirement.description
          })
        }
      }
    }

    return { newBadges, updatedProgress }
  } catch (error) {
    console.error('Error in checkAndAwardBadges:', error)
    return { newBadges: [], updatedProgress: [] }
  }
}

/**
 * Check specific badges after certain actions
 */
export async function checkBadgesAfterAction(userId, actionType) {
  const badgesToCheck = {
    'pantry_consumed': ['waste-warrior', 'eco-champion', 'zero-waste', 'food-saver-pro'],
    'recipe_saved': ['recipe-novice', 'culinary-explorer', 'master-chef'],
    'login': ['week-streak', 'month-streak', 'year-streak', 'early-adopter'],
    'inventory_updated': ['inventory-master', 'perfect-week']
  }

  const badges = badgesToCheck[actionType] || []
  const newBadges = []

  for (const badgeKey of badges) {
    const alreadyAwarded = await isBadgeAwarded(userId, badgeKey)
    if (alreadyAwarded) continue

    const earned = await checkBadgeEarned(userId, badgeKey)
    if (earned) {
      const awarded = await awardAchievement(userId, badgeKey)
      if (awarded) {
        const requirement = BADGE_REQUIREMENTS[badgeKey]
        newBadges.push({
          key: badgeKey,
          name: badgeKey.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          description: requirement.description
        })
      }
    }
  }

  return newBadges
}

/**
 * Get all badge requirements (for display purposes)
 */
export function getAllBadgeRequirements() {
  return BADGE_REQUIREMENTS
}

/**
 * Get user's achievement progress for all badges
 */
export async function getUserAchievementProgress(userId) {
  if (!userId) {
    return {
      achievements: [],
      totalEarned: 0,
      totalAvailable: Object.keys(BADGE_REQUIREMENTS).length
    }
  }

  try {
    // Fetch catalog badges
    const { data: catalog } = await supabase
      .from('achievements_catalog')
      .select('*')
      .order('key', { ascending: true })

    // Fetch user achievements
    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)

    const userAchievementMap = new Map()
    userAchievements?.forEach(ua => {
      userAchievementMap.set(ua.achievement_key, ua)
    })

    // Merge and calculate progress
    const achievements = []
    for (const achievement of (catalog || [])) {
      const userProgress = userAchievementMap.get(achievement.key)
      const requirement = BADGE_REQUIREMENTS[achievement.key]
      
      // Get current progress if not earned
      let progress = userProgress?.progress || 0
      if (!userProgress?.unlocked_at && requirement) {
        progress = await getBadgeProgress(userId, achievement.key)
      }

      achievements.push({
        key: achievement.key,
        title: achievement.title,
        description: achievement.description,
        tier: achievement.tier || 'bronze',
        earned: userProgress ? Boolean(userProgress.unlocked_at) : false,
        earnedDate: userProgress?.unlocked_at 
          ? new Date(userProgress.unlocked_at).toLocaleDateString()
          : null,
        progress,
        requirement: requirement?.requirement || achievement.rule_value || 0,
        unit: achievement.unit || ''
      })
    }

    const totalEarned = achievements.filter(a => a.earned).length
    const totalAvailable = achievements.length

    return {
      achievements,
      totalEarned,
      totalAvailable
    }
  } catch (error) {
    console.error('Error getting user achievement progress:', error)
    return {
      achievements: [],
      totalEarned: 0,
      totalAvailable: Object.keys(BADGE_REQUIREMENTS).length
    }
  }
}

