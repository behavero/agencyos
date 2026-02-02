import { NextRequest, NextResponse } from 'next/server'
import { Bot, webhookCallback } from 'grammy'
import { 
  processAlfredMessage, 
  getQuickStatus, 
  getUnauthorizedResponse,
  getHelpResponse 
} from '@/lib/alfred/telegram-handler'

/**
 * Telegram Webhook Handler
 * 
 * Receives updates from Telegram Bot API and routes them to Alfred.
 * 
 * Security: Only allows messages from authorized user IDs.
 * 
 * Setup:
 * 1. Create bot with @BotFather
 * 2. Add TELEGRAM_BOT_TOKEN to .env.local
 * 3. Add TELEGRAM_ALLOWED_USERS to .env.local (comma-separated IDs)
 * 4. Set webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://onyxos.vercel.app/api/webhooks/telegram
 */

// Initialize bot (lazy - only when needed)
let bot: Bot | null = null

function getBot(): Bot {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured')
    }
    bot = new Bot(token)
    setupBotHandlers(bot)
  }
  return bot
}

// Get allowed user IDs
function getAllowedUsers(): Set<string> {
  const allowedStr = process.env.TELEGRAM_ALLOWED_USERS || ''
  return new Set(
    allowedStr.split(',').map(id => id.trim()).filter(Boolean)
  )
}

// Check if user is authorized
function isAuthorized(userId: number): boolean {
  const allowed = getAllowedUsers()
  
  // If no users configured, block everyone
  if (allowed.size === 0) {
    console.warn('[Telegram] No TELEGRAM_ALLOWED_USERS configured')
    return false
  }
  
  return allowed.has(userId.toString())
}

// Setup bot message handlers
function setupBotHandlers(bot: Bot) {
  // Handle /start command
  bot.command('start', async (ctx) => {
    if (!isAuthorized(ctx.from?.id || 0)) {
      await ctx.reply(getUnauthorizedResponse(), { parse_mode: 'Markdown' })
      return
    }
    await ctx.reply(getQuickStatus(), { parse_mode: 'Markdown' })
  })

  // Handle /help command
  bot.command('help', async (ctx) => {
    if (!isAuthorized(ctx.from?.id || 0)) {
      await ctx.reply(getUnauthorizedResponse(), { parse_mode: 'Markdown' })
      return
    }
    await ctx.reply(getHelpResponse(), { parse_mode: 'Markdown' })
  })

  // Handle /status command
  bot.command('status', async (ctx) => {
    if (!isAuthorized(ctx.from?.id || 0)) {
      await ctx.reply(getUnauthorizedResponse(), { parse_mode: 'Markdown' })
      return
    }
    
    // Quick status via Alfred
    const response = await processAlfredMessage(
      'Give me a quick business health summary with key metrics',
      ctx.from?.id.toString() || 'unknown',
      ctx.from?.username
    )
    await ctx.reply(response, { parse_mode: 'Markdown' })
  })

  // Handle regular text messages
  bot.on('message:text', async (ctx) => {
    const userId = ctx.from?.id || 0
    const username = ctx.from?.username
    const message = ctx.message.text

    // Security check
    if (!isAuthorized(userId)) {
      console.log(`[Telegram] Unauthorized access attempt from ${userId} (@${username})`)
      await ctx.reply(getUnauthorizedResponse(), { parse_mode: 'Markdown' })
      return
    }

    // Show typing indicator
    await ctx.replyWithChatAction('typing')

    try {
      // Process through Alfred
      const response = await processAlfredMessage(
        message,
        userId.toString(),
        username
      )

      // Send response (handle Markdown parse errors gracefully)
      try {
        await ctx.reply(response, { parse_mode: 'Markdown' })
      } catch (parseError) {
        // If Markdown fails, send as plain text
        console.warn('[Telegram] Markdown parse failed, sending plain text')
        await ctx.reply(response)
      }
    } catch (error) {
      console.error('[Telegram] Error handling message:', error)
      await ctx.reply('❌ Sorry, I encountered an error. Please try again.')
    }
  })

  // Handle errors
  bot.catch((err) => {
    console.error('[Telegram] Bot error:', err)
  })
}

/**
 * POST /api/webhooks/telegram
 * Webhook endpoint for Telegram Bot API
 */
export async function POST(request: NextRequest) {
  try {
    // Check if bot token is configured
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.error('[Telegram] TELEGRAM_BOT_TOKEN not configured')
      return NextResponse.json(
        { error: 'Bot not configured' },
        { status: 500 }
      )
    }

    // Get the bot instance
    const botInstance = getBot()

    // Create webhook handler
    const handleUpdate = webhookCallback(botInstance, 'std/http')

    // Process the webhook
    return await handleUpdate(request)
  } catch (error) {
    console.error('[Telegram] Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks/telegram
 * Health check and setup instructions
 */
export async function GET() {
  const isConfigured = !!process.env.TELEGRAM_BOT_TOKEN
  const hasUsers = (process.env.TELEGRAM_ALLOWED_USERS || '').length > 0

  return NextResponse.json({
    status: isConfigured ? 'configured' : 'not_configured',
    hasAllowedUsers: hasUsers,
    webhookUrl: 'https://onyxos.vercel.app/api/webhooks/telegram',
    setup: {
      step1: 'Message @BotFather on Telegram',
      step2: 'Run /newbot and follow prompts',
      step3: 'Copy token to TELEGRAM_BOT_TOKEN env var',
      step4: 'Message @userinfobot to get your user ID',
      step5: 'Add your ID to TELEGRAM_ALLOWED_USERS env var',
      step6: 'Set webhook by visiting the URL below',
    },
    setWebhookUrl: isConfigured 
      ? `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook?url=https://onyxos.vercel.app/api/webhooks/telegram`
      : 'Configure TELEGRAM_BOT_TOKEN first',
  })
}
