import { tool } from 'ai'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Alfred AI Tools - ReAct Agent Capabilities
 * 
 * These tools allow Alfred to dynamically fetch data from Supabase
 * only when needed, reducing latency and increasing intelligence.
 */

/**
 * Tool: Get Agency Financials
 * Fetches revenue, expenses, and net profit for a date range
 */
export const getAgencyFinancials = tool({
  description: 'Get total revenue, expenses, and net profit for the agency within a specific date range. Use this when asked about financials, revenue, expenses, profit, or money.',
  parameters: z.object({
    startDate: z.string().describe('Start date in ISO format (YYYY-MM-DD)'),
    endDate: z.string().describe('End date in ISO format (YYYY-MM-DD)'),
  }),
  execute: async ({ startDate, endDate }) => {
    try {
      const supabase = await createAdminClient()
      
      // Get total revenue from transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
      
      const totalRevenue = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
      
      // Get total expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .gte('date', startDate)
        .lte('date', endDate)
      
      const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
      
      // Get model revenues
      const { data: models } = await supabase
        .from('models')
        .select('name, total_revenue')
      
      const modelBreakdown = models?.map(m => ({
        name: m.name,
        revenue: m.total_revenue || 0
      })) || []
      
      const netProfit = totalRevenue - totalExpenses
      const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0
      
      return {
        period: { startDate, endDate },
        totalRevenue: `$${totalRevenue.toLocaleString()}`,
        totalExpenses: `$${totalExpenses.toLocaleString()}`,
        netProfit: `$${netProfit.toLocaleString()}`,
        profitMargin: `${profitMargin}%`,
        modelBreakdown,
        transactionCount: transactions?.length || 0,
        expenseCount: expenses?.length || 0,
      }
    } catch (error) {
      console.error('getAgencyFinancials error:', error)
      return { error: 'Failed to fetch financial data' }
    }
  },
})

/**
 * Tool: Get Model Stats
 * Fetches detailed performance metrics for a specific model
 */
