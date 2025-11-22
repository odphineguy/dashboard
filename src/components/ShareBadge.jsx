import React, { useState } from 'react'
import { Share2, Twitter, Facebook, Linkedin, Link, Check, X, MessageCircle, Mail } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'

// Reddit icon SVG (not available in lucide-react)
const RedditIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
)

const ShareBadge = ({ badge, userName = 'User', onShare, variant = 'ghost' }) => {
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  // Generate marketing-focused share text
  const appUrl = 'https://app.mealsaver.app'
  const shareText = `🏆 I just earned the "${badge.name}" achievement in Meal Saver! ${badge.description}\n\nJoin me in reducing food waste and saving money with Meal Saver - the smart pantry management app! 🌱`
  const shareUrl = appUrl
  const shareHashtags = ['MealSaver', 'FoodWaste', 'Sustainability', 'ZeroWaste', 'FoodTech']

  // Share to Twitter/X
  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=${shareHashtags.join(',')}`
    window.open(url, '_blank', 'width=550,height=420')
    onShare?.(badge)
    setShowShareMenu(false)
  }

  // Share to Facebook
  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`
    window.open(url, '_blank', 'width=550,height=420')
    onShare?.(badge)
    setShowShareMenu(false)
  }

  // Share to LinkedIn
  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'width=550,height=420')
    onShare?.(badge)
    setShowShareMenu(false)
  }

  // Share to Reddit
  const shareToReddit = () => {
    const title = encodeURIComponent(`🏆 Earned "${badge.name}" achievement in Meal Saver!`)
    const text = encodeURIComponent(`${badge.description}\n\n${shareText}`)
    const url = `https://www.reddit.com/submit?title=${title}&text=${text}&url=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'width=800,height=600')
    onShare?.(badge)
    setShowShareMenu(false)
  }

  // Share to WhatsApp
  const shareToWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`
    window.open(url, '_blank')
    onShare?.(badge)
    setShowShareMenu(false)
  }

  // Share via Email
  const shareViaEmail = () => {
    const subject = encodeURIComponent(`I earned "${badge.name}" achievement in Meal Saver!`)
    const body = encodeURIComponent(`${shareText}\n\n${shareUrl}`)
    const url = `mailto:?subject=${subject}&body=${body}`
    window.location.href = url
    onShare?.(badge)
    setShowShareMenu(false)
  }

  // Copy link to clipboard
  const copyToClipboard = async () => {
    const textToCopy = `${shareText}\n\n${shareUrl}`
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      onShare?.(badge)
      setTimeout(() => {
        setCopied(false)
        setShowShareMenu(false)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = textToCopy
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        onShare?.(badge)
        setTimeout(() => {
          setCopied(false)
          setShowShareMenu(false)
        }, 2000)
      } catch (err) {
        console.error('Fallback copy failed:', err)
      }
      document.body.removeChild(textArea)
    }
  }

  // Web Share API (for mobile)
  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${badge.name} Achievement`,
          text: shareText,
          url: shareUrl
        })
        onShare?.(badge)
        setShowShareMenu(false)
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err)
        }
      }
    }
  }

  return (
    <div className="relative">
      <Button
        variant={variant}
        size="sm"
        onClick={() => setShowShareMenu(!showShareMenu)}
        className={variant === 'default' ? 'h-9 px-4' : 'h-7 px-2 text-xs'}
      >
        <Share2 className={variant === 'default' ? 'h-4 w-4 mr-2' : 'h-3 w-3 mr-1'} />
        Share Achievement
      </Button>

      {showShareMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowShareMenu(false)}
          />

          {/* Share Menu */}
          <Card className="absolute bottom-full left-0 mb-2 p-3 shadow-lg z-50 min-w-[240px]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">Share Your Achievement</h4>
              <button
                onClick={() => setShowShareMenu(false)}
                className="p-1 rounded-full hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-2">
              {/* Native Share (Mobile) */}
              {navigator.share && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={shareNative}
                  className="w-full justify-start"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share...
                </Button>
              )}

              {/* Twitter/X */}
              <Button
                variant="outline"
                size="sm"
                onClick={shareToTwitter}
                className="w-full justify-start hover:bg-blue-500/10 hover:text-blue-500"
              >
                <Twitter className="h-4 w-4 mr-2" />
                Twitter/X
              </Button>

              {/* Facebook */}
              <Button
                variant="outline"
                size="sm"
                onClick={shareToFacebook}
                className="w-full justify-start hover:bg-blue-600/10 hover:text-blue-600"
              >
                <Facebook className="h-4 w-4 mr-2" />
                Facebook
              </Button>

              {/* LinkedIn */}
              <Button
                variant="outline"
                size="sm"
                onClick={shareToLinkedIn}
                className="w-full justify-start hover:bg-blue-700/10 hover:text-blue-700"
              >
                <Linkedin className="h-4 w-4 mr-2" />
                LinkedIn
              </Button>

              {/* Reddit */}
              <Button
                variant="outline"
                size="sm"
                onClick={shareToReddit}
                className="w-full justify-start hover:bg-orange-500/10 hover:text-orange-500"
              >
                <RedditIcon className="h-4 w-4 mr-2" />
                Reddit
              </Button>

              {/* WhatsApp */}
              <Button
                variant="outline"
                size="sm"
                onClick={shareToWhatsApp}
                className="w-full justify-start hover:bg-green-500/10 hover:text-green-500"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>

              {/* Email */}
              <Button
                variant="outline"
                size="sm"
                onClick={shareViaEmail}
                className="w-full justify-start hover:bg-gray-500/10"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>

              {/* Copy Link */}
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="w-full justify-start"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

export default ShareBadge

