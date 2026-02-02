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

    // Get all badge definitions
    const { data: badges } = await adminClient
      .from('badge_definitions')
      .select('slug, name, description, icon, category, requirement_type, requirement_value')
      .eq('is_active', true)
      .order('requirement_value', { ascending: true })

    return NextResponse.json({ badges: badges || [] })
  } catch (error) {
    console.error('[Gamification Badges] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch badges' }, { status: 500 })
  }
}
