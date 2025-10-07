import './App.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { HouseholdProvider } from './contexts/HouseholdContext'
import Routes from './Routes'
import { Toaster } from 'sonner'

function App() {
  return (
    <AuthProvider>
      <HouseholdProvider>
        <ThemeProvider>
          <Routes />
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </HouseholdProvider>
    </AuthProvider>
  )
}

export default App
