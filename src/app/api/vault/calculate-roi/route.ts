/**
 * Calculate Asset ROI API
 * Phase 50 - Trigger asset attribution calculations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateAssetROI } from '@/lib/services/asset-attribution'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 400 })
    }

    // Only allow admins and owners to trigger calculations
    if (!['owner', 'admin', 'grandmaster'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Calculate asset ROI
    const result = await calculateAssetROI(profile.agency_id)

    return NextResponse.json({
      success: result.errors.length === 0,
      message: `Calculated ROI for ${result.assetsUpdated} assets`,
      ...result,
    })
  } catch (error) {
    console.error('Error calculating asset ROI:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
