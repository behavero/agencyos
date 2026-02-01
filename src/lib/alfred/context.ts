/**
 * Alfred Context Builder
 * Gathers all agency data to provide context for AI responses
 * @see https://docs.openclaw.ai/concepts/context
 */

import { AgencyContext } from './types'
import { createClient } from '@/lib/supabase/server'

/**
 * Build complete agency context for Alfred AI
 */
export async function buildAgencyContext(userId: string): Promise<AgencyContext> {
  const supabase = await createClient()
  
  // Get user's profile and agency
  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id, role, xp_count, current_streak')
    .eq('id', userId)
    .single()
  
  if (!profile?.agency_id) {
    throw new Error('No agency found for user')
  }
  
  // Get agency details
  const { data: agency } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', profile.agency_id)
    .single()
  
  if (!agency) {
    throw new Error('Agency not found')
  }
  
  // Get all models for the agency
  const { data: models } = await supabase
    .from('models')
    .select('*')
    .eq('agency_id', profile.agency_id)
  
  // Get team members
  const { data: team } = await supabase
    .from('profiles')
    .select('*')
    .eq('agency_id', profile.agency_id)
  
  // Get tasks (quests)
  const { data: quests } = await supabase
    .from('quests')
    .select('*')
  
  // Calculate financials
  const totalRevenue = (models || []).reduce((sum, m) => sum + (m.revenue_total || 0), 0)
  const platformFeeRate = 0.20
  const platformFees = totalRevenue * platformFeeRate
  
  let taxRate = 0
  switch (agency.tax_jurisdiction) {
    case 'RO': taxRate = 0.03; break
    case 'FR': taxRate = 0.25; break
    default: taxRate = 0
  }
  const taxes = totalRevenue * taxRate
  const opex = 3500 // TODO: Make this configurable
  const netProfit = totalRevenue - platformFees - taxes - opex
  
  // Count roles
  const roleCounts: Record<string, number> = {}
  for (const member of team || []) {
    const role = member.role || 'unknown'
    roleCounts[role] = (roleCounts[role] || 0) + 1
  }
  
  // Count pending/completed quests
  const pendingQuests = (quests || []).filter(q => !q.completed_at).length
  const completedQuests = (quests || []).filter(q => q.completed_at).length
  
  return {
    agency: {
      id: agency.id,
      name: agency.name || 'Unknown Agency',
      treasuryBalance: Number(agency.treasury_balance) || 0,
      taxJurisdiction: agency.tax_jurisdiction || 'US',
      currentLevel: agency.current_level || 1
    },
    models: (models || []).map(m => ({
      id: m.id,
      name: m.name || 'Unknown',
      status: m.status || 'inactive',
      revenue: m.revenue_total || 0,
      subscribers: m.subscribers_count || 0,
      followers: m.followers_count || 0,
      posts: m.posts_count || 0,
      messages: m.unread_messages || 0,
      trackingLinks: m.tracking_links_count || 0
    })),
    tasks: {
      pending: pendingQuests,
      completed: completedQuests,
      overdue: 0 // TODO: Implement due date tracking
    },
    team: {
      totalMembers: team?.length || 0,
      activeToday: 0, // TODO: Track activity
      roles: roleCounts
    },
    finances: {
      grossRevenue: totalRevenue,
      platformFees,
      taxes,
      opex,
      netProfit
    }
  }
}

/**
 * Format context for system prompt
 */
export function formatContextForPrompt(context: AgencyContext): string {
  const modelsList = context.models.map(m => 
    `  • ${m.name}: ${m.status} | $${m.revenue.toLocaleString()} revenue | ${m.subscribers} subs | ${m.followers.toLocaleString()} followers`
  ).join('\n')
  
  const rolesStr = Object.entries(context.team.roles)
    .map(([role, count]) => `${role}: ${count}`)
    .join(', ')
  
  return `
═══════════════════════════════════════════════════════════
                    AGENCY INTELLIGENCE BRIEFING
                    ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
═══════════════════════════════════════════════════════════

🏢 AGENCY: ${context.agency.name}
   Level: ${context.agency.currentLevel} | Tax Jurisdiction: ${context.agency.taxJurisdiction}
   Treasury: $${context.agency.treasuryBalance.toLocaleString()}

💰 FINANCIAL SUMMARY:
   Gross Revenue:    $${context.finances.grossRevenue.toLocaleString()}
   Platform Fees:    -$${context.finances.platformFees.toLocaleString()} (20%)
   Taxes:            -$${context.finances.taxes.toLocaleString()} (${context.agency.taxJurisdiction})
   Operating Costs:  -$${context.finances.opex.toLocaleString()}
   ─────────────────────────────
   Net Profit:       $${context.finances.netProfit.toLocaleString()}

👤 CREATORS (${context.models.length}):
${modelsList}

📋 TASKS:
   Pending: ${context.tasks.pending} | Completed: ${context.tasks.completed} | Overdue: ${context.tasks.overdue}

👥 TEAM: ${context.team.totalMembers} members
   Roles: ${rolesStr || 'None assigned'}

═══════════════════════════════════════════════════════════
`.trim()
}
