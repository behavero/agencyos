/**
 * Dashboard Analytics API
 * Phase 65 - Performance Optimized with unstable_cache
 *
 * Fetches Fanvue analytics data for a specific model or all models.
 * Uses cached versions to reduce database queries and function invocations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getCachedChartData,
  getCachedKPIMetrics,
  getCachedCategoryBreakdown,
} from '@/lib/services/analytics-engine'

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
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    // Parse dates if provided
    const startDate = startDateParam ? new Date(startDateParam) : undefined
    const endDate = endDateParam ? new Date(endDateParam) : undefined

    console.log('[Dashboard API] Fetching data:', {
      modelId,
      timeRange,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    })

    // Fetch analytics data (using cached versions for performance)
    const effectiveModelId = modelId === 'all' ? undefined : modelId || undefined
    const [chartData, kpiMetrics, categoryBreakdown] = await Promise.all([
      getCachedChartData(
        profile.agency_id,
        effectiveModelId,
        timeRange,
        startDate?.toISOString(),
        endDate?.toISOString()
      ),
      getCachedKPIMetrics(
        profile.agency_id,
        effectiveModelId,
        timeRange,
        startDate?.toISOString(),
        endDate?.toISOString()
      ),
      getCachedCategoryBreakdown(
        profile.agency_id,
        effectiveModelId,
        timeRange,
        startDate?.toISOString(),
        endDate?.toISOString()
      ),
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
