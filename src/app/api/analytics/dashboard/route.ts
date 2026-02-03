/**
 * Dashboard Analytics API
 * Fetches Fanvue analytics data for a specific model or all models
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChartData, getKPIMetrics, getCategoryBreakdown } from '@/lib/services/analytics-engine'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const modelId = searchParams.get('modelId')
    const timeRange = (searchParams.get('timeRange') as any) || '30d'

    // Fetch analytics data
    const [chartData, kpiMetrics, categoryBreakdown] = await Promise.all([
      getChartData(profile.agency_id, {
        modelId: modelId === 'all' ? undefined : modelId || undefined,
        timeRange,
      }),
      getKPIMetrics(profile.agency_id, {
        modelId: modelId === 'all' ? undefined : modelId || undefined,
        timeRange,
      }),
      getCategoryBreakdown(profile.agency_id, {
        modelId: modelId === 'all' ? undefined : modelId || undefined,
        timeRange,
      }),
    ])

    return NextResponse.json({
      chartData,
      kpiMetrics,
      categoryBreakdown,
    })
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
