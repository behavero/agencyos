import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateAgencyPayroll } from '@/lib/services/payroll-service'
import { z } from 'zod'

const CalculatePayrollSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

/**
 * POST /api/payroll/calculate
 * Calculate payroll preview for a date range
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
    
    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const validated = CalculatePayrollSchema.parse(body)
    
    // Calculate payroll
    const paychecks = await calculateAgencyPayroll(
      profile.agency_id,
      validated.start_date,
      validated.end_date
    )
    
    const totalPayout = paychecks.reduce((sum, p) => sum + p.total_payout, 0)
    
    return NextResponse.json({
      period: {
        start: validated.start_date,
        end: validated.end_date,
      },
      paychecks,
      total_payout: totalPayout,
      currency: 'USD', // TODO: Multi-currency support
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('POST /api/payroll/calculate error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate payroll' },
      { status: 500 }
    )
  }
}
