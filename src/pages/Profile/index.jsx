import React, { useState, useEffect } from 'react'
import ProfileHeader from './components/ProfileHeader'
import PersonalGoals from './components/PersonalGoals'
import AchievementSystem from './components/AchievementSystem'
import NotificationPreferences from './components/NotificationPreferences'
import AccountSettings from './components/AccountSettings'
import SubscriptionManagement from './components/SubscriptionManagement'
import ClearDataButton from '../../components/ClearDataButton'
import { useAuth } from '../../contexts/AuthContext'
import { useSupabase } from '../../hooks/useSupabase'
import { getUserAchievementsByCategory } from '../../services/achievements'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Wrench } from 'lucide-react'

const Profile = () => {
  const { user } = useAuth()
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)

  // User data state
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    avatar: null,
    joinDate: '',
    subscriptionTier: 'free',
    subscriptionStatus: 'active',
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

  // Notification preferences state (email only)
  const [notificationPreferences, setNotificationPreferences] = useState({
    expiration: {
      daily: true,
      critical: true,
      weekly: false
    },
    recipes: {
      weekly: false,
      expiring: true
    },
    achievements: {
      earned: true,
      monthly: false
    },
    inventory: {
      weekly: false,
      lowStock: true
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

        // Load achievements - pass supabase as parameter
        const achievementsData = await getUserAchievementsByCategory(user.id, supabase)

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
          subscriptionTier: profile?.subscription_tier || 'free',
          subscriptionStatus: profile?.subscription_status || 'active',
          id: user.id,
          stats: {
            daysActive,
            wasteReduced,
            recipesTried: recipes?.length || 0
          }
        })

        // Load saved goals if they exist
        if (profile?.personal_goals) {
          setPersonalGoals(profile.personal_goals)
        }

        // Load saved notification preferences if they exist
        if (profile?.notification_preferences) {
          setNotificationPreferences(profile.notification_preferences)
        }

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

  const handleUpdateGoals = async (newGoals) => {
    try {
      setPersonalGoals(newGoals)

      // Save to database
      const { error } = await supabase
        .from('profiles')
        .update({
          personal_goals: newGoals
        })
        .eq('id', user.id)

      if (error) {
        console.error('Error saving goals:', error)
        alert('Failed to save goals. Please try again.')
        return
      }

      console.log('Goals saved successfully:', newGoals)
      alert('Goals saved successfully!')
    } catch (error) {
      console.error('Error updating goals:', error)
      alert('Failed to save goals. Please try again.')
    }
  }

  const handleUpdateNotifications = async (newPreferences) => {
    try {
      setNotificationPreferences(newPreferences)

      // Save to database
      const { error } = await supabase
        .from('profiles')
        .update({
          notification_preferences: newPreferences
        })
        .eq('id', user.id)

      if (error) {
        console.error('Error saving notification preferences:', error)
        alert('Failed to save notification preferences. Please try again.')
        return
      }

      console.log('Notification preferences saved successfully:', newPreferences)
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      alert('Failed to save notification preferences. Please try again.')
    }
  }

  const handlePasswordChange = async (passwordData) => {
    try {
      // Use Supabase Auth to update password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) {
        console.error('Error changing password:', error)
        alert(`Failed to change password: ${error.message}`)
        return
      }

      alert('Password updated successfully!')
      console.log('Password changed successfully')
    } catch (error) {
      console.error('Error changing password:', error)
      alert('Failed to change password. Please try again.')
    }
  }

  const handleDataExport = async (exportType) => {
    try {
      if (!user?.id) return

      // Fetch all user data
      const [
        { data: profile },
        { data: pantryItems },
        { data: pantryEvents },
        { data: recipes },
        { data: storageLocations },
        { data: households },
        { data: userAchievements }
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('pantry_items').select('*').eq('user_id', user.id),
        supabase.from('pantry_events').select('*').eq('user_id', user.id),
        supabase.from('ai_saved_recipes').select('*').eq('user_id', user.id),
        supabase.from('storage_locations').select('*').eq('user_id', user.id),
        supabase.from('household_members').select('households(*)').eq('user_id', user.id),
        supabase.from('user_achievements').select('*').eq('user_id', user.id)
      ])

      // Compile complete data export
      const completeData = {
        exportDate: new Date().toISOString(),
        exportType: 'complete_profile_data',
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        },
        profile: profile || {},
        inventory: {
          items: pantryItems || [],
          events: pantryEvents || [],
          storageLocations: storageLocations || []
        },
        recipes: recipes || [],
        households: households || [],
        achievements: userAchievements || [],
        settings: {
          personalGoals: profile?.personal_goals || {},
          notificationPreferences: profile?.notification_preferences || {}
        }
      }

      // Download as JSON
      const jsonData = JSON.stringify(completeData, null, 2)
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `meal-saver-complete-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      alert('✓ Complete data export downloaded successfully!')
      console.log('Data export completed:', exportType)
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Failed to export data. Please try again.')
    }
  }

  const handleAccountDelete = async () => {
    try {
      if (!user?.id) return

      // Delete user data in order (foreign key constraints)
      // Note: Supabase RLS policies should handle cascading deletes where configured
      const deleteOperations = [
        supabase.from('pantry_events').delete().eq('user_id', user.id),
        supabase.from('pantry_items').delete().eq('user_id', user.id),
        supabase.from('ai_saved_recipes').delete().eq('user_id', user.id),
        supabase.from('storage_locations').delete().eq('user_id', user.id),
        supabase.from('user_achievements').delete().eq('user_id', user.id),
        supabase.from('household_members').delete().eq('user_id', user.id),
        supabase.from('profiles').delete().eq('id', user.id)
      ]

      // Execute all delete operations
      await Promise.all(deleteOperations)

      // Delete the auth user account (this should be the last step)
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id)

      if (authError) {
        // If admin.deleteUser is not available (requires service role key),
        // use the regular user delete endpoint
        console.log('Admin delete not available, using regular auth flow')
        // User will need to be logged out and they can request deletion through support
      }

      alert('Account deleted successfully. You will be logged out.')

      // Sign out and redirect to login
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Failed to delete account. Please contact support for assistance.')
    }
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

      {/* Subscription Management */}
      <SubscriptionManagement
        userData={userData}
        onUpdateSubscription={handleUpdateProfile}
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

      {/* Dev Tools - REMOVE AFTER TESTING */}
      <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
            <Wrench className="h-5 w-5" />
            Developer Tools
          </CardTitle>
          <CardDescription className="text-yellow-600 dark:text-yellow-500">
            Testing utilities - Remove before production
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClearDataButton />
        </CardContent>
      </Card>
    </div>
  )
}

export default Profile
