'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function SyncButton() {
  const router = useRouter()
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch('/api/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`✅ Synced ${result.transactionsSynced} transactions!`, {
          description: 'Dashboard data has been updated',
        })
        // Refresh the page to show new data
        router.refresh()
      } else {
        toast.error('Sync failed', {
          description: result.error || 'Please try again',
        })
      }
    } catch (error) {
      toast.error('Failed to sync', {
        description: 'Check your connection and try again',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      variant="outline"
      className="gap-2"
      title="Sync Fanvue transactions"
    >
      <RefreshCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
      {isSyncing ? 'Syncing...' : 'Sync Fanvue Data'}
    </Button>
  )
}
