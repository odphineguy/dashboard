import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

const buildUser = (sessionUser) => {
  if (!sessionUser) return null
  return {
    id: sessionUser.id,
    email: sessionUser.email,
    user_metadata: {
      full_name:
        sessionUser.user_metadata?.full_name ||
        sessionUser.user_metadata?.name ||
        sessionUser.email?.split('@')[0] ||
        '',
      avatar_url:
        sessionUser.user_metadata?.avatar_url ||
        sessionUser.user_metadata?.picture ||
        null,
    },
  }
}

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileReady, setProfileReady] = useState(false)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const sessionUser = session?.user
    if (!sessionUser) {
      setProfileReady(true)
      return
    }

    const ensureProfile = async () => {
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, subscription_tier, avatar_url')
          .eq('id', sessionUser.id)
          .maybeSingle()

        const fullName =
          sessionUser.user_metadata?.full_name ||
          sessionUser.user_metadata?.name ||
          sessionUser.email?.split('@')[0] ||
          'User'
        const avatar =
          sessionUser.user_metadata?.avatar_url ||
          sessionUser.user_metadata?.picture ||
          null

        if (existingProfile) {
          await supabase
            .from('profiles')
            .update({
              email: sessionUser.email,
              full_name: fullName,
              ...(existingProfile.avatar_url?.startsWith('/avatars/')
                ? {}
                : { avatar_url: avatar || existingProfile.avatar_url }),
              updated_at: new Date().toISOString(),
            })
            .eq('id', sessionUser.id)
        } else {
          await supabase.from('profiles').insert({
            id: sessionUser.id,
            email: sessionUser.email,
            full_name: fullName,
            avatar_url: avatar,
            subscription_tier: 'basic',
            subscription_status: 'active',
          })
        }
      } catch (error) {
        console.error('Error ensuring profile:', error)
      } finally {
        setProfileReady(true)
      }
    }

    setProfileReady(false)
    ensureProfile()
  }, [session?.user?.id])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading || (session && !profileReady)) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading authentication...' : 'Setting up your profile...'}
          </p>
        </div>
      </div>
    )
  }

  const user = buildUser(session?.user)

  return (
    <AuthContext.Provider
      value={{
        user,
        isSignedIn: !!session,
        signOut,
        loading,
        sessionLoaded: !loading && profileReady,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
