/**
 * OpenClaw Context Engine
 *
 * Builds pre-computed, token-efficient digests of agency data
 * for consumption by the LLM system prompt. Stored in agency_digests table.
 *
 * Target: ~800 tokens per digest (fits within 4K system prompt budget
 * alongside tool definitions and conversation).
 */

import { createAdminClient } from '@/lib/supabase/server'
import { calculateAgencyKPIs, type Insight } from '@/lib/services/kpi-engine'

// ─── Types ──────────────────────────────────────────────────

export interface AgencyDigest {
  period: 'last_30d'
  generated: string // ISO timestamp

  // Revenue (~5 lines)
  revenue: {
    total: number
    net: number
    growth_pct: number
    by_type: Record<string, number> // subscriptions, tips, messages, ppv
    top_day: { date: string; amount: number } | null
  }

  // Models (~3 lines per model)
  models: Array<{
    name: string
    subs: number
    followers: number
    revenue: number
    arpu: number
    trend: 'up' | 'down' | 'flat'
  }>

  // Conversion funnel (~4 lines)
  funnel: {
    tracking_clicks: number
    new_subs: number
    click_to_sub_pct: number
    message_purchase_pct: number
    ppv_unlock_pct: number
  }

  // Health (~2 lines)
  health: {
    overall: number
    conversion: number
    engagement: number
    revenue: number
  }

  // Top insights (~3 items)
  insights: Array<{
    severity: string
    title: string
    action: string
  }>

  // VIP fans (top 3)
  vip_fans: Array<{
    name: string
    total_spend: number
    last_active: string
  }>
}

export interface ModelContext {
  model: {
    name: string
    subs: number
    followers: number
    revenue_30d: number
  }
  fan?: {
    name: string
    tier: string
    total_spend: number
    messages: number
  }
  recent_performance: {
    trend: string
    top_content_type: string
  }
}

// ─── Digest Builder ─────────────────────────────────────────

/**
 * Build a comprehensive agency digest and store it in the database.
 * Called from the revenue-heartbeat cron (every 10 min).
 */
export async function buildAgencyDigest(agencyId: string): Promise<AgencyDigest> {
  const supabase = createAdminClient()

  // Calculate date range (30 days)
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Fetch KPIs (leverages existing kpi-engine.ts)
  let kpis
  try {
    kpis = await calculateAgencyKPIs(agencyId, '30d')
  } catch (err) {
    console.error(`[Context Engine] KPI calculation failed for ${agencyId}:`, err)
    // Return a minimal digest if KPIs fail
    kpis = null
  }

  // Fetch models with stats
  const { data: models } = await supabase
    .from('models')
    .select('id, name, display_name, subscribers_count, followers_count, revenue_total')
    .eq('agency_id', agencyId)
    .order('revenue_total', { ascending: false })

  // Fetch revenue by category (last 30 days)
  const { data: transactions } = await supabase
    .from('fanvue_transactions')
    .select('amount, category, transaction_date')
    .eq('agency_id', agencyId)
    .gte('transaction_date', thirtyDaysAgo.toISOString().split('T')[0])

  // Aggregate revenue by category
  const byCategory: Record<string, number> = {}
  const byDate: Record<string, number> = {}
  for (const tx of transactions || []) {
    const cat = tx.category || 'other'
    byCategory[cat] = (byCategory[cat] || 0) + Number(tx.amount || 0)
    const date = tx.transaction_date || 'unknown'
    byDate[date] = (byDate[date] || 0) + Number(tx.amount || 0)
  }

  // Find top revenue day
  let topDay: { date: string; amount: number } | null = null
  for (const [date, amount] of Object.entries(byDate)) {
    if (!topDay || amount > topDay.amount) {
      topDay = { date, amount }
    }
  }

  // Calculate total from transactions
  const totalRevenue = Object.values(byCategory).reduce((s, v) => s + v, 0)

  // Fetch top spenders
  const { data: topSpenders } = await supabase
    .from('creator_top_spenders')
    .select('fan_username, total_amount, last_transaction_date')
    .eq('agency_id', agencyId)
    .order('total_amount', { ascending: false })
    .limit(3)

  // Fetch previous period revenue for growth calculation
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const { data: prevTransactions } = await supabase
    .from('fanvue_transactions')
    .select('amount')
    .eq('agency_id', agencyId)
    .gte('transaction_date', sixtyDaysAgo.toISOString().split('T')[0])
    .lt('transaction_date', thirtyDaysAgo.toISOString().split('T')[0])

  const prevRevenue = (prevTransactions || []).reduce((s, tx) => s + Number(tx.amount || 0), 0)
  const growthPct =
    prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0

  // Build model summaries
  const modelSummaries = (models || []).map(m => {
    const subs = m.subscribers_count || 0
    const rev = Number(m.revenue_total || 0)
    return {
      name: m.display_name || m.name || 'Unknown',
      subs,
      followers: m.followers_count || 0,
      revenue: rev,
      arpu: subs > 0 ? Math.round((rev / subs) * 100) / 100 : 0,
      trend: (growthPct > 5 ? 'up' : growthPct < -5 ? 'down' : 'flat') as 'up' | 'down' | 'flat',
    }
  })

  // Build insights (top 3 from KPI engine)
  const insightsList: AgencyDigest['insights'] = (kpis?.insights || [])
    .slice(0, 3)
    .map((i: Insight) => ({
      severity: i.type,
      title: i.title,
      action: i.action || i.description,
    }))

  // Calculate funnel metrics from KPIs
  const totalSubscribers = modelSummaries.reduce((s, m) => s + m.subs, 0)
  const messageRevenue = byCategory['messages'] || byCategory['message'] || 0
  const ppvRevenue = byCategory['posts'] || byCategory['ppv'] || byCategory['post'] || 0
  const messagePurchasePct =
    totalRevenue > 0 ? Math.round((messageRevenue / totalRevenue) * 100) : 0
  const ppvUnlockPct = totalRevenue > 0 ? Math.round((ppvRevenue / totalRevenue) * 100) : 0

  const digest: AgencyDigest = {
    period: 'last_30d',
    generated: now.toISOString(),
    revenue: {
      total: Math.round(totalRevenue * 100) / 100,
      net: Math.round(totalRevenue * 0.8 * 100) / 100, // After 20% platform fee
      growth_pct: growthPct,
      by_type: Object.fromEntries(
        Object.entries(byCategory).map(([k, v]) => [k, Math.round(v * 100) / 100])
      ),
      top_day: topDay ? { date: topDay.date, amount: Math.round(topDay.amount * 100) / 100 } : null,
    },
    models: modelSummaries,
    funnel: {
      tracking_clicks: kpis?.trackingLinkClicks || 0,
      new_subs: kpis?.newSubscribers || 0,
      click_to_sub_pct: kpis ? Math.round(kpis.fanConversionRate * 100) / 100 : 0,
      message_purchase_pct: messagePurchasePct,
      ppv_unlock_pct: ppvUnlockPct,
    },
    health: kpis?.healthScores || { overall: 0, conversion: 0, engagement: 0, revenue: 0 },
    insights: insightsList,
    vip_fans: (topSpenders || []).map(s => ({
      name: s.fan_username || 'Anonymous',
      total_spend: Number(s.total_amount || 0),
      last_active: s.last_transaction_date || 'unknown',
    })),
  }

  // Estimate token count (~4 chars per token for structured JSON)
  const jsonStr = JSON.stringify(digest)
  const estimatedTokens = Math.ceil(jsonStr.length / 4)

  // Store the digest (upsert)
  const { error } = await supabase.from('agency_digests').upsert(
    {
      agency_id: agencyId,
      digest_type: 'daily',
      generated_at: now.toISOString(),
      summary: digest as unknown as Record<string, unknown>,
      estimated_tokens: estimatedTokens,
    },
    { onConflict: 'agency_id,digest_type' }
  )

  if (error) {
    console.error(`[Context Engine] Failed to store digest for ${agencyId}:`, error)
  } else {
    console.log(
      `[Context Engine] Digest stored for ${agencyId}: ~${estimatedTokens} tokens, ${modelSummaries.length} models`
    )
  }

  return digest
}

