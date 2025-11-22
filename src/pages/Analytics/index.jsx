import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSupabase } from '../../hooks/useSupabase'
import KPICards from '../../components/KPICards'
import AdvancedChartRecharts from '../../components/AdvancedChartRecharts'
import PieChartRecharts from '../../components/PieChartRecharts'
import BarChartRecharts from '../../components/BarChartRecharts'

const Analytics = () => {
  const { user } = useAuth()
  const supabase = useSupabase()
  const [pantryItems, setPantryItems] = useState([])
  const [pantryEvents, setPantryEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return

      try {
        setLoading(true)

        // Load pantry items
        const { data: items, error: itemsError } = await supabase
          .from('pantry_items')
          .select('*')
          .eq('user_id', user.id)
          .is('household_id', null)

        if (itemsError) throw itemsError

        // Load pantry events
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
  }, [user?.id, supabase])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Analytics</h1>
        <p className="text-muted-foreground">Detailed insights into your pantry and food waste reduction</p>
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
