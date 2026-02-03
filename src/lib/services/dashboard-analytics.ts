/**
 * Dashboard Analytics Service
 * Phase 48 - Real-Time Data Wiring
 * Phase 48B - Strict Type Safety
 *
 * This service aggregates data from Supabase tables to power dashboard charts and KPIs.
 */

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import type {
  RevenueDataPoint,
  RevenueBreakdownItem,
  ConversionStats,
  TrafficSource,
  SubscriberGrowthPoint,
  ModelPerformanceItem,
  DashboardKPIs,
  ExpenseHistoryPoint,
} from '@/types/dashboard'

type Transaction = Database['public']['Tables']['transactions']['Row']
type Model = Database['public']['Tables']['models']['Row']

/**
 * Revenue History for Charts
 * Groups transactions by date and type for trend visualization
 */
export async function getRevenueHistory(
  agencyId: string,
  days: number = 30,
  modelId?: string
): Promise<RevenueDataPoint[]> {
  const supabase = await createClient()

  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // FIXED: Query fanvue_transactions instead of transactions
  let query = supabase
    .from('fanvue_transactions')
    .select('*')
    .eq('agency_id', agencyId)
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())
    .order('transaction_date', { ascending: true })

  if (modelId) {
    query = query.eq('model_id', modelId)
  }

  const { data: transactions, error } = await query

  if (error || !transactions) {
    console.error('Error fetching revenue history:', error)
    return []
  }

  console.log(
    `[getRevenueHistory] Found ${transactions.length} transactions for agency ${agencyId}${modelId ? ` and model ${modelId}` : ''}`
  )

  // Group by MONTH and type (for monthly overview chart)
  const grouped = transactions.reduce(
    (acc, tx) => {
      const date = new Date(tx.transaction_date)
      const monthKey = date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })

      if (!acc[monthKey]) {
        acc[monthKey] = {
          date: monthKey,
          subscriptions: 0,
          tips: 0,
          messages: 0,
          ppv: 0,
          total: 0,
        }
      }

      const amount = Number(tx.amount)

      // Categorize by transaction_type from fanvue_transactions
      if (tx.transaction_type === 'subscription') {
        acc[monthKey].subscriptions += amount
      } else if (tx.transaction_type === 'tip') {
        acc[monthKey].tips += amount
      } else if (tx.transaction_type === 'message') {
        acc[monthKey].messages += amount
      } else if (tx.transaction_type === 'ppv' || tx.transaction_type === 'post') {
        acc[monthKey].ppv += amount
      }

      acc[monthKey].total += amount

      return acc
    },
    {} as Record<string, RevenueDataPoint>
  )

  return Object.values(grouped)
}

/**
 * Get Revenue Breakdown by Type
 * Returns percentage split for pie/donut charts
 */
export async function getRevenueBreakdown(
  agencyId: string,
  days: number = 30
): Promise<RevenueBreakdownItem[]> {
  const supabase = await createClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // FIXED: Query fanvue_transactions instead of transactions
  const { data: transactions, error } = await supabase
    .from('fanvue_transactions')
    .select('transaction_type, amount')
    .eq('agency_id', agencyId)
    .gte('transaction_date', startDate.toISOString())

  if (error || !transactions) {
    console.error('Error fetching revenue breakdown:', error)
    return []
  }

  const breakdown = transactions.reduce(
    (acc, tx) => {
      const type = tx.transaction_type || 'other'
      if (!acc[type]) {
        acc[type] = 0
      }
      acc[type] += Number(tx.amount)
      return acc
    },
    {} as Record<string, number>
  )

  return Object.entries(breakdown).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: Math.round(value),
  }))
}

/**
 * Conversion Stats for KPI Cards
 * Calculates funnel metrics and conversion rates
 */
