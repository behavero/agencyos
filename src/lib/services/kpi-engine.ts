import { createAdminClient } from '@/lib/supabase/server'

/**
 * KPI Engine - Advanced Business Intelligence Metrics
 * 
 * Calculates conversion ratios, funnels, and actionable insights
 * for agency performance tracking.
 */

export interface AgencyKPIs {
  // Core Metrics
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  profitMargin: number

  // Instagram Conversion Funnel
  metaReach: number
  metaProfileViews: number
  metaWebsiteClicks: number
  igConversionRate: number  // followers gained / profile views
  bioCTR: number            // website clicks / profile views

  // Fanvue Conversion Funnel
  trackingLinkClicks: number
  newSubscribers: number
  activeSubscribers: number
  fanConversionRate: number // new subs / tracking link clicks

  // Revenue Metrics
  arpu: number              // avg revenue per user
  ltv: number               // lifetime value estimate
  churnRate: number         // lost subs / total subs

  // Ghost Network
  slaveReach: number
  totalEmpireReach: number
  ghostTrafficShare: number // slave reach / total reach

  // Trends (vs previous period)
  trends: {
    revenueChange: number
    conversionChange: number
    ctrChange: number
    subscriberChange: number
  }

  // Health Scores (0-100)
  healthScores: {
    overall: number
    conversion: number
    engagement: number
    revenue: number
  }

  // Actionable Insights
  insights: Insight[]

  // Raw data for charts
  funnelData: FunnelStep[]
}

export interface Insight {
  type: 'critical' | 'warning' | 'success' | 'info'
  title: string
  description: string
  action?: string
  metric?: string
  value?: number
}

export interface FunnelStep {
  name: string
  value: number
  percentage: number
  dropOff: number
}

/**
 * Calculate comprehensive KPIs for an agency
 */
export async function calculateAgencyKPIs(
  agencyId: string,
  dateRange: 'today' | '7d' | '30d' | '90d' = '30d'
): Promise<AgencyKPIs> {
  const supabase = await createAdminClient()

  // Calculate date ranges
  const now = new Date()
  const daysMap = { today: 1, '7d': 7, '30d': 30, '90d': 90 }
  const days = daysMap[dateRange]
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const previousStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000)

  // Fetch all required data in parallel
  const [
    modelsResult,
    expensesResult,
    socialStatsResult,
    watchedAccountsResult,
    previousSocialStatsResult,
  ] = await Promise.all([
    // Models with revenue
    supabase
      .from('models')
      .select('id, name, total_revenue, subscribers_count, followers_count, tracking_links_count')
      .eq('agency_id', agencyId),

    // Expenses in period
    supabase
      .from('expenses')
      .select('amount')
      .eq('agency_id', agencyId)
      .gte('date', startDate.toISOString().split('T')[0]),

    // Social stats (current period)
    supabase
      .from('social_stats')
      .select('platform, followers, views, likes, comments, shares, date')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false }),

    // Watched accounts (Ghost Network)
    supabase
      .from('watched_accounts')
      .select('account_type, last_stats')
      .eq('agency_id', agencyId)
      .eq('is_active', true),

    // Previous period social stats
    supabase
      .from('social_stats')
      .select('platform, followers, views, likes, comments, shares')
      .gte('date', previousStartDate.toISOString().split('T')[0])
      .lt('date', startDate.toISOString().split('T')[0]),
  ])

  const models = modelsResult.data || []
  const expenses = expensesResult.data || []
  const socialStats = socialStatsResult.data || []
  const watchedAccounts = watchedAccountsResult.data || []
  const previousSocialStats = previousSocialStatsResult.data || []

  // Calculate core financial metrics
  const totalRevenue = models.reduce((sum, m) => sum + (m.total_revenue || 0), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  // Calculate Instagram metrics
  const igStats = socialStats.filter(s => s.platform === 'instagram')
  const metaReach = igStats.reduce((sum, s) => sum + (s.likes || 0), 0) // Using likes as reach proxy
  const metaProfileViews = igStats.reduce((sum, s) => sum + (s.comments || 0), 0) // Using comments as profile views proxy
  const metaWebsiteClicks = igStats.reduce((sum, s) => sum + (s.shares || 0), 0) // Using shares as clicks proxy
  const metaFollowersGained = igStats.length > 1 
    ? (igStats[0]?.followers || 0) - (igStats[igStats.length - 1]?.followers || 0)
    : 0

  // Calculate conversion rates
  const igConversionRate = metaProfileViews > 0 
    ? (metaFollowersGained / metaProfileViews) * 100 
    : 0
  const bioCTR = metaProfileViews > 0 
    ? (metaWebsiteClicks / metaProfileViews) * 100 
    : 0

  // Calculate Fanvue metrics
  const activeSubscribers = models.reduce((sum, m) => sum + (m.subscribers_count || 0), 0)
  const trackingLinkClicks = models.reduce((sum, m) => sum + ((m.tracking_links_count || 0) * 10), 0) // Estimate
  const newSubscribers = Math.round(activeSubscribers * 0.15) // Estimate 15% new this period

  const fanConversionRate = trackingLinkClicks > 0 
    ? (newSubscribers / trackingLinkClicks) * 100 
    : 0

  // Calculate revenue metrics
  const arpu = activeSubscribers > 0 ? totalRevenue / activeSubscribers : 0
  const ltv = arpu * 4 // Estimate 4 month average lifetime
  const churnRate = 5 // Default 5% monthly churn estimate

  // Calculate Ghost Network metrics
  const slaveAccounts = watchedAccounts.filter(a => a.account_type === 'slave')
  const slaveReach = slaveAccounts.reduce((sum, a) => {
    const stats = a.last_stats as { followers?: number } | null
    return sum + (stats?.followers || 0)
  }, 0)
  const mainAccountReach = models.reduce((sum, m) => sum + (m.followers_count || 0), 0)
  const totalEmpireReach = slaveReach + mainAccountReach
  const ghostTrafficShare = totalEmpireReach > 0 
    ? (slaveReach / totalEmpireReach) * 100 
    : 0

  // Calculate trends (vs previous period)
  const previousRevenue = totalRevenue * 0.9 // Placeholder
  const previousIgStats = previousSocialStats.filter(s => s.platform === 'instagram')
  const previousProfileViews = previousIgStats.reduce((sum, s) => sum + (s.comments || 0), 0)
  const previousClicks = previousIgStats.reduce((sum, s) => sum + (s.shares || 0), 0)
  const previousCTR = previousProfileViews > 0 ? (previousClicks / previousProfileViews) * 100 : 0

  const trends = {
    revenueChange: previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0,
    conversionChange: igConversionRate - (igConversionRate * 0.9), // Placeholder
    ctrChange: bioCTR - previousCTR,
    subscriberChange: newSubscribers - Math.round(newSubscribers * 0.85),
  }

  // Calculate health scores
  const healthScores = calculateHealthScores({
    profitMargin,
    igConversionRate,
    bioCTR,
    fanConversionRate,
    churnRate,
  })

  // Generate actionable insights
  const insights = generateInsights({
    igConversionRate,
    bioCTR,
    fanConversionRate,
    profitMargin,
    churnRate,
    ghostTrafficShare,
    trends,
  })

  // Build funnel data
  const funnelData = buildFunnelData({
    reach: metaReach || 100000, // Default for visualization
    views: metaProfileViews || 5000,
    clicks: metaWebsiteClicks || 500,
    subscribers: newSubscribers || 50,
  })

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMargin,
    metaReach,
    metaProfileViews,
    metaWebsiteClicks,
    igConversionRate,
    bioCTR,
    trackingLinkClicks,
    newSubscribers,
    activeSubscribers,
    fanConversionRate,
    arpu,
    ltv,
    churnRate,
    slaveReach,
    totalEmpireReach,
    ghostTrafficShare,
    trends,
    healthScores,
    insights,
    funnelData,
  }
}

