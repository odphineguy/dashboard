import React, { useState, useEffect } from 'react'
import Lottie from 'lottie-react'

const SplashScreen = ({
  onComplete,
  duration = 3000,
  showText = true,
  title = 'Meal Saver',
  subtitle = 'AI-Powered Pantry Management'
}) => {
  const [forkAnimation, setForkAnimation] = useState(null)
  const [isVisible, setIsVisible] = useState(true)

  // Load spinning fork animation
  useEffect(() => {
    fetch('/animations/spinning-fork.json')
      .then(res => res.json())
      .then(data => setForkAnimation(data))
      .catch(err => console.error('Failed to load fork animation:', err))
  }, [])

  // Auto-hide splash screen after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      if (onComplete) {
        setTimeout(onComplete, 500) // Wait for fade out animation
      }
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onComplete])

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="text-center">
        {forkAnimation ? (
          <div className="w-32 h-32 mx-auto mb-4">
            <Lottie
              animationData={forkAnimation}
              loop={true}
              autoplay={true}
            />
          </div>
        ) : (
          // Fallback loader if animation doesn't load
          <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
          </div>
        )}
        {showText && (
          <>
            {title && <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>}
            {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
          </>
        )}
      </div>
    </div>
  )
}

export default SplashScreen
