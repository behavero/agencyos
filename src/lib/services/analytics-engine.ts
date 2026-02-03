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
  subscribers?: number // Audience growth data
  followers?: number // Audience growth data
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
  // New metrics (competitor parity)
  ltv: number // Lifetime Value
  goldenRatio: number // Ratio of message/ppv revenue to subscription revenue
  totalMessagesSent: number
  totalPPVSent: number
  newFans: number // New subscribers in period
  unlockRate: number // Percentage of PPV unlocks
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
  const dataPoints = (data || []).map((row: any) => ({
    date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    subscriptions: Number(row.subscriptions) || 0,
    tips: Number(row.tips) || 0,
    messages: Number(row.messages) || 0,
    posts: Number(row.posts) || 0,
    total: Number(row.total) || 0,
  }))

  // Fetch subscriber/follower history for Audience Growth chart
  let subscriberHistoryQuery = supabase
    .from('subscriber_history')
    .select('date, subscribers_total, followers_count')
    .eq('agency_id', agencyId)
    .gte('date', startDate.toISOString().split('T')[0]) // Date only (YYYY-MM-DD)
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (options.modelId) {
    subscriberHistoryQuery = subscriberHistoryQuery.eq('model_id', options.modelId)
  }

  const { data: subscriberData } = await subscriberHistoryQuery

  // Create a map of subscriber/follower data by date
  const subscriberMap = new Map<string, { subscribers: number; followers: number }>()
  subscriberData?.forEach((row: any) => {
    const dateKey = new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    // If multiple models, aggregate their counts
    const existing = subscriberMap.get(dateKey) || { subscribers: 0, followers: 0 }
    subscriberMap.set(dateKey, {
      subscribers: existing.subscribers + (Number(row.subscribers_total) || 0),
      followers: existing.followers + (Number(row.followers_count) || 0),
    })
  })

  // Merge subscriber data into chart data points
  const mergedDataPoints = dataPoints.map(point => ({
    ...point,
    subscribers: subscriberMap.get(point.date)?.subscribers || 0,
    followers: subscriberMap.get(point.date)?.followers || 0,
  }))

  // Fill missing dates with zeros
  return fillMissingDates(mergedDataPoints, startDate, endDate)
}

/**
 * Get KPI metrics for dashboard cards
 */
