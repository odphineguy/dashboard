import React from 'react'
import { Link } from 'react-router-dom'
import { History, User, Check, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/button'

const RecentActivityGrid = ({ events, loading }) => {
  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
            <p className="text-sm text-muted-foreground">Your latest inventory updates</p>
          </div>
          <Link to="/analytics">
            <Button variant="ghost" size="sm">
              <History className="h-4 w-4 mr-2" />
              View History
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading activity...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
            <p className="text-sm text-muted-foreground">Your latest inventory updates</p>
          </div>
          <Link to="/analytics">
            <Button variant="ghost" size="sm">
              <History className="h-4 w-4 mr-2" />
              View History
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">No recent activity yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
          <p className="text-sm text-muted-foreground">Your latest inventory updates</p>
        </div>
        <Link to="/analytics">
          <Button variant="ghost" size="sm">
            <History className="h-4 w-4 mr-2" />
            View History
          </Button>
        </Link>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-foreground">User</th>
                <th className="text-left p-4 text-sm font-medium text-foreground">Action</th>
                <th className="text-left p-4 text-sm font-medium text-foreground">Item</th>
                <th className="text-left p-4 text-sm font-medium text-foreground">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.map((event, index) => (
                <tr key={event.id || index} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                        <User size={16} className="text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {event.user_name || 'You'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {event.user_email || ''}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${event.type === 'wasted' ? 'bg-red-500' : 'bg-green-500'
                        }`}>
                        {event.type === 'wasted' ? (
                          <Trash2 size={14} color="white" />
                        ) : (
                          <Check size={14} color="white" />
                        )}
                      </div>
                      <span className={`text-sm font-medium ${event.type === 'wasted' ? 'text-red-600' : 'text-green-600'
                        }`}>
                        {event.type === 'wasted' ? 'Wasted' : 'Consumed'}
                      </span>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {event.quantity || 1} {event.unit || ''} {event.name}
                      </p>
                      {event.category && (
                        <p className="text-xs text-muted-foreground capitalize truncate">
                          {event.category}
                        </p>
                      )}
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="text-right">
                      <p className="text-sm text-foreground">
                        {new Date(event.at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {events.map((event, index) => (
          <div key={event.id || index} className="bg-muted/30 rounded-lg border border-border p-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
                <User size={18} className="text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {event.user_name || 'You'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.user_email || ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${event.type === 'wasted' ? 'bg-red-500' : 'bg-green-500'
                    }`}>
                    {event.type === 'wasted' ? (
                      <Trash2 size={12} color="white" />
                    ) : (
                      <Check size={12} color="white" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${event.type === 'wasted' ? 'text-red-600' : 'text-green-600'
                    }`}>
                    {event.type === 'wasted' ? 'Wasted' : 'Consumed'}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground">
                    {event.quantity || 1} {event.unit || ''} {event.name}
                  </p>
                  {event.category && (
                    <p className="text-xs text-muted-foreground capitalize">
                      {event.category}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RecentActivityGrid
