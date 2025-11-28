import React, { useState, useEffect } from 'react'
import { X, MapPin } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { useAuth } from '../../../contexts/AuthContext'
import { useHousehold } from '../../../contexts/HouseholdContext'
import { useSupabase } from '../../../hooks/useSupabase'
import { NavLink } from 'react-router-dom'

const AddItemModal = ({ isOpen, onClose, onAddItem, editingItem = null }) => {
  const { user } = useAuth()
  const { currentHousehold, isPersonal } = useHousehold()
  const supabase = useSupabase()
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'pieces',
    category: '',
    expirationDate: '',
    storageLocationId: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [storageLocations, setStorageLocations] = useState([])

  // Load storage locations
  useEffect(() => {
    const loadStorageLocations = async () => {
      if (!user?.id) return

      try {
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
        setStorageLocations(data || [])
      } catch (error) {
        console.error('Error loading storage locations:', error)
      }
    }

    if (isOpen) {
      loadStorageLocations()
    }
  }, [isOpen, user?.id, isPersonal, currentHousehold?.id])

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: editingItem?.name || '',
        quantity: editingItem?.quantity || '',
        unit: editingItem?.unit || 'pieces',
        category: editingItem?.category || '',
        expirationDate: editingItem?.expirationDate || '',
        storageLocationId: editingItem?.storageLocationId || ''
      })
    }
  }, [isOpen, editingItem])

  const categoryOptions = [
    { value: 'fruits', label: 'Fruits' },
    { value: 'vegetables', label: 'Vegetables' },
    { value: 'dairy', label: 'Dairy' },
    { value: 'meat', label: 'Meat & Fish' },
    { value: 'pantry', label: 'Pantry Items' },
    { value: 'beverages', label: 'Beverages' },
    { value: 'snacks', label: 'Snacks' },
    { value: 'frozen', label: 'Frozen Foods' },
    { value: 'bakery', label: 'Bakery' },
    { value: 'condiments', label: 'Condiments' }
  ]

  const unitOptions = [
    { value: 'pieces', label: 'Pieces' },
    { value: 'g', label: 'Grams' },
    { value: 'kg', label: 'Kilograms' },
    { value: 'lbs', label: 'Pounds' },
    { value: 'oz', label: 'Ounces' },
    { value: 'liters', label: 'Liters' },
    { value: 'gallons', label: 'Gallons' },
    { value: 'bag', label: 'Bag' },
    { value: 'container', label: 'Container' },
    { value: 'cups', label: 'Cups' }
  ]

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    setIsSubmitting(true)

    try {
      const itemData = {
        name: formData?.name,
        quantity: Number(formData?.quantity) || 0,
        unit: formData?.unit,
        category: formData?.category,
        expiry_date: formData?.expirationDate || null,
        storage_location_id: formData?.storageLocationId || null
      }

      await onAddItem(itemData)

      // Reset form
      setFormData({
        name: '',
        quantity: '',
        unit: 'pieces',
        category: '',
        expirationDate: '',
        storageLocationId: ''
      })
      onClose()
    } catch (error) {
      console.error('Error saving item:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = formData?.name && formData?.quantity && formData?.category

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {editingItem ? 'Update item details' : 'Add a new item to your inventory'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Item Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g., Organic Bananas"
              value={formData?.name}
              onChange={(e) => handleInputChange('name', e?.target?.value)}
              required
            />
          </div>

          {/* Quantity and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="1"
                value={formData?.quantity}
                onChange={(e) => handleInputChange('quantity', e?.target?.value)}
                required
                min="0.1"
                step="0.1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit *</Label>
              <select
                id="unit"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData?.unit}
                onChange={(e) => handleInputChange('unit', e?.target?.value)}
                required
              >
                {unitOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <select
              id="category"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={formData?.category}
              onChange={(e) => handleInputChange('category', e?.target?.value)}
              required
            >
              <option value="">Select category...</option>
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Storage Location */}
          <div className="space-y-2">
            <Label htmlFor="storageLocation">Storage Location (Optional)</Label>
            {storageLocations.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground flex-1">
                  No storage locations yet.
                </span>
                <NavLink to="/storage" className="text-sm text-primary hover:underline">
                  Add one
                </NavLink>
              </div>
            ) : (
              <select
                id="storageLocation"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData?.storageLocationId}
                onChange={(e) => handleInputChange('storageLocationId', e?.target?.value)}
              >
                <option value="">Select location...</option>
                {storageLocations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Expiration Date */}
          <div className="space-y-2">
            <Label htmlFor="expirationDate">Expiration Date (Optional)</Label>
            <Input
              id="expirationDate"
              type="date"
              value={formData?.expirationDate}
              onChange={(e) => handleInputChange('expirationDate', e?.target?.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddItemModal
