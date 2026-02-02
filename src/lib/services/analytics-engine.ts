/**
 * Analytics Engine
 * Phase 49 - Granular Analytics with Fanvue Transactions
 *
 * This service provides accurate revenue tracking and KPI calculations
 * using granular transaction data from Fanvue API.
 */

import { createClient } from '@/lib/supabase/server'

export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all'

export interface ChartDataPoint {
  date: string
  subscriptions: number
  tips: number
  messages: number
  posts: number
  total: number
}

export interface KPIMetrics {
  totalRevenue: number
  netRevenue: number
  activeSubscribers: number
  arpu: number // Average Revenue Per User
  messageConversionRate: number
  ppvConversionRate: number
  tipAverage: number
  transactionCount: number
  revenueGrowth: number // Percentage change vs previous period
}

export interface CategoryBreakdown {
  category: string
  amount: number
  percentage: number
  transactionCount: number
}

/**
 * Get chart data for revenue visualization
 * Automatically fills missing dates with zeros for smooth graphs
 */
export async function getChartData(
  agencyId: string,
  options: {
    modelId?: string
    timeRange?: TimeRange
    startDate?: Date
    endDate?: Date
  } = {}
): Promise<ChartDataPoint[]> {
  const supabase = await createClient()

  // Calculate date range
  const { startDate, endDate } = getDateRange(options.timeRange, options.startDate, options.endDate)

  // Fetch aggregated data from database function
  const { data, error } = await supabase.rpc('get_revenue_by_date_range', {
    p_agency_id: agencyId,
    p_model_id: options.modelId || null,
    p_start_date: startDate.toISOString(),
    p_end_date: endDate.toISOString(),
  })

  if (error) {
    console.error('Error fetching chart data:', error)
    return []
  }

  // Convert database response to ChartDataPoint
  const dataPoints = (data || []).map(row => ({
    date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    subscriptions: Number(row.subscriptions) || 0,
    tips: Number(row.tips) || 0,
    messages: Number(row.messages) || 0,
    posts: Number(row.posts) || 0,
    total: Number(row.total) || 0,
  }))

  // Fill missing dates with zeros
  return fillMissingDates(dataPoints, startDate, endDate)
}

/**
 * Get KPI metrics for dashboard cards
 */
export async function getKPIMetrics(
  agencyId: string,
  options: {
    modelId?: string
    timeRange?: TimeRange
  } = {}
): Promise<KPIMetrics> {
  const supabase = await createClient()

  // Calculate date range for current period
  const { startDate, endDate } = getDateRange(options.timeRange)

  // Calculate previous period for growth comparison
  const periodLength = endDate.getTime() - startDate.getTime()
  const prevStartDate = new Date(startDate.getTime() - periodLength)
  const prevEndDate = startDate

  // Build query for current period
  let currentQuery = supabase
    .from('fanvue_transactions')
    .select('amount, net_amount, category, fanvue_user_id')
    .eq('agency_id', agencyId)
    .gte('fanvue_created_at', startDate.toISOString())
    .lte('fanvue_created_at', endDate.toISOString())

  if (options.modelId) {
    currentQuery = currentQuery.eq('model_id', options.modelId)
  }

  const { data: currentTransactions, error: currentError } = await currentQuery

  if (currentError) {
    console.error('Error fetching KPI metrics:', currentError)
    return getEmptyKPIMetrics()
  }

  // Build query for previous period (for growth calculation)
  let prevQuery = supabase
    .from('fanvue_transactions')
    .select('amount')
    .eq('agency_id', agencyId)
    .gte('fanvue_created_at', prevStartDate.toISOString())
    .lte('fanvue_created_at', prevEndDate.toISOString())

  if (options.modelId) {
    prevQuery = prevQuery.eq('model_id', options.modelId)
  }

  const { data: prevTransactions } = await prevQuery

  // Get active subscribers count
  const { count: activeSubscribers } = await supabase
    .from('models')
    .select('subscribers_count', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('status', 'active')

  // Calculate metrics
  const totalRevenue = currentTransactions?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0
  const netRevenue = currentTransactions?.reduce((sum, tx) => sum + Number(tx.net_amount), 0) || 0
  const prevTotalRevenue = prevTransactions?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0

  const tipTransactions = currentTransactions?.filter(tx => tx.category === 'tip') || []
  const messageTransactions = currentTransactions?.filter(tx => tx.category === 'message') || []

  const tipAverage =
    tipTransactions.length > 0
      ? tipTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0) / tipTransactions.length
      : 0

  const uniqueFans = new Set(currentTransactions?.map(tx => tx.fanvue_user_id).filter(Boolean)).size
  const arpu = uniqueFans > 0 ? totalRevenue / uniqueFans : 0

  // Calculate revenue growth
  const revenueGrowth =
    prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0

  return {
    totalRevenue: Math.round(totalRevenue),
    netRevenue: Math.round(netRevenue),
    activeSubscribers: activeSubscribers || 0,
    arpu: Math.round(arpu),
    messageConversionRate: 0, // TODO: Requires message_logs table
    ppvConversionRate: 0, // TODO: Requires message_logs table
    tipAverage: Math.round(tipAverage),
    transactionCount: currentTransactions?.length || 0,
    revenueGrowth: Math.round(revenueGrowth * 10) / 10,
  }
}

