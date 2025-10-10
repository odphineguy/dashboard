import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Camera, ScanLine, PlusCircle, ChefHat } from 'lucide-react'
import { cn } from '../lib/utils'

const FloatingActionButton = ({ onQuickAdd }) => {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const handleAction = (action) => {
    setIsOpen(false)

    switch (action) {
      case 'scan-receipt':
        navigate('/scanner', { state: { mode: 'receipt' } })
        break
      case 'scan-barcode':
        navigate('/scanner', { state: { mode: 'barcode' } })
        break
      case 'add-item':
        onQuickAdd?.()
        break
      case 'recipes':
        navigate('/recipes')
        break
      default:
        break
    }
  }

  const actions = [
    {
      id: 'scan-receipt',
      label: 'Scan Receipt',
      icon: Camera,
      color: 'bg-blue-500 hover:bg-blue-600',
      order: 4
    },
    {
      id: 'scan-barcode',
      label: 'Scan Barcode',
      icon: ScanLine,
      color: 'bg-purple-500 hover:bg-purple-600',
      order: 3
    },
    {
      id: 'add-item',
      label: 'Add Item',
      icon: PlusCircle,
      color: 'bg-green-500 hover:bg-green-600',
      order: 2
    },
    {
      id: 'recipes',
      label: 'Recipes',
      icon: ChefHat,
      color: 'bg-orange-500 hover:bg-orange-600',
      order: 1
    }
  ]

  return (
    <>
      {/* Backdrop for mobile - moved outside to prevent touch interference */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className="fixed bottom-6 right-6 z-50 pointer-events-none flex flex-col items-end">
        {/* Action Buttons */}
        <div className={cn(
          "flex flex-col-reverse gap-3 mb-3 transition-all duration-300 ease-in-out",
          isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        )}>
          {actions.map((action, index) => {
            const Icon = action.icon
            return (
              <div
                key={action.id}
                className="flex items-center gap-3 justify-end"
                style={{
                  transitionDelay: isOpen ? `${index * 50}ms` : `${(actions.length - index) * 30}ms`
                }}
              >
                {/* Label */}
                <span className={cn(
                  "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg transition-all duration-200",
                  isOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
                )}>
                  {action.label}
                </span>

                {/* Action Button */}
                <button
                  onClick={() => handleAction(action.id)}
                  className={cn(
                    "w-12 h-12 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center text-white",
                    action.color,
                    "transform hover:scale-110 active:scale-95"
                  )}
                  aria-label={action.label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              </div>
            )
          })}
        </div>

        {/* Main FAB Button */}
        <button
          onClick={toggleMenu}
          className={cn(
            "w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center pointer-events-auto",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "transform hover:scale-105 active:scale-95",
            isOpen && "rotate-45"
          )}
          aria-label={isOpen ? "Close menu" : "Open quick actions"}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </button>
      </div>
    </>
  )
}

export default FloatingActionButton
