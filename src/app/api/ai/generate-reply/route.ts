import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getModelForAgency } from '@/lib/openclaw/provider-router'
import { logGenerateReply } from '@/lib/openclaw/audit'

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface GenerateReplyRequest {
  conversationHistory: ConversationMessage[]
  userModel: string // Model name (e.g., "Lanaa")
  subscriberTier: 'whale' | 'spender' | 'free' | 'unknown'
  fanUuid?: string
  modelId?: string
}

/**
 * POST /api/ai/generate-reply
 *
 * Generates a GFE-style (Girlfriend Experience) reply using the agency's
 * configured LLM via the OpenClaw Provider Router.
 *
 * Falls back to system Groq key if no user key is configured.
 *
 * Input:
 * - conversationHistory: Array of messages (user/assistant/system)
 * - userModel: Creator/model name
 * - subscriberTier: Whale/Spender/Free tier
 * - fanUuid: Optional fan UUID to fetch notes
 * - modelId: Optional model ID to fetch notes
 *
 * Output:
 * - suggestedText: AI-generated reply text
 * - suggestedVaultItem: Optional vault item ID if confidence is high
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve agency for provider routing
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    const agencyId = profile?.agency_id

    // Resolve LLM provider via OpenClaw router
    let model
    try {
      if (agencyId) {
        const resolved = await getModelForAgency(agencyId)
        model = resolved.model
      }
    } catch {
      // Fall through to system key fallback
    }

    // Fallback: system Groq key
    if (!model) {
      const groqKey = process.env.GROQ_API_KEY
      if (!groqKey) {
        console.error('[Generate Reply] No LLM key configured')
        return NextResponse.json(
          { error: 'AI service unavailable', message: 'No LLM key configured' },
          { status: 503 }
        )
      }
      const groq = createOpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' })
      model = groq('llama-3.3-70b-versatile')
    }

    let body: GenerateReplyRequest
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[Generate Reply] JSON parse error:', parseError)
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { conversationHistory, userModel, subscriberTier, fanUuid, modelId } = body

    if (!conversationHistory || conversationHistory.length === 0) {
      return NextResponse.json({ error: 'conversationHistory is required' }, { status: 400 })
    }

    // Fetch CRM notes if fanUuid and modelId are provided
    let crmNotes = ''
    if (fanUuid && modelId) {
      try {
        const adminClient = createAdminClient()
        const { data: fan } = await adminClient
          .from('fan_insights')
          .select('notes, total_spend')
          .eq('fan_id', fanUuid)
          .eq('model_id', modelId)
          .single()

        if (fan?.notes) {
          crmNotes = `\n\nCRM Notes: ${fan.notes}`
        }
        if (fan?.total_spend) {
          crmNotes += `\nTotal Spend: $${(fan.total_spend / 100).toFixed(2)}`
        }
      } catch (err) {
        console.warn('[Generate Reply] Failed to fetch CRM notes:', err)
        // Continue without notes
      }
    }

    // Build system prompt based on tier
    const tierContext = {
      whale:
        'This is a WHALE (high-value spender, $1000+). Be extra flirty, suggestive, and focus on premium PPV offers. They have money to spend.',
      spender:
        'This is a SPENDER (moderate spender, $100+). Be flirty and encourage more purchases. They are willing to spend.',
      free: 'This is a FREE user (no spend or low spend). Be friendly but focus on converting them to their first purchase. Offer entry-level PPV.',
      unknown: 'This user has unknown spending history. Be friendly and gauge their interest.',
    }

    const systemPrompt = `You are ${userModel}, a creator on Fanvue. You are flirty, engaging, and focused on selling premium content.

Your personality:
- Flirty but expensive (you know your worth)
- Conversational and natural (not robotic)
- Goal-oriented: convert conversations to sales
- Use emojis sparingly (1-2 per message max)
- Keep messages under 100 words
- Be suggestive but not explicit

${tierContext[subscriberTier]}

${crmNotes ? `\nContext about this fan:${crmNotes}` : ''}

Instructions:
- Respond naturally to the conversation
- If appropriate, suggest a PPV unlock (mention "I have something special for you" or similar)
- Match the tone of the conversation (if they're casual, be casual; if they're flirty, be flirty)
- Never be pushy or salesy
- Keep it authentic and human

Generate a reply that feels natural and engaging.`

    // Audit log (fire-and-forget)
    if (agencyId) {
      logGenerateReply(agencyId, user.id, 'generate-reply', 'copilot')
    }

    // Use Vercel AI SDK generateText (non-streaming) via OpenClaw router
    const result = await generateText({
      model,
      system: systemPrompt,
      messages: conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
      maxOutputTokens: 200,
      temperature: 0.8,
    })

    const suggestedText = result.text?.trim() || ''

    if (!suggestedText) {
      return NextResponse.json({ error: 'No reply generated' }, { status: 500 })
    }

    // Determine if we should suggest a vault item (high confidence for whales/spenders)
    const shouldSuggestVault = subscriberTier === 'whale' || subscriberTier === 'spender'
    const suggestedVaultItem = shouldSuggestVault ? null : null // TODO: Implement vault item suggestion logic

    return NextResponse.json({
      success: true,
      suggestedText,
      suggestedVaultItem,
      confidence:
        subscriberTier === 'whale' ? 'high' : subscriberTier === 'spender' ? 'medium' : 'low',
    })
  } catch (error) {
    console.error('[Generate Reply] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
