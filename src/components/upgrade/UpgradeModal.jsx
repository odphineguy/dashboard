import React, { useState } from 'react'
import { X, Check, Sparkles, Users } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { useSubscription } from '../../contexts/SubscriptionContext'

const UpgradeModal = ({ isOpen, onClose, currentTier = 'basic' }) => {
  const { upgradeSubscription } = useSubscription()
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)

  if (!isOpen) return null

  const plans = [
    {
      id: 'premium',
      name: 'Premium',
      price: '$9.99/mo',
      yearlyPrice: '$99.99/year',
      icon: <Sparkles className="h-6 w-6" />,
      description: 'Perfect for power users',
      features: [
        'Unlimited pantry items',
        'Unlimited AI scanner',
        'Advanced recipe generation',
        '5 storage locations',
        'Up to 3 household members',
        'Advanced analytics',
        'Priority support',
      ],
    },
    {
      id: 'household_premium',
      name: 'Household Premium',
      price: '$9.99/mo',
      yearlyPrice: '$99.99/year',
      icon: <Users className="h-6 w-6" />,
      description: 'Best for families',
      popular: true,
      features: [
        'Everything in Premium',
        'Unlimited household members',
        'Unlimited storage locations',
        'Shared inventory management',
        'Family meal planning',
        'Household analytics',
      ],
    },
  ]

  const handleUpgrade = async (tier, interval) => {
    try {
      setLoading(true)
      const { url } = await upgradeSubscription({ tier, billingInterval: interval })
      window.location.href = url
    } catch (error) {
      console.error('Error upgrading:', error)
      alert('Failed to start upgrade process. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Upgrade Your Plan</h2>
              <p className="text-muted-foreground mt-1">
                Unlock premium features and get the most out of Meal Saver
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative cursor-pointer transition-all hover:shadow-lg ${
                  selectedPlan === plan.id
                    ? 'border-green-500 border-2'
                    : 'border-border'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <div className="inline-flex p-3 rounded-full bg-green-100 mb-3">
                      {plan.icon}
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
                    <div className="text-2xl font-bold text-green-600">{plan.price}</div>
                    <div className="text-sm text-muted-foreground">{plan.yearlyPrice}</div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {selectedPlan === plan.id && (
                    <div className="space-y-2">
                      <Button
                        onClick={() => handleUpgrade(plan.id, 'month')}
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {loading ? 'Processing...' : `Upgrade Monthly - ${plan.price}`}
                      </Button>
                      <Button
                        onClick={() => handleUpgrade(plan.id, 'year')}
                        disabled={loading}
                        variant="outline"
                        className="w-full"
                      >
                        {loading ? 'Processing...' : `Upgrade Yearly - ${plan.yearlyPrice}`}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Cancel Button */}
          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={onClose}>
              Maybe Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default UpgradeModal
