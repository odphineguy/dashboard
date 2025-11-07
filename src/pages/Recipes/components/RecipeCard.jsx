import React, { useState } from 'react'
import { Clock, Users, ChefHat, ChevronDown, ChevronUp, Bookmark } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { useAuth } from '../../../contexts/AuthContext'
import { useHousehold } from '../../../contexts/HouseholdContext'
import { useSupabase } from '../../../hooks/useSupabase'

const RecipeCard = ({ recipe, savedRecipeId = null, onSaveToggle }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(!!savedRecipeId)
  const { user } = useAuth()
  const { currentHousehold, isPersonal } = useHousehold()
  const supabase = useSupabase() // Use authenticated Supabase client with Clerk JWT

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const handleSaveToggle = async () => {
    if (!user?.id) return

    setIsSaving(true)
    try {
      if (isSaved && savedRecipeId) {
        // Unsave recipe
        const { error } = await supabase
          .from('ai_saved_recipes')
          .delete()
          .eq('id', savedRecipeId)

        if (error) throw error
        setIsSaved(false)
        if (onSaveToggle) onSaveToggle(recipe, null)
      } else {
        // Save recipe
        const { data, error } = await supabase
          .from('ai_saved_recipes')
          .insert({
            user_id: user.id,
            household_id: isPersonal ? null : currentHousehold?.id,
            recipe_data: {
              title: recipe.title,
              description: recipe.description,
              cookTime: recipe.cookTime,
              servings: recipe.servings,
              difficulty: recipe.difficulty,
              ingredients: recipe.ingredients,
              instructions: recipe.instructions,
              usedIngredients: recipe.usedIngredients || []
            }
          })
          .select()
          .single()

        if (error) throw error
        setIsSaved(true)
        if (onSaveToggle) onSaveToggle(recipe, data.id)
      }
    } catch (error) {
      console.error('Error toggling recipe save:', error)
      console.error('Full error details:', error.message, error)
      alert(`Failed to save recipe: ${error.message || 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground pr-2 flex-1">{recipe.title}</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={handleSaveToggle}
              disabled={isSaving}
              title={isSaved ? "Remove from saved" : "Save recipe"}
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? 'text-primary fill-primary' : ''}`} />
            </Button>
            <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getDifficultyColor(recipe.difficulty)}`}>
              {recipe.difficulty}
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{recipe.description}</p>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{recipe.cookTime} min</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{recipe.servings} servings</span>
          </div>
        </div>

        {/* Used Ingredients */}
        {recipe.usedIngredients && recipe.usedIngredients.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Uses:</p>
            <div className="flex flex-wrap gap-1">
              {recipe.usedIngredients.slice(0, 3).map((ingredient, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary"
                >
                  {ingredient}
                </span>
              ))}
              {recipe.usedIngredients.length > 3 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                  +{recipe.usedIngredients.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expandable Details */}
      <div className="border-t border-border">
        <Button
          variant="ghost"
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              View Details
            </>
          )}
        </Button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 bg-muted/30 space-y-4 border-t border-border">
          {/* Ingredients */}
          <div>
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <ChefHat className="h-4 w-4" />
              Ingredients
            </h4>
            <ul className="space-y-1">
              {recipe.ingredients?.map((ingredient, idx) => (
                <li key={idx} className="text-sm text-muted-foreground pl-4 relative before:content-['•'] before:absolute before:left-0">
                  {ingredient}
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div>
            <h4 className="font-semibold text-foreground mb-2">Instructions</h4>
            <ol className="space-y-2">
              {recipe.instructions?.map((instruction, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                  <span className="font-semibold text-primary min-w-[1.5rem]">{idx + 1}.</span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}

export default RecipeCard
