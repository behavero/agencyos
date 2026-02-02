import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { isAdmin } from '@/lib/auth/permissions'

const ShiftSchema = z.object({
  employee_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  title: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  model_id: z.string().uuid().optional().nullable(),
})

/**
 * GET /api/shifts
 * List shifts (filtered by date range)
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
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const employeeId = searchParams.get('employee_id')

    const adminClient = await createAdminClient()
    let query = adminClient
      .from('shifts')
      .select(
        `
        *,
        employee:profiles(id, username, role),
        model:models(id, name)
      `
      )
      .eq('agency_id', profile.agency_id)
      .order('start_time', { ascending: true })

    if (startDate) query = query.gte('start_time', startDate)
    if (endDate) query = query.lte('start_time', endDate)
    if (employeeId) query = query.eq('employee_id', employeeId)

    // Non-admins can only see their own shifts
    if (!isAdmin(profile.role)) {
      query = query.eq('employee_id', user.id)
    }

    const { data: shifts, error } = await query

    if (error) {
      console.error('[Shifts API] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 })
    }

    return NextResponse.json({ shifts })
  } catch (error) {
    console.error('[Shifts API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 })
  }
}

/**
 * POST /api/shifts
 * Create a new shift (admin only)
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

    // Check admin permission
    if (!isAdmin(profile.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const validation = ShiftSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()
    const { data: shift, error } = await adminClient
      .from('shifts')
      .insert({
        agency_id: profile.agency_id,
        created_by: user.id,
        ...validation.data,
      })
      .select(
        `
        *,
        employee:profiles(id, username, role),
        model:models(id, name)
      `
      )
      .single()

    if (error) {
      console.error('[Shifts API] Insert error:', error)
      return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 })
    }

    return NextResponse.json({ shift })
  } catch (error) {
    console.error('[Shifts API] Error:', error)
    return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 })
  }
}
