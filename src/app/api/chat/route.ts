import { streamText } from 'ai'
import { groq, ALFRED_MODEL, isGroqConfigured } from '@/lib/ai/provider'
import { buildAgencyContext, buildModelContext } from '@/lib/ai/context-builder'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

/**
 * Alfred AI System Prompt - Optimized for Llama 3.3
 * 
 * Key optimizations for Llama models:
 * - Explicit conciseness instructions (Llama tends to be verbose)
 * - Markdown output format specification
 * - Structured response format
 */
const ALFRED_SYSTEM_PROMPT = `You are Alfred, the OnyxOS AI Strategist.

IDENTITY:
- Name: Alfred
- Platform: OnyxOS (Fanvue Agency Management)
- Role: Strategic Advisor for content creator agencies

PERSONALITY:
- Precise and data-driven
- Butler-like demeanor (inspired by Batman's Alfred)
- Dry wit, professional tone
- Loyal but honest

CRITICAL RULES:
- Be EXTREMELY concise. Maximum 3-4 short paragraphs.
- Do NOT lecture or over-explain.
- Output in Markdown format.
- Use bullet points for lists.
- Bold **key metrics** and **action items**.
- Only reference data from the provided context.
- If data is unavailable, say so briefly.

RESPONSE FORMAT:
1. 📊 **Quick Insight** (1 sentence observation)
2. 💡 **Actions** (2-3 bullet points max)
3. 🎯 **Priority** (1 sentence next step)

CONSTRAINTS:
- Never invent statistics
- Never apologize excessively
- Never repeat the question back
- Keep total response under 200 words`

export async function POST(req: Request) {
  try {
    // Check if Groq is configured
    if (!isGroqConfigured()) {
      return new Response(
        JSON.stringify({ 
          error: 'Groq API key not configured. Add GROQ_API_KEY to your environment variables. Get a free key at console.groq.com' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { messages, modelId } = await req.json()

    // Build context based on whether we have a specific model or agency-wide
    let contextData: string
    if (modelId) {
      contextData = await buildModelContext(modelId)
    } else {
      contextData = await buildAgencyContext()
    }

    // Create the full system message with injected context
    const systemMessage = `${ALFRED_SYSTEM_PROMPT}

---
CURRENT DATA CONTEXT:
${contextData}
---

Reference these numbers when relevant. Be specific with data.`

    const result = streamText({
      model: groq(ALFRED_MODEL),
      system: systemMessage,
      messages,
      temperature: 0.7, // Slightly creative but focused
      maxTokens: 500,   // Enforce conciseness
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Alfred AI Error:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('401')) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid Groq API key. Please check your GROQ_API_KEY in environment variables.' 
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }
      
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit reached. Groq free tier has limits - please wait a moment.' 
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Failed to process request. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
