import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/content/tasks/[id]
 * Get a specific content task
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = await createAdminClient()
    const { data: task, error } = await adminClient
      .from('content_tasks')
      .select(`
        *,
        model:models(id, name),
        assignee:profiles(id, username)
      `)
      .eq('id', id)
      .single()

    if (error || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('[Content Task API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
  }
}

/**
 * PATCH /api/content/tasks/[id]
 * Update a content task
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Build update object (only include provided fields)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    const allowedFields = [
      'title', 'caption', 'media_url', 'notes', 'platform', 
      'content_type', 'status', 'scheduled_at', 'posted_at',
      'model_id', 'assignee_id', 'priority', 'tags', 'vault_asset_id'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // If marking as posted, set posted_at
    if (body.status === 'posted' && !body.posted_at) {
      updateData.posted_at = new Date().toISOString()
    }

    const adminClient = await createAdminClient()
    const { data: task, error } = await adminClient
      .from('content_tasks')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        model:models(id, name),
        assignee:profiles(id, username)
      `)
      .single()

    if (error) {
      console.error('[Content Task API] Update error:', error)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('[Content Task API] Error:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

/**
 * DELETE /api/content/tasks/[id]
 * Delete a content task
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = await createAdminClient()
    const { error } = await adminClient
      .from('content_tasks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Content Task API] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Content Task API] Error:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
