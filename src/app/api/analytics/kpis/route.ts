import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateAgencyKPIs, compareKPIs } from '@/lib/services/kpi-engine'

/**
 * GET /api/analytics/kpis
 * Fetch comprehensive KPIs for the agency
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    // Get date range from query params
    const dateRange = request.nextUrl.searchParams.get('range') as '7d' | '30d' | '90d' | 'today' || '30d'
    const compare = request.nextUrl.searchParams.get('compare') === 'true'

    if (compare) {
      // Get comparison with previous period
      const comparison = await compareKPIs(profile.agency_id, dateRange as '7d' | '30d' | '90d', dateRange as '7d' | '30d' | '90d')
      return NextResponse.json(comparison)
    }

    // Get single period KPIs
    const kpis = await calculateAgencyKPIs(profile.agency_id, dateRange)

    return NextResponse.json({ kpis })
  } catch (error) {
    console.error('[KPIs API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate KPIs' },
      { status: 500 }
    )
  }
}
