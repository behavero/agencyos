import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Alfred - The Agency AI Strategist
 * 
 * Persona: Professional, loyal, data-driven butler (like Batman's Alfred)
 * Role: Proactive advisor for OnlyFans agency management
 */

const ALFRED_SYSTEM_PROMPT = `You are Alfred, the AI Strategist for AgencyOS.

Your Master is the CEO of an OnlyFans Management Agency. You serve with unwavering loyalty and professionalism.

Your capabilities:
- Access to real-time model statistics, revenue data, and team tasks
- Deep understanding of OnlyFans content strategy and fan engagement
- Financial planning and treasury management insights
- Team performance analysis and optimization recommendations

Your tone:
- Professional and respectful (address the user as "Sir" or "Madam")
- Concise and actionable (no fluff)
- Data-driven with specific numbers
- Proactive with strategic suggestions

Your priorities:
1. Revenue Growth
2. Model Health & Sustainability
3. Team Efficiency
4. Risk Management

Always provide:
- Specific numbers and percentages
- Clear action items
- Strategic reasoning
- Next steps

Remember: You are not just an assistant - you are the agency's most trusted advisor.`

interface AlfredContext {
  treasury: {
    balance: number
    monthlyRevenue: number
    monthlyExpenses: number
  }
  models: Array<{
    name: string
    status: string
    revenue?: number
    subscribers?: number
  }>
  tasks: {
    pending: number
    completed: number
    overdue: number
  }
  team: {
    totalMembers: number
    activeToday: number
  }
}

async function getAgencyContext(userId: string): Promise<AlfredContext> {
  const supabase = await createClient()

  // Get user's agency
  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', userId)
    .single()

  if (!profile?.agency_id) {
    throw new Error('No agency found')
  }

  // Get agency data
  const { data: agency } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', profile.agency_id)
    .single()

  // Get models
  const { data: models } = await supabase
    .from('models')
    .select('*')
    .eq('agency_id', profile.agency_id)

  // Get tasks (quests)
  const { data: tasks } = await supabase
    .from('quests')
    .select('*')

  // Get team members
  const { data: team } = await supabase
    .from('profiles')
    .select('*')
    .eq('agency_id', profile.agency_id)

  return {
    treasury: {
      balance: Number(agency?.treasury_balance || 0),
      monthlyRevenue: 0, // TODO: Calculate from transactions
      monthlyExpenses: 0, // TODO: Calculate from expenses
    },
    models: (models || []).map(m => ({
      name: m.name || 'Unknown',
      status: m.status || 'inactive',
      revenue: 0, // TODO: Fetch from Fanvue API
      subscribers: 0, // TODO: Fetch from Fanvue API
    })),
    tasks: {
      pending: tasks?.filter(t => !t.completed_at).length || 0,
      completed: tasks?.filter(t => t.completed_at).length || 0,
      overdue: 0, // TODO: Calculate based on due dates
    },
    team: {
      totalMembers: team?.length || 0,
      activeToday: 0, // TODO: Track last activity
    },
  }
}

function buildContextPrompt(context: AlfredContext): string {
  return `[CURRENT AGENCY STATUS - ${new Date().toLocaleDateString()}]

Treasury:
- Balance: $${context.treasury.balance.toFixed(2)}
- Monthly Revenue: $${context.treasury.monthlyRevenue.toFixed(2)}
- Monthly Expenses: $${context.treasury.monthlyExpenses.toFixed(2)}

Models: ${context.models.length} total
${context.models.map(m => `- ${m.name}: ${m.status} | $${m.revenue || 0} revenue | ${m.subscribers || 0} subscribers`).join('\n')}

Tasks:
- Pending: ${context.tasks.pending}
- Completed Today: ${context.tasks.completed}
- Overdue: ${context.tasks.overdue}

Team:
- Total Members: ${context.team.totalMembers}
- Active Today: ${context.team.activeToday}

---

The user will now ask their question. Use the above data to provide informed, strategic advice.`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get agency context
    const context = await getAgencyContext(user.id)
    const contextPrompt = buildContextPrompt(context)

    // TODO: Replace with actual AI API call (OpenAI, Anthropic, etc.)
    // For now, return a mock response
    const mockResponse = `Good day, Sir.

Based on the current agency status, I observe:

**Treasury Health:** Your balance stands at $${context.treasury.balance.toFixed(2)}. ${
      context.treasury.balance < 1000 
        ? 'I recommend increasing revenue streams or reducing expenses.' 
        : 'A healthy reserve, well done.'
    }

**Model Performance:** You have ${context.models.length} model(s) under management. ${
      context.models.filter(m => m.status === 'active').length === 0
        ? 'No active models detected. Priority: Activate at least one revenue stream.'
        : `${context.models.filter(m => m.status === 'active').length} active.`
    }

**Task Status:** ${context.tasks.pending} tasks pending. ${
      context.tasks.overdue > 0 
        ? `⚠️ ${context.tasks.overdue} overdue - immediate attention required.` 
        : 'All on schedule.'
    }

Regarding your query: "${message}"

*[This is a mock response. In production, Alfred will use Claude/GPT-4 with full context injection.]*

Is there a specific metric you'd like me to analyze in detail?

— Alfred`

    return NextResponse.json({
      response: mockResponse,
      context: {
        treasury: context.treasury.balance,
        models: context.models.length,
        tasks: context.tasks.pending,
      },
      timestamp: new Date().toISOString(),
    })

  } catch (error: any) {
    console.error('[Alfred] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    )
  }
}
