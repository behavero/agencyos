'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Link2, MousePointerClick, Users, DollarSign, TrendingUp } from 'lucide-react'

interface TrackingLink {
  id: string
  name: string
  platform: string | null
  clicks: number
  followsCount: number
  subsCount: number
  subsRevenue: number
  userSpend: number
  totalRevenue: number
  conversionRate: number
  roi: number
  createdAt: string
}

interface TrackingLinksStats {
  totalClicks: number
  totalSubs: number
  clickToSubRate: number
}

interface TopTrackingLinksCardProps {
  modelId?: string
}

const platformIcons: Record<string, string> = {
  instagram: '📸',
  tiktok: '🎵',
  twitter: '🐦',
  facebook: '📘',
  youtube: '▶️',
  snapchat: '👻',
  reddit: '🤖',
  other: '🔗',
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num)
}

export function TopTrackingLinksCard({ modelId }: TopTrackingLinksCardProps) {
  const [sortBy, setSortBy] = useState<string>('total_revenue')
  const [links, setLinks] = useState<TrackingLink[]>([])
  const [stats, setStats] = useState<TrackingLinksStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const params = new URLSearchParams({
          sortBy,
          limit: '5',
        })
        if (modelId) {
          params.set('modelId', modelId)
        }
        
        const response = await fetch(`/api/analytics/tracking-links?${params}`)
        const data = await response.json()
        
        if (data.success) {
          setLinks(data.data.topLinks)
          setStats(data.data.stats)
        } else {
          setError(data.error || 'Failed to fetch data')
        }
      } catch (err) {
        setError('Network error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [sortBy, modelId])

  const getPlatformIcon = (platform: string | null) => {
    return platformIcons[platform?.toLowerCase() || 'other'] || '🔗'
  }

  const getPerformanceColor = (roi: number) => {
    if (roi >= 5) return 'text-green-400'
    if (roi >= 2) return 'text-lime-400'
    if (roi >= 1) return 'text-yellow-400'
    return 'text-orange-400'
  }

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Top Tracking Links
            </CardTitle>
            <CardDescription>
              Traffic sources ranked by performance
            </CardDescription>
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total_revenue">Most Revenue</SelectItem>
              <SelectItem value="roi">Best ROI</SelectItem>
              <SelectItem value="clicks">Most Clicks</SelectItem>
              <SelectItem value="subs_count">Most Subs</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Summary Stats */}
        {stats && stats.totalClicks > 0 && (
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MousePointerClick className="h-4 w-4" />
              {formatNumber(stats.totalClicks)} total clicks
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {formatNumber(stats.totalSubs)} subs
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              {stats.clickToSubRate.toFixed(1)}% conversion
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <div className="text-muted-foreground">Loading tracking links...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[200px]">
            <div className="text-destructive">{error}</div>
          </div>
        ) : links.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <Link2 className="h-10 w-10 mb-2 opacity-50" />
            <p>No tracking links found</p>
            <p className="text-sm">Create tracking links in Fanvue to track traffic sources</p>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link, index) => (
              <div
                key={link.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                  {index + 1}
                </div>
                
                {/* Link Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getPlatformIcon(link.platform)}</span>
                    <span className="font-semibold truncate">{link.name}</span>
                    {link.createdAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(link.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                  
                  {/* Metrics Row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm">
                    <div className="flex items-center gap-1 text-blue-400">
                      <MousePointerClick className="h-3.5 w-3.5" />
                      <span>{formatNumber(link.clicks)} clicks</span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-teal-400">
                      <Users className="h-3.5 w-3.5" />
                      <span>{link.subsCount} subs</span>
                      <span className="text-muted-foreground">
                        ({link.conversionRate.toFixed(1)}%)
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-green-400">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>{formatCurrency(link.totalRevenue)}</span>
                    </div>
                    
                    <div className={`flex items-center gap-1 ${getPerformanceColor(link.roi)}`}>
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>{formatCurrency(link.roi)}/click</span>
                    </div>
                  </div>
                  
                  {/* Revenue Breakdown */}
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>Subs: {formatCurrency(link.subsRevenue)}</span>
                    <span>•</span>
                    <span>PPV/Tips: {formatCurrency(link.userSpend)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
