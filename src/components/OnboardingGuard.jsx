import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

const OnboardingGuard = ({ children }) => {
  const { user, loading: authLoading, sessionLoaded } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // Wait for auth to be fully loaded before checking onboarding status
      if (authLoading || !sessionLoaded) {
        return
      }

      if (!user) {
        setChecking(false)
        return
      }

      // Don't redirect if already on onboarding page
      if (location.pathname === '/onboarding') {
        setChecking(false)
        return
      }

      // Check if we should skip onboarding check (just completed)
      const skipCheck = sessionStorage.getItem('skip_onboarding_check')
      if (skipCheck === 'true') {
        console.log('Skipping onboarding check - just completed onboarding')
        sessionStorage.removeItem('skip_onboarding_check')
        setChecking(false)
        return
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle()

        if (error) {
          console.error('Error checking onboarding status:', error)
          // If error, let them through and try to create profile
          setChecking(false)
          return
        }

        // If profile doesn't exist OR onboarding not completed, redirect to onboarding
        if (!profile || profile.onboarding_completed === false || profile.onboarding_completed === null) {
          console.log('Redirecting to onboarding - onboarding_completed:', profile?.onboarding_completed)
          navigate('/onboarding', { replace: true })
        } else {
          setChecking(false)
        }
      } catch (error) {
        console.error('Error in onboarding check:', error)
        setChecking(false)
      }
    }

    checkOnboardingStatus()
  }, [user, authLoading, sessionLoaded, navigate, location.pathname])

  if (authLoading || checking || !sessionLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            {authLoading ? 'Loading auth...' : !sessionLoaded ? 'Loading session...' : 'Checking onboarding status...'}
          </p>
        </div>
      </div>
    )
  }

  return children
}

export default OnboardingGuard
