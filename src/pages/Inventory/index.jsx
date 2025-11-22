import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSupabase } from '../../hooks/useSupabase'
import { useHousehold } from '../../contexts/HouseholdContext'
import AddItemModal from './components/AddItemModal'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'
import { Search, Plus, Edit, Trash2, Package } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

const Inventory = () => {
  const { user } = useAuth()
  const supabase = useSupabase()
  const { currentHousehold, isPersonal } = useHousehold()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  useEffect(() => {
    loadItems()
  }, [user?.id, currentHousehold?.id, isPersonal])

  const loadItems = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      let query = supabase
        .from('pantry_items')
        .select('*')
        .eq('user_id', user.id)

      if (!isPersonal && currentHousehold?.id) {
        query = query.or(`household_id.eq.${currentHousehold.id},user_id.eq.${user.id}`)
      } else {
        query = query.is('household_id', null)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error loading items:', error)
      toast.error('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async (itemData) => {
    if (!user?.id) return

    try {
      const itemWithUser = {
        ...itemData,
        user_id: user.id,
        household_id: isPersonal ? null : currentHousehold?.id
      }

      const { data, error } = await supabase
        .from('pantry_items')
        .insert([itemWithUser])
        .select()
        .single()

      if (error) throw error

      toast.success('Item added successfully')
      setIsAddModalOpen(false)
      loadItems()
    } catch (error) {
      console.error('Error adding item:', error)
      toast.error('Failed to add item')
    }
  }

  const handleUpdateItem = async (itemData) => {
    if (!editingItem?.id) return

    try {
      const { error } = await supabase
        .from('pantry_items')
        .update(itemData)
        .eq('id', editingItem.id)

      if (error) throw error

      toast.success('Item updated successfully')
      setEditingItem(null)
      loadItems()
    } catch (error) {
      console.error('Error updating item:', error)
      toast.error('Failed to update item')
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const { error } = await supabase
        .from('pantry_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      toast.success('Item deleted successfully')
      loadItems()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to delete item')
    }
  }

  const categories = ['all', ...new Set(items.map(item => item.category).filter(Boolean))]

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Inventory</h1>
          <p className="text-muted-foreground">Manage your pantry items</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {searchQuery || selectedCategory !== 'all' 
                ? 'No items match your filters' 
                : 'No items in inventory. Add your first item!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{item.name}</h3>
                    {item.category && (
                      <span className="text-xs text-muted-foreground">{item.category}</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingItem(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Quantity: </span>
                    <span className="font-medium">{item.quantity} {item.unit || 'units'}</span>
                  </div>
                  {item.expiry_date && (
                    <div>
                      <span className="text-muted-foreground">Expires: </span>
                      <span className="font-medium">
                        {format(new Date(item.expiry_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  {item.notes && (
                    <div className="text-muted-foreground text-xs mt-2">
                      {item.notes}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AddItemModal
        isOpen={isAddModalOpen || !!editingItem}
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingItem(null)
        }}
        onAddItem={editingItem ? handleUpdateItem : handleAddItem}
        editingItem={editingItem}
      />
    </div>
  )
}

export default Inventory
