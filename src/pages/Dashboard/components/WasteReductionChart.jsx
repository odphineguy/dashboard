import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const WasteReductionChart = ({ data }) => {
  const hasData = data && data.some(item => (item?.consumed || 0) > 0 || (item?.wasted || 0) > 0)

  if (!hasData) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Waste Reduction</h3>
            <p className="text-xs text-muted-foreground">Monthly tracking</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm text-muted-foreground mb-1">No data yet</p>
            <p className="text-xs text-muted-foreground">Start tracking to see progress</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-green-500/10 rounded-lg">
            <p className="text-lg font-bold text-green-600">0 items</p>
            <p className="text-xs text-muted-foreground">Consumed</p>
          </div>
          <div className="text-center p-2 bg-red-500/10 rounded-lg">
            <p className="text-lg font-bold text-red-600">0 items</p>
            <p className="text-xs text-muted-foreground">Wasted</p>
          </div>
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload?.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-foreground font-medium mb-2">{label}</p>
          {payload?.map((entry, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry?.color }}
              />
              <span className="text-muted-foreground text-sm">
                {entry?.dataKey === 'consumed' ? 'Food Consumed' : 'Food Wasted'}:
              </span>
              <span className="text-foreground font-medium">
                {entry?.value} items
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Waste Reduction Trends</h3>
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

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="consumedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="wastedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="month"
              className="text-foreground"
              fontSize={12}
            />
            <YAxis
              className="text-foreground"
              fontSize={12}
              label={{ value: 'Items', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="consumed"
              stackId="1"
              stroke="#22c55e"
              fill="url(#consumedGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="wasted"
              stackId="1"
              stroke="#ef4444"
              fill="url(#wastedGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default WasteReductionChart
