import { generateText } from 'ai'
import { groq } from '@/lib/ai/provider'
import { alfredTools } from '@/lib/ai/tools'

/**
 * Telegram Handler - The Brain Bridge
 *
 * Receives messages from Telegram and processes them through
 * Alfred's AI system with full tool access.
 */

// Alfred's system prompt for Telegram
const TELEGRAM_SYSTEM_PROMPT = `You are **Alfred**, the OnyxOS Agency Strategist, now available via Telegram.

**ROLE:** High-level consultant for agency management. Precise, data-driven, concise.

**CONTEXT:** You are chatting with an authorized agency team member via Telegram. They may ask about:
- Revenue and financial metrics
- Model performance and statistics
- Quest progress and team productivity
- Competitor analysis and market research
- Business health and KPIs

**INSTRUCTIONS:**
- Be extremely concise (Telegram messages should be short)
- Use tools to fetch LIVE data before answering financial questions
- Never guess numbers - always verify with tools
- Use emojis sparingly for emphasis
- Format responses for mobile readability (short paragraphs)
- If asked about a URL or profile, use scrape_web tool

**AVAILABLE TOOLS:**
- get_agency_financials: Revenue, expenses, profit
- get_model_stats: Model performance metrics
- check_quest_status: Team productivity
- get_expense_summary: Spending breakdown
- get_payroll_overview: Salaries and commissions
- get_watched_accounts: Competitor/slave account data
- analyze_business_health: KPI analysis with insights
- scrape_web: Read any public webpage
- analyze_social_profile: Check social media profiles

**OUTPUT FORMAT:**
- Keep messages under 300 words
- Use line breaks for readability
- Bold key numbers and metrics
- End with actionable insight when relevant`

/**
 * Process a message from Telegram through Alfred's AI
 */
export async function processAlfredMessage(
  message: string,
  userId: string,
  username?: string
): Promise<string> {
  try {
    console.log(
      `[Telegram] Processing message from ${username || userId}: ${message.substring(0, 50)}...`
    )

    // Generate response using Groq with tools
    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: TELEGRAM_SYSTEM_PROMPT,
      prompt: message,
      tools: alfredTools,
      temperature: 0.7,
    })

    // Extract the final text response
    let response = result.text

    // If response is empty, check for tool results
    if (!response && result.toolResults && result.toolResults.length > 0) {
      response = "I've gathered the data. Let me analyze it for you..."
    }

    // Fallback if still empty
    if (!response) {
      response = "I apologize, I couldn't process that request. Please try rephrasing."
    }

    // Truncate if too long for Telegram
    if (response.length > 4000) {
      response = response.substring(0, 3900) + '\n\n... (truncated for Telegram)'
    }

    console.log(`[Telegram] Response generated (${response.length} chars)`)
    return response
  } catch (error) {
    console.error('[Telegram] Error processing message:', error)

    // Return user-friendly error message
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return '⚠️ Rate limit reached. Please wait a moment and try again.'
      }
      if (error.message.includes('API key')) {
        return '⚠️ AI service configuration error. Please contact admin.'
      }
    }

    return '❌ Sorry, I encountered an error processing your request. Please try again.'
  }
}

/**
 * Format a quick status response
 */
export function getQuickStatus(): string {
  return `🤖 **Alfred Online**
  
I'm your OnyxOS AI Strategist, ready to help with:

📊 Revenue & Analytics
👥 Model Performance  
🎯 Quest Progress
🔍 Competitor Research
💰 Business Health

Just ask me anything!`
}

/**
 * Format an unauthorized response
 */
export function getUnauthorizedResponse(): string {
  return `⛔ **Unauthorized**

This bot is restricted to authorized OnyxOS users only.

If you believe this is an error, please contact your agency administrator.`
}

/**
 * Format a help response
 */
export function getHelpResponse(): string {
  return `📚 **Alfred Commands**

Just send me a message with your question. Examples:

💰 "How much revenue did we make this month?"
📈 "Show me Lana's stats"
🎯 "What's our quest progress?"
🔍 "Check @competitor on Instagram"
🏥 "Analyze our business health"

I'll use real-time data to answer your questions.

**Pro Tips:**
• Be specific about time periods
• Mention model names for targeted info
• Ask "why" for insights, not just numbers`
}
