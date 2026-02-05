/**
 * Transaction Sync Cron Job
 * Phase 55 - Smart incremental sync (only syncs stale models)
 *
 * This endpoint should be called by a cron service (Vercel Cron, GitHub Actions, etc.)
 * to sync Fanvue transactions. It intelligently syncs only models that need updating.
 *
 * Smart Scheduling:
 * - Only syncs models not synced in the last hour
 * - Refreshes expiring tokens automatically
 * - Scales efficiently to thousands of models
 */

import { NextRequest, NextResponse } from 'next/server'
import { syncModelTransactions } from '@/lib/services/transaction-syncer'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max (Vercel Pro limit)

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verify cron secret (security check)
    // Supports both: Authorization: Bearer <secret> header OR ?secret=<secret> query param
    const authHeader = request.headers.get('authorization')
    const url = new URL(request.url)
    const querySecret = url.searchParams.get('secret')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] Starting smart transaction sync...')

    const supabase = createAdminClient()

    // PHASE 55: Smart Scheduler - Only sync models that need it
    // This query uses the new view created in migration
    const { data: modelsNeedingSync, error: queryError } = await supabase
      .from('models_needing_sync')
      .select('*')
      .limit(50) // Safety limit: max 50 models per run

    if (queryError) {
      throw new Error(`Failed to query models: ${queryError.message}`)
    }

    if (!modelsNeedingSync || modelsNeedingSync.length === 0) {
      console.log('[CRON] ✅ All models are up to date!')
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        modelsSynced: 0,
        transactionsSynced: 0,
        message: 'All models up to date',
        duration_ms: Date.now() - startTime,
      })
    }

    console.log(`[CRON] Found ${modelsNeedingSync.length} models needing sync`)

    // Log token status
    const expiredTokens = modelsNeedingSync.filter(m => m.token_status === 'expired').length
    const expiringSoon = modelsNeedingSync.filter(m => m.token_status === 'expiring_soon').length
    console.log(`[CRON] Token status: ${expiredTokens} expired, ${expiringSoon} expiring soon`)

    // Sync each model with rate limiting
    const results = []
    let totalTransactionsSynced = 0
    const errors: string[] = []

    for (const model of modelsNeedingSync) {
      try {
        console.log(
          `[CRON] Syncing ${model.name} (last synced ${Math.round(model.minutes_since_last_sync)} min ago)...`
        )

        const result = await syncModelTransactions(model.id)

        if (result.success) {
          totalTransactionsSynced += result.transactionsSynced
          console.log(`[CRON] ✅ ${model.name}: ${result.transactionsSynced} transactions`)
        } else {
          errors.push(`${model.name}: ${result.errors.join(', ')}`)
          console.error(`[CRON] ❌ ${model.name}:`, result.errors)
        }

        results.push({ model: model.name, ...result })

        // Rate limit: Wait 2 seconds between models to avoid hitting API limits
        if (modelsNeedingSync.indexOf(model) < modelsNeedingSync.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (error: any) {
        const errorMsg = `${model.name}: ${error.message}`
        errors.push(errorMsg)
        console.error(`[CRON] ❌ Exception for ${model.name}:`, error)
      }
    }

    const duration = Date.now() - startTime

    console.log('[CRON] Smart sync complete:', {
      modelsSynced: modelsNeedingSync.length,
      transactionsSynced: totalTransactionsSynced,
      errors: errors.length,
      duration_ms: duration,
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      modelsSynced: modelsNeedingSync.length,
      transactionsSynced: totalTransactionsSynced,
      errors,
      duration_ms: duration,
      models: results.map(r => ({
        name: r.model,
        transactions: r.transactionsSynced,
        success: r.success,
      })),
    })
  } catch (error) {
    console.error('[CRON] Smart sync failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}
