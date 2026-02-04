'use client'

import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LiveRevenueIndicatorProps {
  isLive: boolean
  isSyncing: boolean
  timeSinceUpdate?: number // seconds
  className?: string
}

/**
 * Live Revenue Indicator
 *
 * Shows data freshness status:
 * - Green pulsing dot = Live (< 5 mins old)
 * - Spinning icon = Syncing
 * - Grey = Stale (> 5 mins)
 */
export function LiveRevenueIndicator({
  isLive,
  isSyncing,
  timeSinceUpdate,
  className,
}: LiveRevenueIndicatorProps) {
  const formatTimeSince = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    return `${Math.floor(seconds / 3600)}h ago`
  }

  if (isSyncing) {
    return (
      <Badge
        variant="outline"
        className={cn('bg-zinc-800/50 border-zinc-700 text-zinc-400 gap-1.5', className)}
      >
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span className="text-xs">Syncing...</span>
      </Badge>
    )
  }

  if (isLive) {
    return (
      <Badge
        variant="outline"
        className={cn('bg-green-500/10 border-green-500/30 text-green-400 gap-1.5', className)}
      >
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs">Live</span>
        {timeSinceUpdate !== undefined && timeSinceUpdate > 0 && (
          <span className="text-xs opacity-70">({formatTimeSince(timeSinceUpdate)})</span>
        )}
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className={cn('bg-zinc-800/50 border-zinc-700 text-zinc-500 gap-1.5', className)}
    >
      <div className="w-2 h-2 rounded-full bg-zinc-500" />
      <span className="text-xs">
        {timeSinceUpdate !== undefined && timeSinceUpdate > 0
          ? formatTimeSince(timeSinceUpdate)
          : 'Stale'}
      </span>
    </Badge>
  )
}
