import React from 'react'
import { TrendingUp, TrendingDown, Utensils, Trash2, Leaf, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardAction, CardDescription, CardFooter } from './ui/card'
import { Badge } from './ui/badge'

const KPICards = () => {
  const cards = [
    {
      title: "Total Consumed",
      value: "4 items",
      change: "+12%",
      trend: "up",
      description: "this week",
      icon: Utensils,
      color: "text-green-600"
    },
    {
      title: "Total Wasted",
      value: "7 items",
      change: "+8%",
      trend: "up",
      description: "this week",
      icon: Trash2,
      color: "text-red-600"
    },
    {
      title: "Waste Reduction Rate",
      value: "36%",
      change: "+5%",
      trend: "up",
      description: "improvement",
      icon: Leaf,
      color: "text-green-600"
    },
    {
      title: "CO₂ Saved",
      value: "45.2 kg",
      change: "+18%",
      trend: "up",
      description: "this month",
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
