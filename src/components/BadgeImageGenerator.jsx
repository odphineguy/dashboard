import React, { useRef } from 'react'
import { Trophy, Download } from 'lucide-react'
import { Button } from './ui/button'

/**
 * BadgeImageGenerator - Creates a downloadable image card for achievements
 * Can be used to generate social media share images
 */
const BadgeImageGenerator = ({ badge, userName = 'User', onGenerate }) => {
  const canvasRef = useRef(null)

  const generateImage = async () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    // Set canvas size (optimized for social media)
    canvas.width = 1200
    canvas.height = 630

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, '#3b82f6') // Blue
    gradient.addColorStop(1, '#8b5cf6') // Purple
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Add pattern overlay
    ctx.globalAlpha = 0.1
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 3,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // White card background
    const padding = 60
    const cardX = padding
    const cardY = padding
    const cardWidth = canvas.width - padding * 2
    const cardHeight = canvas.height - padding * 2
    const borderRadius = 24

    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, borderRadius)
    ctx.fill()

    // Trophy emoji or icon (large)
    ctx.font = 'bold 120px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('🏆', canvas.width / 2, 220)

    // Badge name
    ctx.fillStyle = '#1f2937'
    ctx.font = 'bold 56px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(badge.name, canvas.width / 2, 320)

    // Badge description
    ctx.fillStyle = '#6b7280'
    ctx.font = '32px system-ui, -apple-system, sans-serif'
    const maxWidth = cardWidth - 120
    wrapText(ctx, badge.description, canvas.width / 2, 380, maxWidth, 40)

    // User name
    ctx.fillStyle = '#3b82f6'
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
    ctx.fillText(`Earned by ${userName}`, canvas.width / 2, 500)

    // Date
    if (badge.earnedDate) {
      ctx.fillStyle = '#9ca3af'
      ctx.font = '28px system-ui, -apple-system, sans-serif'
      ctx.fillText(badge.earnedDate, canvas.width / 2, 540)
    }

    // Footer text
    ctx.fillStyle = '#d1d5db'
    ctx.font = '24px system-ui, -apple-system, sans-serif'
    ctx.fillText('Meal Saver Dashboard', canvas.width / 2, canvas.height - 40)

    // Convert to blob and download
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${badge.name.replace(/\s+/g, '-').toLowerCase()}-achievement.png`
      link.click()
      URL.revokeObjectURL(url)
      onGenerate?.(badge)
    }, 'image/png')
  }

  // Helper function to wrap text
  const wrapText = (context, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(' ')
    let line = ''
    let lineCount = 0

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' '
      const metrics = context.measureText(testLine)
      const testWidth = metrics.width

      if (testWidth > maxWidth && n > 0) {
        context.fillText(line, x, y + (lineCount * lineHeight))
        line = words[n] + ' '
        lineCount++
      } else {
        line = testLine
      }
    }
    context.fillText(line, x, y + (lineCount * lineHeight))
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={generateImage}
      className="h-7 px-2 text-xs"
    >
      <Download className="h-3 w-3 mr-1" />
      Image
    </Button>
  )
}

export default BadgeImageGenerator

