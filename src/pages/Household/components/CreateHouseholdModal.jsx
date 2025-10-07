import React, { useState } from 'react'
import { X, Home, Loader2 } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { useHousehold } from '../../../contexts/HouseholdContext'

const CreateHouseholdModal = ({ isOpen, onClose }) => {
  const [householdName, setHouseholdName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { createHousehold } = useHousehold()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!householdName.trim()) {
      setError('Household name is required')
      return
    }

    try {
      setLoading(true)
      await createHousehold(householdName.trim())
      setHouseholdName('')
      onClose()
    } catch (error) {
      console.error('Error creating household:', error)
      setError(error.message || 'Failed to create household')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Create Household</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="household-name">Household Name</Label>
            <Input
              id="household-name"
              type="text"
              placeholder="Smith Family, Our Apartment, etc."
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Household'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateHouseholdModal
