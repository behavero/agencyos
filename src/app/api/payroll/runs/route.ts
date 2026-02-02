import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { calculateAgencyPayroll, createPayoutRun } from '@/lib/services/payroll-service'
import { z } from 'zod'

const CreatePayoutRunSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

/**
 * GET /api/payroll/runs
 * List all payout runs for the agency
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

    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = await createAdminClient()

    const { data: runs } = await adminSupabase
      .from('payout_runs')
      .select('*')
      .eq('agency_id', profile.agency_id)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ runs })
  } catch (error) {
    console.error('GET /api/payroll/runs error:', error)
    return NextResponse.json({ error: 'Failed to fetch payout runs' }, { status: 500 })
  }
}

/**
 * POST /api/payroll/runs
 * Create a new payout run (finalize payroll)
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

    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validated = CreatePayoutRunSchema.parse(body)

    // Calculate payroll
    const paychecks = await calculateAgencyPayroll(
      profile.agency_id,
      validated.start_date,
      validated.end_date
    )

    if (paychecks.length === 0) {
      return NextResponse.json({ error: 'No paychecks to process' }, { status: 400 })
    }

    // Create payout run
    const runId = await createPayoutRun(
      profile.agency_id,
      validated.start_date,
      validated.end_date,
      paychecks,
      user.id
    )

    if (!runId) {
      throw new Error('Failed to create payout run')
    }

    return NextResponse.json({ run_id: runId, paychecks })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    console.error('POST /api/payroll/runs error:', error)
    return NextResponse.json({ error: 'Failed to create payout run' }, { status: 500 })
  }
}
