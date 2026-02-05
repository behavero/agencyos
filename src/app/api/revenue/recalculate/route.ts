import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/revenue/recalculate
 *
 * Simple revenue recalculation from existing fanvue_transactions
 * NO Fanvue API calls - just reads from our database
 *
 * Perfect for fixing revenue discrepancies without needing valid tokens
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

    // Get user's agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // Get all models in agency
    const { data: models, error: modelsError } = await adminClient
      .from('models')
      .select('id, name')
      .eq('agency_id', profile.agency_id)

    if (modelsError || !models || models.length === 0) {
      return NextResponse.json({ error: 'No models found' }, { status: 404 })
    }

    console.log(`[Recalculate Revenue] Processing ${models.length} models...`)

    const results = []

    // Recalculate revenue for each model
    for (const model of models) {
      try {
        // Get all transactions for this model
        const { data: transactions } = await adminClient
          .from('fanvue_transactions')
          .select('amount')
          .eq('model_id', model.id)

        const totalRevenue = transactions
          ? transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
          : 0

        // Update models.revenue_total
        const { error: updateError } = await adminClient
          .from('models')
          .update({
            revenue_total: totalRevenue,
            updated_at: new Date().toISOString(),
          })
          .eq('id', model.id)

        if (updateError) {
          results.push({
            modelName: model.name,
            success: false,
            error: updateError.message,
          })
        } else {
          results.push({
            modelName: model.name,
            success: true,
            revenue: totalRevenue,
            transactionCount: transactions?.length || 0,
          })
          console.log(`[Recalculate Revenue] ✅ ${model.name}: $${totalRevenue.toFixed(2)}`)
        }
      } catch (modelError) {
        console.error(`[Recalculate Revenue] Error for ${model.name}:`, modelError)
        results.push({
          modelName: model.name,
          success: false,
          error: modelError instanceof Error ? modelError.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const totalRevenue = results
      .filter(r => r.success && 'revenue' in r)
      .reduce((sum, r) => sum + (r.revenue || 0), 0)

    return NextResponse.json({
      success: true,
      message: `Recalculated revenue for ${successCount}/${models.length} models`,
      totalRevenue,
      totalRevenueFormatted: `$${totalRevenue.toFixed(2)}`,
      results,
    })
  } catch (error) {
    console.error('[Recalculate Revenue] Fatal error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
