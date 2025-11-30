import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useHousehold } from '../../contexts/HouseholdContext'
import { useSupabase } from '../../hooks/useSupabase'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { ChefHat, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import ViewSwitcher from '../../components/ViewSwitcher'

const Recipes = () => {
  const { user } = useAuth()
  const { currentHousehold, isPersonal } = useHousehold()
  const supabase = useSupabase()
  const [expiringItems, setExpiringItems] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadExpiringItems()
  }, [user?.id, isPersonal, currentHousehold?.id])

  const loadExpiringItems = async () => {
    if (!user?.id) return

    try {
      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      let query = supabase
        .from('pantry_items')
        .select('*')
        .eq('user_id', user.id)

      // Filter by household mode
      if (isPersonal) {
        query = query.is('household_id', null)
      } else if (currentHousehold?.id) {
        query = query.eq('household_id', currentHousehold.id)
      }

      query = query
        .not('expiry_date', 'is', null)
        .lte('expiry_date', sevenDaysFromNow.toISOString().split('T')[0])
        .gte('expiry_date', today.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true })

      const { data, error } = await query

      if (error) throw error
      setExpiringItems(data || [])
    } catch (error) {
      console.error('Error loading expiring items:', error)
    }
  }

  const generateRecipes = async () => {
    if (expiringItems.length === 0) {
      toast.error('No expiring items found. Add items with expiry dates to get recipe suggestions!')
      return
    }

    const apiKey = import.meta.env.VITE_GOOGLE_GENAI_API_KEY
    if (!apiKey) {
      toast.error('Google AI API key not configured')
      return
    }

    try {
      setGenerating(true)
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

      const ingredients = expiringItems.map(item => item.name).join(', ')

      const prompt = `Generate 6 creative recipes using these expiring ingredients: ${ingredients}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "recipes": [
    {
      "title": "Recipe name",
      "description": "Brief description",
      "cookTime": 30,
      "servings": 4,
      "difficulty": "Easy",
      "ingredients": ["ingredient 1", "ingredient 2"],
      "instructions": ["step 1", "step 2"],
      "usedIngredients": ["ingredient from expiring list"]
    }
  ]
}`

      const result = await model.generateContent(prompt)
      const text = result.response.text()
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Invalid response format')
      }

      const data = JSON.parse(jsonMatch[0])
      setRecipes(data.recipes || [])
      toast.success(`Generated ${data.recipes?.length || 0} recipes!`)
    } catch (error) {
      console.error('Error generating recipes:', error)
      
      // Check for quota/rate limit errors
      if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('Quota exceeded')) {
        toast.error('API Quota Exceeded', {
          description: 'You\'ve reached the free tier limit. Please wait a few minutes and try again, or check your Google AI API billing settings.',
          duration: 6000
        })
      } else if (error.message?.includes('API key') || error.message?.includes('401') || error.message?.includes('403')) {
        toast.error('API Key Error', {
          description: 'Invalid or missing Google AI API key. Please check your configuration.',
          duration: 5000
        })
      } else {
        toast.error('Failed to generate recipes', {
          description: error.message || 'Please try again in a few moments.',
          duration: 5000
        })
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ChefHat className="h-7 w-7" />
            Recipe Suggestions
          </h1>
          <p className="text-muted-foreground mt-1">AI-powered recipes using your expiring ingredients</p>
        </div>
        <div className="flex items-center gap-3">
          <ViewSwitcher />
          <Button onClick={generateRecipes} disabled={generating || expiringItems.length === 0}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Recipes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Expiring Items Info */}
      {expiringItems.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-2">
            Ingredients expiring in the next 7 days ({expiringItems.length} items):
          </h3>
          <div className="flex flex-wrap gap-2">
            {expiringItems.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200"
              >
                {item.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recipes */}
      {recipes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {expiringItems.length === 0 ? 'No Expiring Ingredients' : 'Ready to Cook?'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {expiringItems.length === 0
                ? 'Add items with expiry dates to your inventory to get personalized recipe suggestions.'
                : 'Click "Generate Recipes" to get AI-powered suggestions using your expiring ingredients.'}
            </p>
            {expiringItems.length === 0 && (
              <Button variant="outline" onClick={() => window.location.href = '/inventory'}>
                Go to Inventory
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{recipe.title}</CardTitle>
                <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                  <span>{recipe.cookTime} min</span>
                  <span>{recipe.servings} servings</span>
                  <span>{recipe.difficulty}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{recipe.description}</p>
                
                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-2">Ingredients:</h4>
                  <ul className="text-sm space-y-1">
                    {recipe.ingredients?.map((ing, i) => (
                      <li key={i} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{ing}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Instructions:</h4>
                  <ol className="text-sm space-y-2">
                    {recipe.instructions?.map((step, i) => (
                      <li key={i} className="flex items-start">
                        <span className="mr-2 font-semibold">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default Recipes
