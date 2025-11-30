import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSupabase } from '../../hooks/useSupabase'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import {
  ShoppingCart,
  Plus,
  Filter,
  CheckCircle2,
  Circle,
  X,
  ChevronDown
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import GroceryListItem from './components/GroceryListItem'
import AddGroceryItemForm from './components/AddGroceryItemForm'
import LowStockAlerts from './components/LowStockAlerts'
import AddToInventoryModal from './components/AddToInventoryModal'

const GroceryList = () => {
  const { user } = useAuth()
  const supabase = useSupabase()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'unchecked', 'checked'
  const [showAddForm, setShowAddForm] = useState(false)
  const [inventoryModal, setInventoryModal] = useState({ isOpen: false, item: null })

  // Load grocery list items
  const loadItems = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('grocery_list_items')
        .select('*')
        .eq('user_id', user.id)
        .order('is_checked', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error loading grocery list:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [user?.id])

  // Add new item
  const handleAddItem = async (newItem) => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('grocery_list_items')
        .insert([{
          user_id: user.id,
          name: newItem.name,
          quantity: newItem.quantity || 1,
          unit: newItem.unit || null,
          category: newItem.category || null,
          notes: newItem.notes || null,
          source: 'manual'
        }])
        .select()
        .single()

      if (error) throw error

      setItems(prev => [data, ...prev])
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding item:', error)
      alert('Failed to add item. Please try again.')
    }
  }

  // Toggle item checked status
  const handleToggleChecked = async (itemId, isChecked) => {
    try {
      const { error } = await supabase
        .from('grocery_list_items')
        .update({ is_checked: isChecked })
        .eq('id', itemId)

      if (error) throw error

      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, is_checked: isChecked } : item
      ))
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  // Delete single item
  const handleDeleteItem = async (itemId) => {
    try {
      const { error } = await supabase
        .from('grocery_list_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      setItems(prev => prev.filter(item => item.id !== itemId))
      setSelectedItems(prev => prev.filter(id => id !== itemId))
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  // Clear all checked items
  const handleClearChecked = async () => {
    const checkedIds = items.filter(item => item.is_checked).map(item => item.id)
    if (checkedIds.length === 0) return

    try {
      const { error } = await supabase
        .from('grocery_list_items')
        .delete()
        .in('id', checkedIds)

      if (error) throw error

      setItems(prev => prev.filter(item => !item.is_checked))
    } catch (error) {
      console.error('Error clearing checked items:', error)
    }
  }

  // Open Add to Inventory modal for a single item
  const handleOpenInventoryModal = (item) => {
    setInventoryModal({ isOpen: true, item })
  }

  // Handle successful addition to inventory
  const handleInventorySuccess = async (groceryItem) => {
    // Remove the item from grocery list after adding to inventory
    try {
      const { error } = await supabase
        .from('grocery_list_items')
        .delete()
        .eq('id', groceryItem.id)

      if (error) throw error

      setItems(prev => prev.filter(item => item.id !== groceryItem.id))
    } catch (error) {
      console.error('Error removing item from grocery list:', error)
    }
  }

  // Add item from low stock alert
  const handleAddFromLowStock = async (pantryItem) => {
    if (!user?.id) return

    // Check if item already exists in grocery list
    const existingItem = items.find(
      item => item.name.toLowerCase() === pantryItem.name.toLowerCase()
    )

    if (existingItem) {
      alert(`"${pantryItem.name}" is already on your grocery list!`)
      return
    }

    try {
      const { data, error } = await supabase
        .from('grocery_list_items')
        .insert([{
          user_id: user.id,
          name: pantryItem.name,
          quantity: 1,
          unit: pantryItem.unit || null,
          category: pantryItem.category || null,
          source: 'low_stock'
        }])
        .select()
        .single()

      if (error) throw error

      setItems(prev => [data, ...prev])
    } catch (error) {
      console.error('Error adding item from low stock:', error)
      alert('Failed to add item. Please try again.')
    }
  }

  // Filter items based on current filter
  const filteredItems = items.filter(item => {
    if (filter === 'unchecked') return !item.is_checked
    if (filter === 'checked') return item.is_checked
    return true
  })

  const uncheckedCount = items.filter(item => !item.is_checked).length
  const checkedCount = items.filter(item => item.is_checked).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading grocery list...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="h-7 w-7 text-primary" />
            Grocery List
          </h1>
          <p className="text-muted-foreground mt-1">
            {uncheckedCount} item{uncheckedCount !== 1 ? 's' : ''} to buy
            {checkedCount > 0 && ` • ${checkedCount} checked off`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowAddForm(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Grocery List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add Item Form */}
          {showAddForm && (
            <AddGroceryItemForm
              onAdd={handleAddItem}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {/* Filters and Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {filter === 'all' ? 'All Items' : filter === 'unchecked' ? 'To Buy' : 'Purchased'}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilter('all')}>
                  <Circle className="h-4 w-4 mr-2" />
                  All Items ({items.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('unchecked')}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  To Buy ({uncheckedCount})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('checked')}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Purchased ({checkedCount})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {checkedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearChecked}
                className="gap-2 text-muted-foreground"
              >
                <X className="h-4 w-4" />
                Clear Purchased
              </Button>
            )}
          </div>

          {/* Grocery List Items */}
          <Card>
            <CardContent className="p-0">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-1">
                    {filter === 'all'
                      ? 'Your grocery list is empty'
                      : filter === 'unchecked'
                      ? 'Nothing left to buy!'
                      : 'No purchased items'}
                  </h3>
                  <p className="text-sm text-muted-foreground/60">
                    {filter === 'all' && 'Add items using the button above or from Low Stock Alerts'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredItems.map(item => (
                    <GroceryListItem
                      key={item.id}
                      item={item}
                      onToggleChecked={handleToggleChecked}
                      onDelete={handleDeleteItem}
                      onAddToInventory={handleOpenInventoryModal}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alerts Sidebar */}
        <div className="space-y-4">
          <LowStockAlerts onAddToGroceryList={handleAddFromLowStock} />
        </div>
      </div>

      {/* Add to Inventory Modal */}
      <AddToInventoryModal
        isOpen={inventoryModal.isOpen}
        onClose={() => setInventoryModal({ isOpen: false, item: null })}
        groceryItem={inventoryModal.item}
        onSuccess={handleInventorySuccess}
      />
    </div>
  )
}

export default GroceryList

