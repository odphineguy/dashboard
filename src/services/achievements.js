// NOTE: supabase client now passed as parameter
// import { supabase } from '../lib/supabaseClient'
import { getAllBadgeRequirements, getBadgeProgress } from './badgeChecker'

// Default badge catalog if database table is empty
const DEFAULT_BADGE_CATALOG = [
  // Waste Reduction Badges
  { key: 'waste-warrior', title: 'Waste Warrior', description: 'Consume 50 items before they expire', tier: 'bronze', rule_value: 50, unit: 'items' },
  { key: 'eco-champion', title: 'Eco Champion', description: 'Maintain 50% waste reduction for 3 consecutive weeks', tier: 'silver', rule_value: 50, unit: '%' },
  { key: 'zero-waste', title: 'Zero Waste Hero', description: 'Achieve a week with zero food waste', tier: 'gold', rule_value: 1, unit: 'week' },
  { key: 'sustainability-champion', title: 'Sustainability Champion', description: 'Save 100kg CO2 through waste reduction', tier: 'silver', rule_value: 100, unit: 'kg' },
  { key: 'food-saver-pro', title: 'Food Saver Pro', description: 'Prevent 500 items from going to waste', tier: 'gold', rule_value: 500, unit: 'items' },
  
  // Recipe Badges
  { key: 'recipe-novice', title: 'Recipe Novice', description: 'Try 5 different recipes', tier: 'bronze', rule_value: 5, unit: 'recipes' },
  { key: 'culinary-explorer', title: 'Culinary Explorer', description: 'Try 25 different recipes', tier: 'silver', rule_value: 25, unit: 'recipes' },
  { key: 'master-chef', title: 'Master Chef', description: 'Try 100 different recipes', tier: 'gold', rule_value: 100, unit: 'recipes' },
  
  // Consistency Badges
  { key: 'week-streak', title: 'Week Streak', description: 'Log in for 7 consecutive days', tier: 'bronze', rule_value: 7, unit: 'days' },
  { key: 'month-streak', title: 'Month Streak', description: 'Log in for 30 consecutive days', tier: 'silver', rule_value: 30, unit: 'days' },
  { key: 'year-streak', title: 'Year Streak', description: 'Log in for 365 consecutive days', tier: 'gold', rule_value: 365, unit: 'days' },
  { key: 'early-adopter', title: 'Early Adopter', description: 'Use the app for 30 days', tier: 'bronze', rule_value: 30, unit: 'days' },
  { key: 'inventory-master', title: 'Inventory Master', description: 'Maintain 95% inventory accuracy for 30 days', tier: 'silver', rule_value: 95, unit: '%' },
  { key: 'money-saver', title: 'Money Saver', description: 'Save $200 through waste reduction', tier: 'silver', rule_value: 200, unit: '$' },
  { key: 'perfect-week', title: 'Perfect Week', description: 'Complete a week with perfect inventory management', tier: 'gold', rule_value: 1, unit: 'week' }
]

/**
 * Fetch all achievements from the catalog
 */
export async function fetchAchievementsCatalog(supabase) {
  try {
    const { data, error } = await supabase
      .from('achievements_catalog')
      .select('*')
      .order('key', { ascending: true })
    
    if (error) {
      console.error('Error fetching achievements catalog:', error)
      // Return default catalog if table doesn't exist or has error
      return DEFAULT_BADGE_CATALOG
    }
    
    // If catalog is empty, return default badges
    if (!data || data.length === 0) {
      return DEFAULT_BADGE_CATALOG
    }
    
    return data
  } catch (error) {
    console.error('Error fetching achievements catalog:', error)
    // Return default catalog on any error
    return DEFAULT_BADGE_CATALOG
  }
}

/**
 * Fetch user's earned achievements
 */
export async function fetchUserAchievements(userId, supabase) {
  if (!userId) return []
  
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId)
  
  if (error) {
    console.error('Error fetching user achievements:', error)
    return []
  }
  
  return data || []
}

/**
 * Get user's achievement progress for all badges
 */
