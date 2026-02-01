'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Database } from '@/types/database.types'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  Trophy,
  Flame,
  Target,
  Zap,
  CheckCircle2,
  Clock,
  Users,
  Sparkles,
  Crown,
  Sword,
  Calendar,
  RefreshCw,
  MessageSquare,
  FileText,
  DollarSign,
  Loader2,
} from 'lucide-react'

type Quest = Database['public']['Tables']['quests']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface QuestsClientProps {
  quests: Quest[]
  profile: Profile | null
  agencyLevel: number
}

// Quest icons based on verification type
const questIcons: Record<string, any> = {
  API_MESSAGES: MessageSquare,
  API_POSTS: FileText,
  API_REVENUE: DollarSign,
  API_SUBSCRIBERS: Users,
  MANUAL: Target,
}

// Role icons
const roleIcons: Record<string, any> = {
  grandmaster: Crown,
  paladin: Sword,
  alchemist: Sparkles,
  ranger: Target,
  rogue: Zap,
}

const roleColors: Record<string, string> = {
  grandmaster: 'text-yellow-500 bg-yellow-500/10',
  paladin: 'text-blue-500 bg-blue-500/10',
  alchemist: 'text-purple-500 bg-purple-500/10',
  ranger: 'text-green-500 bg-green-500/10',
  rogue: 'text-red-500 bg-red-500/10',
}

