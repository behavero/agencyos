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
    followers?: number
    posts?: number
    messages?: number
    likes?: number
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
  totals?: {
    revenue: number
    followers: number
    subscribers: number
    messages: number
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

  // Calculate total revenue from models (from Fanvue data)
  const totalRevenue = (models || []).reduce((sum, m) => sum + Number(m.revenue_total || 0), 0)
  const totalFollowers = (models || []).reduce((sum, m) => sum + Number(m.followers_count || 0), 0)
  const totalSubscribers = (models || []).reduce((sum, m) => sum + Number(m.subscribers_count || 0), 0)
  const totalMessages = (models || []).reduce((sum, m) => sum + Number(m.unread_messages || 0), 0)

  return {
    treasury: {
      balance: Number(agency?.treasury_balance || 0),
      monthlyRevenue: totalRevenue, // Now from Fanvue
      monthlyExpenses: 3500, // Placeholder - TODO: from expenses table
    },
    models: (models || []).map(m => ({
      name: m.name || 'Unknown',
      status: m.status || 'inactive',
      revenue: Number(m.revenue_total || 0),
      subscribers: Number(m.subscribers_count || 0),
      followers: Number(m.followers_count || 0),
      posts: Number(m.posts_count || 0),
      messages: Number(m.unread_messages || 0),
      likes: Number(m.likes_count || 0),
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
    totals: {
      revenue: totalRevenue,
      followers: totalFollowers,
      subscribers: totalSubscribers,
      messages: totalMessages,
    },
  }
}

function buildContextPrompt(context: AlfredContext): string {
  return `[CURRENT AGENCY STATUS - ${new Date().toLocaleDateString()}]

📊 TOTALS (All Models Combined):
- Total Revenue: $${context.totals?.revenue?.toLocaleString() || 0}
- Total Followers: ${context.totals?.followers?.toLocaleString() || 0}
- Total Subscribers: ${context.totals?.subscribers?.toLocaleString() || 0}
- Unread Messages: ${context.totals?.messages?.toLocaleString() || 0}

💰 Treasury:
- Balance: $${context.treasury.balance.toLocaleString()}
- Monthly Revenue: $${context.treasury.monthlyRevenue.toLocaleString()}
- Monthly Expenses: $${context.treasury.monthlyExpenses.toLocaleString()}
- Net Profit: $${(context.treasury.monthlyRevenue - context.treasury.monthlyExpenses).toLocaleString()}

👥 Models: ${context.models.length} total
${context.models.map(m => `- ${m.name}: ${m.status}
  Revenue: $${(m.revenue || 0).toLocaleString()} | Subscribers: ${m.subscribers || 0} | Followers: ${(m.followers || 0).toLocaleString()}
  Posts: ${m.posts || 0} | Likes: ${(m.likes || 0).toLocaleString()} | Unread: ${m.messages || 0}`).join('\n')}

✅ Tasks:
- Pending: ${context.tasks.pending}
- Completed Today: ${context.tasks.completed}
- Overdue: ${context.tasks.overdue}

🏢 Team:
- Total Members: ${context.team.totalMembers}
- Active Today: ${context.team.activeToday}

---

The user will now ask their question. Use the above REAL data to provide informed, strategic advice.`
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