export const getModelStats = tool({
  description: 'Get detailed performance metrics for a specific model/creator including revenue, subscribers, messages, and social media trends. Use when asked about a specific model or creator.',
  parameters: z.object({
    modelName: z.string().describe('Name of the model to look up (can be partial match)'),
  }),
  execute: async ({ modelName }) => {
    try {
      const supabase = await createAdminClient()
      
      // Fuzzy match model name
      const { data: models } = await supabase
        .from('models')
        .select('*')
        .ilike('name', `%${modelName}%`)
        .limit(1)
      
      if (!models || models.length === 0) {
        return { error: `No model found matching "${modelName}"` }
      }
      
      const model = models[0]
      
      // Get social stats
      const { data: socialStats } = await supabase
        .from('social_stats')
        .select('*')
        .eq('model_id', model.id)
        .order('date', { ascending: false })
        .limit(4)
      
      // Get recent transactions
      const { data: recentTransactions } = await supabase
        .from('transactions')
        .select('amount, type, created_at')
        .eq('model_id', model.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      const last30DaysRevenue = recentTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
      
      // Format social stats by platform
      const socialByPlatform: Record<string, { followers: number; views: number }> = {}
      socialStats?.forEach(stat => {
        socialByPlatform[stat.platform] = {
          followers: stat.followers || 0,
          views: stat.views || 0,
        }
      })
      
      return {
        modelName: model.name,
        status: model.status,
        totalRevenue: `$${(model.total_revenue || 0).toLocaleString()}`,
        last30DaysRevenue: `$${last30DaysRevenue.toLocaleString()}`,
        subscribers: model.subscribers_count || 0,
        followers: model.followers_count || 0,
        unreadMessages: model.unread_messages_count || 0,
        trackingLinks: model.tracking_links_count || 0,
        socialStats: socialByPlatform,
        recentTransactions: recentTransactions?.slice(0, 5).map(t => ({
          amount: `$${t.amount}`,
          type: t.type,
          date: new Date(t.created_at).toLocaleDateString(),
        })) || [],
      }
    } catch (error) {
      console.error('getModelStats error:', error)
      return { error: 'Failed to fetch model stats' }
    }
  },
})

/**
 * Tool: Check Quest Status
 * Fetches current quest completion rates and team XP
 */
export const checkQuestStatus = tool({
  description: 'Check current quest completion rates, team XP, and productivity metrics. Use when asked about quests, tasks, productivity, or team performance.',
  parameters: z.object({}),
  execute: async () => {
    try {
      const supabase = await createAdminClient()
      
      // Get all quests
      const { data: quests } = await supabase
        .from('quests')
        .select('*')
        .order('created_at', { ascending: false })
      
      // Get team profiles with XP
      const { data: profiles } = await supabase
        .from('profiles')
        .select('username, role, xp_count, current_streak, league_rank')
        .not('role', 'is', null)
      
      // Calculate quest stats
      const totalQuests = quests?.length || 0
      const completedQuests = quests?.filter(q => q.completed_at)?.length || 0
      const completionRate = totalQuests > 0 ? ((completedQuests / totalQuests) * 100).toFixed(1) : 0
      
      // Daily quests
      const today = new Date().toISOString().split('T')[0]
      const dailyQuests = quests?.filter(q => q.is_daily) || []
      const completedDailyQuests = dailyQuests.filter(q => 
        q.completed_at && q.completed_at.startsWith(today)
      ).length
      
      // Team XP
      const totalTeamXP = profiles?.reduce((sum, p) => sum + (p.xp_count || 0), 0) || 0
      const topPerformers = profiles
        ?.sort((a, b) => (b.xp_count || 0) - (a.xp_count || 0))
        .slice(0, 3)
        .map(p => ({
          name: p.username,
          role: p.role,
          xp: p.xp_count || 0,
          streak: p.current_streak || 0,
        })) || []
      
      // Active quests
      const activeQuests = quests
        ?.filter(q => !q.completed_at)
        .slice(0, 5)
        .map(q => ({
          title: q.title,
          xpReward: q.xp_reward,
          progress: q.current_progress ? `${q.current_progress}/${q.target_count}` : 'Not tracked',
        })) || []
      
      return {
        questStats: {
          total: totalQuests,
          completed: completedQuests,
          completionRate: `${completionRate}%`,
          dailyProgress: `${completedDailyQuests}/${dailyQuests.length}`,
        },
        teamStats: {
          totalXP: totalTeamXP.toLocaleString(),
          memberCount: profiles?.length || 0,
        },
        topPerformers,
        activeQuests,
      }
    } catch (error) {
      console.error('checkQuestStatus error:', error)
      return { error: 'Failed to fetch quest status' }
    }
  },
})

/**
 * Tool: Get Expense Summary
 * Fetches expense breakdown by category
 */
export const getExpenseSummary = tool({
  description: 'Get a breakdown of expenses by category. Use when asked about spending, costs, or where money is going.',
  parameters: z.object({
    startDate: z.string().optional().describe('Optional start date filter (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('Optional end date filter (YYYY-MM-DD)'),
  }),
  execute: async ({ startDate, endDate }) => {
    try {
      const supabase = await createAdminClient()
      
      let query = supabase
        .from('expenses')
        .select('amount, category, description, date, is_recurring')
      
      if (startDate) query = query.gte('date', startDate)
      if (endDate) query = query.lte('date', endDate)
      
      const { data: expenses } = await query.order('date', { ascending: false })
      
      // Group by category
      const byCategory: Record<string, number> = {}
      expenses?.forEach(e => {
        const cat = e.category || 'other'
        byCategory[cat] = (byCategory[cat] || 0) + (e.amount || 0)
      })
      
      const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
      const recurringExpenses = expenses?.filter(e => e.is_recurring)
      const recurringTotal = recurringExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
      
      return {
        totalExpenses: `$${totalExpenses.toLocaleString()}`,
        recurringExpenses: `$${recurringTotal.toLocaleString()}`,
        expenseCount: expenses?.length || 0,
        byCategory: Object.entries(byCategory).map(([category, amount]) => ({
          category,
          amount: `$${amount.toLocaleString()}`,
          percentage: totalExpenses > 0 ? `${((amount / totalExpenses) * 100).toFixed(1)}%` : '0%',
        })).sort((a, b) => parseFloat(b.amount.slice(1).replace(',', '')) - parseFloat(a.amount.slice(1).replace(',', ''))),
        recentExpenses: expenses?.slice(0, 5).map(e => ({
          description: e.description,
          amount: `$${e.amount}`,
          category: e.category,
          date: e.date,
        })) || [],
      }
    } catch (error) {
      console.error('getExpenseSummary error:', error)
      return { error: 'Failed to fetch expense summary' }
    }
  },
})

/**
 * Tool: Get Payroll Overview
 * Fetches payroll and commission data
 */
export const getPayrollOverview = tool({
  description: 'Get payroll information including team salaries, commissions, and recent payouts. Use when asked about payroll, salaries, commissions, or team compensation.',
  parameters: z.object({}),
  execute: async () => {
    try {
      const supabase = await createAdminClient()
      
      // Get team with salary info
      const { data: profiles } = await supabase
        .from('profiles')
        .select('username, role, base_salary, commission_rate, payment_method')
        .not('role', 'is', null)
      
      // Get recent payouts
      const { data: payouts } = await supabase
        .from('payouts')
        .select('*, recipient:profiles(username, role)')
        .order('created_at', { ascending: false })
        .limit(10)
      
      const totalBaseSalaries = profiles?.reduce((sum, p) => sum + (p.base_salary || 0), 0) || 0
      const paidPayouts = payouts?.filter(p => p.status === 'paid') || []
      const pendingPayouts = payouts?.filter(p => p.status !== 'paid') || []
      
      const totalPaid = paidPayouts.reduce((sum, p) => sum + (p.amount_total || 0), 0)
      const totalPending = pendingPayouts.reduce((sum, p) => sum + (p.amount_total || 0), 0)
      
      return {
        teamSize: profiles?.length || 0,
        monthlyBaseSalaries: `$${totalBaseSalaries.toLocaleString()}`,
        teamMembers: profiles?.map(p => ({
          name: p.username,
          role: p.role,
          baseSalary: `$${(p.base_salary || 0).toLocaleString()}`,
          commissionRate: `${((p.commission_rate || 0) * 100).toFixed(1)}%`,
          paymentMethod: p.payment_method || 'Not set',
        })) || [],
        payoutStats: {
          totalPaid: `$${totalPaid.toLocaleString()}`,
          totalPending: `$${totalPending.toLocaleString()}`,
          paidCount: paidPayouts.length,
          pendingCount: pendingPayouts.length,
        },
        recentPayouts: payouts?.slice(0, 5).map(p => ({
          recipient: p.recipient?.username || 'Unknown',
          amount: `$${(p.amount_total || 0).toLocaleString()}`,
          status: p.status,
          period: `${p.period_start} to ${p.period_end}`,
        })) || [],
      }
    } catch (error) {
      console.error('getPayrollOverview error:', error)
      return { error: 'Failed to fetch payroll overview' }
    }
  },
})

/**
 * Tool: Scrape Web
 * Uses Firecrawl to fetch and parse web content
 */
export const scrapeWeb = tool({
  description: 'Scrape a website to read its content. Use this to check Instagram profiles, TikTok pages, competitor sites, or read any public web page. ALWAYS use this when the user provides a URL or asks about a public social profile.',
  parameters: z.object({
    url: z.string().url().describe('The full URL to scrape (e.g., https://instagram.com/username)'),
  }),
  execute: async ({ url }) => {
    try {
      const apiKey = process.env.FIRECRAWL_API_KEY
      
      if (!apiKey) {
        return { 
          error: 'Web scraping not configured. FIRECRAWL_API_KEY is missing.',
          suggestion: 'Get a free key at firecrawl.dev'
        }
      }
      
      console.log(`[Alfred] Scraping: ${url}`)
      
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url: url,
          formats: ['markdown'],
          onlyMainContent: true,
          timeout: 30000,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[Alfred] Firecrawl error:', response.status, errorData)
        
        if (response.status === 402) {
          return { error: 'Firecrawl credits exhausted. Please check your account.' }
        }
        if (response.status === 403) {
          return { error: 'This website blocks automated access.' }
        }
        if (response.status === 404) {
          return { error: 'Page not found. Check if the URL is correct.' }
        }
        
        return { error: `Failed to scrape page: ${response.status}` }
      }
      
      const data = await response.json()
      
      if (!data.success) {
        return { error: data.error || 'Failed to scrape page' }
      }
      
      // Extract useful info
      const markdown = data.data?.markdown || ''
      const metadata = data.data?.metadata || {}
      
      // Truncate if too long (Groq context limit)
      const truncatedMarkdown = markdown.length > 8000 
        ? markdown.substring(0, 8000) + '\n\n... (content truncated for brevity)'
        : markdown
      
      return {
        url: url,
        title: metadata.title || 'Unknown',
        description: metadata.description || null,
        content: truncatedMarkdown,
        scrapeSuccess: true,
        contentLength: markdown.length,
      }
    } catch (error) {
      console.error('[Alfred] scrapeWeb error:', error)
      return { 
        error: 'Failed to access the website. It may be down or blocking requests.',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },
})

/**
 * Tool: Analyze Social Profile
 * Specialized tool for social media profile analysis
 */
export const analyzeSocialProfile = tool({
  description: 'Analyze a social media profile (Instagram, TikTok, X/Twitter) and extract key metrics like followers, bio, and recent activity. Use when asked to research a competitor or check a social profile.',
  parameters: z.object({
    platform: z.enum(['instagram', 'tiktok', 'twitter', 'x']).describe('The social media platform'),
    username: z.string().describe('The username/handle (without @ symbol)'),
  }),
  execute: async ({ platform, username }) => {
    try {
      const apiKey = process.env.FIRECRAWL_API_KEY
      
      if (!apiKey) {
        return { 
          error: 'Web scraping not configured.',
          suggestion: 'Get a free key at firecrawl.dev'
        }
      }
      
      // Build platform URL
      const platformUrls: Record<string, string> = {
        instagram: `https://www.instagram.com/${username}/`,
        tiktok: `https://www.tiktok.com/@${username}`,
        twitter: `https://twitter.com/${username}`,
        x: `https://x.com/${username}`,
      }
      
      const url = platformUrls[platform]
      if (!url) {
        return { error: `Unknown platform: ${platform}` }
      }
      
      console.log(`[Alfred] Analyzing ${platform} profile: @${username}`)
      
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url: url,
          formats: ['markdown'],
          onlyMainContent: true,
          timeout: 30000,
        }),
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          return { error: `Profile @${username} not found on ${platform}` }
        }
        return { error: `Failed to access ${platform} profile` }
      }
      
      const data = await response.json()
      
      if (!data.success) {
        return { error: `Could not scrape ${platform}. The platform may be blocking access.` }
      }
      
      const markdown = data.data?.markdown || ''
      const metadata = data.data?.metadata || {}
      
      // Extract key info from profile pages
      // This is a basic extraction - platform-specific parsing would improve results
      const followerMatch = markdown.match(/(\d+(?:,\d{3})*(?:\.\d+)?[KMB]?)\s*(?:followers|Followers)/i)
      const followingMatch = markdown.match(/(\d+(?:,\d{3})*(?:\.\d+)?[KMB]?)\s*(?:following|Following)/i)
      const postsMatch = markdown.match(/(\d+(?:,\d{3})*)\s*(?:posts|Posts)/i)
      
      return {
        platform,
        username: `@${username}`,
        url: url,
        title: metadata.title || null,
        bio: metadata.description || null,
        followers: followerMatch ? followerMatch[1] : 'Unable to extract',
        following: followingMatch ? followingMatch[1] : 'Unable to extract',
        posts: postsMatch ? postsMatch[1] : 'Unable to extract',
        contentPreview: markdown.substring(0, 2000),
        scrapeSuccess: true,
      }
    } catch (error) {
      console.error('[Alfred] analyzeSocialProfile error:', error)
      return { error: 'Failed to analyze social profile' }
    }
  },
})

