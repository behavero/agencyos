import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateRedirectSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  name: z.string().max(100).optional(),
  target_url: z.string().url(),
  target_type: z.enum(['external', 'vault', 'fanvue', 'bio_page']).default('external'),
  breakout_mode: z.enum(['smart', 'force', 'none']).default('smart'),
  model_id: z.string().uuid().optional(),
})

/**
 * GET /api/redirects
 * List all redirect links
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

    const adminClient = await createAdminClient()
    const { data: links, error } = await adminClient
      .from('redirect_links')
      .select(
        `
        *,
        model:models(id, name)
      `
      )
      .eq('agency_id', profile.agency_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Redirects API] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
    }

    return NextResponse.json({ links })
  } catch (error) {
    console.error('[Redirects API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
  }
}

/**
 * POST /api/redirects
 * Create a new redirect link
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

    const body = await request.json()
    const validation = CreateRedirectSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()

    // Check slug availability
    const { data: existing } = await adminClient
      .from('redirect_links')
      .select('id')
      .eq('slug', validation.data.slug)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
    }

    // Create the link
    const { data: link, error } = await adminClient
      .from('redirect_links')
      .insert({
        agency_id: profile.agency_id,
        slug: validation.data.slug,
        name: validation.data.name || validation.data.slug,
        target_url: validation.data.target_url,
        target_type: validation.data.target_type,
        breakout_mode: validation.data.breakout_mode,
        model_id: validation.data.model_id || null,
      })
      .select(
        `
        *,
        model:models(id, name)
      `
      )
      .single()

    if (error) {
      console.error('[Redirects API] Create error:', error)
      return NextResponse.json({ error: 'Failed to create link' }, { status: 500 })
    }

    return NextResponse.json({ link })
  } catch (error) {
    console.error('[Redirects API] Error:', error)
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 })
  }
}
