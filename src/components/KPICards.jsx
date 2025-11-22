import React, { useMemo } from 'react'
import { TrendingUp, TrendingDown, Utensils, Trash2, Leaf, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardAction, CardDescription, CardFooter } from './ui/card'
import { Badge } from './ui/badge'

const KPICards = ({ data }) => {
  const stats = useMemo(() => {
    if (!data?.pantryEvents) return null

    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Filter events by time period
    const thisWeek = data.pantryEvents.filter(e => new Date(e.at) >= oneWeekAgo)
    const lastWeek = data.pantryEvents.filter(e => {
      const date = new Date(e.at)
      return date >= twoWeeksAgo && date < oneWeekAgo
    })
    const thisMonth = data.pantryEvents.filter(e => new Date(e.at) >= oneMonthAgo)

    // Calculate consumed/wasted by summing quantities
    const consumedThisWeek = thisWeek
      .filter(e => e.type === 'consumed')
      .reduce((sum, e) => sum + (parseFloat(e.quantity) || 1), 0)
    const wastedThisWeek = thisWeek
      .filter(e => e.type === 'wasted')
      .reduce((sum, e) => sum + (parseFloat(e.quantity) || 1), 0)
    const consumedLastWeek = lastWeek
      .filter(e => e.type === 'consumed')
      .reduce((sum, e) => sum + (parseFloat(e.quantity) || 1), 0)
    const wastedLastWeek = lastWeek
      .filter(e => e.type === 'wasted')
      .reduce((sum, e) => sum + (parseFloat(e.quantity) || 1), 0)

    // Calculate waste reduction rate (consumed / total)
    const totalThisWeek = consumedThisWeek + wastedThisWeek
    const wasteReductionRate = totalThisWeek > 0
      ? Math.round((consumedThisWeek / totalThisWeek) * 100)
      : 0

    const totalLastWeek = consumedLastWeek + wastedLastWeek
    const wasteReductionRateLastWeek = totalLastWeek > 0
      ? Math.round((consumedLastWeek / totalLastWeek) * 100)
      : 0

    // Calculate changes
    const consumedChange = consumedLastWeek > 0
      ? Math.round(((consumedThisWeek - consumedLastWeek) / consumedLastWeek) * 100)
      : 0

    const wastedChange = wastedLastWeek > 0
      ? Math.round(((wastedThisWeek - wastedLastWeek) / wastedLastWeek) * 100)
      : 0

    const reductionChange = wasteReductionRate - wasteReductionRateLastWeek

    // Calculate CO2 saved (approximate: 2.5 kg CO2 per kg of food saved)
    // Assuming average item is 0.5 kg
    const co2Saved = Math.round(consumedThisWeek * 0.5 * 2.5 * 10) / 10

    return {
      consumedThisWeek,
      wastedThisWeek,
      consumedChange,
      wastedChange,
      wasteReductionRate,
      reductionChange,
      co2Saved
    }
  }, [data])

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="text-center text-muted-foreground">Loading statistics...</div>
      </div>
    )
  }

  const cards = [
    {
      title: "Total Consumed",
      value: `${Math.round(stats.consumedThisWeek)} items`,
      change: `${stats.consumedChange >= 0 ? '+' : ''}${stats.consumedChange}%`,
      trend: stats.consumedChange >= 0 ? "up" : "down",
      description: "this week",
      icon: Utensils,
      color: "text-green-600"
    },
    {
      title: "Total Wasted",
      value: `${Math.round(stats.wastedThisWeek)} items`,
      change: `${stats.wastedChange >= 0 ? '+' : ''}${stats.wastedChange}%`,
      trend: stats.wastedChange >= 0 ? "up" : "down",
      description: "this week",
      icon: Trash2,
      color: "text-red-600"
    },
    {
      title: "Waste Reduction Rate",
      value: `${stats.wasteReductionRate}%`,
      change: `${stats.reductionChange >= 0 ? '+' : ''}${stats.reductionChange}%`,
      trend: stats.reductionChange >= 0 ? "up" : "down",
      description: "improvement",
      icon: Leaf,
      color: "text-green-600"
    },
    {
      title: "CO₂ Saved",
      value: `${stats.co2Saved} kg`,
      change: `${stats.consumedChange >= 0 ? '+' : ''}${stats.consumedChange}%`,
      trend: stats.consumedChange >= 0 ? "up" : "down",
      description: "this week",
      icon: Zap,
      color: "text-blue-600"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
      {cards.map((card, index) => (
        <Card key={index} className="@container/card hover:shadow-lg transition-shadow bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <CardAction>
              <Badge 
                className={`text-xs ${
                  card.trend === 'up' 
                    ? 'bg-card text-card-foreground border-border' 
                    : 'bg-destructive text-destructive-foreground'
                }`}
              >
                {card.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {card.change}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-card-foreground">{card.value}</div>
          </CardContent>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {card.description} {card.trend === 'up' ? (
                <TrendingUp className="size-4" />
              ) : (
                <TrendingDown className="size-4" />
              )}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

export default KPICards
