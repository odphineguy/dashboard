import { createContext, useContext, useState, useEffect } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { useAuth } from './AuthContext'

const HouseholdContext = createContext({})

export const useHousehold = () => {
  const context = useContext(HouseholdContext)
  if (!context) {
    throw new Error('useHousehold must be used within HouseholdProvider')
  }
  return context
}

export const HouseholdProvider = ({ children }) => {
  const { user } = useAuth()
  const supabase = useSupabase() // Use authenticated Supabase client
  const [households, setHouseholds] = useState([])
  const [currentHousehold, setCurrentHousehold] = useState(null)
  const [isPersonal, setIsPersonal] = useState(true)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load user's households
  useEffect(() => {
    const loadHouseholds = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        // Get all households the user is a member of
        const { data: memberships, error } = await supabase
          .from('household_members')
          .select(`
            *,
            households (
              id,
              name,
              created_at,
              created_by
            )
          `)
          .eq('user_id', user.id)

        if (error) throw error

        const householdList = memberships?.map(m => ({
          ...m.households,
          role: m.role,
          joined_at: m.joined_at
        })) || []

        setHouseholds(householdList)

        // Auto-select first household if available
        if (householdList.length > 0 && !currentHousehold) {
          const firstHousehold = householdList[0]
          setCurrentHousehold(firstHousehold)
          setUserRole(firstHousehold.role)
          setIsPersonal(false)
        }
      } catch (error) {
        console.error('Error loading households:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHouseholds()
  }, [user?.id, supabase])

  // Create a new household
  const createHousehold = async (name) => {
    if (!user?.id) throw new Error('User not authenticated')

    try {
      // Create household
      const { data: household, error: householdError } = await supabase
        .from('households')
        .insert({
          name,
          created_by: user.id
        })
        .select()
        .single()

      if (householdError) throw householdError

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: household.id,
          user_id: user.id,
          role: 'admin'
        })

      if (memberError) throw memberError

      // Reload households
      const updatedHouseholds = [...households, { ...household, role: 'admin' }]
      setHouseholds(updatedHouseholds)

      return household
    } catch (error) {
      console.error('Error creating household:', error)
      throw error
    }
  }

  // Switch to a different household or personal
  const switchHousehold = (householdId) => {
    if (!householdId) {
      setIsPersonal(true)
      setCurrentHousehold(null)
      setUserRole(null)
    } else {
      const household = households.find(h => h.id === householdId)
      if (household) {
        setCurrentHousehold(household)
        setUserRole(household.role)
        setIsPersonal(false)
      }
    }
  }

  // Invite user to household
  const inviteToHousehold = async (householdId, email) => {
    if (!user?.id) throw new Error('User not authenticated')

    try {
      // Check if user is admin
      const household = households.find(h => h.id === householdId)
      if (!household || household.role !== 'admin') {
        throw new Error('Only admins can invite members')
      }

      // Create invitation
      const { data: invitation, error } = await supabase
        .from('household_invitations')
        .insert({
          household_id: householdId,
          email,
          invited_by: user.id,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      // Send invitation email via Supabase edge function
      try {
        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          'send-household-invitation',
          {
            body: { invitationId: invitation.id }
          }
        )

        if (functionError) {
          console.error('Error sending invitation email:', functionError)
          // Don't throw - invitation was created, just email failed
        } else {
          console.log('Invitation email sent successfully')
        }
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError)
        // Don't throw - invitation was created, just email failed
      }

      return invitation
    } catch (error) {
      console.error('Error inviting user:', error)
      throw error
    }
  }

  // Accept invitation
  const acceptInvitation = async (invitationId) => {
    if (!user?.id) throw new Error('User not authenticated')

    try {
      // Get invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('household_invitations')
        .select('*, households(*)')
        .eq('id', invitationId)
        .eq('email', user.email)
        .eq('status', 'pending')
        .single()

      if (inviteError) throw inviteError

      // Add user to household
      const { error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: invitation.household_id,
          user_id: user.id,
          role: 'member'
        })

      if (memberError) throw memberError

      // Update invitation status
      const { error: updateError } = await supabase
        .from('household_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId)

      if (updateError) throw updateError

      // Reload households
      const updatedHouseholds = [...households, { ...invitation.households, role: 'member' }]
      setHouseholds(updatedHouseholds)

      return invitation.households
    } catch (error) {
      console.error('Error accepting invitation:', error)
      throw error
    }
  }

  // Leave household
  const leaveHousehold = async (householdId) => {
    if (!user?.id) throw new Error('User not authenticated')

    try {
      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', householdId)
        .eq('user_id', user.id)

      if (error) throw error

      // Update local state
      const updatedHouseholds = households.filter(h => h.id !== householdId)
      setHouseholds(updatedHouseholds)

      // If leaving current household, switch to personal
      if (currentHousehold?.id === householdId) {
        switchHousehold(null)
      }
    } catch (error) {
      console.error('Error leaving household:', error)
      throw error
    }
  }

  // Remove member (admin only)
  const removeMember = async (householdId, userId) => {
    if (!user?.id) throw new Error('User not authenticated')

    try {
      // Check if user is admin
      const household = households.find(h => h.id === householdId)
      if (!household || household.role !== 'admin') {
        throw new Error('Only admins can remove members')
      }

      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', householdId)
        .eq('user_id', userId)

      if (error) throw error
    } catch (error) {
      console.error('Error removing member:', error)
      throw error
    }
  }

  // Update member role (admin only)
  const updateMemberRole = async (householdId, userId, newRole) => {
    if (!user?.id) throw new Error('User not authenticated')

    try {
      // Check if user is admin
      const household = households.find(h => h.id === householdId)
      if (!household || household.role !== 'admin') {
        throw new Error('Only admins can update member roles')
      }

      const { error } = await supabase
        .from('household_members')
        .update({ role: newRole })
        .eq('household_id', householdId)
        .eq('user_id', userId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating member role:', error)
      throw error
    }
  }

  const value = {
    households,
    currentHousehold,
    isPersonal,
    userRole,
    loading,
    createHousehold,
    switchHousehold,
    inviteToHousehold,
    acceptInvitation,
    leaveHousehold,
    removeMember,
    updateMemberRole
  }

  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  )
}
