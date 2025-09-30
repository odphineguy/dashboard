import React from 'react'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from './ui/chart'

const BarChart = () => {
  const data = [
    { name: 'Chrome', value: 45, color: '#3b82f6' },
    { name: 'Safari', value: 25, color: '#10b981' },
    { name: 'Firefox', value: 15, color: '#f59e0b' },
    { name: 'Edge', value: 10, color: '#ef4444' },
    { name: 'Other', value: 5, color: '#8b5cf6' }
  ]

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
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <RechartsBarChart 
            data={data} 
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
              tickFormatter={(value) => `${value}%`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [
                    `${value}%`,
                    name
                  ]}
                />
              }
            />
            <Bar 
              dataKey="value" 
              radius={[4, 4, 0, 0]}
              fill="#3b82f6"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </RechartsBarChart>
        </ChartContainer>

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

export default BarChart
