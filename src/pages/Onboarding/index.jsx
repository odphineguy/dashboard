import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Lottie from 'lottie-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Checkbox } from '../../components/ui/checkbox'
import {
  ChefHat,
  Scan,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Heart,
  Target,
  Trash2,
  DollarSign,
  Users,
  User,
  Sparkles,
  Check,
  X
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useSubscription } from '../../contexts/SubscriptionContext'
import { supabase } from '../../lib/supabaseClient'

const OnboardingPage = () => {
  const { user, loading: authLoading, sessionLoaded, signUp, signInWithGoogle, signInWithApple } = useAuth()
  const { isDark } = useTheme()
  const { createCheckoutSession } = useSubscription()
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(() => {
    // Check if returning from payment - don't restore state in that case
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const sessionId = urlParams.get('session_id')

    if (success === 'true' && sessionId) {
      // Returning from successful payment - keep state, don't reset to step 1
      const saved = sessionStorage.getItem('onboarding_step')
      return saved ? parseInt(saved) : 6
    }

    // Restore step from sessionStorage if available
    const saved = sessionStorage.getItem('onboarding_step')
    return saved ? parseInt(saved) : 1
  })
  const [billingInterval, setBillingInterval] = useState('month') // 'month' or 'year'

  const [formData, setFormData] = useState(() => {
    // Restore form data from sessionStorage if available
    const saved = sessionStorage.getItem('onboarding_data')
    return saved ? JSON.parse(saved) : {
      name: '',
      email: '',
      password: '',
      accountType: '', // 'personal' or 'household'
      subscriptionTier: '', // 'free', 'premium', 'household_premium'
      householdName: '',
      householdSize: '',
      goals: [],
      notifications: true
    }
  })
  const [loading, setLoading] = useState(false)
  const [oauthSessionLoading, setOauthSessionLoading] = useState(false)
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [recipeBookAnimation, setRecipeBookAnimation] = useState(null)
  const [phoneScanAnimation, setPhoneScanAnimation] = useState(null)
  const [dashboardAnimation, setDashboardAnimation] = useState(null)

  // Save onboarding state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('onboarding_step', currentStep.toString())
  }, [currentStep])

  useEffect(() => {
    sessionStorage.setItem('onboarding_data', JSON.stringify(formData))
  }, [formData])

  // Update form data when user becomes available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        email: user.email || ''
      }))

      // If user just authenticated via OAuth and is at step 2 with paid tier selected
      // automatically advance to step 4
      const isOAuthRedirect = window.location.hash.includes('access_token') ||
                             window.location.search.includes('code')
      if (isOAuthRedirect && currentStep === 2 && formData.subscriptionTier && formData.subscriptionTier !== 'free') {
        console.log('OAuth completed, auto-advancing from step 2 to step 4')
        setCurrentStep(4)
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }
  }, [user, currentStep, formData.subscriptionTier])

  // Handle payment success/cancel callbacks and OAuth redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const canceled = urlParams.get('canceled')
    const sessionId = urlParams.get('session_id')

    // Check if this is an OAuth redirect by looking for auth tokens in URL or error parameters
    const isOAuthRedirect = window.location.hash.includes('access_token') ||
                           window.location.search.includes('code') ||
                           urlParams.has('token') ||
                           urlParams.has('refresh_token') ||
                           (urlParams.has('error') && urlParams.get('error') === 'access_denied')

    if (isOAuthRedirect) {
      console.log('OAuth redirect detected:', {
        hash: window.location.hash,
        search: window.location.search,
        error: urlParams.get('error'),
        errorDescription: urlParams.get('error_description')
      })

      if (urlParams.has('error') && urlParams.get('error') === 'access_denied') {
        console.error('OAuth access denied:', urlParams.get('error_description'))
        alert('OAuth access was denied. Please check your OAuth configuration in Supabase.')
        return
      }

      console.log('OAuth redirect detected, waiting for session to be established...')
      // Wait for auth to be properly initialized after OAuth redirect
      const checkOAuthSession = async () => {
        setOauthSessionLoading(true)
        let retries = 0
        const maxRetries = 20 // Increased for mobile Safari
        const retryDelay = 1000 // Increased to 1 second for mobile

        while (retries < maxRetries) {
          const { data: { session }, error } = await supabase.auth.getSession()
          console.log('OAuth session check:', {
            sessionExists: !!session,
            userId: session?.user?.id,
            error,
            attempt: retries + 1,
            maxRetries
          })

          if (session?.user) {
            console.log('OAuth session established, updating user context...')
            // Force context update
            setFormData(prev => ({
              ...prev,
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
              email: session.user.email || ''
            }))
            setOauthSessionLoading(false)
            break
          }

          await new Promise(resolve => setTimeout(resolve, retryDelay))
          retries++
        }

        if (retries >= maxRetries) {
          console.error('OAuth session establishment failed after maximum retries')
          setOauthSessionLoading(false)
          alert('Failed to establish session after OAuth. Please try signing in again.')
        }
      }

      checkOAuthSession()
    }

    if (success === 'true' && sessionId) {
      // Payment successful - wait for session to be loaded before completing onboarding
      const completeOnboarding = async () => {
        console.log('Payment success detected, waiting for auth session...')

        // Wait for auth session to be fully loaded
        let retries = 0
        while (!sessionLoaded && retries < 10) {
          console.log(`Waiting for sessionLoaded... attempt ${retries + 1}/10`)
          await new Promise(resolve => setTimeout(resolve, 500))
          retries++
        }

        if (user) {
          console.log('Payment success detected, completing onboarding for user:', user.id)
          handleSubmit()
        } else {
          console.error('Payment success but no user session found after waiting')
          // Try to get session directly
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            console.log('Found session via direct check, proceeding...')
            // Update context state manually if needed
            setFormData(prev => ({
              ...prev,
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
              email: session.user.email || ''
            }))
            handleSubmit()
          } else {
            alert('Payment successful but authentication session not found. Please try logging in again.')
            navigate('/login')
          }
        }
      }

      if (sessionLoaded) {
        completeOnboarding()
      }
    } else if (canceled === 'true') {
      // Payment canceled - return to payment step
      setCurrentStep(6)
      alert('Payment was canceled. Please try again or choose a different plan.')
    }
  }, [user, sessionLoaded, navigate])

  // Load animations
  React.useEffect(() => {
    fetch('/animations/recipe-book.json')
      .then(res => res.json())
      .then(data => setRecipeBookAnimation(data))
      .catch(err => console.error('Failed to load recipe animation:', err))

    fetch('/animations/phonescan.json')
      .then(res => res.json())
      .then(data => setPhoneScanAnimation(data))
      .catch(err => console.error('Failed to load phonescan animation:', err))

    fetch('/animations/Dashboard.json')
      .then(res => res.json())
      .then(data => setDashboardAnimation(data))
      .catch(err => console.error('Failed to load dashboard animation:', err))
  }, [])

  const steps = [
    {
      number: 1,
      title: "Welcome to Meal Saver",
      subtitle: "AI-powered food management"
    },
    {
      number: 2,
      title: "Choose Your Plan",
      subtitle: "Select the plan that works best for you"
    },
    {
      number: 3,
      title: "Create Your Account",
      subtitle: "Sign in to continue"
    },
    {
      number: 4,
      title: formData.accountType === 'household' ? "Set Up Your Household" : "Personalize Your Experience",
      subtitle: formData.accountType === 'household' ? "Create your shared household" : "Tell us about yourself"
    },
    {
      number: 5,
      title: "Set Your Goals",
      subtitle: "What would you like to achieve?"
    },
    {
      number: 6,
      title: "Complete Your Subscription",
      subtitle: "Secure payment powered by Stripe"
    }
  ]

  const subscriptionPlans = [
    {
      id: 'free',
      name: 'Basic',
      accountType: 'personal',
      price: 'Free',
      icon: <User className="h-6 w-6" />,
      description: 'Perfect for individuals getting started',
      features: [
        '1 Food Storage, 1 Refrigerator, 1 Freezer',
        'AI-powered barcode & receipt scanning',
        'Basic recipe suggestions',
        'Expiration tracking',
        'Waste reduction analytics'
      ],
      limitations: [
        'Limited storage locations',
        'Single user only'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      accountType: 'personal',
      price: '$9.99/mo',
      yearlyPrice: '$99.99/year',
      icon: <Sparkles className="h-6 w-6" />,
      description: 'Advanced features for power users',
      popular: true,
      features: [
        'Unlimited pantry items',
        'Unlimited AI scanner',
        '5 storage locations (Pantry, Fridge, Freezer, Counter, Cabinet)',
        'Advanced AI recipe generation',
        'Up to 3 household members',
        'Advanced analytics & insights',
        'Priority support',
        'All email notifications'
      ],
      limitations: []
    },
    {
      id: 'household_premium',
      name: 'Household Premium',
      accountType: 'household',
      price: '$14.99/mo',
      yearlyPrice: '$149.99/year',
      icon: <Users className="h-6 w-6" />,
      description: 'Perfect for families and shared households',
      features: [
        'Everything in Premium',
        'Unlimited household members',
        'Unlimited storage locations',
        'Shared household inventory',
        'Family meal planning',
        'Household analytics',
        'Role-based permissions'
      ],
      limitations: []
    }
  ]

  const goals = [
    { id: 'reduce-waste', label: 'Reduce Food Waste', icon: <Trash2 className="h-5 w-5" /> },
    { id: 'save-money', label: 'Save Money', icon: <DollarSign className="h-5 w-5" /> },
    { id: 'meal-planning', label: 'Better Meal Planning', icon: <ChefHat className="h-5 w-5" /> },
    { id: 'health', label: 'Eat Healthier', icon: <Heart className="h-5 w-5" /> }
  ]

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePlanSelect = (plan) => {
    setFormData(prev => ({
      ...prev,
      subscriptionTier: plan.id,
      accountType: plan.accountType
    }))
  }

  const handleGoalToggle = (goalId) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goalId)
        ? prev.goals.filter(id => id !== goalId)
        : [...prev.goals, goalId]
    }))
  }

  const handleNext = () => {
    try {
      console.log('handleNext called:', {
        currentStep,
        subscriptionTier: formData.subscriptionTier,
        user: user?.id,
        sessionLoaded
      })

      // Validation for step 2 (plan selection)
      if (currentStep === 2 && !formData.subscriptionTier) {
        alert('Please select a subscription plan to continue')
        return
      }

      // From step 2 (plan selection):
      // Free tier skips login (step 3) and goes to personalization (step 4)
      // Paid tiers: go to login (step 3) if not authenticated, otherwise skip to step 4
      if (currentStep === 2) {
        console.log('Step 2 navigation:', {
          tier: formData.subscriptionTier,
          userAuthenticated: !!user,
          userId: user?.id,
          oauthSessionLoading
        })

        if (formData.subscriptionTier === 'free') {
          console.log('Free tier selected, going to step 4')
          setCurrentStep(4)
        } else if (oauthSessionLoading) {
          // OAuth session still loading, prevent navigation
          alert('Please wait while we complete your sign-in...')
          return
        } else if (user) {
          // Already authenticated, skip login step
          console.log('User already authenticated, skipping to step 4')
          setCurrentStep(4)
        } else {
          // Need to authenticate first
          console.log('User not authenticated, going to step 3 for login')
          setCurrentStep(3)
        }
        return
      }

      // From step 3 (login/signup): require authentication before continuing
      if (currentStep === 3) {
        if (!user) {
          alert('Please sign in to continue')
          return
        }
        setCurrentStep(4)
        return
      }

      // Handle navigation from Step 5 (Goals)
      if (currentStep === 5) {
        // If free tier, skip payment and complete onboarding
        if (formData.subscriptionTier === 'free') {
          console.log('Free tier selected, calling handleSubmit')
          // Ensure session is available before calling handleSubmit
          const checkSessionAndSubmit = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
              handleSubmit()
            } else {
              console.log('No session available for handleSubmit, trying to refresh...')
              try {
                const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
                if (refreshedSession?.user) {
                  handleSubmit()
                } else {
                  alert('Session not available. Please try signing in again.')
                  navigate('/login')
                }
              } catch (error) {
                console.error('Session refresh failed:', error)
                alert('Session not available. Please try signing in again.')
                navigate('/login')
              }
            }
          }
          checkSessionAndSubmit()
          return
        }
        // If paid tier, go to payment step
        console.log('Paid tier selected, going to payment step')
        setCurrentStep(6)
        return
      }

      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1)
      }
    } catch (error) {
      console.error('Error in handleNext:', error)
    }
  }

  const handleBack = () => {
    // From step 4: go back to step 3 (login) if paid tier, or step 2 if free tier
    if (currentStep === 4) {
      if (formData.subscriptionTier === 'free') {
        setCurrentStep(2)
      } else {
        setCurrentStep(3)
      }
      return
    }

    // Go back from payment step to goals
    if (currentStep === 6) {
      setCurrentStep(5)
      return
    }

    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Handle payment - redirect to Stripe Checkout
  const handlePayment = async () => {
    if (!user) {
      alert('Please sign in to continue with payment')
      return
    }

    setLoading(true)
    try {
      // Map tier to price IDs (from Stripe)
      // TODO: UPDATE THESE PRICE IDs WHEN SWITCHING TO PRODUCTION
      const PRICE_IDS = {
        premium: {
          month: 'price_1SKiIoIqliEA9Uot0fgA3c8M', // $9.99/month (TEST MODE)
          year: 'price_1SIuGNIqliEA9UotGD93WZdc'   // $99.00/year (TEST MODE - should be $99.99 in prod)
        },
        household_premium: {
          month: 'price_1SIuGPIqliEA9UotfLjoddkj', // $14.99/month (TEST MODE)
          year: 'price_1SIuGSIqliEA9UotuHlR3qoH'   // $149.00/year (TEST MODE - should be $149.99 in prod)
        }
      }

      const priceId = PRICE_IDS[formData.subscriptionTier]?.[billingInterval]
      if (!priceId) {
        throw new Error('Invalid subscription plan selected')
      }

      console.log('Creating checkout session with:', {
        priceId,
        planTier: formData.subscriptionTier,
        billingInterval,
        userId: user.id
      })

      // Create checkout session
      const { sessionId, url } = await createCheckoutSession({
        priceId,
        planTier: formData.subscriptionTier,
        billingInterval
      })

      if (!url) {
        throw new Error('No checkout URL returned from server')
      }

      console.log('Checkout session created, redirecting to:', url)

      // Redirect to Stripe Checkout
      window.location.href = url
    } catch (error) {
      console.error('Payment error details:', {
        message: error.message,
        error: error,
        user: user?.id,
        tier: formData.subscriptionTier,
        interval: billingInterval
      })
      alert(`Failed to initiate payment: ${error.message || 'Unknown error'}. Please try again.`)
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
      // OAuth will redirect to /onboarding where user completes the flow
    } catch (err) {
      console.error('Google sign-in error:', err)
      alert(err.message || 'Google sign-in failed')
      setLoading(false)
    }
  }

  const handleAppleSignIn = async () => {
    setLoading(true)
    try {
      await signInWithApple()
      // OAuth will redirect to /onboarding where user completes the flow
    } catch (err) {
      console.error('Apple sign-in error:', err)
      alert(err.message || 'Apple sign-in failed')
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    console.log('handleSubmit called with:', {
      subscriptionTier: formData.subscriptionTier,
      user: user?.id,
      sessionLoaded,
      currentStep
    })

    if (!formData.subscriptionTier) {
      alert('Please select a subscription plan')
      return
    }

    setLoading(true)

    // First, try to get the current session synchronously
    console.log('Attempting to get current session...')
    const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()

    console.log('Current session check:', {
      sessionExists: !!currentSession,
      userId: currentSession?.user?.id,
      error: sessionError
    })

    if (currentSession?.user) {
      console.log('Found existing session, proceeding with user:', currentSession.user.id)
      const userId = currentSession.user.id
      await completeOnboarding(userId, currentSession.user)
      return
    }

    // If no session found, try to refresh it
    console.log('No session found, attempting to refresh...')
    try {
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()

      console.log('Session refresh result:', {
        sessionExists: !!refreshedSession,
        userId: refreshedSession?.user?.id,
        error: refreshError
      })

      if (refreshedSession?.user) {
        console.log('Session refreshed successfully, proceeding with user:', refreshedSession.user.id)
        const userId = refreshedSession.user.id
        await completeOnboarding(userId, refreshedSession.user)
        return
      }
    } catch (refreshError) {
      console.error('Session refresh failed:', refreshError)
    }

  }

  const completeOnboarding = async (userId, currentUser) => {
    console.log('Completing onboarding for user:', userId)

    try {
      // Save onboarding data to profiles table (for both OAuth and email users)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: formData.name || null,
          subscription_tier: formData.subscriptionTier || 'free',
          subscription_status: 'active',
          onboarding_completed: true,
          onboarding_data: {
            subscription_tier: formData.subscriptionTier,
            account_type: formData.accountType,
            household_name: formData.householdName || null,
            household_size: formData.householdSize || null,
            goals: formData.goals,
            notifications_enabled: formData.notifications,
            onboarded_at: new Date().toISOString()
          }
        })

      if (profileError) {
        console.error('Profile update error:', profileError)
        throw profileError // Block if profile creation fails
      }

      // Create default storage locations (Pantry, Refrigerator, Freezer)
      const { data: existingLocations } = await supabase
        .from('storage_locations')
        .select('id')
        .eq('user_id', userId)
        .limit(1)

      if (!existingLocations || existingLocations.length === 0) {
        const { error: storageError } = await supabase
          .from('storage_locations')
          .insert([
            { user_id: userId, name: 'Pantry', location_type: 'pantry' },
            { user_id: userId, name: 'Refrigerator', location_type: 'fridge' },
            { user_id: userId, name: 'Freezer', location_type: 'freezer' }
          ])

        if (storageError) {
          console.error('Storage location creation error:', storageError)
        } else {
          console.log('Created default storage locations for user')
        }
      }

      // If household account, create household entry
      if (formData.accountType === 'household' && formData.householdName) {
        const { data: household, error: householdError } = await supabase
          .from('households')
          .insert({
            name: formData.householdName,
            owner_id: userId,
            created_by: userId
          })
          .select()
          .single()

        if (householdError) {
          console.error('Household creation error:', householdError)
          // Don't block signup if household creation fails
        } else if (household) {
          // Add user as admin member to the household
          const { error: memberError } = await supabase
            .from('household_members')
            .insert({
              household_id: household.id,
              user_id: userId,
              role: 'admin'
            })

          if (memberError) {
            console.error('Household member creation error:', memberError)
            // Don't block signup if member creation fails
          }
        }
      }

      // Clear onboarding data from sessionStorage
      sessionStorage.removeItem('onboarding_step')
      sessionStorage.removeItem('onboarding_data')

      // Set a flag to bypass onboarding guard
      sessionStorage.setItem('skip_onboarding_check', 'true')

      console.log('Onboarding completed successfully, navigating to dashboard')

      // Navigate to dashboard with replace to prevent going back to onboarding
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Onboarding completion error:', error)

      // Provide user-friendly error messages
      let errorMessage = 'Failed to complete setup. Please try again.'

      if (error.message?.includes('email')) {
        errorMessage = 'Invalid email address. Please check your email and try again.'
      } else if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        errorMessage = 'This email is already registered. Please log in instead.'
      } else if (error.message?.includes('password')) {
        errorMessage = 'Password must be at least 6 characters long.'
      } else if (error.message) {
        errorMessage = error.message
      }

      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center">
            <div className="mb-4">
              <div className="flex justify-center mb-3">
                <img 
                  src={isDark ? "/MealSaverLogosDark.svg" : "/Meal.svg"} 
                  alt="Meal Saver Logo" 
                  className="h-24 w-auto object-contain"
                />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Welcome to Meal Saver!
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Your AI-powered food management system that helps reduce food waste and save money.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="p-6 text-center">
                {phoneScanAnimation ? (
                  <div className="w-16 h-16 mx-auto mb-4">
                    <Lottie
                      animationData={phoneScanAnimation}
                      loop={true}
                      autoplay={true}
                    />
                  </div>
                ) : (
                  <Scan className="h-8 w-8 text-green-500 mx-auto mb-4" />
                )}
                <h3 className="font-semibold mb-2">Smart Scanning</h3>
                <p className="text-sm text-muted-foreground">Scan barcodes and receipts with AI</p>
              </Card>
              <Card className="p-6 text-center">
                {recipeBookAnimation ? (
                  <div className="w-16 h-16 mx-auto mb-4">
                    <Lottie
                      animationData={recipeBookAnimation}
                      loop={true}
                      autoplay={true}
                    />
                  </div>
                ) : (
                  <ChefHat className="h-8 w-8 text-green-500 mx-auto mb-4" />
                )}
                <h3 className="font-semibold mb-2">Recipe Suggestions</h3>
                <p className="text-sm text-muted-foreground">Get recipes for your ingredients</p>
              </Card>
              <Card className="p-6 text-center">
                {dashboardAnimation ? (
                  <div className="w-32 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Lottie
                      animationData={dashboardAnimation}
                      loop={true}
                      autoplay={true}
                    />
                  </div>
                ) : (
                  <BarChart3 className="h-8 w-8 text-green-500 mx-auto mb-4" />
                )}
                <h3 className="font-semibold mb-2">Track Progress</h3>
                <p className="text-sm text-muted-foreground">See your waste reduction impact</p>
              </Card>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">Choose Your Plan</h2>
              <p className="text-muted-foreground">Select the plan that best fits your needs. You can upgrade anytime.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {subscriptionPlans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`relative cursor-pointer transition-all hover:shadow-lg ${
                    formData.subscriptionTier === plan.id
                      ? 'border-green-500 border-2 bg-green-50/50'
                      : 'border-border hover:border-green-300'
                  }`}
                  onClick={() => handlePlanSelect(plan)}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="text-center mb-4">
                      <div className={`inline-flex p-3 rounded-full mb-3 ${
                        formData.subscriptionTier === plan.id ? 'bg-green-100' : 'bg-muted'
                      }`}>
                        {plan.icon}
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                      <div className="text-2xl font-bold text-green-600 mb-1">{plan.price}</div>
                      {plan.yearlyPrice && (
                        <p className="text-sm text-muted-foreground mb-2">or {plan.yearlyPrice}</p>
                      )}
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>

                    <div className="space-y-3 mb-4">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-foreground">{feature}</span>
                        </div>
                      ))}
                      {plan.limitations.map((limitation, idx) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{limitation}</span>
                        </div>
                      ))}
                    </div>

                    {formData.subscriptionTier === plan.id && (
                      <div className="flex items-center justify-center space-x-2 text-green-600 font-medium">
                        <CheckCircle className="h-5 w-5" />
                        <span>Selected</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )

      case 3:
        // Login/Signup step for paid tiers
        const selectedPlanForAuth = subscriptionPlans.find(p => p.id === formData.subscriptionTier)
        return (
          <div className="max-w-md mx-auto">
            <div className="mb-8 text-center">
              <div className="flex justify-center mb-3">
                <img
                  src={isDark ? "/MealSaverLogosDark.svg" : "/Meal.svg"}
                  alt="Meal Saver Logo"
                  className="h-24 w-auto object-contain"
                />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Create Your Account</h2>
              <p className="text-muted-foreground">
                Sign in to continue with {selectedPlanForAuth?.name}
              </p>
            </div>

            {authLoading ? (
              // Loading auth state
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : user ? (
              // User is already signed in
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Signed in as</p>
                      <p className="text-sm text-green-700">{user.email}</p>
                    </div>
                  </div>
                </div>
                <p className="text-center text-muted-foreground text-sm">
                  Click "Next" to continue
                </p>
              </div>
            ) : (
              // User needs to sign in
              <div className="space-y-4">
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  variant="outline"
                  className="w-full h-12 flex items-center justify-center space-x-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </Button>

                <Button
                  onClick={handleAppleSignIn}
                  disabled={loading}
                  variant="outline"
                  className="w-full h-12 flex items-center justify-center space-x-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <span>Continue with Apple</span>
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-muted"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-background text-muted-foreground">Or</span>
                  </div>
                </div>

                <p className="text-center text-muted-foreground text-sm">
                  Already have an account?{' '}
                  <button
                    onClick={() => navigate('/login')}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            )}
          </div>
        )

      case 4:
        return formData.accountType === 'household' ? (
          // Household Setup
          <div className="max-w-md mx-auto">
            <div className="mb-8 text-center">
              <div className="flex justify-center mb-3">
                <img
                  src={isDark ? "/MealSaverLogosDark.svg" : "/Meal.svg"}
                  alt="Meal Saver Logo"
                  className="h-24 w-auto object-contain"
                />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Set Up Your Household</h2>
              <p className="text-muted-foreground">Create your shared household space</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="householdName">Household Name</Label>
                <Input
                  id="householdName"
                  type="text"
                  value={formData.householdName}
                  onChange={(e) => handleInputChange('householdName', e.target.value)}
                  placeholder="e.g., The Smith Family"
                  className="!bg-white !text-gray-900 placeholder:text-gray-500"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This will be visible to household members you invite
                </p>
              </div>

              <div>
                <Label htmlFor="householdSize">Household Size</Label>
                <select
                  id="householdSize"
                  value={formData.householdSize}
                  onChange={(e) => handleInputChange('householdSize', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 !bg-white !text-gray-900"
                >
                  <option value="">Select household size</option>
                  <option value="2">2 people</option>
                  <option value="3">3 people</option>
                  <option value="4">4 people</option>
                  <option value="5+">5+ people</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> You can invite household members after setup from your profile settings.
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="notifications"
                  checked={formData.notifications}
                  onCheckedChange={(checked) => handleInputChange('notifications', checked)}
                />
                <Label htmlFor="notifications">Enable notifications for expiring items</Label>
              </div>
            </div>
          </div>
        ) : (
          // Personal Setup
          <div className="max-w-md mx-auto">
            <div className="mb-8 text-center">
              <div className="flex justify-center mb-3">
                <img
                  src={isDark ? "/MealSaverLogosDark.svg" : "/Meal.svg"}
                  alt="Meal Saver Logo"
                  className="h-24 w-auto object-contain"
                />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Personalize Your Experience</h2>
              <p className="text-muted-foreground">Tell us a bit about yourself</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="householdSize">Household Size (Optional)</Label>
                <select
                  id="householdSize"
                  value={formData.householdSize}
                  onChange={(e) => handleInputChange('householdSize', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 !bg-white !text-gray-900"
                >
                  <option value="">Select household size</option>
                  <option value="1">Just me</option>
                  <option value="2">2 people</option>
                  <option value="3">3 people</option>
                  <option value="4">4 people</option>
                  <option value="5+">5+ people</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  This helps us provide better portion recommendations
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="notifications"
                  checked={formData.notifications}
                  onCheckedChange={(checked) => handleInputChange('notifications', checked)}
                />
                <Label htmlFor="notifications">Enable notifications for expiring items</Label>
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="max-w-2xl mx-auto">
            <div className="mb-8 text-center">
              <div className="flex justify-center mb-3">
                <img
                  src={isDark ? "/MealSaverLogosDark.svg" : "/Meal.svg"}
                  alt="Meal Saver Logo"
                  className="h-24 w-auto object-contain"
                />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Set Your Goals</h2>
              <p className="text-muted-foreground">What would you like to achieve? (Select all that apply)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((goal) => (
                <Card
                  key={goal.id}
                  className={`p-4 cursor-pointer transition-all ${
                    formData.goals.includes(goal.id)
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleGoalToggle(goal.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      formData.goals.includes(goal.id)
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {goal.icon}
                    </div>
                    <div>
                      <h3 className="font-medium">{goal.label}</h3>
                    </div>
                    {formData.goals.includes(goal.id) && (
                      <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )

      case 6:
        // Payment step - only shown for premium tiers
        const selectedPlan = subscriptionPlans.find(p => p.id === formData.subscriptionTier)
        const monthlyPrice = selectedPlan?.id === 'premium' ? '$9.99' : '$14.99'
        const yearlyPrice = selectedPlan?.id === 'premium' ? '$99.99' : '$149.99'
        const monthlySavings = selectedPlan?.id === 'premium' ? '$19.89' : '$29.89'

        return (
          <div className="max-w-2xl mx-auto">
            <div className="mb-8 text-center">
              <div className="flex justify-center mb-3">
                <img
                  src={isDark ? "/MealSaverLogosDark.svg" : "/Meal.svg"}
                  alt="Meal Saver Logo"
                  className="h-24 w-auto object-contain"
                />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Complete Your Subscription</h2>
              <p className="text-muted-foreground">Choose your billing cycle and proceed to secure payment</p>
            </div>

            <Card className="p-6 mb-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Selected Plan: {selectedPlan?.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedPlan?.description}</p>
              </div>

              {/* Billing Interval Toggle */}
              <div className="mb-6">
                <Label className="text-sm font-medium mb-3 block">Billing Cycle</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Card
                    className={`p-4 cursor-pointer transition-all ${
                      billingInterval === 'month'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setBillingInterval('month')}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">Monthly</p>
                        <p className="text-2xl font-bold text-foreground mt-1">{monthlyPrice}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Billed monthly</p>
                      </div>
                      {billingInterval === 'month' && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </Card>

                  <Card
                    className={`p-4 cursor-pointer transition-all relative ${
                      billingInterval === 'year'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setBillingInterval('year')}
                  >
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                      Save {monthlySavings}
                    </div>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">Yearly</p>
                        <p className="text-2xl font-bold text-foreground mt-1">{yearlyPrice}<span className="text-sm font-normal text-muted-foreground">/year</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Billed annually</p>
                      </div>
                      {billingInterval === 'year' && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </Card>
                </div>
              </div>

              {/* Features Summary */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">What's included:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {selectedPlan?.features?.slice(0, 4).map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* Payment Button */}
            <Button
              onClick={handlePayment}
              disabled={loading}
              className="w-full h-12 text-lg"
            >
              {loading ? 'Processing...' : 'Proceed to Payment'}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Secure payment powered by Stripe. You can cancel anytime.
            </p>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Email Verification Modal */}
      {showEmailVerification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="bg-green-100 rounded-full p-3">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Check Your Email
                </h2>
                <p className="text-muted-foreground mb-6">
                  We've sent a verification link to <strong>{formData.email}</strong>.
                  Please check your inbox and click the link to verify your email address before logging in.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm text-blue-900">
                    <strong>Tip:</strong> If you don't see the email, check your spam folder or wait a few minutes for it to arrive.
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/login')}
            className="text-sm"
          >
            Already have an account? Log in
          </Button>
          <div className="text-sm text-muted-foreground">
            Step {currentStep} of {steps.length}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 mb-8">
        <div className="max-w-4xl mx-auto">
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              {renderStep()}

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="flex items-center"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}

                {currentStep < 6 ? (
                  <Button
                    onClick={handleNext}
                    className={`bg-primary hover:bg-primary/90 flex items-center ${currentStep === 1 ? 'ml-auto' : ''}`}
                  >
                    {currentStep === 5 && formData.subscriptionTier === 'free'
                      ? 'Get Started'
                      : 'Next'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default OnboardingPage
