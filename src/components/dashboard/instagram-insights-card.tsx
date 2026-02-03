'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Instagram, Eye, Users, MousePointerClick, TrendingUp, RefreshCw, ExternalLink } from 'lucide-react'

interface InstagramInsights {
  accountId: string
  username: string
  followersCount: number
  followsCount: number
  mediaCount: number
  reach: number
  impressions: number
  profileViews: number
  websiteClicks: number
}

interface InstagramInsightsCardProps {
  modelId?: string
  modelName?: string
}

const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toLocaleString()
}

export function InstagramInsightsCard({ modelId, modelName }: InstagramInsightsCardProps) {
  const [insights, setInsights] = useState<InstagramInsights | null>(null)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInsights = async () => {
      if (!modelId || modelId === 'all') {
        setConnected(false)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/analytics/instagram?modelId=${modelId}`)
        const data = await response.json()

        if (data.success) {
          setConnected(data.connected)
          setInsights(data.data || null)
        } else {
          setError(data.error)
        }
      } catch {
        setError('Failed to fetch Instagram insights')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInsights()
  }, [modelId])

  const handleConnect = () => {
    if (modelId && modelId !== 'all') {
      window.location.href = `/api/auth/meta/login?modelId=${modelId}`
    }
  }

  // Not connected state
  if (!isLoading && !connected) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-500" />
            Instagram Insights
          </CardTitle>
          <CardDescription>
            Connect Instagram to track reach & impressions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-4">
              <Instagram className="h-10 w-10 text-pink-500" />
            </div>
            {modelId === 'all' ? (
              <>
                <p className="text-muted-foreground mb-4">
                  Select a specific model to connect Instagram
                </p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-4">
                  Connect {modelName || 'this model'}'s Instagram to see:
                </p>
                <ul className="text-sm text-muted-foreground mb-4 space-y-1">
                  <li>📊 Reach & Impressions</li>
                  <li>👀 Profile Views</li>
                  <li>🔗 Website Clicks</li>
                  <li>📈 Follower Growth</li>
                </ul>
                <Button 
                  onClick={handleConnect}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Instagram className="h-4 w-4 mr-2" />
                  Connect Instagram
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-500" />
            Instagram Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="glass border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-500" />
            Instagram Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-destructive">
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Connected with insights
  return (
    <Card className="glass border-pink-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Instagram className="h-5 w-5 text-pink-500" />
              Instagram Insights
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-pink-500 border-pink-500/50">
                @{insights?.username}
              </Badge>
              <a 
                href={`https://instagram.com/${insights?.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleConnect}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Followers */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Followers</span>
            </div>
            <div className="text-2xl font-bold">
              {formatNumber(insights?.followersCount || 0)}
            </div>
          </div>

          {/* Reach */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Reach (30d)</span>
            </div>
            <div className="text-2xl font-bold text-green-500">
              {formatNumber(insights?.reach || 0)}
            </div>
          </div>

          {/* Impressions */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Eye className="h-4 w-4" />
              <span className="text-xs">Impressions</span>
            </div>
            <div className="text-2xl font-bold text-blue-500">
              {formatNumber(insights?.impressions || 0)}
            </div>
          </div>

          {/* Profile Views */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Eye className="h-4 w-4" />
              <span className="text-xs">Profile Views</span>
            </div>
            <div className="text-2xl font-bold text-purple-500">
              {formatNumber(insights?.profileViews || 0)}
            </div>
          </div>

          {/* Website Clicks */}
          <div className="p-3 rounded-lg bg-muted/30 col-span-2">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MousePointerClick className="h-4 w-4" />
              <span className="text-xs">Website/Link Clicks</span>
            </div>
            <div className="text-2xl font-bold text-pink-500">
              {formatNumber(insights?.websiteClicks || 0)}
            </div>
          </div>
        </div>

        {/* Posts count */}
        <div className="mt-4 pt-4 border-t border-muted flex items-center justify-between text-sm text-muted-foreground">
          <span>{insights?.mediaCount || 0} posts</span>
          <span>Following: {formatNumber(insights?.followsCount || 0)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
