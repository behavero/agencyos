/**
 * Quest Engine - Gamification System
 *
 * Tracks quest progress, awards XP, and handles rewards.
 * Called whenever revenue is generated or messages are sent.
 */

import { createAdminClient } from '@/lib/supabase/server'

type EventType = 'revenue' | 'message' | 'unlock' | 'login'

interface QuestEvent {
  userId: string
  eventType: EventType
  value: number
  modelId?: string
  metadata?: Record<string, unknown>
}

interface QuestProgress {
  id: string
  quest_id: string
  user_id: string
  current_value: number
  status: 'active' | 'completed' | 'failed' | 'expired'
}

interface Quest {
  id: string
  title: string
  type: string
  target_value: number
  reward_amount: number
  xp_reward: number
  expires_at: string | null
  is_flash: boolean
}

/**
 * Re-export XP utility functions from shared module
 * This allows them to be used in both server and client components
 */
export { calculateLevel, getXpForLevel, getXpForNextLevel } from '@/lib/utils/xp-calculator'

/**
 * Check and update quest progress for a user event
 */
export async function checkQuestProgress(event: QuestEvent): Promise<{
  questsCompleted: string[]
  xpEarned: number
  bonusEarned: number
  newLevel?: number
  newBadges?: string[]
}> {
  const supabase = await createAdminClient()
  const result = {
    questsCompleted: [] as string[],
    xpEarned: 0,
    bonusEarned: 0,
    newLevel: undefined as number | undefined,
    newBadges: [] as string[],
  }

  try {
    // Get user's current profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, agency_id, xp_count, level, total_revenue_generated, total_messages_sent')
      .eq('id', event.userId)
      .single()

    if (!profile) {
      console.error('[QuestEngine] User not found:', event.userId)
      return result
    }

    // Find active quests that match the event type
    const questTypeMap: Record<EventType, string[]> = {
      revenue: ['revenue', 'custom'],
      message: ['messages', 'custom'],
      unlock: ['unlocks', 'custom'],
      login: ['custom'],
    }

    const matchingTypes = questTypeMap[event.eventType]

    const { data: quests } = await supabase
      .from('quests')
      .select('*')
      .eq('agency_id', profile.agency_id)
      .in('type', matchingTypes)
      .is('completed_at', null)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .or(`assigned_to.is.null,assigned_to.eq.${event.userId}`)

    if (!quests || quests.length === 0) {
      return result
    }

    // Process each quest
    for (const quest of quests as Quest[]) {
      // Get or create progress record
      let { data: progress } = await supabase
        .from('quest_progress')
        .select('*')
        .eq('quest_id', quest.id)
        .eq('user_id', event.userId)
        .single()

      if (!progress) {
        // Create new progress record
        const { data: newProgress } = await supabase
          .from('quest_progress')
          .insert({
            quest_id: quest.id,
            user_id: event.userId,
            current_value: 0,
            status: 'active',
          })
          .select()
          .single()

        progress = newProgress
      }

      if (!progress || progress.status !== 'active') continue

      // Update progress
      const newValue = (progress as QuestProgress).current_value + event.value

      if (newValue >= quest.target_value) {
        // Quest completed!
        await supabase
          .from('quest_progress')
          .update({
            current_value: newValue,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', (progress as QuestProgress).id)

        // Mark quest as completed
        await supabase
          .from('quests')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', quest.id)

        result.questsCompleted.push(quest.title)
        result.xpEarned += quest.xp_reward || 0
        result.bonusEarned += quest.reward_amount || 0

        // Add bonus to pending payouts if there's a reward
        if (quest.reward_amount > 0) {
          await supabase.from('payouts').insert({
            agency_id: profile.agency_id,
            recipient_id: event.userId,
            period_start: new Date().toISOString().split('T')[0],
            period_end: new Date().toISOString().split('T')[0],
            amount_bonus: quest.reward_amount,
            amount_base: 0,
            amount_commission: 0,
            amount_deductions: 0,
            status: 'pending',
            notes: `Quest bonus: ${quest.title}`,
          })
        }
      } else {
        // Just update progress
        await supabase
          .from('quest_progress')
          .update({
            current_value: newValue,
            updated_at: new Date().toISOString(),
          })
          .eq('id', (progress as QuestProgress).id)
      }
    }

    // Update user stats and XP
    if (result.xpEarned > 0 || event.eventType === 'revenue' || event.eventType === 'message') {
      const updates: Record<string, unknown> = {}

      if (result.xpEarned > 0) {
        updates.xp_count = (profile.xp_count || 0) + result.xpEarned
      }

      if (event.eventType === 'revenue') {
        updates.total_revenue_generated = (profile.total_revenue_generated || 0) + event.value
      }

      if (event.eventType === 'message') {
        updates.total_messages_sent = (profile.total_messages_sent || 0) + event.value
      }

      if (Object.keys(updates).length > 0) {
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', event.userId)
          .select('level')
          .single()

        if (updatedProfile && updatedProfile.level > (profile.level || 1)) {
          result.newLevel = updatedProfile.level
        }
      }
    }

    // Check for new badges
    if (result.xpEarned > 0 || result.questsCompleted.length > 0) {
      result.newBadges = await checkBadges(event.userId)
    }

    return result
  } catch (error) {
    console.error('[QuestEngine] Error:', error)
    return result
  }
}

/**
 * Check and award badges based on user achievements
 */
async function checkBadges(userId: string): Promise<string[]> {
  const supabase = await createAdminClient()
  const newBadges: string[] = []

  try {
    // Get user profile with current badges
    const { data: profile } = await supabase
      .from('profiles')
      .select(
        'badges, level, current_streak, total_revenue_generated, total_messages_sent, quests_completed'
      )
      .eq('id', userId)
      .single()

    if (!profile) return newBadges

    const currentBadges = (profile.badges as string[]) || []

    // Get all badge definitions
    const { data: badges } = await supabase
      .from('badge_definitions')
      .select('*')
      .eq('is_active', true)

    if (!badges) return newBadges

    for (const badge of badges) {
      if (currentBadges.includes(badge.slug)) continue

      let earned = false

      switch (badge.requirement_type) {
        case 'level':
          earned = (profile.level || 1) >= badge.requirement_value
          break
        case 'streak':
          earned = (profile.current_streak || 0) >= badge.requirement_value
          break
        case 'revenue':
          earned = (profile.total_revenue_generated || 0) >= badge.requirement_value
          break
        case 'messages':
          earned = (profile.total_messages_sent || 0) >= badge.requirement_value
          break
        case 'quests':
          earned = (profile.quests_completed || 0) >= badge.requirement_value
          break
      }

      if (earned) {
        newBadges.push(badge.slug)
      }
    }

    // Award new badges
    if (newBadges.length > 0) {
      await supabase
        .from('profiles')
        .update({
          badges: [...currentBadges, ...newBadges],
        })
        .eq('id', userId)
    }

    return newBadges
  } catch (error) {
    console.error('[QuestEngine] Badge check error:', error)
    return newBadges
  }
}

/**
 * Create a flash quest (time-limited challenge)
 */
export async function createFlashQuest(params: {
  agencyId: string
  title: string
  description: string
  type: 'revenue' | 'messages' | 'unlocks'
  targetValue: number
  rewardAmount: number
  durationMinutes: number
  createdBy?: string
}): Promise<{ success: boolean; quest?: Quest; error?: string }> {
  const supabase = await createAdminClient()

  try {
    const expiresAt = new Date(Date.now() + params.durationMinutes * 60 * 1000)

    const { data: quest, error } = await supabase
      .from('quests')
      .insert({
        agency_id: params.agencyId,
        title: params.title,
        description: params.description,
        type: params.type,
        target_value: params.targetValue,
        reward_amount: params.rewardAmount,
        xp_reward: Math.round(params.rewardAmount * 10), // 10 XP per dollar reward
        expires_at: expiresAt.toISOString(),
        is_flash: true,
        is_daily: false,
        created_by: params.createdBy,
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, quest: quest as Quest }
  } catch (error) {
    console.error('[QuestEngine] Create flash quest error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create quest',
    }
  }
}

/**
 * Get leaderboard for the current week
 */
export async function getWeeklyLeaderboard(agencyId: string): Promise<{
  leaderboard: Array<{
    rank: number
    userId: string
    username: string
    avatar?: string
    level: number
    revenue: number
    trend: 'up' | 'down' | 'same'
  }>
  error?: string
}> {
  const supabase = await createAdminClient()

  try {
    // Get current week start (Monday)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const weekStart = new Date(now.setDate(diff))
    weekStart.setHours(0, 0, 0, 0)

    // Get last week start
    const lastWeekStart = new Date(weekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)

    // Get profiles with revenue data
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, level, total_revenue_generated, avatar_url')
      .eq('agency_id', agencyId)
      .not('role', 'is', null)
      .order('total_revenue_generated', { ascending: false })
      .limit(10)

    if (!profiles) return { leaderboard: [] }

    // Get last week's snapshots for trend comparison
    const { data: lastWeekSnapshots } = await supabase
      .from('leaderboard_snapshots')
      .select('user_id, rank')
      .eq('agency_id', agencyId)
      .eq('week_start', lastWeekStart.toISOString().split('T')[0])

    const lastRanks = new Map(lastWeekSnapshots?.map(s => [s.user_id, s.rank]) || [])

    const leaderboard = profiles.map((p, index) => {
      const currentRank = index + 1
      const lastRank = lastRanks.get(p.id)

      let trend: 'up' | 'down' | 'same' = 'same'
      if (lastRank !== undefined) {
        if (currentRank < lastRank) trend = 'up'
        else if (currentRank > lastRank) trend = 'down'
      }

      return {
        rank: currentRank,
        userId: p.id,
        username: p.username || 'Unknown',
        avatar: p.avatar_url,
        level: p.level || 1,
        revenue: p.total_revenue_generated || 0,
        trend,
      }
    })

    return { leaderboard }
  } catch (error) {
    console.error('[QuestEngine] Leaderboard error:', error)
    return { leaderboard: [], error: 'Failed to load leaderboard' }
  }
}

/**
 * Get active quests for a user
 */
export async function getUserQuests(userId: string): Promise<{
  daily: Array<Quest & { progress: number }>
  bounties: Array<Quest & { progress: number }>
  flash: Array<Quest & { progress: number; timeLeft: string }>
}> {
  const supabase = await createAdminClient()

  try {
    // Get user's agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', userId)
      .single()

    if (!profile) return { daily: [], bounties: [], flash: [] }

    // Get all active quests
    const { data: quests } = await supabase
      .from('quests')
      .select(
        `
        *,
        progress:quest_progress(current_value, status)
      `
      )
      .eq('agency_id', profile.agency_id)
      .is('completed_at', null)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .or(`assigned_to.is.null,assigned_to.eq.${userId}`)

    if (!quests) return { daily: [], bounties: [], flash: [] }

    const daily: Array<Quest & { progress: number }> = []
    const bounties: Array<Quest & { progress: number }> = []
    const flash: Array<Quest & { progress: number; timeLeft: string }> = []

    for (const quest of quests) {
      const progressData = quest.progress?.[0]
      const currentValue = progressData?.current_value || 0
      const progressPercent = Math.min(100, Math.round((currentValue / quest.target_value) * 100))

      const questWithProgress = {
        ...quest,
        progress: progressPercent,
      }

      if (quest.is_flash && quest.expires_at) {
        const timeLeft = getTimeLeft(quest.expires_at)
        flash.push({ ...questWithProgress, timeLeft })
      } else if (quest.reward_amount > 50) {
        bounties.push(questWithProgress)
      } else {
        daily.push(questWithProgress)
      }
    }

    return { daily, bounties, flash }
  } catch (error) {
    console.error('[QuestEngine] Get user quests error:', error)
    return { daily: [], bounties: [], flash: [] }
  }
}

function getTimeLeft(expiresAt: string): string {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()

  if (diff <= 0) return 'Expired'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
