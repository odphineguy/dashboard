import { createContext, useContext, useEffect, useState } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { createClient } from '@supabase/supabase-js'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser()
  const { signOut: clerkSignOut } = useClerk()
  const [profileReady, setProfileReady] = useState(false)

  // Simple user object
  const user = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        user_metadata: {
          full_name: clerkUser.fullName || clerkUser.firstName || '',
          avatar_url: clerkUser.imageUrl,
        },
      }
    : null

  // Create/update profile on first sign-in
  useEffect(() => {
    if (!isLoaded || !clerkUser) {
      setProfileReady(true)
      return
    }

    const ensureProfile = async () => {
      try {
        // Use service role to bypass RLS policies
        const supabase = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
        )

        const { error } = await supabase.from('profiles').upsert(
          {
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress,
            full_name: clerkUser.fullName || clerkUser.firstName || 'User',
            avatar_url: clerkUser.imageUrl || null,
            subscription_tier: 'basic',
            subscription_status: 'active',
          },
          { onConflict: 'id' }
        )

        if (error) {
          console.error('Profile sync error:', error)
        } else {
          console.log('✅ Profile synced for user:', clerkUser.id)
        }
      } catch (error) {
        console.error('Error ensuring profile:', error)
      } finally {
        setProfileReady(true)
      }
    }

    ensureProfile()
  }, [isLoaded, clerkUser?.id])

  const signOut = async () => {
    await clerkSignOut()
    window.location.href = '/login'
  }

  // Show loading while auth initializes or profile is being created
  if (!isLoaded || (isSignedIn && !profileReady)) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            {!isLoaded ? 'Loading authentication...' : 'Setting up your profile...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isSignedIn,
        signOut,
        loading: !isLoaded,
        sessionLoaded: isLoaded && profileReady,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
