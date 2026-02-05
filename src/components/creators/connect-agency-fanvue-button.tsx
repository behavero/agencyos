'use client'

import { Button } from '@/components/ui/button'
import { ExternalLink, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface ConnectAgencyFanvueButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  children?: React.ReactNode
}

/**
 * ConnectAgencyFanvueButton
 * Phase 60 - SaaS Architecture
 *
 * This button initiates the OAuth flow for AGENCY-LEVEL Fanvue connection.
 * Agency admins connect their own Fanvue account (not a model's) to manage
 * all creators in the agency.
 *
 * Scopes requested: read:agency, read:creators, read:team, read:earnings
 */
export function ConnectAgencyFanvueButton({
  variant = 'default',
  size = 'default',
  className,
  children,
}: ConnectAgencyFanvueButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    setIsConnecting(true)
    toast.info('Redirecting to Fanvue for agency authorization...')

    try {
      // Redirect to agency OAuth login endpoint
      window.location.href = '/api/oauth/agency/login'
    } catch (error) {
      console.error('Agency connection error:', error)
      toast.error('Failed to start agency connection process')
      setIsConnecting(false)
    }
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isConnecting}
      variant={variant}
      size={size}
      className={className}
    >
      {isConnecting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <ExternalLink className="w-4 h-4 mr-2" />
          {children || 'Connect Agency Fanvue'}
        </>
      )}
    </Button>
  )
}
