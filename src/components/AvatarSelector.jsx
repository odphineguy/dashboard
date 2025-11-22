import React, { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'

// Custom avatars from the avatars folder
const CUSTOM_AVATARS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  src: `/avatars/avatar-${i + 1}.png`,
  name: `Avatar ${i + 1}`
}))

const AvatarSelector = ({ currentAvatar, onAvatarSelect, isOpen, onClose }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar)

  const handleSelect = (avatar) => {
    setSelectedAvatar({ src: avatar.src, name: avatar.name, emoji: null })
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
          <p className="text-muted-foreground">Select a custom avatar for your profile</p>
        </div>

        {/* Preview */}
        <div className="mb-6 flex justify-center">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {selectedAvatar?.src ? (
              <img
                src={selectedAvatar.src}
                alt={selectedAvatar.name || 'Avatar'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-5xl">👤</div>
            )}
          </div>
        </div>

        {/* Avatar Grid */}
        <div className="grid grid-cols-5 gap-3 mb-6 max-h-80 overflow-y-auto">
          {CUSTOM_AVATARS.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => handleSelect(avatar)}
              className={`
                aspect-square rounded-lg overflow-hidden
                transition-all hover:scale-105
                ${selectedAvatar?.src === avatar.src ? 'ring-4 ring-primary' : 'ring-1 ring-border'}
              `}
            >
              <img
                src={avatar.src}
                alt={avatar.name}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="flex-1">
            Save Avatar
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default AvatarSelector

