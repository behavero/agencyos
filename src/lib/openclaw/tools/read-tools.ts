/**
 * OpenClaw Read Tools — Read-only data retrieval tools
 *
 * These tools let Alfred query agency data without making any changes.
 * Built as factory functions that close over the agencyId for data isolation.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { calculateAgencyKPIs } from '@/lib/services/kpi-engine'

/**
 * Build read-only tools scoped to a specific agency.
 */
export function buildReadTools(agencyId: string) {
  return {
    /**
     * Get agency-wide KPIs including revenue, conversion rates, and health scores
     */
    get_agency_kpis: tool({
      description:
        'Get current agency KPIs: revenue, expenses, profit margin, conversion rates, ARPU, LTV, churn, health scores, and actionable insights. Use this to answer questions about how the agency is performing.',
      inputSchema: z.object({
        range: z.enum(['7d', '30d', '90d']).default('30d').describe('Time range for KPIs'),
      }),
      execute: async ({ range }) => {
        const kpis = await calculateAgencyKPIs(agencyId, range)
        return {
          revenue: {
            total: kpis.totalRevenue,
            expenses: kpis.totalExpenses,
            net_profit: kpis.netProfit,
            profit_margin: `${kpis.profitMargin.toFixed(1)}%`,
          },
          subscribers: {
            active: kpis.activeSubscribers,
            new: kpis.newSubscribers,
            arpu: kpis.arpu.toFixed(2),
            ltv: kpis.ltv.toFixed(2),
            churn_rate: `${kpis.churnRate}%`,
          },
          conversion: {
            ig_conversion: `${kpis.igConversionRate.toFixed(1)}%`,
            bio_ctr: `${kpis.bioCTR.toFixed(1)}%`,
            fan_conversion: `${kpis.fanConversionRate.toFixed(1)}%`,
          },
          health: kpis.healthScores,
          trends: {
            revenue_change: `${kpis.trends.revenueChange.toFixed(1)}%`,
            subscriber_change: `${kpis.trends.subscriberChange.toFixed(1)}%`,
          },
          top_insights: kpis.insights.slice(0, 5).map(i => ({
            type: i.type,
            title: i.title,
            action: i.action || i.description,
          })),
        }
      },
    }),

    /**
     * Get stats for a specific creator/model
     */
    get_model_stats: tool({
      description:
        'Get detailed stats for a specific creator/model: revenue, subscribers, followers, and recent performance. Use when the user asks about a specific model.',
      inputSchema: z.object({
        model_name: z.string().describe('Name of the model/creator to look up'),
      }),
      execute: async ({ model_name }) => {
        const supabase = createAdminClient()

        const { data: models } = await supabase
          .from('models')
          .select(
            'id, name, display_name, subscribers_count, followers_count, revenue_total, ig_followers, posts_count, likes_count, media_count'
          )
          .eq('agency_id', agencyId)
          .or(`name.ilike.%${model_name}%,display_name.ilike.%${model_name}%`)
          .limit(3)

        if (!models || models.length === 0) {
          return { error: `No model found matching "${model_name}"` }
        }

        return models.map(m => ({
          name: m.display_name || m.name,
          revenue_total: m.revenue_total || 0,
          subscribers: m.subscribers_count || 0,
          followers: m.followers_count || 0,
          ig_followers: m.ig_followers || 0,
          posts: m.posts_count || 0,
          likes: m.likes_count || 0,
          media_count: m.media_count || 0,
        }))
      },
    }),

    /**
     * Get fan spending history and tier classification
     */
    get_fan_profile: tool({
      description:
        'Look up a fan/subscriber profile: spending history, tier (whale/spender/free), and transaction count. Use when the user asks about a specific fan.',
      inputSchema: z.object({
        fan_name: z.string().describe('Username or name of the fan to look up'),
      }),
      execute: async ({ fan_name }) => {
        const supabase = createAdminClient()

        const { data: fans } = await supabase
          .from('creator_top_spenders')
          .select('fan_username, total_amount, transaction_count, last_transaction_date, model_id')
          .eq('agency_id', agencyId)
          .ilike('fan_username', `%${fan_name}%`)
          .order('total_amount', { ascending: false })
          .limit(5)

        if (!fans || fans.length === 0) {
          return { error: `No fan found matching "${fan_name}"` }
        }

        return fans.map(f => {
          const spend = Number(f.total_amount || 0)
          return {
            username: f.fan_username,
            total_spend: spend,
            tier: spend >= 1000 ? 'whale' : spend >= 100 ? 'spender' : 'free',
            transactions: f.transaction_count || 0,
            last_active: f.last_transaction_date || 'unknown',
          }
        })
      },
    }),

    /**
     * Get tracking link performance
     */
    get_tracking_links: tool({
      description:
        'Get tracking link (traffic source) performance: clicks, sources, and conversion data. Use when the user asks about traffic or marketing sources.',
      inputSchema: z.object({}),
      execute: async () => {
        const supabase = createAdminClient()

        const { data: links } = await supabase
          .from('tracking_links')
          .select('id, slug, model_id, clicks, source, created_at')
          .eq('agency_id', agencyId)
          .order('clicks', { ascending: false })
          .limit(10)

        if (!links || links.length === 0) {
          return { message: 'No tracking links found.' }
        }

        const totalClicks = links.reduce((s, l) => s + (l.clicks || 0), 0)
        return {
          total_links: links.length,
          total_clicks: totalClicks,
          links: links.map(l => ({
            slug: l.slug,
            clicks: l.clicks || 0,
            source: l.source || 'unknown',
            created: l.created_at,
          })),
        }
      },
    }),

    /**
     * Get revenue breakdown by type for a period
     */
    get_revenue_breakdown: tool({
      description:
        'Get revenue breakdown by transaction category (subscriptions, tips, messages, PPV) for a given time period.',
      inputSchema: z.object({
        range: z.enum(['7d', '30d', '90d']).default('30d').describe('Time range'),
        model_name: z.string().optional().describe('Optional: filter by model name'),
      }),
      execute: async ({ range, model_name }) => {
        const supabase = createAdminClient()

        const daysMap = { '7d': 7, '30d': 30, '90d': 90 } as const
        const days = daysMap[range]
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

        let query = supabase
          .from('fanvue_transactions')
          .select('amount, category')
          .eq('agency_id', agencyId)
          .gte('transaction_date', startDate.toISOString().split('T')[0])

        if (model_name) {
          const { data: models } = await supabase
            .from('models')
            .select('id')
            .eq('agency_id', agencyId)
            .or(`name.ilike.%${model_name}%,display_name.ilike.%${model_name}%`)
            .limit(1)
          if (models?.[0]) {
            query = query.eq('model_id', models[0].id)
          }
        }

        const { data: transactions } = await query

        const byCategory: Record<string, { amount: number; count: number }> = {}
        let total = 0
        for (const tx of transactions || []) {
          const cat = tx.category || 'other'
          if (!byCategory[cat]) byCategory[cat] = { amount: 0, count: 0 }
          byCategory[cat].amount += Number(tx.amount || 0)
          byCategory[cat].count++
          total += Number(tx.amount || 0)
        }

        return {
          period: range,
          total_revenue: Math.round(total * 100) / 100,
          categories: Object.entries(byCategory)
            .sort(([, a], [, b]) => b.amount - a.amount)
            .map(([cat, data]) => ({
              category: cat,
              amount: Math.round(data.amount * 100) / 100,
              transactions: data.count,
              percentage: total > 0 ? `${((data.amount / total) * 100).toFixed(1)}%` : '0%',
            })),
        }
      },
    }),

    /**
     * Search the content vault for media
     */
    search_vault: tool({
      description:
        'Search the content vault for media by type (image/video/audio). Use when the user asks about available content or wants to find specific media.',
      inputSchema: z.object({
        model_name: z.string().describe('Model name to search vault for'),
        media_type: z
          .enum(['image', 'video', 'audio', 'all'])
          .default('all')
          .describe('Type of media to search for'),
      }),
      execute: async ({ model_name, media_type }) => {
        const supabase = createAdminClient()

        const { data: models } = await supabase
          .from('models')
          .select('id, display_name')
          .eq('agency_id', agencyId)
          .or(`name.ilike.%${model_name}%,display_name.ilike.%${model_name}%`)
          .limit(1)

        if (!models?.[0]) {
          return { error: `No model found matching "${model_name}"` }
        }

        let query = supabase
          .from('content_assets')
          .select('id, media_type, price, created_at, is_free')
          .eq('agency_id', agencyId)
          .eq('model_id', models[0].id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (media_type !== 'all') {
          query = query.eq('media_type', media_type)
        }

        const { data: assets } = await query

        return {
          model: models[0].display_name,
          total_found: assets?.length || 0,
          assets: (assets || []).map(a => ({
            id: a.id,
            type: a.media_type,
            price: a.price || 0,
            is_free: a.is_free || false,
            created: a.created_at,
          })),
        }
      },
    }),
  }
}
