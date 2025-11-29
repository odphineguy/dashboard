import React, { useMemo } from 'react'
import { PieChart as RechartsPieChart, Pie, Cell } from 'recharts'
import { Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart'

const CATEGORY_COLORS = {
  fruits: '#22c55e',
  vegetables: '#84cc16',
  dairy: '#3b82f6',
  meat: '#ef4444',
  pantry: '#f59e0b',
  beverages: '#06b6d4',
  snacks: '#8b5cf6',
  frozen: '#0ea5e9',
  bakery: '#f97316',
  condiments: '#ec4899',
  other: '#6b7280'
}

const CATEGORY_LABELS = {
  fruits: 'Fruits',
  vegetables: 'Vegetables',
  dairy: 'Dairy',
  meat: 'Meat & Fish',
  pantry: 'Pantry Items',
  beverages: 'Beverages',
  snacks: 'Snacks',
  frozen: 'Frozen Foods',
  bakery: 'Bakery',
  condiments: 'Condiments',
  other: 'Other'
}

const PieChartRecharts = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data?.pantryItems || data.pantryItems.length === 0) return []

    // Count items by category
    const categoryCounts = {}
    data.pantryItems.forEach(item => {
      const category = item.category?.toLowerCase() || 'other'
      categoryCounts[category] = (categoryCounts[category] || 0) + 1
    })

    // Convert to chart format
    return Object.entries(categoryCounts)
      .map(([category, count]) => ({
        name: CATEGORY_LABELS[category] || category,
        value: count,
        color: CATEGORY_COLORS[category] || CATEGORY_COLORS.other
      }))
      .sort((a, b) => b.value - a.value)
  }, [data])

  const totalItems = chartData.reduce((sum, item) => sum + item.value, 0)

  const chartConfig = useMemo(() => {
    const config = {}
    chartData.forEach(item => {
      config[item.name] = {
        label: item.name,
        color: item.color
      }
    })
    return config
  }, [chartData])

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Items by Category</CardTitle>
          <CardDescription>Distribution of pantry items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mb-4 opacity-50" />
            <p>No items in inventory yet</p>
            <p className="text-sm">Add items to see category breakdown</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Items by Category</CardTitle>
        <CardDescription>Distribution of {totalItems} pantry items</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center mb-6">
          <div className="relative w-[200px] h-[200px]">
            <ChartContainer
              config={chartConfig}
              className="w-full h-full"
            >
              <RechartsPieChart width={200} height={200}>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
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
                        `${value} items`,
                        name
                      ]}
                    />
                  }
                />
              </RechartsPieChart>
            </ChartContainer>
            
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-2xl font-bold text-foreground">{totalItems}</div>
              <div className="text-sm text-muted-foreground">Items</div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {chartData.slice(0, 6).map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground truncate">{item.name}</span>
              <span className="text-foreground font-medium ml-auto">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default PieChartRecharts
