import React, { useMemo } from 'react'
import { PieChart as RechartsPieChart, Pie, Cell } from 'recharts'
import { TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from './ui/chart'

const PieChart2 = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data?.pantryEvents) return []

    // Get wasted items and sum quantities by category
    const wastedEvents = data.pantryEvents.filter(e => e.type === 'wasted')
    const categoryCounts = {}

    wastedEvents.forEach(event => {
      // Try to find matching item to get category
      // If item_id is null or item doesn't exist, use event.category or 'Unknown'
      const item = event.item_id ? data.pantryItems?.find(i => i.id === event.item_id) : null
      const category = item?.category || event.category || 'Unknown'
      const quantity = parseFloat(event.quantity) || 1
      categoryCounts[category] = (categoryCounts[category] || 0) + quantity
    })

    const total = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0)
    const colors = ['#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981']

    return Object.entries(categoryCounts)
      .map(([name, count], index) => ({
        name,
        value: total > 0 ? Math.round((count / total) * 100) : 0,
        count,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [data])

  const total = chartData.reduce((sum, item) => sum + item.count, 0)

  const chartConfig = chartData.reduce((config, item) => {
    config[item.name] = {
      label: item.name,
      color: item.color
    }
    return config
  }, {})

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wasted Items by Category</CardTitle>
          <CardDescription>Food waste distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[280px] text-muted-foreground">
            No waste data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wasted Items by Category</CardTitle>
        <CardDescription>Food waste distribution</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center mb-6">
          <div className="relative w-[280px] h-[280px]">
            <ChartContainer
              config={chartConfig}
              className="w-full h-full"
            >
              <RechartsPieChart width={280} height={280}>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={130}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name) => [
                        `${value}%`,
                        name
                      ]}
                    />
                  }
                />
              </RechartsPieChart>
            </ChartContainer>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-3xl font-bold text-foreground">{total}</div>
              <div className="text-sm text-muted-foreground">Wasted Items</div>
            </div>
          </div>
        </div>

        <ChartLegend
          content={<ChartLegendContent nameKey="name" />}
        />

        {/* Bottom description */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Showing waste distribution to help identify problem areas
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default PieChart2
