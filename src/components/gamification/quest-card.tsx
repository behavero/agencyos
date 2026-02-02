'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Clock, DollarSign, Zap, Target } from 'lucide-react'

interface QuestCardProps {
  title: string
  description?: string
  type: 'revenue' | 'messages' | 'unlocks' | 'speed' | 'custom'
  targetValue: number
  currentValue?: number
  progress: number
  rewardAmount: number
  xpReward: number
  timeLeft?: string
  isFlash?: boolean
  onClaim?: () => void
}

export function QuestCard({
  title,
  description,
  type,
  targetValue,
  currentValue = 0,
  progress,
  rewardAmount,
  xpReward,
  timeLeft,
  isFlash,
}: QuestCardProps) {
  const getTypeIcon = () => {
    switch (type) {
      case 'revenue':
        return <DollarSign className="h-4 w-4 text-green-400" />
      case 'messages':
        return <Zap className="h-4 w-4 text-blue-400" />
      case 'speed':
        return <Clock className="h-4 w-4 text-orange-400" />
      default:
        return <Target className="h-4 w-4 text-purple-400" />
    }
  }

  const getTypeBadge = () => {
    const colors: Record<string, string> = {
      revenue: 'bg-green-500/10 text-green-400 border-green-500/20',
      messages: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      unlocks: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      speed: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      custom: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    }
    return colors[type] || colors.custom
  }

  const isCompleted = progress >= 100

  return (
    <Card
      className={`bg-zinc-950 border-zinc-800 overflow-hidden transition-all ${
        isFlash ? 'border-l-4 border-l-orange-500' : ''
      } ${isCompleted ? 'opacity-60' : 'hover:border-zinc-700'}`}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {getTypeIcon()}
            <h3 className="font-semibold text-sm">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {isFlash && timeLeft && (
              <Badge
                variant="outline"
                className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                {timeLeft}
              </Badge>
            )}
            <Badge variant="outline" className={`text-xs ${getTypeBadge()}`}>
              {type}
            </Badge>
          </div>
        </div>

        {/* Description */}
        {description && <p className="text-xs text-zinc-500 mb-3">{description}</p>}

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-400">Progress</span>
            <span className="font-mono">
              {currentValue.toLocaleString()} / {targetValue.toLocaleString()}
            </span>
          </div>
          <Progress
            value={progress}
            className="h-2 bg-zinc-800"
            // @ts-expect-error - custom indicator class
            indicatorClassName={isCompleted ? 'bg-green-500' : 'bg-lime-500'}
          />
        </div>

        {/* Rewards */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {rewardAmount > 0 && (
              <div className="flex items-center gap-1 text-green-400">
                <DollarSign className="h-3 w-3" />
                <span className="text-xs font-bold">${rewardAmount}</span>
              </div>
            )}
            {xpReward > 0 && (
              <div className="flex items-center gap-1 text-purple-400">
                <Zap className="h-3 w-3" />
                <span className="text-xs font-bold">+{xpReward} XP</span>
              </div>
            )}
          </div>
          {isCompleted && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/20">✓ Complete</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
