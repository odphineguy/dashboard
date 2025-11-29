import React, { useMemo } from 'react'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
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
  meat: 'Meat',
  pantry: 'Pantry',
  beverages: 'Beverages',
  snacks: 'Snacks',
  frozen: 'Frozen',
  bakery: 'Bakery',
  condiments: 'Condiments',
  other: 'Other'
}

const BarChartRecharts = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data?.pantryItems || data.pantryItems.length === 0) return []

    // Count items by category
    const categoryCounts = {}
    data.pantryItems.forEach(item => {
      const category = item.category?.toLowerCase() || 'other'
      categoryCounts[category] = (categoryCounts[category] || 0) + 1
    })

    // Convert to chart format and sort by count
    return Object.entries(categoryCounts)
      .map(([category, count]) => ({
        name: CATEGORY_LABELS[category] || category,
        value: count,
        color: CATEGORY_COLORS[category] || CATEGORY_COLORS.other
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) // Show top 8 categories
  }, [data])

  const totalItems = data?.pantryItems?.length || 0

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
          <CardTitle>Inventory by Category</CardTitle>
          <CardDescription>Items count per category</CardDescription>
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
        <CardTitle>Inventory by Category</CardTitle>
        <CardDescription>
          {totalItems} total items across {chartData.length} categories
        </CardDescription>
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
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="name" 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              allowDecimals={false}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [
                    `${value} items`,
                    name
                  ]}
                />
              }
            />
            <Bar 
              dataKey="value" 
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </RechartsBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default BarChartRecharts