/**
 * Calculate health scores (0-100)
 */
function calculateHealthScores(metrics: {
  profitMargin: number
  igConversionRate: number
  bioCTR: number
  fanConversionRate: number
  churnRate: number
}): AgencyKPIs['healthScores'] {
  // Conversion health (target: 3%+)
  const conversionScore = Math.min(100, (metrics.igConversionRate / 3) * 100)

  // Engagement health (target: 10%+ CTR)
  const engagementScore = Math.min(100, (metrics.bioCTR / 10) * 100)

  // Revenue health (target: 30%+ margin)
  const revenueScore = Math.min(100, (metrics.profitMargin / 30) * 100)

  // Overall health (weighted average)
  const overall = (conversionScore * 0.3) + (engagementScore * 0.3) + (revenueScore * 0.4)

  return {
    overall: Math.round(overall),
    conversion: Math.round(conversionScore),
    engagement: Math.round(engagementScore),
    revenue: Math.round(revenueScore),
  }
}

/**
 * Generate actionable insights based on metrics
 */
function generateInsights(data: {
  igConversionRate: number
  bioCTR: number
  fanConversionRate: number
  profitMargin: number
  churnRate: number
  ghostTrafficShare: number
  trends: AgencyKPIs['trends']
}): Insight[] {
  const insights: Insight[] = []

  // Bio CTR Alert
  if (data.bioCTR < 5) {
    insights.push({
      type: 'critical',
      title: 'Bio CTR Critical',
      description: `Your bio click-through rate is only ${data.bioCTR.toFixed(1)}%. Traffic is reaching your profile but nobody is clicking the link.`,
      action: 'Audit your bio. Update CTA and link (Linktree/Beacons).',
      metric: 'bioCTR',
      value: data.bioCTR,
    })
  } else if (data.bioCTR < 10) {
    insights.push({
      type: 'warning',
      title: 'Bio CTR Below Average',
      description: `Bio CTR at ${data.bioCTR.toFixed(1)}% is below the 10% target.`,
      action: 'Test different CTAs and link placements.',
      metric: 'bioCTR',
      value: data.bioCTR,
    })
  }

  // Conversion Rate Alert
  if (data.igConversionRate < 2) {
    insights.push({
      type: 'warning',
      title: 'Low Profile Conversion',
      description: `Only ${data.igConversionRate.toFixed(1)}% of profile visitors are following.`,
      action: 'Improve profile aesthetics, bio copy, and content quality.',
      metric: 'igConversionRate',
      value: data.igConversionRate,
    })
  }

  // Fan Conversion Alert
  if (data.fanConversionRate < 5) {
    insights.push({
      type: 'warning',
      title: 'Low Funnel Conversion',
      description: `Only ${data.fanConversionRate.toFixed(1)}% of link clicks convert to subscribers.`,
      action: 'Review Fanvue profile, pricing, and teaser content.',
      metric: 'fanConversionRate',
      value: data.fanConversionRate,
    })
  }

  // Profit Margin Alert
  if (data.profitMargin < 20) {
    insights.push({
      type: 'critical',
      title: 'Low Profit Margin',
      description: `Profit margin at ${data.profitMargin.toFixed(1)}% is concerning.`,
      action: 'Review expenses, increase prices, or reduce costs.',
      metric: 'profitMargin',
      value: data.profitMargin,
    })
  }

  // Ghost Network Opportunity
  if (data.ghostTrafficShare < 30) {
    insights.push({
      type: 'info',
      title: 'Expand Ghost Network',
      description: `Slave accounts only drive ${data.ghostTrafficShare.toFixed(1)}% of total reach.`,
      action: 'Add more slave accounts to diversify traffic sources.',
      metric: 'ghostTrafficShare',
      value: data.ghostTrafficShare,
    })
  }

  // Revenue Trend
  if (data.trends.revenueChange < -10) {
    insights.push({
      type: 'critical',
      title: 'Revenue Declining',
      description: `Revenue is down ${Math.abs(data.trends.revenueChange).toFixed(1)}% vs last period.`,
      action: 'Investigate churn, engagement drop, or market changes.',
      metric: 'revenueChange',
      value: data.trends.revenueChange,
    })
  } else if (data.trends.revenueChange > 10) {
    insights.push({
      type: 'success',
      title: 'Revenue Growing',
      description: `Revenue is up ${data.trends.revenueChange.toFixed(1)}% vs last period.`,
      action: 'Identify and double down on winning strategies.',
      metric: 'revenueChange',
      value: data.trends.revenueChange,
    })
  }

  // Default positive if nothing critical
  if (insights.filter(i => i.type === 'critical' || i.type === 'warning').length === 0) {
    insights.push({
      type: 'success',
      title: 'Agency Health Good',
      description: 'All key metrics are within healthy ranges.',
      action: 'Continue current strategy and monitor for changes.',
    })
  }

  return insights
}

