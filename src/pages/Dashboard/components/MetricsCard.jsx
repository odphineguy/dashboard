import React from 'react'
import { TrendingUp, TrendingDown, Minus, Package, AlertTriangle, Clock, TrendingDown as TrendDown } from 'lucide-react'

const iconMap = {
  Package,
  AlertTriangle,
  Clock,
  TrendingDown: TrendDown
}

const MetricsCard = ({ title, value, subtitle, icon, trend, trendValue, color = 'primary' }) => {
  const getChangeColor = () => {
    if (trend === 'up') return 'text-primary'
    if (trend === 'down') return 'text-destructive'
    return 'text-muted-foreground'
  }

  const getChangeIcon = () => {
    if (trend === 'up') return TrendingUp
    if (trend === 'down') return TrendingDown
    return Minus
  }

  const getColorClasses = () => {
    switch (color) {
      case 'success':
        return 'bg-green-500 text-white'
      case 'warning':
        return 'bg-orange-500 text-white'
      case 'accent':
        return 'bg-blue-500 text-white'
      case 'error':
        return 'bg-red-500 text-white'
      default:
        return 'bg-blue-500 text-white'
    }
  }

  const Icon = iconMap[icon] || Package
  const ChangeIcon = getChangeIcon()

  return (
    <div className="bg-card rounded-lg p-6 border border-border shadow-sm h-full">
      <div className="flex justify-between items-start h-full">
        <div className="flex flex-col justify-center space-y-2">
          <h3 className="text-muted-foreground text-sm font-medium">{title}</h3>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-foreground">{value}</span>
            {subtitle && <span className="text-muted-foreground text-sm">{subtitle}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end justify-center space-y-3">
          <div className={`p-3 rounded-lg ${getColorClasses()}`}>
            <Icon size={24} />
          </div>
          {trendValue && (
            <div className={`flex items-center space-x-1 ${getChangeColor()}`}>
              <ChangeIcon size={16} />
              <span className="text-sm font-medium">{trendValue}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MetricsCard
