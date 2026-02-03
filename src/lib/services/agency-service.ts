/**
 * Agency Service
 * Phase 64 - Unified Data Architecture
 *
 * Consolidates all agency data fetching into a single efficient service.
 * Used by the AgencyProvider to populate global state.
 */

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import { getChartData, getKPIMetrics, getCategoryBreakdown } from './analytics-engine'
import type { ChartDataPoint, KPIMetrics, CategoryBreakdown, TimeRange } from './analytics-engine'

// Database types
type Profile = Database['public']['Tables']['profiles']['Row']
type Agency = Database['public']['Tables']['agencies']['Row']
type Model = Database['public']['Tables']['models']['Row']

// Extended model with computed stats
export interface ModelWithStats extends Model {
  revenue: number
  transactionCount: number
  messageRevenue: number
  tipRevenue: number
  postRevenue: number
  subscriptionRevenue: number
}

// Full agency data package
export interface AgencyData {
  profile: Profile | null
  agency: Agency | null
  models: ModelWithStats[]
  chartData: ChartDataPoint[]
  kpiMetrics: KPIMetrics
  categoryBreakdown: CategoryBreakdown[]
  totalExpenses: number
}

/**
 * Get complete agency data in a single call
 * This is the primary data fetching function for the dashboard
 */
export async function getAgencyData(
  userId: string,
  options: {
    modelId?: string
    timeRange?: TimeRange
    startDate?: Date
    endDate?: Date
  } = {}
): Promise<AgencyData | null> {
  const supabase = await createClient()

  // 1. Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError || !profile?.agency_id) {
    console.error('[agency-service] Profile error:', profileError)
    return null
  }

  // 2. Get agency
  const { data: agency, error: agencyError } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', profile.agency_id)
    .single()

  if (agencyError || !agency) {
    console.error('[agency-service] Agency error:', agencyError)
    return null
  }

  // 3. Get models with their stats
  const { data: modelsData, error: modelsError } = await supabase
    .from('models')
    .select('*')
    .eq('agency_id', agency.id)
    .order('name')

  if (modelsError) {
    console.error('[agency-service] Models error:', modelsError)
    return null
  }

  const models = modelsData || []

  // 4. Get per-model revenue stats in parallel
  const modelStatsPromise = getModelRevenueStats(
    agency.id,
    models.map(m => m.id)
  )

  // 5. Get analytics data in parallel
  const [chartData, kpiMetrics, categoryBreakdown, modelStats] = await Promise.all([
    getChartData(agency.id, options),
    getKPIMetrics(agency.id, options),
    getCategoryBreakdown(agency.id, options),
    modelStatsPromise,
  ])

  // 6. Merge model stats
  const modelsWithStats: ModelWithStats[] = models.map(model => ({
    ...model,
    ...(modelStats.get(model.id) || {
      revenue: 0,
      transactionCount: 0,
      messageRevenue: 0,
      tipRevenue: 0,
      postRevenue: 0,
      subscriptionRevenue: 0,
    }),
  }))

  // 7. Get total expenses
  const { data: expensesData } = await supabase
    .from('expenses')
    .select('amount')
    .eq('agency_id', agency.id)

  const totalExpenses = (expensesData || []).reduce((sum, e) => sum + (e.amount || 0), 0)

  return {
    profile,
    agency,
    models: modelsWithStats,
    chartData,
    kpiMetrics,
    categoryBreakdown,
    totalExpenses,
  }
}

/**
 * Get revenue breakdown per model
 */
async function getModelRevenueStats(
  agencyId: string,
  modelIds: string[]
): Promise<
  Map<
    string,
    {
      revenue: number
      transactionCount: number
      messageRevenue: number
      tipRevenue: number
      postRevenue: number
      subscriptionRevenue: number
    }
  >
> {
  const supabase = await createClient()
  const statsMap = new Map()

  if (modelIds.length === 0) return statsMap

  // Fetch all transactions for the agency
  const { data: transactions, error } = await supabase
    .from('fanvue_transactions')
    .select('model_id, transaction_type, amount')
    .eq('agency_id', agencyId)

  if (error) {
    console.error('[agency-service] Transaction stats error:', error)
    return statsMap
  }

  // Aggregate by model
  for (const tx of transactions || []) {
    const existing = statsMap.get(tx.model_id) || {
      revenue: 0,
      transactionCount: 0,
      messageRevenue: 0,
      tipRevenue: 0,
      postRevenue: 0,
      subscriptionRevenue: 0,
    }

    existing.revenue += tx.amount || 0
    existing.transactionCount += 1

    switch (tx.transaction_type) {
      case 'message':
        existing.messageRevenue += tx.amount || 0
        break
      case 'tip':
        existing.tipRevenue += tx.amount || 0
        break
      case 'post':
        existing.postRevenue += tx.amount || 0
        break
      case 'subscription':
        existing.subscriptionRevenue += tx.amount || 0
        break
    }

    statsMap.set(tx.model_id, existing)
  }

  return statsMap
}

/**
 * Get basic agency info (for lightweight operations)
 */
export async function getAgencyBasicInfo(userId: string) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id, role, full_name')
    .eq('id', userId)
    .single()

  if (!profile?.agency_id) return null

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, owner_id')
    .eq('id', profile.agency_id)
    .single()

  return { profile, agency }
}

/**
 * Get models list only (for dropdown/selects)
 */
export async function getModelsForAgency(agencyId: string) {
  const supabase = await createClient()

  const { data: models, error } = await supabase
    .from('models')
    .select('id, name, avatar_url, subscribers_count, followers_count')
    .eq('agency_id', agencyId)
    .order('name')

  if (error) {
    console.error('[agency-service] Models list error:', error)
    return []
  }

  return models || []
}
