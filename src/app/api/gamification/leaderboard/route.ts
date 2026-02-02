import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getWeeklyLeaderboard } from '@/lib/services/quest-engine'

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

    // Get user's agency
    const { data: profile } = await adminClient
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ leaderboard: [] })
    }

    const result = await getWeeklyLeaderboard(profile.agency_id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Gamification Leaderboard] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
