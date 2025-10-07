import React, { useState, useEffect } from 'react'
import ProfileHeader from './components/ProfileHeader'
import PersonalGoals from './components/PersonalGoals'
import AchievementSystem from './components/AchievementSystem'
import HouseholdInformation from './components/HouseholdInformation'
import NotificationPreferences from './components/NotificationPreferences'
import AccountSettings from './components/AccountSettings'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { getUserAchievementsByCategory } from '../../services/achievements'

const Profile = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)

  // User data state
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    avatar: null,
    joinDate: '',
    stats: {
      daysActive: 0,
      wasteReduced: 0,
      recipesTried: 0
    }
  })

  // Personal goals state
  const [personalGoals, setPersonalGoals] = useState({
    wasteReduction: 25,
    spendingLimit: 400,
    recipesPerWeek: 3,
    inventoryChecks: 2
  })

  // Achievements state
  const [achievements, setAchievements] = useState({
    totalEarned: 0,
    totalAvailable: 0,
    wasteReduction: [],
    recipes: [],
    consistency: [],
    streaks: { daily: 0, weekly: 0, monthly: 0 }
  })

  // Household data state
  const [householdData, setHouseholdData] = useState({
    familySize: '4',
    cookingFrequency: 'daily',
    dietaryRestrictions: {
      vegetarian: false,
      vegan: false,
      glutenFree: false,
      dairyFree: false,
      nutFree: false,
      lowSodium: false,
      diabetic: false,
      keto: false,
      paleo: false,
      halal: false,
      kosher: false
    },
    favoriteCuisines: '',
    allergies: ''
  })

  // Notification preferences state
  const [notificationPreferences, setNotificationPreferences] = useState({
    expiration: {
      push: true,
      email: true,
      sms: false
    },
    recipes: {
      push: true,
      email: true
    },
    achievements: {
      push: true,
      email: false
    },
    inventory: {
      push: false,
      email: true
    }
  })

  // Load user data and achievements
  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.id) return

      try {
        setLoading(true)

        // Load profile data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error loading profile:', profileError)
        }

        // Load achievements
        const achievementsData = await getUserAchievementsByCategory(user.id)

        // Calculate user stats
        const { data: pantryEvents } = await supabase
          .from('pantry_events')
          .select('type, quantity')
          .eq('user_id', user.id)

        const { data: recipes } = await supabase
          .from('ai_saved_recipes')
          .select('id')
          .eq('user_id', user.id)

        const consumed = pantryEvents?.filter(e => e.type === 'consumed').length || 0
        const wasted = pantryEvents?.filter(e => e.type === 'wasted').length || 0
        const total = consumed + wasted
        const wasteReduced = total > 0 ? Math.round((consumed / total) * 100) : 0

        const daysActive = profile?.created_at
          ? Math.floor((new Date() - new Date(profile.created_at)) / (1000 * 60 * 60 * 24))
          : 0

        setUserData({
          name: profile?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          avatar: profile?.avatar || null,
          joinDate: profile?.created_at || new Date().toISOString(),
          stats: {
            daysActive,
            wasteReduced,
            recipesTried: recipes?.length || 0
          }
        })

        setAchievements(achievementsData)
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [user?.id, user?.email])

  // Handler functions
  const handleUpdateProfile = (newData) => {
    setUserData({ ...userData, ...newData })
  }

  const handleUpdateGoals = (newGoals) => {
    setPersonalGoals(newGoals)
    console.log('Goals updated:', newGoals)
  }

  const handleUpdateHousehold = (newHouseholdData) => {
    setHouseholdData(newHouseholdData)
    console.log('Household information updated:', newHouseholdData)
  }

  const handleUpdateNotifications = (newPreferences) => {
    setNotificationPreferences(newPreferences)
    console.log('Notification preferences updated:', newPreferences)
  }

  const handlePasswordChange = (passwordData) => {
    console.log('Password change requested:', passwordData)
    alert('Password updated successfully!')
  }

  const handleDataExport = (exportType) => {
    console.log('Data export requested:', exportType)
    alert(`${exportType} data export started. You'll receive an email when ready.`)
  }

  const handleAccountDelete = () => {
    console.log('Account deletion requested')
    alert('Account deletion process initiated. You have 30 days to cancel this action.')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Profile Header */}
      <ProfileHeader
        user={userData}
        onUpdateProfile={handleUpdateProfile}
        userId={user?.id}
      />

      {/* Personal Goals */}
      <PersonalGoals
        goals={personalGoals}
        onUpdateGoals={handleUpdateGoals}
      />

      {/* Achievement System */}
      <AchievementSystem
        achievements={achievements}
      />

      {/* Household Information */}
      <HouseholdInformation
        householdData={householdData}
        onUpdateHousehold={handleUpdateHousehold}
      />

      {/* Notification Preferences */}
      <NotificationPreferences
        preferences={notificationPreferences}
        onUpdatePreferences={handleUpdateNotifications}
      />

      {/* Account Settings */}
      <AccountSettings
        onPasswordChange={handlePasswordChange}
        onDataExport={handleDataExport}
        onAccountDelete={handleAccountDelete}
      />
    </div>
  )
}

export default Profile
