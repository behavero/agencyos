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
 * Export all tools as a single object for use in streamText
 */
export const alfredTools = {
  get_agency_financials: getAgencyFinancials,
  get_model_stats: getModelStats,
  check_quest_status: checkQuestStatus,
  get_expense_summary: getExpenseSummary,
  get_payroll_overview: getPayrollOverview,
}
