/**
 * API: Get Tracking Links Analytics
 * 
 * Returns tracking link data with calculated metrics for dashboard display.
 * Supports sorting by clicks, subs, revenue, or ROI.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTopTrackingLinks, getClickToSubRate } from '@/lib/services/tracking-links-syncer'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile and agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const modelId = searchParams.get('modelId') || undefined
    const sortBy = (searchParams.get('sortBy') as 'clicks' | 'subs_count' | 'total_revenue' | 'roi') || 'total_revenue'
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get top tracking links
    const topLinks = await getTopTrackingLinks(profile.agency_id, {
      modelId: modelId === 'all' ? undefined : modelId,
      sortBy,
      limit,
    })

    // Get click-to-sub rate
    const clickToSubStats = await getClickToSubRate(
      profile.agency_id,
      modelId === 'all' ? undefined : modelId
    )

    return NextResponse.json({
      success: true,
      data: {
        topLinks,
        stats: {
          totalClicks: clickToSubStats.totalClicks,
          totalSubs: clickToSubStats.totalSubs,
          clickToSubRate: Math.round(clickToSubStats.rate * 100) / 100, // Round to 2 decimals
        },
      },
    })
  } catch (error) {
    console.error('[api/analytics/tracking-links] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
