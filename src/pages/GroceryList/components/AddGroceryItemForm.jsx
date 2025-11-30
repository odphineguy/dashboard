import React, { useState } from 'react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Plus } from 'lucide-react'

const AddGroceryItemForm = ({ onAdd, onCancel }) => {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      await onAdd({ name: name.trim() })
      setName('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add item..."
        autoFocus
        className="flex-1"
      />
      <Button type="submit" disabled={!name.trim() || loading} size="sm" className="gap-1">
        <Plus className="h-4 w-4" />
        Add
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  )
}

export default AddGroceryItemForm
