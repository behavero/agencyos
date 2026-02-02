'use client'

import { MessageSquare, DollarSign, Image, Repeat } from 'lucide-react'
import type { CategoryBreakdown } from '@/lib/services/analytics-engine'

const CATEGORY_ICONS: Record<string, any> = {
  Subscription: Repeat,
  Tip: DollarSign,
  Message: MessageSquare,
  Post: Image,
}

const CATEGORY_COLORS: Record<string, string> = {
  Subscription: '#a3e635', // Lime
  Tip: '#22d3ee', // Cyan
  Message: '#a855f7', // Purple
  Post: '#f59e0b', // Amber
  Renewal: '#10b981', // Emerald
  Referral: '#ec4899', // Pink
  Other: '#6b7280', // Gray
}

interface EarningsBreakdownProps {
  data: CategoryBreakdown[]
  currency?: string
}

export function EarningsBreakdown({ data, currency = 'USD' }: EarningsBreakdownProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>No earnings data available yet.</p>
        <p className="text-sm mt-2">Sync your Fanvue transactions to see breakdown.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.map(category => {
        const Icon = CATEGORY_ICONS[category.category] || DollarSign
        const color = CATEGORY_COLORS[category.category] || '#6b7280'

        return (
          <div key={category.category} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div>
                  <span className="font-medium text-sm">{category.category}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({category.transactionCount})
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm" style={{ color }}>
                  {formatCurrency(category.amount)}
                </div>
                <div className="text-xs text-muted-foreground">{category.percentage}%</div>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${category.percentage}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