export async function getUserAchievementProgress(userId, supabase) {
  if (!userId || !supabase) {
    return {
      achievements: [],
      totalEarned: 0,
      totalAvailable: 0
    }
  }

  try {
    // Fetch catalog and user achievements
    const [catalog, userAchievements] = await Promise.all([
      fetchAchievementsCatalog(supabase),
      fetchUserAchievements(userId, supabase)
    ])

    // Create map for quick lookup
    const userAchievementMap = new Map()
    userAchievements.forEach(ua => {
      userAchievementMap.set(ua.achievement_key, ua)
    })

    // Merge catalog with user progress
    const achievements = []
    for (const achievement of catalog) {
      const userProgress = userAchievementMap.get(achievement.key)
      const badgeRequirements = getAllBadgeRequirements()
      const requirement = badgeRequirements[achievement.key]
      
      // Calculate current progress if not earned (for real-time display)
      let progress = userProgress?.progress || 0
      if (!userProgress?.unlocked_at && requirement) {
        try {
          progress = await getBadgeProgress(userId, achievement.key, supabase)
        } catch (error) {
          console.error(`Error calculating progress for ${achievement.key}:`, error)
        }
      }
      
      achievements.push({
        key: achievement.key,
        title: achievement.title || achievement.key,
        description: achievement.description || requirement?.description || '',
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
      totalAvailable: 0
    }
  }
}

/**
 * Get user's achievements organized by category for UI display
 */
export async function getUserAchievementsByCategory(userId, supabase) {
  if (!userId || !supabase) {
    return {
      totalEarned: 0,
      totalAvailable: 0,
      wasteReduction: [],
      recipes: [],
      consistency: [],
      streaks: { daily: 0, weekly: 0, monthly: 0 }
    }
  }

  try {
    const { achievements, totalEarned, totalAvailable } = await getUserAchievementProgress(userId, supabase)
    
    // Categorize badges
    const wasteReduction = achievements.filter(a => 
      a.key.includes('waste') || a.key.includes('eco') || a.key.includes('zero') || 
      a.key.includes('sustainability') || a.key.includes('food-saver')
    )
    
    const recipes = achievements.filter(a => 
      a.key.includes('recipe') || a.key.includes('culinary') || a.key.includes('chef')
    )
    
    const consistency = achievements.filter(a => 
      a.key.includes('streak') || a.key.includes('adopter') || a.key.includes('inventory') ||
      a.key.includes('money') || a.key.includes('perfect')
    )

    // Calculate streaks (simplified)
    const streaks = {
      daily: achievements.find(a => a.key === 'week-streak')?.progress || 0,
      weekly: achievements.find(a => a.key === 'month-streak')?.progress || 0,
      monthly: achievements.find(a => a.key === 'year-streak')?.progress || 0
    }

    return {
      totalEarned,
      totalAvailable,
      wasteReduction: wasteReduction.map(achievement => ({
        type: achievement.key,
        name: achievement.title,
        description: achievement.description,
        earned: achievement.earned,
        earnedDate: achievement.earnedDate,
        progress: achievement.progress,
        requirement: achievement.requirement,
        unit: achievement.unit
      })),
      recipes: recipes.map(achievement => ({
        type: achievement.key,
        name: achievement.title,
        description: achievement.description,
        earned: achievement.earned,
        earnedDate: achievement.earnedDate,
        progress: achievement.progress,
        requirement: achievement.requirement,
        unit: achievement.unit
      })),
      consistency: consistency.map(achievement => ({
        type: achievement.key,
        name: achievement.title,
        description: achievement.description,
        earned: achievement.earned,
        earnedDate: achievement.earnedDate,
        progress: achievement.progress,
        requirement: achievement.requirement,
        unit: achievement.unit
      })),
      streaks
    }
  } catch (error) {
    console.error('Error fetching user achievements by category:', error)
    return {
      totalEarned: 0,
      totalAvailable: 0,
      wasteReduction: [],
      recipes: [],
      consistency: [],
      streaks: { daily: 0, weekly: 0, monthly: 0 }
    }
  }
}

/**
 * Award an achievement to a user
 */
export async function awardAchievement(userId, achievementKey, supabase) {
  if (!userId || !achievementKey) return null

  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_key: achievementKey,
        unlocked_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error awarding achievement:', error)
    return null
  }
}

/**
 * Update achievement progress
 */
export async function updateAchievementProgress(userId, supabase, achievementKey, progress) {
  if (!userId || !achievementKey) return null

  try {
    // Check if achievement progress exists
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('achievement_key', achievementKey)
      .single()

    if (existing) {
      // Update existing progress
      const { data, error } = await supabase
        .from('user_achievements')
        .update({ progress })
        .eq('user_id', userId)
        .eq('achievement_key', achievementKey)
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      // Insert new progress
      const { data, error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_key: achievementKey,
          progress
        })
        .select()
        .single()

      if (error) throw error
      return data
    }
  } catch (error) {
    console.error('Error updating achievement progress:', error)
    return null
  }
}

