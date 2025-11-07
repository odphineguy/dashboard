import React, { useState, useEffect } from 'react'
import { Target, DollarSign, ChefHat, Package, Edit2, Check } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Badge } from '../../../components/ui/badge'

const PersonalGoals = ({ goals, onUpdateGoals }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editGoals, setEditGoals] = useState(goals)

  // Sync local state with parent goals prop when it changes
  useEffect(() => {
    setEditGoals(goals)
  }, [goals])

  const handleSave = () => {
    console.log('PersonalGoals - Saving goals:', editGoals)
    onUpdateGoals(editGoals)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditGoals(goals)
    setIsEditing(false)
  }

  const goalItems = [
    {
      key: 'wasteReduction',
      label: 'Monthly Waste Reduction',
      icon: Target,
      unit: '%',
      description: 'Reduce food waste by this percentage each month'
    },
    {
      key: 'spendingLimit',
      label: 'Monthly Spending Limit',
      icon: DollarSign,
      unit: '$',
      description: 'Maximum grocery spending per month'
    },
    {
      key: 'recipesPerWeek',
      label: 'New Recipes Per Week',
      icon: ChefHat,
      unit: '',
      description: 'Try this many new recipes each week'
    },
    {
      key: 'inventoryChecks',
      label: 'Weekly Inventory Checks',
      icon: Package,
      unit: '',
      description: 'Check and update inventory this many times per week'
    }
  ]

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Personal Goals</h2>
        </div>
        <Button
          variant={isEditing ? "default" : "outline"}
          size="sm"
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
        >
          {isEditing ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Save
            </>
          ) : (
            <>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Goals
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goalItems.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.key} className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <h3 className="font-medium">{item.label}</h3>
              </div>

              {isEditing ? (
                <div>
                  <Label htmlFor={item.key}>{item.description}</Label>
                  <Input
                    id={item.key}
                    type="number"
                    value={editGoals[item.key] || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10)
                      setEditGoals({
                        ...editGoals,
                        [item.key]: isNaN(value) ? 0 : value
                      })
                    }}
                    placeholder={`Enter ${item.label.toLowerCase()}`}
                  />
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-primary mb-1">
                    {item.unit === '$' ? '$' : ''}{goals[item.key]}{item.unit !== '$' ? item.unit : ''}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{item.description}</span>
                    <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground">
                      Goal Set
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isEditing && (
        <div className="flex gap-2 mt-6 pt-4 border-t border-border">
          <Button onClick={handleSave}>
            Save Changes
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      )}
    </Card>
  )
}

export default PersonalGoals

