import React, { useState, useEffect } from 'react'
import { MapPin, Plus, Edit2, Trash2, Home, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { useAuth } from '../../contexts/AuthContext'
import { useHousehold } from '../../contexts/HouseholdContext'
import { supabase } from '../../lib/supabaseClient'
import ViewSwitcher from '../../components/ViewSwitcher'

const StorageLocations = () => {
  const { user } = useAuth()
  const { currentHousehold, isPersonal } = useHousehold()
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)

  // TODO: Replace with real subscription tier from user profile/Stripe
  // For now, hardcoded as 'basic'. Options: 'basic', 'premium', 'household_premium'
  const subscriptionTier = 'basic' // Mock data

  // Define storage limits by tier
  const storageConfigByTier = {
    basic: {
      pantry: 1,
      refrigerator: 1,
      freezer: 1,
      counter: 0,
      cabinet: 0
    },
    premium: {
      pantry: 2,
      refrigerator: 2,
      freezer: 2,
      counter: 1,
      cabinet: 1
    },
    household_premium: {
      unlimited: true
    }
  }

  // Default storage locations with tier requirements
  const defaultLocations = [
    { name: 'Pantry', icon: '🥫', type: 'pantry', tier: 'basic' },
    { name: 'Refrigerator', icon: '🧊', type: 'refrigerator', tier: 'basic' },
    { name: 'Freezer', icon: '❄️', type: 'freezer', tier: 'basic' },
    { name: 'Pantry 2', icon: '🥫', type: 'pantry', tier: 'premium' },
    { name: 'Refrigerator 2', icon: '🧊', type: 'refrigerator', tier: 'premium' },
    { name: 'Freezer 2', icon: '❄️', type: 'freezer', tier: 'premium' },
    { name: 'Counter', icon: '🍎', type: 'counter', tier: 'premium' },
    { name: 'Cabinet', icon: '🗄️', type: 'cabinet', tier: 'premium' }
  ]

  // Check if user can add more of a specific location type
  const canAddLocation = (typeName) => {
    const config = storageConfigByTier[subscriptionTier]
    if (config.unlimited) return true

    const typeKey = typeName.toLowerCase().split(' ')[0] // Get base type
    const currentCount = locations.filter(loc =>
      loc.name.toLowerCase().includes(typeKey)
    ).length

    return currentCount < (config[typeKey] || 0)
  }

  // Check if a default location is locked
  const isLocationLocked = (location) => {
    if (subscriptionTier === 'household_premium') return false
    if (location.tier === 'basic') return !canAddLocation(location.type)
    if (location.tier === 'premium' && subscriptionTier !== 'premium') return true
    return !canAddLocation(location.type)
  }

  // Load storage locations
  useEffect(() => {
    const loadLocations = async () => {
      if (!user?.id) return

      try {
        setLoading(true)
        let query = supabase
          .from('storage_locations')
          .select('*')
          .eq('user_id', user.id)

        if (isPersonal) {
          query = query.is('household_id', null)
        } else if (currentHousehold?.id) {
          query = query.eq('household_id', currentHousehold.id)
        }

        query = query.order('name', { ascending: true })

        const { data, error } = await query

        if (error) throw error
        setLocations(data || [])
      } catch (error) {
        console.error('Error loading storage locations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLocations()
  }, [user?.id, isPersonal, currentHousehold?.id])

  const handleAddDefaultLocations = async () => {
    try {
      const newLocations = defaultLocations.map(loc => ({
        name: loc.name,
        user_id: user.id,
        household_id: isPersonal ? null : currentHousehold?.id
      }))

      const { error } = await supabase
        .from('storage_locations')
        .insert(newLocations)

      if (error) throw error

      // Reload locations
      window.location.reload()
    } catch (error) {
      console.error('Error adding default locations:', error)
      alert('Failed to add default locations')
    }
  }

  const handleDeleteLocation = async (locationId) => {
    if (!confirm('Are you sure you want to delete this storage location?')) return

    try {
      const { error } = await supabase
        .from('storage_locations')
        .delete()
        .eq('id', locationId)

      if (error) throw error

      setLocations(prev => prev.filter(loc => loc.id !== locationId))
    } catch (error) {
      console.error('Error deleting location:', error)
      alert('Failed to delete location')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Storage Locations
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage where you store your food items
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ViewSwitcher />
          {locations.length === 0 && (
            <Button onClick={handleAddDefaultLocations} variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Add Default Locations
            </Button>
          )}
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Subscription Info */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              {subscriptionTier === 'basic' && 'Basic Plan'}
              {subscriptionTier === 'premium' && 'Premium Plan'}
              {subscriptionTier === 'household_premium' && 'Household Premium Plan'}
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {subscriptionTier === 'basic' && '1 Pantry, 1 Refrigerator, 1 Freezer'}
              {subscriptionTier === 'premium' && '2 of each basic location + Counter & Cabinet'}
              {subscriptionTier === 'household_premium' && 'Unlimited storage locations'}
            </p>
          </div>
          {subscriptionTier !== 'household_premium' && (
            <Link to="/profile">
              <Button size="sm" variant="default">
                Upgrade
              </Button>
            </Link>
          )}
        </div>
      </Card>

      {/* Available Storage Locations */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-lg font-semibold mb-4">Available Storage Locations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {defaultLocations.filter(loc => !isLocationLocked(loc)).map((location, idx) => {
                const existingLocation = locations.find(l =>
                  l.name.toLowerCase() === location.name.toLowerCase()
                )

                return existingLocation ? (
                  <Card key={existingLocation.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{location.icon}</span>
                          <h3 className="text-lg font-semibold">{existingLocation.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">Active</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingLocation(existingLocation)
                            setIsAddModalOpen(true)
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteLocation(existingLocation.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card key={`available-${idx}`} className="p-6 border-dashed">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl opacity-50">{location.icon}</span>
                          <h3 className="text-lg font-semibold text-muted-foreground">{location.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">Not added</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Add this specific location
                          supabase
                            .from('storage_locations')
                            .insert({
                              name: location.name,
                              user_id: user.id,
                              household_id: isPersonal ? null : currentHousehold?.id
                            })
                            .then(() => window.location.reload())
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Locked Storage Locations */}
          {defaultLocations.filter(loc => isLocationLocked(loc)).length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Upgrade to Unlock</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {defaultLocations.filter(loc => isLocationLocked(loc)).map((location, idx) => (
                  <Card key={`locked-${idx}`} className="p-6 opacity-60 bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl opacity-30">{location.icon}</span>
                          <h3 className="text-lg font-semibold text-muted-foreground">{location.name}</h3>
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Requires {location.tier === 'premium' ? 'Premium' : 'Upgrade'}
                        </p>
                      </div>
                      <Link to="/profile">
                        <Button size="sm" variant="outline">
                          Upgrade
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <AddLocationModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false)
            setEditingLocation(null)
          }}
          editingLocation={editingLocation}
          userId={user?.id}
          householdId={isPersonal ? null : currentHousehold?.id}
          onSuccess={() => {
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}

const AddLocationModal = ({ isOpen, onClose, editingLocation, userId, householdId, onSuccess }) => {
  const [name, setName] = useState(editingLocation?.name || '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      if (editingLocation) {
        // Update
        const { error } = await supabase
          .from('storage_locations')
          .update({ name: name.trim() })
          .eq('id', editingLocation.id)

        if (error) throw error
      } else {
        // Insert
        const { error } = await supabase
          .from('storage_locations')
          .insert({
            name: name.trim(),
            user_id: userId,
            household_id: householdId
          })

        if (error) throw error
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving location:', error)
      alert('Failed to save location')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-semibold mb-4">
          {editingLocation ? 'Edit Location' : 'Add Storage Location'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location-name">Location Name</Label>
            <Input
              id="location-name"
              type="text"
              placeholder="e.g., Refrigerator, Freezer, Pantry"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || loading}>
              {loading ? 'Saving...' : editingLocation ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default StorageLocations
