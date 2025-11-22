import { useState } from 'react'
import App from './App'
import ExperimentalApp from './components/ExperimentalApp'

function AppRouter() {
  const [currentApp, setCurrentApp] = useState('original') // 'original' or 'experimental'

  return (
    <div className="min-h-screen">
      {/* Navigation Toggle */}
      <div className="fixed bottom-4 right-4 z-10">
        <div className="bg-background border border-border rounded-lg p-2 shadow-lg">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentApp('original')}
              className={`px-3 py-1 text-xs rounded ${
                currentApp === 'original' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Original
            </button>
            <button
              onClick={() => setCurrentApp('experimental')}
              className={`px-3 py-1 text-xs rounded ${
                currentApp === 'experimental' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Mobile Test
            </button>
          </div>
        </div>
      </div>

      {/* Render Current App */}
      {currentApp === 'original' ? <App /> : <ExperimentalApp />}
    </div>
  )
}

export default AppRouter
