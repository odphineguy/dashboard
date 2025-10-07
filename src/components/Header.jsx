import React, { useState, useEffect } from 'react'
import { Menu, Search, Bell, Settings } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { Input } from './ui/input'
import { Button } from './ui/button'
import NotificationsDropdown from './NotificationsDropdown'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { supabase } from '../lib/supabaseClient'

const Header = ({ onMenuClick }) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { user } = useAuth()
  const { currentHousehold, isPersonal } = useHousehold()

  // Load unread notification count
  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!user?.id) return

      try {
        let query = supabase
          .from('pantry_items')
          .select('*')
          .eq('user_id', user.id)

        if (isPersonal) {
          query = query.is('household_id', null)
        } else if (currentHousehold?.id) {
          query = query.eq('household_id', currentHousehold.id)
        }

        const { data: items, error } = await query

        if (error) throw error

        const today = new Date()
        let count = 0

        items?.forEach(item => {
          if (!item.expiry_date) return

          const expiryDate = new Date(item.expiry_date)
          const diffTime = expiryDate - today
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          // Count items that are expired or expiring within 3 days
          if (diffDays <= 3) {
            count++
          }
        })

        setUnreadCount(count)
      } catch (error) {
        console.error('Error loading notification count:', error)
      }
    }

    loadUnreadCount()

    // Refresh count every minute
    const interval = setInterval(loadUnreadCount, 60000)
    return () => clearInterval(interval)
  }, [user?.id, isPersonal, currentHousehold?.id])

  return (
    <header className="flex h-16 items-center justify-between bg-background border-b border-border px-6 relative">
      {/* Left side - Menu and divider */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Center - Logo */}
      <div className="absolute left-1/2 transform -translate-x-1/2 z-10">
        <img
          src="/Meal.svg"
          alt="Meal Saver Logo"
          className="h-32 w-auto"
        />
      </div>

      <div className="flex items-center gap-2 lg:gap-4 relative">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <>
                <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full"></span>
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </>
            )}
          </Button>

          <NotificationsDropdown
            isOpen={isNotificationsOpen}
            onClose={() => setIsNotificationsOpen(false)}
          />
        </div>

        <ThemeToggle />
      </div>
    </header>
  )
}

export default Header
