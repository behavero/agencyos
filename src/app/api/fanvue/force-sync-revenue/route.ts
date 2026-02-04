import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { syncModelTransactions } from '@/lib/services/transaction-syncer'

/**
 * POST /api/fanvue/force-sync-revenue
 *
 * Force sync transactions and recalculate revenue for a specific model.
 * This fixes revenue discrepancies by:
 * 1. Re-syncing all transactions from Fanvue API
 * 2. Recalculating revenue_total from fanvue_transactions table
 *
 * Query params:
 * - modelId: UUID of the model to sync
 * - agencyId: UUID of the agency (for auth)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('modelId')

    if (!modelId) {
      return NextResponse.json({ error: 'modelId is required' }, { status: 400 })
    }

    // Verify user has access to this model
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // Verify model belongs to user's agency
    const { data: model, error: modelError } = await adminClient
      .from('models')
      .select('id, name, agency_id, fanvue_access_token')
      .eq('id', modelId)
      .eq('agency_id', profile.agency_id)
      .single()

    if (modelError || !model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    if (!model.fanvue_access_token) {
      return NextResponse.json({ error: 'Model not connected to Fanvue' }, { status: 400 })
    }

    console.log(`[Force Sync Revenue] Starting sync for model: ${model.name} (${modelId})`)

    // Step 1: Sync transactions from Fanvue API
    const syncResult = await syncModelTransactions(modelId)

    if (!syncResult.success) {
      return NextResponse.json(
        {
          error: 'Failed to sync transactions',
          details: syncResult.errors,
        },
        { status: 500 }
      )
    }

    // Step 2: Recalculate revenue from fanvue_transactions table
    const { data: transactions } = await adminClient
      .from('fanvue_transactions')
      .select('amount')
      .eq('model_id', modelId)

    const totalRevenue = transactions
      ? transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
      : 0

    // Step 3: Update models.revenue_total
    const { error: updateError } = await adminClient
      .from('models')
      .update({
        revenue_total: totalRevenue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', modelId)

    if (updateError) {
      console.error('[Force Sync Revenue] Failed to update revenue_total:', updateError)
      return NextResponse.json(
        {
          error: 'Failed to update revenue',
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    console.log(
      `[Force Sync Revenue] ✅ Success: ${syncResult.transactionsSynced} transactions, $${totalRevenue.toFixed(2)} total revenue`
    )

    return NextResponse.json({
      success: true,
      modelId,
      modelName: model.name,
      transactionsSynced: syncResult.transactionsSynced,
      totalRevenue,
      revenueFormatted: `$${totalRevenue.toFixed(2)}`,
    })
  } catch (error) {
    console.error('[Force Sync Revenue] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
