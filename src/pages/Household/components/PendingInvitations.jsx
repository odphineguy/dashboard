import React from 'react'
import { Mail, Clock, X } from 'lucide-react'
import { Card } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { useSupabase } from '../../../hooks/useSupabase'

const PendingInvitations = ({ invitations, householdId }) => {
  const supabase = useSupabase()

  const handleCancelInvitation = async (invitationId) => {
    if (!confirm('Cancel this invitation?')) return

    try {
      const { error } = await supabase
        .from('household_invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error

      // Reload page to refresh invitations
      window.location.reload()
    } catch (error) {
      console.error('Error canceling invitation:', error)
      alert('Failed to cancel invitation')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Pending Invitations</h2>
        <Badge variant="outline">{invitations.length}</Badge>
      </div>

      <div className="space-y-3">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between p-3 border border-border rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{invitation.email}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Sent {formatDate(invitation.created_at)}</span>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCancelInvitation(invitation.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default PendingInvitations
