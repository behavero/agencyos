import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreatePageSchema = z.object({
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  title: z.string().min(1).max(100),
  model_id: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
})

/**
 * GET /api/bio/pages
 * List all bio pages for the agency
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

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
    const { data: pages, error } = await adminClient
      .from('bio_pages')
      .select(`
        *,
        model:models(id, name, avatar_url),
        blocks:bio_blocks(count)
      `)
      .eq('agency_id', profile.agency_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Bio Pages API] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 })
    }

    return NextResponse.json({ pages })
  } catch (error) {
    console.error('[Bio Pages API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 })
  }
}

/**
 * POST /api/bio/pages
 * Create a new bio page
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

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

    const body = await request.json()
    const validation = CreatePageSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()

    // Check slug availability
    const { data: existing } = await adminClient
      .from('bio_pages')
      .select('id')
      .eq('slug', validation.data.slug)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Slug already taken' },
        { status: 409 }
      )
    }

    // Create the page
    const { data: page, error } = await adminClient
      .from('bio_pages')
      .insert({
        agency_id: profile.agency_id,
        slug: validation.data.slug,
        title: validation.data.title,
        model_id: validation.data.model_id || null,
        description: validation.data.description || null,
        status: 'draft',
      })
      .select(`
        *,
        model:models(id, name, avatar_url)
      `)
      .single()

    if (error) {
      console.error('[Bio Pages API] Create error:', error)
      return NextResponse.json({ error: 'Failed to create page' }, { status: 500 })
    }

    // Create default header block
    await adminClient.from('bio_blocks').insert({
      page_id: page.id,
      type: 'header',
      content: {
        title: validation.data.title,
        subtitle: 'Welcome to my links',
        avatar_url: null,
      },
      order_index: 0,
    })

    return NextResponse.json({ page })
  } catch (error) {
    console.error('[Bio Pages API] Error:', error)
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 })
  }
}
