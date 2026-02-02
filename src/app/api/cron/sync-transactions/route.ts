/**
 * Transaction Sync Cron Job
 * Phase 49 - Hourly sync of Fanvue transactions
 *
 * This endpoint should be called by a cron service (Vercel Cron, GitHub Actions, etc.)
 * to sync all Fanvue transactions to the local database.
 */

import { NextRequest, NextResponse } from 'next/server'
import { syncAllTransactions } from '@/lib/services/transaction-syncer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (security check)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] Starting transaction sync...')

    const result = await syncAllTransactions()

    console.log('[CRON] Transaction sync complete:', {
      agenciesSynced: result.agenciesSynced,
      transactionsSynced: result.transactionsSynced,
      errors: result.errors.length,
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    })
  } catch (error) {
    console.error('[CRON] Transaction sync failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
