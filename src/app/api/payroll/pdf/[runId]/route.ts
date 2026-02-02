import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { renderToStream } from '@react-pdf/renderer'
import { StatementPDF } from '@/components/finance/statement-pdf'

/**
 * GET /api/payroll/pdf/[runId]?profile_id=xxx
 * Generate PDF statement for a specific paycheck
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params
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

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const profileId = searchParams.get('profile_id')

    // Check permissions
    const isAdmin = ['owner', 'admin'].includes(profile.role)
    const isSelf = profileId === user.id

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = await createAdminClient()

    // Get payout run
    const { data: run } = await adminSupabase
      .from('payout_runs')
      .select('*')
      .eq('id', runId)
      .eq('agency_id', profile.agency_id)
      .single()

    if (!run) {
      return NextResponse.json({ error: 'Payout run not found' }, { status: 404 })
    }

    // Get individual payout
    const { data: payout } = await adminSupabase
      .from('individual_payouts')
      .select('*')
      .eq('payout_run_id', runId)
      .eq('profile_id', profileId || user.id)
      .single()

    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
    }

    // Get profile name
    const { data: targetProfile } = await adminSupabase
      .from('profiles')
      .select('username, role')
      .eq('id', payout.profile_id)
      .single()

    // Prepare paycheck data
    const paycheck = {
      profile_name: targetProfile?.username || 'Unknown',
      role: targetProfile?.role || 'staff',
      pay_model: 'hybrid', // Default, could be fetched from payout_settings
      hours_worked: payout.hours_worked || 0,
      hourly_rate: payout.hours_worked > 0 ? payout.hourly_pay / payout.hours_worked : 0,
      hourly_pay: payout.hourly_pay || 0,
      sales_generated: payout.sales_generated || 0,
      commission_percent:
        payout.sales_generated > 0 ? payout.commission_pay / payout.sales_generated : 0,
      commission_pay: payout.commission_pay || 0,
      bonus: payout.bonus || 0,
      deductions: payout.deductions || 0,
      total_payout: payout.total_payout,
      currency: payout.currency || 'USD',
      payment_method: payout.payment_method,
      payment_details: payout.payment_details,
    }

    const period = {
      start: run.period_start,
      end: run.period_end,
    }

    // Generate PDF
    const pdfStream = await renderToStream(
      React.createElement(StatementPDF, { paycheck, period, runId })
    )

    // Convert stream to buffer
    const chunks: Buffer[] = []
    for await (const chunk of pdfStream) {
      chunks.push(Buffer.from(chunk))
    }
    const buffer = Buffer.concat(chunks)

    // Return PDF
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="paycheck_${paycheck.profile_name}_${run.period_start}.pdf"`,
      },
    })
  } catch (error) {
    console.error('GET /api/payroll/pdf error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
