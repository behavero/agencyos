import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

/**
 * POST /api/quests/seed
 * Create sample quests for testing (development only)
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

    // Sample quests with different verification types
    const sampleQuests = [
      // Daily API-verified quests
      {
        agency_id: profile.agency_id,
        title: 'Reply Grind',
        description: 'Send 10 messages to fans today',
        xp_reward: 100,
        is_daily: true,
        verification_type: 'API_MESSAGES',
        target_count: 10,
        current_progress: 0,
        role_target: 'ranger',
      },
      {
        agency_id: profile.agency_id,
        title: 'Content Creator',
        description: 'Post 2 new pieces of content',
        xp_reward: 150,
        is_daily: true,
        verification_type: 'API_POSTS',
        target_count: 2,
        current_progress: 0,
        role_target: 'alchemist',
      },
      {
        agency_id: profile.agency_id,
        title: 'Money Maker',
        description: 'Earn $100 in revenue today',
        xp_reward: 200,
        is_daily: true,
        verification_type: 'API_REVENUE',
        target_count: 100,
        current_progress: 0,
        role_target: 'grandmaster',
      },
      // Weekly/milestone quests
      {
        agency_id: profile.agency_id,
        title: 'Subscriber Milestone',
        description: 'Reach 100 active subscribers',
        xp_reward: 500,
        is_daily: false,
        verification_type: 'API_SUBSCRIBERS',
        target_count: 100,
        current_progress: 0,
        role_target: 'paladin',
      },
      // Manual quests
      {
        agency_id: profile.agency_id,
        title: 'Team Meeting',
        description: 'Host a weekly team sync meeting',
        xp_reward: 75,
        is_daily: false,
        verification_type: 'MANUAL',
        target_count: 1,
        current_progress: 0,
        role_target: 'grandmaster',
      },
      {
        agency_id: profile.agency_id,
        title: 'Review Analytics',
        description: 'Review and document weekly performance',
        xp_reward: 50,
        is_daily: true,
        verification_type: 'MANUAL',
        target_count: 1,
        current_progress: 0,
        role_target: 'ranger',
      },
    ]

    // Insert quests
    const { data: insertedQuests, error } = await adminClient
      .from('quests')
      .insert(sampleQuests)
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: `Created ${insertedQuests?.length || 0} sample quests`,
      quests: insertedQuests,
    })

  } catch (error: any) {
    console.error('[Quest Seed] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
