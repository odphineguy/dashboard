import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { Badge } from './ui/badge'
import { useHousehold } from '../contexts/HouseholdContext'

const ViewSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const { currentHousehold, isPersonal, households, switchHousehold } = useHousehold()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleViewChange = (householdId) => {
    switchHousehold(householdId)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Badge
        variant="outline"
        className="text-sm flex items-center gap-2 cursor-pointer hover:bg-accent transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            isPersonal ? 'bg-green-500' : 'bg-orange-500'
          }`}
        ></span>
        <span>{isPersonal ? 'Personal' : currentHousehold?.name}</span>
        <ChevronDown className="h-3 w-3 ml-1" />
      </Badge>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg z-50 py-1">
          {/* Personal View Option */}
          <button
            onClick={() => handleViewChange(null)}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2 ${
              isPersonal ? 'bg-accent/50 font-medium' : ''
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            <span>Personal</span>
          </button>

          {/* Divider if households exist */}
          {households.length > 0 && (
            <div className="border-t border-border my-1"></div>
          )}

          {/* Household Options */}
          {households.map((household) => (
            <button
              key={household.id}
              onClick={() => handleViewChange(household.id)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2 ${
                !isPersonal && currentHousehold?.id === household.id
                  ? 'bg-accent/50 font-medium'
                  : ''
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-orange-500"></span>
              <span>{household.name}</span>
            </button>
          ))}

          {/* Empty state if no households */}
          {households.length === 0 && (
            <>
              <div className="border-t border-border my-1"></div>
              <div className="px-4 py-2 text-xs text-muted-foreground">
                No households yet
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ViewSwitcher
