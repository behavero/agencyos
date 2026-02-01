'use client'

import { cn } from '@/lib/utils'

interface AlfredConnectionStatusProps {
  showLabel?: boolean
  className?: string
}

/**
 * Alfred connection status indicator
 * Now using cloud-based AI (Vercel AI SDK + OpenAI)
 */
export function AlfredConnectionStatus({ 
  showLabel = true, 
  className 
}: AlfredConnectionStatusProps) {
  // Cloud AI is always "connected" when the API is available
  const isConnected = true

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div
        className={cn(
          'w-2 h-2 rounded-full',
          isConnected 
            ? 'bg-primary animate-pulse' 
            : 'bg-destructive'
        )}
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {isConnected ? 'Cloud AI Ready' : 'Offline'}
        </span>
      )}
    </div>
  )
}
