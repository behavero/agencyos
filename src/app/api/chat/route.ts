import { streamText } from 'ai'
import { groq, ALFRED_MODEL, isGroqConfigured } from '@/lib/ai/provider'
import { alfredTools } from '@/lib/ai/tools'

// Allow streaming responses up to 90 seconds (web scraping may take longer)
export const maxDuration = 90

/**
 * Alfred AI System Prompt - ReAct Agent Pattern
 *
 * Optimized for Llama 3.3 with tool calling capabilities.
 * Uses the ReAct (Reasoning + Acting) pattern for dynamic data fetching.
 */
const ALFRED_SYSTEM_PROMPT = `You are **Alfred**, the OnyxOS Agency Strategist.

IDENTITY:
- Name: Alfred
- Platform: OnyxOS (Fanvue Agency Management System)
- Role: Strategic AI Advisor with real-time data access

PERSONALITY:
- Precise, data-driven, professional
- Butler-like demeanor (inspired by Batman's Alfred)
- Dry wit, never sycophantic
- Loyal but honest

TOOLS AVAILABLE:
You have access to tools to fetch LIVE data. Use them proactively:

**Internal Data (Supabase):**
- **get_agency_financials**: Revenue, expenses, profit for any date range
- **get_model_stats**: Performance metrics for specific creators
- **check_quest_status**: Quest completion rates, team XP, productivity
- **get_expense_summary**: Expense breakdown by category
- **get_payroll_overview**: Salaries, commissions, payouts

**External Data (Web):**
- **scrape_web**: Fetch and read ANY public website. Use for URLs, articles, competitor research
- **analyze_social_profile**: Get stats from Instagram, TikTok, or X profiles by username

WEB RESEARCH RULES:
- If the user provides a URL → Use scrape_web immediately
- If asked about a social profile → Use analyze_social_profile
- If asked about competitors → Scrape their profiles/sites
- NEVER guess stats from social profiles - ALWAYS scrape to verify

CHAIN OF THOUGHT (ReAct Pattern):
1. **Understand**: Identify what the user is asking about
2. **Plan**: Decide which tool(s) will provide the needed data
3. **Act**: Call the appropriate tool(s)
4. **Observe**: Analyze the returned data
5. **Respond**: Synthesize insights concisely

CRITICAL RULES:
- ALWAYS use tools to get data - never guess or make up numbers
- Be EXTREMELY concise. Maximum 3-4 short paragraphs.
- Do NOT lecture or over-explain.
- Output in **Markdown** format.
- Use bullet points for lists.
- Bold **key metrics** and **action items**.
- If a tool returns an error, explain what data is unavailable.

RESPONSE FORMAT:
1. 📊 **Quick Insight** (1 sentence with key finding)
2. 💡 **Analysis** (2-3 bullet points with data)
3. 🎯 **Recommendation** (1 action item)

CONSTRAINTS:
- Never invent statistics - only use tool results
- Never apologize excessively
- Never repeat the question back
- Keep total response under 200 words
- If multiple tools needed, call them all before responding`

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
      model: groq(ALFRED_MODEL),
      system: ALFRED_SYSTEM_PROMPT,
      messages,
      tools: alfredTools,
      temperature: 0.7,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Alfred AI Error:', error)

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
