import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const SegmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  criteria: z.record(z.string(), z.unknown()),
})

/**
 * GET /api/marketing/segments
 * List all segments for the agency
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    const { data: segments, error } = await supabase
      .from('marketing_segments')
      .select('*')
      .eq('agency_id', profile.agency_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Segments API] GET error:', error)
      return NextResponse.json({ error: 'Failed to fetch segments' }, { status: 500 })
    }

    return NextResponse.json({ segments })
  } catch (error) {
    console.error('[Segments API] GET error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch segments'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/marketing/segments
 * Create a new segment
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    // Check permissions
    if (!['owner', 'admin', 'grandmaster', 'paladin'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const validation = SegmentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()

    const { data: segment, error } = await adminClient
      .from('marketing_segments')
      .insert({
        agency_id: profile.agency_id,
        ...validation.data,
      })
      .select()
      .single()

    if (error) {
      console.error('[Segments API] POST error:', error)
      return NextResponse.json({ error: 'Failed to create segment' }, { status: 500 })
    }

    return NextResponse.json({ segment }, { status: 201 })
  } catch (error) {
    console.error('[Segments API] POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create segment'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
