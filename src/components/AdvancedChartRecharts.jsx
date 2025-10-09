import React, { useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from './ui/chart'

const AdvancedChartRecharts = () => {
  const [timeRange, setTimeRange] = useState('7d')
  
  // Dynamic data based on time range
  const getDataForTimeRange = (range) => {
    const now = new Date()
    const data = []
    
    if (range === '7d') {
      // Last 7 days - daily data
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dayName = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        
        // Generate realistic visitor data with similar but independent patterns
        const baseConsumed = 250 + Math.sin(i * 0.8) * 100 + Math.random() * 50
        const baseWasted = 150 + Math.sin(i * 0.7) * 80 + Math.random() * 40
        
        data.push({
          date: dayName,
          consumed: Math.round(baseConsumed),
          wasted: Math.round(baseWasted)
        })
      }
    } else if (range === '30d') {
      // Last 30 days - every 2 days for better density
      for (let i = 28; i >= 0; i -= 2) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dayName = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        
        // Generate realistic visitor data with similar but independent patterns
        const baseConsumed = 300 + Math.sin(i * 0.3) * 120 + Math.random() * 60
        const baseWasted = 180 + Math.sin(i * 0.25) * 100 + Math.random() * 50
        
        data.push({
          date: dayName,
          consumed: Math.round(baseConsumed),
          wasted: Math.round(baseWasted)
        })
      }
    } else {
      // Last 3 months - weekly data
      for (let i = 12; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - (i * 7))
        const dayName = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        
        // Generate realistic visitor data with similar but independent patterns
        const baseConsumed = 350 + Math.sin(i * 0.5) * 150 + Math.random() * 80
        const baseWasted = 200 + Math.sin(i * 0.4) * 120 + Math.random() * 60
        
        data.push({
          date: dayName,
          consumed: Math.round(baseConsumed),
          wasted: Math.round(baseWasted)
        })
      }
    }
    
    return data
  }
  
  const chartData = getDataForTimeRange(timeRange)
  
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
            <CardTitle>Total Visitors</CardTitle>
            <CardDescription>
              {timeRange === '7d' ? 'Total for the last 7 days' :
               timeRange === '30d' ? 'Total for the last 30 days' :
               'Total for the last 3 months'}
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
