import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

const OnboardingGuard = ({ children }) => {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (authLoading || !user) {
        setChecking(false)
        return
      }

      // Don't redirect if already on onboarding page
      if (location.pathname === '/onboarding') {
        setChecking(false)
        return
      }

      try {
        // Add a small retry mechanism for database sync after payment
        let retries = 0
        let profile = null
        let error = null

        while (retries < 3) {
          const result = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .maybeSingle()

          profile = result.data
          error = result.error

          // If we got a profile with onboarding completed, break out
          if (profile && profile.onboarding_completed === true) {
            break
          }

          // If no profile or not completed, wait a bit before retrying
          if (retries < 2) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          retries++
        }

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
  }, [user, authLoading, navigate, location.pathname])

  if (authLoading || checking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return children
}

export default OnboardingGuard
