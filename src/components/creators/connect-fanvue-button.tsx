'use client'

import { Button } from '@/components/ui/button'
import { ExternalLink, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface ConnectFanvueButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function ConnectFanvueButton({
  variant = 'default',
  size = 'default',
  className,
}: ConnectFanvueButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    setIsConnecting(true)
    toast.info('Redirecting to Fanvue...')

    try {
      // Redirect to OAuth login endpoint
      window.location.href = '/api/oauth/login'
    } catch (error) {
      console.error('Connection error:', error)
      toast.error('Failed to start connection process')
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
          Connect with Fanvue
        </>
      )}
    </Button>
  )
}
