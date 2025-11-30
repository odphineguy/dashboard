import React from 'react'
import { Checkbox } from '../../../components/ui/checkbox'
import { Button } from '../../../components/ui/button'
import { Trash2, Package } from 'lucide-react'

const GroceryListItem = ({
  item,
  onToggleChecked,
  onDelete,
  onAddToInventory
}) => {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
        item.is_checked ? 'bg-muted/30' : 'hover:bg-muted/50'
      }`}
    >
      {/* Checkbox to mark as done */}
      <Checkbox
        checked={item.is_checked}
        onCheckedChange={(checked) => onToggleChecked(item.id, checked)}
        className={item.is_checked ? 'border-primary bg-primary' : ''}
      />

      {/* Item Name */}
      <span
        className={`flex-1 ${
          item.is_checked
            ? 'line-through text-muted-foreground'
            : 'text-foreground'
        }`}
      >
        {item.name}
        {item.source === 'low_stock' && (
          <span className="ml-2 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">
            Low Stock
          </span>
        )}
      </span>

      {/* Add to Inventory Button (show for checked items) */}
      {item.is_checked && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onAddToInventory(item)}
          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
          title="Add to Inventory"
        >
          <Package className="h-4 w-4" />
        </Button>
      )}

      {/* Delete Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(item.id)}
        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default GroceryListItem

