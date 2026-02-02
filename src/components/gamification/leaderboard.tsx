'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, Crown, Medal, Trophy } from 'lucide-react'

interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  avatar?: string
  level: number
  revenue: number
  trend: 'up' | 'down' | 'same'
}

interface LeaderboardProps {
  compact?: boolean
  limit?: number
}

export function Leaderboard({ compact = false, limit = 10 }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch('/api/gamification/leaderboard')
        if (res.ok) {
          const data = await res.json()
          setLeaderboard(data.leaderboard?.slice(0, limit) || [])
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [limit])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-400" />
      case 2:
        return <Medal className="h-5 w-5 text-zinc-400" />
      case 3:
        return <Trophy className="h-5 w-5 text-amber-600" />
      default:
        return <span className="text-sm text-zinc-500 font-mono w-5 text-center">{rank}</span>
    }
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'same') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-zinc-500" />
    }
  }

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/20'
      case 2:
        return 'bg-gradient-to-r from-zinc-400/10 to-zinc-500/10 border-zinc-400/20'
      case 3:
        return 'bg-gradient-to-r from-amber-600/10 to-orange-600/10 border-amber-600/20'
      default:
        return 'bg-zinc-900/50 border-zinc-800'
    }
  }

  if (loading) {
    return (
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-zinc-800/50 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-500 text-sm text-center py-4">No data yet. Start grinding!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          Weekly Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-zinc-800">
          {leaderboard.map(entry => (
            <div
              key={entry.userId}
              className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-800/30 ${
                entry.rank <= 3 ? getRankBg(entry.rank) : ''
              }`}
            >
              {/* Rank */}
              <div className="w-6 flex justify-center">{getRankIcon(entry.rank)}</div>

              {/* Avatar */}
              <Avatar className="h-8 w-8 border border-zinc-700">
                <AvatarImage src={entry.avatar} />
                <AvatarFallback className="bg-zinc-800 text-xs">
                  {entry.username?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Name & Level */}
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${compact ? 'text-sm' : ''}`}>
                  {entry.username}
                </p>
                {!compact && (
                  <Badge
                    variant="outline"
                    className="text-xs mt-0.5 border-lime-500/30 text-lime-400"
                  >
                    Lvl {entry.level}
                  </Badge>
                )}
              </div>

              {/* Revenue */}
              <div className="text-right">
                <p className={`font-mono font-bold ${compact ? 'text-sm' : ''} text-green-400`}>
                  ${entry.revenue.toLocaleString()}
                </p>
              </div>

              {/* Trend */}
              <div className="w-6">{getTrendIcon(entry.trend)}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
