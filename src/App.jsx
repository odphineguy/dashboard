import './App.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { useState } from 'react'
import { Search } from 'lucide-react'
import AppSidebar from './components/AppSidebar'
import Header from './components/Header'
import KPICards from './components/KPICards'
import AdvancedChart from './components/AdvancedChartRecharts'
import PieChart from './components/PieChart'
import PieChart2 from './components/PieChart2'
import BarChart from './components/BarChart'
import BarChart2 from './components/BarChart2'
import { Input } from './components/ui/input'

function App() {
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
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={closeSidebar}
          />
        )}
        
        {/* Sidebar */}
        <div className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-sidebar h-full
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <AppSidebar onClose={closeSidebar} />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header onMenuClick={toggleSidebar} />
          
          {/* Search Bar */}
          <div className="bg-background border-b border-border px-6 py-3">
            <div className="max-w-7xl mx-auto flex justify-end">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 w-full"
                />
              </div>
            </div>
          </div>
          
          {/* Dashboard Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              {/* KPI Cards */}
              <KPICards />
              
              {/* Advanced Chart */}
              <div className="mb-8">
                <AdvancedChart />
              </div>
              
              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <PieChart />
                <PieChart2 />
              </div>
              
              {/* Second Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <BarChart />
                <BarChart2 />
              </div>
              
        {/* Data Table - Temporarily removed */}
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App
