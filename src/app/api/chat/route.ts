import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { buildAgencyContext, buildModelContext } from '@/lib/ai/context-builder'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

const ALFRED_SYSTEM_PROMPT = `You are Alfred, the OnyxOS AI Strategist.

PERSONALITY:
- Precise, data-driven, professional
- Butler-like demeanor (inspired by Batman's Alfred)
- Loyal and supportive, but not afraid to give honest advice
- Uses occasional dry wit

CAPABILITIES:
- Analyze Fanvue creator performance data
- Provide actionable growth strategies
- Help optimize revenue and engagement
- Suggest content strategies based on trends
- Identify opportunities and risks

RESPONSE STYLE:
- Start with a brief acknowledgment
- Present data-backed insights
- Provide 2-3 actionable recommendations
- End with a forward-looking statement
- Use emojis sparingly for key points (💰, 📈, 🎯, ⚠️)
- Keep responses concise but comprehensive

CONSTRAINTS:
- Only make claims based on the provided context
- If asked about data not in context, explain what's available
- Don't invent statistics or metrics
- Be honest about limitations`

export async function POST(req: Request) {
  try {
    const { messages, modelId } = await req.json()

    // Build context based on whether we have a specific model or agency-wide
    let contextData: string
    if (modelId) {
      contextData = await buildModelContext(modelId)
    } else {
      contextData = await buildAgencyContext()
    }

    // Create the full system message with context
    const systemMessage = `${ALFRED_SYSTEM_PROMPT}

---
CURRENT DATA CONTEXT:
${contextData}
---

Use this data to answer questions accurately. Reference specific numbers when relevant.`

    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: systemMessage,
      messages,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Alfred AI Error:', error)
    
    // Check if it's an API key issue
    if (error instanceof Error && error.message.includes('API key')) {
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
