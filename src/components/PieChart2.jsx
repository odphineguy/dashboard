import React from 'react'
import { PieChart as RechartsPieChart, Pie, Cell } from 'recharts'
import { TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from './ui/chart'

const PieChart2 = () => {
  const data = [
    { name: 'Mobile', value: 60, color: '#06b6d4' },
    { name: 'Desktop', value: 30, color: '#8b5cf6' },
    { name: 'Tablet', value: 10, color: '#f59e0b' }
  ]

  const total = data.reduce((sum, item) => sum + item.value, 0)
  const centerValue = '2,847'
  const centerLabel = 'Users'

  const chartConfig = {
    Mobile: {
      label: "Mobile",
      color: "#06b6d4",
    },
    Desktop: {
      label: "Desktop", 
      color: "#8b5cf6",
    },
    Tablet: {
      label: "Tablet",
      color: "#f59e0b",
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Usage</CardTitle>
        <CardDescription>July - December 2024</CardDescription>
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
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={130}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
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
              <div className="text-3xl font-bold text-foreground">{centerValue}</div>
              <div className="text-sm text-muted-foreground">{centerLabel}</div>
            </div>
          </div>
        </div>

        <ChartLegend
          content={<ChartLegendContent nameKey="name" />}
        />

        {/* Bottom description */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-1">
            Trending down by 2.1% this month
            <TrendingDown className="h-4 w-4 text-chart-2" />
          </div>
          <div className="text-sm text-muted-foreground">
            Showing device usage for the last 6 months
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default PieChart2
