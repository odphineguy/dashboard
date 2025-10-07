import React, { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'

const AVATAR_EMOJIS = [
  '👤', '😊', '😎', '🤓', '🥳', '🤗', '🥰', '😇',
  '🍕', '🍔', '🍟', '🌮', '🍜', '🍱', '🍣', '🍰',
  '🥗', '🥑', '🍎', '🍊', '🍇', '🥕', '🥦', '🧀',
  '🐶', '🐱', '🐼', '🐨', '🦊', '🦁', '🐯', '🐸',
  '🌟', '⭐', '✨', '💫', '🔥', '💎', '🎯', '🏆'
]

const AvatarSelector = ({ currentAvatar, onAvatarSelect, isOpen, onClose }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar)

  const handleSelect = (emoji) => {
    setSelectedAvatar({ emoji, src: null })
  }

  const handleConfirm = () => {
    onAvatarSelect(selectedAvatar)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Choose Your Avatar</h2>
          <p className="text-muted-foreground">Select an emoji to represent your profile</p>
        </div>

        {/* Preview */}
        <div className="mb-6 flex justify-center">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-5xl">
            {selectedAvatar?.emoji || '👤'}
          </div>
        </div>

        {/* Emoji Grid */}
        <div className="grid grid-cols-8 gap-2 mb-6 max-h-64 overflow-y-auto">
          {AVATAR_EMOJIS.map((emoji, index) => (
            <button
              key={index}
              onClick={() => handleSelect(emoji)}
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center text-2xl
                transition-all hover:bg-primary/20
                ${selectedAvatar?.emoji === emoji ? 'bg-primary/30 ring-2 ring-primary' : 'bg-muted/50'}
              `}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={handleConfirm} className="flex-1">
            Save Avatar
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default AvatarSelector

