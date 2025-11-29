/**
 * Temporary utility component to clear test data
 * 
 * Usage: Add this to any page temporarily:
 * import ClearDataButton from '../components/ClearDataButton'
 * Then add <ClearDataButton /> in the JSX
 * 
 * REMOVE THIS AFTER TESTING
 */

import React, { useState } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/button'
import { Trash2, Loader2, CheckCircle } from 'lucide-react'

const ClearDataButton = () => {
  const supabase = useSupabase()
  const { user } = useAuth()
  const [clearing, setClearing] = useState(false)
  const [done, setDone] = useState(false)

  const clearAllData = async () => {
    if (!user?.id) {
      alert('You must be logged in')
      return
    }

    const confirmed = window.confirm(
      '⚠️ This will DELETE all your test data:\n\n' +
      '• All pantry items\n' +
      '• All consumption/waste events\n' +
      '• All storage locations\n' +
      '• All households\n\n' +
      'Your user account will remain.\n\n' +
      'Are you sure?'
    )

    if (!confirmed) return

    setClearing(true)
    setDone(false)

    try {
      // Delete in order (respecting foreign keys)
      console.log('Clearing pantry_events...')
      await supabase.from('pantry_events').delete().eq('user_id', user.id)

      console.log('Clearing pantry_items...')
      await supabase.from('pantry_items').delete().eq('user_id', user.id)

      console.log('Clearing ai_saved_recipes...')
      await supabase.from('ai_saved_recipes').delete().eq('user_id', user.id)

      console.log('Clearing storage_locations...')
      await supabase.from('storage_locations').delete().eq('user_id', user.id)

      // Get households where user is a member
      const { data: memberships } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)

      if (memberships && memberships.length > 0) {
        const householdIds = memberships.map(m => m.household_id)
        
        console.log('Clearing household_members...')
        await supabase.from('household_members').delete().in('household_id', householdIds)

        console.log('Clearing households...')
        await supabase.from('households').delete().in('id', householdIds)
      }

      console.log('✅ All test data cleared!')
      setDone(true)
      
      // Reload after 2 seconds
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (error) {
      console.error('Error clearing data:', error)
      alert('Error clearing data: ' + error.message)
    } finally {
      setClearing(false)
    }
  }

  return (
    <Button
      variant="destructive"
      onClick={clearAllData}
      disabled={clearing || done}
      className="gap-2"
    >
      {clearing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Clearing...
        </>
      ) : done ? (
        <>
          <CheckCircle className="h-4 w-4" />
          Done! Reloading...
        </>
      ) : (
        <>
          <Trash2 className="h-4 w-4" />
          Clear All Test Data
        </>
      )}
    </Button>
  )
}

export default ClearDataButton

