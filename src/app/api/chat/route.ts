import { streamText, convertToModelMessages } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAdminClient } from '@/lib/supabase/server'

export const maxDuration = 60

/**
 * Alfred AI Chat — Streaming endpoint
 *
 * Uses Groq (Llama 3.3 70B) via OpenAI-compatible API.
 * Compatible with AI SDK v6 useChat (returns UI message stream).
 *
 * The client sends UIMessage[] (with `parts`), so we convert
 * to ModelMessage[] (with `role`/`content`) before calling streamText.
 */
export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'GROQ_API_KEY not configured. Alfred AI is unavailable.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { messages: uiMessages } = await request.json()

  // Convert UIMessage[] (parts-based) → ModelMessage[] (content-based)
  const modelMessages = await convertToModelMessages(uiMessages)

  // Gather agency context for the system prompt
  let contextSnippet = ''
  try {
    const supabase = await createAdminClient()

    const [modelsRes, txRes, profilesRes] = await Promise.all([
      supabase.from('models').select('id, display_name, revenue_total').limit(10),
      supabase
        .from('fanvue_transactions')
        .select('amount, category, fanvue_created_at')
        .order('fanvue_created_at', { ascending: false })
        .limit(20),
      supabase.from('profiles').select('id, full_name, role').limit(10),
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
  } catch {
    // Context loading failed — continue without it
  }

  const systemPrompt = `You are Alfred, the OnyxOS AI strategist.

IDENTITY:
- Name: Alfred
- Platform: OnyxOS (Agency Management System for Fanvue creators)
- Role: Strategic AI advisor with live agency data access

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

  const groq = createOpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  })

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: systemPrompt,
    messages: modelMessages,
    maxOutputTokens: 1024,
    temperature: 0.7,
  })

  return result.toUIMessageStreamResponse()
}
