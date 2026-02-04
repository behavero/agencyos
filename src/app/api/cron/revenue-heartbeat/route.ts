import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { syncModelTransactions } from '@/lib/services/transaction-syncer'

/**
 * GET /api/cron/revenue-heartbeat
 *
 * Revenue Heartbeat - Incremental Sync
 * Runs every 10 minutes via Vercel Cron
 *
 * Logic:
 * 1. Fetches all models with valid Fanvue tokens
 * 2. Syncs ONLY new transactions (since last_transaction_sync cursor)
 * 3. Recalculates revenue_total from fanvue_transactions
 * 4. Updates models table immediately
 *
 * Safety:
 * - Handles rate limits gracefully
 * - Skips models if sync is already running
 * - Logs all operations for monitoring
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (if set)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const results: Array<{
    modelId: string
    modelName: string
    success: boolean
    transactionsSynced: number
    revenueUpdated: number
    error?: string
  }> = []

  try {
    // Fetch all models with valid tokens
    const { data: models, error: modelsError } = await adminClient
      .from('models')
      .select('id, name, agency_id, fanvue_access_token, revenue_total')
      .not('fanvue_access_token', 'is', null)

    if (modelsError) {
      console.error('[Revenue Heartbeat] Failed to fetch models:', modelsError)
      return NextResponse.json(
        { error: 'Failed to fetch models', details: modelsError.message },
        { status: 500 }
      )
    }

    if (!models || models.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No models to sync',
        processed: 0,
      })
    }

    console.log(`[Revenue Heartbeat] Processing ${models.length} models...`)

    // Process each model
    for (const model of models) {
      try {
        // Step 1: Sync new transactions (incremental - only fetches since last cursor)
        const syncResult = await syncModelTransactions(model.id)

        if (!syncResult.success) {
          results.push({
            modelId: model.id,
            modelName: model.name || 'Unknown',
            success: false,
            transactionsSynced: 0,
            revenueUpdated: 0,
            error: syncResult.errors?.[0] || 'Sync failed',
          })
          continue
        }

        // Step 2: Recalculate revenue from fanvue_transactions
        const { data: transactions } = await adminClient
          .from('fanvue_transactions')
          .select('amount')
          .eq('model_id', model.id)

        const totalRevenue = transactions
          ? transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
          : 0

        // Step 3: Update models.revenue_total immediately
        const { error: updateError } = await adminClient
          .from('models')
          .update({
            revenue_total: totalRevenue,
            updated_at: new Date().toISOString(),
          })
          .eq('id', model.id)

        if (updateError) {
          console.error(
            `[Revenue Heartbeat] Failed to update revenue for ${model.name}:`,
            updateError
          )
          results.push({
            modelId: model.id,
            modelName: model.name || 'Unknown',
            success: false,
            transactionsSynced: syncResult.transactionsSynced || 0,
            revenueUpdated: 0,
            error: `Failed to update revenue: ${updateError.message}`,
          })
          continue
        }

        results.push({
          modelId: model.id,
          modelName: model.name || 'Unknown',
          success: true,
          transactionsSynced: syncResult.transactionsSynced || 0,
          revenueUpdated: totalRevenue,
        })

        console.log(
          `[Revenue Heartbeat] ✅ ${model.name}: ${syncResult.transactionsSynced} new transactions, $${totalRevenue.toFixed(2)} total`
        )
      } catch (modelError) {
        console.error(`[Revenue Heartbeat] Error processing ${model.name}:`, modelError)
        results.push({
          modelId: model.id,
          modelName: model.name || 'Unknown',
          success: false,
          transactionsSynced: 0,
          revenueUpdated: 0,
          error: modelError instanceof Error ? modelError.message : 'Unknown error',
        })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    const totalTransactionsSynced = results.reduce((sum, r) => sum + r.transactionsSynced, 0)

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful,
      failed,
      totalTransactionsSynced,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Revenue Heartbeat] Fatal error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results,
      },
      { status: 500 }
    )
  }
}
