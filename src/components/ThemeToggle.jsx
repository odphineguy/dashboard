import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useModeAnimation, ThemeAnimationType } from 'react-theme-switch-animation'

const ThemeToggle = () => {
  const { ref, toggleSwitchTheme, isDarkMode } = useModeAnimation({
    animationType: ThemeAnimationType.CIRCLE
  })

  return (
    <button
      ref={ref}
      onClick={toggleSwitchTheme}
      className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <span className="sr-only">Toggle dark mode</span>
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform flex items-center justify-center ${
          isDarkMode ? 'translate-x-6' : 'translate-x-1'
        }`}
      >
        {isDarkMode ? (
          <Moon className="h-3 w-3 text-muted-foreground" />
        ) : (
          <Sun className="h-3 w-3 text-muted-foreground" />
        )}
      </span>
    </button>
  )
}

export default ThemeToggle