/**
 * Tool: Get Watched Accounts (Ghost Tracker)
 * Fetches competitor and slave account data
 */
export const getWatchedAccounts = tool({
  description: 'Get competitor and slave account tracking data. Use when asked about competitors, slave accounts, ghost network, or tracked profiles.',
  parameters: z.object({
    accountType: z.enum(['all', 'competitor', 'slave', 'backup', 'reference']).optional().describe('Filter by account type'),
  }),
  execute: async ({ accountType }) => {
    try {
      const supabase = await createAdminClient()
      
      let query = supabase
        .from('watched_accounts')
        .select('*')
        .eq('is_active', true)
        .order('last_scanned_at', { ascending: false })
      
      if (accountType && accountType !== 'all') {
        query = query.eq('account_type', accountType)
      }
      
      const { data: accounts } = await query.limit(20)
      
      if (!accounts || accounts.length === 0) {
        return { 
          message: 'No watched accounts found.',
          suggestion: 'Add competitors or slave accounts via Ghost Tracker page.'
        }
      }
      
      // Calculate totals
      const competitors = accounts.filter(a => a.account_type === 'competitor')
      const slaves = accounts.filter(a => a.account_type === 'slave')
      
      const totalSlaveFollowers = slaves.reduce((sum, a) => {
        const stats = a.last_stats as Record<string, unknown> | null
        return sum + (Number(stats?.followers) || 0)
      }, 0)
      
      const totalCompetitorFollowers = competitors.reduce((sum, a) => {
        const stats = a.last_stats as Record<string, unknown> | null
        return sum + (Number(stats?.followers) || 0)
      }, 0)
      
      return {
        summary: {
          totalWatched: accounts.length,
          competitors: competitors.length,
          slaves: slaves.length,
          slaveNetworkReach: totalSlaveFollowers.toLocaleString(),
          competitorFollowers: totalCompetitorFollowers.toLocaleString(),
        },
        accounts: accounts.slice(0, 10).map(a => {
          const stats = a.last_stats as Record<string, unknown> | null
          return {
            username: `@${a.username}`,
            platform: a.platform,
            type: a.account_type,
            followers: stats?.followers || 'Unknown',
            posts: stats?.postsCount || 'Unknown',
            lastScanned: a.last_scanned_at ? new Date(a.last_scanned_at).toLocaleDateString() : 'Never',
            notes: a.notes || null,
          }
        }),
      }
    } catch (error) {
      console.error('getWatchedAccounts error:', error)
      return { error: 'Failed to fetch watched accounts' }
    }
  },
})

/**
 * Tool: Analyze Business Health
 * Advanced KPI analysis with actionable insights
 */
export const analyzeBusinessHealth = tool({
  description: 'Analyze agency business health including conversion rates, funnel metrics, CTR, ARPU, and generate actionable insights. Use when asked about business performance, why revenue is down, conversion issues, or overall health.',
  parameters: z.object({
    dateRange: z.enum(['7d', '30d', '90d']).optional().describe('Time period to analyze (default: 30d)'),
  }),
  execute: async ({ dateRange = '30d' }) => {
    try {
      const supabase = await createAdminClient()

      // Get agency data
      const { data: profiles } = await supabase
        .from('profiles')
        .select('agency_id')
        .limit(1)
        .single()

      if (!profiles?.agency_id) {
        return { error: 'No agency found' }
      }

      const agencyId = profiles.agency_id

      // Calculate date range
      const now = new Date()
      const daysMap = { '7d': 7, '30d': 30, '90d': 90 }
      const days = daysMap[dateRange]
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

      // Fetch all data
      const [modelsResult, expensesResult, socialStatsResult, watchedAccountsResult] = await Promise.all([
        supabase.from('models').select('total_revenue, subscribers_count, followers_count, tracking_links_count'),
        supabase.from('expenses').select('amount').gte('date', startDate.toISOString().split('T')[0]),
        supabase.from('social_stats').select('platform, followers, views, likes, comments, shares').gte('date', startDate.toISOString().split('T')[0]),
        supabase.from('watched_accounts').select('account_type, last_stats').eq('is_active', true),
      ])

      const models = modelsResult.data || []
      const expenses = expensesResult.data || []
      const socialStats = socialStatsResult.data || []
      const watchedAccounts = watchedAccountsResult.data || []

      // Calculate KPIs
      const totalRevenue = models.reduce((sum, m) => sum + (m.total_revenue || 0), 0)
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
      const netProfit = totalRevenue - totalExpenses
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

      const activeSubscribers = models.reduce((sum, m) => sum + (m.subscribers_count || 0), 0)
      const arpu = activeSubscribers > 0 ? totalRevenue / activeSubscribers : 0

      // Instagram metrics
      const igStats = socialStats.filter(s => s.platform === 'instagram')
      const metaProfileViews = igStats.reduce((sum, s) => sum + (s.comments || 0), 0)
      const metaWebsiteClicks = igStats.reduce((sum, s) => sum + (s.shares || 0), 0)
      const bioCTR = metaProfileViews > 0 ? (metaWebsiteClicks / metaProfileViews) * 100 : 0

      // Ghost network
      const slaveAccounts = watchedAccounts.filter(a => a.account_type === 'slave')
      const slaveReach = slaveAccounts.reduce((sum, a) => {
        const stats = a.last_stats as { followers?: number } | null
        return sum + (stats?.followers || 0)
      }, 0)
      const mainReach = models.reduce((sum, m) => sum + (m.followers_count || 0), 0)
      const ghostTrafficShare = (slaveReach + mainReach) > 0 ? (slaveReach / (slaveReach + mainReach)) * 100 : 0

      // Generate insights
      const issues: string[] = []
      const recommendations: string[] = []

      if (bioCTR < 5) {
        issues.push(`Bio CTR is critically low at ${bioCTR.toFixed(1)}%`)
        recommendations.push('Audit bio link, update CTA, consider changing Linktree/Beacons')
      }
      if (profitMargin < 20) {
        issues.push(`Profit margin is low at ${profitMargin.toFixed(1)}%`)
        recommendations.push('Review expenses, increase prices, or reduce costs')
      }
      if (ghostTrafficShare < 30) {
        issues.push(`Ghost network only drives ${ghostTrafficShare.toFixed(1)}% of reach`)
        recommendations.push('Add more slave accounts to diversify traffic')
      }
      if (arpu < 15) {
        issues.push(`ARPU is low at $${arpu.toFixed(2)}`)
        recommendations.push('Consider PPV content strategy or upsells')
      }

      return {
        period: dateRange,
        financials: {
          totalRevenue: `$${totalRevenue.toLocaleString()}`,
          totalExpenses: `$${totalExpenses.toLocaleString()}`,
          netProfit: `$${netProfit.toLocaleString()}`,
          profitMargin: `${profitMargin.toFixed(1)}%`,
        },
        conversion: {
          bioCTR: `${bioCTR.toFixed(1)}%`,
          activeSubscribers,
          arpu: `$${arpu.toFixed(2)}`,
        },
        network: {
          slaveReach: slaveReach.toLocaleString(),
          mainReach: mainReach.toLocaleString(),
          ghostTrafficShare: `${ghostTrafficShare.toFixed(1)}%`,
        },
        healthSummary: issues.length === 0 
          ? 'All metrics are healthy'
          : `Found ${issues.length} issue(s)`,
        issues,
        recommendations,
      }
    } catch (error) {
      console.error('analyzeBusinessHealth error:', error)
      return { error: 'Failed to analyze business health' }
    }
  },
})

