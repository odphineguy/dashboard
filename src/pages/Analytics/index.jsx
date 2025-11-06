import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useHousehold } from '../../contexts/HouseholdContext'
import { useSupabase } from '../../hooks/useSupabase'
import { Badge } from '../../components/ui/badge'
import ViewSwitcher from '../../components/ViewSwitcher'
import KPICards from '../../components/KPICards'
import AdvancedChart from '../../components/AdvancedChartRecharts'
import PieChart from '../../components/PieChart'
import PieChart2 from '../../components/PieChart2'
import BarChart from '../../components/BarChart'
import BarChart2 from '../../components/BarChart2'

const Analytics = () => {
  const { user } = useAuth()
  const { currentHousehold, isPersonal } = useHousehold()
  const supabase = useSupabase() // Use authenticated Supabase client with Clerk JWT
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState({
    pantryEvents: [],
    pantryItems: [],
    recipes: []
  })

  useEffect(() => {
    const loadAnalyticsData = async () => {
      if (!user?.id) return

      try {
        setLoading(true)

        // Build queries with household/personal filtering
        let eventsQuery = supabase
          .from('pantry_events')
          .select('*')
          .eq('user_id', user.id)
          .order('at', { ascending: false })

        let itemsQuery = supabase
          .from('pantry_items')
          .select('*')
          .eq('user_id', user.id)

        if (isPersonal) {
          eventsQuery = eventsQuery.is('household_id', null)
          itemsQuery = itemsQuery.is('household_id', null)
        } else if (currentHousehold?.id) {
          eventsQuery = eventsQuery.eq('household_id', currentHousehold.id)
          itemsQuery = itemsQuery.eq('household_id', currentHousehold.id)
        }

        // Fetch all data in parallel
        const [
          { data: events, error: eventsError },
          { data: items, error: itemsError },
          { data: recipes, error: recipesError }
        ] = await Promise.all([
          eventsQuery,
          itemsQuery,
          supabase.from('ai_saved_recipes').select('*').eq('user_id', user.id)
        ])

        if (eventsError) throw eventsError
        if (itemsError) throw itemsError
        if (recipesError) throw recipesError

        setAnalyticsData({
          pantryEvents: events || [],
          pantryItems: items || [],
          recipes: recipes || []
        })
      } catch (error) {
        console.error('Error loading analytics data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAnalyticsData()
  }, [user?.id, isPersonal, currentHousehold?.id, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your pantry and food waste patterns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewSwitcher />
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards data={analyticsData} />

      {/* Advanced Chart */}
      <div className="mb-8">
        <AdvancedChart data={analyticsData} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PieChart data={analyticsData} />
        <PieChart2 data={analyticsData} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <BarChart data={analyticsData} />
        <BarChart2 data={analyticsData} />
      </div>
    </div>
  )
}

export default Analytics
