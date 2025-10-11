import React from 'react'
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Inventory from './pages/Inventory'
import Recipes from './pages/Recipes'
import Household from './pages/Household'
import StorageLocations from './pages/StorageLocations'
import Profile from './pages/Profile'
import Reports from './pages/Reports'
import ScannerTest from './components/ScannerTest'
import GmailConnectCallback from './pages/GmailConnect'
import SplashPage from './pages/Splash'
import OnboardingPage from './pages/Onboarding'
import PricingPage from './pages/Pricing'
import { useAuth } from './contexts/AuthContext'
import AppSidebar from './components/AppSidebar'
import Header from './components/Header'
import FloatingActionButton from './components/FloatingActionButton'
import QuickAddItemModal from './components/QuickAddItemModal'
import QuickScanModal from './components/QuickScanModal'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ProtectedRoute = ({ element }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return user ? element : <Login />
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
  return (
    <BrowserRouter>
      <RouterRoutes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/pricing" element={<PricingPage />} />

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
        <Route
          path="/reports"
          element={
            <ProtectedRoute
              element={
                <MainLayout>
                  <Reports />
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
