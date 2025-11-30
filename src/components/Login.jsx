import { useState } from 'react'
import { useSignIn, useSignUp } from '@clerk/clerk-react'
import { useTheme } from '../contexts/ThemeContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card } from './ui/card'
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react'

export default function Login() {
  const { signIn } = useSignIn()
  const { signUp } = useSignUp()
  const { isDark } = useTheme()
  const [isSignUpMode, setIsSignUpMode] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (isSignUpMode) {
        const result = await signUp.create({
          emailAddress: emailInput,
          password: passwordInput,
        })

        // Check if email verification is required
        if (result.status === 'missing_requirements') {
          await result.prepareEmailAddressVerification({ strategy: 'email_code' })
          setSuccess('✅ Account created! Please check your email to verify your account.')
          setEmailInput('')
          setPasswordInput('')
        } else {
          setSuccess('Account created! Signing you in...')
          window.location.href = '/'
        }
      } else {
        await signIn.create({
          identifier: emailInput,
          password: passwordInput,
        })
        window.location.href = '/'
      }
    } catch (err) {
      console.error('Auth error:', err)
      const errorMessage = err.errors?.[0]?.message || err.message || 'Authentication failed'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      })
    } catch (err) {
      console.error('Google sign-in error:', err)
      const errorMessage = err.errors?.[0]?.message || err.message || 'Google sign-in failed'
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleAppleSignIn = async () => {
    setLoading(true)
    setError(null)
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_apple',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      })
    } catch (err) {
      console.error('Apple sign-in error:', err)
      const errorMessage = err.errors?.[0]?.message || err.message || 'Apple sign-in failed'
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-4">
          <div className="flex justify-center mb-3">
            <img
              src={isDark ? "/MealSaverLogosDark.svg" : "/Meal.svg"}
              alt="Meal Saver Logo"
              className="h-24 w-auto object-contain"
            />
          </div>
          <p className="text-muted-foreground">
            {isSignUpMode ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="pl-10 !bg-white !text-gray-900 placeholder:text-gray-500"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="pl-10 !bg-white !text-gray-900 placeholder:text-gray-500"
                required
                minLength={6}
                disabled={loading}
              />
            </div>
            {isSignUpMode && (
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isSignUpMode ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              <>{isSignUpMode ? 'Create Account' : 'Sign In'}</>
            )}
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleAppleSignIn}
              disabled={loading}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Apple
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUpMode(!isSignUpMode)
              setError(null)
              setSuccess(null)
            }}
            className="text-sm text-primary hover:underline"
            disabled={loading}
          >
            {isSignUpMode
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </Card>
    </div>
  )
}

