'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { QuestCard } from '@/components/gamification/quest-card'
import { XpRing, XpProgress } from '@/components/gamification/xp-ring'
import { Leaderboard } from '@/components/gamification/leaderboard'
import { Flame, Target, Zap, Trophy, Star } from 'lucide-react'

interface Quest {
  id: string
  title: string
  description?: string
  type: 'revenue' | 'messages' | 'unlocks' | 'speed' | 'custom'
  target_value: number
  reward_amount: number
  xp_reward: number
  is_flash: boolean
  expires_at?: string
  progress: number
  current_value?: number
  timeLeft?: string
}

interface UserStats {
  xp: number
  level: number
  streak: number
  questsCompleted: number
  totalRevenue: number
  rank?: number
  badges: string[]
}

interface BadgeInfo {
  slug: string
  name: string
  icon: string
  description: string
}

export function QuestsClient() {
  const [dailyQuests, setDailyQuests] = useState<Quest[]>([])
  const [bounties, setBounties] = useState<Quest[]>([])
  const [flashQuests, setFlashQuests] = useState<Quest[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [badges, setBadges] = useState<BadgeInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [questsRes, statsRes, badgesRes] = await Promise.all([
          fetch('/api/gamification/quests'),
          fetch('/api/gamification/stats'),
          fetch('/api/gamification/badges'),
        ])

        if (questsRes.ok) {
          const data = await questsRes.json()
          setDailyQuests(data.daily || [])
          setBounties(data.bounties || [])
          setFlashQuests(data.flash || [])
        }

        if (statsRes.ok) {
          const data = await statsRes.json()
          setUserStats(data)
        }

        if (badgesRes.ok) {
          const data = await badgesRes.json()
          setBadges(data.badges || [])
        }
      } catch (error) {
        console.error('Failed to fetch quest data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-zinc-900 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-zinc-900 rounded-lg animate-pulse" />
            <div className="h-64 bg-zinc-900 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Flash Quests Banner */}
      {flashQuests.length > 0 && (
        <Card className="bg-gradient-to-r from-orange-950/50 to-red-950/50 border-orange-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-orange-400">
              <Zap className="h-5 w-5" />
              Flash Quests
              <Badge variant="outline" className="ml-2 border-orange-500/30 text-orange-400">
                Limited Time!
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {flashQuests.map(quest => (
                <QuestCard
                  key={quest.id}
                  title={quest.title}
                  description={quest.description}
                  type={quest.type}
                  targetValue={quest.target_value}
                  currentValue={quest.current_value}
                  progress={quest.progress}
                  rewardAmount={quest.reward_amount}
                  xpReward={quest.xp_reward}
                  timeLeft={quest.timeLeft}
                  isFlash
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Quests Area */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="daily" className="space-y-4">
            <TabsList className="bg-zinc-900 border border-zinc-800">
              <TabsTrigger value="daily" className="data-[state=active]:bg-zinc-800">
                <Target className="h-4 w-4 mr-2" />
                Daily Quests
              </TabsTrigger>
              <TabsTrigger value="bounties" className="data-[state=active]:bg-zinc-800">
                <Trophy className="h-4 w-4 mr-2" />
                Bounties
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-4">
              {dailyQuests.length === 0 ? (
                <Card className="bg-zinc-950 border-zinc-800">
                  <CardContent className="py-8 text-center">
                    <Target className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500">No daily quests available</p>
                    <p className="text-xs text-zinc-600 mt-1">Check back tomorrow!</p>
                  </CardContent>
                </Card>
              ) : (
                dailyQuests.map(quest => (
                  <QuestCard
                    key={quest.id}
                    title={quest.title}
                    description={quest.description}
                    type={quest.type}
                    targetValue={quest.target_value}
                    currentValue={quest.current_value}
                    progress={quest.progress}
                    rewardAmount={quest.reward_amount}
                    xpReward={quest.xp_reward}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="bounties" className="space-y-4">
              {bounties.length === 0 ? (
                <Card className="bg-zinc-950 border-zinc-800">
                  <CardContent className="py-8 text-center">
                    <Trophy className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500">No bounties available</p>
                    <p className="text-xs text-zinc-600 mt-1">High-value targets coming soon!</p>
                  </CardContent>
                </Card>
              ) : (
                bounties.map(quest => (
                  <QuestCard
                    key={quest.id}
                    title={quest.title}
                    description={quest.description}
                    type={quest.type}
                    targetValue={quest.target_value}
                    currentValue={quest.current_value}
                    progress={quest.progress}
                    rewardAmount={quest.reward_amount}
                    xpReward={quest.xp_reward}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* My Stats */}
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400" />
                My Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* XP Ring */}
              <div className="flex justify-center">
                <XpRing xp={userStats?.xp || 0} level={userStats?.level || 1} size="lg" />
              </div>

              {/* XP Progress */}
              <XpProgress xp={userStats?.xp || 0} level={userStats?.level || 1} />

              <Separator className="bg-zinc-800" />

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Flame className="h-4 w-4 text-orange-400" />
                    <span className="text-2xl font-bold">{userStats?.streak || 0}</span>
                  </div>
                  <span className="text-xs text-zinc-500">Day Streak</span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Target className="h-4 w-4 text-green-400" />
                    <span className="text-2xl font-bold">{userStats?.questsCompleted || 0}</span>
                  </div>
                  <span className="text-xs text-zinc-500">Quests Done</span>
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Badges */}
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-2">Badges</h4>
                <div className="flex flex-wrap gap-2">
                  {badges.length === 0 ? (
                    <p className="text-xs text-zinc-600">No badges yet. Keep grinding!</p>
                  ) : (
                    badges
                      .filter(b => userStats?.badges?.includes(b.slug))
                      .map(badge => (
                        <div
                          key={badge.slug}
                          className="text-2xl cursor-help"
                          title={`${badge.name}: ${badge.description}`}
                        >
                          {badge.icon}
                        </div>
                      ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Leaderboard compact limit={5} />
        </div>
      </div>
    </div>
  )
}
