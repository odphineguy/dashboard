import React, { useState } from 'react'
import { Users, Edit2, Check, ChefHat } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Checkbox } from '../../../components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'

const HouseholdInformation = ({ householdData, onUpdateHousehold }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState(householdData)

  const handleSave = () => {
    onUpdateHousehold(editData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditData(householdData)
    setIsEditing(false)
  }

  const familySizeOptions = [
    { value: '1', label: '1 person' },
    { value: '2', label: '2 people' },
    { value: '3', label: '3 people' },
    { value: '4', label: '4 people' },
    { value: '5', label: '5 people' },
    { value: '6+', label: '6+ people' }
  ]

  const cookingFrequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'few-times-week', label: 'Few times a week' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'rarely', label: 'Rarely' },
    { value: 'never', label: 'Never' }
  ]

  const dietaryRestrictions = [
    { key: 'vegetarian', label: 'Vegetarian' },
    { key: 'vegan', label: 'Vegan' },
    { key: 'glutenFree', label: 'Gluten-Free' },
    { key: 'dairyFree', label: 'Dairy-Free' },
    { key: 'nutFree', label: 'Nut-Free' },
    { key: 'lowSodium', label: 'Low Sodium' },
    { key: 'diabetic', label: 'Diabetic-Friendly' },
    { key: 'keto', label: 'Ketogenic' },
    { key: 'paleo', label: 'Paleo' },
    { key: 'halal', label: 'Halal' },
    { key: 'kosher', label: 'Kosher' }
  ]

  const handleDietaryChange = (restriction) => {
    setEditData({
      ...editData,
      dietaryRestrictions: {
        ...editData.dietaryRestrictions,
        [restriction]: !editData.dietaryRestrictions[restriction]
      }
    })
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Household Information</h2>
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
              Edit
            </>
          )}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Basic Household Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Family Size</Label>
            {isEditing ? (
              <Select
                value={editData.familySize}
                onValueChange={(value) => setEditData({ ...editData, familySize: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select family size" />
                </SelectTrigger>
                <SelectContent>
                  {familySizeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-1 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {familySizeOptions.find(opt => opt.value === householdData.familySize)?.label || 'Not specified'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>Cooking Frequency</Label>
            {isEditing ? (
              <Select
                value={editData.cookingFrequency}
                onValueChange={(value) => setEditData({ ...editData, cookingFrequency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cooking frequency" />
                </SelectTrigger>
                <SelectContent>
                  {cookingFrequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-1 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {cookingFrequencyOptions.find(opt => opt.value === householdData.cookingFrequency)?.label || 'Not specified'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dietary Restrictions */}
        <div>
          <h3 className="font-medium mb-4">Dietary Restrictions & Preferences</h3>
          {isEditing ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {dietaryRestrictions.map((restriction) => (
                <div key={restriction.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={restriction.key}
                    checked={editData.dietaryRestrictions[restriction.key]}
                    onCheckedChange={() => handleDietaryChange(restriction.key)}
                  />
                  <Label htmlFor={restriction.key} className="font-normal">
                    {restriction.label}
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {dietaryRestrictions.filter(restriction => householdData.dietaryRestrictions[restriction.key]).map((restriction) => (
                <span
                  key={restriction.key}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary"
                >
                  {restriction.label}
                </span>
              ))}
              {dietaryRestrictions.filter(restriction => householdData.dietaryRestrictions[restriction.key]).length === 0 && (
                <span className="text-muted-foreground">No dietary restrictions specified</span>
              )}
            </div>
          )}
        </div>

        {/* Additional Preferences */}
        <div>
          <h3 className="font-medium mb-4">Additional Preferences</h3>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="favoriteCuisines">Favorite Cuisines</Label>
                <Input
                  id="favoriteCuisines"
                  value={editData.favoriteCuisines}
                  onChange={(e) => setEditData({ ...editData, favoriteCuisines: e.target.value })}
                  placeholder="e.g., Italian, Mexican, Asian"
                />
                <p className="text-xs text-muted-foreground mt-1">Comma-separated list of your favorite cuisines</p>
              </div>
              <div>
                <Label htmlFor="allergies">Food Allergies</Label>
                <Input
                  id="allergies"
                  value={editData.allergies}
                  onChange={(e) => setEditData({ ...editData, allergies: e.target.value })}
                  placeholder="e.g., Peanuts, Shellfish, Eggs"
                />
                <p className="text-xs text-muted-foreground mt-1">Comma-separated list of allergies</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Favorite Cuisines</Label>
                <div className="mt-1 p-3 bg-muted/50 rounded-lg">
                  <span>{householdData.favoriteCuisines || 'Not specified'}</span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Food Allergies</Label>
                <div className="mt-1 p-3 bg-muted/50 rounded-lg">
                  <span>{householdData.allergies || 'None specified'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="flex gap-2 pt-4 border-t border-border">
            <Button onClick={handleSave}>
              Save Changes
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

export default HouseholdInformation

