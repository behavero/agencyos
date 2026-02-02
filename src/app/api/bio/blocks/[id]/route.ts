import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdateBlockSchema = z.object({
  type: z
    .enum([
      'header',
      'social_row',
      'button',
      'video',
      'text',
      'spacer',
      'image',
      'divider',
      'countdown',
    ])
    .optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
})

/**
 * GET /api/bio/blocks/[id]
 * Get a single block
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = await createAdminClient()
    const { data: block, error } = await adminClient
      .from('bio_blocks')
      .select('*, page:bio_pages(id, agency_id, slug)')
      .eq('id', id)
      .single()

    if (error || !block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 })
    }

    return NextResponse.json({ block })
  } catch (error) {
    console.error('[Bio Blocks API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch block' }, { status: 500 })
  }
}

/**
 * PUT /api/bio/blocks/[id]
 * Update a block
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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
    const validation = UpdateBlockSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()

    // Verify ownership through page
    const { data: existingBlock } = await adminClient
      .from('bio_blocks')
      .select('*, page:bio_pages(agency_id)')
      .eq('id', id)
      .single()

    if (!existingBlock) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 })
    }

    const page = existingBlock.page as { agency_id: string } | null
    if (page?.agency_id !== profile.agency_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update the block
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (validation.data.type) updateData.type = validation.data.type
    if (validation.data.content) updateData.content = validation.data.content
    if (validation.data.config) updateData.config = validation.data.config

    const { data: block, error } = await adminClient
      .from('bio_blocks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error || !block) {
      console.error('[Bio Blocks API] Update error:', error)
      return NextResponse.json({ error: 'Failed to update block' }, { status: 500 })
    }

    return NextResponse.json({ block })
  } catch (error) {
    console.error('[Bio Blocks API] Error:', error)
    return NextResponse.json({ error: 'Failed to update block' }, { status: 500 })
  }
}

/**
 * DELETE /api/bio/blocks/[id]
 * Delete a block
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Verify ownership through page
    const { data: existingBlock } = await adminClient
      .from('bio_blocks')
      .select('*, page:bio_pages(agency_id)')
      .eq('id', id)
      .single()

    if (!existingBlock) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 })
    }

    const page = existingBlock.page as { agency_id: string } | null
    if (page?.agency_id !== profile.agency_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { error } = await adminClient.from('bio_blocks').delete().eq('id', id)

    if (error) {
      console.error('[Bio Blocks API] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Bio Blocks API] Error:', error)
    return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 })
  }
}
