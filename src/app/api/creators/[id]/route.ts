import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * DELETE /api/creators/[id]
 * Delete a creator from the agency
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify user is authenticated
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Use admin client to delete
    const adminClient = createAdminClient()

    const { error } = await adminClient.from('models').delete().eq('id', id)

    if (error) {
      console.error('[Delete Creator] Error:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[Delete Creator] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete creator'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

/**
 * GET /api/creators/[id]
 * Get creator details with Fanvue stats
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: model, error } = await supabase.from('models').select('*').eq('id', id).single()

    if (error) throw error

    // TODO: Fetch real stats from Fanvue API using model.fanvue_api_key
    // For now, return mock stats
    const stats = {
      followers: 0,
      subscribers: 0,
      views: 0,
      revenue: 0,
      mediaCount: 0,
    }

    return NextResponse.json({
      ...model,
      stats,
    })
  } catch (error: unknown) {
    console.error('[Get Creator] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to get creator'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

/**
 * PATCH /api/creators/[id]
 * Update creator details (name, social handles, settings)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Verify user is authenticated
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get update data from request body
    const body = await request.json()

    // Define allowed fields to update
    const allowedFields = [
      'name',
      'fanvue_username',
      'instagram_handle',
      'twitter_handle',
      'tiktok_handle',
      'agency_split_percentage',
      'status',
      'avatar_url',
    ]

    // Filter only allowed fields
    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    // Use admin client to update
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('models')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Update Creator] Error:', error)
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    console.error('[Update Creator] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update creator'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
