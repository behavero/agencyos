'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  children: React.ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary for dashboard cards.
 * Catches rendering errors and shows a recovery UI instead of crashing the entire page.
 */
export class CardErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CardErrorBoundary]', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              {this.props.fallbackTitle || 'Something went wrong'}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs text-center">
              {this.state.error?.message ||
                'An unexpected error occurred while rendering this card.'}
            </p>
            <Button size="sm" variant="outline" onClick={this.handleRetry} className="mt-2">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
