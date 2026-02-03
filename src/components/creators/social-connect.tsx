'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Instagram, CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SocialConnectProps {
  modelId: string
  modelName: string
  // Current connection status
  instagramUsername?: string | null
  instagramConnected?: boolean
  instagramTokenExpires?: string | null
  // Fanvue status for reference
  fanvueConnected?: boolean
}

export function SocialConnect({
  modelId,
  modelName,
  instagramUsername,
  instagramConnected,
  instagramTokenExpires,
  fanvueConnected,
}: SocialConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleInstagramConnect = () => {
    setIsConnecting(true)
    // Redirect to Meta OAuth flow
    window.location.href = `/api/auth/meta/login?modelId=${modelId}`
  }

  const isTokenExpiringSoon = instagramTokenExpires
    ? new Date(instagramTokenExpires).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 // 7 days
    : false

  const formatExpiryDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">🔗</span>
          Social Connections
        </CardTitle>
        <CardDescription>
          Connect social accounts for {modelName} to track reach and traffic
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instagram Connection */}
        <div className={cn(
          "flex items-center justify-between p-4 rounded-lg border transition-colors",
          instagramConnected 
            ? "border-pink-500/30 bg-pink-500/5" 
            : "border-muted hover:border-pink-500/50"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              instagramConnected ? "bg-gradient-to-br from-purple-500 to-pink-500" : "bg-muted"
            )}>
              <Instagram className={cn(
                "h-5 w-5",
                instagramConnected ? "text-white" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Instagram</span>
                {instagramConnected ? (
                  <Badge variant="outline" className="text-green-500 border-green-500/50">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Not connected
                  </Badge>
                )}
              </div>
              {instagramConnected && instagramUsername && (
                <p className="text-sm text-muted-foreground">
                  @{instagramUsername}
                  {instagramTokenExpires && (
                    <span className={cn(
                      "ml-2",
                      isTokenExpiringSoon ? "text-yellow-500" : ""
                    )}>
                      {isTokenExpiringSoon && <AlertCircle className="h-3 w-3 inline mr-1" />}
                      Expires {formatExpiryDate(instagramTokenExpires)}
                    </span>
                  )}
                </p>
              )}
              {!instagramConnected && (
                <p className="text-sm text-muted-foreground">
                  Track reach, impressions & profile visits
                </p>
              )}
            </div>
          </div>
          <div>
            {instagramConnected ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleInstagramConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {isTokenExpiringSoon ? 'Renew' : 'Reconnect'}
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={handleInstagramConnect}
                disabled={isConnecting}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {isConnecting ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Instagram className="h-4 w-4 mr-2" />
                )}
                Connect
              </Button>
            )}
          </div>
        </div>

        {/* Fanvue Status (read-only reference) */}
        <div className={cn(
          "flex items-center justify-between p-4 rounded-lg border transition-colors",
          fanvueConnected 
            ? "border-primary/30 bg-primary/5" 
            : "border-muted"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              fanvueConnected ? "bg-primary" : "bg-muted"
            )}>
              <span className="text-lg">💎</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Fanvue</span>
                {fanvueConnected ? (
                  <Badge variant="outline" className="text-green-500 border-green-500/50">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Not connected
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {fanvueConnected 
                  ? 'Revenue, subscribers & transactions synced' 
                  : 'Connect via Agency settings'
                }
              </p>
            </div>
          </div>
          {fanvueConnected && (
            <a 
              href="https://fanvue.com/settings" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Fanvue
            </a>
          )}
        </div>

        {/* Help text */}
        <div className="pt-2 text-xs text-muted-foreground">
          <p>
            <strong>Instagram Requirements:</strong> Professional account (Business or Creator) 
            connected to a Facebook Page. 
            <a 
              href="https://help.instagram.com/502981923235522" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline ml-1"
            >
              Learn more →
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
