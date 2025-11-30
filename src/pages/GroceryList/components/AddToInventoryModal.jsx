import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { useSupabase } from '../../../hooks/useSupabase'
import { useHousehold } from '../../../contexts/HouseholdContext'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { X, Package, Calendar, MapPin } from 'lucide-react'

const AddToInventoryModal = ({ isOpen, onClose, groceryItem, onSuccess }) => {
  const { user } = useAuth()
  const supabase = useSupabase()
  const { currentHousehold, isPersonal } = useHousehold()
  const [loading, setLoading] = useState(false)
  const [storageLocations, setStorageLocations] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    unit: 'unit',
    category: '',
    expiry_date: '',
    storage_location_id: '',
    notes: ''
  })

  // Load storage locations
  useEffect(() => {
    const loadStorageLocations = async () => {
      if (!user?.id) return

      try {
        let query = supabase
          .from('storage_locations')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })

        if (!isPersonal && currentHousehold?.id) {
          query = query.eq('household_id', currentHousehold.id)
        } else {
          query = query.is('household_id', null)
        }

        const { data, error } = await query

        if (error) throw error
        setStorageLocations(data || [])
      } catch (error) {
        console.error('Error loading storage locations:', error)
      }
    }

    if (isOpen) {
      loadStorageLocations()
    }
  }, [user?.id, isOpen, isPersonal, currentHousehold?.id])

  // Pre-fill form with grocery item data
  useEffect(() => {
    if (groceryItem && isOpen) {
      setFormData({
        name: groceryItem.name || '',
        quantity: groceryItem.quantity || 1,
        unit: groceryItem.unit || 'unit',
        category: groceryItem.category || '',
        expiry_date: '',
        storage_location_id: '',
        notes: groceryItem.notes || ''
      })
    }
  }, [groceryItem, isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user?.id || !formData.name.trim()) return

    setLoading(true)
    try {
      const insertData = {
        user_id: user.id,
        name: formData.name.trim(),
        quantity: formData.quantity || 1,
        unit: formData.unit || null,
        category: formData.category || null,
        expiry_date: formData.expiry_date || null,
        storage_location_id: formData.storage_location_id || null,
        notes: formData.notes.trim() || null
      }

      // Add to household if not personal
      if (!isPersonal && currentHousehold?.id) {
        insertData.household_id = currentHousehold.id
      }

      const { error } = await supabase
        .from('pantry_items')
        .insert([insertData])

      if (error) throw error

      onSuccess?.(groceryItem)
      onClose()
    } catch (error) {
      console.error('Error adding to inventory:', error)
      alert('Failed to add to inventory. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Add to Inventory
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Item Name */}
          <div>
            <Label htmlFor="inv-name">Item Name *</Label>
            <Input
              id="inv-name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div>
              <Label htmlFor="inv-quantity">Quantity</Label>
              <Input
                id="inv-quantity"
                type="number"
                min="0.5"
                step="0.5"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 1)}
              />
            </div>

            {/* Unit */}
            <div>
              <Label htmlFor="inv-unit">Unit</Label>
              <select
                id="inv-unit"
                value={formData.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="unit">unit</option>
                <option value="lb">lb</option>
                <option value="oz">oz</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="gal">gal</option>
                <option value="qt">qt</option>
                <option value="pt">pt</option>
                <option value="cup">cup</option>
                <option value="bottle">bottle</option>
                <option value="can">can</option>
                <option value="box">box</option>
                <option value="bag">bag</option>
                <option value="bunch">bunch</option>
                <option value="dozen">dozen</option>
                <option value="pack">pack</option>
              </select>
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <Label htmlFor="inv-expiry" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Expiry Date
            </Label>
            <Input
              id="inv-expiry"
              type="date"
              value={formData.expiry_date}
              onChange={(e) => handleChange('expiry_date', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Storage Location */}
          {storageLocations.length > 0 && (
            <div>
              <Label htmlFor="inv-location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Storage Location
              </Label>
              <select
                id="inv-location"
                value={formData.storage_location_id}
                onChange={(e) => handleChange('storage_location_id', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select location...</option>
                {storageLocations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category */}
          <div>
            <Label htmlFor="inv-category">Category</Label>
            <select
              id="inv-category"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Select category...</option>
              <option value="produce">Produce</option>
              <option value="dairy">Dairy</option>
              <option value="meat">Meat</option>
              <option value="bakery">Bakery</option>
              <option value="frozen">Frozen</option>
              <option value="pantry">Pantry</option>
              <option value="beverages">Beverages</option>
              <option value="snacks">Snacks</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="inv-notes">Notes</Label>
            <Input
              id="inv-notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.name.trim() || loading} className="gap-2">
              <Package className="h-4 w-4" />
              {loading ? 'Adding...' : 'Add to Inventory'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddToInventoryModal

