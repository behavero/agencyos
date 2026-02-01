import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createQuestVerifier, type VerificationType } from '@/lib/services/quest-verifier'

/**
 * POST /api/quests/refresh
 * Refresh quest progress by verifying against Fanvue API
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user's profile and agency
    const { data: profile } = await adminClient
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 400 })
    }

    // Get all active quests for the agency
    const { data: quests } = await adminClient
      .from('quests')
      .select('*')
      .or(`agency_id.eq.${profile.agency_id},agency_id.is.null`)
      .is('completed_at', null)

    if (!quests || quests.length === 0) {
      return NextResponse.json({ 
        message: 'No active quests', 
        quests: [],
        synced: 0 
      })
    }

    // Get models for the agency (for API verification)
    const { data: models } = await adminClient
      .from('models')
      .select('id, fanvue_access_token')
      .eq('agency_id', profile.agency_id)
      .not('fanvue_access_token', 'is', null)

    if (!models || models.length === 0) {
      return NextResponse.json({ 
        message: 'No connected models', 
        quests,
        synced: 0 
      })
    }

    // Use the first connected model for verification
    const primaryModel = models[0]
    const verifier = createQuestVerifier(primaryModel.fanvue_access_token!)

    const updatedQuests = []
    const now = new Date().toISOString()

    // Verify each quest
    for (const quest of quests) {
      if (quest.verification_type === 'MANUAL') {
        // Manual quests don't need API verification
        updatedQuests.push({ ...quest, synced: false })
        continue
      }

      try {
        const result = await verifier.verify(
          quest.verification_type as VerificationType,
          quest.target_count || 1
        )

        // Update quest progress in database
        await adminClient
          .from('quests')
          .update({
            current_progress: result.currentProgress,
            last_synced_at: now,
          })
          .eq('id', quest.id)

        updatedQuests.push({
          ...quest,
          current_progress: result.currentProgress,
          last_synced_at: now,
          verified: result.verified,
          synced: true,
        })
      } catch (error) {
        console.error(`[Quests Refresh] Error verifying quest ${quest.id}:`, error)
        updatedQuests.push({ ...quest, synced: false, error: true })
      }
    }

    return NextResponse.json({
      message: 'Quests synced',
      quests: updatedQuests,
      synced: updatedQuests.filter(q => q.synced).length,
      timestamp: now,
    })

  } catch (error: any) {
    console.error('[Quests Refresh] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
