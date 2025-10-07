import React, { useState } from 'react'
import { Package, Edit2, Trash2, ArrowUpDown, MapPin, Check } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Checkbox } from '../../../components/ui/checkbox'

const InventoryTable = ({
  items,
  selectedItems,
  onSelectItem,
  onSelectAll,
  onEditItem,
  onDeleteItem,
  onConsumed,
  onWasted,
  isAllSelected
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig?.key === key && sortConfig?.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getExpirationStatus = (expirationDate) => {
    if (!expirationDate) return { status: 'none', label: 'No Date', color: 'bg-gray-500' }

    const today = new Date()
    const expDate = new Date(expirationDate)
    const diffTime = expDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { status: 'expired', label: 'Expired', color: 'bg-red-600' }
    } else if (diffDays === 0) {
      return { status: 'today', label: 'Expires Today', color: 'bg-red-500' }
    } else if (diffDays <= 3) {
      return { status: 'soon', label: 'Expiring Soon', color: 'bg-orange-500' }
    }
    return { status: 'fresh', label: 'Fresh', color: 'bg-green-500' }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No date'
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const sortedItems = React.useMemo(() => {
    if (!sortConfig?.key) return items

    return [...items]?.sort((a, b) => {
      let aValue = a?.[sortConfig?.key]
      let bValue = b?.[sortConfig?.key]

      if (sortConfig?.key === 'expirationDate') {
        aValue = new Date(aValue)
        bValue = new Date(bValue)
      }

      if (aValue < bValue) {
        return sortConfig?.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig?.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [items, sortConfig])

  if (items.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No items yet</h3>
        <p className="text-muted-foreground mb-4">
          Start by adding your first item to your inventory
        </p>
        <Button variant="default">
          Add Your First Item
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="w-12 p-4">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={onSelectAll}
                />
              </th>
              <th className="text-left p-4 font-medium text-foreground">Item</th>
              <th
                className="text-left p-4 font-medium text-foreground cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center space-x-1">
                  <span>Category</span>
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th className="text-left p-4 font-medium text-foreground">Storage</th>
              <th
                className="text-left p-4 font-medium text-foreground cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('quantity')}
              >
                <div className="flex items-center space-x-1">
                  <span>Quantity</span>
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th
                className="text-left p-4 font-medium text-foreground cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('expirationDate')}
              >
                <div className="flex items-center space-x-1">
                  <span>Expiration</span>
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th className="text-left p-4 font-medium text-foreground">Status</th>
              <th className="text-right p-4 font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems?.map((item) => {
              const expirationStatus = getExpirationStatus(item?.expirationDate)
              return (
                <tr key={item?.id} className="border-b border-border hover:bg-muted/30">
                  <td className="p-4">
                    <Checkbox
                      checked={selectedItems?.includes(item?.id)}
                      onCheckedChange={() => onSelectItem(item?.id)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{item?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Added {formatDate(item?.addedDate)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary/10 text-secondary-foreground capitalize">
                      {item?.category || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="p-4">
                    {item?.storageLocationName ? (
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {item.storageLocationName}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-4 text-foreground font-medium">
                    {item?.quantity} {item?.unit}
                  </td>
                  <td className="p-4 text-foreground">
                    {formatDate(item?.expirationDate)}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-white ${expirationStatus?.color}`}>
                      {expirationStatus?.label}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onConsumed(item)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="Mark as consumed"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Consumed
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onWasted(item)}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        title="Mark as wasted"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Wasted
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditItem(item)}
                        title="Edit item"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteItem(item?.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden">
        {sortedItems?.map((item) => {
          const expirationStatus = getExpirationStatus(item?.expirationDate)
          return (
            <div
              key={item?.id}
              className="p-4 border-b border-border last:border-b-0"
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={selectedItems?.includes(item?.id)}
                  onCheckedChange={() => onSelectItem(item?.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{item?.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item?.quantity} {item?.unit}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-white ${expirationStatus?.color} ml-2`}>
                      {expirationStatus?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <span className="capitalize">{item?.category}</span>
                    <span>•</span>
                    <span>Exp: {formatDate(item?.expirationDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onConsumed(item)}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Consumed
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onWasted(item)}
                      className="text-orange-600 border-orange-200 hover:bg-orange-50"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Wasted
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditItem(item)}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteItem(item?.id)}
                      className="text-red-500 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default InventoryTable
