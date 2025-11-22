import React, { useState } from 'react'
import { User, Edit2, Calendar, Crown } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import AvatarSelector from '../../../components/AvatarSelector'
import { useSupabase } from '../../../hooks/useSupabase'

const ProfileHeader = ({ user, onUpdateProfile, userId }) => {
  const supabase = useSupabase()
  const [isEditing, setIsEditing] = useState(false)
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)
  const [editData, setEditData] = useState({
    name: user?.name,
    email: user?.email
  })

  const handleSave = async () => {
    try {
      if (!userId) {
        alert('Error: No user ID available. Please try logging in again.')
        return
      }

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

      let result
      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from('profiles')
          .update({
            full_name: editData.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
      } else {
        // Insert new profile
        result = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: editData.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
      }

      if (result.error) throw result.error

      onUpdateProfile(editData)
      setIsEditing(false)
      alert('Profile saved successfully!')
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Error saving profile: ' + error.message)
    }
  }

  const handleCancel = () => {
    setEditData({
      name: user?.name,
      email: user?.email
    })
    setIsEditing(false)
  }

  const handleAvatarSelect = async (avatar) => {
    try {
      if (!userId) {
        alert('Error: No user ID available. Please try logging in again.')
        return
      }

      // Save just the src path for custom avatars
      const avatarValue = avatar?.src || avatar

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

      let result
      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from('profiles')
          .update({
            avatar: avatarValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
      } else {
        // Insert new profile
        result = await supabase
          .from('profiles')
          .insert({
            id: userId,
            avatar: avatarValue,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
      }

      if (result.error) throw result.error

      onUpdateProfile({ avatar: avatarValue })
      alert('Avatar saved successfully!')
    } catch (error) {
      console.error('Error saving avatar:', error)
      alert('Error saving avatar: ' + error.message)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Profile Photo */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {user?.avatar?.src || (typeof user?.avatar === 'string' && user.avatar.startsWith('/')) ? (
              <img
                src={user.avatar?.src || user.avatar}
                alt={user?.avatar?.name || 'Avatar'}
                className="w-full h-full object-cover"
              />
            ) : user?.avatar?.emoji ? (
              <div className="text-4xl">{user.avatar.emoji}</div>
            ) : (
              <User className="w-12 h-12 text-primary" />
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowAvatarSelector(true)}
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Profile Information */}
        <div className="flex-1 text-center md:text-left w-full">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={editData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>
              <div className="flex gap-2 justify-center md:justify-start">
                <Button onClick={handleSave}>Save Changes</Button>
                <Button variant="outline" onClick={handleCancel}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <h1 className="text-2xl font-bold">{user?.name || 'User'}</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  className="w-8 h-8"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-muted-foreground mb-2">{user?.email}</p>
              <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {formatDate(user?.joinDate)}</span>
                </div>
                {user?.subscriptionTier && user.subscriptionTier !== 'free' && (
                  <div className="flex items-center gap-1">
                    <Crown className="h-4 w-4" />
                    <span className="capitalize">{user.subscriptionTier.replace('_', ' ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-primary">{user?.stats?.daysActive || 0}</div>
            <div className="text-xs text-muted-foreground">Days Active</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600">{user?.stats?.wasteReduced || 0}%</div>
            <div className="text-xs text-muted-foreground">Waste Reduced</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-600">{user?.stats?.recipesTried || 0}</div>
            <div className="text-xs text-muted-foreground">Recipes Tried</div>
          </div>
        </div>
      </div>

      {/* Avatar Selector Modal */}
      <AvatarSelector
        currentAvatar={user?.avatar}
        onAvatarSelect={handleAvatarSelect}
        isOpen={showAvatarSelector}
        onClose={() => setShowAvatarSelector(false)}
      />
    </Card>
  )
}

export default ProfileHeader

