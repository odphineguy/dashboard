import React, { useState, useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from './ui/chart'

const AdvancedChartRecharts = ({ data }) => {
  const [timeRange, setTimeRange] = useState('7d')

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
        date.setHours(0, 0, 0, 0)
        const dayStart = new Date(date)
        const dayEnd = new Date(date)
        dayEnd.setHours(23, 59, 59, 999)

        const dayEvents = data.pantryEvents.filter(e => {
          const eventDate = new Date(e.at)
          return eventDate >= dayStart && eventDate <= dayEnd
        })

        const consumed = dayEvents
          .filter(e => e.type === 'consumed')
          .reduce((sum, e) => sum + (parseFloat(e.quantity) || 1), 0)
        const wasted = dayEvents
          .filter(e => e.type === 'wasted')
          .reduce((sum, e) => sum + (parseFloat(e.quantity) || 1), 0)

        result.push({
          date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          consumed: Math.round(consumed),
          wasted: Math.round(wasted)
        })
      }
    } else if (timeRange === '30d') {
      // Last 30 days - every 2 days for better density
      for (let i = 28; i >= 0; i -= 2) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)
        const dayStart = new Date(date)
        const dayEnd = new Date(dayStart)
        dayEnd.setDate(dayEnd.getDate() + 2)

        const periodEvents = data.pantryEvents.filter(e => {
          const eventDate = new Date(e.at)
          return eventDate >= dayStart && eventDate < dayEnd
        })

        const consumed = periodEvents
          .filter(e => e.type === 'consumed')
          .reduce((sum, e) => sum + (parseFloat(e.quantity) || 1), 0)
        const wasted = periodEvents
          .filter(e => e.type === 'wasted')
          .reduce((sum, e) => sum + (parseFloat(e.quantity) || 1), 0)

        result.push({
          date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          consumed: Math.round(consumed),
          wasted: Math.round(wasted)
        })
      }
    } else {
      // Last 3 months - weekly data
      for (let i = 12; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - (i * 7))
        date.setHours(0, 0, 0, 0)
        const weekStart = new Date(date)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 7)

        const weekEvents = data.pantryEvents.filter(e => {
          const eventDate = new Date(e.at)
          return eventDate >= weekStart && eventDate < weekEnd
        })

        const consumed = weekEvents
          .filter(e => e.type === 'consumed')
          .reduce((sum, e) => sum + (parseFloat(e.quantity) || 1), 0)
        const wasted = weekEvents
          .filter(e => e.type === 'wasted')
          .reduce((sum, e) => sum + (parseFloat(e.quantity) || 1), 0)

        result.push({
          date: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillConsumed" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-consumed)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-consumed)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillWasted" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-wasted)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-wasted)"
                  stopOpacity={0.1}
                />
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
              stroke="var(--color-wasted)"
              stackId="a"
            />
            <Area
              dataKey="consumed"
              type="natural"
              fill="url(#fillConsumed)"
              stroke="var(--color-consumed)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default AdvancedChartRecharts