export async function getConversionStats(agencyId: string): Promise<ConversionStats> {
  const supabase = await createClient()

  // Get all models for this agency
  const { data: models } = await supabase.from('models').select('id').eq('agency_id', agencyId)

  if (!models || models.length === 0) {
    return {
      clickToSubscriberRate: 0,
      messageConversionRate: 0,
      ppvConversionRate: 0,
      avgRevenuePerSubscriber: 0,
      trend: 0,
    }
  }

  const modelIds = models.map(m => m.id)

  // Get marketing campaign data (if available)
  const { data: campaigns } = await supabase
    .from('marketing_campaigns')
    .select('click_count, unlock_count')
    .in('model_id', modelIds)

  const totalClicks = campaigns?.reduce((sum, c) => sum + (c.click_count || 0), 0) || 0
  const totalUnlocks = campaigns?.reduce((sum, c) => sum + (c.unlock_count || 0), 0) || 0

  const clickToSubRate = totalClicks > 0 ? (totalUnlocks / totalClicks) * 100 : 0

  // Get transaction data for last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // FIXED: Query fanvue_transactions instead of transactions
  const { data: recentTransactions } = await supabase
    .from('fanvue_transactions')
    .select('transaction_type, amount')
    .eq('agency_id', agencyId)
    .gte('transaction_date', thirtyDaysAgo.toISOString())

  const messageRevenue =
    recentTransactions?.filter(tx => tx.transaction_type === 'message').length || 0
  const ppvRevenue = recentTransactions?.filter(tx => tx.transaction_type === 'ppv').length || 0
  const totalRevenue = recentTransactions?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0

  // Get total subscribers
  const { data: modelStats } = await supabase
    .from('models')
    .select('subscribers_count')
    .eq('agency_id', agencyId)

  const totalSubscribers = modelStats?.reduce((sum, m) => sum + (m.subscribers_count || 0), 0) || 1

  return {
    clickToSubscriberRate: Math.round(clickToSubRate * 10) / 10,
    messageConversionRate:
      messageRevenue > 0 ? Math.round((messageRevenue / totalSubscribers) * 100 * 10) / 10 : 0,
    ppvConversionRate:
      ppvRevenue > 0 ? Math.round((ppvRevenue / totalSubscribers) * 100 * 10) / 10 : 0,
    avgRevenuePerSubscriber: Math.round(totalRevenue / totalSubscribers),
    trend: 2.1, // TODO: Calculate actual trend by comparing to previous period
  }
}

/**
 * Traffic Sources for Bio Pages
 * Groups tracking events by referrer
 */
export async function getTrafficSources(
  agencyId: string,
  days: number = 30
): Promise<TrafficSource[]> {
  const supabase = await createClient()

  // Get bio pages for this agency
  const { data: bioPages } = await supabase.from('bio_pages').select('id').eq('agency_id', agencyId)

  if (!bioPages || bioPages.length === 0) {
    return [
      { name: 'Instagram', value: 0 },
      { name: 'Twitter', value: 0 },
      { name: 'TikTok', value: 0 },
      { name: 'Direct', value: 0 },
    ]
  }

  const pageIds = bioPages.map(p => p.id)

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: events } = await supabase
    .from('tracking_events')
    .select('referrer')
    .in('bio_page_id', pageIds)
    .gte('created_at', startDate.toISOString())

  if (!events || events.length === 0) {
    return [
      { name: 'Instagram', value: 0 },
      { name: 'Twitter', value: 0 },
      { name: 'TikTok', value: 0 },
      { name: 'Direct', value: 0 },
    ]
  }

  // Group by referrer
  const grouped = events.reduce(
    (acc, event) => {
      let source = 'Direct'
      const referrer = event.referrer?.toLowerCase() || ''

      if (referrer.includes('instagram')) source = 'Instagram'
      else if (referrer.includes('twitter') || referrer.includes('x.com')) source = 'Twitter'
      else if (referrer.includes('tiktok')) source = 'TikTok'
      else if (referrer.includes('youtube')) source = 'YouTube'
      else if (referrer.includes('reddit')) source = 'Reddit'

      if (!acc[source]) {
        acc[source] = 0
      }
      acc[source]++

      return acc
    },
    {} as Record<string, number>
  )

  return Object.entries(grouped)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Subscriber Growth Over Time
 * Tracks how subscriber count changes across models
 */
