// NOTE: supabase client is now passed as parameter to use authenticated Clerk session
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
    type: 'consecutive_weeks_waste_reduction',
    requirement: 3, // 3 consecutive weeks
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
    type: 'consecutive_days_inventory_accuracy',
    requirement: 30, // 30 consecutive days
    description: 'Maintain 95% inventory accuracy for 30 days'
  },
  'money-saver': {
    type: 'money_saved',
    requirement: 200,
    description: 'Save $200 through waste reduction'
  },
  'perfect-week': {
    type: 'perfect_days_streak',
    requirement: 7,
    description: 'Complete 7 consecutive days with perfect inventory management'
  }
}

/**
 * Calculate consumed items count
 */
async function getConsumedItemsCount(userId, supabase) {
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
 * Calculate waste reduction percentage (overall)
 */
async function getWasteReductionPercentage(userId, supabase) {
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
 * Calculate consecutive weeks with 50%+ waste reduction
 * Returns the number of consecutive weeks (up to requirement) where waste reduction >= 50%
 */
async function getConsecutiveWeeksWasteReduction(userId, supabase) {
  try {
    // Get all pantry events
    const { data: events, error } = await supabase
      .from('pantry_events')
      .select('type, created_at, at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error || !events || events.length === 0) {
      return 0
    }

    // Group events by week (Sunday to Saturday)
    const eventsByWeek = new Map()
    
    events.forEach(event => {
      const eventDate = new Date(event.at || event.created_at)
      // Get the start of the week (Sunday)
      const weekStart = new Date(eventDate)
      const dayOfWeek = eventDate.getDay()
      weekStart.setDate(eventDate.getDate() - dayOfWeek)
      weekStart.setHours(0, 0, 0, 0)
      
      const weekKey = weekStart.toISOString().split('T')[0]
      
      if (!eventsByWeek.has(weekKey)) {
        eventsByWeek.set(weekKey, { consumed: 0, wasted: 0 })
      }
      
      const week = eventsByWeek.get(weekKey)
      if (event.type === 'consumed') {
        week.consumed++
      } else if (event.type === 'wasted') {
        week.wasted++
      }
    })

    // Calculate waste reduction percentage for each week
    const weeks = Array.from(eventsByWeek.entries())
      .map(([weekKey, data]) => {
        const total = data.consumed + data.wasted
        const percentage = total > 0 ? (data.consumed / total) * 100 : 0
        return {
          weekKey,
          percentage,
          date: new Date(weekKey)
        }
      })
      .sort((a, b) => b.date - a.date) // Most recent first

    // Count consecutive weeks from most recent week with activity backwards
    // Start from the most recent week that has events
    if (weeks.length === 0) {
      return 0
    }

    let consecutiveWeeks = 0
    const mostRecentWeek = weeks[0] // Already sorted most recent first
    
    // Start checking from the most recent week backwards
    const startWeekDate = new Date(mostRecentWeek.date)
    
    for (let i = 0; i < 52; i++) { // Check up to 1 year
      const weekStart = new Date(startWeekDate)
      weekStart.setDate(startWeekDate.getDate() - (i * 7))
      weekStart.setHours(0, 0, 0, 0)
      const weekKey = weekStart.toISOString().split('T')[0]
      
      const week = weeks.find(w => w.weekKey === weekKey)
      
      if (week && week.percentage >= 50) {
        consecutiveWeeks++
      } else {
        // If week doesn't exist or percentage < 50, streak is broken
        break
      }
    }

    return consecutiveWeeks
  } catch (error) {
    console.error('Error calculating consecutive weeks waste reduction:', error)
    return 0
  }
}

/**
 * Check for zero waste week
 */
async function hasZeroWasteWeek(userId, supabase) {
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
 * Calculate consecutive days of perfect inventory management
 * Perfect day = no wasted items that day
 */
async function getPerfectDaysStreak(userId, supabase) {
  try {
    // Get all wasted items grouped by date
    const { data, error } = await supabase
      .from('pantry_events')
      .select('created_at')
      .eq('user_id', userId)
      .eq('type', 'wasted')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching wasted items:', error)
      return 0
    }

    if (!data || data.length === 0) {
      // No wasted items at all - check how many days since signup (up to 7)
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', userId)
        .maybeSingle()

      if (!profile) return 0

      const signupDate = new Date(profile.created_at)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      signupDate.setHours(0, 0, 0, 0)
      
      const diffTime = today - signupDate
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      return Math.min(diffDays + 1, 7) // Cap at 7 for display
    }

    // Group wasted items by date
    const wastedByDate = new Set()
    data.forEach(event => {
      const date = new Date(event.created_at)
      date.setHours(0, 0, 0, 0)
      wastedByDate.add(date.toISOString().split('T')[0])
    })

    // Count consecutive days from today backwards with no waste
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let streak = 0
    let currentDate = new Date(today)
    
    // Check up to 7 days back
    for (let i = 0; i < 7; i++) {
      const dateKey = currentDate.toISOString().split('T')[0]
      
      if (wastedByDate.has(dateKey)) {
        // Found a day with waste - streak broken
        break
      }
      
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    }

    return streak
  } catch (error) {
    console.error('Error calculating perfect days streak:', error)
    return 0
  }
}

/**
 * Calculate recipes tried count
 */
async function getRecipesTried(userId, supabase) {
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
 * Calculate login streak based on activity (pantry events)
 * Uses consecutive days with any pantry activity as a proxy for login streak
 */
async function getLoginStreak(userId, supabase) {
  try {
    // Get all pantry events to determine activity
    const { data: events, error } = await supabase
      .from('pantry_events')
      .select('created_at, at')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching events for login streak:', error)
      return 0
    }

    if (!events || events.length === 0) {
      return 0
    }

    // Get unique dates with activity
    const activityDates = new Set()
    events.forEach(event => {
      const eventDate = event.at || event.created_at
      if (eventDate) {
        const date = new Date(eventDate).toISOString().split('T')[0]
        activityDates.add(date)
      }
    })

    if (activityDates.size === 0) {
      return 0
    }

    // Calculate consecutive days from today backwards
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    
    let streak = 0
    let checkDate = new Date(today)
    
    for (let i = 0; i < 365; i++) { // Max 1 year streak
      const dateStr = checkDate.toISOString().split('T')[0]
      
      if (activityDates.has(dateStr)) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    return streak
  } catch (error) {
    console.error('Error calculating login streak:', error)
    return 0
  }
}

/**
 * Calculate days since signup
 */
async function getDaysSinceSignup(userId, supabase) {
  const { data, error } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('id', userId)
    .maybeSingle()

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
 * Calculate CO2 saved (in kg) through waste reduction
 * Estimate: ~2.5kg CO2 per kg of food saved from waste
 * Using consumed items as proxy (items consumed = items saved from waste)
 */
async function getCO2Saved(userId, supabase) {
  try {
    const consumedCount = await getConsumedItemsCount(userId, supabase)
    // Rough estimate: average item weighs ~0.4kg, 2.5kg CO2 per kg saved
    const estimatedCO2 = Math.round(consumedCount * 0.4 * 2.5)
    return estimatedCO2
  } catch (error) {
    console.error('Error calculating CO2 saved:', error)
    return 0
  }
}

/**
 * Calculate money saved (in dollars) through waste reduction
 * Estimate: ~$2 per item saved from waste
 */
async function getMoneySaved(userId, supabase) {
  try {
    const consumedCount = await getConsumedItemsCount(userId, supabase)
    // Rough estimate: $2 per item saved
    const estimatedSavings = Math.round(consumedCount * 2)
    return estimatedSavings
  } catch (error) {
    console.error('Error calculating money saved:', error)
    return 0
  }
}

/**
 * Calculate consecutive days with 95%+ inventory accuracy
 * Accuracy = (items consumed) / (items consumed + items wasted) >= 95%
 * Returns the number of consecutive days (up to requirement) where accuracy >= 95%
 */
async function getConsecutiveDaysInventoryAccuracy(userId, supabase) {
  try {
    // Get all pantry events
    const { data: events, error } = await supabase
      .from('pantry_events')
      .select('type, created_at, at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error || !events || events.length === 0) {
      return 0
    }

    // Group events by date
    const eventsByDate = new Map()
    
    events.forEach(event => {
      const eventDate = new Date(event.at || event.created_at)
      eventDate.setHours(0, 0, 0, 0)
      const dateKey = eventDate.toISOString().split('T')[0]
      
      if (!eventsByDate.has(dateKey)) {
        eventsByDate.set(dateKey, { consumed: 0, wasted: 0 })
      }
      
      const day = eventsByDate.get(dateKey)
      if (event.type === 'consumed') {
        day.consumed++
      } else if (event.type === 'wasted') {
        day.wasted++
      }
    })

    // Calculate accuracy for each day
    const days = Array.from(eventsByDate.entries())
      .map(([dateKey, data]) => {
        const total = data.consumed + data.wasted
        const accuracy = total > 0 ? (data.consumed / total) * 100 : 0
        return {
          dateKey,
          accuracy,
          date: new Date(dateKey)
        }
      })
      .sort((a, b) => b.date - a.date) // Most recent first

    if (days.length === 0) {
      return 0
    }

    // Count consecutive days from most recent backwards with >= 95% accuracy
    let consecutiveDays = 0
    const mostRecentDay = days[0]
    const startDate = new Date(mostRecentDay.date)
    
    for (let i = 0; i < 365; i++) { // Check up to 1 year
      const checkDate = new Date(startDate)
      checkDate.setDate(startDate.getDate() - i)
      checkDate.setHours(0, 0, 0, 0)
      const dateKey = checkDate.toISOString().split('T')[0]
      
      const day = days.find(d => d.dateKey === dateKey)
      
      if (day && day.accuracy >= 95) {
        consecutiveDays++
      } else {
        // If day doesn't exist or accuracy < 95%, streak is broken
        break
      }
    }

    return consecutiveDays
  } catch (error) {
    console.error('Error calculating consecutive days inventory accuracy:', error)
    return 0
  }
}

/**
 * Get user's current progress for a specific badge
 */
export async function getBadgeProgress(userId, badgeKey, supabase) {
  const requirement = BADGE_REQUIREMENTS[badgeKey]
  if (!requirement) return 0

  let progress = 0

  switch (requirement.type) {
    case 'consumed_count':
      progress = await getConsumedItemsCount(userId, supabase)
      break
    case 'waste_reduction_percentage':
      progress = await getWasteReductionPercentage(userId, supabase)
      break
    case 'consecutive_weeks_waste_reduction':
      progress = await getConsecutiveWeeksWasteReduction(userId, supabase)
      break
    case 'zero_waste_week':
      progress = await hasZeroWasteWeek(userId, supabase) ? 1 : 0
      break
    case 'perfect_days_streak':
      progress = await getPerfectDaysStreak(userId, supabase)
      break
    case 'recipes_tried':
      progress = await getRecipesTried(userId, supabase)
      break
    case 'login_streak_days':
      progress = await getLoginStreak(userId, supabase)
      break
    case 'days_since_signup':
      progress = await getDaysSinceSignup(userId, supabase)
      break
    case 'items_saved':
      progress = await getConsumedItemsCount(userId, supabase)
      break
    case 'co2_saved':
      progress = await getCO2Saved(userId, supabase)
      break
    case 'money_saved':
      progress = await getMoneySaved(userId, supabase)
      break
    case 'consecutive_days_inventory_accuracy':
      progress = await getConsecutiveDaysInventoryAccuracy(userId, supabase)
      break
    default:
      progress = 0
  }

  return progress
}

/**
 * Check if user has earned a specific badge
 */
async function checkBadgeEarned(userId, badgeKey, supabase) {
  const requirement = BADGE_REQUIREMENTS[badgeKey]
  if (!requirement) return false

  const progress = await getBadgeProgress(userId, badgeKey, supabase)
  return progress >= requirement.requirement
}

/**
 * Check if badge is already awarded
 */
async function isBadgeAwarded(userId, badgeKey, supabase) {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('unlocked_at')
    .eq('user_id', userId)
    .eq('achievement_key', badgeKey)
    .maybeSingle()

  if (error) {
    console.error('Error checking badge:', error)
    return false
  }

  return data && data.unlocked_at !== null
}

/**
 * Main function: Check and award all badges for a user
 * Returns newly awarded badges
 */
export async function checkAndAwardBadges(userId, supabase) {
  if (!userId) return { newBadges: [], updatedProgress: [] }

  const newBadges = []
  const updatedProgress = []

  try {
    // Check each badge
    for (const [badgeKey, requirement] of Object.entries(BADGE_REQUIREMENTS)) {
      // Skip if already awarded
      const alreadyAwarded = await isBadgeAwarded(userId, badgeKey, supabase)
      if (alreadyAwarded) continue

      // Get current progress
      const progress = await getBadgeProgress(userId, badgeKey, supabase)

      // Update progress in database
      await updateAchievementProgress(userId, supabase, badgeKey, progress)
      updatedProgress.push({ badgeKey, progress, requirement: requirement.requirement })

      // Check if badge should be awarded
      if (progress >= requirement.requirement) {
        const awarded = await awardAchievement(userId, badgeKey, supabase)
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
export async function checkBadgesAfterAction(userId, actionType, supabase) {
  const badgesToCheck = {
    'pantry_consumed': ['waste-warrior', 'eco-champion', 'zero-waste', 'food-saver-pro'],
    'recipe_saved': ['recipe-novice', 'culinary-explorer', 'master-chef'],
    'login': ['week-streak', 'month-streak', 'year-streak', 'early-adopter'],
    'inventory_updated': ['inventory-master', 'perfect-week']
  }

  const badges = badgesToCheck[actionType] || []
  const newBadges = []

  for (const badgeKey of badges) {
    const alreadyAwarded = await isBadgeAwarded(userId, badgeKey, supabase)
    if (alreadyAwarded) continue

    // Calculate and update progress even if not earned yet
    const progress = await getBadgeProgress(userId, badgeKey, supabase)
    await updateAchievementProgress(userId, supabase, badgeKey, progress)

    // Check if badge should be awarded
    const earned = await checkBadgeEarned(userId, badgeKey, supabase)
    if (earned) {
      const awarded = await awardAchievement(userId, badgeKey, supabase)
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
export async function getUserAchievementProgress(userId, supabase) {
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
        progress = await getBadgeProgress(userId, achievement.key, supabase)
      }

      achievements.push({
        key: achievement.key,
        title: achievement.title,
        // Prioritize requirement description to ensure it's always up-to-date
        description: requirement?.description || achievement.description || '',
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

