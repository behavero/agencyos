'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

/**
 * Global Error Boundary
 * Catches unhandled errors in the entire application
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('[Global Error]', error)
    
    // TODO: Send to Sentry or other error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Could integrate with logger here
      fetch('/api/errors/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          digest: error.digest,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Silent fail
      })
    }
  }, [error])

  return (
    <html>
      <body className="bg-zinc-950 text-zinc-50">
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="text-center space-y-6">
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
                    <div className="relative w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30">
                      <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    System Malfunction
                  </h1>
                  <p className="text-muted-foreground">
                    OnyxOS encountered an unexpected error. Our team has been notified.
                  </p>
                </div>

                {/* Error details (only in dev) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 text-left">
                    <p className="text-xs font-mono text-red-400 mb-2">
                      {error.message}
                    </p>
                    {error.digest && (
                      <p className="text-xs text-zinc-500">
                        Error ID: {error.digest}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    onClick={reset}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/dashboard'}
                    className="w-full"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Return to Dashboard
                  </Button>
                </div>

                {/* Support info */}
                <p className="text-xs text-muted-foreground">
                  If this persists, contact{' '}
                  <a href="mailto:support@onyxos.io" className="text-primary hover:underline">
                    support@onyxos.io
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}
