'use client'

import { Button } from '@/components/ui/button'
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ConnectAgencyFanvueButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  children?: React.ReactNode
}

/**
 * ConnectAgencyFanvueButton
 *
 * Smart button that handles both:
 * 1. Initial OAuth connection to Fanvue (if not yet connected)
 * 2. Re-syncing / re-importing creators (if already connected)
 *
 * After OAuth, the callback auto-imports all agency creators.
 */
export function ConnectAgencyFanvueButton({
  variant = 'default',
  size = 'default',
  className,
  children,
}: ConnectAgencyFanvueButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)

  // Check if agency already has a Fanvue connection
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/agency/import')
        if (res.ok) {
          const data = await res.json()
          setIsConnected(data.fanvueConnection?.connected === true)
        }
      } catch {
        // Ignore — will default to "not connected"
      } finally {
        setCheckingStatus(false)
      }
    }
    checkStatus()
  }, [])

  const handleClick = async () => {
    setIsLoading(true)

    if (isConnected) {
      // Already connected — re-import creators
      toast.loading('Syncing creators from Fanvue...', { id: 'agency-import' })
      try {
        const response = await fetch('/api/agency/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        const result = await response.json()

        if (result.success) {
          toast.success(
            `Synced! ${result.imported} new, ${result.updated} updated (${result.total} total)`,
            { id: 'agency-import', duration: 5000 }
          )
          router.refresh()
        } else {
          toast.error(result.error || 'Import failed', { id: 'agency-import' })
        }
      } catch {
        toast.error('Sync failed — check your connection', { id: 'agency-import' })
      } finally {
        setIsLoading(false)
      }
    } else {
      // Not connected — start OAuth flow (auto-imports after connection)
      toast.info('Redirecting to Fanvue for authorization...')
      window.location.href = '/api/oauth/agency/login'
    }
  }

  if (checkingStatus) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </Button>
    )
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      variant={isConnected ? 'outline' : variant}
      size={size}
      className={isConnected ? className : `${className || ''} bg-green-600 hover:bg-green-700`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {isConnected ? 'Syncing...' : 'Connecting...'}
        </>
      ) : isConnected ? (
        <>
          <RefreshCw className="w-4 h-4 mr-2" />
          {children || 'Sync Creators'}
        </>
      ) : (
        <>
          <ExternalLink className="w-4 h-4 mr-2" />
          {children || 'Connect Fanvue'}
        </>
      )}
    </Button>
  )
}
