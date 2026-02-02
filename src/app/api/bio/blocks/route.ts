import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const BlockSchema = z.object({
  page_id: z.string().uuid(),
  type: z.enum([
    'header',
    'social_row',
    'button',
    'video',
    'text',
    'spacer',
    'image',
    'divider',
    'countdown',
  ]),
  content: z.record(z.string(), z.unknown()).default({}),
  config: z.record(z.string(), z.unknown()).default({}),
  order_index: z.number().int().min(0).optional(),
})

const ReorderSchema = z.object({
  page_id: z.string().uuid(),
  block_order: z.array(z.string().uuid()),
})

/**
 * POST /api/bio/blocks
 * Create a new block
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
    const validation = BlockSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()

    // Verify page ownership
    const { data: page } = await adminClient
      .from('bio_pages')
      .select('id')
      .eq('id', validation.data.page_id)
      .eq('agency_id', profile.agency_id)
      .single()

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Get max order_index
    const { data: maxBlock } = await adminClient
      .from('bio_blocks')
      .select('order_index')
      .eq('page_id', validation.data.page_id)
      .order('order_index', { ascending: false })
      .limit(1)
      .single()

    const orderIndex = validation.data.order_index ?? (maxBlock?.order_index || 0) + 1

    // Create the block
    const { data: block, error } = await adminClient
      .from('bio_blocks')
      .insert({
        page_id: validation.data.page_id,
        type: validation.data.type,
        content: validation.data.content,
        config: validation.data.config,
        order_index: orderIndex,
      })
      .select()
      .single()

    if (error) {
      console.error('[Bio Blocks API] Create error:', error)
      return NextResponse.json({ error: 'Failed to create block' }, { status: 500 })
    }

    return NextResponse.json({ block })
  } catch (error) {
    console.error('[Bio Blocks API] Error:', error)
    return NextResponse.json({ error: 'Failed to create block' }, { status: 500 })
  }
}

/**
 * PUT /api/bio/blocks
 * Reorder blocks
 */
export async function PUT(request: NextRequest) {
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
    const validation = ReorderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()

    // Verify page ownership
    const { data: page } = await adminClient
      .from('bio_pages')
      .select('id')
      .eq('id', validation.data.page_id)
      .eq('agency_id', profile.agency_id)
      .single()

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Update order for each block
    const updates = validation.data.block_order.map((blockId, index) =>
      adminClient
        .from('bio_blocks')
        .update({ order_index: index, updated_at: new Date().toISOString() })
        .eq('id', blockId)
        .eq('page_id', validation.data.page_id)
    )

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Bio Blocks API] Error:', error)
    return NextResponse.json({ error: 'Failed to reorder blocks' }, { status: 500 })
  }
}
