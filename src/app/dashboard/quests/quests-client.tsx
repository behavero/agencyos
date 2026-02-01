'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import type { Database } from '@/types/database.types'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  Trophy,
  Flame,
  Target,
  Zap,
  CheckCircle2,
  Circle,
  Clock,
  Users,
  Sparkles,
  Crown,
  Sword,
  Calendar
} from 'lucide-react'

type Quest = Database['public']['Tables']['quests']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface QuestsClientProps {
  quests: Quest[]
  profile: Profile | null
}

const roleIcons: Record<string, any> = {
  grandmaster: Crown,
  paladin: Sword,
  alchemist: Sparkles,
  ranger: Target,
  rogue: Zap,
}

const roleColors: Record<string, string> = {
  grandmaster: 'text-yellow-500',
  paladin: 'text-blue-500',
  alchemist: 'text-purple-500',
  ranger: 'text-green-500',
  rogue: 'text-red-500',
}

export default function QuestsClient({ quests, profile }: QuestsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [completingQuest, setCompletingQuest] = useState<string | null>(null)

  const handleCompleteQuest = async (questId: string) => {
    setCompletingQuest(questId)
    
    try {
      const quest = quests.find(q => q.id === questId)
      if (!quest) return

      // Mark quest as completed
      const { error: questError } = await supabase
        .from('quests')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', questId)

      if (questError) throw questError

      // Award XP to profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          xp_count: (profile?.xp_count || 0) + (quest.xp_reward || 50)
        })
        .eq('id', profile?.id)

      if (profileError) throw profileError

      toast.success(`Quest completed! +${quest.xp_reward} XP 🎉`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete quest')
    } finally {
      setCompletingQuest(null)
    }
  }

  // Group quests
  const activeQuests = quests.filter(q => !q.completed_at)
  const completedQuests = quests.filter(q => q.completed_at)
  const dailyQuests = activeQuests.filter(q => q.is_daily)
  const normalQuests = activeQuests.filter(q => !q.is_daily)

  // Calculate stats
  const totalXpEarned = profile?.xp_count || 0
  const currentStreak = profile?.current_streak || 0
  const completedToday = completedQuests.filter(q => {
    if (!q.completed_at) return false
    const completedDate = new Date(q.completed_at)
    const today = new Date()
    return completedDate.toDateString() === today.toDateString()
  }).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="w-8 h-8 text-primary" />
            Quest Log
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete daily tasks to earn XP and level up your agency
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total XP</CardTitle>
            <Zap className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalXpEarned.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              League: {profile?.league_rank || 'Iron'}
            </p>
          </CardContent>
        </Card>

        <Card className="glass hover-lift border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <Flame className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {currentStreak} <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              Keep it going!
            </p>
          </CardContent>
        </Card>

        <Card className="glass hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedToday}</div>
            <p className="text-xs text-muted-foreground">
              {dailyQuests.length} daily quests
            </p>
          </CardContent>
        </Card>

        <Card className="glass hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Quests</CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeQuests.length}</div>
            <p className="text-xs text-muted-foreground">
              Total pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Quests */}
      {dailyQuests.length > 0 && (
        <Card className="glass border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <CardTitle>Daily Quests</CardTitle>
              </div>
              <Badge className="bg-primary">Resets in 12h</Badge>
            </div>
            <CardDescription>Complete before midnight to maintain your streak</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dailyQuests.map((quest) => {
                const RoleIcon = roleIcons[quest.role_target || 'grandmaster'] || Users
                const roleColor = roleColors[quest.role_target || 'grandmaster'] || 'text-gray-500'
                
                return (
                  <div
                    key={quest.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 transition-all hover-lift"
                  >
                    <Checkbox
                      checked={!!quest.completed_at}
                      disabled={!!quest.completed_at || completingQuest === quest.id}
                      onCheckedChange={() => handleCompleteQuest(quest.id)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    
                    <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${roleColor}`}>
                      <RoleIcon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{quest.title}</h3>
                          <p className="text-sm text-muted-foreground">{quest.description}</p>
                        </div>
                        <Badge variant="secondary" className="gap-1 flex-shrink-0">
                          <Zap className="w-3 h-3" />
                          +{quest.xp_reward} XP
                        </Badge>
                      </div>
                      <Badge variant="outline" className="mt-2 capitalize">
                        {quest.role_target}
                      </Badge>
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
            <div className="space-y-3">
              {normalQuests.map((quest) => {
                const RoleIcon = roleIcons[quest.role_target || 'grandmaster'] || Users
                const roleColor = roleColors[quest.role_target || 'grandmaster'] || 'text-gray-500'
                
                return (
                  <div
                    key={quest.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 transition-all hover-lift"
                  >
                    <Checkbox
                      checked={!!quest.completed_at}
                      disabled={!!quest.completed_at || completingQuest === quest.id}
                      onCheckedChange={() => handleCompleteQuest(quest.id)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    
                    <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${roleColor}`}>
                      <RoleIcon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{quest.title}</h3>
                          <p className="text-sm text-muted-foreground">{quest.description}</p>
                        </div>
                        <Badge variant="secondary" className="gap-1 flex-shrink-0">
                          <Zap className="w-3 h-3" />
                          +{quest.xp_reward} XP
                        </Badge>
                      </div>
                      <Badge variant="outline" className="mt-2 capitalize">
                        {quest.role_target}
                      </Badge>
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
              New quests will appear here. Check back soon!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
