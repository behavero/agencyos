import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schema
const ContentTaskSchema = z.object({
  title: z.string().min(1).max(200),
  caption: z.string().max(2000).optional(),
  media_url: z.string().url().optional().nullable(),
  notes: z.string().max(1000).optional(),
  platform: z.enum(['instagram', 'fanvue', 'tiktok', 'youtube', 'x', 'twitter']),
  content_type: z.enum(['reel', 'story', 'post', 'carousel', 'video', 'ppv', 'live']),
  status: z.enum(['idea', 'draft', 'scheduled', 'posted', 'missed', 'cancelled']).optional(),
  scheduled_at: z.string().datetime().optional().nullable(),
  model_id: z.string().uuid().optional().nullable(),
  assignee_id: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  tags: z.array(z.string()).optional(),
  vault_asset_id: z.string().uuid().optional().nullable(),
})

/**
 * GET /api/content/tasks
 * Fetch content tasks with optional filters
 */
export async function GET(request: NextRequest) {
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

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const platform = searchParams.get('platform')
    const modelId = searchParams.get('model_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Build query
    const adminClient = await createAdminClient()
    let query = adminClient
      .from('content_tasks')
      .select(
        `
        *,
        model:models(id, name),
        assignee:profiles(id, username)
      `
      )
      .eq('agency_id', profile.agency_id)
      .order('scheduled_at', { ascending: true, nullsFirst: false })

    if (status) query = query.eq('status', status)
    if (platform) query = query.eq('platform', platform)
    if (modelId) query = query.eq('model_id', modelId)
    if (startDate) query = query.gte('scheduled_at', startDate)
    if (endDate) query = query.lte('scheduled_at', endDate)

    const { data: tasks, error } = await query

    if (error) {
      console.error('[Content Tasks API] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('[Content Tasks API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

/**
 * POST /api/content/tasks
 * Create a new content task
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
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    // Parse and validate body
    const body = await request.json()
    const validation = ContentTaskSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()
    const { data: task, error } = await adminClient
      .from('content_tasks')
      .insert({
        agency_id: profile.agency_id,
        created_by: user.id,
        ...validation.data,
      })
      .select(
        `
        *,
        model:models(id, name),
        assignee:profiles(id, username)
      `
      )
      .single()

    if (error) {
      console.error('[Content Tasks API] Insert error:', error)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('[Content Tasks API] Error:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
