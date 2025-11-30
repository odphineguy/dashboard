import React, { useState, useEffect, useRef } from 'react'
import { Bell, X, AlertTriangle, Clock, CheckCircle, Trash2, Package, ShoppingCart } from 'lucide-react'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { useSupabase } from '../hooks/useSupabase'
import { formatDistanceToNow } from 'date-fns'

const NotificationsDropdown = ({ isOpen, onClose }) => {
  const supabase = useSupabase()
  const { user } = useAuth()
  const { currentHousehold, isPersonal } = useHousehold()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [addingToList, setAddingToList] = useState(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen, user?.id, isPersonal, currentHousehold?.id])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const loadNotifications = async () => {
    if (!user?.id) return

    try {
      // Get expiring items
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
      const notifs = []

      items?.forEach(item => {
        if (!item.expiry_date) return

        const expiryDate = new Date(item.expiry_date)
        const diffTime = expiryDate - today
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
          // Expired
          notifs.push({
            id: `expired-${item.id}`,
            type: 'expired',
            itemName: item.name,
            title: `${item.name} has expired`,
            message: `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`,
            timestamp: item.expiry_date,
            icon: AlertTriangle,
            color: 'text-red-500',
            bgColor: 'bg-red-500/10'
          })
        } else if (diffDays === 0) {
          // Expires today
          notifs.push({
            id: `today-${item.id}`,
            type: 'expires-today',
            itemName: item.name,
            title: `${item.name} expires today`,
            message: 'Use it before it goes to waste',
            timestamp: item.expiry_date,
            icon: AlertTriangle,
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10'
          })
        } else if (diffDays <= 3) {
          // Expiring soon
          notifs.push({
            id: `soon-${item.id}`,
            type: 'expiring-soon',
            itemName: item.name,
            title: `${item.name} expiring soon`,
            message: `Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}`,
            timestamp: item.expiry_date,
            icon: Clock,
            color: 'text-yellow-500',
            bgColor: 'bg-yellow-500/10'
          })
        }
      })

      // Sort by urgency (expired first, then today, then soon)
      notifs.sort((a, b) => {
        const order = { 'expired': 0, 'expires-today': 1, 'expiring-soon': 2 }
        return order[a.type] - order[b.type]
      })

      setNotifications(notifs)
      setUnreadCount(notifs.length)
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  const markAllAsRead = () => {
    setUnreadCount(0)
  }

  const addToGroceryList = async (itemName, notificationId) => {
    if (!user?.id) return

    setAddingToList(notificationId)
    try {
      // Check if already on the list
      const { data: existing } = await supabase
        .from('grocery_list_items')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', itemName)
        .single()

      if (existing) {
        alert(`"${itemName}" is already on your grocery list!`)
        return
      }

      const { error } = await supabase
        .from('grocery_list_items')
        .insert([{
          user_id: user.id,
          name: itemName,
          source: 'low_stock'
        }])

      if (error) throw error

      // Show brief feedback
      alert(`Added "${itemName}" to grocery list!`)
    } catch (error) {
      console.error('Error adding to grocery list:', error)
    } finally {
      setAddingToList(null)
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-96 bg-card border border-border rounded-lg shadow-lg z-50 max-h-[600px] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {unreadCount} unread
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <h4 className="font-medium text-foreground mb-1">All caught up!</h4>
            <p className="text-sm text-muted-foreground">
              No notifications at the moment
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
{notifications.map((notification) => {
                              const Icon = notification.icon
                              return (
                                <div
                                  key={notification.id}
                                  className={`p-4 hover:bg-muted/50 transition-colors ${notification.bgColor}`}
                                >
                                  <div className="flex gap-3">
                                    <div className={`flex-shrink-0 ${notification.color}`}>
                                      <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-foreground text-sm">
                                        {notification.title}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {notification.message}
                                      </p>
                                      <div className="flex items-center justify-between mt-2">
                                        <p className="text-xs text-muted-foreground">
                                          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                                        </p>
                                        <button
                                          onClick={() => addToGroceryList(notification.itemName, notification.id)}
                                          disabled={addingToList === notification.id}
                                          className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                                        >
                                          <ShoppingCart className="h-3 w-3" />
                                          {addingToList === notification.id ? 'Adding...' : 'Add to List'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              onClose()
              // Navigate to inventory page
              window.location.href = '/inventory'
            }}
          >
            View all in Inventory
          </Button>
        </div>
      )}
    </div>
  )
}

export default NotificationsDropdown
