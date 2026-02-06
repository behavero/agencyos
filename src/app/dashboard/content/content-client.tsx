'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Target,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  ExternalLink,
  Sparkles,
  BarChart3,
  FileQuestion,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useRouter } from 'next/navigation'

interface ContentAnalysis {
  id: string
  post_url?: string
  platform?: string
  views?: number
  conversion_rate?: number
  ai_tags?: string[] | string | null
  performance_score?: number
  title?: string
  likes?: number
  comments?: number
  created_at?: string
  engagement_rate?: number
}

interface ContentIntelClientProps {
  contentData: ContentAnalysis[]
}

export default function ContentIntelClient({ contentData }: ContentIntelClientProps) {
  const router = useRouter()
  const [isSyncing, setIsSyncing] = useState(false)
  const hasData = contentData.length > 0

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/content/sync', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(`Synced ${data.synced} posts from ${data.models} creators`)
        router.refresh()
      } else {
        toast.error(data.error || 'Sync failed')
      }
    } catch {
      toast.error('Failed to sync content')
    } finally {
      setIsSyncing(false)
    }
  }

  // Compute stats from real data
  const stats = useMemo(() => {
    if (!hasData) return { avgScore: 0, totalViews: 0, avgEngagement: 0, avgConversion: 0 }

    const avgScore =
      contentData.reduce((sum, c) => sum + (c.performance_score || 0), 0) / contentData.length
    const totalViews = contentData.reduce((sum, c) => sum + (c.views || 0), 0)
    const avgEngagement =
      contentData.reduce((sum, c) => sum + (c.engagement_rate || c.conversion_rate || 0), 0) /
      contentData.length
    const avgConversion =
      contentData.reduce((sum, c) => sum + (c.conversion_rate || 0), 0) / contentData.length

    return {
      avgScore: Math.round(avgScore * 10) / 10,
      totalViews,
      avgEngagement: Math.round(avgEngagement * 10) / 10,
      avgConversion: Math.round(avgConversion * 10) / 10,
    }
  }, [contentData, hasData])

  // Platform breakdown from real data
  const platformData = useMemo(() => {
    if (!hasData) return []
    const counts: Record<string, number> = {}
    contentData.forEach(c => {
      const p = c.platform || 'Other'
      counts[p] = (counts[p] || 0) + 1
    })
    const colors = ['#a3e635', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899']
    return Object.entries(counts)
      .map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }))
      .sort((a, b) => b.value - a.value)
  }, [contentData, hasData])

  // Tag analysis from real data
  const tagAnalysis = useMemo(() => {
    if (!hasData) return []
    const tagMap: Record<string, { count: number; totalScore: number }> = {}
    contentData.forEach(c => {
      const tags: string[] = Array.isArray(c.ai_tags)
        ? c.ai_tags
        : typeof c.ai_tags === 'string'
          ? c.ai_tags.split(',').map(t => t.trim())
          : []
      tags.forEach(tag => {
        if (!tag) return
        if (!tagMap[tag]) tagMap[tag] = { count: 0, totalScore: 0 }
        tagMap[tag].count++
        tagMap[tag].totalScore += c.performance_score || 0
      })
    })
    return Object.entries(tagMap)
      .map(([tag, data]) => ({
        tag,
        posts: data.count,
        avgScore: Math.round(data.totalScore / data.count),
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10)
  }, [contentData, hasData])

  // Daily performance from real data (last 7 unique dates)
  const performanceData = useMemo(() => {
    if (!hasData) return []
    const dateMap: Record<string, { views: number; conversions: number }> = {}
    contentData.forEach(c => {
      if (!c.created_at) return
      const date = new Date(c.created_at).toLocaleDateString('en-US', { weekday: 'short' })
      if (!dateMap[date]) dateMap[date] = { views: 0, conversions: 0 }
      dateMap[date].views += c.views || 0
      dateMap[date].conversions += Math.round(((c.conversion_rate || 0) * (c.views || 0)) / 100)
    })
    return Object.entries(dateMap)
      .slice(0, 7)
      .map(([name, data]) => ({ name, ...data }))
  }, [contentData, hasData])

  const formatViews = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toString()
  }

  // ---- Empty State ----
  if (!hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            Content Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered insights to optimize your content strategy
          </p>
        </div>

        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileQuestion className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Content Data Yet</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Content analytics will appear here once your creators' posts are synced from Fanvue.
              Use the sync feature to pull your latest content data.
            </p>
            <Button onClick={handleSync} disabled={isSyncing} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Content from Fanvue'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---- Data-driven UI ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            Content Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered insights from {contentData.length} analyzed posts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </Button>
          <Button className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgScore}</div>
            <p className="text-xs text-muted-foreground">Out of 100 score</p>
          </CardContent>
        </Card>

        <Card className="glass hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatViews(stats.totalViews)}</div>
            <p className="text-xs text-muted-foreground">Across all content</p>
          </CardContent>
        </Card>

        <Card className="glass hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <Heart className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgEngagement}%</div>
            <p className="text-xs text-muted-foreground">Average engagement</p>
          </CardContent>
        </Card>

        <Card className="glass hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgConversion}%</div>
            <p className="text-xs text-muted-foreground">Profile visits / views</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
            <CardDescription>Views and conversions over time</CardDescription>
          </CardHeader>
          <CardContent>
            {performanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="#71717a" tick={{ fill: '#e4e4e7', fontSize: 12 }} />
                  <YAxis stroke="#71717a" tick={{ fill: '#e4e4e7', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      color: '#fff',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="views" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No dated content data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Distribution */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Platform Distribution</CardTitle>
            <CardDescription>Content analyzed across platforms</CardDescription>
          </CardHeader>
          <CardContent>
            {platformData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No platform data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Winning Recipe - from real tags */}
      {tagAnalysis.length > 0 && (
        <Card className="glass border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-primary">Winning Recipe</CardTitle>
                <CardDescription>Top performing content patterns</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h3 className="font-semibold mb-2">Best Performing Tags:</h3>
                <div className="flex flex-wrap gap-2">
                  {tagAnalysis.slice(0, 3).map(tag => (
                    <Badge key={tag.tag} className="bg-primary text-primary-foreground">
                      {tag.tag} ({tag.avgScore} score)
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">All High-Performing Tags:</h4>
                <div className="flex flex-wrap gap-2">
                  {tagAnalysis.map(tag => (
                    <Badge key={tag.tag} variant="outline">
                      #{tag.tag} ({tag.posts})
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Performing Content */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Top Performing Content</CardTitle>
          <CardDescription>Highest scoring posts from your analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contentData.slice(0, 10).map(content => {
              const tags: string[] = Array.isArray(content.ai_tags)
                ? content.ai_tags
                : typeof content.ai_tags === 'string'
                  ? content.ai_tags.split(',').map(t => t.trim())
                  : []

              return (
                <div
                  key={content.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 transition-all hover-lift"
                >
                  {/* Score badge */}
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">
                      {content.performance_score || 0}
                    </span>
                  </div>

                  {/* Content Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold truncate">
                        {content.title || content.post_url || `Post ${content.id.slice(0, 8)}`}
                      </h3>
                      {content.platform && (
                        <Badge variant="outline" className="text-xs ml-2 shrink-0">
                          {content.platform}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {content.views != null && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {formatViews(content.views)}
                        </span>
                      )}
                      {content.conversion_rate != null && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {content.conversion_rate}%
                        </span>
                      )}
                    </div>
                    {tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {tags.slice(0, 5).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  {content.post_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(content.post_url!, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
