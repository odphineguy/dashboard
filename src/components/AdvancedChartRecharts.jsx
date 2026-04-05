import React, { useState, useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import {
  ChartTooltip,
  ChartTooltipContent,
} from './ui/chart'

const AdvancedChartRecharts = ({ data }) => {
  const [timeRange, setTimeRange] = useState('7d')

  // Get local date string (YYYY-MM-DD) from an event to avoid timezone issues
  // Prefer created_at (always TIMESTAMPTZ) over at (may be DATE-only, causing TZ shifts)
  const getLocalDateStr = (event) => {
    const raw = event.created_at || event.at
    if (!raw) return null
    const d = new Date(raw)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const toLocalDateStr = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  // Process real data based on time range
  const chartData = useMemo(() => {
    if (!data?.pantryEvents) return []

    const now = new Date()
    const result = []

    if (timeRange === '7d') {
      // Last 7 days - daily data
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dateStr = toLocalDateStr(date)

        const dayEvents = data.pantryEvents.filter(e => getLocalDateStr(e) === dateStr)

        const consumed = dayEvents
          .filter(e => e.type === 'consumed')
          .reduce((sum, e) => sum + (parseFloat(e.quantity) || 1), 0)
        const wasted = dayEvents
          .filter(e => e.type === 'wasted')
          .reduce((sum, e) => sum + (parseFloat(e.quantity) || 1), 0)

        result.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          consumed: Math.round(consumed),
          wasted: Math.round(wasted)
        })
      }
    } else if (timeRange === '30d') {
      // Last 30 days - every 2 days for better density
      for (let i = 28; i >= 0; i -= 2) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const periodStart = toLocalDateStr(date)
        const endDate = new Date(date)
        endDate.setDate(endDate.getDate() + 2)
        const periodEnd = toLocalDateStr(endDate)

        const periodEvents = data.pantryEvents.filter(e => {
          const eDate = getLocalDateStr(e)
          return eDate >= periodStart && eDate < periodEnd
        })

        const consumed = periodEvents
          .filter(e => e.type === 'consumed')
          .reduce((sum, e) => sum + (parseFloat(e.quantity) || 1), 0)
        const wasted = periodEvents
          .filter(e => e.type === 'wasted')
          .reduce((sum, e) => sum + (parseFloat(e.quantity) || 1), 0)

        result.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          consumed: Math.round(consumed),
          wasted: Math.round(wasted)
        })
      }
    } else {
      // Last 3 months - weekly data
      for (let i = 12; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - (i * 7))
        const weekStart = toLocalDateStr(date)
        const endDate = new Date(date)
        endDate.setDate(endDate.getDate() + 7)
        const weekEnd = toLocalDateStr(endDate)

        const weekEvents = data.pantryEvents.filter(e => {
          const eDate = getLocalDateStr(e)
          return eDate >= weekStart && eDate < weekEnd
        })

        const consumed = weekEvents
          .filter(e => e.type === 'consumed')
          .reduce((sum, e) => sum + (parseFloat(e.quantity) || 1), 0)
        const wasted = weekEvents
          .filter(e => e.type === 'wasted')
          .reduce((sum, e) => sum + (parseFloat(e.quantity) || 1), 0)

        result.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          consumed: Math.round(consumed),
          wasted: Math.round(wasted)
        })
      }
    }

    return result
  }, [data, timeRange])
  
  // Chart configuration
  const chartConfig = {
    consumed: {
      label: "Consumed",
      color: "hsl(var(--chart-1))",
    },
    wasted: {
      label: "Wasted", 
      color: "hsl(var(--chart-2))",
    },
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle>Consumption & Waste Trends</CardTitle>
            <CardDescription>
              {timeRange === '7d' ? 'Daily activity for the last 7 days' :
               timeRange === '30d' ? 'Activity for the last 30 days' :
               'Weekly activity for the last 3 months'}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-muted-foreground">Consumed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-muted-foreground">Wasted</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant={timeRange === '90d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('90d')}
            className={timeRange === '90d' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}
          >
            Last 3 months
          </Button>
          <Button
            variant={timeRange === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('30d')}
            className={timeRange === '30d' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}
          >
            Last 30 days
          </Button>
          <Button
            variant={timeRange === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('7d')}
            className={timeRange === '7d' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}
          >
            Last 7 days
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillConsumed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillWasted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="wasted"
              type="natural"
              fill="url(#fillWasted)"
              stroke="#ef4444"
              strokeWidth={2}
              stackId="a"
            />
            <Area
              dataKey="consumed"
              type="natural"
              fill="url(#fillConsumed)"
              stroke="#22c55e"
              strokeWidth={2}
              stackId="a"
            />
          </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default AdvancedChartRecharts
