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
import { useSubscription } from '../../contexts/SubscriptionContext'
import { useSupabase } from '../../hooks/useSupabase'
import ViewSwitcher from '../../components/ViewSwitcher'

const StorageLocations = () => {
  const { user } = useAuth()
  const { currentHousehold, isPersonal } = useHousehold()
  const { subscription } = useSubscription()
  const supabase = useSupabase()
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)

  // Get subscription tier from context (defaults to 'basic')
  const subscriptionTier = subscription?.tier || 'basic'

  // Define storage limits by tier
  const storageConfigByTier = {
    basic: {
      pantry: 1,
      refrigerator: 1,
      freezer: 1
    },
    premium: {
      pantry: 2,
      refrigerator: 2,
      freezer: 2
    },
    household_premium: {
      unlimited: true
    }
  }

  // Default storage locations with tier requirements
  // location_type must match DB constraint: 'pantry', 'fridge', 'freezer', 'other'
  const defaultLocations = [
    { name: 'Pantry', icon: '🥫', type: 'pantry', location_type: 'pantry', tier: 'basic' },
    { name: 'Refrigerator', icon: '🧊', type: 'refrigerator', location_type: 'fridge', tier: 'basic' },
    { name: 'Freezer', icon: '❄️', type: 'freezer', location_type: 'freezer', tier: 'basic' },
    { name: 'Pantry 2', icon: '🥫', type: 'pantry', location_type: 'pantry', tier: 'premium' },
    { name: 'Refrigerator 2', icon: '🧊', type: 'refrigerator', location_type: 'fridge', tier: 'premium' },
    { name: 'Freezer 2', icon: '❄️', type: 'freezer', location_type: 'freezer', tier: 'premium' }
  ]

  // Check if user already has a location with this name
  const hasLocation = (locationName) => {
    return locations.some(loc => 
      loc.name.toLowerCase() === locationName.toLowerCase()
    )
  }

  // Check if a default location should be locked (requires upgrade)
  // A location is locked if:
  // 1. It's a premium tier location and user is on basic
  // 2. User is on basic and has reached their limit for this type
  const isLocationLocked = (location) => {
    // Household premium users have no restrictions
    if (subscriptionTier === 'household_premium') return false
    
    // Premium tier locations (Pantry 2, Refrigerator 2, Freezer 2) require premium
    if (location.tier === 'premium' && subscriptionTier === 'basic') return true
    
    // For basic tier locations, they're never locked (user can have 1 of each)
    return false
  }

  // Check if user can add custom storage locations (Basic users reach limit at 3 total)
  const canAddCustomLocation = () => {
    if (subscriptionTier === 'household_premium') return true
    if (subscriptionTier === 'premium') return true
    // Basic tier: max 3 locations total (1 Pantry, 1 Refrigerator, 1 Freezer)
    return locations.length < 3
  }

  // Load storage locations
  useEffect(() => {
    const loadLocations = async () => {
      if (!user?.id) return

      try {
        setLoading(true)
        let data = []
        let error = null

        if (isPersonal) {
          // Personal mode: get user's personal locations (no household)
          const result = await supabase
            .from('storage_locations')
            .select('*')
            .eq('user_id', user.id)
            .is('household_id', null)
            .order('name', { ascending: true })
          
          data = result.data
          error = result.error
        } else if (currentHousehold?.id) {
          // Household mode: get ALL locations for this household (any user)
          const result = await supabase
            .from('storage_locations')
            .select('*')
            .eq('household_id', currentHousehold.id)
            .order('name', { ascending: true })
          
          data = result.data
          error = result.error
          
          // If no household locations exist, fall back to user's personal locations
          if (!error && (!data || data.length === 0)) {
            const personalResult = await supabase
              .from('storage_locations')
              .select('*')
              .eq('user_id', user.id)
              .is('household_id', null)
              .order('name', { ascending: true })
            
            if (!personalResult.error && personalResult.data) {
              setLocations(personalResult.data)
              setLoading(false)
              return
            }
          }
        }

        if (error) {
          console.error('Supabase error loading locations:', error)
          throw error
        }
        
        setLocations(data || [])
      } catch (error) {
        console.error('Error loading storage locations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLocations()
  }, [user?.id, isPersonal, currentHousehold?.id, supabase])

  const handleAddDefaultLocations = async () => {
    try {
      // Only add basic tier locations (3 default locations for basic users)
      const basicLocations = defaultLocations.filter(loc => loc.tier === 'basic')
      const newLocations = basicLocations.map(loc => ({
        name: loc.name,
        location_type: loc.location_type,
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
      alert('Failed to add default locations: ' + (error.message || 'Unknown error'))
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
          <Button
            onClick={() => setIsAddModalOpen(true)}
            disabled={!canAddCustomLocation()}
            className={!canAddCustomLocation() ? 'opacity-50 cursor-not-allowed' : ''}
          >
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
              {subscriptionTier === 'basic' && `3 storage locations included (${locations.length}/3 used) - 1 Pantry, 1 Refrigerator, 1 Freezer`}
              {subscriptionTier === 'premium' && '6 storage locations included - 2 of each type'}
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
                        onClick={async () => {
                          // Add this specific location
                          const { error } = await supabase
                            .from('storage_locations')
                            .insert({
                              name: location.name,
                              location_type: location.location_type,
                              user_id: user.id,
                              household_id: isPersonal ? null : currentHousehold?.id
                            })
                          if (error) {
                            console.error('Error adding location:', error)
                            alert('Failed to add location: ' + (error.message || 'Unknown error'))
                          } else {
                            window.location.reload()
                          }
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
  const supabase = useSupabase()
  const [name, setName] = useState(editingLocation?.name || '')
  const [locationType, setLocationType] = useState(editingLocation?.location_type || 'other')
  const [loading, setLoading] = useState(false)

  const locationTypes = [
    { value: 'pantry', label: 'Pantry', icon: '🥫' },
    { value: 'fridge', label: 'Refrigerator', icon: '🧊' },
    { value: 'freezer', label: 'Freezer', icon: '❄️' },
    { value: 'other', label: 'Other', icon: '📦' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      if (editingLocation) {
        // Update
        const { error } = await supabase
          .from('storage_locations')
          .update({ name: name.trim(), location_type: locationType })
          .eq('id', editingLocation.id)

        if (error) throw error
      } else {
        // Insert
        const { error } = await supabase
          .from('storage_locations')
          .insert({
            name: name.trim(),
            location_type: locationType,
            user_id: userId,
            household_id: householdId
          })

        if (error) throw error
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving location:', error)
      alert('Failed to save location: ' + (error.message || 'Unknown error'))
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
              placeholder="e.g., Kitchen Pantry, Garage Freezer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location-type">Location Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {locationTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setLocationType(type.value)}
                  className={`p-3 rounded-lg border text-left flex items-center gap-2 transition-colors ${
                    locationType === type.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <span className="text-xl">{type.icon}</span>
                  <span className="font-medium">{type.label}</span>
                </button>
              ))}
            </div>
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
