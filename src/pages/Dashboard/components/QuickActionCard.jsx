import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ScanLine, ChefHat, BarChart3, ArrowRight } from 'lucide-react'
import { Button } from '../../../components/ui/button'

const iconMap = {
  Plus,
  ScanLine,
  ChefHat,
  BarChart3
}

const QuickActionCard = ({ title, description, icon, action, variant = 'default', route }) => {
  const navigate = useNavigate()

  const handleClick = () => {
    if (route) {
      navigate(route)
    } else if (action) {
      action()
    }
  }

  const Icon = iconMap[icon] || Plus
  const cardBaseClasses = 'bg-card border border-border shadow-sm hover:shadow-md hover:bg-accent/5'

  return (
    <div className={`rounded-lg p-6 transition-all duration-200 cursor-pointer ${cardBaseClasses}`} onClick={handleClick}>
      <div className="flex items-start space-x-4">
        <div className="p-3 rounded-lg bg-primary text-primary-foreground">
          <Icon size={24} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          <Button
            variant="default"
            size="sm"
          >
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default QuickActionCard
