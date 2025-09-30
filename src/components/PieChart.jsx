import React from 'react'
import { PieChart as RechartsPieChart, Pie, Cell } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from './ui/chart'

const PieChart = () => {
  const data = [
    { name: 'Chrome', value: 45, color: '#3b82f6' },
    { name: 'Safari', value: 25, color: '#10b981' },
    { name: 'Firefox', value: 15, color: '#f59e0b' },
    { name: 'Edge', value: 10, color: '#ef4444' },
    { name: 'Other', value: 5, color: '#8b5cf6' }
  ]

  const total = data.reduce((sum, item) => sum + item.value, 0)
  const centerValue = '1,125'
  const centerLabel = 'Visitors'

  const chartConfig = {
    Chrome: {
      label: "Chrome",
      color: "#3b82f6",
    },
    Safari: {
      label: "Safari", 
      color: "#10b981",
    },
    Firefox: {
      label: "Firefox",
      color: "#f59e0b",
    },
    Edge: {
      label: "Edge",
      color: "#ef4444",
    },
    Other: {
      label: "Other",
      color: "#8b5cf6",
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Browser Usage</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
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
            Trending up by 5.2% this month
            <TrendingUp className="h-4 w-4 text-chart-1" />
          </div>
          <div className="text-sm text-muted-foreground">
            Showing total visitors for the last 6 months
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default PieChart
