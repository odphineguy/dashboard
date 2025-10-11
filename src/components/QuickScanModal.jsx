import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '../lib/utils'

const QuickScanModal = ({ isOpen, onClose, mode, onFileSelect }) => {
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Trigger file input immediately when modal opens
      inputRef.current.click()
    }
  }, [isOpen])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file, mode)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-background rounded-lg shadow-xl max-w-md w-full pointer-events-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">
              {mode === 'barcode' ? 'Scan Barcode' : 'Scan Receipt'}
            </h3>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              {mode === 'barcode'
                ? 'Take a photo of the product barcode to identify it.'
                : 'Take a photo of your grocery receipt to extract items.'}
            </p>

            {/* Hidden file input that auto-triggers */}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            <p className="text-xs text-muted-foreground text-center">
              Camera should open automatically
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default QuickScanModal
