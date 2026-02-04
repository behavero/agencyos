'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Image,
  DollarSign,
  Heart,
  MessageCircle,
  Unlock,
  TrendingUp,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

interface ContentPost {
  id: string
  fanvue_uuid: string
  content: string | null
  created_at_fanvue: string | null
  likes_count: number
  comments_count: number
  tips_count: number
  media_count: number
  is_pay_to_view: boolean
  price_cents: number
  revenue_cents: number
  unlocks_count: number
  engagement_score: number
}

interface ContentStats {
  totalPosts: number
  ppvPosts: number
  totalRevenue: number
  totalUnlocks: number
  avgEngagement: number
}

interface Model {
  id: string
  name: string
}

interface ContentPerformanceCardProps {
  models?: Model[]
  initialModelId?: string
}

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

const formatNumber = (num: number) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

const truncateContent = (content: string | null, maxLength: number = 60) => {
  if (!content) return 'No caption'
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength) + '...'
}

export function ContentPerformanceCard({
  models = [],
  initialModelId,
}: ContentPerformanceCardProps) {
  const [sortBy, setSortBy] = useState<string>('revenue')
  const [selectedModelId, setSelectedModelId] = useState<string>(initialModelId || 'all')
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [stats, setStats] = useState<ContentStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        sortBy,
        limit: '5',
      })
      if (selectedModelId && selectedModelId !== 'all') {
        params.set('modelId', selectedModelId)
      }

      const response = await fetch(`/api/fanvue/sync-posts?${params}`)
      const data = await response.json()

      if (response.ok) {
        setPosts(data.posts || [])
        setStats(data.stats || null)
      } else {
        setError(data.error || 'Failed to fetch data')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [sortBy, selectedModelId])

  const handleSync = async () => {
    if (!selectedModelId || selectedModelId === 'all') {
      // Sync all models
      setIsSyncing(true)
      setError(null)

      try {
        for (const model of models) {
          await fetch('/api/fanvue/sync-posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelId: model.id }),
          })
        }
        await fetchData()
      } catch (err) {
        setError('Sync failed')
      } finally {
        setIsSyncing(false)
      }
    } else {
      // Sync single model
      setIsSyncing(true)
      setError(null)

      try {
        const response = await fetch('/api/fanvue/sync-posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId: selectedModelId }),
        })

        const data = await response.json()

        if (response.ok) {
          await fetchData()
        } else {
          setError(data.error || 'Sync failed')
        }
      } catch (err) {
        setError('Sync failed')
      } finally {
        setIsSyncing(false)
      }
    }
  }

  const getEngagementBadge = (score: number) => {
    if (score >= 100) return { label: '🔥 Hot', color: 'text-orange-400' }
    if (score >= 50) return { label: '✨ Popular', color: 'text-yellow-400' }
    if (score >= 20) return { label: '👍 Good', color: 'text-green-400' }
    return { label: '', color: '' }
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Content Performance
            </CardTitle>
            <CardDescription>Your best performing content by sales & engagement</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </Button>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-2 mt-3">
          {/* Model Filter */}
          <Select value={selectedModelId} onValueChange={setSelectedModelId}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Models" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {models.map(model => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort Filter */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Top Revenue</SelectItem>
              <SelectItem value="engagement">Most Engaging</SelectItem>
              <SelectItem value="likes">Most Liked</SelectItem>
              <SelectItem value="recent">Most Recent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        {stats && stats.totalPosts > 0 && (
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Image className="h-4 w-4" />
              {formatNumber(stats.totalPosts)} posts
            </span>
            <span className="flex items-center gap-1">
              <Unlock className="h-4 w-4" />
              {formatNumber(stats.ppvPosts)} PPV
            </span>
            <span className="flex items-center gap-1 text-green-400">
              <DollarSign className="h-4 w-4" />
              {formatCurrency(stats.totalRevenue)}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[250px]">
            <div className="text-muted-foreground">Loading content...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[250px]">
            <div className="text-destructive">{error}</div>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
            <Image className="h-10 w-10 mb-2 opacity-50" />
            <p>No sales data yet</p>
            <p className="text-sm">Start sending content to see your best performers!</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post, index) => {
              const badge = getEngagementBadge(post.engagement_score)

              return (
                <div
                  key={post.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {index + 1}
                  </div>

                  {/* Content Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {post.is_pay_to_view && (
                        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-primary/20 text-primary">
                          PPV ${(post.price_cents / 100).toFixed(0)}
                        </span>
                      )}
                      <span className="font-medium truncate text-sm">
                        {truncateContent(post.content)}
                      </span>
                      {badge.label && (
                        <span className={`text-xs ${badge.color}`}>{badge.label}</span>
                      )}
                    </div>

                    {/* Metrics Row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm">
                      {post.revenue_cents > 0 && (
                        <div className="flex items-center gap-1 text-green-400">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span>{formatCurrency(post.revenue_cents)}</span>
                        </div>
                      )}

                      {post.unlocks_count > 0 && (
                        <div className="flex items-center gap-1 text-blue-400">
                          <Unlock className="h-3.5 w-3.5" />
                          <span>{post.unlocks_count} unlocks</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-pink-400">
                        <Heart className="h-3.5 w-3.5" />
                        <span>{formatNumber(post.likes_count)}</span>
                      </div>

                      <div className="flex items-center gap-1 text-cyan-400">
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>{formatNumber(post.comments_count)}</span>
                      </div>

                      {post.tips_count > 0 && (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span>{post.tips_count} tips</span>
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    {post.created_at_fanvue && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Posted{' '}
                        {new Date(post.created_at_fanvue).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
