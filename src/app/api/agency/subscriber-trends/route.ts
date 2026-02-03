/**
 * Agency Subscriber Trends API Endpoint
 * Returns daily subscriber metrics for trend analysis
 * Part of Phase A: Complete the Core Loop
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgencySubscriberTrend } from '@/lib/services/subscriber-history-syncer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
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
      return NextResponse.json({ error: 'No agency found' }, { status: 400 })
    }

    // Get days from query params (default 30)
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30', 10)

    // Fetch subscriber trend
    const result = await getAgencySubscriberTrend(profile.agency_id, days)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch subscriber trends' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      trend: result.trend,
      count: result.trend.length,
    })
  } catch (error) {
    console.error('Subscriber Trends API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
