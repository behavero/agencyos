/**
 * Emergency Revenue Fix
 *
 * Recalculates all-time revenue directly from fanvue_transactions
 * Bypasses potentially stale models.revenue_total
 */

import { createAdminClient } from '@/lib/supabase/server'

export async function getAccurateAllTimeRevenue(agencyId: string): Promise<{
  totalRevenue: number
  byModel: Array<{ modelId: string; name: string; revenue: number }>
  lastUpdated: string
}> {
  const supabase = createAdminClient()

  try {
    // Get all models for this agency
    const { data: models, error: modelsError } = await supabase
      .from('models')
      .select('id, name')
      .eq('agency_id', agencyId)

    if (modelsError || !models) {
      throw new Error(`Failed to fetch models: ${modelsError?.message}`)
    }

    // Calculate revenue from transactions for each model
    const byModel = await Promise.all(
      models.map(async model => {
        const { data: transactions } = await supabase
          .from('fanvue_transactions')
          .select('amount')
          .eq('model_id', model.id)

        const revenue = transactions?.reduce((sum, tx) => sum + Number(tx.amount || 0), 0) || 0

        return {
          modelId: model.id,
          name: model.name,
          revenue,
        }
      })
    )

    const totalRevenue = byModel.reduce((sum, m) => sum + m.revenue, 0)

    return {
      totalRevenue,
      byModel,
      lastUpdated: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[Emergency Revenue Fix] Error:', error)
    throw error
  }
}

/**
 * Fix stale revenue_total in models table
 */
export async function fixStaleRevenueTotals(agencyId: string): Promise<{
  fixed: number
  errors: string[]
}> {
  const supabase = createAdminClient()
  const errors: string[] = []
  let fixed = 0

  try {
    const { data: models } = await supabase
      .from('models')
      .select('id, name')
      .eq('agency_id', agencyId)

    if (!models) return { fixed: 0, errors: ['No models found'] }

    for (const model of models) {
      try {
        // Get accurate revenue from transactions
        const { data: transactions } = await supabase
          .from('fanvue_transactions')
          .select('amount')
          .eq('model_id', model.id)

        const accurateRevenue =
          transactions?.reduce((sum, tx) => sum + Number(tx.amount || 0), 0) || 0

        // Update models table
        const { error: updateError } = await supabase
          .from('models')
          .update({
            revenue_total: accurateRevenue,
            updated_at: new Date().toISOString(),
          })
          .eq('id', model.id)

        if (updateError) {
          errors.push(`Failed to update ${model.name}: ${updateError.message}`)
        } else {
          fixed++
          console.log(`✅ Fixed revenue for ${model.name}: $${accurateRevenue.toFixed(2)}`)
        }
      } catch (err: any) {
        errors.push(`Error fixing ${model.name}: ${err.message}`)
      }
    }

    return { fixed, errors }
  } catch (error: any) {
    return { fixed, errors: [error.message] }
  }
}
