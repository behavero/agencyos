'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ConnectionStatusProps {
  className?: string
  showLabel?: boolean
}

export function AlfredConnectionStatus({ className, showLabel = true }: ConnectionStatusProps) {
  const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('connecting')
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  useEffect(() => {
    let ws: WebSocket | null = null
    let retryTimeout: NodeJS.Timeout | null = null
    let mounted = true

    const checkConnection = () => {
      if (!mounted) return
      
      setStatus('connecting')
      
      try {
        // Try to connect to OpenClaw default port
        ws = new WebSocket('ws://127.0.0.1:18789')
        
        ws.onopen = () => {
          if (mounted) {
            setStatus('online')
            setLastCheck(new Date())
          }
          ws?.close()
        }
        
        ws.onerror = () => {
          if (mounted) {
            setStatus('offline')
            setLastCheck(new Date())
          }
        }
        
        ws.onclose = () => {
          // Schedule retry
          if (mounted) {
            retryTimeout = setTimeout(checkConnection, 30000) // Retry every 30s
          }
        }
      } catch (error) {
        if (mounted) {
          setStatus('offline')
          setLastCheck(new Date())
        }
      }
    }

    // Initial check
    checkConnection()

    return () => {
      mounted = false
      ws?.close()
      if (retryTimeout) clearTimeout(retryTimeout)
    }
  }, [])

  const statusConfig = {
    connecting: {
      color: 'bg-yellow-500',
      label: 'Connecting...',
      pulse: true,
    },
    online: {
      color: 'bg-green-500',
      label: '🟢 Online',
      pulse: false,
    },
    offline: {
      color: 'bg-red-500',
      label: '🔴 Offline (Check Terminal)',
      pulse: false,
    },
  }

  const config = statusConfig[status]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <div className={cn(
          'w-2.5 h-2.5 rounded-full',
          config.color,
          config.pulse && 'animate-pulse'
        )} />
        {config.pulse && (
          <div className={cn(
            'absolute inset-0 rounded-full animate-ping',
            config.color,
            'opacity-75'
          )} />
        )}
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {config.label}
        </span>
      )}
    </div>
  )
}
