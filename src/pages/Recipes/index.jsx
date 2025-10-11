import React, { useState, useEffect } from 'react'
import { ChefHat, Loader2, RefreshCw, Clock, Users, Bookmark } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { useAuth } from '../../contexts/AuthContext'
import { useHousehold } from '../../contexts/HouseholdContext'
import { supabase } from '../../lib/supabaseClient'
import RecipeCard from './components/RecipeCard'
import { useBadgeAwarder } from '../../hooks/useBadgeAwarder'
import BadgeCelebration from '../../components/BadgeCelebration'
import ViewSwitcher from '../../components/ViewSwitcher'

const Recipes = () => {
  const [recipes, setRecipes] = useState([])
  const [savedRecipes, setSavedRecipes] = useState([])
  const [expiringIngredients, setExpiringIngredients] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingSaved, setLoadingSaved] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()
  const { currentHousehold, isPersonal} = useHousehold()
  const { checkBadges, celebrationBadge, closeCelebration } = useBadgeAwarder(user?.id)

  // Load expiring ingredients
  useEffect(() => {
    const loadExpiringIngredients = async () => {
      if (!user?.id) return

      try {
        const threeDaysFromNow = new Date()
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 7) // Look ahead 7 days
        const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0]

        let query = supabase
          .from('pantry_items')
          .select('name, expiry_date, category')
          .eq('user_id', user.id)

        if (isPersonal) {
          query = query.is('household_id', null)
        } else if (currentHousehold?.id) {
          query = query.eq('household_id', currentHousehold.id)
        }

        query = query
          .not('expiry_date', 'is', null)
          .lte('expiry_date', threeDaysStr)
          .order('expiry_date', { ascending: true })

        const { data, error } = await query

        if (error) throw error

        const ingredients = (data || []).map(item => ({
          name: item.name,
          expiry_date: item.expiry_date,
          category: item.category
        }))

        setExpiringIngredients(ingredients)
      } catch (error) {
        console.error('Error loading expiring ingredients:', error)
      }
    }

    loadExpiringIngredients()
  }, [user?.id, isPersonal, currentHousehold?.id])

  // Load saved recipes
  useEffect(() => {
    const loadSavedRecipes = async () => {
      if (!user?.id) return

      try {
        setLoadingSaved(true)
        let query = supabase
          .from('ai_saved_recipes')
          .select('*')
          .eq('user_id', user.id)

        if (isPersonal) {
          query = query.is('household_id', null)
        } else if (currentHousehold?.id) {
          query = query.eq('household_id', currentHousehold.id)
        }

        query = query.order('created_at', { ascending: false })

        const { data, error } = await query

        if (error) throw error

        const normalized = (data || []).map(item => ({
          id: item.id,
          title: item.recipe_data.title,
          description: item.recipe_data.description,
          cookTime: item.recipe_data.cookTime,
          servings: item.recipe_data.servings,
          difficulty: item.recipe_data.difficulty,
          ingredients: item.recipe_data.ingredients,
          instructions: item.recipe_data.instructions,
          usedIngredients: item.recipe_data.usedIngredients || []
        }))

        setSavedRecipes(normalized)
      } catch (error) {
        console.error('Error loading saved recipes:', error)
      } finally {
        setLoadingSaved(false)
      }
    }

    loadSavedRecipes()
  }, [user?.id, isPersonal, currentHousehold?.id])

  // Generate recipes using Google Gemini AI
  const generateRecipes = async () => {
    if (expiringIngredients.length === 0) {
      setError('No expiring ingredients found. Add items to your inventory first!')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_GENAI_API_KEY
      if (!apiKey) {
        throw new Error('API key not found')
      }

      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

      const ingredientNames = expiringIngredients.map(i => i.name).join(', ')

      const prompt = `You are a creative chef. Generate 6 delicious and practical recipe ideas using these ingredients that are expiring soon: ${ingredientNames}

For each recipe, provide:
- title: A catchy recipe name
- description: A brief 1-2 sentence description
- cookTime: Cooking time in minutes (number)
- servings: Number of servings (number)
- difficulty: "Easy", "Medium", or "Hard"
- ingredients: Array of ingredient strings with measurements
- instructions: Array of step-by-step instruction strings
- usedIngredients: Array of which expiring ingredients from the list are used

Return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief description",
      "cookTime": 30,
      "servings": 4,
      "difficulty": "Easy",
      "ingredients": ["1 cup ingredient", "2 tbsp ingredient"],
      "instructions": ["Step 1", "Step 2"],
      "usedIngredients": ["ingredient1", "ingredient2"]
    }
  ]
}

Make the recipes creative, practical, and use as many of the expiring ingredients as possible.`

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Could not parse AI response')
      }

      const data = JSON.parse(jsonMatch[0])
      setRecipes(data.recipes || [])
    } catch (error) {
      console.error('Error generating recipes:', error)
      setError(error.message || 'Failed to generate recipes. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ChefHat className="h-7 w-7" />
            Recipe Suggestions
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered recipes using your expiring ingredients
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ViewSwitcher />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="generate" className="w-full">
        <TabsList>
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Generate New
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex items-center gap-2">
            <Bookmark className="h-4 w-4" />
            Saved Recipes ({savedRecipes.length})
          </TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-6">
          <div className="flex justify-end">
            <Button
              onClick={generateRecipes}
              disabled={loading || expiringIngredients.length === 0}
              variant="default"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate Recipes
                </>
              )}
            </Button>
          </div>

      {/* Expiring Ingredients Section */}
      {expiringIngredients.length > 0 ? (
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-2">
            Ingredients expiring in the next 7 days:
          </h3>
          <div className="flex flex-wrap gap-2">
            {expiringIngredients.map((item, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200"
              >
                {item.name}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Expiring Ingredients
          </h3>
          <p className="text-muted-foreground mb-4">
            Add items to your inventory to get personalized recipe suggestions
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/inventory'}>
            Go to Inventory
          </Button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Recipes Grid */}
      {recipes.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Generated Recipes ({recipes.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe, index) => (
              <RecipeCard 
                key={index} 
                recipe={recipe}
                onSaveToggle={async (recipe, savedId) => {
                  if (savedId) {
                    // Recipe was saved, check for badges
                    await checkBadges('recipe_saved')
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

          {/* Empty State - No Recipes Yet */}
          {recipes.length === 0 && !loading && !error && expiringIngredients.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Ready to Cook?
              </h3>
              <p className="text-muted-foreground mb-4">
                Click "Generate Recipes" to get AI-powered suggestions using your expiring ingredients
              </p>
            </div>
          )}
        </TabsContent>

        {/* Saved Recipes Tab */}
        <TabsContent value="saved" className="space-y-6">
          {loadingSaved ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : savedRecipes.length > 0 ? (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Your Saved Recipes ({savedRecipes.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    savedRecipeId={recipe.id}
                    onSaveToggle={(_, newId) => {
                      if (!newId) {
                        // Recipe was unsaved, remove from list
                        setSavedRecipes(prev => prev.filter(r => r.id !== recipe.id))
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Saved Recipes Yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Generate recipes and save your favorites to access them later
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Badge Celebration Modal */}
      {celebrationBadge && (
        <BadgeCelebration
          badge={celebrationBadge}
          onClose={closeCelebration}
          userName={user?.email?.split('@')[0] || 'User'}
        />
      )}
    </div>
  )
}

export default Recipes
