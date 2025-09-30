import React from 'react'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import { TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from './ui/chart'

const BarChart2 = () => {
  const data = [
    { name: 'Q1', value: 85, color: '#06b6d4' },
    { name: 'Q2', value: 92, color: '#8b5cf6' },
    { name: 'Q3', value: 78, color: '#f59e0b' },
    { name: 'Q4', value: 88, color: '#10b981' }
  ]

  const chartConfig = {
    Q1: {
      label: "Q1",
      color: "#06b6d4",
    },
    Q2: {
      label: "Q2", 
      color: "#8b5cf6",
    },
    Q3: {
      label: "Q3",
      color: "#f59e0b",
    },
    Q4: {
      label: "Q4",
      color: "#10b981",
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quarterly Performance</CardTitle>
        <CardDescription>2024 Performance Metrics</CardDescription>
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
              fill="#06b6d4"
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
            Trending down by 1.8% this quarter
            <TrendingDown className="h-4 w-4 text-chart-2" />
          </div>
          <div className="text-sm text-muted-foreground">
            Showing quarterly performance metrics
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default BarChart2
