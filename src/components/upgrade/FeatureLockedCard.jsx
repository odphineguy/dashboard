import React, { useState } from 'react'
import { Lock } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import UpgradeModal from './UpgradeModal'

const FeatureLockedCard = ({ featureName, requiredTier = 'Premium' }) => {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
        <CardContent className="p-8 text-center">
          <div className="inline-flex p-4 rounded-full bg-gray-200 mb-4">
            <Lock className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {featureName} is Locked
          </h3>
          <p className="text-muted-foreground mb-4">
            Upgrade to {requiredTier} to unlock this feature and get access to unlimited features.
          </p>
          <Button
            onClick={() => setShowModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            Upgrade to {requiredTier}
          </Button>
        </CardContent>
      </Card>

      <UpgradeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  )
}

export default FeatureLockedCard
