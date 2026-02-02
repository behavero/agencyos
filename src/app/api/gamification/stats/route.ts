import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = await createAdminClient()

    // Get user profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('xp_count, level, current_streak, total_revenue_generated, quests_completed, badges')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      xp: profile.xp_count || 0,
      level: profile.level || 1,
      streak: profile.current_streak || 0,
      questsCompleted: profile.quests_completed || 0,
      totalRevenue: profile.total_revenue_generated || 0,
      badges: profile.badges || [],
    })
  } catch (error) {
    console.error('[Gamification Stats] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
