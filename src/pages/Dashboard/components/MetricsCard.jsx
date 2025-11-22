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
        return 'text-white'
      case 'warning':
        return 'bg-orange-500 text-white'
      case 'accent':
        return 'text-white'
      case 'error':
        return 'bg-red-500 text-white'
      default:
        return 'text-white'
    }
  }

  const getColorStyles = () => {
    switch (color) {
      case 'success':
        return { backgroundColor: '#01433B' } // Brand green - matches "Fresh" status
      case 'warning':
        return { backgroundColor: '#ef4444' } // Red (red-500) - matches "Expires Today" status
      case 'accent':
        return { backgroundColor: '#0EA5E9' } // Brand blue
      case 'orange':
        return { backgroundColor: '#f97316' } // Orange (orange-500) - matches "Expiring Soon" status
      case 'error':
        return { backgroundColor: '#dc2626' } // Darker red (red-600) - matches "Expired" status
      default:
        return { backgroundColor: '#0EA5E9' } // Brand blue default
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
          <div
            className={`p-3 rounded-lg ${getColorClasses()}`}
            style={getColorStyles()}
          >
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

