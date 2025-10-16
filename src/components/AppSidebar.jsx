import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Home,
  Users,
  User,
  Settings,
  HelpCircle,
  Search,
  Database,
  FileText,
  FileSpreadsheet,
  MoreHorizontal,
  X,
  Package,
  ChefHat,
  Building,
  Scan,
  MapPin,
  LogOut
} from 'lucide-react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

const AppSidebar = ({ onClose }) => {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) throw error
        setProfile(data)
      } catch (error) {
        console.error('Error loading profile:', error)
      }
    }

    loadProfile()
  }, [user?.id])

  const getInitials = () => {
    if (profile?.full_name) {
      const names = profile.full_name.split(' ')
      return names.length > 1
        ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
        : names[0][0].toUpperCase()
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User'
  const displayEmail = user?.email || ''

  const handleLogout = async () => {
    console.log('Logout clicked!') // Debug log
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }
  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar">
      {/* Header */}
      <div className="flex h-16 items-center justify-start px-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="lg:hidden"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-6 space-y-1">
        <div className="space-y-1">
          <NavLink
            to="/dashboard"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <Home className="h-5 w-5" />
            <span className="text-sm">Dashboard</span>
          </NavLink>
          <NavLink
            to="/analytics"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-sm">Analytics</span>
          </NavLink>
          <NavLink
            to="/inventory"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <Package className="h-5 w-5" />
            <span className="text-sm">Inventory</span>
          </NavLink>
          <NavLink
            to="/recipes"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <ChefHat className="h-5 w-5" />
            <span className="text-sm">Recipes</span>
          </NavLink>
          <NavLink
            to="/scanner"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <Scan className="h-5 w-5" />
            <span className="text-sm">AI Scanner</span>
          </NavLink>
          <NavLink
            to="/household"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <Users className="h-5 w-5" />
            <span className="text-sm">Household</span>
          </NavLink>
          <NavLink
            to="/storage-locations"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <MapPin className="h-5 w-5" />
            <span className="text-sm">Storage</span>
          </NavLink>
        </div>

        {/* Documents Section */}
        <div className="pt-8">
          <div className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
            Documents
          </div>
          <div className="space-y-1 mt-2">
            <NavLink
              to="/reports"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`
              }
            >
              <FileText className="h-5 w-5" />
              <span className="text-sm">Reports</span>
            </NavLink>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="pt-8 mt-auto">
          <div className="space-y-1">
            <NavLink
              to="/profile"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`
              }
            >
              <User className="h-5 w-5" />
              <span className="text-sm">Profile</span>
            </NavLink>
            <a
              href="https://mealsaver.app/app-support"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors"
            >
              <HelpCircle className="h-5 w-5" />
              <span className="text-sm">Get Help</span>
            </a>
          </div>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-6">
        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
          <NavLink
            to="/profile"
            onClick={onClose}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center overflow-hidden">
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sidebar-primary-foreground font-medium text-sm">{getInitials()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</div>
              <div className="text-xs text-sidebar-foreground/60 truncate">{displayEmail}</div>
            </div>
          </NavLink>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                aria-label="User menu"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-50">
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

export default AppSidebar
