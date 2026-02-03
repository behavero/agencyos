/**
 * Cache Warming Endpoint
 * Phase 66 - System Jump-Start
 *
 * Manually triggers the "heavy math" to populate analytics cache.
 * Use: https://onyxos.vercel.app/api/debug/warm-cache
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getKPIMetrics, getCategoryBreakdown, getChartData } from '@/lib/services/analytics-engine'

export const maxDuration = 300 // 5 minutes

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const results: Array<{
    agencyId: string
    agencyName: string
    revenue: number
    transactions: number
    status: 'success' | 'error'
    error?: string
  }> = []

  try {
    const adminClient = createAdminClient()

    // 1. Get all agencies
    const { data: agencies, error: agenciesError } = await adminClient
      .from('agencies')
      .select('id, name')

    if (agenciesError) {
      return NextResponse.json(
        {
          error: 'Failed to fetch agencies',
          details: agenciesError.message,
        },
        { status: 500 }
      )
    }

    console.log(`[warm-cache] Processing ${agencies?.length || 0} agencies...`)

    // 2. Process each agency
    for (const agency of agencies || []) {
      try {
        console.log(`[warm-cache] Processing agency: ${agency.name} (${agency.id})`)

        // Calculate revenue from transactions
        const { data: transactions, error: txError } = await adminClient
          .from('fanvue_transactions')
          .select('amount, net_amount, transaction_type')
          .eq('agency_id', agency.id)

        if (txError) {
          results.push({
            agencyId: agency.id,
            agencyName: agency.name,
            revenue: 0,
            transactions: 0,
            status: 'error',
            error: txError.message,
          })
          continue
        }

        const totalRevenue = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
        const transactionCount = transactions?.length || 0

        // Trigger the cached functions to warm them up
        try {
          await Promise.all([
            getKPIMetrics(agency.id, { timeRange: 'all' }),
            getCategoryBreakdown(agency.id, { timeRange: 'all' }),
            getChartData(agency.id, { timeRange: 'all' }),
          ])
          console.log(`[warm-cache] Warmed analytics cache for ${agency.name}`)
        } catch (cacheError) {
          console.warn(
            `[warm-cache] Could not warm analytics cache for ${agency.name}:`,
            cacheError
          )
        }

        // Generate daily snapshots for today
        const today = new Date().toISOString().split('T')[0]

        // Get all models for this agency
        const { data: models } = await adminClient
          .from('models')
          .select('id')
          .eq('agency_id', agency.id)

        for (const model of models || []) {
          try {
            await adminClient.rpc('generate_daily_snapshot', {
              p_agency_id: agency.id,
              p_model_id: model.id,
              p_date: today,
            })
          } catch (snapshotError) {
            console.warn(
              `[warm-cache] Could not generate snapshot for model ${model.id}:`,
              snapshotError
            )
          }
        }

        results.push({
          agencyId: agency.id,
          agencyName: agency.name,
          revenue: totalRevenue,
          transactions: transactionCount,
          status: 'success',
        })

        console.log(
          `[warm-cache] ✅ ${agency.name}: $${totalRevenue.toFixed(2)} from ${transactionCount} transactions`
        )
      } catch (agencyError) {
        results.push({
          agencyId: agency.id,
          agencyName: agency.name,
          revenue: 0,
          transactions: 0,
          status: 'error',
          error: agencyError instanceof Error ? agencyError.message : 'Unknown error',
        })
      }
    }

    const duration = Date.now() - startTime
    const successCount = results.filter(r => r.status === 'success').length
    const totalRevenue = results.reduce((sum, r) => sum + r.revenue, 0)

    return NextResponse.json({
      status: '🔥 Cache Warmed!',
      summary: {
        agenciesProcessed: results.length,
        successful: successCount,
        failed: results.length - successCount,
        totalRevenue: totalRevenue,
        totalRevenueFormatted: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        durationMs: duration,
      },
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[warm-cache] Fatal error:', error)
    return NextResponse.json(
      {
        error: 'Cache warming failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
