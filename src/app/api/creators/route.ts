import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/creators
 * Create a new creator for the agency
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 400 })
    }

    // Get creator data from request body
    const body = await request.json()

    const creatorData = {
      agency_id: profile.agency_id,
      name: body.name,
      fanvue_username: body.fanvue_username || null,
      avatar_url: body.avatar_url || null,
      instagram_handle: body.instagram_handle || null,
      twitter_handle: body.twitter_handle || null,
      tiktok_handle: body.tiktok_handle || null,
      agency_split_percentage: body.agency_split_percentage || 50,
      status: body.status || 'active',
    }

    // Use admin client to create
    const adminClient = createAdminClient()

    const { data, error } = await adminClient.from('models').insert([creatorData]).select().single()

    if (error) {
      console.error('[Create Creator] Error:', error)
      throw error
    }

    return NextResponse.json({ success: true, ...data }, { status: 201 })
  } catch (error: unknown) {
    console.error('[Create Creator] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create creator'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
