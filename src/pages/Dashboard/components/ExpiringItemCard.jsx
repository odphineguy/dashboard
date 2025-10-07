import React from 'react'
import { Package, Check, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/button'

const ExpiringItemCard = ({ item }) => {
  const getUrgencyConfig = (status) => {
    switch (status) {
      case 'expired':
        return {
          label: 'Expired',
          bgColor: 'bg-red-600',
          textColor: 'text-white',
          borderColor: 'border-red-600'
        }
      case 'expires-today':
        return {
          label: 'Expires Today',
          bgColor: 'bg-red-500',
          textColor: 'text-white',
          borderColor: 'border-red-500'
        }
      case 'expiring-soon':
        return {
          label: 'Expiring Soon',
          bgColor: 'bg-orange-500',
          textColor: 'text-white',
          borderColor: 'border-orange-500'
        }
      default:
        return {
          label: 'Fresh',
          bgColor: 'bg-green-500',
          textColor: 'text-white',
          borderColor: 'border-green-500'
        }
    }
  }

  const urgencyConfig = getUrgencyConfig(item?.status)

  const formatExpiryDate = (date) => {
    const today = new Date()
    const expiryDate = new Date(date)
    const diffTime = expiryDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`
    } else if (diffDays === 0) {
      return 'Expires today'
    } else if (diffDays === 1) {
      return 'Expires tomorrow'
    } else {
      return `Expires in ${diffDays} days`
    }
  }

  return (
    <div className={`bg-card rounded-lg border ${urgencyConfig?.borderColor} p-4 min-w-[280px] hover:shadow-md transition-all duration-200 flex flex-col`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 shadow-sm flex items-center justify-center">
          {item?.image ? (
            <img
              src={item.image}
              alt={item?.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Package className="w-10 h-10 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate mb-1">{item?.name}</h3>
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${urgencyConfig?.bgColor} ${urgencyConfig?.textColor}`}>
            {urgencyConfig?.label}
          </span>
        </div>
      </div>

      <div className="flex items-center text-sm text-muted-foreground mb-3">
        <Package size={14} className="mr-1.5" />
        <span className="truncate">{item?.quantity}</span>
      </div>

      <div className="flex items-center gap-2 mt-auto">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs border-green-500 text-green-600 hover:bg-green-50"
        >
          <Check className="h-3 w-3 mr-1" />
          Consumed
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs border-red-500 text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Wasted
        </Button>
      </div>
    </div>
  )
}

export default ExpiringItemCard
