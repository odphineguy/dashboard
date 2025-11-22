import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { CheckCircle, X, Star, Zap, Users, Crown, ArrowRight } from 'lucide-react'

const PricingPage = () => {
  const [billingCycle, setBillingCycle] = useState('monthly') // 'monthly' or 'yearly'

  const plans = [
    {
      name: 'Basic',
      description: 'Perfect for individuals getting started',
      price: {
        monthly: 0,
        yearly: 0
      },
      features: [
        'Up to 50 pantry items',
        'Basic AI scanner (10 scans/month)',
        'Recipe suggestions',
        'Basic analytics',
        'Email support',
        'Mobile app access'
      ],
      limitations: [
        'Limited AI features',
        'No household sharing',
        'Basic reporting only'
      ],
      popular: false,
      cta: 'Get Started',
      icon: <Zap className="h-6 w-6" />
    },
    {
      name: 'Premium',
      description: 'For serious food waste reduction',
      price: {
        monthly: 9.99,
        yearly: 99.99
      },
      features: [
        'Unlimited pantry items',
        'Unlimited AI scanner',
        'Advanced recipe generation',
        'Detailed analytics & insights',
        'Expiry notifications',
        'Priority support',
        'Export data',
        'Advanced meal planning',
        'Up to 3 household members'
      ],
      limitations: [],
      popular: true,
      cta: 'Start Premium Trial',
      icon: <Star className="h-6 w-6" />
    },
    {
      name: 'Household Premium',
      description: 'For families and shared households',
      price: {
        monthly: 14.99,
        yearly: 149.99
      },
      features: [
        'Everything in Premium',
        'Up to 6 household members',
        'Shared pantry management',
        'Family meal planning',
        'Household analytics',
        'Role-based permissions',
        'Bulk operations',
        'Advanced storage locations',
        'Family notifications',
        'Priority support'
      ],
      limitations: [],
      popular: false,
      cta: 'Start Household Trial',
      icon: <Users className="h-6 w-6" />
    }
  ]

  const faqs = [
    {
      question: "Can I change plans anytime?",
      answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately and we'll prorate any billing differences."
    },
    {
      question: "What happens to my data if I cancel?",
      answer: "Your data is always yours. You can export all your pantry data before canceling, and we'll keep it for 30 days in case you want to reactivate."
    },
    {
      question: "Do you offer student discounts?",
      answer: "Yes! Students with a valid .edu email address get 50% off Premium and Household plans. Contact support with your student ID for verification."
    },
    {
      question: "Is there a free trial?",
      answer: "Yes! All paid plans come with a 14-day free trial. No credit card required to start, and you can cancel anytime during the trial."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards, PayPal, and bank transfers for annual plans. All payments are processed securely through Stripe."
    },
    {
      question: "Can I use the AI scanner offline?",
      answer: "The AI scanner requires an internet connection to process images and identify products. However, you can add items manually and sync when you're back online."
    }
  ]

  const getPrice = (plan) => {
    return billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly
  }

  const getSavings = (plan) => {
    if (billingCycle === 'yearly' && plan.price.yearly > 0) {
      const monthlyTotal = plan.price.monthly * 12
      const yearlyPrice = plan.price.yearly
      return Math.round((monthlyTotal - yearlyPrice) * 100) / 100
    }
    return 0
  }

  return (
    <div className="bg-background">
      {/* Navigation */}
      <nav className="px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img 
              src="/Meal.svg" 
              alt="Meal Saver Logo" 
              className="h-14 w-auto"
            />
          </Link>
          <div className="flex items-center space-x-4">
            <Link to="/">
              <Button variant="ghost">Home</Button>
            </Link>
            <Link to="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link to="/onboarding">
              <Button className="bg-primary hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-primary">
              Choose Your Plan
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Start reducing food waste today. All plans include our core features with different levels of AI power and collaboration tools.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-12">
            <div className="bg-gray-100 rounded-lg p-1 flex">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-md transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-md transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  Save 17%
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card 
                key={plan.name}
                className={`relative ${
                  plan.popular 
                    ? 'border-primary shadow-xl scale-105' 
                    : 'border-border'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center">
                      <Crown className="h-4 w-4 mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className="flex items-center justify-center mb-4">
                    <div className={`p-3 rounded-full ${
                      plan.popular 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {plan.icon}
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <p className="text-muted-foreground">{plan.description}</p>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-foreground">
                      ${getPrice(plan)}
                      {getPrice(plan) > 0 && (
                        <span className="text-lg text-muted-foreground">
                          /{billingCycle === 'yearly' ? 'year' : 'month'}
                        </span>
                      )}
                    </div>
                    {getPrice(plan) === 0 && (
                      <div className="text-sm text-muted-foreground">No cost</div>
                    )}
                    {getSavings(plan) > 0 && (
                      <div className="text-sm text-primary font-medium">
                        Save ${getSavings(plan)}/year
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </div>
                    ))}
                    {plan.limitations.map((limitation, limitationIndex) => (
                      <div key={limitationIndex} className="flex items-start">
                        <X className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{limitation}</span>
                      </div>
                    ))}
                  </div>

                  <Link to="/onboarding">
                    <Button
                      className={`w-full ${
                        plan.popular
                          ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                          : 'bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900'
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Compare All Features
            </h2>
            <p className="text-xl text-gray-600">
              See exactly what's included in each plan
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Features</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-900">Basic</th>
                  <th className="text-center py-4 px-6 font-semibold text-blue-600">Premium</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-900">Household</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Pantry Items', basic: '50', premium: 'Unlimited', household: 'Unlimited' },
                  { feature: 'AI Scanner Scans', basic: '10/month', premium: 'Unlimited', household: 'Unlimited' },
                  { feature: 'Recipe Suggestions', basic: 'Basic', premium: 'Advanced AI', household: 'Advanced AI' },
                  { feature: 'Analytics', basic: 'Basic', premium: 'Detailed', household: 'Household Analytics' },
                  { feature: 'Household Members', basic: '1', premium: '3', household: 'Up to 6' },
                  { feature: 'Storage Locations', basic: 'Basic', premium: 'Advanced', household: 'Advanced' },
                  { feature: 'Support', basic: 'Email', premium: 'Priority', household: 'Priority' },
                  { feature: 'Data Export', basic: 'No', premium: 'Yes', household: 'Yes' }
                ].map((row, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-4 px-6 font-medium text-gray-900">{row.feature}</td>
                    <td className="py-4 px-6 text-center text-gray-600">{row.basic}</td>
                    <td className="py-4 px-6 text-center text-blue-600 font-medium">{row.premium}</td>
                    <td className="py-4 px-6 text-center text-gray-600">{row.household}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </div>
  )
}

export default PricingPage
