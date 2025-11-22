import React, { useMemo } from 'react'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Legend } from 'recharts'
import { TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart'

const BarChart2 = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data?.pantryEvents) return []

    const now = new Date()
    const result = []

    // Last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)

      const monthEvents = data.pantryEvents.filter(e => {
        const eventDate = new Date(e.at)
        return eventDate >= monthStart && eventDate <= monthEnd
      })

      const consumed = monthEvents
        .filter(e => e.type === 'consumed')
        .reduce((sum, e) => sum + (parseFloat(e.quantity) || 1), 0)
      const wasted = monthEvents
        .filter(e => e.type === 'wasted')
        .reduce((sum, e) => sum + (parseFloat(e.quantity) || 1), 0)

      result.push({
        name: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        consumed: Math.round(consumed),
        wasted: Math.round(wasted)
      })
    }

    return result
  }, [data])

  const chartConfig = {
    consumed: {
      label: "Consumed",
      color: "#10b981",
    },
    wasted: {
      label: "Wasted",
      color: "#ef4444",
    },
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Comparison</CardTitle>
          <CardDescription>Last 6 months activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No monthly data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Comparison</CardTitle>
        <CardDescription>Last 6 months activity</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <RechartsBarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            width={undefined}
            height={300}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent />
              }
            />
            <Legend />
            <Bar
              dataKey="consumed"
              fill={chartConfig.consumed.color}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="wasted"
              fill={chartConfig.wasted.color}
              radius={[4, 4, 0, 0]}
            />
          </RechartsBarChart>
        </ChartContainer>

        {/* Bottom description */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Comparing consumed vs wasted items over the last 6 months
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default BarChart2
