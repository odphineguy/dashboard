import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSupabase } from '../../hooks/useSupabase'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { ChefHat, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

const Recipes = () => {
  const { user } = useAuth()
  const supabase = useSupabase()
  const [expiringItems, setExpiringItems] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadExpiringItems()
  }, [user?.id])

  const loadExpiringItems = async () => {
    if (!user?.id) return

    try {
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('pantry_items')
        .select('*')
        .eq('user_id', user.id)
        .is('household_id', null)
        .lte('expiry_date', threeDaysFromNow.toISOString().split('T')[0])
        .gte('expiry_date', today.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true })

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
      toast.error('Failed to generate recipes. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Recipes</h1>
          <p className="text-muted-foreground">AI-powered recipe suggestions based on expiring ingredients</p>
        </div>
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

      {/* Expiring Items Info */}
      {expiringItems.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Found <span className="font-semibold text-foreground">{expiringItems.length}</span> items expiring in the next 3 days
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {expiringItems.slice(0, 10).map((item) => (
                <span key={item.id} className="text-xs bg-muted px-2 py-1 rounded">
                  {item.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recipes */}
      {recipes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              {expiringItems.length === 0
                ? 'Add items with expiry dates to get recipe suggestions!'
                : 'Click "Generate Recipes" to get AI-powered recipe suggestions based on your expiring ingredients.'}
            </p>
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
