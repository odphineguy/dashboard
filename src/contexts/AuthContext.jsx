import { createContext, useContext } from 'react'
import { useUser, useSignIn, useSignUp, useClerk } from '@clerk/clerk-react'

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
  const { signIn: clerkSignIn } = useSignIn()
  const { signUp: clerkSignUp } = useSignUp()
  const { signOut: clerkSignOut } = useClerk()

  // Transform Clerk user to match existing app structure
  const user = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress,
    user_metadata: {
      full_name: clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
      avatar_url: clerkUser.imageUrl,
    },
    // Add raw Clerk user for any Clerk-specific needs
    _clerk: clerkUser
  } : null

  const loading = !isLoaded
  const sessionLoaded = isLoaded

  // Email/Password Sign Up
  const signUp = async (email, password) => {
    try {
      const result = await clerkSignUp.create({
        emailAddress: email,
        password: password,
      })

      // Check if email verification is required
      if (result.status === 'missing_requirements') {
        // Send verification email
        await result.prepareEmailAddressVerification({ strategy: 'email_code' })
        return { needsEmailVerification: true, signUp: result }
      }

      return { user: result, needsEmailVerification: false }
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  // Email/Password Sign In
  const signIn = async (email, password) => {
    try {
      const result = await clerkSignIn.create({
        identifier: email,
        password: password,
      })
      return result
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  // Sign Out
  const signOut = async () => {
    try {
      await clerkSignOut()
      window.location.href = '/login'
    } catch (error) {
      console.error('Sign out error:', error)
      window.location.href = '/login'
    }
  }

  // Google OAuth - Clerk handles this automatically via their UI components
  const signInWithGoogle = async () => {
    try {
      await clerkSignIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/onboarding'
      })
    } catch (error) {
      console.error('Google OAuth error:', error)
      throw error
    }
  }

  // Apple OAuth - Clerk handles this automatically via their UI components
  const signInWithApple = async () => {
    try {
      await clerkSignIn.authenticateWithRedirect({
        strategy: 'oauth_apple',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/onboarding'
      })
    } catch (error) {
      console.error('Apple OAuth error:', error)
      throw error
    }
  }

  const value = {
    user,
    loading,
    sessionLoaded,
    isSignedIn,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    signInWithApple,
    clerkUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading authentication...</p>
          </div>
        </div>
      ) : children}
    </AuthContext.Provider>
  )
}

