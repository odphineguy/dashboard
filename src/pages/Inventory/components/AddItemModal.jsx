import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { useSupabase } from '../../../hooks/useSupabase'
import { useHousehold } from '../../../contexts/HouseholdContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'

const AddItemModal = ({ isOpen, onClose, onAddItem, editingItem = null }) => {
  const { user } = useAuth()
  const supabase = useSupabase()
  const { currentHousehold, isPersonal } = useHousehold()
  const [storageLocations, setStorageLocations] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: '',
    category: '',
    expiry_date: '',
    notes: '',
    storage_location_id: null
  })

  // Common food categories
  const categories = [
    'Dairy',
    'Produce',
    'Meat',
    'Seafood',
    'Bakery',
    'Beverages',
    'Snacks',
    'Frozen',
    'Canned Goods',
    'Grains & Pasta',
    'Spices & Seasonings',
    'Condiments',
    'Deli',
    'Other'
  ]

  // Common units
  const units = [
    'pieces',
    'lb',
    'oz',
    'kg',
    'g',
    'cup',
    'tbsp',
    'tsp',
    'fl oz',
    'ml',
    'L',
    'box',
    'bag',
    'can',
    'jar',
    'bottle',
    'package'
  ]

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

        const { data, error } = await query.order('name', { ascending: true })

        if (error) throw error
        setStorageLocations(data || [])
      } catch (error) {
        console.error('Error loading storage locations:', error)
      }
    }

    if (isOpen) {
      loadStorageLocations()
    }
  }, [user?.id, isPersonal, currentHousehold?.id, isOpen, supabase])

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name || '',
        quantity: editingItem.quantity || '',
        unit: editingItem.unit || '',
        category: editingItem.category || '',
        expiry_date: editingItem.expiry_date || editingItem.expirationDate || '',
        notes: editingItem.notes || '',
        storage_location_id: editingItem.storage_location_id || null
      })
    } else {
      // Reset form for new item
      setFormData({
        name: '',
        quantity: '',
        unit: '',
        category: '',
        expiry_date: '',
        notes: '',
        storage_location_id: null
      })
    }
  }, [editingItem, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value === 'none' ? null : value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.quantity) {
      alert('Please fill in at least name and quantity')
      return
    }

    const itemData = {
      ...formData,
      quantity: parseFloat(formData.quantity) || 0,
      expiry_date: formData.expiry_date || null,
      storage_location_id: formData.storage_location_id || null
    }

    onAddItem(itemData)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-background rounded-lg shadow-xl max-w-md w-full pointer-events-auto max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background">
            <h3 className="text-lg font-semibold">
              {editingItem ? 'Edit Item' : 'Add Item'}
            </h3>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., Milk, Bread, Apples"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="unit" className="block text-sm font-medium mb-1">
                  Unit
                </label>
                <Select
                  value={formData.unit || 'none'}
                  onValueChange={(value) => handleSelectChange('unit', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {units.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium mb-1">
                Category
              </label>
              <Select
                value={formData.category || 'none'}
                onValueChange={(value) => handleSelectChange('category', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="storage_location_id" className="block text-sm font-medium mb-1">
                Storage Location
              </label>
              <Select
                value={formData.storage_location_id ? formData.storage_location_id : 'none'}
                onValueChange={(value) => handleSelectChange('storage_location_id', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select storage location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {storageLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.icon && <span className="mr-2">{location.icon}</span>}
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="expiry_date" className="block text-sm font-medium mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                id="expiry_date"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                {editingItem ? 'Update' : 'Add'} Item
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default AddItemModal

