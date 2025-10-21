import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { 
  ChefHat, 
  Scan, 
  BarChart3, 
  Users, 
  Shield, 
  Zap,
  CheckCircle,
  ArrowRight,
  Star,
  Sparkles
} from 'lucide-react'

const SplashPage = () => {
  const features = [
    {
      icon: <Scan className="h-8 w-8 text-blue-500" />,
      title: "AI-Powered Scanner",
      description: "Scan barcodes and receipts to automatically add items to your pantry with AI recognition."
    },
    {
      icon: <ChefHat className="h-8 w-8 text-green-500" />,
      title: "Smart Recipe Generation",
      description: "Get personalized recipes based on your expiring ingredients to reduce food waste."
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-purple-500" />,
      title: "Analytics & Insights",
      description: "Track your consumption patterns, waste reduction, and savings with detailed analytics."
    },
    {
      icon: <Users className="h-8 w-8 text-orange-500" />,
      title: "Household Management",
      description: "Share your pantry with family members and manage household food inventory together."
    }
  ]

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Busy Mom",
      content: "Meal Saver has reduced our food waste by 60% and saved us $200/month on groceries!",
      rating: 5
    },
    {
      name: "Mike Chen",
      role: "College Student",
      content: "The AI scanner is incredible - I can add items in seconds and never forget what I have.",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "Health Coach",
      content: "The recipe suggestions based on expiring ingredients are a game-changer for meal planning.",
      rating: 5
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img 
              src="/Meal.svg" 
              alt="Meal Saver Logo" 
              className="h-8 w-auto"
            />
            <span className="text-2xl font-bold text-primary">
              Meal Saver
            </span>
          </div>
          <div className="flex items-center space-x-4">
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
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4 mr-2" />
            AI-Powered Food Management
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-primary">
              Never Waste Food
            </span>
            <br />
            <span className="text-foreground">Again</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Transform your kitchen with AI-powered pantry management. Scan, track, and get smart recipe suggestions 
            to reduce waste and save money.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/onboarding">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-4">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4">
              Watch Demo
            </Button>
          </div>

          {/* Hero Image/Animation Placeholder */}
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-blue-100 to-green-100 rounded-2xl p-8 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <Scan className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Scan Items</h3>
                    <p className="text-sm text-gray-600">AI recognizes products instantly</p>
                  </CardContent>
                </Card>
                <Card className="bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <ChefHat className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Get Recipes</h3>
                    <p className="text-sm text-gray-600">Smart suggestions for your ingredients</p>
                  </CardContent>
                </Card>
                <Card className="bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <BarChart3 className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Track Progress</h3>
                    <p className="text-sm text-gray-600">See your waste reduction impact</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Your Pantry
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our AI-powered platform helps you track inventory, reduce waste, and discover new recipes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-6 py-20 bg-gradient-to-r from-blue-600 to-green-600">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-12">
            Join Thousands of Happy Users
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">50K+</div>
              <div className="text-blue-100">Items Scanned</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">$2M+</div>
              <div className="text-blue-100">Money Saved</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">75%</div>
              <div className="text-blue-100">Waste Reduction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-gray-600">
              Real stories from real users who've transformed their kitchens
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <CardContent className="p-0">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-4">"{testimonial.content}"</p>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Kitchen?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of users who are already saving money and reducing waste.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/onboarding">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-lg px-8 py-4">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 py-4">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                  <ChefHat className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">Meal Saver</span>
              </div>
              <p className="text-gray-400">
                AI-powered food management to reduce waste and save money.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/onboarding" className="hover:text-white">Get Started</Link></li>
                <li><Link to="/login" className="hover:text-white">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/help" className="hover:text-white">Help Center</Link></li>
                <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
                <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/about" className="hover:text-white">About</Link></li>
                <li><Link to="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link to="/careers" className="hover:text-white">Careers</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Meal Saver. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default SplashPage