'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'

/**
 * Messages Page Error Boundary
 *
 * Catches and displays errors specific to the messages page
 * Shows actual error message for debugging
 */
export default function MessagesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('[Messages Error Boundary]:', error)
    console.error('Error stack:', error.stack)
    console.error('Error digest:', error.digest)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 p-4">
      <Card className="max-w-2xl w-full border-red-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-red-500/10">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-xl">Messages Page Error</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                The chat interface encountered an unexpected error
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Details */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <p className="text-sm font-medium text-red-400 mb-2">Error Message:</p>
            <p className="text-sm text-zinc-300 font-mono">{error.message || 'Unknown error'}</p>
            {error.digest && <p className="text-xs text-zinc-500 mt-2">Digest: {error.digest}</p>}
          </div>

          {/* Common Causes */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <p className="text-sm font-medium text-zinc-300 mb-2">Common Causes:</p>
            <ul className="text-sm text-zinc-400 space-y-1 list-disc list-inside">
              <li>TanStack Query context not available</li>
              <li>Zustand store initialization failed</li>
              <li>Invalid chat data from API</li>
              <li>Missing required props or environment variables</li>
              <li>React hooks called outside component tree</li>
            </ul>
          </div>

          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && error.stack && (
            <details className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <summary className="text-sm font-medium text-zinc-300 cursor-pointer">
                Stack Trace (Development Only)
              </summary>
              <pre className="text-xs text-zinc-400 mt-2 overflow-x-auto whitespace-pre-wrap">
                {error.stack}
              </pre>
            </details>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={reset} className="flex-1 gap-2" variant="default">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
            <Button
              onClick={() => (window.location.href = '/dashboard')}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Home className="w-4 h-4" />
              Return to Dashboard
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-center text-zinc-500">
            If this error persists, please contact{' '}
            <a href="mailto:support@onyxos.io" className="text-primary hover:underline">
              support@onyxos.io
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
