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
import { RefreshCcw, ChevronDown, Database } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function SyncButton() {
  const router = useRouter()
  const [isSyncing, setIsSyncing] = useState(false)

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
        // Refresh the page to show new data
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

  return (
    <div className="flex gap-1">
      {/* Quick Sync Button */}
      <Button
        onClick={() => handleSync(false)}
        disabled={isSyncing}
        variant="outline"
        className="gap-2"
        title="Sync new Fanvue transactions"
      >
        <RefreshCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? 'Syncing...' : 'Sync Fanvue'}
      </Button>

      {/* Dropdown for Advanced Options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" disabled={isSyncing} title="Sync options">
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Sync Options</DropdownMenuLabel>
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
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
