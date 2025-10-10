import React, { useMemo } from 'react'
import { PieChart as RechartsPieChart, Pie, Cell } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from './ui/chart'

const PieChart = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data?.pantryItems) return []

    // Count items by category
    const categoryCounts = {}
    data.pantryItems.forEach(item => {
      const category = item.category || 'Other'
      categoryCounts[category] = (categoryCounts[category] || 0) + 1
    })

    // Convert to array and calculate percentages
    const total = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0)

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

    return Object.entries(categoryCounts)
      .map(([name, count], index) => ({
        name,
        value: total > 0 ? Math.round((count / total) * 100) : 0,
        count,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7) // Top 7 categories
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
          <CardTitle>Items by Category</CardTitle>
          <CardDescription>Current inventory distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[280px] text-muted-foreground">
            No inventory data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Items by Category</CardTitle>
        <CardDescription>Current inventory distribution</CardDescription>
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
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
          </div>
        </div>

        <ChartLegend
          content={<ChartLegendContent nameKey="name" />}
        />

        {/* Bottom description */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Showing current inventory distribution across categories
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default PieChart
