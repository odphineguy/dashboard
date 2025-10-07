import React, { useState } from 'react'
import { Share2, Twitter, Facebook, Linkedin, Link, Check, X } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'

const ShareBadge = ({ badge, userName = 'User', onShare }) => {
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  // Generate share text
  const shareText = `🏆 I just earned the "${badge.name}" badge in Meal Saver Dashboard! ${badge.description}`
  const shareUrl = window.location.origin + '/profile'
  const shareHashtags = ['MealSaver', 'FoodWaste', 'Sustainability', 'Achievement']

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
        variant="ghost"
        size="sm"
        onClick={() => setShowShareMenu(!showShareMenu)}
        className="h-7 px-2 text-xs"
      >
        <Share2 className="h-3 w-3 mr-1" />
        Share
      </Button>

      {showShareMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowShareMenu(false)}
          />

          {/* Share Menu */}
          <Card className="absolute bottom-full left-0 mb-2 p-3 shadow-lg z-50 min-w-[200px]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">Share Achievement</h4>
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
                className="w-full justify-start hover:bg-blue-500/10"
              >
                <Twitter className="h-4 w-4 mr-2" />
                Twitter/X
              </Button>

              {/* Facebook */}
              <Button
                variant="outline"
                size="sm"
                onClick={shareToFacebook}
                className="w-full justify-start hover:bg-blue-600/10"
              >
                <Facebook className="h-4 w-4 mr-2" />
                Facebook
              </Button>

              {/* LinkedIn */}
              <Button
                variant="outline"
                size="sm"
                onClick={shareToLinkedIn}
                className="w-full justify-start hover:bg-blue-700/10"
              >
                <Linkedin className="h-4 w-4 mr-2" />
                LinkedIn
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

