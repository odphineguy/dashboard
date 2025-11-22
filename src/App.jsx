import './App.css'
import { useState } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { HouseholdProvider } from './contexts/HouseholdContext'
import { SubscriptionProvider } from './contexts/SubscriptionContext'
import Routes from './Routes'
import { Toaster } from 'sonner'
import SplashScreen from './components/SplashScreen'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  const [showSplash, setShowSplash] = useState(false) // Disabled splash screen temporarily

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SubscriptionProvider>
          <HouseholdProvider>
            <ThemeProvider>
              {/* Show splash screen on every app load */}
              {showSplash && (
                <SplashScreen
                  onComplete={() => setShowSplash(false)}
                  duration={3000}
                />
              )}

              <Routes />
              <Toaster position="top-right" richColors closeButton />
            </ThemeProvider>
          </HouseholdProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