/**
 * Get revenue breakdown by category
 */
export async function getCategoryBreakdown(
  agencyId: string,
  options: {
    modelId?: string
    timeRange?: TimeRange
  } = {}
): Promise<CategoryBreakdown[]> {
  const supabase = await createClient()

  const { startDate, endDate } = getDateRange(options.timeRange)

  let query = supabase
    .from('fanvue_transactions')
    .select('category, amount')
    .eq('agency_id', agencyId)
    .gte('fanvue_created_at', startDate.toISOString())
    .lte('fanvue_created_at', endDate.toISOString())

  if (options.modelId) {
    query = query.eq('model_id', options.modelId)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('Error fetching category breakdown:', error)
    return []
  }

  // Group by category
  const grouped = data.reduce(
    (acc, tx) => {
      const category = tx.category || 'other'
      if (!acc[category]) {
        acc[category] = { amount: 0, count: 0 }
      }
      acc[category].amount += Number(tx.amount)
      acc[category].count += 1
      return acc
    },
    {} as Record<string, { amount: number; count: number }>
  )

  const total = Object.values(grouped).reduce((sum, cat) => sum + cat.amount, 0)

  return Object.entries(grouped)
    .map(([category, data]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      amount: Math.round(data.amount),
      percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
      transactionCount: data.count,
    }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * Helper: Convert TimeRange to actual dates
 */
function getDateRange(
  timeRange?: TimeRange,
  customStartDate?: Date,
  customEndDate?: Date
): { startDate: Date; endDate: Date } {
  const endDate = customEndDate || new Date()

  if (customStartDate) {
    return { startDate: customStartDate, endDate }
  }

  const startDate = new Date()

  switch (timeRange) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7)
      break
    case '30d':
      startDate.setDate(startDate.getDate() - 30)
      break
    case '90d':
      startDate.setDate(startDate.getDate() - 90)
      break
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1)
      break
    case 'all':
      startDate.setFullYear(2020) // Fanvue launched around 2020
      break
    default:
      startDate.setDate(startDate.getDate() - 30) // Default to 30 days
  }

  return { startDate, endDate }
}

/**
 * Helper: Fill missing dates with zero values for smooth graphs
 */
function fillMissingDates(
  dataPoints: ChartDataPoint[],
  startDate: Date,
  endDate: Date
): ChartDataPoint[] {
  if (dataPoints.length === 0) {
    return []
  }

  const filledData: ChartDataPoint[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dateStr = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    const existingPoint = dataPoints.find(d => d.date === dateStr)

    if (existingPoint) {
      filledData.push(existingPoint)
    } else {
      filledData.push({
        date: dateStr,
        subscriptions: 0,
        tips: 0,
        messages: 0,
        posts: 0,
        total: 0,
      })
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return filledData
}

/**
 * Helper: Return empty KPI metrics
 */
function getEmptyKPIMetrics(): KPIMetrics {
  return {
    totalRevenue: 0,
    netRevenue: 0,
    activeSubscribers: 0,
    arpu: 0,
    messageConversionRate: 0,
    ppvConversionRate: 0,
    tipAverage: 0,
    transactionCount: 0,
    revenueGrowth: 0,
  }
}