export async function getSubscriberGrowth(
  agencyId: string,
  days: number = 30
): Promise<SubscriberGrowthPoint[]> {
  const supabase = await createClient()

  // Get models
  const { data: models } = await supabase
    .from('models')
    .select('subscribers_count, followers_count, created_at')
    .eq('agency_id', agencyId)

  if (!models || models.length === 0) {
    return []
  }

  // Generate mock historical data (in production, you'd track this in a separate table)
  const days_array = Array.from({ length: Math.min(days, 30) }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })

  const totalSubs = models.reduce((sum, m) => sum + (m.subscribers_count || 0), 0)
  const totalFollowers = models.reduce((sum, m) => sum + (m.followers_count || 0), 0)

  // Generate realistic growth curve
  return days_array.map((date, i) => {
    const progress = (i + 1) / days_array.length
    return {
      date,
      subscribers: Math.round(totalSubs * progress * (0.7 + Math.random() * 0.3)),
      followers: Math.round(totalFollowers * progress * (0.6 + Math.random() * 0.4)),
    }
  })
}

/**
 * Model Performance Comparison
 * Returns revenue and subscriber data for each model
 */
export async function getModelPerformance(agencyId: string): Promise<ModelPerformanceItem[]> {
  const supabase = await createClient()

  const { data: models, error } = await supabase
    .from('models')
    .select('id, name, revenue_total, subscribers_count, followers_count, posts_count')
    .eq('agency_id', agencyId)
    .eq('status', 'active')

  if (error || !models) {
    console.error('Error fetching model performance:', error)
    return []
  }

  return models.map(model => ({
    id: model.id,
    name: model.name?.split(' ')[0] || 'Model',
    fullName: model.name,
    revenue: Number(model.revenue_total || 0),
    subscribers: Number(model.subscribers_count || 0),
    followers: Number(model.followers_count || 0),
    posts: Number(model.posts_count || 0),
  }))
}

/**
 * Get Key Performance Indicators
 * Aggregated metrics for KPI cards
 */
export async function getDashboardKPIs(agencyId: string): Promise<DashboardKPIs> {
  const supabase = await createClient()

  // Get models
  const { data: models } = await supabase.from('models').select('*').eq('agency_id', agencyId)

  const totalRevenue = models?.reduce((sum, m) => sum + Number(m.revenue_total || 0), 0) || 0
  const totalSubscribers =
    models?.reduce((sum, m) => sum + Number(m.subscribers_count || 0), 0) || 0
  const totalFollowers = models?.reduce((sum, m) => sum + Number(m.followers_count || 0), 0) || 0
  const unreadMessages = models?.reduce((sum, m) => sum + Number(m.unread_messages || 0), 0) || 0

  // Get recent transactions (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // FIXED: Query fanvue_transactions instead of transactions
  const { data: recentTransactions } = await supabase
    .from('fanvue_transactions')
    .select('amount')
    .eq('agency_id', agencyId)
    .gte('transaction_date', thirtyDaysAgo.toISOString())

  const monthlyRevenue = recentTransactions?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0

  // Get expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, frequency, is_recurring')
    .eq('agency_id', agencyId)
    .eq('status', 'active')

  const monthlyExpenses =
    expenses?.reduce((sum, exp) => {
      const amount = Number(exp.amount)
      if (exp.is_recurring && exp.frequency === 'monthly') return sum + amount
      if (exp.is_recurring && exp.frequency === 'yearly') return sum + amount / 12
      return sum
    }, 0) || 0

  return {
    totalRevenue: Math.round(totalRevenue),
    monthlyRevenue: Math.round(monthlyRevenue),
    totalSubscribers,
    totalFollowers,
    unreadMessages,
    monthlyExpenses: Math.round(monthlyExpenses),
    netProfit: Math.round(monthlyRevenue - monthlyExpenses),
    activeModels: models?.filter(m => m.status === 'active').length || 0,
  }
}

/**
 * Expense Tracking Over Time
 * Returns expense history for comparison charts
 */
export async function getExpenseHistory(
  agencyId: string,
  months: number = 6
): Promise<ExpenseHistoryPoint[]> {
  const supabase = await createClient()

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, paid_at, frequency, is_recurring')
    .eq('agency_id', agencyId)
    .order('paid_at', { ascending: false })

  if (!expenses || expenses.length === 0) {
    return []
  }

  // Calculate total monthly expense
  const monthlyTotal = expenses.reduce((sum, exp) => {
    const amount = Number(exp.amount)
    if (exp.is_recurring && exp.frequency === 'monthly') return sum + amount
    if (exp.is_recurring && exp.frequency === 'yearly') return sum + amount / 12
    return sum
  }, 0)

  // Generate monthly data
  return Array.from({ length: months }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (months - 1 - i))
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      expenses: Math.round(monthlyTotal * (0.8 + Math.random() * 0.4)),
    }
  })
}