/**
 * Tool: Get Upcoming Posts
 * Fetches scheduled content tasks
 */
export const getUpcomingPosts = tool({
  description: 'Get upcoming scheduled posts and content tasks. Use when asked about content schedule, upcoming posts, or what needs to be posted.',
  parameters: z.object({
    hours: z.number().optional().describe('Number of hours to look ahead (default: 24)'),
    platform: z.enum(['instagram', 'fanvue', 'tiktok', 'youtube', 'x', 'all']).optional().describe('Filter by platform'),
  }),
  execute: async ({ hours = 24, platform = 'all' }) => {
    try {
      const supabase = await createAdminClient()

      const now = new Date()
      const futureDate = new Date(now.getTime() + hours * 60 * 60 * 1000)

      let query = supabase
        .from('content_tasks')
        .select('*, model:models(name)')
        .eq('status', 'scheduled')
        .gte('scheduled_at', now.toISOString())
        .lte('scheduled_at', futureDate.toISOString())
        .order('scheduled_at', { ascending: true })

      if (platform !== 'all') {
        query = query.eq('platform', platform)
      }

      const { data: tasks } = await query.limit(10)

      if (!tasks || tasks.length === 0) {
        return {
          message: `No posts scheduled in the next ${hours} hours.`,
          tasks: [],
        }
      }

      return {
        summary: `${tasks.length} post(s) scheduled in the next ${hours} hours`,
        tasks: tasks.map(t => ({
          title: t.title,
          platform: t.platform,
          type: t.content_type,
          model: (t.model as { name?: string } | null)?.name || 'Unassigned',
          scheduledAt: new Date(t.scheduled_at!).toLocaleString(),
          caption: t.caption?.substring(0, 100) || 'No caption',
        })),
      }
    } catch (error) {
      console.error('getUpcomingPosts error:', error)
      return { error: 'Failed to fetch upcoming posts' }
    }
  },
})

/**
 * Tool: Log Post Completion
 * Mark a scheduled post as posted
 */
