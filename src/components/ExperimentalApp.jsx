import '../App.css'
import { ThemeProvider } from '../contexts/ThemeContext'
import { useState } from 'react'
import { 
  Menu, 
  X, 
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
  Plus
} from 'lucide-react'
import { Button } from './ui/button'

// Experimental Sidebar Component
const ExperimentalSidebar = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-sidebar h-full
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex h-screen w-64 flex-col bg-sidebar">
          {/* Header with Close Button */}
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
                <BarChart3 className="h-5 w-5" />
                <span className="text-sm">Analytics</span>
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
                <Users className="h-5 w-5" />
                <span className="text-sm">Team</span>
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
                <FileText className="h-5 w-5" />
                <span className="text-sm">Reports</span>
              </a>
            </div>

            {/* Documents Section */}
            <div className="pt-8">
              <div className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                Documents
              </div>
              <div className="space-y-1 mt-2">
                <a href="#" className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
                  <Database className="h-5 w-5" />
                  <span className="text-sm">Data Library</span>
                </a>
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
                  <span className="text-sm">More</span>
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
      </div>
    </>
  )
}

// Experimental Header Component
const ExperimentalHeader = ({ onMenuClick }) => {
  return (
    <header className="flex h-16 items-center justify-between bg-background border-b border-border px-6 relative">
      {/* Left side - Hamburger menu */}
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onMenuClick}
          className=""
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="h-6 w-px bg-border hidden lg:block ml-4"></div>
      </div>
      
      {/* Center - Logo */}
      <div className="absolute left-1/2 transform -translate-x-1/2">
        <img 
          src="/mealsaver.logo.png" 
          alt="Meal Saver Logo" 
          className="h-8 w-auto"
        />
      </div>
      
      {/* Right side - Info */}
      <div className="text-sm text-muted-foreground">
        Experimental Mobile Sidebar
      </div>
    </header>
  )
}

// Main Experimental App Component
function ExperimentalApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen bg-background text-foreground">
        {/* Experimental Sidebar */}
        <ExperimentalSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Experimental Header */}
          <ExperimentalHeader onMenuClick={toggleSidebar} />
          
          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold mb-6">Experimental Mobile Sidebar</h1>
              
              <div className="space-y-6">
                <div className="bg-card p-6 rounded-lg border">
                  <h2 className="text-xl font-semibold mb-4">Testing Instructions</h2>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• <strong>Desktop:</strong> Sidebar should be always visible on the left</li>
                    <li>• <strong>Mobile:</strong> Click the hamburger menu to toggle sidebar</li>
                    <li>• <strong>Mobile:</strong> Click outside the sidebar to close it</li>
                    <li>• <strong>Mobile:</strong> Use the X button in sidebar to close it</li>
                  </ul>
                </div>

                <div className="bg-card p-6 rounded-lg border">
                  <h2 className="text-xl font-semibold mb-4">Current Behavior</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sidebar is currently: <span className="font-medium text-foreground">
                      {sidebarOpen ? 'Open' : 'Closed'}
                    </span>
                  </p>
                  <Button onClick={toggleSidebar} className="lg:hidden">
                    Toggle Sidebar
                  </Button>
                </div>

                <div className="bg-card p-6 rounded-lg border">
                  <h2 className="text-xl font-semibold mb-4">Responsive Breakpoints</h2>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• <code className="bg-muted px-1 rounded">lg:</code> Large screens (1024px+) - Sidebar always visible</p>
                    <p>• <code className="bg-muted px-1 rounded">default</code> Mobile/Tablet - Sidebar toggleable</p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default ExperimentalApp
