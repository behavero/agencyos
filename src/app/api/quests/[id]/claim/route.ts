import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createQuestVerifier, type VerificationType } from '@/lib/services/quest-verifier'

/**
 * POST /api/quests/[id]/claim
 * Claim a quest reward (only if verified or MANUAL)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questId } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user's profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    // Get the quest
    const { data: quest } = await adminClient
      .from('quests')
      .select('*')
      .eq('id', questId)
      .single()

    if (!quest) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 })
    }

    // Check if already completed
    if (quest.completed_at) {
      return NextResponse.json({ error: 'Quest already claimed' }, { status: 400 })
    }

    // For API-verified quests, check if requirements are met
    if (quest.verification_type !== 'MANUAL') {
      // Get model for verification
      const { data: models } = await adminClient
        .from('models')
        .select('fanvue_access_token')
        .eq('agency_id', profile.agency_id)
        .not('fanvue_access_token', 'is', null)
        .limit(1)

      if (!models || models.length === 0) {
        return NextResponse.json({ error: 'No connected models for verification' }, { status: 400 })
      }

      const verifier = createQuestVerifier(models[0].fanvue_access_token!)
      const result = await verifier.verify(
        quest.verification_type as VerificationType,
        quest.target_count || 1
      )

      if (!result.verified) {
        return NextResponse.json({
          error: 'Quest requirements not met',
          currentProgress: result.currentProgress,
          targetCount: quest.target_count,
          message: result.message,
        }, { status: 400 })
      }
    }

    // Mark quest as completed
    const now = new Date().toISOString()
    const { error: questError } = await adminClient
      .from('quests')
      .update({
        completed_at: now,
        current_progress: quest.target_count || 1,
      })
      .eq('id', questId)

    if (questError) throw questError

    // Award XP to profile
    const newXp = (profile.xp_count || 0) + (quest.xp_reward || 50)
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ xp_count: newXp })
      .eq('id', user.id)

    if (profileError) throw profileError

    // Update streak if this is a daily quest
    if (quest.is_daily) {
      const { error: streakError } = await adminClient
        .from('profiles')
        .update({ current_streak: (profile.current_streak || 0) + 1 })
        .eq('id', user.id)

      if (streakError) console.error('Failed to update streak:', streakError)
    }

    return NextResponse.json({
      success: true,
      xpAwarded: quest.xp_reward || 50,
      newTotalXp: newXp,
      message: `Quest completed! +${quest.xp_reward || 50} XP`,
    })

  } catch (error: any) {
    console.error('[Quest Claim] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