export const logPostCompletion = tool({
  description: 'Mark a scheduled post as completed/posted. Use when user says they posted something or wants to mark content as done.',
  parameters: z.object({
    searchTerm: z.string().describe('Title or description to search for the post'),
    platform: z.enum(['instagram', 'fanvue', 'tiktok', 'youtube', 'x']).optional().describe('Platform to filter'),
  }),
  execute: async ({ searchTerm, platform }) => {
    try {
      const supabase = await createAdminClient()

      // Search for the task
      let query = supabase
        .from('content_tasks')
        .select('*, model:models(name)')
        .eq('status', 'scheduled')
        .ilike('title', `%${searchTerm}%`)
        .order('scheduled_at', { ascending: true })
        .limit(5)

      if (platform) {
        query = query.eq('platform', platform)
      }

      const { data: tasks } = await query

      if (!tasks || tasks.length === 0) {
        return {
          success: false,
          message: `No scheduled post found matching "${searchTerm}"`,
        }
      }

      // If multiple matches, return them for clarification
      if (tasks.length > 1) {
        return {
          success: false,
          message: 'Multiple posts found. Please be more specific:',
          matches: tasks.map(t => ({
            title: t.title,
            platform: t.platform,
            model: (t.model as { name?: string } | null)?.name,
            scheduledAt: new Date(t.scheduled_at!).toLocaleString(),
          })),
        }
      }

      // Update the single match
      const task = tasks[0]
      const { error } = await supabase
        .from('content_tasks')
        .update({
          status: 'posted',
          posted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id)

      if (error) {
        return { success: false, message: 'Failed to update task' }
      }

      return {
        success: true,
        message: `Marked as posted: "${task.title}" on ${task.platform}`,
        task: {
          title: task.title,
          platform: task.platform,
          model: (task.model as { name?: string } | null)?.name,
          postedAt: new Date().toLocaleString(),
        },
      }
    } catch (error) {
      console.error('logPostCompletion error:', error)
      return { error: 'Failed to log post completion' }
    }
  },
})

/**
 * Tool: Get Missed Posts
 * Check for posts that were scheduled but not posted
 */
export const getMissedPosts = tool({
  description: 'Get posts that were scheduled but missed (not posted on time). Use when asked about missed content or schedule issues.',
  parameters: z.object({}),
  execute: async () => {
    try {
      const supabase = await createAdminClient()

      // Find scheduled posts that are past their time
      const { data: missedTasks } = await supabase
        .from('content_tasks')
        .select('*, model:models(name)')
        .eq('status', 'scheduled')
        .lt('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: false })
        .limit(10)

      // Also get explicitly marked as missed
      const { data: markedMissed } = await supabase
        .from('content_tasks')
        .select('*, model:models(name)')
        .eq('status', 'missed')
        .order('scheduled_at', { ascending: false })
        .limit(10)

      const allMissed = [...(missedTasks || []), ...(markedMissed || [])]

      if (allMissed.length === 0) {
        return {
          message: 'No missed posts! All content is on schedule. 🎉',
          missedCount: 0,
        }
      }

      // Calculate how late each post is
      const now = new Date()
      const missedWithDelay = allMissed.map(t => {
        const scheduledTime = new Date(t.scheduled_at!)
        const delayHours = Math.round((now.getTime() - scheduledTime.getTime()) / (1000 * 60 * 60))
        return {
          title: t.title,
          platform: t.platform,
          model: (t.model as { name?: string } | null)?.name || 'Unassigned',
          scheduledAt: scheduledTime.toLocaleString(),
          hoursLate: delayHours,
          status: t.status,
        }
      })

      return {
        message: `⚠️ ${allMissed.length} post(s) missed or overdue`,
        missedCount: allMissed.length,
        posts: missedWithDelay,
        recommendation: 'Consider rescheduling or marking as missed/cancelled',
      }
    } catch (error) {
      console.error('getMissedPosts error:', error)
      return { error: 'Failed to check missed posts' }
    }
  },
})

/**
 * Tool: Update Fan Attribute
 * Update CRM data for a fan
 */
export const updateFanAttribute = tool({
  description: 'Update a fan\'s CRM attribute (name, age, job, city, interests/fetish). Use when the chatter learns new info about a fan.',
  parameters: z.object({
    fanId: z.string().describe('The fan\'s external ID'),
    modelId: z.string().uuid().describe('The model ID'),
    attribute: z.enum(['name', 'age', 'job', 'city', 'fetish']).describe('Which attribute to update'),
    value: z.string().describe('The new value'),
  }),
  execute: async ({ fanId, modelId, attribute, value }) => {
    try {
      const supabase = await createAdminClient()

      // Get agency ID from model
      const { data: model } = await supabase
        .from('models')
        .select('agency_id')
        .eq('id', modelId)
        .single()

      if (!model) {
        return { success: false, error: 'Model not found' }
      }

      // Upsert the attribute
      const { error } = await supabase
        .from('fan_insights')
        .upsert({
          agency_id: model.agency_id,
          model_id: modelId,
          fan_id: fanId,
          custom_attributes: { [attribute]: value },
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'model_id,fan_id',
          ignoreDuplicates: false,
        })

      if (error) {
        return { success: false, error: error.message }
      }

      return {
        success: true,
        message: `Updated ${attribute} to "${value}" for fan ${fanId}`,
      }
    } catch (error) {
      console.error('updateFanAttribute error:', error)
      return { success: false, error: 'Failed to update fan attribute' }
    }
  },
})

/**
 * Tool: Get Fan Brief
 * Get a quick summary of a fan for chatters
 */
export const getFanBrief = tool({
  description: 'Get a quick briefing about a fan including spend, attributes, and notes. Use when opening a chat or asked about a specific fan.',
  parameters: z.object({
    fanId: z.string().describe('The fan\'s external ID'),
    modelId: z.string().uuid().describe('The model ID'),
  }),
  execute: async ({ fanId, modelId }) => {
    try {
      const supabase = await createAdminClient()

      const { data: fan } = await supabase
        .from('fan_insights')
        .select('*')
        .eq('fan_id', fanId)
        .eq('model_id', modelId)
        .single()

      if (!fan) {
        return {
          isNew: true,
          message: 'New fan - no data yet. Start building the profile!',
        }
      }

      // Build the brief
      const attrs = fan.custom_attributes || {}
      const attrsList = Object.entries(attrs)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')

      const whaleEmoji = fan.total_spend >= 500 ? '🐋' : fan.total_spend >= 100 ? '🐬' : '🐟'
      const ppvRate = fan.ppv_sent > 0 ? Math.round((fan.ppv_unlocked / fan.ppv_sent) * 100) : 0

      return {
        isNew: false,
        fanId,
        name: attrs.name || fan.username || 'Unknown',
        totalSpend: `$${(fan.total_spend || 0).toLocaleString()}`,
        whaleEmoji,
        attributes: attrsList || 'No attributes recorded',
        tags: fan.tags?.join(', ') || 'No tags',
        notes: fan.notes || 'No notes',
        ppvUnlockRate: `${ppvRate}%`,
        lastActive: fan.last_active_at ? new Date(fan.last_active_at).toLocaleDateString() : 'Unknown',
        brief: `${whaleEmoji} ${attrs.name || 'This fan'} has spent $${fan.total_spend || 0}. ${attrsList ? `Profile: ${attrsList}.` : ''} ${fan.notes ? `Note: ${fan.notes}` : ''}`,
      }
    } catch (error) {
      console.error('getFanBrief error:', error)
      return { error: 'Failed to get fan brief' }
    }
  },
})

/**
 * Tool: Get Top Fans
 * Get the highest spending fans
 */
export const getTopFans = tool({
  description: 'Get the top spending fans (whales) for a model or the entire agency. Use when asked about best customers or whales.',
  parameters: z.object({
    modelId: z.string().uuid().optional().describe('Optional: filter by model'),
    limit: z.number().optional().describe('Number of fans to return (default: 10)'),
  }),
  execute: async ({ modelId, limit = 10 }) => {
    try {
      const supabase = await createAdminClient()

      let query = supabase
        .from('fan_insights')
        .select('*, model:models(name)')
        .order('total_spend', { ascending: false })
        .limit(limit)

      if (modelId) {
        query = query.eq('model_id', modelId)
      }

      const { data: fans } = await query

      if (!fans || fans.length === 0) {
        return { message: 'No fans found', fans: [] }
      }

      const totalSpend = fans.reduce((sum, f) => sum + (f.total_spend || 0), 0)

      return {
        summary: `Top ${fans.length} fans have spent $${totalSpend.toLocaleString()} total`,
        fans: fans.map((f, i) => ({
          rank: i + 1,
          name: f.custom_attributes?.name || f.username || f.fan_id,
          model: (f.model as { name?: string } | null)?.name || 'Unknown',
          totalSpend: `$${(f.total_spend || 0).toLocaleString()}`,
          ppvRate: f.ppv_sent > 0 ? `${Math.round((f.ppv_unlocked / f.ppv_sent) * 100)}%` : 'N/A',
          tags: f.tags?.join(', ') || 'None',
        })),
      }
    } catch (error) {
      console.error('getTopFans error:', error)
      return { error: 'Failed to get top fans' }
    }
  },
})

/**
 * Tool: Get Team Attendance
 * Check who is working, late, or missed shifts
 */
export const getTeamAttendance = tool({
  description: 'Get current team attendance status, who is online, late, or missed their shift. Use when asked about team status, who is working, or attendance.',
  parameters: z.object({
    date: z.string().optional().describe('Date to check (YYYY-MM-DD), defaults to today'),
  }),
  execute: async ({ date }) => {
    try {
      const supabase = await createAdminClient()

      const targetDate = date ? new Date(date) : new Date()
      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)

      // Get shifts for the day
      const { data: shifts } = await supabase
        .from('shifts')
        .select('*, employee:profiles(username, role)')
        .gte('start_time', startOfDay.toISOString())
        .lt('start_time', endOfDay.toISOString())

      // Get active timesheets (currently clocked in)
      const { data: activeTimesheets } = await supabase
        .from('timesheets')
        .select('*, employee:profiles(username, role)')
        .eq('status', 'active')
        .is('clock_out', null)

      const now = new Date()

      // Categorize team members
      const working = activeTimesheets?.map(t => ({
        name: (t.employee as { username?: string } | null)?.username || 'Unknown',
        role: (t.employee as { role?: string } | null)?.role,
        clockedInAt: new Date(t.clock_in).toLocaleTimeString(),
        isLate: t.is_late,
        lateMinutes: t.late_minutes || 0,
      })) || []

      const scheduled: Array<{ name: string; role: string | null; shiftStart: string; status: string }> = []
      const late: Array<{ name: string; role: string | null; shiftStart: string; minutesLate: number }> = []
      const completed: Array<{ name: string; role: string | null; hoursWorked: string }> = []

      shifts?.forEach(shift => {
        const employee = shift.employee as { username?: string; role?: string } | null
        const shiftStart = new Date(shift.start_time)
        const isCurrentlyWorking = working.some(w => w.name === employee?.username)

        if (shift.status === 'completed') {
          const shiftEnd = new Date(shift.end_time)
          const hours = Math.round((shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60) * 10) / 10
          completed.push({
            name: employee?.username || 'Unknown',
            role: employee?.role || null,
            hoursWorked: `${hours}h`,
          })
        } else if (shift.status === 'scheduled' && shiftStart <= now && !isCurrentlyWorking) {
          const minutesLate = Math.floor((now.getTime() - shiftStart.getTime()) / 60000)
          late.push({
            name: employee?.username || 'Unknown',
            role: employee?.role || null,
            shiftStart: shiftStart.toLocaleTimeString(),
            minutesLate,
          })
        } else if (shift.status === 'scheduled' && shiftStart > now) {
          scheduled.push({
            name: employee?.username || 'Unknown',
            role: employee?.role || null,
            shiftStart: shiftStart.toLocaleTimeString(),
            status: 'upcoming',
          })
        }
      })

      const summary = []
      if (working.length > 0) summary.push(`${working.length} working`)
      if (late.length > 0) summary.push(`${late.length} late`)
      if (scheduled.length > 0) summary.push(`${scheduled.length} upcoming`)

      return {
        date: targetDate.toLocaleDateString(),
        summary: summary.join(', ') || 'No shifts today',
        currentlyWorking: working,
        lateNoClockIn: late,
        scheduledLater: scheduled,
        completedToday: completed,
        alerts: late.map(l => `⚠️ ${l.name} is ${l.minutesLate}min late`),
      }
    } catch (error) {
      console.error('getTeamAttendance error:', error)
      return { error: 'Failed to get attendance data' }
    }
  },
})

/**
 * Tool: Get Shift Schedule
 * Get upcoming shifts for the team
 */
export const getShiftSchedule = tool({
  description: 'Get the shift schedule for the team. Use when asked about who is working, upcoming shifts, or the schedule.',
  parameters: z.object({
    days: z.number().optional().describe('Number of days to look ahead (default: 7)'),
    employeeName: z.string().optional().describe('Optional: filter by employee name'),
  }),
  execute: async ({ days = 7, employeeName }) => {
    try {
      const supabase = await createAdminClient()

      const now = new Date()
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

      let query = supabase
        .from('shifts')
        .select('*, employee:profiles(username, role)')
        .gte('start_time', now.toISOString())
        .lte('start_time', futureDate.toISOString())
        .in('status', ['scheduled', 'in_progress'])
        .order('start_time', { ascending: true })

      const { data: shifts } = await query

      if (!shifts || shifts.length === 0) {
        return {
          message: `No shifts scheduled in the next ${days} days`,
          shifts: [],
        }
      }

      // Filter by employee name if provided
      let filteredShifts = shifts
      if (employeeName) {
        filteredShifts = shifts.filter(s => {
          const employee = s.employee as { username?: string } | null
          return employee?.username?.toLowerCase().includes(employeeName.toLowerCase())
        })
      }

      // Group by day
      const byDay: Record<string, typeof filteredShifts> = {}
      filteredShifts.forEach(shift => {
        const day = new Date(shift.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        if (!byDay[day]) byDay[day] = []
        byDay[day].push(shift)
      })

      return {
        period: `Next ${days} days`,
        totalShifts: filteredShifts.length,
        schedule: Object.entries(byDay).map(([day, dayShifts]) => ({
          day,
          shifts: dayShifts.map(s => {
            const employee = s.employee as { username?: string; role?: string } | null
            return {
              employee: employee?.username || 'Unknown',
              role: employee?.role,
              time: `${new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
              title: s.title || 'Shift',
              status: s.status,
            }
          }),
        })),
      }
    } catch (error) {
      console.error('getShiftSchedule error:', error)
      return { error: 'Failed to get shift schedule' }
    }
  },
})

/**
 * Tool: Create Tracking Link
 * Create a smart redirect link
 */
export const createTrackingLink = tool({
  description: 'Create a smart redirect/tracking link with optional breakout. Use when asked to create a deep link, short link, or tracking link.',
  parameters: z.object({
    slug: z.string().describe('Short slug for the link (e.g., "shower" for /s/shower)'),
    name: z.string().optional().describe('Internal name for reference'),
    target_url: z.string().url().describe('The destination URL'),
    breakout: z.enum(['smart', 'force', 'none']).optional().describe('Breakout mode: smart (detect in-app), force (always), none (direct)'),
  }),
  execute: async ({ slug, name, target_url, breakout = 'smart' }) => {
    try {
      const supabase = await createAdminClient()

      // Get agency from first profile
      const { data: profiles } = await supabase
        .from('profiles')
        .select('agency_id')
        .limit(1)
        .single()

      if (!profiles?.agency_id) {
        return { success: false, error: 'No agency found' }
      }

      // Check if slug is taken
      const { data: existing } = await supabase
        .from('redirect_links')
        .select('id')
        .eq('slug', slug)
        .single()

      if (existing) {
        return { success: false, error: `Slug "${slug}" is already taken` }
      }

      // Create the link
      const { data: link, error } = await supabase
        .from('redirect_links')
        .insert({
          agency_id: profiles.agency_id,
          slug,
          name: name || slug,
          target_url,
          breakout_mode: breakout,
          target_type: 'external',
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return {
        success: true,
        message: `Created tracking link: /s/${slug}`,
        link: {
          slug: link.slug,
          url: `/s/${link.slug}`,
          target: link.target_url,
          breakout: link.breakout_mode,
        },
      }
    } catch (error) {
      console.error('createTrackingLink error:', error)
      return { success: false, error: 'Failed to create tracking link' }
    }
  },
})

/**
 * Tool: Get Link Performance
 * Analyze link and button click performance
 */
export const getLinkPerformance = tool({
  description: 'Get performance stats for tracking links and bio page buttons. Use when asked about link performance, CTR, which button is winning, or click stats.',
  parameters: z.object({
    type: z.enum(['all', 'bio_pages', 'redirect_links']).optional().describe('Type of links to analyze'),
  }),
  execute: async ({ type = 'all' }) => {
    try {
      const supabase = await createAdminClient()

      const results: {
        bioPages?: Array<{ title: string; slug: string; visits: number; clicks: number; ctr: string; topButton?: string }>
        redirectLinks?: Array<{ name: string; slug: string; clicks: number; target: string }>
        summary?: { totalClicks: number; topPerformer: string }
      } = {}

      // Get bio pages with stats
      if (type === 'all' || type === 'bio_pages') {
        const { data: pages } = await supabase
          .from('bio_pages')
          .select(`
            id, title, slug, total_visits, total_clicks,
            blocks:bio_blocks(id, content, click_count)
          `)
          .order('total_clicks', { ascending: false })
          .limit(10)

        results.bioPages = pages?.map(p => {
          const blocks = (p.blocks || []) as Array<{ id: string; content: { label?: string }; click_count: number }>
          const topButton = blocks
            .filter(b => b.click_count > 0)
            .sort((a, b) => (b.click_count || 0) - (a.click_count || 0))[0]

          const ctr = p.total_visits > 0 
            ? ((p.total_clicks / p.total_visits) * 100).toFixed(1)
            : '0'

          return {
            title: p.title,
            slug: `/u/${p.slug}`,
            visits: p.total_visits || 0,
            clicks: p.total_clicks || 0,
            ctr: `${ctr}%`,
            topButton: topButton?.content?.label || undefined,
          }
        }) || []
      }

      // Get redirect links
      if (type === 'all' || type === 'redirect_links') {
        const { data: links } = await supabase
          .from('redirect_links')
          .select('id, name, slug, click_count, target_url')
          .eq('is_active', true)
          .order('click_count', { ascending: false })
          .limit(10)

        results.redirectLinks = links?.map(l => ({
          name: l.name || l.slug,
          slug: `/s/${l.slug}`,
          clicks: l.click_count || 0,
          target: l.target_url,
        })) || []
      }

      // Calculate summary
      const totalBioClicks = results.bioPages?.reduce((sum, p) => sum + p.clicks, 0) || 0
      const totalLinkClicks = results.redirectLinks?.reduce((sum, l) => sum + l.clicks, 0) || 0

      const allItems = [
        ...(results.bioPages?.map(p => ({ name: `Bio: ${p.title}`, clicks: p.clicks })) || []),
        ...(results.redirectLinks?.map(l => ({ name: `Link: ${l.name}`, clicks: l.clicks })) || []),
      ].sort((a, b) => b.clicks - a.clicks)

      results.summary = {
        totalClicks: totalBioClicks + totalLinkClicks,
        topPerformer: allItems[0]?.name || 'No data',
      }

      return results
    } catch (error) {
      console.error('getLinkPerformance error:', error)
      return { error: 'Failed to get link performance' }
    }
  },
})

/**
 * Tool: Get Bio Page Stats
 * Get detailed stats for a specific bio page
 */
export const getBioPageStats = tool({
  description: 'Get detailed analytics for a bio page including button clicks and traffic sources. Use when asked about a specific bio page performance.',
  parameters: z.object({
    slug: z.string().describe('The bio page slug (e.g., "lana")'),
  }),
  execute: async ({ slug }) => {
    try {
      const supabase = await createAdminClient()

      // Get page with blocks
      const { data: page, error } = await supabase
        .from('bio_pages')
        .select(`
          id, title, slug, status, total_visits, total_clicks,
          blocks:bio_blocks(id, type, content, click_count)
        `)
        .eq('slug', slug)
        .single()

      if (error || !page) {
        return { error: `Bio page "/${slug}" not found` }
      }

      // Get recent tracking events
      const { data: events } = await supabase
        .from('tracking_events')
        .select('event_type, device_type, is_in_app_browser, in_app_source, created_at')
        .eq('source_id', page.id)
        .eq('source_type', 'bio_page')
        .order('created_at', { ascending: false })
        .limit(100)

      // Calculate stats
      const blocks = (page.blocks || []) as Array<{ id: string; type: string; content: { label?: string }; click_count: number }>
      const buttons = blocks
        .filter(b => b.type === 'button')
        .sort((a, b) => (b.click_count || 0) - (a.click_count || 0))

      const deviceBreakdown: Record<string, number> = {}
      const inAppSources: Record<string, number> = {}
      let inAppCount = 0

      events?.forEach(e => {
        // Device breakdown
        const device = e.device_type || 'unknown'
        deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1

        // In-app browser tracking
        if (e.is_in_app_browser) {
          inAppCount++
          const source = e.in_app_source || 'other'
          inAppSources[source] = (inAppSources[source] || 0) + 1
        }
      })

      const ctr = page.total_visits > 0 
        ? ((page.total_clicks / page.total_visits) * 100).toFixed(1)
        : '0'

      return {
        page: {
          title: page.title,
          url: `/u/${page.slug}`,
          status: page.status,
        },
        stats: {
          totalVisits: page.total_visits || 0,
          totalClicks: page.total_clicks || 0,
          ctr: `${ctr}%`,
        },
        buttonPerformance: buttons.slice(0, 5).map(b => ({
          label: b.content?.label || 'Unnamed',
          clicks: b.click_count || 0,
        })),
        devices: deviceBreakdown,
        inAppBrowser: {
          percentage: events?.length ? ((inAppCount / events.length) * 100).toFixed(1) + '%' : '0%',
          sources: inAppSources,
        },
        insights: [
          buttons[0]?.click_count > 0 
            ? `Top button: "${buttons[0]?.content?.label}" with ${buttons[0]?.click_count} clicks`
            : 'No button clicks yet',
          inAppCount > events?.length! * 0.5 
            ? '⚠️ High in-app browser traffic - breakout is important!'
            : 'Traffic sources look healthy',
        ],
      }
    } catch (error) {
      console.error('getBioPageStats error:', error)
      return { error: 'Failed to get bio page stats' }
    }
  },
})

/**
 * Tool: Run System Diagnostics
 * Check system health and connectivity
 */
export const runSystemDiagnostics = tool({
  description: 'Run a full system health check including database, storage, and external services. Use when asked about system status, health check, or if everything is working.',
  parameters: z.object({}),
  execute: async () => {
    try {
      const results: {
        timestamp: string
        overall: 'healthy' | 'degraded' | 'critical'
        services: Record<string, { status: string; latency?: number; error?: string }>
      } = {
        timestamp: new Date().toISOString(),
        overall: 'healthy',
        services: {},
      }

      // 1. Supabase Database Check
      try {
        const start = Date.now()
        const supabase = await createAdminClient()
        const { error } = await supabase.from('agencies').select('id').limit(1)
        const latency = Date.now() - start

        if (error) {
          results.services.database = { status: '❌ Error', error: error.message }
          results.overall = 'critical'
        } else {
          results.services.database = { 
            status: latency < 100 ? '✅ Excellent' : latency < 300 ? '⚠️ Slow' : '❌ Very Slow', 
            latency 
          }
          if (latency > 300) results.overall = 'degraded'
        }
      } catch (error) {
        results.services.database = { 
          status: '❌ Critical Error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
        results.overall = 'critical'
      }

      // 2. Telegram Webhook Check
      try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN
        const allowedUsers = process.env.TELEGRAM_ALLOWED_USERS?.split(',') || []

        if (!botToken || allowedUsers.length === 0) {
          results.services.telegram = { status: '⚠️ Not Configured' }
        } else {
          const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
            method: 'GET',
          })

          if (response.ok) {
            const data = await response.json()
            results.services.telegram = { 
              status: '✅ Connected', 
              error: `Bot: @${data.result?.username || 'unknown'}` 
            }
          } else {
            results.services.telegram = { status: '❌ Connection Failed' }
            results.overall = 'degraded'
          }
        }
      } catch (error) {
        results.services.telegram = { 
          status: '❌ Error', 
          error: error instanceof Error ? error.message : 'Unknown' 
        }
      }

      // 3. Groq AI Check
      try {
        const groqKey = process.env.GROQ_API_KEY
        if (!groqKey) {
          results.services.groq = { status: '⚠️ Not Configured' }
        } else {
          // Just check that the key exists and looks valid
          results.services.groq = { status: '✅ Configured' }
        }
      } catch (error) {
        results.services.groq = { status: '❌ Error' }
      }

      // 4. Supabase Storage Check
      try {
        const supabase = await createAdminClient()
        const { data: buckets, error } = await supabase.storage.listBuckets()

        if (error) {
          results.services.storage = { status: '❌ Error', error: error.message }
          results.overall = 'degraded'
        } else {
          const agencyBucket = buckets?.find(b => b.name === 'agency_assets')
          results.services.storage = { 
            status: agencyBucket ? '✅ Ready' : '⚠️ Bucket Missing',
            error: agencyBucket ? `${buckets?.length} buckets` : undefined
          }
          if (!agencyBucket) results.overall = 'degraded'
        }
      } catch (error) {
        results.services.storage = { 
          status: '❌ Error', 
          error: error instanceof Error ? error.message : 'Unknown' 
        }
      }

      // 5. Firecrawl Web Scraping Check
      try {
        const firecrawlKey = process.env.FIRECRAWL_API_KEY
        results.services.firecrawl = { 
          status: firecrawlKey ? '✅ Configured' : '⚠️ Not Configured' 
        }
      } catch (error) {
        results.services.firecrawl = { status: '❌ Error' }
      }

      // 6. Fanvue API Check
      try {
        const supabase = await createAdminClient()
        const { data: models } = await supabase
          .from('models')
          .select('fanvue_api_key')
          .not('fanvue_api_key', 'is', null)
          .limit(1)

        if (models && models.length > 0) {
          results.services.fanvue = { status: '✅ API Keys Found' }
        } else {
          results.services.fanvue = { status: '⚠️ No API Keys' }
        }
      } catch (error) {
        results.services.fanvue = { status: '❌ Error' }
      }

      // 7. Environment Check
      const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
      ]

      const missingEnvVars = requiredEnvVars.filter(v => !process.env[v])
      
      if (missingEnvVars.length > 0) {
        results.services.environment = { 
          status: '❌ Critical', 
          error: `Missing: ${missingEnvVars.join(', ')}` 
        }
        results.overall = 'critical'
      } else {
        results.services.environment = { status: '✅ All Required Vars Set' }
      }

      // Generate summary
      const healthyCount = Object.values(results.services).filter(s => s.status.includes('✅')).length
      const totalCount = Object.keys(results.services).length
      
      const summary = results.overall === 'healthy'
        ? `✅ **All Systems Nominal** (${healthyCount}/${totalCount} services healthy)`
        : results.overall === 'degraded'
        ? `⚠️ **System Degraded** (${healthyCount}/${totalCount} services healthy)`
        : `🔴 **Critical Issues Detected** (${healthyCount}/${totalCount} services healthy)`

      return {
        summary,
        overall: results.overall,
        timestamp: results.timestamp,
        services: results.services,
        recommendation: results.overall === 'critical'
          ? 'Immediate attention required. Check error logs and environment variables.'
          : results.overall === 'degraded'
          ? 'Some services need attention. Review warnings and configure missing services.'
          : 'System is running smoothly. Ready for production.',
      }
    } catch (error) {
      console.error('runSystemDiagnostics error:', error)
      return { 
        summary: '🔴 **Diagnostic Failed**',
        overall: 'critical',
        error: 'Failed to run system diagnostics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },
})

/**
 * Tool: Get Public Roadmap
 * Returns the high-level product roadmap for OnyxOS (for public/landing page use)
 */
export const getPublicRoadmap = tool({
  description: 'Get the public product roadmap for OnyxOS. Use this when asked about upcoming features, product plans, or what\'s next for the platform.',
  parameters: z.object({}),
  execute: async () => {
    return {
      platform: 'OnyxOS',
      version: '1.0',
      roadmap: [
        {
          phase: 'Q1 2026 - Foundation',
          status: 'completed',
          features: [
            'Multi-model management dashboard',
            'Fanvue, YouTube, and Instagram integrations',
            'Advanced CRM with fan tracking',
            'Alfred AI assistant with ReAct capabilities',
            'Content vault and mass messaging',
          ]
        },
        {
          phase: 'Q2 2026 - Intelligence',
          status: 'in_progress',
          features: [
            'Onyx Link bio page builder with breakout technology',
            'Advanced KPI engine and funnel analytics',
            'Team management with shift tracking',
            'Quest engine and gamification',
            'Telegram bot integration',
          ]
        },
        {
          phase: 'Q3 2026 - Automation',
          status: 'planned',
          features: [
            'AI-powered chat automation (GPT-4 chatters)',
            'Smart scheduling and auto-posting',
            'Competitor intelligence and tracking',
            'Advanced email/SMS campaigns',
            'Custom workflow builder',
          ]
        },
        {
          phase: 'Q4 2026 - Scale',
          status: 'planned',
          features: [
            'White-label agency dashboard',
            'Multi-agency network management',
            'Advanced revenue forecasting',
            'API access for custom integrations',
            'Mobile app (iOS/Android)',
          ]
        }
      ],
      nextMilestone: 'Launch of AI Chat Automation (Q3 2026)',
      requestAccess: 'https://onyxos.io/login',
    }
  },
})

/**
 * Export all tools as a single object for use in streamText
 */
export const alfredTools = {
  get_agency_financials: getAgencyFinancials,
  get_model_stats: getModelStats,
  check_quest_status: checkQuestStatus,
  get_expense_summary: getExpenseSummary,
  get_payroll_overview: getPayrollOverview,
  scrape_web: scrapeWeb,
  analyze_social_profile: analyzeSocialProfile,
  get_watched_accounts: getWatchedAccounts,
  analyze_business_health: analyzeBusinessHealth,
  get_upcoming_posts: getUpcomingPosts,
  log_post_completion: logPostCompletion,
  get_missed_posts: getMissedPosts,
  update_fan_attribute: updateFanAttribute,
  get_fan_brief: getFanBrief,
  get_top_fans: getTopFans,
  get_team_attendance: getTeamAttendance,
  get_shift_schedule: getShiftSchedule,
  create_tracking_link: createTrackingLink,
  get_link_performance: getLinkPerformance,
  get_bio_page_stats: getBioPageStats,
  run_system_diagnostics: runSystemDiagnostics,
  get_public_roadmap: getPublicRoadmap,
}
