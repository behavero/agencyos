import { streamText, convertToModelMessages } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getModelForAgency } from '@/lib/openclaw/provider-router'
import { getToolsForRole } from '@/lib/openclaw/tools'
import { logChat } from '@/lib/openclaw/audit'

export const maxDuration = 60

/**
 * Alfred AI Chat — Streaming endpoint
 *
 * Uses the OpenClaw Provider Router to resolve the agency's configured LLM.
 * Falls back to system Groq key if no user key is configured.
 *
 * Compatible with AI SDK v6 useChat (returns UI message stream).
 *
 * The client sends UIMessage[] (with `parts`), so we convert
 * to ModelMessage[] (with `role`/`content`) before calling streamText.
 */
export async function POST(request: Request) {
  // Resolve the user's agency and role for provider routing + tool permissions
  let agencyId: string | null = null
  let userRole: string | null = null
  let userId: string | null = null
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      userId = user.id
      const { data: profile } = await supabase
        .from('profiles')
        .select('agency_id, role')
        .eq('id', user.id)
        .single()
      agencyId = profile?.agency_id || null
      userRole = profile?.role || null
    }
  } catch {
    // Continue without agency context — will use system key
  }

  // Resolve LLM provider via OpenClaw router
  let model
  let providerName = 'groq'
  try {
    if (agencyId) {
      const resolved = await getModelForAgency(agencyId)
      model = resolved.model
      providerName = resolved.provider
    }
  } catch {
    // Fall through to system key fallback below
  }

  // Fallback: system Groq key
  if (!model) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            'No LLM configured. Add an API key in Settings > AI / OpenClaw, or contact support.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }
    const groq = createOpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' })
    model = groq('llama-3.3-70b-versatile')
    providerName = 'groq'
  }

  const { messages: uiMessages } = await request.json()

  // Convert UIMessage[] (parts-based) → ModelMessage[] (content-based)
  const modelMessages = await convertToModelMessages(uiMessages)

  // Gather agency context for the system prompt
  let contextSnippet = ''
  try {
    const supabase = createAdminClient()

    // Try to load pre-computed digest first (OpenClaw Context Engine)
    if (agencyId) {
      const { data: digest } = await supabase
        .from('agency_digests')
        .select('summary')
        .eq('agency_id', agencyId)
        .eq('digest_type', 'daily')
        .single()

      if (digest?.summary) {
        const s = digest.summary as Record<string, any>
        contextSnippet += `\n\nAGENCY DIGEST (last 30 days):`
        if (s.revenue) {
          contextSnippet += `\nRevenue: $${s.revenue.total?.toLocaleString()} (net: $${s.revenue.net?.toLocaleString()}, growth: ${s.revenue.growth_pct}%)`
          if (s.revenue.by_type) {
            contextSnippet += `\nBreakdown: ${Object.entries(s.revenue.by_type)
              .map(([k, v]) => `${k}: $${(v as number).toLocaleString()}`)
              .join(', ')}`
          }
        }
        if (s.models && Array.isArray(s.models)) {
          contextSnippet += `\n\nMODELS:`
          for (const m of s.models) {
            contextSnippet += `\n- ${m.name}: ${m.subs} subs, $${m.revenue?.toLocaleString()} rev, ARPU $${m.arpu}, trend ${m.trend}`
          }
        }
        if (s.funnel) {
          contextSnippet += `\n\nFUNNEL: ${s.funnel.tracking_clicks} clicks → ${s.funnel.new_subs} subs (${s.funnel.click_to_sub_pct}% conv), msg purchase ${s.funnel.message_purchase_pct}%, ppv unlock ${s.funnel.ppv_unlock_pct}%`
        }
        if (s.health) {
          contextSnippet += `\nHEALTH: overall ${s.health.overall}/100, conversion ${s.health.conversion}/100, engagement ${s.health.engagement}/100, revenue ${s.health.revenue}/100`
        }
        if (s.insights && Array.isArray(s.insights)) {
          contextSnippet += `\n\nINSIGHTS:`
          for (const i of s.insights) {
            contextSnippet += `\n- [${i.severity}] ${i.title}: ${i.action}`
          }
        }
        if (s.vip_fans && Array.isArray(s.vip_fans)) {
          contextSnippet += `\n\nVIP FANS:`
          for (const f of s.vip_fans) {
            contextSnippet += `\n- ${f.name}: $${f.total_spend} (last active: ${f.last_active})`
          }
        }
      }
    }

    // Fallback: raw data if no digest available
    if (!contextSnippet) {
      const [modelsRes, txRes, profilesRes] = await Promise.all([
        agencyId
          ? supabase
              .from('models')
              .select('id, display_name, revenue_total')
              .eq('agency_id', agencyId)
              .limit(10)
          : supabase.from('models').select('id, display_name, revenue_total').limit(10),
        agencyId
          ? supabase
              .from('fanvue_transactions')
              .select('amount, category, fanvue_created_at')
              .eq('agency_id', agencyId)
              .order('fanvue_created_at', { ascending: false })
              .limit(20)
          : supabase
              .from('fanvue_transactions')
              .select('amount, category, fanvue_created_at')
              .order('fanvue_created_at', { ascending: false })
              .limit(20),
        agencyId
          ? supabase
              .from('profiles')
              .select('id, full_name, role')
              .eq('agency_id', agencyId)
              .limit(10)
          : supabase.from('profiles').select('id, full_name, role').limit(10),
      ])

      const models = modelsRes.data || []
      const transactions = txRes.data || []
      const team = profilesRes.data || []

      if (models.length > 0) {
        contextSnippet += `\n\nAGENCY MODELS:\n${models.map(m => `- ${m.display_name}: $${m.revenue_total ?? 0} total revenue`).join('\n')}`
      }
      if (transactions.length > 0) {
        const totalRecent = transactions.reduce((s, t) => s + (t.amount || 0), 0)
        contextSnippet += `\n\nRECENT TRANSACTIONS: ${transactions.length} transactions, total $${totalRecent.toFixed(2)}`
      }
      if (team.length > 0) {
        contextSnippet += `\n\nTEAM: ${team.map(t => `${t.full_name} (${t.role})`).join(', ')}`
      }
    }
  } catch {
    // Context loading failed — continue without it
  }

  const systemPrompt = `You are Alfred, the OnyxOS AI strategist powered by OpenClaw.

IDENTITY:
- Name: Alfred
- Platform: OnyxOS (Agency Management System for Fanvue creators)
- Role: Strategic AI advisor with live agency data access
- Engine: OpenClaw Neural Core (${providerName})

PERSONALITY:
- Precise, data-driven, professional
- Butler-like demeanor — dry wit, never sycophantic
- Loyal but honest — give real advice, not pleasantries

CAPABILITIES:
- Analyze agency revenue, creator performance, and team metrics
- Provide actionable strategic recommendations
- Help with content strategy, financial planning, and team management

RULES:
- Format responses with markdown for readability
- Use bullet points and bold for key metrics
- Keep responses concise but comprehensive
- If you lack data, say so — never fabricate numbers${contextSnippet}`

  // Get tools available to this user's role (scoped to their agency)
  const tools = agencyId ? getToolsForRole(userRole, agencyId, userId || '') : {}

  // Audit log (fire-and-forget)
  if (agencyId && userId) {
    logChat(agencyId, userId, providerName, 'alfred-chat')
  }

  const result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages,
    maxOutputTokens: 1024,
    temperature: 0.7,
    tools,
  })

  return result.toUIMessageStreamResponse()
}
