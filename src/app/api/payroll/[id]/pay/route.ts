import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: payoutId } = await params
    const supabase = await createClient()
    const adminClient = await createAdminClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { paymentReference } = body

    // Verify user has permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'grandmaster' && profile?.role !== 'paladin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get the payout to verify it belongs to the user's agency
    const { data: payout } = await supabase
      .from('payouts')
      .select('agency_id, status')
      .eq('id', payoutId)
      .single()

    if (!payout || payout.agency_id !== profile.agency_id) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
    }

    if (payout.status === 'paid') {
      return NextResponse.json({ error: 'Already paid' }, { status: 400 })
    }

    // Update payout status
    const { error } = await adminClient
      .from('payouts')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        paid_by: user.id,
        payment_reference: paymentReference || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payoutId)

    if (error) {
      console.error('Error marking payout as paid:', error)
      return NextResponse.json({ error: 'Failed to update payout' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark paid error:', error)
    return NextResponse.json(
      { error: 'Failed to mark payout as paid' },
      { status: 500 }
    )
  }
}
