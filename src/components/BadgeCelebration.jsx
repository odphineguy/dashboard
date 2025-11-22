import React, { useEffect, useState } from 'react'
import { Trophy, X, Share2 } from 'lucide-react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import ShareBadge from './ShareBadge'

/**
 * BadgeCelebration - Modal that appears when user earns a new badge
 * Shows confetti animation and allows immediate sharing
 */
const BadgeCelebration = ({ badge, onClose, userName }) => {
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    // Stop confetti after 3 seconds
    const timer = setTimeout(() => {
      setShowConfetti(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  if (!badge) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10px`,
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
                backgroundColor: [
                  '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'
                ][Math.floor(Math.random() * 6)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${Math.random() * 3 + 2}s`,
                borderRadius: Math.random() > 0.5 ? '50%' : '0',
                opacity: 0.8
              }}
            />
          ))}
        </div>
      )}

      {/* Celebration Card */}
      <Card className="relative max-w-md w-full p-8 text-center animate-bounce-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Trophy Animation */}
        <div className="mb-6 animate-float">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
            <Trophy className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Congratulations Message */}
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Congratulations!
        </h2>
        
        <p className="text-lg text-muted-foreground mb-6">
          You've earned a new achievement
        </p>

        {/* Badge Info */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 mb-6">
          <h3 className="text-2xl font-bold text-primary mb-2">
            {badge.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {badge.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <ShareBadge
            badge={badge}
            userName={userName}
            variant="default"
            onShare={() => {
              console.log('Badge shared from celebration modal')
            }}
          />
          <Button onClick={onClose} variant="outline">
            Awesome!
          </Button>
        </div>

        {/* Sparkle Effect */}
        <div className="absolute -top-4 -left-4 text-4xl animate-pulse">✨</div>
        <div className="absolute -top-4 -right-4 text-4xl animate-pulse" style={{ animationDelay: '0.5s' }}>✨</div>
        <div className="absolute -bottom-4 -left-4 text-4xl animate-pulse" style={{ animationDelay: '1s' }}>⭐</div>
        <div className="absolute -bottom-4 -right-4 text-4xl animate-pulse" style={{ animationDelay: '1.5s' }}>⭐</div>
      </Card>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes bounce-in {
          0% {
            transform: scale(0.3) translateY(-100px);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .animate-confetti {
          animation: confetti linear forwards;
        }

        .animate-bounce-in {
          animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .animate-float {
          animation: float 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

export default BadgeCelebration

