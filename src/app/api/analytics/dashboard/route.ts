/**
 * Dashboard Analytics API
 * Phase 65/66 - Performance Optimized with Fallbacks
 *
 * Fetches Fanvue analytics data for a specific model or all models.
 * Uses cached versions to reduce database queries and function invocations.
 * Returns safe defaults if cache is empty (prevents "Failed to load" errors).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getCachedChartData,
  getCachedKPIMetrics,
  getCachedCategoryBreakdown,
  getChartData,
  getKPIMetrics,
  getCategoryBreakdown,
} from '@/lib/services/analytics-engine'
import type { ChartDataPoint, KPIMetrics, CategoryBreakdown } from '@/lib/services/analytics-engine'

// Default empty KPI metrics (fallback)
const emptyKPIMetrics: KPIMetrics = {
  totalRevenue: 0,
  netRevenue: 0,
  activeSubscribers: 0,
  arpu: 0,
  messageConversionRate: 0,
  ppvConversionRate: 0,
  tipAverage: 0,
  transactionCount: 0,
  revenueGrowth: 0,
  ltv: 0,
  goldenRatio: 0,
  totalMessagesSent: 0,
  totalPPVSent: 0,
  newFans: 0,
  unlockRate: 0,
}

export async function GET(_request: NextRequest) {
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
      agencyId: profile.agency_id,
      modelId,
      timeRange,
    })

    const effectiveModelId = modelId === 'all' ? undefined : modelId || undefined

    // Try cached versions first, fall back to direct queries
    let chartData: ChartDataPoint[] = []
    let kpiMetrics: KPIMetrics = emptyKPIMetrics
    let categoryBreakdown: CategoryBreakdown[] = []

    try {
      // Attempt cached queries
      const [cachedChart, cachedKPI, cachedCategory] = await Promise.all([
        getCachedChartData(
          profile.agency_id,
          effectiveModelId,
          timeRange,
          startDate?.toISOString(),
          endDate?.toISOString()
        ).catch(() => null),
        getCachedKPIMetrics(
          profile.agency_id,
          effectiveModelId,
          timeRange,
          startDate?.toISOString(),
          endDate?.toISOString()
        ).catch(() => null),
        getCachedCategoryBreakdown(
          profile.agency_id,
          effectiveModelId,
          timeRange,
          startDate?.toISOString(),
          endDate?.toISOString()
        ).catch(() => null),
      ])

      chartData = cachedChart || []
      kpiMetrics = cachedKPI || emptyKPIMetrics
      categoryBreakdown = cachedCategory || []

      // If cache returned empty/null, try direct query as fallback
      if (!cachedKPI || cachedKPI.totalRevenue === 0) {
        console.log('[Dashboard API] ⚠️ Cache miss, trying direct query...')

        const [directChart, directKPI, directCategory] = await Promise.all([
          getChartData(profile.agency_id, {
            modelId: effectiveModelId,
            timeRange,
            startDate,
            endDate,
          }).catch(() => []),
          getKPIMetrics(profile.agency_id, {
            modelId: effectiveModelId,
            timeRange,
            startDate,
            endDate,
          }).catch(() => emptyKPIMetrics),
          getCategoryBreakdown(profile.agency_id, {
            modelId: effectiveModelId,
            timeRange,
            startDate,
            endDate,
          }).catch(() => []),
        ])

        chartData = directChart.length > 0 ? directChart : chartData
        kpiMetrics = directKPI.totalRevenue > 0 ? directKPI : kpiMetrics
        categoryBreakdown = directCategory.length > 0 ? directCategory : categoryBreakdown
      }
    } catch (fetchError) {
      console.error('[Dashboard API] Error fetching analytics, returning defaults:', fetchError)
      // Return defaults - don't crash
    }

    console.log('[Dashboard API] Returning data:', {
      chartDataPoints: chartData.length,
      totalRevenue: kpiMetrics.totalRevenue,
      categories: categoryBreakdown.length,
    })

    return NextResponse.json({
      chartData,
      kpiMetrics,
      categoryBreakdown,
    })
  } catch (error) {
    console.error('[Dashboard API] Fatal error:', error)

    // Return safe defaults instead of 500 error
    return NextResponse.json({
      chartData: [],
      kpiMetrics: emptyKPIMetrics,
      categoryBreakdown: [],
      error: 'Analytics temporarily unavailable',
    })
  }
}