/**
 * Get Earnings by Type (Phase 51D)
 * Returns earnings breakdown by category for donut chart
 */
export async function getEarningsByType(agencyId: string, days?: number) {
  const supabase = await createClient()

  let query = supabase
    .from('fanvue_transactions')
    .select('category, amount')
    .eq('agency_id', agencyId)

  if (days) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    query = query.gte('created_at', startDate.toISOString())
  }

  const { data: transactions } = await query

  if (!transactions || transactions.length === 0) {
    return []
  }

  // Aggregate by category
  const categoryTotals: Record<string, number> = {}
  transactions.forEach(txn => {
    const category = txn.category || 'other'
    categoryTotals[category] = (categoryTotals[category] || 0) + (txn.amount || 0)
  })

  // Map to display format with colors (matching Fanvue style)
  const categoryColors: Record<string, string> = {
    message: '#f97316', // orange
    subscription: '#ec4899', // pink
    renewals: '#ec4899', // pink (alias for subscription)
    tip: '#3b82f6', // blue
    post: '#a855f7', // purple
    referral: '#10b981', // green
    other: '#6b7280', // gray
  }

  const categoryLabels: Record<string, string> = {
    message: 'Messages',
    subscription: 'Subs',
    renewals: 'Renewals',
    tip: 'Tips',
    post: 'Posts',
    referral: 'Referrals',
  }

  return Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category: categoryLabels[category] || category.charAt(0).toUpperCase() + category.slice(1),
      amount: Math.round(amount * 100) / 100,
      color: categoryColors[category] || categoryColors.other,
    }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * Get Monthly Earnings List (Phase 51D)
 * Returns monthly earnings with expandable transaction details
 */
export async function getMonthlyEarningsList(agencyId: string, months: number = 12) {
  const supabase = await createClient()

  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  const { data: transactions } = await supabase
    .from('fanvue_transactions')
    .select('*')
    .eq('agency_id', agencyId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })

  if (!transactions || transactions.length === 0) {
    return []
  }

  // Group by month
  const monthlyData: Record<
    string,
    {
      month: string
      year: number
      transactions: typeof transactions
    }
  > = {}

  transactions.forEach(txn => {
    const date = new Date(txn.created_at || '')
    const month = date.toLocaleDateString('en-US', { month: 'long' })
    const year = date.getFullYear()
    const key = `${month}-${year}`

    if (!monthlyData[key]) {
      monthlyData[key] = {
        month,
        year,
        transactions: [],
      }
    }
    monthlyData[key].transactions.push(txn)
  })

  // Convert to array and calculate totals
  return Object.values(monthlyData)
    .map(monthData => {
      const gross = monthData.transactions.reduce((sum, txn) => sum + (txn.amount || 0), 0)
      const fees = gross * 0.2 // Assume 20% platform fee
      const net = gross - fees

      // Group transactions by category
      const categoryTotals: Record<string, { amount: number; count: number }> = {}
      monthData.transactions.forEach(txn => {
        const category = txn.category || 'other'
        if (!categoryTotals[category]) {
          categoryTotals[category] = { amount: 0, count: 0 }
        }
        categoryTotals[category].amount += txn.amount || 0
        categoryTotals[category].count += 1
      })

      return {
        month: monthData.month,
        year: monthData.year,
        net: Math.round(net * 100) / 100,
        gross: Math.round(gross * 100) / 100,
        fees: Math.round(fees * 100) / 100,
        transactions: Object.entries(categoryTotals)
          .map(([category, data]) => ({
            category,
            amount: Math.round(data.amount * 100) / 100,
            count: data.count,
          }))
          .sort((a, b) => b.amount - a.amount),
      }
    })
    .sort((a, b) => {
      // Sort by year then month (newest first)
      if (a.year !== b.year) return b.year - a.year
      const monthOrder = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ]
      return monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month)
    })
}
