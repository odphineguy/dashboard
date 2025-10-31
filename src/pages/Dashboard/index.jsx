import React, { useState, useEffect } from 'react'
import MetricsCard from './components/MetricsCard'
import ExpiringItemCard from './components/ExpiringItemCard'
import WasteReductionChart from './components/WasteReductionChart'
import QuickActionCard from './components/QuickActionCard'
import RecentActivityGrid from './components/RecentActivityGrid'
import { useAuth } from '../../contexts/AuthContext'
import { useHousehold } from '../../contexts/HouseholdContext'
import { useSupabase } from '../../hooks/useSupabase'
import { Badge } from '../../components/ui/badge'
import { useBadgeAwarder } from '../../hooks/useBadgeAwarder'
import BadgeCelebration from '../../components/BadgeCelebration'
import ViewSwitcher from '../../components/ViewSwitcher'

const Dashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [events, setEvents] = useState([])
  const [wasteReductionData, setWasteReductionData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userProfile, setUserProfile] = useState({
    full_name: '',
    avatar: null,
    email: ''
  })
  const { user } = useAuth()
  const supabase = useSupabase() // Use authenticated Supabase client
  const { currentHousehold, isPersonal } = useHousehold()
  const { checkBadges, celebrationBadge, closeCelebration } = useBadgeAwarder(user?.id)
  const [metricsData, setMetricsData] = useState([
    {
      title: "Total Inventory",
      value: "0",
      subtitle: "items in pantry",
      icon: "Package",
      trend: "up",
      trendValue: "+0%",
      color: "primary"
    },
    {
      title: "Expiring Today",
      value: "0",
      subtitle: "items need attention",
      icon: "AlertTriangle",
      trend: "down",
      trendValue: "0%",
      color: "warning"
    },
    {
      title: "Expiring Soon",
      value: "0",
      subtitle: "within 3 days",
      icon: "Clock",
      trend: "up",
      trendValue: "0%",
      color: "orange"
    },
    {
      title: "Waste Reduced",
      value: "0%",
      subtitle: "consumption rate",
      icon: "TrendingDown",
      trend: "up",
      trendValue: "0%",
      color: "success"
    }
  ])
  const [expiringItems, setExpiringItems] = useState([])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  // Generate waste reduction chart data from pantry events
  const generateWasteReductionData = async (userId) => {
    try {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const { data: events, error } = await supabase
        .from('pantry_events')
        .select('type, quantity, at')
        .eq('user_id', userId)
        .gte('at', sixMonthsAgo.toISOString())
        .order('at', { ascending: true })

      if (error) {
        console.error('Error generating waste reduction data:', error)
        return [
          { month: 'Jul', consumed: 0, wasted: 0 },
          { month: 'Aug', consumed: 0, wasted: 0 },
          { month: 'Sep', consumed: 0, wasted: 0 },
          { month: 'Oct', consumed: 0, wasted: 0 },
          { month: 'Nov', consumed: 0, wasted: 0 },
          { month: 'Dec', consumed: 0, wasted: 0 }
        ]
      }

      const monthlyData = {}
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

      events?.forEach(event => {
        const date = new Date(event.at)
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`
        const monthName = monthNames[date.getMonth()]

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthName,
            consumed: 0,
            wasted: 0
          }
        }

        const quantity = parseFloat(event.quantity) || 0
        if (event.type === 'consumed') {
          monthlyData[monthKey].consumed += quantity
        } else if (event.type === 'wasted') {
          monthlyData[monthKey].wasted += quantity
        }
      })

      const currentDate = new Date()
      const filledData = []

      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date()
        targetDate.setMonth(targetDate.getMonth() - i)
        const monthName = monthNames[targetDate.getMonth()]

        const existingData = Object.values(monthlyData).find(d => d.month === monthName)
        filledData.push(existingData || {
          month: monthName,
          consumed: 0,
          wasted: 0
        })
      }

      return filledData
    } catch (error) {
      console.error('Error generating waste reduction data:', error)
      return [
        { month: 'Jul', consumed: 0, wasted: 0 },
        { month: 'Aug', consumed: 0, wasted: 0 },
        { month: 'Sep', consumed: 0, wasted: 0 },
        { month: 'Oct', consumed: 0, wasted: 0 },
        { month: 'Nov', consumed: 0, wasted: 0 },
        { month: 'Dec', consumed: 0, wasted: 0 }
      ]
    }
  }

  const loadUserProfile = async () => {
    if (!user?.id) return

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.warn('Profile fetch error:', profileError)
      }

      setUserProfile({
        full_name: profile?.full_name || user?.user_metadata?.full_name || '',
        avatar: profile?.avatar_url || null,
        email: user?.email || ''
      })
    } catch (error) {
      console.error('Error loading user profile:', error)
      setUserProfile({
        full_name: user?.user_metadata?.full_name || '',
        avatar: null,
        email: user?.email || ''
      })
    }
  }

  const calculateDashboardMetrics = async (userId) => {
    try {
      let query = supabase
        .from('pantry_items')
        .select('*')
        .eq('user_id', userId)

      if (isPersonal) {
        query = query.is('household_id', null)
      } else if (currentHousehold?.id) {
        query = query.eq('household_id', currentHousehold.id)
      }

      const { data: pantryItems, error } = await query

      if (error) {
        console.error('Error calculating dashboard metrics:', error)
        return {
          totalInventory: 0,
          expiringToday: 0,
          expiringSoon: 0,
          wasteReduction: 0,
          wasteReductionChange: 0
        }
      }

      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
      const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0]

      const totalInventory = pantryItems?.length || 0

      const expiringToday = pantryItems?.filter(item =>
        item.expiry_date === todayStr
      ).length || 0

      const expiringSoon = pantryItems?.filter(item => {
        if (!item.expiry_date) return false
        return item.expiry_date > todayStr && item.expiry_date <= threeDaysStr
      }).length || 0

      // Get events for last 30 days and previous 30 days for comparison
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

      const { data: recentEvents } = await supabase
        .from('pantry_events')
        .select('type, at')
        .eq('user_id', userId)
        .gte('at', sixtyDaysAgo.toISOString())

      // Split into current and previous periods
      const currentPeriodEvents = recentEvents?.filter(e => new Date(e.at) >= thirtyDaysAgo) || []
      const previousPeriodEvents = recentEvents?.filter(e => {
        const date = new Date(e.at)
        return date >= sixtyDaysAgo && date < thirtyDaysAgo
      }) || []

      // Current period
      const consumedCount = currentPeriodEvents.filter(e => e.type === 'consumed').length
      const wastedCount = currentPeriodEvents.filter(e => e.type === 'wasted').length
      const totalEvents = consumedCount + wastedCount
      const wasteReduction = totalEvents > 0 ? Math.round((consumedCount / totalEvents) * 100) : 0

      // Previous period
      const prevConsumedCount = previousPeriodEvents.filter(e => e.type === 'consumed').length
      const prevWastedCount = previousPeriodEvents.filter(e => e.type === 'wasted').length
      const prevTotalEvents = prevConsumedCount + prevWastedCount
      const prevWasteReduction = prevTotalEvents > 0 ? Math.round((prevConsumedCount / prevTotalEvents) * 100) : 0

      // Calculate changes
      const wasteReductionChange = wasteReduction - prevWasteReduction

      return {
        totalInventory,
        expiringToday,
        expiringSoon,
        wasteReduction,
        wasteReductionChange
      }
    } catch (error) {
      console.error('Error calculating dashboard metrics:', error)
      return {
        totalInventory: 0,
        expiringToday: 0,
        expiringSoon: 0,
        wasteReduction: 0,
        wasteReductionChange: 0
      }
    }
  }

  const loadExpiringItems = async (userId) => {
    try {
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
      const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0]

      let query = supabase
        .from('pantry_items')
        .select('*')
        .eq('user_id', userId)

      if (isPersonal) {
        query = query.is('household_id', null)
      } else if (currentHousehold?.id) {
        query = query.eq('household_id', currentHousehold.id)
      }

      query = query
        .not('expiry_date', 'is', null)
        .lte('expiry_date', threeDaysStr)
        .order('expiry_date', { ascending: true })
        .limit(4)

      const { data: pantryItems, error } = await query

      if (error) {
        console.error('Error loading expiring items:', error)
        return []
      }

      const transformedItems = pantryItems?.map(item => {
        let status = 'expiring-soon'

        if (item.expiry_date === todayStr) {
          status = 'expires-today'
        } else if (item.expiry_date < todayStr) {
          status = 'expired'
        }

        return {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          quantityDisplay: `${item.quantity || 1} ${item.unit || 'unit'}`,
          expiryDate: item.expiry_date,
          category: item.category || 'other',
          image: null,
          status: status
        }
      }) || []

      setExpiringItems(transformedItems)
    } catch (error) {
      console.error('Error loading expiring items:', error)
      setExpiringItems([])
    }
  }

  const handleConsumed = async (item) => {
    if (!user?.id) return

    try {
      // Record 1 unit consumed
      const { error: eventError } = await supabase
        .from('pantry_events')
        .insert([{
          user_id: user.id,
          item_id: item.id,
          type: 'consumed',
          quantity: 1,
          at: new Date().toISOString()
        }])

      if (eventError) throw eventError

      const newQuantity = item.quantity - 1

      if (newQuantity <= 0) {
        // Delete the item if quantity reaches 0
        const { error: deleteError } = await supabase
          .from('pantry_items')
          .delete()
          .eq('id', item.id)

        if (deleteError) throw deleteError

        // Update UI - remove item
        setExpiringItems(prev => prev.filter(i => i.id !== item.id))
      } else {
        // Update the quantity
        const { error: updateError } = await supabase
          .from('pantry_items')
          .update({ quantity: newQuantity })
          .eq('id', item.id)

        if (updateError) throw updateError

        // Update UI - reduce quantity
        setExpiringItems(prev => prev.map(i =>
          i.id === item.id ? {
            ...i,
            quantity: newQuantity,
            quantityDisplay: `${newQuantity} ${i.unit || 'unit'}`
          } : i
        ))
      }

      // Check for badges
      await checkBadges('item_consumed')

      // Refresh metrics
      const metrics = await calculateDashboardMetrics(user.id)
      setMetricsData([
        {
          title: "Total Inventory",
          value: metrics.totalInventory.toString(),
          subtitle: "items in pantry",
          icon: "Package",
          trend: "neutral",
          trendValue: "Current total",
          color: "primary"
        },
        {
          title: "Expiring Today",
          value: metrics.expiringToday.toString(),
          subtitle: "items need attention",
          icon: "AlertTriangle",
          trend: metrics.expiringToday > 0 ? "up" : "down",
          trendValue: metrics.expiringToday > 0 ? "Take action now" : "All good!",
          color: "warning"
        },
        {
          title: "Expiring Soon",
          value: metrics.expiringSoon.toString(),
          subtitle: "within 3 days",
          icon: "Clock",
          trend: metrics.expiringSoon > 0 ? "up" : "down",
          trendValue: metrics.expiringSoon > 0 ? "Use soon" : "No urgent items",
          color: "orange"
        },
        {
          title: "Success Rate",
          value: `${metrics.wasteReduction}%`,
          subtitle: "food consumed (not wasted)",
          icon: "TrendingUp",
          trend: metrics.wasteReductionChange >= 0 ? "up" : "down",
          trendValue: `${metrics.wasteReductionChange >= 0 ? '+' : ''}${metrics.wasteReductionChange}% vs last month`,
          color: "success"
        }
      ])
    } catch (error) {
      console.error('Error marking item as consumed:', error)
      alert('Failed to mark item as consumed')
    }
  }

  const handleWasted = async (item) => {
    if (!user?.id) return

    try {
      // Record 1 unit wasted
      const { error: eventError } = await supabase
        .from('pantry_events')
        .insert([{
          user_id: user.id,
          item_id: item.id,
          type: 'wasted',
          quantity: 1,
          at: new Date().toISOString()
        }])

      if (eventError) throw eventError

      const newQuantity = item.quantity - 1

      if (newQuantity <= 0) {
        // Delete the item if quantity reaches 0
        const { error: deleteError } = await supabase
          .from('pantry_items')
          .delete()
          .eq('id', item.id)

        if (deleteError) throw deleteError

        // Update UI - remove item
        setExpiringItems(prev => prev.filter(i => i.id !== item.id))
      } else {
        // Update the quantity
        const { error: updateError } = await supabase
          .from('pantry_items')
          .update({ quantity: newQuantity })
          .eq('id', item.id)

        if (updateError) throw updateError

        // Update UI - reduce quantity
        setExpiringItems(prev => prev.map(i =>
          i.id === item.id ? {
            ...i,
            quantity: newQuantity,
            quantityDisplay: `${newQuantity} ${i.unit || 'unit'}`
          } : i
        ))
      }

      // Refresh metrics
      const metrics = await calculateDashboardMetrics(user.id)
      setMetricsData([
        {
          title: "Total Inventory",
          value: metrics.totalInventory.toString(),
          subtitle: "items in pantry",
          icon: "Package",
          trend: "neutral",
          trendValue: "Current total",
          color: "primary"
        },
        {
          title: "Expiring Today",
          value: metrics.expiringToday.toString(),
          subtitle: "items need attention",
          icon: "AlertTriangle",
          trend: metrics.expiringToday > 0 ? "up" : "down",
          trendValue: metrics.expiringToday > 0 ? "Take action now" : "All good!",
          color: "warning"
        },
        {
          title: "Expiring Soon",
          value: metrics.expiringSoon.toString(),
          subtitle: "within 3 days",
          icon: "Clock",
          trend: metrics.expiringSoon > 0 ? "up" : "down",
          trendValue: metrics.expiringSoon > 0 ? "Use soon" : "No urgent items",
          color: "orange"
        },
        {
          title: "Success Rate",
          value: `${metrics.wasteReduction}%`,
          subtitle: "food consumed (not wasted)",
          icon: "TrendingUp",
          trend: metrics.wasteReductionChange >= 0 ? "up" : "down",
          trendValue: `${metrics.wasteReductionChange >= 0 ? '+' : ''}${metrics.wasteReductionChange}% vs last month`,
          color: "success"
        }
      ])
    } catch (error) {
      console.error('Error marking item as wasted:', error)
      alert('Failed to mark item as wasted')
    }
  }

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Check for pending onboarding data (from Google OAuth redirect)
        const pendingOnboarding = localStorage.getItem('pending_onboarding')
        if (pendingOnboarding) {
          try {
            const onboardingData = JSON.parse(pendingOnboarding)
            // Save to profiles table
            await supabase
              .from('profiles')
              .upsert({
                id: user.id,
                full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
                avatar_url: user.user_metadata?.avatar_url || '',
                onboarding_data: {
                  subscription_tier: onboardingData.subscription_tier,
                  account_type: onboardingData.account_type,
                  onboarded_at: new Date().toISOString()
                }
              })

            // Clear from localStorage
            localStorage.removeItem('pending_onboarding')
          } catch (err) {
            console.error('Error saving pending onboarding data:', err)
          }
        }

        // Ensure user profile exists
        try {
          await loadUserProfile()
        } catch (profileError) {
          console.error('Error loading user profile:', profileError)
          // Try to create a basic profile if it doesn't exist
          if (profileError.code === 'PGRST116') { // No rows returned
            try {
              await supabase
                .from('profiles')
                .upsert({
                  id: user.id,
                  full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
                  avatar_url: user.user_metadata?.avatar_url || '',
                  subscription_tier: 'free',
                  subscription_status: 'active',
                  onboarding_completed: false
                })
              console.log('Created basic profile for user')
            } catch (createError) {
              console.error('Error creating profile:', createError)
            }
          }
        }

        const { data: rows } = await supabase
          .from('pantry_events')
          .select(`
            *,
            profiles:user_id (
              full_name,
              avatar_url
            ),
            pantry_items:item_id (
              name,
              unit,
              category
            )
          `)
          .eq('user_id', user.id)
          .order('at', { ascending: false })
          .limit(10)

        // Transform the data to include profile info and item details
        const transformedEvents = rows?.map(event => ({
          ...event,
          user_name: event.profiles?.full_name || user?.email?.split('@')[0] || 'You',
          user_avatar: event.profiles?.avatar_url || null,
          user_email: user?.email || '',
          name: event.pantry_items?.name || 'Unknown Item',
          unit: event.pantry_items?.unit || '',
          category: event.pantry_items?.category || ''
        })) || []

        setEvents(transformedEvents)

        const chartData = await generateWasteReductionData(user.id)
        setWasteReductionData(chartData)

        const metrics = await calculateDashboardMetrics(user.id)
        setMetricsData([
          {
            title: "Total Inventory",
            value: metrics.totalInventory.toString(),
            subtitle: "items in pantry",
            icon: "Package",
            trend: "neutral",
            trendValue: "Current total",
            color: "primary"
          },
          {
            title: "Expiring Today",
            value: metrics.expiringToday.toString(),
            subtitle: "items need attention",
            icon: "AlertTriangle",
            trend: metrics.expiringToday > 0 ? "up" : "down",
            trendValue: metrics.expiringToday > 0 ? "Take action now" : "All good!",
            color: "warning"
          },
          {
            title: "Expiring Soon",
            value: metrics.expiringSoon.toString(),
            subtitle: "within 3 days",
            icon: "Clock",
            trend: metrics.expiringSoon > 0 ? "up" : "down",
            trendValue: metrics.expiringSoon > 0 ? "Use soon" : "No urgent items",
            color: "orange"
          },
          {
            title: "Success Rate",
            value: `${metrics.wasteReduction}%`,
            subtitle: "food consumed (not wasted)",
            icon: "TrendingUp",
            trend: metrics.wasteReductionChange >= 0 ? "up" : "down",
            trendValue: `${metrics.wasteReductionChange >= 0 ? '+' : ''}${metrics.wasteReductionChange}% vs last month`,
            color: "success"
          }
        ])

        await loadExpiringItems(user.id)

      } catch (error) {
        console.error('Error loading dashboard data:', error)
        setError(error.message || 'Failed to load dashboard data')
        setEvents([])
        setWasteReductionData([
          { month: 'Jul', consumed: 0, wasted: 0 },
          { month: 'Aug', consumed: 0, wasted: 0 },
          { month: 'Sep', consumed: 0, wasted: 0 },
          { month: 'Oct', consumed: 0, wasted: 0 },
          { month: 'Nov', consumed: 0, wasted: 0 },
          { month: 'Dec', consumed: 0, wasted: 0 }
        ])
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [user?.id, isPersonal, currentHousehold?.id, supabase])

  // Check for login badges when user loads dashboard
  useEffect(() => {
    if (user?.id && !loading) {
      checkBadges('login')
    }
  }, [user?.id, loading, checkBadges])

  const quickActions = [
    {
      title: "Add New Items",
      description: "Manually add food items to your inventory with expiration tracking",
      icon: "Plus",
      variant: "primary",
      route: "/scanner"
    },
    {
      title: "Scan Receipt",
      description: "Use AI to automatically add items from grocery receipts",
      icon: "ScanLine",
      variant: "secondary",
      route: "/scanner"
    },
    {
      title: "Find Recipes",
      description: "Get AI-powered recipe suggestions based on your expiring ingredients",
      icon: "ChefHat",
      variant: "accent",
      route: "/recipes"
    },
    {
      title: "View Analytics",
      description: "Track your waste reduction progress and consumption patterns",
      icon: "BarChart3",
      variant: "default",
      route: "/analytics"
    }
  ]

  const formatTime = (date) => {
    return date?.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (date) => {
    return date?.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Dashboard Loading Error</h2>
          <p className="text-red-700 mb-4">
            There was an error loading your dashboard data. This might be due to:
          </p>
          <ul className="text-red-700 text-sm text-left mb-4 space-y-1">
            <li>• Database connection issues</li>
            <li>• Missing user profile setup</li>
            <li>• Network connectivity problems</li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Retry Loading Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-border rounded-lg">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Good {currentTime?.getHours() < 12 ? 'Morning' : currentTime?.getHours() < 17 ? 'Afternoon' : 'Evening'}{userProfile.full_name ? `, ${userProfile.full_name}` : ''}!
              </h1>
              <p className="text-muted-foreground mt-2">
                {formatDate(currentTime)} • {formatTime(currentTime)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Let's check your pantry and reduce food waste today
              </p>
            </div>

            <div className="flex items-center gap-3">
              <ViewSwitcher />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricsData?.map((metric, index) => (
          <MetricsCard
            key={index}
            title={metric?.title}
            value={metric?.value}
            subtitle={metric?.subtitle}
            icon={metric?.icon}
            trend={metric?.trend}
            trendValue={metric?.trendValue}
            color={metric?.color}
          />
        ))}
      </div>

      {/* Expiring Items Section */}
      {expiringItems.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Items Expiring Soon</h2>
              <p className="text-sm text-muted-foreground">Most urgent items - take action to prevent food waste</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="flex space-x-4 pb-4">
              {expiringItems?.map((item) => (
                <ExpiringItemCard
                  key={item?.id}
                  item={item}
                  onConsumed={handleConsumed}
                  onWasted={handleWasted}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Waste Reduction Chart */}
      {loading ? (
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading chart...</p>
            </div>
          </div>
        </div>
      ) : (
        <WasteReductionChart data={wasteReductionData} />
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <QuickActionCard
              key={index}
              title={action.title}
              description={action.description}
              icon={action.icon}
              variant={action.variant}
              route={action.route}
            />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <RecentActivityGrid events={events} loading={loading} />

      {/* Badge Celebration Modal */}
      {celebrationBadge && (
        <BadgeCelebration
          badge={celebrationBadge}
          onClose={closeCelebration}
          userName={userProfile?.full_name || user?.email?.split('@')[0] || 'User'}
        />
      )}
    </div>
  )
}

export default Dashboard
