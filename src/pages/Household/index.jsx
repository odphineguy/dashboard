import React, { useState, useEffect } from 'react'
import { Users, Plus, Mail, UserPlus, Settings, Crown, User as UserIcon } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { useHousehold } from '../../contexts/HouseholdContext'
import { useAuth } from '../../contexts/AuthContext'
import { useSupabase } from '../../hooks/useSupabase'
import CreateHouseholdModal from './components/CreateHouseholdModal'
import InviteMemberModal from './components/InviteMemberModal'
import MembersList from './components/MembersList'
import PendingInvitations from './components/PendingInvitations'
import HouseholdInformation from '../Profile/components/HouseholdInformation'

const Household = () => {
  const { user } = useAuth()
  const supabase = useSupabase() // Use authenticated Supabase client with Clerk JWT
  const {
    households,
    currentHousehold,
    isPersonal,
    userRole,
    loading,
    switchHousehold,
    leaveHousehold
  } = useHousehold()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [members, setMembers] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  // Household data state
  const [householdData, setHouseholdData] = useState({
    familySize: '4',
    cookingFrequency: 'daily',
    dietaryRestrictions: {
      vegetarian: false,
      vegan: false,
      glutenFree: false,
      dairyFree: false,
      nutFree: false,
      lowSodium: false,
      diabetic: false,
      keto: false,
      paleo: false,
      halal: false,
      kosher: false
    },
    favoriteCuisines: '',
    allergies: ''
  })

  // Load household members
  useEffect(() => {
    const loadMembers = async () => {
      if (!currentHousehold?.id || isPersonal) {
        setMembers([])
        return
      }

      try {
        setLoadingMembers(true)
        const { data, error } = await supabase
          .from('household_members')
          .select(`
            *,
            profiles (
              id,
              full_name,
              avatar_url
            )
          `)
          .eq('household_id', currentHousehold.id)

        if (error) throw error

        const membersList = data?.map(m => ({
          id: m.user_id,
          name: m.profiles?.full_name || 'Unknown User',
          avatar: m.profiles?.avatar_url,
          role: m.role,
          joined_at: m.joined_at
        })) || []

        setMembers(membersList)
      } catch (error) {
        console.error('Error loading members:', error)
      } finally {
        setLoadingMembers(false)
      }
    }

    loadMembers()
  }, [currentHousehold?.id, isPersonal, supabase])

  // Load pending invitations
  useEffect(() => {
    const loadPendingInvites = async () => {
      if (!currentHousehold?.id || isPersonal || userRole !== 'admin') {
        setPendingInvites([])
        return
      }

      try {
        const { data, error } = await supabase
          .from('household_invitations')
          .select('*')
          .eq('household_id', currentHousehold.id)
          .eq('status', 'pending')

        if (error) throw error
        setPendingInvites(data || [])
      } catch (error) {
        console.error('Error loading pending invites:', error)
      }
    }

    loadPendingInvites()
  }, [currentHousehold?.id, isPersonal, userRole, supabase])

  const handleLeaveHousehold = async () => {
    if (!currentHousehold?.id) return

    if (confirm(`Are you sure you want to leave "${currentHousehold.name}"?`)) {
      try {
        await leaveHousehold(currentHousehold.id)
      } catch (error) {
        console.error('Error leaving household:', error)
        alert('Failed to leave household')
      }
    }
  }

  const handleUpdateHousehold = (newHouseholdData) => {
    setHouseholdData(newHouseholdData)
    console.log('Household information updated:', newHouseholdData)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Household Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your households and collaborate with family members
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Household
        </Button>
      </div>

      {/* Household Switcher */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Your Households</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Personal Pantry */}
            <button
              onClick={() => switchHousehold(null)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                isPersonal
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <UserIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Personal Pantry</h3>
                  <p className="text-sm text-muted-foreground">Just you</p>
                </div>
              </div>
            </button>

            {/* Household List */}
            {households.map(household => (
              <button
                key={household.id}
                onClick={() => switchHousehold(household.id)}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  currentHousehold?.id === household.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{household.name}</h3>
                      {household.role === 'admin' && (
                        <Crown className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">
                      {household.role}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {households.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>You're not part of any household yet.</p>
              <p className="text-sm">Create one or wait for an invitation!</p>
            </div>
          )}
        </div>
      </Card>

      {/* Household Preferences & Settings */}
      <HouseholdInformation
        householdData={householdData}
        onUpdateHousehold={handleUpdateHousehold}
      />

      {/* Current Household Details */}
      {!isPersonal && currentHousehold && (
        <>
          {/* Household Actions */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{currentHousehold.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {members.length} {members.length === 1 ? 'member' : 'members'}
                </p>
              </div>
              <div className="flex gap-2">
                {userRole === 'admin' && (
                  <Button onClick={() => setIsInviteModalOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                )}
                <Button variant="outline" onClick={handleLeaveHousehold}>
                  Leave Household
                </Button>
              </div>
            </div>
          </Card>

          {/* Members List */}
          <MembersList
            members={members}
            loading={loadingMembers}
            currentUserId={user?.id}
            userRole={userRole}
            householdId={currentHousehold.id}
          />

          {/* Pending Invitations (Admin Only) */}
          {userRole === 'admin' && pendingInvites.length > 0 && (
            <PendingInvitations
              invitations={pendingInvites}
              householdId={currentHousehold.id}
            />
          )}
        </>
      )}

      {/* Modals */}
      <CreateHouseholdModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        householdId={currentHousehold?.id}
      />
    </div>
  )
}

export default Household
