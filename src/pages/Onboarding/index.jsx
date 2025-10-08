import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  DollarSign
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const OnboardingPage = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    householdSize: '',
    goals: [],
    notifications: true,
    aiFeatures: true
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const steps = [
    {
      number: 1,
      title: "Welcome to Meal Saver",
      subtitle: "Let's get you started with your smart pantry"
    },
    {
      number: 2,
      title: "Create Your Account",
      subtitle: "Set up your profile to get started"
    },
    {
      number: 3,
      title: "Tell Us About Your Household",
      subtitle: "Help us personalize your experience"
    },
    {
      number: 4,
      title: "Set Your Goals",
      subtitle: "What would you like to achieve?"
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

  const handleGoalToggle = (goalId) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goalId) 
        ? prev.goals.filter(id => id !== goalId)
        : [...prev.goals, goalId]
    }))
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.email || !formData.password) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      await signUp(formData.email, formData.password)
      // Navigate to dashboard after successful signup
      navigate('/dashboard')
    } catch (error) {
      console.error('Signup error:', error)
      alert(error.message || 'Failed to create account. Please try again.')
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
                  src="/Meal.svg" 
                  alt="Meal Saver Logo" 
                  className="h-24 w-auto object-contain"
                />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Welcome to Meal Saver!
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Your AI-powered pantry management system that helps reduce food waste and save money.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="p-6 text-center">
                <Scan className="h-8 w-8 text-green-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Smart Scanning</h3>
                <p className="text-sm text-muted-foreground">Scan barcodes and receipts with AI</p>
              </Card>
              <Card className="p-6 text-center">
                <ChefHat className="h-8 w-8 text-green-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Recipe Suggestions</h3>
                <p className="text-sm text-muted-foreground">Get recipes for your ingredients</p>
              </Card>
              <Card className="p-6 text-center">
                <BarChart3 className="h-8 w-8 text-green-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Track Progress</h3>
                <p className="text-sm text-muted-foreground">See your waste reduction impact</p>
              </Card>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="max-w-md mx-auto">
            <div className="mb-8 text-center">
              <div className="flex justify-center mb-3">
                <img 
                  src="/Meal.svg" 
                  alt="Meal Saver Logo" 
                  className="h-24 w-auto object-contain"
                />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Create Your Account</h2>
              <p className="text-muted-foreground">Let's set up your profile</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  className="bg-white dark:bg-white"
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
                  className="bg-white dark:bg-white"
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
                  className="bg-white dark:bg-white"
                />
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="max-w-md mx-auto">
            <div className="mb-8 text-center">
              <div className="flex justify-center mb-3">
                <img 
                  src="/Meal.svg" 
                  alt="Meal Saver Logo" 
                  className="h-24 w-auto object-contain"
                />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Your Household</h2>
              <p className="text-muted-foreground">Help us personalize your experience</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="householdSize">Household Size</Label>
                <select
                  id="householdSize"
                  value={formData.householdSize}
                  onChange={(e) => handleInputChange('householdSize', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select household size</option>
                  <option value="1">Just me</option>
                  <option value="2">2 people</option>
                  <option value="3">3 people</option>
                  <option value="4">4 people</option>
                  <option value="5+">5+ people</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notifications"
                    checked={formData.notifications}
                    onCheckedChange={(checked) => handleInputChange('notifications', checked)}
                  />
                  <Label htmlFor="notifications">Enable notifications for expiring items</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="aiFeatures"
                    checked={formData.aiFeatures}
                    onCheckedChange={(checked) => handleInputChange('aiFeatures', checked)}
                  />
                  <Label htmlFor="aiFeatures">Enable AI-powered features</Label>
                </div>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="max-w-2xl mx-auto">
            <div className="mb-8 text-center">
              <div className="flex justify-center mb-3">
                <img 
                  src="/Meal.svg" 
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
                    disabled={loading || !formData.email || !formData.password}
                    className="bg-primary hover:bg-primary/90 flex items-center"
                  >
                    {loading ? 'Creating Account...' : 'Get Started'}
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
