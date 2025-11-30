import React from 'react'
import { Checkbox } from '../../../components/ui/checkbox'
import { Button } from '../../../components/ui/button'
import { Trash2 } from 'lucide-react'

const GroceryListItem = ({
  item,
  onToggleChecked,
  onDelete
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

