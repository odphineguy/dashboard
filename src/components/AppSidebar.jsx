import React from 'react'
import { 
  BarChart3, 
  Home, 
  Users, 
  Settings, 
  HelpCircle, 
  Search,
  Database,
  FileText,
  FileSpreadsheet,
  MoreHorizontal,
  Plus,
  X,
  Package,
  ChefHat,
  House
} from 'lucide-react'
import { Button } from './ui/button'

const AppSidebar = ({ onClose }) => {
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

      {/* Quick Create Button */}
      <div className="px-6 pb-6">
        <Button className="w-full flex items-center gap-2 px-4 py-3 bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground rounded-lg font-medium">
          <Plus className="h-4 w-4" />
          Quick Create
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-6 space-y-1">
        <div className="space-y-1">
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
            <Home className="h-5 w-5" />
            <span className="text-sm">Dashboard</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
            <Package className="h-5 w-5" />
            <span className="text-sm">Inventory</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
            <ChefHat className="h-5 w-5" />
            <span className="text-sm">Recipes</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
            <House className="h-5 w-5" />
            <span className="text-sm">Household</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
            <BarChart3 className="h-5 w-5" />
            <span className="text-sm">Analytics</span>
          </a>
        </div>

        {/* Documents Section */}
        <div className="pt-8">
          <div className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
            Documents
          </div>
          <div className="space-y-1 mt-2">
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
              <FileText className="h-5 w-5" />
              <span className="text-sm">Reports</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
              <FileSpreadsheet className="h-5 w-5" />
              <span className="text-sm">Analytics</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-sm">...more</span>
            </a>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="pt-8 mt-auto">
          <div className="space-y-1">
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
              <Settings className="h-5 w-5" />
              <span className="text-sm">Settings</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
              <HelpCircle className="h-5 w-5" />
              <span className="text-sm">Get Help</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
              <Search className="h-5 w-5" />
              <span className="text-sm">Search</span>
            </a>
          </div>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-6">
        <div className="flex items-center gap-3 p-3 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors cursor-pointer">
          <div className="h-8 w-8 rounded bg-sidebar-primary flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-medium text-sm">MS</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sidebar-foreground truncate">Meal Saver</div>
            <div className="text-xs text-sidebar-foreground/60 truncate">admin@mealsaver.co...</div>
          </div>
          <div className="h-4 w-4 text-sidebar-foreground/60">
            <MoreHorizontal className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AppSidebar
