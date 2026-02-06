import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/user/profile
 * Get current user's profile including role and permissions
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(
        `
        id,
        username,
        role,
        agency_id,
        timezone,
        xp_count,
        current_streak,
        league_rank,
        created_at
      `
      )
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('[User Profile API] Error:', error)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get assigned models if not owner/admin
    let assignedModels: { id: string; name: string }[] = []

    if (profile.role && !['owner', 'admin', 'grandmaster', 'paladin'].includes(profile.role)) {
      const { data: assignments } = await supabase
        .from('model_assignments')
        .select('model:models(id, name)')
        .eq('profile_id', user.id)

      assignedModels =
        (assignments
          ?.flatMap((a: any) => a.model)
          .filter((m: any) => m && typeof m === 'object' && 'id' in m && 'name' in m)
          .map((m: any) => ({ id: m.id, name: m.name })) as { id: string; name: string }[]) || []
    }

    return NextResponse.json({
      profile,
      assignedModels,
      email: user.email,
    })
  } catch (error) {
    console.error('[User Profile API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

/**
 * PATCH /api/user/profile
 * Update current user's profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { username, timezone } = body

    const updateData: Record<string, string> = {}
    if (username !== undefined) updateData.username = username
    if (timezone !== undefined) updateData.timezone = timezone

    const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id)

    if (error) {
      console.error('[User Profile API] Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[User Profile API] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