// Circular Progress Component
function CircularProgress({ 
  value, 
  max, 
  size = 120, 
  strokeWidth = 8,
  children 
}: { 
  value: number
  max: number
  size?: number
  strokeWidth?: number
  children?: React.ReactNode
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progress = Math.min(value / max, 1)
  const strokeDashoffset = circumference - progress * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(262, 83%, 58%)" />
            <stop offset="100%" stopColor="hsl(142, 76%, 36%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

// Progress Bar Component
function ProgressBar({ 
  current, 
  target, 
  verified 
}: { 
  current: number
  target: number
  verified: boolean
}) {
  const percentage = Math.min((current / target) * 100, 100)
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{current} / {target}</span>
        <span>{percentage.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            verified
              ? 'bg-gradient-to-r from-green-500 to-emerald-400'
              : 'bg-gradient-to-r from-primary/50 to-primary'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default function QuestsClient({ quests, profile, agencyLevel }: QuestsClientProps) {
  const router = useRouter()
  const [isSyncing, setIsSyncing] = useState(false)
  const [claimingQuest, setClaimingQuest] = useState<string | null>(null)
  const [localQuests, setLocalQuests] = useState(quests)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  // Sync quests on mount
  useEffect(() => {
    handleRefresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsSyncing(true)
    try {
      const response = await fetch('/api/quests/refresh', { method: 'POST' })
      const data = await response.json()
      
      if (response.ok && data.quests) {
        setLocalQuests(data.quests)
        setLastSyncTime(new Date())
        if (data.synced > 0) {
          toast.success(`Synced ${data.synced} quests with Fanvue`)
        }
      }
    } catch (error) {
      console.error('Failed to sync quests:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const handleClaimQuest = async (questId: string) => {
    setClaimingQuest(questId)
    
    try {
      const response = await fetch(`/api/quests/${questId}/claim`, { method: 'POST' })
      const data = await response.json()
      
      if (response.ok) {
        toast.success(data.message || 'Quest completed! 🎉')
        router.refresh()
      } else {
        toast.error(data.error || 'Failed to claim quest')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to claim quest')
    } finally {
      setClaimingQuest(null)
    }
  }

  // Group quests
  const activeQuests = localQuests.filter(q => !q.completed_at)
  const completedQuests = localQuests.filter(q => q.completed_at)
  const dailyQuests = activeQuests.filter(q => q.is_daily)
  const normalQuests = activeQuests.filter(q => !q.is_daily)

  // Calculate stats
  const totalXpEarned = profile?.xp_count || 0
  const currentStreak = profile?.current_streak || 0
  const nextLevelXp = agencyLevel * 1000
  const completedToday = completedQuests.filter(q => {
    if (!q.completed_at) return false
    const completedDate = new Date(q.completed_at)
    const today = new Date()
    return completedDate.toDateString() === today.toDateString()
  }).length

  // Daily completion percentage
  const dailyTotal = dailyQuests.length + completedToday
  const dailyCompleted = completedToday
  const dailyPercentage = dailyTotal > 0 ? (dailyCompleted / dailyTotal) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="w-8 h-8 text-primary" />
            Quest Board
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete quests to earn XP • Progress verified via Fanvue API
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isSyncing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Daily Completion Ring */}
        <Card className="glass md:row-span-2 flex flex-col items-center justify-center py-6">
          <CircularProgress value={dailyCompleted} max={Math.max(dailyTotal, 1)} size={140}>
            <div className="text-center">
              <div className="text-3xl font-bold">{Math.round(dailyPercentage)}%</div>
              <div className="text-xs text-muted-foreground">Daily</div>
            </div>
          </CircularProgress>
          <p className="text-sm text-muted-foreground mt-4">
            {dailyCompleted}/{dailyTotal} quests today
          </p>
        </Card>

        {/* XP Card */}
        <Card className="glass hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total XP</CardTitle>
            <Zap className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalXpEarned.toLocaleString()}</div>
            <div className="mt-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                  style={{ width: `${Math.min((totalXpEarned / nextLevelXp) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{nextLevelXp - totalXpEarned} XP to Level {agencyLevel + 1}</p>
            </div>
          </CardContent>
        </Card>

        {/* Streak Card */}
        <Card className="glass hover-lift border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <Flame className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {currentStreak} <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Complete daily quests to keep it going!
            </p>
          </CardContent>
        </Card>

        {/* League Rank */}
        <Card className="glass hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">League</CardTitle>
            <Crown className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{profile?.league_rank || 'Iron'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Earn more XP to rank up
            </p>
          </CardContent>
        </Card>

        {/* Active Quests */}
        <Card className="glass hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeQuests.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Quests pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sync Status */}
      {lastSyncTime && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          Last synced: {lastSyncTime.toLocaleTimeString()}
        </div>
      )}

      {/* Daily Quests */}
      {dailyQuests.length > 0 && (
        <Card className="glass border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <CardTitle>Daily Quests</CardTitle>
              </div>
              <Badge className="bg-primary">Resets at Midnight</Badge>
            </div>
            <CardDescription>Complete before midnight to maintain your streak</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dailyQuests.map((quest) => {
                const QuestIcon = questIcons[quest.verification_type || 'MANUAL'] || Target
                const RoleIcon = roleIcons[quest.role_target || 'grandmaster'] || Users
                const roleStyle = roleColors[quest.role_target || 'grandmaster'] || 'text-gray-500 bg-gray-500/10'
                
                const currentProgress = quest.current_progress || 0
                const targetCount = quest.target_count || 1
                const isVerified = currentProgress >= targetCount
                const isManual = quest.verification_type === 'MANUAL'
                
                return (
                  <div
                    key={quest.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isVerified 
                        ? 'border-green-500/50 bg-green-500/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Quest Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${roleStyle}`}>
                        <QuestIcon className="w-6 h-6" />
                      </div>

                      {/* Quest Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-semibold">{quest.title}</h3>
                            <p className="text-sm text-muted-foreground">{quest.description}</p>
                          </div>
                          <Badge variant="secondary" className="gap-1 flex-shrink-0">
                            <Zap className="w-3 h-3" />
                            +{quest.xp_reward} XP
                          </Badge>
                        </div>

                        {/* Progress Bar */}
                        {!isManual && (
                          <div className="mb-3">
                            <ProgressBar
                              current={currentProgress}
                              target={targetCount}
                              verified={isVerified}
                            />
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize text-xs">
                              <RoleIcon className="w-3 h-3 mr-1" />
                              {quest.role_target}
                            </Badge>
                            {!isManual && (
                              <Badge variant="outline" className="text-xs">
                                {quest.verification_type?.replace('API_', '')}
                              </Badge>
                            )}
                          </div>
                          
                          <Button
                            size="sm"
                            disabled={(!isVerified && !isManual) || claimingQuest === quest.id}
                            onClick={() => handleClaimQuest(quest.id)}
                            className={`${
                              isVerified || isManual
                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black'
                                : 'opacity-50'
                            }`}
                          >
                            {claimingQuest === quest.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isVerified || isManual ? (
                              'Claim Reward'
                            ) : (
                              'In Progress'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regular Quests */}
      {normalQuests.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle>Active Quests</CardTitle>
            <CardDescription>Complete to earn XP and unlock rewards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {normalQuests.map((quest) => {
                const QuestIcon = questIcons[quest.verification_type || 'MANUAL'] || Target
                const RoleIcon = roleIcons[quest.role_target || 'grandmaster'] || Users
                const roleStyle = roleColors[quest.role_target || 'grandmaster'] || 'text-gray-500 bg-gray-500/10'
                
                const currentProgress = quest.current_progress || 0
                const targetCount = quest.target_count || 1
                const isVerified = currentProgress >= targetCount
                const isManual = quest.verification_type === 'MANUAL'
                
                return (
                  <div
                    key={quest.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isVerified 
                        ? 'border-green-500/50 bg-green-500/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${roleStyle}`}>
                        <QuestIcon className="w-6 h-6" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-semibold">{quest.title}</h3>
                            <p className="text-sm text-muted-foreground">{quest.description}</p>
                          </div>
                          <Badge variant="secondary" className="gap-1 flex-shrink-0">
                            <Zap className="w-3 h-3" />
                            +{quest.xp_reward} XP
                          </Badge>
                        </div>

                        {!isManual && (
                          <div className="mb-3">
                            <ProgressBar
                              current={currentProgress}
                              target={targetCount}
                              verified={isVerified}
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize text-xs">
                              <RoleIcon className="w-3 h-3 mr-1" />
                              {quest.role_target}
                            </Badge>
                          </div>
                          
                          <Button
                            size="sm"
                            disabled={(!isVerified && !isManual) || claimingQuest === quest.id}
                            onClick={() => handleClaimQuest(quest.id)}
                            className={`${
                              isVerified || isManual
                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black'
                                : 'opacity-50'
                            }`}
                          >
                            {claimingQuest === quest.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isVerified || isManual ? (
                              'Claim Reward'
                            ) : (
                              'In Progress'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Quests */}
      {completedQuests.length > 0 && (
        <Card className="glass opacity-75">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Completed Quests
            </CardTitle>
            <CardDescription>{completedQuests.length} quests completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedQuests.slice(0, 5).map((quest) => (
                <div
                  key={quest.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-through text-muted-foreground">{quest.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Completed {quest.completed_at && new Date(quest.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Zap className="w-3 h-3" />
                    +{quest.xp_reward} XP
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {activeQuests.length === 0 && completedQuests.length === 0 && (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Quests Available</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              New quests will appear here. Connect a model and start chatting!
            </p>
            <Button onClick={() => router.push('/dashboard/creator-management')}>
              Add Model
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
