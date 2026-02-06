'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Instagram,
  Youtube,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  Eye,
  Users,
  Link2,
  CheckCircle,
  ExternalLink,
} from 'lucide-react'

// Platforms that support OAuth connection
const OAUTH_PLATFORMS = ['youtube', 'instagram'] as const

// Platform configurations
const PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'from-pink-500 to-purple-500',
    textColor: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
      </svg>
    ),
    color: 'from-cyan-400 to-pink-500',
    textColor: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    color: 'from-zinc-400 to-zinc-600',
    textColor: 'text-zinc-300',
    bgColor: 'bg-zinc-500/10',
    borderColor: 'border-zinc-500/30',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    color: 'from-red-500 to-red-600',
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
] as const

interface SocialStat {
  id: string
  model_id: string
  platform: string
  followers: number
  views: number
  likes: number
  date: string
}

interface SocialConnection {
  id: string
  platform: string
  platform_username: string
  is_active: boolean
  last_sync_at: string | null
  metadata: Record<string, unknown>
}

interface SocialGridProps {
  modelId: string
  modelName: string
}

export function SocialGrid({ modelId, modelName }: SocialGridProps) {
  const supabase = createClient()
  const [stats, setStats] = useState<Record<string, SocialStat | null>>({})
  const [previousStats, setPreviousStats] = useState<Record<string, SocialStat | null>>({})
  const [connections, setConnections] = useState<Record<string, SocialConnection | null>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<string>('instagram')
  const [formData, setFormData] = useState({
    followers: '',
    views: '',
    likes: '',
  })

  // Fetch stats and connections
  const fetchStats = async () => {
    setIsLoading(true)

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // Fetch today's stats
    const { data: todayData } = await supabase
      .from('social_stats')
      .select('*')
      .eq('model_id', modelId)
      .eq('date', today)

    // Fetch yesterday's stats for comparison
    const { data: yesterdayData } = await supabase
      .from('social_stats')
      .select('*')
      .eq('model_id', modelId)
      .eq('date', yesterday)

    // Fetch OAuth connections
    const { data: connectionsData } = await supabase
      .from('social_connections')
      .select('*')
      .eq('model_id', modelId)
      .eq('is_active', true)

    // Map to platform-keyed objects
    const todayStats: Record<string, SocialStat | null> = {}
    const prevStats: Record<string, SocialStat | null> = {}
    const conns: Record<string, SocialConnection | null> = {}

    PLATFORMS.forEach(p => {
      todayStats[p.id] = todayData?.find(s => s.platform === p.id) || null
      prevStats[p.id] = yesterdayData?.find(s => s.platform === p.id) || null
      conns[p.id] = connectionsData?.find(c => c.platform === p.id) || null
    })

    setStats(todayStats)
    setPreviousStats(prevStats)
    setConnections(conns)
    setIsLoading(false)
  }

  // Refresh YouTube stats from API
  const handleRefreshYouTube = async (connectionId: string) => {
    setIsRefreshing('youtube')
    try {
      const response = await fetch('/api/social/youtube/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      })

      if (response.ok) {
        toast.success('YouTube stats refreshed! 📺')
        await fetchStats()
      } else {
        toast.error('Failed to refresh YouTube stats')
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to refresh stats')
    } finally {
      setIsRefreshing(null)
    }
  }

  // Check if platform supports OAuth
  const isOAuthPlatform = (platformId: string) => {
    return OAUTH_PLATFORMS.includes(platformId as (typeof OAUTH_PLATFORMS)[number])
  }

  // Get OAuth login URL for a platform
  const getOAuthUrl = (platformId: string) => {
    if (platformId === 'youtube') {
      return `/api/auth/social/youtube/login?modelId=${modelId}`
    }
    if (platformId === 'instagram') {
      return `/api/auth/social/meta/login?modelId=${modelId}`
    }
    return null
  }

  // Refresh Instagram stats from API
  const handleRefreshInstagram = async (connectionId: string) => {
    setIsRefreshing('instagram')
    try {
      const response = await fetch('/api/social/instagram/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      })

      if (response.ok) {
        toast.success('Instagram insights refreshed! 📸')
        await fetchStats()
      } else {
        toast.error('Failed to refresh Instagram insights')
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to refresh stats')
    } finally {
      setIsRefreshing(null)
    }
  }

  // Generic refresh handler for OAuth platforms
  const handleRefreshOAuth = (platformId: string, connectionId: string) => {
    if (platformId === 'youtube') {
      handleRefreshYouTube(connectionId)
    } else if (platformId === 'instagram') {
      handleRefreshInstagram(connectionId)
    }
  }

  useEffect(() => {
    if (modelId) {
      fetchStats()
    }
  }, [modelId])

  const handleOpenDialog = (platformId: string) => {
    setSelectedPlatform(platformId)
    const currentStat = stats[platformId]
    setFormData({
      followers: currentStat?.followers?.toString() || '',
      views: currentStat?.views?.toString() || '',
      likes: currentStat?.likes?.toString() || '',
    })
    setIsDialogOpen(true)
  }

  const handleSaveStats = async () => {
    const today = new Date().toISOString().split('T')[0]

    const { error } = await supabase.from('social_stats').upsert(
      {
        model_id: modelId,
        platform: selectedPlatform,
        date: today,
        followers: parseInt(formData.followers) || 0,
        views: parseInt(formData.views) || 0,
        likes: parseInt(formData.likes) || 0,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'model_id,platform,date',
      }
    )

    if (error) {
      toast.error('Failed to save stats')
      console.error(error)
    } else {
      toast.success('Stats updated! 📊')
      setIsDialogOpen(false)
      fetchStats()
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getTrend = (current: number, previous: number) => {
    const diff = current - previous
    if (diff === 0) return { value: 0, isPositive: true }
    return { value: diff, isPositive: diff > 0 }
  }

  const selectedPlatformConfig = PLATFORMS.find(p => p.id === selectedPlatform)

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {PLATFORMS.map(platform => {
          const Icon = platform.icon
          const stat = stats[platform.id]
          const prevStat = previousStats[platform.id]
          const connection = connections[platform.id]
          const followersTrend = getTrend(stat?.followers || 0, prevStat?.followers || 0)
          const isOAuth = isOAuthPlatform(platform.id)
          const oauthUrl = getOAuthUrl(platform.id)

          return (
            <Card
              key={platform.id}
              className={`bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-all cursor-pointer group`}
              onClick={() => !isOAuth && handleOpenDialog(platform.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-10 h-10 rounded-lg ${platform.bgColor} ${platform.borderColor} border flex items-center justify-center ${platform.textColor}`}
                  >
                    <Icon />
                  </div>
                  {/* Show connection status for OAuth platforms */}
                  {isOAuth && connection ? (
                    <Badge
                      variant="outline"
                      className="text-xs text-green-400 border-green-500/30 gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Connected
                    </Badge>
                  ) : isOAuth ? (
                    <Badge
                      variant="outline"
                      className="text-xs text-zinc-400 border-zinc-600 gap-1"
                    >
                      <Link2 className="w-3 h-3" />
                      Not linked
                    </Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => {
                        e.stopPropagation()
                        handleOpenDialog(platform.id)
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <CardTitle className="text-sm text-zinc-400 mt-2">
                  {platform.name}
                  {connection && (
                    <span className="block text-xs text-zinc-500 font-normal mt-0.5">
                      @{connection.platform_username}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-4 bg-zinc-800 rounded w-1/2 animate-pulse" />
                  </div>
                ) : isOAuth && connection && stat ? (
                  // Connected OAuth platform with stats
                  <div className="space-y-3">
                    {/* Followers/Subscribers */}
                    <div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-zinc-500" />
                        <span className="text-2xl font-bold text-white">
                          {formatNumber(stat.followers)}
                        </span>
                      </div>
                      {followersTrend.value !== 0 && (
                        <Badge
                          variant="outline"
                          className={`mt-1 text-xs ${
                            followersTrend.isPositive
                              ? 'text-green-400 border-green-500/30'
                              : 'text-red-400 border-red-500/30'
                          }`}
                        >
                          {followersTrend.isPositive ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {followersTrend.isPositive ? '+' : ''}
                          {formatNumber(followersTrend.value)}
                        </Badge>
                      )}
                    </div>

                    {/* Views */}
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Eye className="w-4 h-4" />
                      <span>{formatNumber(stat.views)} total views</span>
                    </div>

                    {/* Refresh button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs gap-1"
                      disabled={isRefreshing === platform.id}
                      onClick={e => {
                        e.stopPropagation()
                        handleRefreshOAuth(platform.id, connection.id)
                      }}
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${isRefreshing === platform.id ? 'animate-spin' : ''}`}
                      />
                      {isRefreshing === platform.id ? 'Refreshing...' : 'Refresh Stats'}
                    </Button>
                  </div>
                ) : isOAuth && connection ? (
                  // Connected but no stats yet
                  <div className="text-center py-2">
                    <p className="text-sm text-zinc-500 mb-2">Loading stats...</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1"
                      disabled={isRefreshing === platform.id}
                      onClick={e => {
                        e.stopPropagation()
                        handleRefreshOAuth(platform.id, connection.id)
                      }}
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${isRefreshing === platform.id ? 'animate-spin' : ''}`}
                      />
                      Fetch Stats
                    </Button>
                  </div>
                ) : isOAuth && oauthUrl ? (
                  // OAuth platform not connected - show connect button
                  <div className="text-center py-4">
                    <p className="text-sm text-zinc-500 mb-3">Connect to track automatically</p>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className={`gap-2 ${platform.textColor} ${platform.borderColor} hover:bg-zinc-800`}
                    >
                      <a href={oauthUrl}>
                        <ExternalLink className="w-4 h-4" />
                        Connect {platform.name}
                      </a>
                    </Button>
                  </div>
                ) : stat ? (
                  // Manual platform with stats
                  <div className="space-y-3">
                    {/* Followers */}
                    <div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-zinc-500" />
                        <span className="text-2xl font-bold text-white">
                          {formatNumber(stat.followers)}
                        </span>
                      </div>
                      {followersTrend.value !== 0 && (
                        <Badge
                          variant="outline"
                          className={`mt-1 text-xs ${
                            followersTrend.isPositive
                              ? 'text-green-400 border-green-500/30'
                              : 'text-red-400 border-red-500/30'
                          }`}
                        >
                          {followersTrend.isPositive ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {followersTrend.isPositive ? '+' : ''}
                          {formatNumber(followersTrend.value)}
                        </Badge>
                      )}
                    </div>

                    {/* Views */}
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Eye className="w-4 h-4" />
                      <span>{formatNumber(stat.views)} views today</span>
                    </div>
                  </div>
                ) : (
                  // No stats - show add button for manual platforms
                  <div className="text-center py-4">
                    <p className="text-sm text-zinc-500 mb-2">No data yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={e => {
                        e.stopPropagation()
                        handleOpenDialog(platform.id)
                      }}
                    >
                      Add Stats
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Update Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {selectedPlatformConfig && (
                <div
                  className={`w-8 h-8 rounded-lg ${selectedPlatformConfig.bgColor} ${selectedPlatformConfig.borderColor} border flex items-center justify-center ${selectedPlatformConfig.textColor}`}
                >
                  <selectedPlatformConfig.icon />
                </div>
              )}
              Update {selectedPlatformConfig?.name} Stats
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Daily check-in for {modelName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Followers</Label>
              <Input
                type="number"
                placeholder="e.g., 10000"
                value={formData.followers}
                onChange={e => setFormData({ ...formData, followers: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Views Today</Label>
              <Input
                type="number"
                placeholder="e.g., 5000"
                value={formData.views}
                onChange={e => setFormData({ ...formData, views: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Likes Today</Label>
              <Input
                type="number"
                placeholder="e.g., 500"
                value={formData.likes}
                onChange={e => setFormData({ ...formData, likes: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStats} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Save Stats
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Aggregated view for multiple models (or a single selected model)
interface AggregatedSocialGridProps {
  models: Array<{ id: string; name: string }>
  selectedModelId?: string // If provided and not 'all', filters to that model
}

export function AggregatedSocialGrid({ models, selectedModelId }: AggregatedSocialGridProps) {
  const supabase = createClient()
  const [aggregatedStats, setAggregatedStats] = useState<
    Record<string, { followers: number; views: number }>
  >({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAggregatedStats = async () => {
      if (!models.length) {
        setIsLoading(false)
        return
      }

      const today = new Date().toISOString().split('T')[0]
      // Filter to selected model if one is picked, otherwise use all models
      const filteredModels =
        selectedModelId && selectedModelId !== 'all'
          ? models.filter(m => m.id === selectedModelId)
          : models
      const modelIds = filteredModels.map(m => m.id)

      const { data } = await supabase
        .from('social_stats')
        .select('platform, followers, views')
        .in('model_id', modelIds)
        .eq('date', today)

      // Aggregate by platform
      const aggregated: Record<string, { followers: number; views: number }> = {}
      PLATFORMS.forEach(p => {
        aggregated[p.id] = { followers: 0, views: 0 }
      })

      data?.forEach(stat => {
        if (aggregated[stat.platform]) {
          aggregated[stat.platform].followers += stat.followers || 0
          aggregated[stat.platform].views += stat.views || 0
        }
      })

      setAggregatedStats(aggregated)
      setIsLoading(false)
    }

    fetchAggregatedStats()
  }, [models, selectedModelId])

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const totalFollowers = Object.values(aggregatedStats).reduce((sum, s) => sum + s.followers, 0)
  const totalViews = Object.values(aggregatedStats).reduce((sum, s) => sum + s.views, 0)

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">Social Reach</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-zinc-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <p className="text-sm text-zinc-500">Total Followers</p>
                <p className="text-2xl font-bold text-white">{formatNumber(totalFollowers)}</p>
              </div>
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <p className="text-sm text-zinc-500">Views Today</p>
                <p className="text-2xl font-bold text-white">{formatNumber(totalViews)}</p>
              </div>
            </div>

            {/* Platform breakdown */}
            <div className="grid grid-cols-4 gap-3">
              {PLATFORMS.map(platform => {
                const Icon = platform.icon
                const stat = aggregatedStats[platform.id] || { followers: 0, views: 0 }

                return (
                  <div
                    key={platform.id}
                    className={`p-3 rounded-lg ${platform.bgColor} ${platform.borderColor} border text-center`}
                  >
                    <div className={`${platform.textColor} flex justify-center mb-2`}>
                      <Icon />
                    </div>
                    <p className="text-lg font-bold text-white">{formatNumber(stat.followers)}</p>
                    <p className="text-xs text-zinc-400">{formatNumber(stat.views)} views</p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
