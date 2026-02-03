'use client'

/**
 * VIP Fans List Component
 * Displays top-spending fans across all creators
 * Part of Phase A: Complete the Core Loop
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy, DollarSign, MessageSquare, Users } from 'lucide-react'

interface VIPFan {
  fan_uuid: string
  fan_handle: string
  fan_display_name: string
  fan_nickname: string | null
  fan_avatar_url: string | null
  total_spent_cents: number
  total_messages: number
  creator_count: number
  creator_names: string[]
}

export function VIPFansList() {
  const [fans, setFans] = useState<VIPFan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchVIPFans()
  }, [])

  async function fetchVIPFans() {
    try {
      setLoading(true)
      const response = await fetch('/api/agency/vip-fans')

      if (!response.ok) {
        throw new Error('Failed to fetch VIP fans')
      }

      const data = await response.json()
      setFans(data.fans || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            VIP Fans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            VIP Fans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Failed to load VIP fans: {error}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (fans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            VIP Fans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No VIP fans data available yet. Run a sync to populate this list.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          VIP Fans
          <span className="text-sm font-normal text-muted-foreground ml-auto">
            Top {fans.length} spenders
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {fans.slice(0, 10).map((fan, index) => {
            const displayName = fan.fan_nickname || fan.fan_display_name
            const initials = displayName
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)

            return (
              <div
                key={fan.fan_uuid}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Rank Badge */}
                {index < 3 && (
                  <div className="flex-shrink-0 w-6 text-center">
                    {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                    {index === 1 && <Trophy className="h-5 w-5 text-gray-400" />}
                    {index === 2 && <Trophy className="h-5 w-5 text-orange-600" />}
                  </div>
                )}
                {index >= 3 && (
                  <div className="flex-shrink-0 w-6 text-center text-sm text-muted-foreground">
                    {index + 1}
                  </div>
                )}

                {/* Avatar */}
                <Avatar className="h-12 w-12">
                  <AvatarImage src={fan.fan_avatar_url || undefined} alt={displayName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>

                {/* Fan Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{displayName}</p>
                    {fan.creator_count > 1 && (
                      <Badge variant="secondary" className="text-xs">
                        {fan.creator_count} creators
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">@{fan.fan_handle}</p>
                  {fan.creator_count > 1 && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      Subscribed to: {fan.creator_names.join(', ')}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                    <DollarSign className="h-4 w-4" />
                    {(fan.total_spent_cents / 100).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  {fan.total_messages > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      {fan.total_messages} msgs
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {fans.length > 10 && (
          <div className="mt-4 text-center">
            <button
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                // TODO: Implement "View All" modal or page
                console.log('View all VIP fans')
              }}
            >
              View all {fans.length} VIP fans →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
