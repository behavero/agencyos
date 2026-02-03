/**
 * Analytics Engine
 * Phase 49 - Granular Analytics with Fanvue Transactions
 * Phase 65 - Performance Optimization with unstable_cache
 *
 * This service provides accurate revenue tracking and KPI calculations
 * using granular transaction data from Fanvue API.
 *
 * Heavy queries are cached using Next.js unstable_cache for 5 minutes
 * to reduce database load and Vercel function invocations.
 */

import { createClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'

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
  // IMPORTANT: Include year in date format to avoid mixing data from different years!
  const dataPoints = (data || []).map((row: any) => ({
    date: new Date(row.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    subscriptions: Number(row.subscriptions) || 0,
    tips: Number(row.tips) || 0,
    messages: Number(row.messages) || 0,
    posts: Number(row.posts) || 0,
    total: Number(row.total) || 0,
  }))

  // Generate subscriber growth from TRANSACTION data (cumulative unique subscribers over time)
  // This is more reliable than subscriber_history which may have incomplete data
  let subTransactionsQuery = supabase
    .from('fanvue_transactions')
    .select('transaction_date, fan_id')
    .eq('agency_id', agencyId)
    .eq('transaction_type', 'subscription')
    .gt('amount', 0) // Only PAID subscriptions
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())
    .order('transaction_date', { ascending: true })

  if (options.modelId) {
    subTransactionsQuery = subTransactionsQuery.eq('model_id', options.modelId)
  }

  const { data: subTransactions } = await subTransactionsQuery

  // Get current follower count from models table
  let modelsForFollowersQuery = supabase
    .from('models')
    .select('followers_count')
    .eq('agency_id', agencyId)

  if (options.modelId) {
    modelsForFollowersQuery = modelsForFollowersQuery.eq('id', options.modelId)
  }

  const { data: modelsForFollowers } = await modelsForFollowersQuery
  const totalCurrentFollowers =
    modelsForFollowers?.reduce((sum, m) => sum + (m.followers_count || 0), 0) || 0

  // Sort transactions by date to calculate cumulative counts correctly
  const sortedTransactions = (subTransactions || []).sort(
    (a: any, b: any) =>
      new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
  )

  // Calculate cumulative unique subscribers by date (sorted!)
  const seenFans = new Set<string>()
  const subscriberByDate = new Map<string, number>()

  sortedTransactions.forEach((tx: any) => {
    seenFans.add(tx.fan_id)
    const dateKey = new Date(tx.transaction_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    subscriberByDate.set(dateKey, seenFans.size) // Update cumulative count for this date
  })

  // Get the final subscriber count
  const finalSubscriberCount = seenFans.size

  // Sort dataPoints chronologically first
  const sortedDataPoints = [...dataPoints].sort((a, b) => {
    const dateA = new Date(a.date)
    const dateB = new Date(b.date)
    return dateA.getTime() - dateB.getTime()
  })

  // Merge subscriber data into chart data points
  // Subscribers: Use cumulative count, carry forward if no transactions that day
  // Followers: Linear growth from 0 to current (approximation)
  const totalDays = sortedDataPoints.length
  let lastSubscriberCount = 0

  const mergedDataPoints = sortedDataPoints.map((point, index) => {
    // Get subscriber count for this date, or carry forward the last known count
    const subCount = subscriberByDate.get(point.date)
    if (subCount !== undefined) {
      lastSubscriberCount = subCount
    }

    return {
      ...point,
      // Cumulative subscribers (carries forward)
      subscribers: lastSubscriberCount,
      // Linear growth for followers: 0 → current over time
      followers: totalDays > 0 ? Math.round((totalCurrentFollowers * (index + 1)) / totalDays) : 0,
    }
  })

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

  // Get follower count from models (for display purposes)
  let modelsQuery = supabase
    .from('models')
    .select('subscribers_count, followers_count')
    .eq('agency_id', agencyId)

  if (options.modelId) {
    modelsQuery = modelsQuery.eq('id', options.modelId)
  }

  const { data: models } = await modelsQuery

  // Get ACTUAL subscriber and follower counts from Fanvue Smart Lists (stored in models table)
  // This is the source of truth for audience metrics
  const modelSubscribers = models?.reduce((sum, m) => sum + (m.subscribers_count || 0), 0) || 0
  const modelFollowers = models?.reduce((sum, m) => sum + (m.followers_count || 0), 0) || 0
  const totalAudienceFromFanvue = modelSubscribers + modelFollowers

  // For CONVERSION RATE calculations, we need PAID subscribers from transactions
  // This excludes free trials and counts only paying customers
  // Paginate to get ALL PAID subscription transactions (exclude $0 free trials)
  // This count should match Fanvue's "Subscribers + Expired Subscribers" count
  let allSubTransactions: { fan_id: string }[] = []
  let subOffset = 0
  let subHasMore = true

  while (subHasMore) {
    let query = supabase
      .from('fanvue_transactions')
      .select('fan_id')
      .eq('agency_id', agencyId)
      .eq('transaction_type', 'subscription')
      .gt('amount', 0) // CRITICAL: Only count PAID subscriptions (exclude $0 free trials)
      .gte('transaction_date', startDate.toISOString())
      .lte('transaction_date', endDate.toISOString())
      .range(subOffset, subOffset + 999)

    // Apply model filter if specified
    if (options.modelId) {
      query = query.eq('model_id', options.modelId)
    }

    const { data } = await query

    if (!data || data.length === 0) {
      subHasMore = false
    } else {
      allSubTransactions = allSubTransactions.concat(data)
      subOffset += 1000
      if (data.length < 1000) subHasMore = false
    }
  }

  // Count UNIQUE PAYING subscribers from transactions (for LTV and conversion calculations)
  // This is DIFFERENT from modelSubscribers (which is current active subs from Fanvue Smart Lists)
  const paidSubscribersFromTransactions = new Set(
    allSubTransactions.map(t => t.fan_id).filter(Boolean)
  ).size

  // For "New Fans" and audience display, use Fanvue Smart List data (source of truth)
  // modelSubscribers = current active subscribers
  // modelFollowers = free followers
  const totalAudienceDisplay = totalAudienceFromFanvue // Use Smart Lists for display

  console.log('[analytics-engine] Audience counts:', {
    paidSubscribersFromTransactions, // For LTV/conversion calculations
    modelSubscribers, // Current active subs from Fanvue
    modelFollowers, // Followers from Fanvue
    totalAudienceFromFanvue, // For "New Fans" display
    paidSubscriptionTransactions: allSubTransactions.length,
  })

  // Query 3: Get ALL transactions for revenue calculation using PAGINATION
  // Supabase has a 1000-row limit that .limit() doesn't always override!
  let allTransactions: { amount: number; net_amount: number }[] = []
  let revOffset = 0
  const revPageSize = 1000
  let revHasMore = true

  while (revHasMore) {
    let query = supabase
      .from('fanvue_transactions')
      .select('amount, net_amount')
      .eq('agency_id', agencyId)
      .gte('transaction_date', startDate.toISOString())
      .lte('transaction_date', endDate.toISOString())
      .range(revOffset, revOffset + revPageSize - 1) // Proper pagination

    if (options.modelId) {
      query = query.eq('model_id', options.modelId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[analytics-engine] Error fetching transactions page:', error)
      break
    }

    if (!data || data.length === 0) {
      revHasMore = false
    } else {
      allTransactions = allTransactions.concat(data)
      revOffset += revPageSize
      if (data.length < revPageSize) {
        revHasMore = false
      }
    }
  }

  console.log('[analytics-engine] Fetched ALL transactions via pagination:', {
    count: allTransactions.length,
    hasData: allTransactions.length > 0,
  })

  // Query 4: Get previous period transactions for growth calculation
  let prevAllTransactions: { amount: number }[] = []
  let prevOffset = 0
  let prevHasMore = true

  while (prevHasMore) {
    let query = supabase
      .from('fanvue_transactions')
      .select('amount')
      .eq('agency_id', agencyId)
      .gte('transaction_date', prevStartDate.toISOString())
      .lte('transaction_date', prevEndDate.toISOString())
      .range(prevOffset, prevOffset + revPageSize - 1)

    if (options.modelId) {
      query = query.eq('model_id', options.modelId)
    }

    const { data, error } = await query

    if (error || !data || data.length === 0) {
      prevHasMore = false
    } else {
      prevAllTransactions = prevAllTransactions.concat(data)
      prevOffset += revPageSize
      if (data.length < revPageSize) {
        prevHasMore = false
      }
    }
  }

  // Calculate metrics from complete dataset
  const totalRevenue = allTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0)
  const netRevenue = allTransactions.reduce((sum, tx) => sum + Number(tx.net_amount), 0)
  const prevTotalRevenue = prevAllTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0)

  console.log('[analytics-engine] Revenue calculation:', {
    transactionCount: allTransactions.length,
    totalRevenue,
    netRevenue,
  })

  console.log('[analytics-engine] Revenue calculation:', {
    transactionsCount: allTransactions?.length,
    totalRevenue,
    netRevenue,
    sampleTransactions: allTransactions
      ?.slice(0, 3)
      .map(t => ({ amount: t.amount, net: t.net_amount })),
  })

  // Calculate Avg Tip from ALL tip transactions (not just sample)
  let tipCountQuery = supabase
    .from('fanvue_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('transaction_type', 'tip')
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())

  if (options.modelId) {
    tipCountQuery = tipCountQuery.eq('model_id', options.modelId)
  }

  const { count: tipCount } = await tipCountQuery.then(r => ({ count: r.count || 0 }))

  let tipDataQuery = supabase
    .from('fanvue_transactions')
    .select('amount')
    .eq('agency_id', agencyId)
    .eq('transaction_type', 'tip')
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())
    .limit(50000)

  if (options.modelId) {
    tipDataQuery = tipDataQuery.eq('model_id', options.modelId)
  }

  const { data: tipData } = await tipDataQuery

  const totalTipAmount = tipData?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0
  const tipAverage = tipCount > 0 ? totalTipAmount / tipCount : 0

  // Calculate ARPU (Average Revenue Per User) = Total Revenue / Total Audience (Subscribers + Followers)
  // Using totalAudienceFromFanvue from Smart Lists (source of truth)
  const arpu = totalAudienceFromFanvue > 0 ? totalRevenue / totalAudienceFromFanvue : 0

  // Calculate conversion rates
  // Get accurate message/PPV/post TRANSACTION counts using COUNT queries
  let messageCountQuery = supabase
    .from('fanvue_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('transaction_type', 'message')
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())

  if (options.modelId) {
    messageCountQuery = messageCountQuery.eq('model_id', options.modelId)
  }

  const { count: messageCount } = await messageCountQuery.then(r => ({ count: r.count || 0 }))

  let ppvCountQuery = supabase
    .from('fanvue_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('transaction_type', 'ppv')
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())

  if (options.modelId) {
    ppvCountQuery = ppvCountQuery.eq('model_id', options.modelId)
  }

  const { count: ppvCount } = await ppvCountQuery.then(r => ({ count: r.count || 0 }))

  let postCountQuery = supabase
    .from('fanvue_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('transaction_type', 'post')
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())

  if (options.modelId) {
    postCountQuery = postCountQuery.eq('model_id', options.modelId)
  }

  const { count: postCount } = await postCountQuery.then(r => ({ count: r.count || 0 }))

  // Get UNIQUE fans who purchased messages (for conversion rate)
  let uniqueMessageBuyersQuery = supabase
    .from('fanvue_transactions')
    .select('fan_id')
    .eq('agency_id', agencyId)
    .eq('transaction_type', 'message')
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())
    .limit(50000)

  if (options.modelId) {
    uniqueMessageBuyersQuery = uniqueMessageBuyersQuery.eq('model_id', options.modelId)
  }

  const { data: uniqueMessageBuyers } = await uniqueMessageBuyersQuery

  const uniqueMessageFans = new Set(uniqueMessageBuyers?.map(t => t.fan_id).filter(Boolean)).size

  // Get UNIQUE fans who purchased posts/PPV (for conversion rate)
  let uniquePostBuyersQuery = supabase
    .from('fanvue_transactions')
    .select('fan_id')
    .eq('agency_id', agencyId)
    .in('transaction_type', ['post', 'ppv'])
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())
    .limit(50000)

  if (options.modelId) {
    uniquePostBuyersQuery = uniquePostBuyersQuery.eq('model_id', options.modelId)
  }

  const { data: uniquePostBuyers } = await uniquePostBuyersQuery

  const uniquePostFans = new Set(uniquePostBuyers?.map(t => t.fan_id).filter(Boolean)).size

  // Message Purchase Rate: % of PAID subscribers who bought at least 1 message
  // Uses paidSubscribersFromTransactions (people who actually paid for subscription)
  const messageConversionRate =
    paidSubscribersFromTransactions > 0
      ? (uniqueMessageFans / paidSubscribersFromTransactions) * 100
      : 0

  // Post Purchase Rate: % of PAID subscribers who bought at least 1 post/PPV
  const ppvConversionRate =
    paidSubscribersFromTransactions > 0
      ? (uniquePostFans / paidSubscribersFromTransactions) * 100
      : 0

  // Calculate revenue growth
  const revenueGrowth =
    prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0

  // NEW METRICS for competitor parity:

  // 1. LTV (Lifetime Value) = Total Revenue / Paid Subscribers
  // This represents the average lifetime value per paying customer
  const ltv =
    paidSubscribersFromTransactions > 0 ? totalRevenue / paidSubscribersFromTransactions : 0

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

  // 5. New Fans = Total current audience from Fanvue Smart Lists (subscribers + followers)
  // This uses actual Fanvue data, not transaction-based estimates
  const newFans = totalAudienceFromFanvue // Actual current audience from Fanvue

  // 6. Unlock Rate: N/A - Fanvue API doesn't provide "PPV sent" data (only "PPV purchased")
  // This would require tracking from chatting tool
  const unlockRate = 0 // Placeholder until we implement chat tracking

  return {
    totalRevenue: Math.round(totalRevenue),
    netRevenue: Math.round(netRevenue),
    activeSubscribers: modelSubscribers, // Current active subscribers from Fanvue Smart Lists
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

  // Use pagination to get ALL rows (Supabase default limit is 1000!)
  let allData: { transaction_type: string; amount: number }[] = []
  let offset = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    let query = supabase
      .from('fanvue_transactions')
      .select('transaction_type, amount')
      .eq('agency_id', agencyId)
      .gte('transaction_date', startDate.toISOString())
      .lte('transaction_date', endDate.toISOString())
      .range(offset, offset + pageSize - 1) // Proper pagination

    if (options.modelId) {
      query = query.eq('model_id', options.modelId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[getCategoryBreakdown] Error fetching transactions:', error)
      return []
    }

    if (!data || data.length === 0) {
      hasMore = false
    } else {
      allData = allData.concat(data)
      offset += pageSize
      // If we got fewer rows than requested, we've reached the end
      if (data.length < pageSize) {
        hasMore = false
      }
    }
  }

  console.log(`[getCategoryBreakdown] Fetched ${allData.length} total transactions`)

  const data = allData

  if (!data || data.length === 0) {
    console.error('[getCategoryBreakdown] No data found')
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
    // IMPORTANT: Include year to avoid mixing data from different years!
    const dateStr = currentDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
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
  const weeklyData = new Map<string, { data: ChartDataPoint; sortKey: string }>()

  // Parse all data points and group by week
  for (const point of dataPoints) {
    // Get the Monday of the week for this data point
    // Date format is now "Jan 15, 2025" which JS can parse directly
    const pointDate = new Date(point.date)
    if (isNaN(pointDate.getTime())) continue // Skip invalid dates

    const monday = new Date(pointDate)
    const day = monday.getDay()
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
    monday.setDate(diff)

    // Use sortable key for proper ordering
    const sortKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
    const weekKey = monday.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    if (weeklyData.has(sortKey)) {
      const existing = weeklyData.get(sortKey)!.data
      existing.subscriptions += point.subscriptions
      existing.tips += point.tips
      existing.messages += point.messages
      existing.posts += point.posts
      existing.total += point.total
      existing.subscribers = Math.max(existing.subscribers || 0, point.subscribers || 0)
      existing.followers = Math.max(existing.followers || 0, point.followers || 0)
    } else {
      weeklyData.set(sortKey, {
        sortKey,
        data: {
          date: weekKey,
          subscriptions: point.subscriptions,
          tips: point.tips,
          messages: point.messages,
          posts: point.posts,
          total: point.total,
          subscribers: point.subscribers || 0,
          followers: point.followers || 0,
        },
      })
    }
  }

  // Sort by sortKey (YYYY-MM-DD format sorts correctly)
  return Array.from(weeklyData.values())
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(item => item.data)
}

/**
 * Aggregate data by month (with year to avoid mixing different years)
 */
function aggregateMonthly(
  dataPoints: ChartDataPoint[],
  startDate: Date,
  endDate: Date
): ChartDataPoint[] {
  // Group by "YYYY-MM" to keep years separate
  const monthlyData = new Map<string, { data: ChartDataPoint; sortKey: string }>()

  // Parse all data points and group by month+year
  for (const point of dataPoints) {
    // Date format is now "Jan 15, 2025" which JS can parse directly
    const parsedDate = new Date(point.date)
    if (isNaN(parsedDate.getTime())) continue // Skip invalid dates

    // Create key with year and month for proper grouping
    const sortKey = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`
    const displayKey = parsedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) // "Jun 2025"

    if (monthlyData.has(sortKey)) {
      const existing = monthlyData.get(sortKey)!.data
      existing.subscriptions += point.subscriptions
      existing.tips += point.tips
      existing.messages += point.messages
      existing.posts += point.posts
      existing.total += point.total
      existing.subscribers = Math.max(existing.subscribers || 0, point.subscribers || 0)
      existing.followers = Math.max(existing.followers || 0, point.followers || 0)
    } else {
      monthlyData.set(sortKey, {
        sortKey,
        data: {
          date: displayKey, // "Jun 2025" format
          subscriptions: point.subscriptions,
          tips: point.tips,
          messages: point.messages,
          posts: point.posts,
          total: point.total,
          subscribers: point.subscribers || 0,
          followers: point.followers || 0,
        },
      })
    }
  }

  // Sort chronologically by sortKey (YYYY-MM format sorts correctly)
  return Array.from(monthlyData.values())
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(item => item.data)
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

// ============================================================================
// PHASE 65: CACHED VERSIONS (unstable_cache)
// These reduce Vercel function invocations by caching for 5 minutes
// ============================================================================

/**
 * Cached version of getKPIMetrics
 * Reduces database queries by caching results for 5 minutes
 */
export const getCachedKPIMetrics = unstable_cache(
  async (
    agencyId: string,
    modelId?: string,
    timeRange?: TimeRange,
    startDate?: string,
    endDate?: string
  ) => {
    return getKPIMetrics(agencyId, {
      modelId,
      timeRange,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })
  },
  ['kpi-metrics'],
  { revalidate: 300 } // 5 minutes
)

/**
 * Cached version of getCategoryBreakdown
 * Reduces database queries by caching results for 5 minutes
 */
export const getCachedCategoryBreakdown = unstable_cache(
  async (
    agencyId: string,
    modelId?: string,
    timeRange?: TimeRange,
    startDate?: string,
    endDate?: string
  ) => {
    return getCategoryBreakdown(agencyId, {
      modelId,
      timeRange,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })
  },
  ['category-breakdown'],
  { revalidate: 300 } // 5 minutes
)

/**
 * Cached version of getChartData
 * Reduces database queries by caching results for 5 minutes
 */
export const getCachedChartData = unstable_cache(
  async (
    agencyId: string,
    modelId?: string,
    timeRange?: TimeRange,
    startDate?: string,
    endDate?: string
  ) => {
    return getChartData(agencyId, {
      modelId,
      timeRange,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })
  },
  ['chart-data'],
  { revalidate: 300 } // 5 minutes
)
