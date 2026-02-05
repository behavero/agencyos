'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Building2,
  Loader2,
  Unlink,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConnectAgencyFanvueButton } from './connect-agency-fanvue-button'

interface AgencyFanvueStatusProps {
  className?: string
}

interface ConnectionStatus {
  connected: boolean
  status?: 'active' | 'expired' | 'revoked'
  connectedAt?: string
  lastSyncedAt?: string
  fanvueUserId?: string
  lastSyncError?: string
}

/**
 * AgencyFanvueStatus
 * Phase 60 - SaaS Architecture
 *
 * Displays the agency's Fanvue connection status and provides
 * actions to connect, reconnect, or disconnect.
 */
export function AgencyFanvueStatus({ className }: AgencyFanvueStatusProps) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRevoking, setIsRevoking] = useState(false)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/agency/import', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch status')
      }

      const data = await response.json()
      setStatus(data.fanvueConnection || { connected: false })
    } catch (error) {
      console.error('Failed to fetch agency status:', error)
      toast.error('Failed to load connection status')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleRevoke = async () => {
    if (
      !confirm(
        'Are you sure you want to disconnect the agency Fanvue account? This will stop all agency-level syncing.'
      )
    ) {
      return
    }

    setIsRevoking(true)
    toast.loading('Disconnecting agency account...', { id: 'revoke-agency' })

    try {
      // Call a revoke endpoint (we'll need to create this)
      const response = await fetch('/api/agency/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        toast.success('Agency account disconnected', { id: 'revoke-agency' })
        setStatus({ connected: false })
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch (error) {
      console.error('Failed to revoke:', error)
      toast.error('Failed to disconnect agency account', { id: 'revoke-agency' })
    } finally {
      setIsRevoking(false)
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Agency Fanvue Connection
          </CardTitle>
          <CardDescription>Loading connection status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = () => {
    if (!status?.connected) {
      return <Badge variant="secondary">Not Connected</Badge>
    }

    switch (status.status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Connected</Badge>
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>
      case 'revoked':
        return <Badge variant="outline">Revoked</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getStatusIcon = () => {
    if (!status?.connected) {
      return <XCircle className="w-12 h-12 text-muted-foreground" />
    }

    switch (status.status) {
      case 'active':
        return <CheckCircle2 className="w-12 h-12 text-green-500" />
      case 'expired':
        return <AlertCircle className="w-12 h-12 text-amber-500" />
      case 'revoked':
        return <Unlink className="w-12 h-12 text-muted-foreground" />
      default:
        return <XCircle className="w-12 h-12 text-muted-foreground" />
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Agency Fanvue Connection
          </CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Connect your agency&apos;s Fanvue admin account to sync all creators
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Display */}
        <div className="flex items-center gap-4">
          {getStatusIcon()}
          <div className="flex-1">
            {status?.connected ? (
              <>
                <p className="font-medium">
                  {status.status === 'active'
                    ? 'Agency account connected'
                    : `Connection ${status.status}`}
                </p>
                {status.connectedAt && (
                  <p className="text-sm text-muted-foreground">
                    Connected on {new Date(status.connectedAt).toLocaleDateString()}
                  </p>
                )}
                {status.lastSyncedAt && (
                  <p className="text-sm text-muted-foreground">
                    Last synced: {new Date(status.lastSyncedAt).toLocaleString()}
                  </p>
                )}
                {status.lastSyncError && (
                  <p className="text-sm text-destructive mt-1">Error: {status.lastSyncError}</p>
                )}
              </>
            ) : (
              <>
                <p className="font-medium">No agency connection</p>
                <p className="text-sm text-muted-foreground">
                  Connect your Fanvue agency admin account to enable auto-discovery and syncing
                </p>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {status?.connected && status.status === 'active' ? (
            <>
              <ConnectAgencyFanvueButton variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reconnect
              </ConnectAgencyFanvueButton>
              <Button variant="ghost" size="sm" onClick={handleRevoke} disabled={isRevoking}>
                {isRevoking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <Unlink className="w-4 h-4 mr-2" />
                    Disconnect
                  </>
                )}
              </Button>
            </>
          ) : (
            <ConnectAgencyFanvueButton>
              {status?.status === 'expired' ? 'Reconnect Agency' : 'Connect Agency Account'}
            </ConnectAgencyFanvueButton>
          )}
        </div>

        {/* Info Box */}
        <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
          <p className="font-medium flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            What does this do?
          </p>
          <ul className="text-muted-foreground space-y-1 ml-6 list-disc">
            <li>Auto-discover all creators in your Fanvue agency</li>
            <li>Sync earnings and transactions for all creators</li>
            <li>Access agency-level analytics and reports</li>
            <li>Requires a Fanvue account with agency admin/owner permissions</li>
          </ul>
        </div>

        {/* Security Note */}
        <p className="text-xs text-muted-foreground">
          <strong>Security:</strong> Your tokens are encrypted and stored securely. We use OAuth 2.0
          with PKCE for secure authentication. You can revoke access at any time.
        </p>
      </CardContent>
    </Card>
  )
}
