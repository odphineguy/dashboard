import React from 'react'
import { Bell } from 'lucide-react'
import { Card } from '../../../components/ui/card'
import { Checkbox } from '../../../components/ui/checkbox'
import { Label } from '../../../components/ui/label'

const NotificationPreferences = ({ preferences, onUpdatePreferences }) => {
  const safePreferences = preferences || {}

  const handleCheckboxChange = (category, option) => {
    const categoryPreferences = safePreferences[category] || {}

    onUpdatePreferences({
      ...safePreferences,
      [category]: {
        ...categoryPreferences,
        [option]: !categoryPreferences[option]
      }
    })
  }

  const notificationSections = [
    {
      category: 'expiration',
      title: 'Expiration Alerts',
      description: 'Get notified when items are about to expire',
      options: [
        { key: 'daily', label: 'Daily Digest (items expiring in 3 days)' },
        { key: 'critical', label: 'Critical Alerts (expiring today)' },
        { key: 'weekly', label: 'Weekly Summary' }
      ]
    },
    {
      category: 'recipes',
      title: 'Recipe Suggestions',
      description: 'Receive personalized recipe recommendations',
      options: [
        { key: 'weekly', label: 'Weekly Recipe Ideas' },
        { key: 'expiring', label: 'Recipes for Expiring Items' }
      ]
    },
    {
      category: 'achievements',
      title: 'Achievements & Milestones',
      description: 'Celebrate your progress and achievements',
      options: [
        { key: 'earned', label: 'When Achievement Earned' },
        { key: 'monthly', label: 'Monthly Progress Summary' }
      ]
    },
    {
      category: 'inventory',
      title: 'Inventory Reminders',
      description: 'Reminders to update and check your inventory',
      options: [
        { key: 'weekly', label: 'Weekly Inventory Check Reminder' },
        { key: 'lowStock', label: 'Low Stock Alerts' }
      ]
    }
  ]

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Notification Preferences</h2>
      </div>

      <div className="space-y-6">
        {notificationSections.map((section) => (
          <div key={section.category} className="space-y-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" />
                {section.title}
              </h3>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </div>
            <div className="space-y-2 pl-6">
              {section.options.map((option) => (
                <div key={option.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${section.category}-${option.key}`}
                    checked={safePreferences[section.category]?.[option.key] || false}
                    onCheckedChange={() => handleCheckboxChange(section.category, option.key)}
                  />
                  <Label
                    htmlFor={`${section.category}-${option.key}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default NotificationPreferences

