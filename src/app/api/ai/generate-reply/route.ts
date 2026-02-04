import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

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
 * Generates a GFE-style (Girlfriend Experience) reply using Groq (Llama-3.3-70b)
 * for chat conversations.
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

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
    }

    const body: GenerateReplyRequest = await request.json()
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

    // Prepare messages for Groq API
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    ]

    // Call Groq API
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.8,
        max_tokens: 200,
        top_p: 0.9,
      }),
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error('[Generate Reply] Groq API error:', errorText)
      return NextResponse.json(
        { error: 'Failed to generate reply', details: errorText },
        { status: groqResponse.status }
      )
    }

    const groqData = await groqResponse.json()
    const suggestedText = groqData.choices?.[0]?.message?.content?.trim() || ''

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