/**
 * Build funnel visualization data
 */
function buildFunnelData(data: {
  reach: number
  views: number
  clicks: number
  subscribers: number
}): FunnelStep[] {
  const steps = [
    { name: 'Reach', value: data.reach },
    { name: 'Profile Views', value: data.views },
    { name: 'Link Clicks', value: data.clicks },
    { name: 'New Subscribers', value: data.subscribers },
  ]

  return steps.map((step, index) => {
    const previousValue = index > 0 ? steps[index - 1].value : step.value
    const dropOff = index > 0 && previousValue > 0
      ? ((previousValue - step.value) / previousValue) * 100
      : 0
    const percentage = data.reach > 0 ? (step.value / data.reach) * 100 : 0

    return {
      name: step.name,
      value: step.value,
      percentage,
      dropOff,
    }
  })
}

/**
 * Get KPI comparison between two periods
 */
export async function compareKPIs(
  agencyId: string,
  currentPeriod: '7d' | '30d' | '90d',
  previousPeriod: '7d' | '30d' | '90d'
): Promise<{
  current: AgencyKPIs
  previous: AgencyKPIs
  changes: Record<string, number>
}> {
  const [current, previous] = await Promise.all([
    calculateAgencyKPIs(agencyId, currentPeriod),
    calculateAgencyKPIs(agencyId, previousPeriod),
  ])

  const changes = {
    revenue: calculateChange(current.totalRevenue, previous.totalRevenue),
    profit: calculateChange(current.netProfit, previous.netProfit),
    igConversion: calculateChange(current.igConversionRate, previous.igConversionRate),
    bioCTR: calculateChange(current.bioCTR, previous.bioCTR),
    fanConversion: calculateChange(current.fanConversionRate, previous.fanConversionRate),
    subscribers: calculateChange(current.activeSubscribers, previous.activeSubscribers),
  }

  return { current, previous, changes }
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}
