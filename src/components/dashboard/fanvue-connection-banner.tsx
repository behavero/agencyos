'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Link2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Fanvue Connection Status Banner
 *
 * Shows a warning banner when the agency's Fanvue connection is expired
 * or missing, with a direct link to re-authorize.
 * Hidden when connection is healthy.
 */
export function FanvueConnectionBanner({ agencyId }: { agencyId?: string }) {
  const { data: connectionStatus } = useQuery({
    queryKey: ['fanvue-connection-status', agencyId],
    queryFn: async () => {
      const res = await fetch('/api/agency/connection-status')
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!agencyId,
    staleTime: 60_000, // Check every 60 seconds
    refetchInterval: 60_000,
  })

  // Don't render anything while loading or when connection is healthy
  if (!connectionStatus) return null
  if (connectionStatus.connected && connectionStatus.status === 'active') return null

  // Determine banner state
  const isExpired = connectionStatus.status === 'expired'
  const isRevoked = connectionStatus.status === 'revoked'
  const isMissing = !connectionStatus.status

  if (!isExpired && !isRevoked && !isMissing) return null

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-200">
            {isExpired
              ? 'Fanvue connection expired'
              : isRevoked
                ? 'Fanvue connection revoked'
                : 'Fanvue not connected'}
          </p>
          <p className="text-xs text-amber-200/70">
            {isExpired
              ? 'Your OAuth token expired. Reconnect to resume syncing transactions, messages, and stats.'
              : isRevoked
                ? 'The connection was manually revoked. Reconnect to restore agency sync.'
                : 'Connect your Fanvue agency account to start syncing data.'}
          </p>
        </div>
      </div>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="gap-2 border-amber-500/40 text-amber-200 hover:bg-amber-500/20 shrink-0"
      >
        <a href="/api/oauth/agency/login">
          <Link2 className="w-4 h-4" />
          {isMissing ? 'Connect Fanvue' : 'Reconnect Fanvue'}
        </a>
      </Button>
    </div>
  )
}
