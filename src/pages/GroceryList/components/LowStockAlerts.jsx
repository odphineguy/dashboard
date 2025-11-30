import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { useSupabase } from '../../../hooks/useSupabase'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { AlertTriangle, Plus, Package, RefreshCw } from 'lucide-react'

const LowStockAlerts = ({ onAddToGroceryList }) => {
  const { user } = useAuth()
  const supabase = useSupabase()
  const [lowStockItems, setLowStockItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingItemId, setAddingItemId] = useState(null)

  const loadLowStockItems = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      
      // Get items where:
      // 1. quantity <= low_stock_threshold (or default threshold of 1)
      // 2. OR is_low_stock_marked is true
      // Only get personal items (no household_id)
      const { data, error } = await supabase
        .from('pantry_items')
        .select('*')
        .eq('user_id', user.id)
        .is('household_id', null)
        .or('is_low_stock_marked.eq.true,quantity.lte.1')
        .order('quantity', { ascending: true })
        .limit(20) // Get more to account for filtering

      if (error) throw error

      // Get items already on the grocery list
      const { data: groceryItems } = await supabase
        .from('grocery_list_items')
        .select('name')
        .eq('user_id', user.id)

      const groceryNames = new Set(
        (groceryItems || []).map(item => item.name.toLowerCase())
      )

      // Filter to only show items that are actually low stock AND not on grocery list
      const filtered = data?.filter(item => {
        const threshold = item.low_stock_threshold || 1
        const isLowStock = item.is_low_stock_marked || item.quantity <= threshold
        const isOnGroceryList = groceryNames.has(item.name.toLowerCase())
        return isLowStock && !isOnGroceryList
      }).slice(0, 10) || []

      setLowStockItems(filtered)
    } catch (error) {
      console.error('Error loading low stock items:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLowStockItems()
  }, [user?.id])

  const handleAddToGroceryList = async (item) => {
    setAddingItemId(item.id)
    try {
      await onAddToGroceryList(item)
      // Remove from local state immediately after adding
      setLowStockItems(prev => prev.filter(i => i.id !== item.id))
    } catch (error) {
      // Item stays visible if there was an error
    } finally {
      setAddingItemId(null)
    }
  }

  const getCategoryIcon = (category) => {
    return <Package className="h-4 w-4" />
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Low Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Low Stock Alerts
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadLowStockItems}
            className="h-8 w-8"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {lowStockItems.length === 0 ? (
          <div className="text-center py-6">
            <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              All items are well-stocked!
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Items will appear here when running low
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {lowStockItems.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {item.quantity || 0} {item.unit || 'left'}
                    {item.is_low_stock_marked && !item.quantity <= (item.low_stock_threshold || 1) && (
                      <span className="ml-1">(marked)</span>
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddToGroceryList(item)}
                  disabled={addingItemId === item.id}
                  className="h-7 px-2 text-xs gap-1 shrink-0 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                >
                  <Plus className="h-3 w-3" />
                  {addingItemId === item.id ? 'Adding...' : 'Add'}
                </Button>
              </div>
            ))}

            {lowStockItems.length >= 10 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                Showing top 10 low stock items
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default LowStockAlerts

