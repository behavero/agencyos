import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { isAdmin } from '@/lib/auth/permissions'

const UpdateShiftSchema = z.object({
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  title: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'missed', 'cancelled']).optional(),
  model_id: z.string().uuid().optional().nullable(),
})

/**
 * GET /api/shifts/[id]
 * Get a single shift
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
    const { data: shift, error } = await adminClient
      .from('shifts')
      .select(
        `
        *,
        employee:profiles(id, username, role),
        model:models(id, name)
      `
      )
      .eq('id', id)
      .single()

    if (error || !shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    return NextResponse.json({ shift })
  } catch (error) {
    console.error('[Shifts API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch shift' }, { status: 500 })
  }
}

/**
 * PUT /api/shifts/[id]
 * Update a shift (admin only)
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
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    if (!isAdmin(profile.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const validation = UpdateShiftSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()
    const { data: shift, error } = await adminClient
      .from('shifts')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('agency_id', profile.agency_id)
      .select(
        `
        *,
        employee:profiles(id, username, role),
        model:models(id, name)
      `
      )
      .single()

    if (error || !shift) {
      console.error('[Shifts API] Update error:', error)
      return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 })
    }

    return NextResponse.json({ shift })
  } catch (error) {
    console.error('[Shifts API] Error:', error)
    return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 })
  }
}

/**
 * DELETE /api/shifts/[id]
 * Delete a shift (admin only)
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
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    if (!isAdmin(profile.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const adminClient = await createAdminClient()
    const { error } = await adminClient
      .from('shifts')
      .delete()
      .eq('id', id)
      .eq('agency_id', profile.agency_id)

    if (error) {
      console.error('[Shifts API] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Shifts API] Error:', error)
    return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 })
  }
}
