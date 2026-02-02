import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { agencyId, periodStart, periodEnd, lineItems } = body

    if (!agencyId || !periodStart || !periodEnd || !lineItems) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify user has access and permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.agency_id !== agencyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (profile.role !== 'grandmaster' && profile.role !== 'paladin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Insert payouts
    const payoutIds: string[] = []

    for (const item of lineItems) {
      const { data, error } = await adminClient
        .from('payouts')
        .insert({
          agency_id: agencyId,
          recipient_id: item.employee.id,
          period_start: periodStart,
          period_end: periodEnd,
          amount_base: item.baseSalary || 0,
          amount_commission: item.commissionAmount || 0,
          amount_bonus: 0,
          amount_deductions: 0,
          revenue_generated: item.revenueGenerated || 0,
          commission_rate: item.commissionRate || 0,
          models_covered: item.modelsCovered || [],
          payment_method: item.employee.payment_method,
          status: 'draft',
          created_by: user.id,
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error creating payout:', error)
        continue
      }

      if (data) {
        payoutIds.push(data.id)
      }
    }

    return NextResponse.json({
      success: true,
      payoutIds,
      count: payoutIds.length,
    })
  } catch (error) {
    console.error('Payroll save error:', error)
    return NextResponse.json({ error: 'Failed to save payroll' }, { status: 500 })
  }
}
