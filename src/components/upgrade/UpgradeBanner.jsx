import React, { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { Button } from '../ui/button'
import UpgradeModal from './UpgradeModal'

const UpgradeBanner = ({ message, onClose, showClose = true }) => {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-lg shadow-lg mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="bg-white/20 p-2 rounded-full">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {message || 'Upgrade to Premium to unlock this feature'}
              </p>
              <p className="text-sm text-white/80 mt-1">
                Get unlimited access, advanced analytics, and priority support
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Button
              onClick={() => setShowModal(true)}
              variant="secondary"
              size="sm"
              className="bg-white text-green-600 hover:bg-white/90"
            >
              Upgrade Now
            </Button>
            {showClose && onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <UpgradeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  )
}

export default UpgradeBanner
