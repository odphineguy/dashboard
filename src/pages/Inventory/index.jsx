import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import InventoryTable from './components/InventoryTable'
import AddItemModal from './components/AddItemModal'
import { useAuth } from '../../contexts/AuthContext'
import { useHousehold } from '../../contexts/HouseholdContext'
import { supabase } from '../../lib/supabaseClient'
import { useBadgeAwarder } from '../../hooks/useBadgeAwarder'
import BadgeCelebration from '../../components/BadgeCelebration'

const Inventory = () => {
  const [inventoryItems, setInventoryItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [selectedItems, setSelectedItems] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const { currentHousehold, isPersonal } = useHousehold()
  const { checkBadges, celebrationBadge, closeCelebration } = useBadgeAwarder(user?.id)

  // Load inventory items
  useEffect(() => {
    const loadInventory = async () => {
      if (!user?.id) return

      try {
        setIsLoading(true)

        // Build query based on household selection (join with storage_locations)
        let query = supabase
          .from('pantry_items')
          .select(`
            *,
            storage_locations (
              id,
              name
            )
          `)
          .eq('user_id', user.id)

        if (isPersonal) {
          // Personal items: household_id is null
          query = query.is('household_id', null)
        } else if (currentHousehold?.id) {
          // Household items: match household_id
          query = query.eq('household_id', currentHousehold.id)
        }

        query = query.order('created_at', { ascending: false })

        const { data: pantryItems, error } = await query

        if (error) throw error

        const normalized = pantryItems?.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          expirationDate: item.expiry_date || null,
          addedDate: item.created_at,
          image: null,
          brand: item.brand,
          storageLocationId: item.storage_location_id,
          storageLocationName: item.storage_locations?.name || null,
          householdId: item.household_id,
          addedBy: 'You',
          addedByUserId: item.user_id
        })) || []

        setInventoryItems(normalized)
        setFilteredItems(normalized)
      } catch (error) {
        console.error('Error loading inventory:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadInventory()
  }, [user?.id, isPersonal, currentHousehold?.id])

  // Filter items based on search
  useEffect(() => {
    let filtered = [...inventoryItems]

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item?.name?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
        item?.category?.toLowerCase()?.includes(searchQuery?.toLowerCase())
      )
    }

    setFilteredItems(filtered)
  }, [inventoryItems, searchQuery])

  // Item selection handlers
  const handleSelectItem = (itemId) => {
    setSelectedItems(prev =>
      prev?.includes(itemId)
        ? prev?.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const handleSelectAll = () => {
    if (selectedItems?.length === filteredItems?.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredItems?.map(item => item?.id))
    }
  }

  const handleClearSelection = () => {
    setSelectedItems([])
  }

  // CRUD operations
  const handleAddItem = async (itemData) => {
    if (!user?.id) return

    const itemWithUser = {
      ...itemData,
      user_id: user.id,
      household_id: isPersonal ? null : currentHousehold?.id
    }

    if (editingItem) {
      // Update existing item
      const { data, error } = await supabase
        .from('pantry_items')
        .update(itemWithUser)
        .eq('id', editingItem.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating item:', error)
        return
      }

      const normalized = {
        id: data.id,
        name: data.name,
        quantity: data.quantity,
        unit: data.unit,
        category: data.category,
        expirationDate: data.expiry_date,
        addedDate: data.created_at,
        image: null,
        brand: data.brand,
        storageLocationId: data.storage_location_id,
        householdId: data.household_id,
        addedBy: 'You',
        addedByUserId: data.user_id
      }

      setInventoryItems(prev => prev.map(item => item.id === editingItem.id ? normalized : item))
      setEditingItem(null)
    } else {
      // Insert new item
      const { data, error } = await supabase
        .from('pantry_items')
        .insert([itemWithUser])
        .select()
        .single()

      if (error) {
        console.error('Error adding item:', error)
        return
      }

      const normalized = {
        id: data.id,
        name: data.name,
        quantity: data.quantity,
        unit: data.unit,
        category: data.category,
        expirationDate: data.expiry_date,
        addedDate: data.created_at,
        image: null,
        brand: data.brand,
        storageLocationId: data.storage_location_id,
        householdId: data.household_id,
        addedBy: 'You',
        addedByUserId: data.user_id
      }

      setInventoryItems(prev => [normalized, ...prev])
    }
  }

  const handleEditItem = (item) => {
    setEditingItem(item)
    setIsAddModalOpen(true)
  }


  const handleConsumed = async (item) => {
    if (!user?.id) return

    try {
      // Record 1 unit consumed
      const { error: eventError } = await supabase
        .from('pantry_events')
        .insert([{
          user_id: user.id,
          item_id: item.id,
          type: 'consumed',
          quantity: 1,
          at: new Date().toISOString()
        }])

      if (eventError) throw eventError

      const newQuantity = item.quantity - 1

      if (newQuantity <= 0) {
        // Delete the item if quantity reaches 0
        const { error: deleteError } = await supabase
          .from('pantry_items')
          .delete()
          .eq('id', item.id)

        if (deleteError) throw deleteError

        // Update UI - remove item
        setInventoryItems(prev => prev.filter(i => i.id !== item.id))
        setSelectedItems(prev => prev.filter(id => id !== item.id))
      } else {
        // Update the quantity
        const { error: updateError } = await supabase
          .from('pantry_items')
          .update({ quantity: newQuantity })
          .eq('id', item.id)

        if (updateError) throw updateError

        // Update UI - reduce quantity
        setInventoryItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, quantity: newQuantity } : i
        ))
      }

      // Check for badges
      await checkBadges('item_consumed')
    } catch (error) {
      console.error('Error marking item as consumed:', error)
      alert('Failed to mark item as consumed')
    }
  }

  const handleWasted = async (item) => {
    if (!user?.id) return

    try {
      // Record 1 unit wasted
      const { error: eventError } = await supabase
        .from('pantry_events')
        .insert([{
          user_id: user.id,
          item_id: item.id,
          type: 'wasted',
          quantity: 1,
          at: new Date().toISOString()
        }])

      if (eventError) throw eventError

      const newQuantity = item.quantity - 1

      if (newQuantity <= 0) {
        // Delete the item if quantity reaches 0
        const { error: deleteError } = await supabase
          .from('pantry_items')
          .delete()
          .eq('id', item.id)

        if (deleteError) throw deleteError

        // Update UI - remove item
        setInventoryItems(prev => prev.filter(i => i.id !== item.id))
        setSelectedItems(prev => prev.filter(id => id !== item.id))
      } else {
        // Update the quantity
        const { error: updateError } = await supabase
          .from('pantry_items')
          .update({ quantity: newQuantity })
          .eq('id', item.id)

        if (updateError) throw updateError

        // Update UI - reduce quantity
        setInventoryItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, quantity: newQuantity } : i
        ))
      }
    } catch (error) {
      console.error('Error marking item as wasted:', error)
      alert('Failed to mark item as wasted')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your food items efficiently
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isPersonal && currentHousehold && (
            <Badge variant="outline" className="text-sm flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500"></span>
              {currentHousehold.name}
            </Badge>
          )}
          {isPersonal && (
            <Badge variant="outline" className="text-sm flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              Personal
            </Badge>
          )}
          <Button
            variant="default"
            onClick={() => {
              setEditingItem(null)
              setIsAddModalOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search items..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium">Total:</span>
          <span>{inventoryItems.length} items</span>
          {searchQuery && (
            <>
              <span className="mx-2">•</span>
              <span>Showing: {filteredItems.length} items</span>
            </>
          )}
        </div>
      </div>

      {/* Selection Actions */}
      {selectedItems.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">
              {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
            </span>
            <Button variant="ghost" size="sm" onClick={handleClearSelection}>
              Clear Selection
            </Button>
          </div>
          <div className="flex items-center gap-2">
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <InventoryTable
        items={filteredItems}
        selectedItems={selectedItems}
        onSelectItem={handleSelectItem}
        onSelectAll={handleSelectAll}
        onEditItem={handleEditItem}
        onConsumed={handleConsumed}
        onWasted={handleWasted}
        isAllSelected={selectedItems?.length === filteredItems?.length && filteredItems?.length > 0}
        onAddItem={() => {
          setEditingItem(null)
          setIsAddModalOpen(true)
        }}
      />

      {/* Add/Edit Item Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingItem(null)
        }}
        onAddItem={handleAddItem}
        editingItem={editingItem}
      />

      {/* Badge Celebration Modal */}
      {celebrationBadge && (
        <BadgeCelebration
          badge={celebrationBadge}
          onClose={closeCelebration}
          userName={user?.email?.split('@')[0] || 'User'}
        />
      )}
    </div>
  )
}

export default Inventory
