'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MonthlyEarning {
  month: string
  year: number
  net: number
  gross: number
  fees: number
  transactions: {
    category: string
    amount: number
    count: number
  }[]
}

interface MonthlyEarningsListProps {
  data: MonthlyEarning[]
}

export function MonthlyEarningsList({ data }: MonthlyEarningsListProps) {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())

  const toggleMonth = (key: string) => {
    const newExpanded = new Set(expandedMonths)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedMonths(newExpanded)
  }

  const formatMonthYear = (month: string, year: number) => {
    return `${month} ${year}`
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Monthly Earnings</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
            >
              Earnings
            </Button>
            <Button variant="ghost" size="sm" className="text-zinc-400">
              Monthly Earnings
            </Button>
            <Button variant="ghost" size="sm" className="text-zinc-400">
              Subscribers
            </Button>
            <Button variant="ghost" size="sm" className="text-zinc-400">
              Content
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map(earning => {
          const key = `${earning.month}-${earning.year}`
          const isExpanded = expandedMonths.has(key)

          return (
            <div
              key={key}
              className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/50"
            >
              <button
                onClick={() => toggleMonth(key)}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
              >
                <span className="text-white font-medium">
                  {formatMonthYear(earning.month, earning.year)}
                </span>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-white font-semibold">NET ${earning.net.toFixed(2)}</div>
                    {earning.net > 0 && (
                      <div className="text-xs text-zinc-500">
                        Gross: ${earning.gross.toFixed(2)} | Fees: ${earning.fees.toFixed(2)}
                      </div>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-zinc-400" />
                  )}
                </div>
              </button>

              {isExpanded && earning.transactions.length > 0 && (
                <div className="border-t border-zinc-800 p-4 bg-zinc-950/50">
                  <div className="space-y-2">
                    {earning.transactions.map((txn, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full',
                              txn.category === 'message' && 'bg-orange-500',
                              txn.category === 'subscription' && 'bg-pink-500',
                              txn.category === 'tip' && 'bg-blue-500',
                              txn.category === 'post' && 'bg-purple-500'
                            )}
                          />
                          <span className="text-sm text-zinc-300 capitalize">{txn.category}s</span>
                          <span className="text-xs text-zinc-500">({txn.count} transactions)</span>
                        </div>
                        <span className="text-sm font-medium text-white">
                          ${txn.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {data.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <p>No earnings data yet</p>
            <p className="text-sm mt-2">Data will appear as transactions are processed</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
