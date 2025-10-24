// NOTE: supabase client now passed as parameter
// import { supabase } from '../lib/supabaseClient'

/**
 * Fetch all achievements from the catalog
 */
export async function fetchAchievementsCatalog(supabase) {
  const { data, error } = await supabase
    .from('achievements_catalog')
    .select('*')
    .order('key', { ascending: true })
  
  if (error) {
    console.error('Error fetching achievements catalog:', error)
    return []
  }
  
  return data || []
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
export async function getUserAchievementProgress(userId) {
  if (!userId) {
    return {
      achievements: [],
      totalEarned: 0,
      totalAvailable: 0
    }
  }

  try {
    // Fetch catalog and user achievements
    const [catalog, userAchievements] = await Promise.all([
      fetchAchievementsCatalog(),
      fetchUserAchievements(userId)
    ])

    // Create map for quick lookup
    const userAchievementMap = new Map()
    userAchievements.forEach(ua => {
      userAchievementMap.set(ua.achievement_key, ua)
    })

    // Merge catalog with user progress
    const achievements = catalog.map(achievement => {
      const userProgress = userAchievementMap.get(achievement.key)
      
      return {
        key: achievement.key,
        title: achievement.title,
        description: achievement.description,
        tier: achievement.tier || 'bronze',
        earned: userProgress ? Boolean(userProgress.unlocked_at) : false,
        earnedDate: userProgress?.unlocked_at 
          ? new Date(userProgress.unlocked_at).toLocaleDateString()
          : null,
        progress: userProgress?.progress || 0,
        requirement: achievement.rule_value || 0,
        unit: achievement.unit || ''
      }
    })

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
export async function getUserAchievementsByCategory(userId) {
  if (!userId) {
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
    const { achievements, totalEarned, totalAvailable } = await getUserAchievementProgress(userId)
    
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

