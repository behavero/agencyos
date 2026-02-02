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
}
