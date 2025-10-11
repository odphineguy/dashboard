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
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error checking onboarding status:', error)
          setChecking(false)
          return
        }

        // If onboarding not completed, redirect to onboarding
        if (!profile?.onboarding_completed) {
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
