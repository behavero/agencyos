'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RefreshCcw, ChevronDown, Database, Users, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function SyncButton() {
  const router = useRouter()
  const [isSyncing, setIsSyncing] = useState(false)
  const [showReconnect, setShowReconnect] = useState(false)

  /**
   * PHASE 59: Agency SaaS Loop
   * Auto-discovers all creators and syncs their transactions
   */
  const handleAgencySync = async () => {
    setIsSyncing(true)

    toast.loading('🏢 Starting Agency Sync...', { id: 'sync-toast' })

    try {
      const response = await fetch('/api/agency/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      // Handle non-JSON responses (timeouts, 502, etc.)
      let result
      try {
        result = await response.json()
      } catch {
        toast.error('Sync request failed', {
          id: 'sync-toast',
          description: `Server returned ${response.status}. The sync may have timed out — try again in a minute.`,
          duration: 8000,
        })
        return
      }

      if (result.success) {
        // Format creator names for display
        const creatorNames =
          result.syncResults
            ?.filter((r: { success: boolean }) => r.success)
            .map((r: { creatorName: string }) => r.creatorName)
            .join(', ') || 'none'

        const totalEarnings =
          result.summary?.totalEarnings ?? result.summary?.totalTransactions ?? 0

        toast.success(`✅ Agency Sync Complete!`, {
          id: 'sync-toast',
          description: `Synced ${result.summary?.successfulSyncs ?? 0} creators: ${creatorNames}\n💰 ${totalEarnings} total earnings`,
          duration: 5000,
        })
        router.refresh()
      } else {
        // Get the actual error message for display
        const errorMsg = result.error || result.message || result.details || 'Unknown error'

        // Detect connection issues and show reconnect action
        const isConnectionIssue =
          errorMsg.includes('NO_AGENCY_FANVUE_CONNECTION') ||
          errorMsg.includes('token refresh failed') ||
          errorMsg.includes('expired') ||
          errorMsg.includes('reconnect')

        if (isConnectionIssue) {
          setShowReconnect(true)
          toast.error('Fanvue connection expired', {
            id: 'sync-toast',
            description: 'Click "Reconnect Fanvue" to re-authorize your account.',
            duration: 10000,
          })
        } else {
          toast.error('Agency sync failed', {
            id: 'sync-toast',
            description: errorMsg,
            duration: 8000,
          })
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Network error'
      toast.error('Failed to sync agency', {
        id: 'sync-toast',
        description: `${msg}. Check your connection and try again.`,
      })
    } finally {
      setIsSyncing(false)
    }
  }

  /**
   * Quick/Force sync for existing models
   */
  const handleSync = async (forceAll = false) => {
    setIsSyncing(true)

    const syncType = forceAll ? 'Full History Sync' : 'Quick Sync'
    toast.loading(
      forceAll
        ? '🔴 Resetting sync cursor... This will fetch ALL historical data.'
        : '🔄 Syncing new transactions...',
      { id: 'sync-toast' }
    )

    try {
      const response = await fetch('/api/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceAll }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`✅ ${syncType} Complete!`, {
          id: 'sync-toast',
          description: `Synced ${result.transactionsSynced} transactions`,
        })
        router.refresh()
      } else {
        toast.error('Sync failed', {
          id: 'sync-toast',
          description: result.error || 'Please try again',
        })
      }
    } catch (error) {
      toast.error('Failed to sync', {
        id: 'sync-toast',
        description: 'Check your connection and try again',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  /**
   * Recalculate revenue from existing transactions (no Fanvue API needed)
   */
  const handleRecalculateRevenue = async () => {
    setIsSyncing(true)
    toast.loading('💰 Recalculating revenue from transactions...', { id: 'sync-toast' })

    try {
      const response = await fetch('/api/revenue/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`✅ Revenue Recalculated!`, {
          id: 'sync-toast',
          description: `Total Revenue: ${result.totalRevenueFormatted}\n${result.message}`,
          duration: 5000,
        })
        router.refresh()
      } else {
        toast.error('Recalculation failed', {
          id: 'sync-toast',
          description: result.error || 'Please try again',
        })
      }
    } catch (error) {
      toast.error('Failed to recalculate revenue', {
        id: 'sync-toast',
        description: 'Check your connection and try again',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex gap-1">
      {/* Reconnect button -- shown when connection is expired */}
      {showReconnect && (
        <Button
          asChild
          variant="destructive"
          className="gap-2"
          title="Re-authorize your Fanvue account"
        >
          <a href="/api/oauth/agency/login">
            <Link2 className="w-4 h-4" />
            Reconnect Fanvue
          </a>
        </Button>
      )}

      {/* PHASE 59: Agency Sync Button - The main CTA */}
      <Button
        onClick={handleAgencySync}
        disabled={isSyncing}
        variant={showReconnect ? 'outline' : 'default'}
        className="gap-2"
        title="Auto-discover and sync all agency creators"
      >
        <Users className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
        {isSyncing ? 'Syncing Agency...' : 'Sync Agency'}
      </Button>

      {/* Dropdown for Advanced Options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" disabled={isSyncing} title="Sync options">
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Sync Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleAgencySync} className="gap-2">
            <Users className="w-4 h-4" />
            <div>
              <div className="font-medium">🏢 Agency Sync (Recommended)</div>
              <div className="text-xs text-muted-foreground">
                Auto-discovers + syncs all creators
              </div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleSync(false)} className="gap-2">
            <RefreshCcw className="w-4 h-4" />
            <div>
              <div className="font-medium">Quick Sync</div>
              <div className="text-xs text-muted-foreground">Fetch new transactions only</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleSync(true)}
            className="gap-2 text-orange-600 dark:text-orange-400"
          >
            <Database className="w-4 h-4" />
            <div>
              <div className="font-medium">🔴 Force Full Sync</div>
              <div className="text-xs text-muted-foreground">
                Resets cursor, fetches ALL history
              </div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleRecalculateRevenue}
            className="gap-2 text-green-600 dark:text-green-400"
          >
            <RefreshCcw className="w-4 h-4" />
            <div>
              <div className="font-medium">💰 Fix Revenue Now</div>
              <div className="text-xs text-muted-foreground">
                Recalculate from existing data (no API)
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
