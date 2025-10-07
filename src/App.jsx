import './App.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { HouseholdProvider } from './contexts/HouseholdContext'
import Routes from './Routes'

function App() {
  return (
    <AuthProvider>
      <HouseholdProvider>
        <ThemeProvider>
          <Routes />
        </ThemeProvider>
      </HouseholdProvider>
    </AuthProvider>
  )
}

export default App
