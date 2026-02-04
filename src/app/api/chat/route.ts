import { streamText } from 'ai'
import { groq, CLAW_MODEL, CLAW_SYSTEM_PROMPT, isGroqConfigured } from '@/lib/ai/provider'
import { alfredTools } from '@/lib/ai/tools'

// Allow streaming responses up to 90 seconds (web scraping may take longer)
export const maxDuration = 90

/**
 * CLAW AI System Prompt - Phase 70
 * Imported from provider.ts for consistency
 */

export async function POST(req: Request) {
  try {
    // Check if Groq is configured
    if (!isGroqConfigured()) {
      return new Response(
        JSON.stringify({
          error:
            'Groq API key not configured. Add GROQ_API_KEY to your environment variables. Get a free key at console.groq.com',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { messages } = await req.json()

    // Stream the response with tools
    const result = streamText({
      model: groq(CLAW_MODEL),
      system: CLAW_SYSTEM_PROMPT,
      messages,
      tools: alfredTools,
      temperature: 0.7,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('CLAW AI Error:', error)

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('401')) {
        return new Response(
          JSON.stringify({
            error: 'Invalid Groq API key. Please check your GROQ_API_KEY in environment variables.',
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit reached. Groq free tier has limits - please wait a moment.',
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (error.message.includes('tool') || error.message.includes('function')) {
        return new Response(
          JSON.stringify({
            error: 'Tool execution error. Some data may be unavailable.',
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(JSON.stringify({ error: 'Failed to process request. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
