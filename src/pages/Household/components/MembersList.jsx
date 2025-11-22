import React, { useState } from 'react'
import { Crown, User, MoreVertical, Shield, UserMinus, Loader2 } from 'lucide-react'
import { Card } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu'
import { useHousehold } from '../../../contexts/HouseholdContext'

const MembersList = ({ members, loading, currentUserId, userRole, householdId }) => {
  const [actionLoading, setActionLoading] = useState(null)
  const { removeMember, updateMemberRole } = useHousehold()

  const handleRemoveMember = async (userId) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      setActionLoading(userId)
      await removeMember(householdId, userId)
      // Reload page to refresh members list
      window.location.reload()
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Failed to remove member')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePromoteToAdmin = async (userId) => {
    if (!confirm('Promote this member to admin?')) return

    try {
      setActionLoading(userId)
      await updateMemberRole(householdId, userId, 'admin')
      // Reload page to refresh members list
      window.location.reload()
    } catch (error) {
      console.error('Error promoting member:', error)
      alert('Failed to promote member')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDemoteToMember = async (userId) => {
    if (!confirm('Demote this admin to member?')) return

    try {
      setActionLoading(userId)
      await updateMemberRole(householdId, userId, 'member')
      // Reload page to refresh members list
      window.location.reload()
    } catch (error) {
      console.error('Error demoting member:', error)
      alert('Failed to demote member')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Members</h2>
      <div className="space-y-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 border border-border rounded-lg"
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
              </div>

              {/* Member Info */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{member.name}</span>
                  {member.id === currentUserId && (
                    <Badge variant="outline" className="text-xs">You</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {member.role === 'admin' ? (
                    <>
                      <Crown className="h-3 w-3 text-amber-500" />
                      <span>Admin</span>
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3" />
                      <span>Member</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions (Admin Only) */}
            {userRole === 'admin' && member.id !== currentUserId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={actionLoading === member.id}>
                    {actionLoading === member.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreVertical className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {member.role === 'member' ? (
                    <DropdownMenuItem onClick={() => handlePromoteToAdmin(member.id)}>
                      <Shield className="h-4 w-4 mr-2" />
                      Promote to Admin
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleDemoteToMember(member.id)}>
                      <User className="h-4 w-4 mr-2" />
                      Demote to Member
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-red-600"
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Remove Member
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}

        {members.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No members found</p>
          </div>
        )}
      </div>
    </Card>
  )
}

export default MembersList
