import { useState, useEffect } from 'react'

/**
 * Hook to manage splash screen visibility with various triggers
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.showOnLoad - Show splash on component mount (default: true)
 * @param {boolean} options.showOnce - Show only once per session using sessionStorage (default: false)
 * @param {boolean} options.showOnceEver - Show only once ever using localStorage (default: false)
 * @param {number} options.duration - Duration in milliseconds (default: 3000)
 * @param {string} options.storageKey - Key for localStorage/sessionStorage (default: 'meal-saver-splash-seen')
 *
 * @returns {Object} - { showSplash, setShowSplash, resetSplash }
 */
export const useSplashScreen = (options = {}) => {
  const {
    showOnLoad = true,
    showOnce = false,
    showOnceEver = false,
    duration = 3000,
    storageKey = 'meal-saver-splash-seen'
  } = options

  const [showSplash, setShowSplash] = useState(() => {
    if (!showOnLoad) return false

    // Check if should only show once per session
    if (showOnce) {
      return !sessionStorage.getItem(storageKey)
    }

    // Check if should only show once ever
    if (showOnceEver) {
      return !localStorage.getItem(storageKey)
    }

    return true
  })

  // Auto-hide after duration
  useEffect(() => {
    if (!showSplash) return

    const timer = setTimeout(() => {
      setShowSplash(false)

      // Mark as seen in storage if configured
      if (showOnce) {
        sessionStorage.setItem(storageKey, 'true')
      }
      if (showOnceEver) {
        localStorage.setItem(storageKey, 'true')
      }
    }, duration)

    return () => clearTimeout(timer)
  }, [showSplash, duration, showOnce, showOnceEver, storageKey])

  // Function to manually reset (show splash again)
  const resetSplash = () => {
    if (showOnce) {
      sessionStorage.removeItem(storageKey)
    }
    if (showOnceEver) {
      localStorage.removeItem(storageKey)
    }
    setShowSplash(true)
  }

  return {
    showSplash,
    setShowSplash,
    resetSplash
  }
}
