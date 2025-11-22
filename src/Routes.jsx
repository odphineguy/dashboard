import React from 'react'
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from 'react-router-dom'
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react'

// Fallback component for when Supabase isn't configured
const SupabaseErrorFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-card border border-border rounded-lg p-8 text-center">
      <div className="mb-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Configuration Error</h1>
        <p className="text-muted-foreground">
          The application is not properly configured. Please check your environment variables and try again.
        </p>
      </div>
      <div className="space-y-3 text-sm text-left">
        <div className="bg-muted p-3 rounded">
          <p className="font-medium mb-1">Missing Environment Variables:</p>
          <ul className="text-muted-foreground space-y-1">
            <li>• VITE_SUPABASE_URL</li>
            <li>• VITE_SUPABASE_ANON_KEY</li>
          </ul>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    </div>
  </div>
)
import Login from './components/Login'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Inventory from './pages/Inventory'
import Recipes from './pages/Recipes'
import Household from './pages/Household'
import StorageLocations from './pages/StorageLocations'
import Profile from './pages/Profile'
import ScannerTest from './components/ScannerTest'
import GmailConnectCallback from './pages/GmailConnect'
import SplashPage from './pages/Splash'
import { useAuth } from './contexts/AuthContext'
import AppSidebar from './components/AppSidebar'
import Header from './components/Header'
import FloatingActionButton from './components/FloatingActionButton'
import QuickAddItemModal from './components/QuickAddItemModal'
import QuickScanModal from './components/QuickScanModal'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ProtectedRoute = ({ element }) => {
  const { user, loading, isSignedIn } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn || !user) return <Navigate to="/login" replace />

  return element
}

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [quickScanMode, setQuickScanMode] = useState(null)
  const navigate = useNavigate()

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  const handleQuickAdd = () => {
    setIsQuickAddOpen(true)
  }

  const closeQuickAdd = () => {
    setIsQuickAddOpen(false)
  }

  const handleQuickScan = (mode) => {
    setQuickScanMode(mode)
  }

  const closeQuickScan = () => {
    setQuickScanMode(null)
  }

  const handleScanFileSelect = (file, mode) => {
    // Navigate to scanner with the file ready to process
    navigate('/scanner', { state: { mode, file } })
  }

  return (
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

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Floating Action Button */}
        <FloatingActionButton onQuickAdd={handleQuickAdd} onQuickScan={handleQuickScan} />

        {/* Quick Add Item Modal */}
        <QuickAddItemModal isOpen={isQuickAddOpen} onClose={closeQuickAdd} />

        {/* Quick Scan Modal */}
        <QuickScanModal
          isOpen={!!quickScanMode}
          onClose={closeQuickScan}
          mode={quickScanMode}
          onFileSelect={handleScanFileSelect}
        />
      </div>
    </div>
  )
}

const Routes = () => {
  // Check if Supabase is properly configured
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  // If Supabase environment variables are missing, show configuration error
  if (!supabaseUrl || !supabaseAnonKey) {
    return <SupabaseErrorFallback />
  }

  return (
    <BrowserRouter>
      <RouterRoutes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute
              element={
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              }
            />
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              element={
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              }
            />
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute
              element={
                <MainLayout>
                  <Analytics />
                </MainLayout>
              }
            />
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute
              element={
                <MainLayout>
                  <Inventory />
                </MainLayout>
              }
            />
          }
        />
        <Route
          path="/recipes"
          element={
            <ProtectedRoute
              element={
                <MainLayout>
                  <Recipes />
                </MainLayout>
              }
            />
          }
        />
        <Route
          path="/scanner"
          element={
            <ProtectedRoute
              element={
                <MainLayout>
                  <ScannerTest />
                </MainLayout>
              }
            />
          }
        />
        <Route
          path="/gmail-connect"
          element={
            <ProtectedRoute
              element={<GmailConnectCallback />}
            />
          }
        />
        <Route
          path="/household"
          element={
            <ProtectedRoute
              element={
                <MainLayout>
                  <Household />
                </MainLayout>
              }
            />
          }
        />
        <Route
          path="/storage-locations"
          element={
            <ProtectedRoute
              element={
                <MainLayout>
                  <StorageLocations />
                </MainLayout>
              }
            />
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute
              element={
                <MainLayout>
                  <Profile />
                </MainLayout>
              }
            />
          }
        />

        {/* Catch all - redirect to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </RouterRoutes>
    </BrowserRouter>
  )
}

export default Routes
