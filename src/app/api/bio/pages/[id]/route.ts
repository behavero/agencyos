import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdatePageSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(['published', 'draft', 'banned']).optional(),
  theme: z
    .object({
      backgroundType: z.enum(['color', 'image', 'video', 'gradient']).optional(),
      backgroundValue: z.string().optional(),
      fontFamily: z.string().optional(),
      buttonStyle: z.enum(['rounded', 'sharp', 'glass', 'outline']).optional(),
      textColor: z.string().optional(),
      accentColor: z.string().optional(),
    })
    .optional(),
  pixels: z
    .object({
      meta_pixel_id: z.string().optional(),
      tiktok_pixel_id: z.string().optional(),
      google_analytics_id: z.string().optional(),
    })
    .optional(),
  seo_title: z.string().max(70).optional().nullable(),
  seo_description: z.string().max(160).optional().nullable(),
  seo_image: z.string().url().optional().nullable(),
})

/**
 * GET /api/bio/pages/[id]
 * Get a single bio page with blocks
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
    const { data: page, error } = await adminClient
      .from('bio_pages')
      .select(
        `
        *,
        model:models(id, name, avatar_url),
        blocks:bio_blocks(*)
      `
      )
      .eq('id', id)
      .single()

    if (error || !page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Sort blocks by order_index
    if (page.blocks) {
      page.blocks.sort(
        (a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index
      )
    }

    return NextResponse.json({ page })
  } catch (error) {
    console.error('[Bio Pages API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch page' }, { status: 500 })
  }
}

/**
 * PUT /api/bio/pages/[id]
 * Update a bio page
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
    const validation = UpdatePageSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()

    // If changing slug, check availability
    if (validation.data.slug) {
      const { data: existing } = await adminClient
        .from('bio_pages')
        .select('id')
        .eq('slug', validation.data.slug)
        .neq('id', id)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (validation.data.slug) updateData.slug = validation.data.slug
    if (validation.data.title) updateData.title = validation.data.title
    if ('description' in validation.data) updateData.description = validation.data.description
    if (validation.data.status) {
      updateData.status = validation.data.status
      if (validation.data.status === 'published') {
        updateData.published_at = new Date().toISOString()
      }
    }
    if (validation.data.theme) updateData.theme = validation.data.theme
    if (validation.data.pixels) updateData.pixels = validation.data.pixels
    if ('seo_title' in validation.data) updateData.seo_title = validation.data.seo_title
    if ('seo_description' in validation.data)
      updateData.seo_description = validation.data.seo_description
    if ('seo_image' in validation.data) updateData.seo_image = validation.data.seo_image

    const { data: page, error } = await adminClient
      .from('bio_pages')
      .update(updateData)
      .eq('id', id)
      .eq('agency_id', profile.agency_id)
      .select(
        `
        *,
        model:models(id, name, avatar_url)
      `
      )
      .single()

    if (error || !page) {
      console.error('[Bio Pages API] Update error:', error)
      return NextResponse.json({ error: 'Failed to update page' }, { status: 500 })
    }

    return NextResponse.json({ page })
  } catch (error) {
    console.error('[Bio Pages API] Error:', error)
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 })
  }
}

/**
 * DELETE /api/bio/pages/[id]
 * Delete a bio page
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
    const { error } = await adminClient
      .from('bio_pages')
      .delete()
      .eq('id', id)
      .eq('agency_id', profile.agency_id)

    if (error) {
      console.error('[Bio Pages API] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Bio Pages API] Error:', error)
    return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 })
  }
}
