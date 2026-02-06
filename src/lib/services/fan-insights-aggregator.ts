/**
 * Fan Insights Aggregator
 *
 * Populates the fan_insights table from fanvue_transactions data.
 * Aggregates per-fan: total spend, message count, last activity, whale scoring.
 */

import { createAdminClient } from '@/lib/supabase/server'

interface FanAggregate {
  fan_id: string
  fan_username: string | null
  model_id: string
  agency_id: string
  total_spend: number
  message_count: number
  tip_count: number
  subscription_count: number
  ppv_count: number
  transaction_count: number
  last_message_at: string | null
  first_seen_at: string
  last_active_at: string
}

/**
 * Aggregate fan data from fanvue_transactions and upsert into fan_insights.
 * This is designed to run periodically (e.g., every heartbeat cycle).
 */
export async function aggregateFanInsights(agencyId: string): Promise<{
  fansProcessed: number
  errors: string[]
}> {
  const supabase = createAdminClient()
  const errors: string[] = []

  try {
    // Fetch all transactions for this agency (paginated)
    let allTransactions: {
      fan_id: string
      fan_username: string | null
      model_id: string
      amount: number
      net_amount: number
      transaction_type: string
      transaction_date: string
    }[] = []

    let offset = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from('fanvue_transactions')
        .select(
          'fan_id, fan_username, model_id, amount, net_amount, transaction_type, transaction_date'
        )
        .eq('agency_id', agencyId)
        .range(offset, offset + pageSize - 1)
        .order('transaction_date', { ascending: false })

      if (error) {
        errors.push(`Failed to fetch transactions at offset ${offset}: ${error.message}`)
        break
      }

      if (!data || data.length === 0) {
        hasMore = false
      } else {
        allTransactions = allTransactions.concat(data)
        offset += pageSize
        if (data.length < pageSize) hasMore = false
      }
    }

    if (allTransactions.length === 0) {
      return { fansProcessed: 0, errors }
    }

    // Aggregate by fan_id + model_id
    const fanMap = new Map<string, FanAggregate>()

    for (const tx of allTransactions) {
      if (!tx.fan_id) continue
      const key = `${tx.fan_id}:${tx.model_id}`
      const existing = fanMap.get(key)

      if (existing) {
        existing.total_spend += Number(tx.amount) || 0
        existing.transaction_count++
        if (tx.transaction_type === 'message') {
          existing.message_count++
          if (!existing.last_message_at || tx.transaction_date > existing.last_message_at) {
            existing.last_message_at = tx.transaction_date
          }
        }
        if (tx.transaction_type === 'tip') existing.tip_count++
        if (tx.transaction_type === 'subscription') existing.subscription_count++
        if (tx.transaction_type === 'ppv' || tx.transaction_type === 'post') existing.ppv_count++
        if (tx.transaction_date > existing.last_active_at) {
          existing.last_active_at = tx.transaction_date
        }
        if (tx.transaction_date < existing.first_seen_at) {
          existing.first_seen_at = tx.transaction_date
        }
        // Keep latest username
        if (tx.fan_username) {
          existing.fan_username = tx.fan_username
        }
      } else {
        fanMap.set(key, {
          fan_id: tx.fan_id,
          fan_username: tx.fan_username,
          model_id: tx.model_id,
          agency_id: agencyId,
          total_spend: Number(tx.amount) || 0,
          message_count: tx.transaction_type === 'message' ? 1 : 0,
          tip_count: tx.transaction_type === 'tip' ? 1 : 0,
          subscription_count: tx.transaction_type === 'subscription' ? 1 : 0,
          ppv_count: tx.transaction_type === 'ppv' || tx.transaction_type === 'post' ? 1 : 0,
          transaction_count: 1,
          last_message_at: tx.transaction_type === 'message' ? tx.transaction_date : null,
          first_seen_at: tx.transaction_date,
          last_active_at: tx.transaction_date,
        })
      }
    }

    // Upsert in batches
    const fans = Array.from(fanMap.values())
    const batchSize = 100
    let processed = 0

    for (let i = 0; i < fans.length; i += batchSize) {
      const batch = fans.slice(i, i + batchSize).map(fan => ({
        fan_id: fan.fan_id,
        fan_username: fan.fan_username,
        model_id: fan.model_id,
        agency_id: fan.agency_id,
        total_spend: Math.round(fan.total_spend * 100) / 100,
        message_count: fan.message_count,
        tip_count: fan.tip_count,
        subscription_count: fan.subscription_count,
        ppv_count: fan.ppv_count,
        total_transactions: fan.transaction_count,
        last_message_at: fan.last_message_at,
        first_seen_at: fan.first_seen_at,
        last_active_at: fan.last_active_at,
        // Whale score: simple heuristic (spend * activity diversity)
        whale_score: calculateWhaleScore(fan),
        updated_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('fan_insights')
        .upsert(batch, { onConflict: 'model_id,fan_id' })

      if (error) {
        errors.push(`Batch upsert error at ${i}: ${error.message}`)
      } else {
        processed += batch.length
      }
    }

    console.log(`[fan-insights] Aggregated ${processed} fan records for agency ${agencyId}`)
    return { fansProcessed: processed, errors }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error')
    return { fansProcessed: 0, errors }
  }
}

function calculateWhaleScore(fan: FanAggregate): number {
  // Score 0-100 based on spending and engagement diversity
  let score = 0

  // Spend component (0-50)
  if (fan.total_spend >= 1000) score += 50
  else if (fan.total_spend >= 500) score += 40
  else if (fan.total_spend >= 100) score += 30
  else if (fan.total_spend >= 50) score += 20
  else if (fan.total_spend >= 10) score += 10

  // Activity diversity (0-30)
  const activityTypes = [
    fan.message_count > 0,
    fan.tip_count > 0,
    fan.subscription_count > 0,
    fan.ppv_count > 0,
  ].filter(Boolean).length
  score += activityTypes * 7.5

  // Recency (0-20)
  const daysSinceLast =
    (Date.now() - new Date(fan.last_active_at).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceLast <= 7) score += 20
  else if (daysSinceLast <= 30) score += 15
  else if (daysSinceLast <= 90) score += 10
  else score += 5

  return Math.min(100, Math.round(score))
}
