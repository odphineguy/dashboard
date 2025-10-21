import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionLoaded, setSessionLoaded] = useState(false)

  useEffect(() => {
    // Check active sessions and sets the user
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth, checking for existing session...')
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session during initialization:', error)
        }

        console.log('Initial session check result:', {
          sessionExists: !!session,
          userId: session?.user?.id,
          error,
          currentPath: window.location.pathname,
          url: window.location.href
        })

        setUser(session?.user ?? null)
        setSessionLoaded(true)
        setLoading(false)
      } catch (error) {
        console.error('Error initializing auth:', error)
        setSessionLoaded(true)
        setLoading(false)
      }
    }

    // Add a small delay for OAuth redirect scenarios
    const initTimeout = setTimeout(() => {
      initializeAuth()
    }, 100)

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', {
        event,
        userId: session?.user?.id,
        sessionExists: !!session,
        currentPath: window.location.pathname,
        url: window.location.href
      })

      // Handle OAuth redirect scenarios
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('OAuth sign in detected, session loaded for user:', session.user.id)
        // Force a session refresh to ensure it's properly stored
        try {
          await supabase.auth.getSession()
        } catch (refreshError) {
          console.error('Error refreshing session after OAuth:', refreshError)
        }
      }

      setUser(session?.user ?? null)
      setSessionLoaded(true)
      setLoading(false)
    })

    return () => {
      clearTimeout(initTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`
      }
    })
    if (error) throw error

    // Check if email confirmation is required
    if (data?.user && !data?.session) {
      // User created but needs to verify email - no session created
      return { ...data, needsEmailVerification: true }
    }

    return data
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
    } catch (error) {
      // If session is missing, clear local storage manually
      console.error('Sign out error:', error)
      localStorage.clear()
      sessionStorage.clear()
      setUser(null)
      window.location.href = '/login'
    }
  }

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/onboarding`
    console.log('Starting Google OAuth sign-in, redirecting to:', redirectUrl)
    console.log('Current origin:', window.location.origin)
    console.log('Full redirect URL:', redirectUrl)

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    })
    if (error) {
      console.error('Google OAuth error:', error)
      throw error
    }
    console.log('Google OAuth initiated successfully')
    return data
  }

  const signInWithApple = async () => {
    const redirectUrl = `${window.location.origin}/onboarding`
    console.log('Starting Apple OAuth sign-in, redirecting to:', redirectUrl)
    console.log('Current origin:', window.location.origin)
    console.log('Full redirect URL:', redirectUrl)

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: redirectUrl
      }
    })
    if (error) {
      console.error('Apple OAuth error:', error)
      throw error
    }
    console.log('Apple OAuth initiated successfully')
    return data
  }

  const value = {
    user,
    loading,
    sessionLoaded,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    signInWithApple,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

