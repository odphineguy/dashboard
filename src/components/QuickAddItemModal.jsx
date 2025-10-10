import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { supabase } from '../lib/supabaseClient'
import AddItemModal from '../pages/Inventory/components/AddItemModal'

const QuickAddItemModal = ({ isOpen, onClose }) => {
  const { user } = useAuth()
  const { currentHousehold, isPersonal } = useHousehold()

  const handleAddItem = async (itemData) => {
    if (!user?.id) return

    const itemWithUser = {
      ...itemData,
      user_id: user.id,
      household_id: isPersonal ? null : currentHousehold?.id
    }

    try {
      const { data, error } = await supabase
        .from('pantry_items')
        .insert([itemWithUser])
        .select()
        .single()

      if (error) {
        console.error('Error adding item:', error)
        alert('Failed to add item. Please try again.')
        return
      }

      // Success - close modal
      onClose()

      // Optional: Show success message
      console.log('Item added successfully:', data)
    } catch (error) {
      console.error('Error adding item:', error)
      alert('Failed to add item. Please try again.')
    }
  }

  return (
    <AddItemModal
      isOpen={isOpen}
      onClose={onClose}
      onAddItem={handleAddItem}
      editingItem={null}
    />
  )
}

export default QuickAddItemModal