export async function getKPIMetrics(
  agencyId: string,
  options: {
    modelId?: string
    timeRange?: TimeRange
    startDate?: Date
    endDate?: Date
  } = {}
): Promise<KPIMetrics> {
  const supabase = await createClient()

  // Calculate date range for current period
  const { startDate, endDate } = getDateRange(options.timeRange, options.startDate, options.endDate)

  // Calculate previous period for growth comparison
  const periodLength = endDate.getTime() - startDate.getTime()
  const prevStartDate = new Date(startDate.getTime() - periodLength)
  const prevEndDate = startDate

  // Query 1: Get transaction count (NOT limited by rows)
  let countQuery = supabase
    .from('fanvue_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())

  if (options.modelId) {
    countQuery = countQuery.eq('model_id', options.modelId)
  }

  const { count: transactionCount, error: countError } = await countQuery

  // Query 2: Get transaction data for calculations (limited to 10,000 for performance)
  let currentQuery = supabase
    .from('fanvue_transactions')
    .select('amount, net_amount, transaction_type, fan_id')
    .eq('agency_id', agencyId)
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())
    .limit(10000) // Get sample for calculations

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
    .gte('transaction_date', prevStartDate.toISOString())
    .lte('transaction_date', prevEndDate.toISOString())
    .limit(100000) // Ensure we get all transactions

  if (options.modelId) {
    prevQuery = prevQuery.eq('model_id', options.modelId)
  }

  const { data: prevTransactions } = await prevQuery

  // Get total subscribers count from models
  let modelsQuery = supabase
    .from('models')
    .select('subscribers_count, followers_count')
    .eq('agency_id', agencyId)
    .eq('status', 'active')

  if (options.modelId) {
    modelsQuery = modelsQuery.eq('id', options.modelId)
  }

  const { data: models } = await modelsQuery
  const totalSubscribers = models?.reduce((sum, m) => sum + (m.subscribers_count || 0), 0) || 0
  const totalFollowers = models?.reduce((sum, m) => sum + (m.followers_count || 0), 0) || 0
  const totalAudience = totalFollowers + totalSubscribers

  // Query 3: Get ALL transactions for revenue calculation (set high limit to fetch everything!)
  let allTransactionsQuery = supabase
    .from('fanvue_transactions')
    .select('amount, net_amount')
    .eq('agency_id', agencyId)
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())
    .limit(100000) // High limit to ensure we get ALL transactions (Supabase default is only 1000!)

  if (options.modelId) {
    allTransactionsQuery = allTransactionsQuery.eq('model_id', options.modelId)
  }

  const { data: allTransactions, error: allError } = await allTransactionsQuery

  if (allError) {
    console.error('[analytics-engine] Error fetching all transactions:', allError)
  }

  console.log('[analytics-engine] Fetched transactions:', {
    count: allTransactions?.length,
    hasData: !!allTransactions,
    sampleAmount: allTransactions?.[0]?.amount,
  })

  // Query 4: Get previous period transactions for growth calculation
  let prevAllQuery = supabase
    .from('fanvue_transactions')
    .select('amount')
    .eq('agency_id', agencyId)
    .gte('transaction_date', prevStartDate.toISOString())
    .lte('transaction_date', prevEndDate.toISOString())
    .limit(100000) // High limit to ensure we get ALL transactions

  if (options.modelId) {
    prevAllQuery = prevAllQuery.eq('model_id', options.modelId)
  }

  const { data: prevAllTransactions } = await prevAllQuery

  // Calculate metrics from complete dataset
  const totalRevenue = allTransactions?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0
  const netRevenue = allTransactions?.reduce((sum, tx) => sum + Number(tx.net_amount), 0) || 0
  const prevTotalRevenue = prevAllTransactions?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0

  console.log('[analytics-engine] Revenue calculation:', {
    transactionsCount: allTransactions?.length,
    totalRevenue,
    netRevenue,
    sampleTransactions: allTransactions?.slice(0, 3).map(t => ({ amount: t.amount, net: t.net_amount })),
  })

  // Calculate Avg Tip from ALL tip transactions (not just sample)
  const { count: tipCount } = await supabase
    .from('fanvue_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('transaction_type', 'tip')
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())
    .then(r => ({ count: r.count || 0 }))

  const { data: tipData } = await supabase
    .from('fanvue_transactions')
    .select('amount')
    .eq('agency_id', agencyId)
    .eq('transaction_type', 'tip')
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())
    .limit(50000)

  const totalTipAmount = tipData?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0
  const tipAverage = tipCount > 0 ? totalTipAmount / tipCount : 0

  // Calculate ARPU (Average Revenue Per User) = Total Revenue / Total Audience (Subscribers + Followers)
  // Using totalAudience calculated earlier from models query
  const arpu = totalAudience > 0 ? totalRevenue / totalAudience : 0

  // Calculate conversion rates
  // Get accurate message/PPV/post TRANSACTION counts using COUNT queries
  const { count: messageCount } = await supabase
    .from('fanvue_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('transaction_type', 'message')
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())
    .then(r => ({ count: r.count || 0 }))

  const { count: ppvCount } = await supabase
    .from('fanvue_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('transaction_type', 'ppv')
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())
    .then(r => ({ count: r.count || 0 }))

  const { count: postCount } = await supabase
    .from('fanvue_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('transaction_type', 'post')
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())
    .then(r => ({ count: r.count || 0 }))

  // Get UNIQUE fans who purchased messages (for conversion rate)
  const { data: uniqueMessageBuyers } = await supabase
    .from('fanvue_transactions')
    .select('fan_id')
    .eq('agency_id', agencyId)
    .eq('transaction_type', 'message')
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())
    .limit(50000)

  const uniqueMessageFans = new Set(uniqueMessageBuyers?.map(t => t.fan_id).filter(Boolean)).size

  // Get UNIQUE fans who purchased posts/PPV (for conversion rate)
  const { data: uniquePostBuyers } = await supabase
    .from('fanvue_transactions')
    .select('fan_id')
    .eq('agency_id', agencyId)
    .in('transaction_type', ['post', 'ppv'])
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())
    .limit(50000)

  const uniquePostFans = new Set(uniquePostBuyers?.map(t => t.fan_id).filter(Boolean)).size

  // Message Purchase Rate: % of subscribers who bought at least 1 message
  const messageConversionRate = totalSubscribers > 0 ? (uniqueMessageFans / totalSubscribers) * 100 : 0

  // Post Purchase Rate: % of subscribers who bought at least 1 post/PPV
  const ppvConversionRate = totalSubscribers > 0 ? (uniquePostFans / totalSubscribers) * 100 : 0

  // Calculate revenue growth
  const revenueGrowth =
    prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0

  // NEW METRICS for competitor parity:

  // 1. LTV (Lifetime Value) = Total Revenue / Total Subscribers (actual average lifetime value)
  const ltv = totalSubscribers > 0 ? totalRevenue / totalSubscribers : 0

  // 2. Golden Ratio = (Message + PPV + Tip Revenue) / Subscription Revenue
  const subscriptionRevenue =
    currentTransactions
      ?.filter(tx => tx.transaction_type === 'subscription' || tx.transaction_type === 'renewal')
      .reduce((sum, tx) => sum + Number(tx.amount), 0) || 0
  const interactionRevenue =
    currentTransactions
      ?.filter(
        tx =>
          tx.transaction_type === 'message' ||
          tx.transaction_type === 'ppv' ||
          tx.transaction_type === 'post' ||
          tx.transaction_type === 'tip'
      )
      .reduce((sum, tx) => sum + Number(tx.amount), 0) || 0
  const goldenRatio = subscriptionRevenue > 0 ? interactionRevenue / subscriptionRevenue : 0

  // 3. Total Messages Purchased (accurate count)
  const totalMessagesSent = messageCount

  // 4. Total PPV/Posts Purchased (accurate count)
  const totalPPVSent = ppvCount + postCount

  // 5. New Fans (unique fan_ids in period - this is unique buyers, not total subs/followers)
  const uniqueFans = new Set(currentTransactions?.map(tx => tx.fan_id).filter(Boolean))
  const newFans = uniqueFans.size

  // 6. Unlock Rate: N/A - Fanvue API doesn't provide "PPV sent" data (only "PPV purchased")
  // This would require tracking from chatting tool
  const unlockRate = 0 // Placeholder until we implement chat tracking

  return {
    totalRevenue: Math.round(totalRevenue),
    netRevenue: Math.round(netRevenue),
    activeSubscribers: totalSubscribers, // Use total subscribers from models table
    arpu: Math.round(arpu * 100) / 100, // Round to 2 decimal places
    messageConversionRate: Math.round(messageConversionRate * 10) / 10, // Messages per subscriber (%)
    ppvConversionRate: Math.round(ppvConversionRate * 10) / 10, // PPV per subscriber (%)
    tipAverage: Math.round(tipAverage * 100) / 100, // Round to 2 decimal places
    transactionCount: transactionCount || 0, // Use the COUNT query result, not array length!
    revenueGrowth: Math.round(revenueGrowth * 10) / 10,
    // New metrics
    ltv: Math.round(ltv * 100) / 100,
    goldenRatio: Math.round(goldenRatio * 100) / 100,
    totalMessagesSent,
    totalPPVSent,
    newFans,
    unlockRate: Math.round(unlockRate * 10) / 10, // N/A until chat tracking implemented
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
    startDate?: Date
    endDate?: Date
  } = {}
): Promise<CategoryBreakdown[]> {
  const supabase = await createClient()

  const { startDate, endDate } = getDateRange(options.timeRange, options.startDate, options.endDate)

  let query = supabase
    .from('fanvue_transactions')
    .select('transaction_type, amount')
    .eq('agency_id', agencyId)
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())
    .limit(100000) // Ensure we get all transactions for breakdown

  if (options.modelId) {
    query = query.eq('model_id', options.modelId)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('Error fetching category breakdown:', error)
    return []
  }

  // Group by transaction_type
  const grouped = data.reduce(
    (acc, tx) => {
      const category = tx.transaction_type || 'other'
      if (!acc[category]) {
        acc[category] = { amount: 0, count: 0 }
      }
      acc[category].amount += Number(tx.amount)
      acc[category].count += 1
      return acc
    },
    {} as Record<string, { amount: number; count: 0 }>
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
 * Helper: Aggregate and fill data based on date range
 * - Short ranges (7-30 days): Daily granularity
 * - Medium ranges (31-180 days): Weekly granularity
 * - Long ranges (181+ days): Monthly granularity
 */
function fillMissingDates(
  dataPoints: ChartDataPoint[],
  startDate: Date,
  endDate: Date
): ChartDataPoint[] {
  if (dataPoints.length === 0) {
    return []
  }

  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  // For short ranges (≤30 days), return daily data
  if (daysDiff <= 30) {
    return aggregateDaily(dataPoints, startDate, endDate)
  }

  // For medium ranges (31-180 days), aggregate by week
  if (daysDiff <= 180) {
    return aggregateWeekly(dataPoints, startDate, endDate)
  }

  // For long ranges (>180 days), aggregate by month
  return aggregateMonthly(dataPoints, startDate, endDate)
}

/**
 * Aggregate data by day
 */
function aggregateDaily(
  dataPoints: ChartDataPoint[],
  startDate: Date,
  endDate: Date
): ChartDataPoint[] {
  const filledData: ChartDataPoint[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dateStr = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const existingPoint = dataPoints.find(d => d.date === dateStr)

    filledData.push(
      existingPoint || {
        date: dateStr,
        subscriptions: 0,
        tips: 0,
        messages: 0,
        posts: 0,
        total: 0,
        subscribers: 0,
        followers: 0,
      }
    )

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return filledData
}

/**
 * Aggregate data by week
 */
function aggregateWeekly(
  dataPoints: ChartDataPoint[],
  startDate: Date,
  endDate: Date
): ChartDataPoint[] {
  const weeklyData = new Map<string, ChartDataPoint>()

  // Parse all data points and group by week
  for (const point of dataPoints) {
    // Get the Monday of the week for this data point
    const pointDate = new Date(point.date + ' 2025') // Add year for parsing
    const monday = new Date(pointDate)
    const day = monday.getDay()
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
    monday.setDate(diff)

    const weekKey = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    if (weeklyData.has(weekKey)) {
      const existing = weeklyData.get(weekKey)!
      existing.subscriptions += point.subscriptions
      existing.tips += point.tips
      existing.messages += point.messages
      existing.posts += point.posts
      existing.total += point.total
      existing.subscribers = Math.max(existing.subscribers || 0, point.subscribers || 0) // Use latest count
      existing.followers = Math.max(existing.followers || 0, point.followers || 0) // Use latest count
    } else {
      weeklyData.set(weekKey, {
        date: weekKey,
        subscriptions: point.subscriptions,
        tips: point.tips,
        messages: point.messages,
        posts: point.posts,
        total: point.total,
        subscribers: point.subscribers || 0,
        followers: point.followers || 0,
      })
    }
  }

  return Array.from(weeklyData.values()).sort((a, b) => {
    const dateA = new Date(a.date + ' 2025')
    const dateB = new Date(b.date + ' 2025')
    return dateA.getTime() - dateB.getTime()
  })
}

/**
 * Aggregate data by month
 */
function aggregateMonthly(
  dataPoints: ChartDataPoint[],
  startDate: Date,
  endDate: Date
): ChartDataPoint[] {
  const monthlyData = new Map<string, ChartDataPoint>()

  // Parse all data points and group by month
  for (const point of dataPoints) {
    // Extract month from date string
    const monthMatch = point.date.match(/^([A-Za-z]{3})/)
    if (!monthMatch) continue

    const monthKey = monthMatch[1]

    if (monthlyData.has(monthKey)) {
      const existing = monthlyData.get(monthKey)!
      existing.subscriptions += point.subscriptions
      existing.tips += point.tips
      existing.messages += point.messages
      existing.posts += point.posts
      existing.total += point.total
      existing.subscribers = Math.max(existing.subscribers || 0, point.subscribers || 0) // Use latest count
      existing.followers = Math.max(existing.followers || 0, point.followers || 0) // Use latest count
    } else {
      monthlyData.set(monthKey, {
        date: monthKey,
        subscriptions: point.subscriptions,
        tips: point.tips,
        messages: point.messages,
        posts: point.posts,
        total: point.total,
        subscribers: point.subscribers || 0,
        followers: point.followers || 0,
      })
    }
  }

  // Sort by month order (Jan, Feb, Mar...)
  const monthOrder = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]

  return Array.from(monthlyData.values()).sort((a, b) => {
    const indexA = monthOrder.indexOf(a.date)
    const indexB = monthOrder.indexOf(b.date)
    return indexA - indexB
  })
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
    ltv: 0,
    goldenRatio: 0,
    totalMessagesSent: 0,
    totalPPVSent: 0,
    newFans: 0,
    unlockRate: 0,
  }
}
