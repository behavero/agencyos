/**
 * API: Fix Revenue Data
 * Emergency endpoint to recalculate and fix stale revenue numbers
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getAccurateAllTimeRevenue,
  fixStaleRevenueTotals,
} from '@/lib/services/emergency-revenue-fix'
import { requireAdminAuth } from '@/lib/utils/debug-auth'

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

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
      return NextResponse.json({ error: 'No agency found' }, { status: 403 })
    }

    // Get accurate revenue
    const revenue = await getAccurateAllTimeRevenue(profile.agency_id)

    return NextResponse.json({
      success: true,
      totalRevenue: revenue.totalRevenue,
      byModel: revenue.byModel,
      lastUpdated: revenue.lastUpdated,
      message: 'Revenue calculated from transactions table (bypasses stale cache)',
    })
  } catch (error: any) {
    console.error('[Fix Revenue API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate revenue', message: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

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
      return NextResponse.json({ error: 'No agency found' }, { status: 403 })
    }

    // Fix stale revenue totals
    const result = await fixStaleRevenueTotals(profile.agency_id)

    return NextResponse.json({
      success: true,
      fixed: result.fixed,
      errors: result.errors,
      message: `Fixed revenue for ${result.fixed} models`,
    })
  } catch (error: any) {
    console.error('[Fix Revenue API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fix revenue', message: error.message },
      { status: 500 }
    )
  }
}
