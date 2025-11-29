import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useHousehold } from '../../contexts/HouseholdContext'
import { useSupabase } from '../../hooks/useSupabase'
import KPICards from '../../components/KPICards'
import AdvancedChartRecharts from '../../components/AdvancedChartRecharts'
import PieChartRecharts from '../../components/PieChartRecharts'
import BarChartRecharts from '../../components/BarChartRecharts'
import ViewSwitcher from '../../components/ViewSwitcher'
import { BarChart3 } from 'lucide-react'

const Analytics = () => {
  const { user } = useAuth()
  const { currentHousehold, isPersonal } = useHousehold()
  const supabase = useSupabase()
  const [pantryItems, setPantryItems] = useState([])
  const [pantryEvents, setPantryEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return

      try {
        setLoading(true)

        // Build query for pantry items based on household mode
        let itemsQuery = supabase
          .from('pantry_items')
          .select('*')
          .eq('user_id', user.id)

        if (isPersonal) {
          itemsQuery = itemsQuery.is('household_id', null)
        } else if (currentHousehold?.id) {
          itemsQuery = itemsQuery.eq('household_id', currentHousehold.id)
        }

        const { data: items, error: itemsError } = await itemsQuery

        if (itemsError) throw itemsError

        // Load pantry events (events are always tied to user)
        const { data: events, error: eventsError } = await supabase
          .from('pantry_events')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (eventsError) throw eventsError

        setPantryItems(items || [])
        setPantryEvents(events || [])
      } catch (error) {
        console.error('Error loading analytics data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.id, isPersonal, currentHousehold?.id, supabase])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-7 w-7" />
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Detailed insights into your pantry and food waste reduction
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewSwitcher />
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards data={{ pantryEvents }} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdvancedChartRecharts data={{ pantryEvents }} />
        <PieChartRecharts data={{ pantryItems }} />
      </div>

      <BarChartRecharts data={{ pantryItems }} />
    </div>
  )
}

export default Analytics
