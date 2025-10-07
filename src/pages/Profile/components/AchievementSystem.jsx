import React from 'react'
import { Trophy, Calendar, CalendarDays, Award, Shield, Leaf, Crown, ChefHat, Utensils } from 'lucide-react'
import { Card } from '../../../components/ui/card'
import ShareBadge from '../../../components/ShareBadge'
import BadgeImageGenerator from '../../../components/BadgeImageGenerator'
import { useAuth } from '../../../contexts/AuthContext'

const AchievementSystem = ({ achievements }) => {
  const { user } = useAuth()
  
  const badgeCategories = [
    {
      title: 'Waste Reduction',
      badges: achievements?.wasteReduction || [],
      color: 'text-green-600'
    },
    {
      title: 'Recipe Explorer',
      badges: achievements?.recipes || [],
      color: 'text-blue-600'
    },
    {
      title: 'Consistency',
      badges: achievements?.consistency || [],
      color: 'text-primary'
    }
  ]

  const handleBadgeShare = (badge) => {
    console.log('Badge shared:', badge.name)
    // Could track analytics here
  }

  const handleImageGenerate = (badge) => {
    console.log('Badge image generated:', badge.name)
    // Could track analytics here
  }

  const getBadgeIcon = (type) => {
    const iconMap = {
      'waste-warrior': Shield,
      'eco-champion': Leaf,
      'zero-waste': Award,
      'recipe-novice': ChefHat,
      'culinary-explorer': Utensils,
      'master-chef': Crown,
      'week-streak': Calendar,
      'month-streak': CalendarDays,
      'year-streak': Trophy
    }
    const IconComponent = iconMap[type] || Award
    return IconComponent
  }

  const getBadgeColor = (earned) => {
    return earned ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Achievements</h2>
      </div>

      {/* Overall Progress */}
      <div className="bg-muted/50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm text-muted-foreground">
            {achievements?.totalEarned || 0} / {achievements?.totalAvailable || 16} badges
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((achievements?.totalEarned || 0) / (achievements?.totalAvailable || 16)) * 100}%`
            }}
          ></div>
        </div>
      </div>

      {/* Badge Categories */}
      <div className="space-y-6">
        {badgeCategories.map((category, categoryIndex) => (
          <div key={categoryIndex}>
            <h3 className={`font-medium mb-3 ${category.color}`}>{category.title}</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {category.badges.length === 0 ? (
                <div className="col-span-full text-center py-4 text-sm text-muted-foreground">
                  No badges in this category yet
                </div>
              ) : (
                category.badges.map((badge, badgeIndex) => {
                  const IconComponent = getBadgeIcon(badge.type)
                  return (
                    <div 
                      key={badgeIndex} 
                      className={`
                        text-center p-3 rounded-lg border transition-all duration-200
                        ${badge.earned 
                          ? 'border-primary/30 bg-primary/5 hover:border-primary/50 hover:shadow-md' 
                          : 'border-border bg-muted/20 hover:border-muted-foreground/20'
                        }
                      `}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 mx-auto transition-all duration-200 ${getBadgeColor(badge.earned)}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="text-xs font-medium mb-1">{badge.name}</div>
                      <div className="text-xs text-muted-foreground mb-2 line-clamp-2">{badge.description}</div>

                      {/* Progress Bar */}
                      {!badge.earned && badge.requirement > 0 && (
                        <>
                          <div className="w-full bg-muted rounded-full h-1 mb-2">
                            <div
                              className="bg-primary h-1 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min((badge.progress / badge.requirement) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {badge.progress} / {badge.requirement} {badge.unit}
                          </div>
                        </>
                      )}

                      {badge.earned && badge.earnedDate && (
                        <>
                          <div className="text-xs text-green-600 mb-2">
                            Earned {badge.earnedDate}
                          </div>
                          {/* Share Buttons */}
                          <div className="flex gap-1 justify-center">
                            <ShareBadge
                              badge={{
                                name: badge.name,
                                description: badge.description,
                                type: badge.type,
                                earnedDate: badge.earnedDate
                              }}
                              userName={user?.email?.split('@')[0] || 'User'}
                              onShare={handleBadgeShare}
                            />
                            <BadgeImageGenerator
                              badge={{
                                name: badge.name,
                                description: badge.description,
                                type: badge.type,
                                earnedDate: badge.earnedDate
                              }}
                              userName={user?.email?.split('@')[0] || 'User'}
                              onGenerate={handleImageGenerate}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Current Streaks */}
      <div className="mt-6 pt-6 border-t border-border">
        <h3 className="font-medium mb-4">Current Streaks</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-primary">{achievements?.streaks?.daily || 0}</div>
            <div className="text-sm text-muted-foreground">Day Streak</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <CalendarDays className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">{achievements?.streaks?.weekly || 0}</div>
            <div className="text-sm text-muted-foreground">Week Streak</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <Trophy className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">{achievements?.streaks?.monthly || 0}</div>
            <div className="text-sm text-muted-foreground">Month Streak</div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default AchievementSystem

