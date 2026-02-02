'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import {
  DollarSign,
  TrendingUp,
  Flame,
  ArrowRight,
  Image as ImageIcon,
  Video,
  Music,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BestSeller {
  assetId: string
  fileName: string
  fileUrl: string
  thumbnailUrl: string | null
  contentType: string
  mediaType: string
  totalRevenue: number
  timesUnlocked: number
  conversionRate: number
  performanceRating: string
}

export function BestSellersWidget() {
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBestSellers()
  }, [])

  const fetchBestSellers = async () => {
    try {
      const response = await fetch('/api/vault/best-sellers?days=7&limit=3')
      const result = await response.json()
      if (result.success) {
        setBestSellers(result.data)
      }
    } catch (error) {
      console.error('Error fetching best sellers:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'video':
        return <Video className="w-4 h-4 text-primary" />
      case 'audio':
        return <Music className="w-4 h-4 text-primary" />
      default:
        return <ImageIcon className="w-4 h-4 text-primary" />
    }
  }

  const getPerformanceColor = (rating: string) => {
    if (rating.includes('Hot')) return 'border-red-500 bg-red-500/10'
    if (rating.includes('High')) return 'border-green-500 bg-green-500/10'
    if (rating.includes('Medium')) return 'border-yellow-500 bg-yellow-500/10'
    return 'border-muted'
  }

  if (loading) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Top Performing Content
          </CardTitle>
          <CardDescription>Best sellers this week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-16 h-16 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (bestSellers.length === 0) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Top Performing Content
          </CardTitle>
          <CardDescription>Best sellers this week</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No sales data yet. Start sending content to see your best performers!
          </p>
          <Link href="/dashboard/content/vault">
            <Button variant="outline" className="mt-4">
              Go to Vault
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Top Performing Content
        </CardTitle>
        <CardDescription>Best sellers this week</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {bestSellers.map((asset, index) => (
          <div
            key={asset.assetId}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:shadow-md',
              getPerformanceColor(asset.performanceRating)
            )}
          >
            {/* Rank Badge */}
            <div className="flex-shrink-0">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                  index === 0
                    ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-950'
                    : index === 1
                      ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900'
                      : 'bg-gradient-to-br from-orange-400 to-orange-600 text-orange-950'
                )}
              >
                {index + 1}
              </div>
            </div>

            {/* Thumbnail */}
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {asset.mediaType === 'image' && asset.fileUrl ? (
                <img
                  src={asset.thumbnailUrl || asset.fileUrl}
                  alt={asset.fileName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {getMediaIcon(asset.mediaType)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm truncate">{asset.fileName}</p>
                <span className="text-xs">{asset.performanceRating}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <DollarSign className="w-3 h-3" />${asset.totalRevenue.toFixed(0)}
                </span>
                <span className="text-muted-foreground">
                  {asset.conversionRate.toFixed(1)}% conv
                </span>
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {asset.timesUnlocked} sales
                </Badge>
              </div>
            </div>

            {/* Send Button */}
            <Link href={`/dashboard/messages?assetId=${asset.assetId}`}>
              <Button size="sm" variant="secondary" className="flex-shrink-0">
                Send
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        ))}

        {/* View All Link */}
        <Link href="/dashboard/content/vault?sortBy=revenue">
          <Button variant="outline" className="w-full mt-4">
            View All Assets
            <TrendingUp className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
