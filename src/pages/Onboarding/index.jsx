import React, { useState } from 'react'
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
import { supabase } from '../../lib/supabaseClient'

const OnboardingPage = () => {
  const { user, signUp, signInWithGoogle, signInWithApple } = useAuth()
  const { isDark } = useTheme()
  const navigate = useNavigate()

  // If user is already authenticated (OAuth), skip to step 2 (plan selection)
  const isOAuthUser = !!user
  const [currentStep, setCurrentStep] = useState(isOAuthUser ? 2 : 1)

  const [formData, setFormData] = useState({
    name: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    password: '',
    accountType: '', // 'personal' or 'household'
    subscriptionTier: '', // 'free', 'premium', 'household_premium'
    householdName: '',
    householdSize: '',
    goals: [],
    notifications: true
  })
  const [loading, setLoading] = useState(false)
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [recipeBookAnimation, setRecipeBookAnimation] = useState(null)
  const [phoneScanAnimation, setPhoneScanAnimation] = useState(null)
  const [dashboardAnimation, setDashboardAnimation] = useState(null)


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
      subtitle: "Set up your profile to get started"
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
      icon: <Sparkles className="h-6 w-6" />,
      description: 'Advanced features for power users',
      popular: true,
      features: [
        '2 of each: Food Storage, Refrigerator, Freezer',
        'Counter & Cabinet storage',
        'Advanced AI recipe generation',
        'Priority support',
        'Advanced analytics & insights',
        'Custom categories'
      ],
      limitations: []
    },
    {
      id: 'household_premium',
      name: 'Household Premium',
      accountType: 'household',
      price: '$14.99/mo',
      icon: <Users className="h-6 w-6" />,
      description: 'Perfect for families and shared households',
      features: [
        'Unlimited storage locations',
        'Multi-user access',
        'Shared household inventory',
        'Family meal planning',
        'All Premium features',
        'Household analytics'
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
    // Validation for step 2 (plan selection)
    if (currentStep === 2 && !formData.subscriptionTier) {
      alert('Please select a subscription plan to continue')
      return
    }

    // Validation for step 3 (account creation) - skip for OAuth users
    if (currentStep === 3 && !isOAuthUser) {
      if (!formData.email || !formData.password) {
        alert('Please fill in email and password')
        return
      }
    }

    // For OAuth users, skip step 3 (account creation) since they're already authenticated
    if (currentStep === 2 && isOAuthUser) {
      setCurrentStep(4) // Skip to step 4
      return
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    // For OAuth users on step 4, go back to step 2 (skip step 3)
    if (currentStep === 4 && isOAuthUser) {
      setCurrentStep(2)
      return
    }

    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
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
    if (!formData.subscriptionTier) {
      alert('Please select a subscription plan')
      return
    }

    setLoading(true)
    try {
      let userId = user?.id

      // If not OAuth user (no user yet), create account with email/password
      if (!userId) {
        // Validate required fields for email signup
        if (!formData.email || !formData.password) {
          alert('Please fill in all required fields')
          setLoading(false)
          return
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email)) {
          alert('Please enter a valid email address')
          setLoading(false)
          return
        }

        // Validate password length
        if (formData.password.length < 6) {
          alert('Password must be at least 6 characters long')
          setLoading(false)
          return
        }

        // Create auth user
        const authData = await signUp(formData.email, formData.password)

        userId = authData?.user?.id

        if (!userId) {
          throw new Error('Failed to get user ID after signup')
        }

        // Check if email verification is required
        const needsVerification = authData?.needsEmailVerification || !authData?.session

        if (needsVerification) {
          // Email verification required - show modal and stop here
          setShowEmailVerification(true)
          setLoading(false)
          return
        }
      }

      // Save onboarding data to profiles table (for both OAuth and email users)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.name || null,
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
        .eq('id', userId)

      if (profileError) {
        console.error('Profile update error:', profileError)
        // Don't block signup if profile update fails
      }

      // If household account, create household entry
      if (formData.accountType === 'household' && formData.householdName) {
        const { error: householdError } = await supabase
          .from('households')
          .insert({
            name: formData.householdName,
            owner_id: userId,
            created_by: userId
          })

        if (householdError) {
          console.error('Household creation error:', householdError)
          // Don't block signup if household creation fails
        }
      }

      // Navigate to dashboard
      navigate('/dashboard')
    } catch (error) {
      console.error('Signup error:', error)

      // Provide user-friendly error messages
      let errorMessage = 'Failed to create account. Please try again.'

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
                      <div className="text-2xl font-bold text-green-600 mb-2">{plan.price}</div>
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
              <p className="text-muted-foreground">Let's set up your profile</p>
            </div>

            <div className="space-y-4">
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

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or sign up with email</span>
                </div>
              </div>

              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  className="!bg-white !text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email"
                  className="!bg-white !text-gray-900 placeholder:text-gray-500"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Create a secure password"
                  className="!bg-white !text-gray-900 placeholder:text-gray-500"
                  required
                />
              </div>
            </div>
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
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="flex items-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                {currentStep < steps.length ? (
                  <Button
                    onClick={handleNext}
                    className="bg-primary hover:bg-primary/90 flex items-center"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || (!isOAuthUser && (!formData.email || !formData.password))}
                    className="bg-primary hover:bg-primary/90 flex items-center"
                  >
                    {loading ? 'Completing Setup...' : 'Get Started'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default OnboardingPage
