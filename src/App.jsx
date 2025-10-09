import './App.css'
import { useState } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { HouseholdProvider } from './contexts/HouseholdContext'
import Routes from './Routes'
import { Toaster } from 'sonner'
import SplashScreen from './components/SplashScreen'

function App() {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <AuthProvider>
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
    </AuthProvider>
  )
}

export default App
