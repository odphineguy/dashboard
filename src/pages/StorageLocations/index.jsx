import React, { useState, useEffect } from 'react'
import { MapPin, Plus, Edit2, Trash2, Home } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { useAuth } from '../../contexts/AuthContext'
import { useHousehold } from '../../contexts/HouseholdContext'
import { supabase } from '../../lib/supabaseClient'

const StorageLocations = () => {
  const { user } = useAuth()
  const { currentHousehold, isPersonal } = useHousehold()
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)

  // Default storage locations to suggest
  const defaultLocations = [
    { name: 'Refrigerator', icon: '🧊' },
    { name: 'Freezer', icon: '❄️' },
    { name: 'Pantry', icon: '🥫' },
    { name: 'Counter', icon: '🍎' },
    { name: 'Cabinet', icon: '🗄️' }
  ]

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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Storage Locations
            </h1>
            {!isPersonal && currentHousehold && (
              <Badge variant="outline" className="text-sm">
                {currentHousehold.name}
              </Badge>
            )}
            {isPersonal && (
              <Badge variant="outline" className="text-sm">
                Personal
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Manage where you store your food items
          </p>
        </div>

        <div className="flex gap-2">
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

      {/* Locations Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : locations.length === 0 ? (
        <Card className="p-12 text-center">
          <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Storage Locations</h3>
          <p className="text-muted-foreground mb-6">
            Add storage locations to organize your inventory better
          </p>
          <Button onClick={handleAddDefaultLocations}>
            <Home className="h-4 w-4 mr-2" />
            Add Default Locations
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(location => (
            <Card key={location.id} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">{location.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Storage location
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingLocation(location)
                      setIsAddModalOpen(true)
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteLocation(location.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
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