/**
 * Build model-specific context for chat copilot use.
 * Returns a compact context about a specific model + fan being chatted with.
 */
export async function buildModelContext(
  agencyId: string,
  modelId: string,
  fanUuid?: string
): Promise<ModelContext> {
  const supabase = createAdminClient()

  // Fetch model data
  const { data: model } = await supabase
    .from('models')
    .select('name, display_name, subscribers_count, followers_count, revenue_total')
    .eq('id', modelId)
    .eq('agency_id', agencyId)
    .single()

  // Fetch model's recent revenue (30d)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const { data: recentTx } = await supabase
    .from('fanvue_transactions')
    .select('amount, category')
    .eq('model_id', modelId)
    .gte('transaction_date', thirtyDaysAgo.toISOString().split('T')[0])

  const revenue30d = (recentTx || []).reduce((s, t) => s + Number(t.amount || 0), 0)

  // Find top performing category
  const catRevenue: Record<string, number> = {}
  for (const tx of recentTx || []) {
    const cat = tx.category || 'other'
    catRevenue[cat] = (catRevenue[cat] || 0) + Number(tx.amount || 0)
  }
  const topCategory =
    Object.entries(catRevenue).sort(([, a], [, b]) => b - a)[0]?.[0] || 'subscriptions'

  // Build fan context if provided
  let fanContext: ModelContext['fan'] | undefined
  if (fanUuid) {
    const { data: fan } = await supabase
      .from('creator_top_spenders')
      .select('fan_username, total_amount, transaction_count')
      .eq('model_id', modelId)
      .eq('fan_uuid', fanUuid)
      .single()

    if (fan) {
      const spend = Number(fan.total_amount || 0)
      const tier = spend >= 1000 ? 'whale' : spend >= 100 ? 'spender' : 'free'
      fanContext = {
        name: fan.fan_username || 'Anonymous',
        tier,
        total_spend: spend,
        messages: fan.transaction_count || 0,
      }
    }
  }

  return {
    model: {
      name: model?.display_name || model?.name || 'Unknown',
      subs: model?.subscribers_count || 0,
      followers: model?.followers_count || 0,
      revenue_30d: Math.round(revenue30d * 100) / 100,
    },
    fan: fanContext,
    recent_performance: {
      trend: revenue30d > 0 ? 'active' : 'inactive',
      top_content_type: topCategory,
    },
  }
}

/**
 * Fetch the pre-computed digest for an agency (for use in system prompts).
 * Returns null if no digest exists yet.
 */
export async function getAgencyDigest(agencyId: string): Promise<AgencyDigest | null> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('agency_digests')
    .select('summary')
    .eq('agency_id', agencyId)
    .eq('digest_type', 'daily')
    .single()

  return (data?.summary as unknown as AgencyDigest) || null
}
