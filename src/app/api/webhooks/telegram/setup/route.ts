import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/webhooks/telegram/setup
 * 
 * Triggers the webhook setup with Telegram API.
 * Visit this URL once after deployment to activate the bot.
 */
export async function GET(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN

  if (!token) {
    return NextResponse.json({
      success: false,
      error: 'TELEGRAM_BOT_TOKEN not configured',
      instructions: [
        '1. Message @BotFather on Telegram',
        '2. Run /newbot command',
        '3. Copy the token',
        '4. Add to Vercel Environment Variables as TELEGRAM_BOT_TOKEN',
        '5. Redeploy and visit this URL again',
      ],
    }, { status: 400 })
  }

  // Determine webhook URL
  const host = request.headers.get('host') || 'onyxos.vercel.app'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const webhookUrl = `${protocol}://${host}/api/webhooks/telegram`

  try {
    // Set the webhook with Telegram
    const telegramUrl = `https://api.telegram.org/bot${token}/setWebhook`
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true,
      }),
    })

    const result = await response.json()

    if (result.ok) {
      // Get bot info
      const meResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`)
      const meResult = await meResponse.json()

      return NextResponse.json({
        success: true,
        message: 'Webhook set successfully! 🎉',
        webhookUrl,
        bot: meResult.ok ? {
          username: meResult.result.username,
          firstName: meResult.result.first_name,
          canJoinGroups: meResult.result.can_join_groups,
        } : null,
        nextSteps: [
          '1. Get your Telegram User ID by messaging @userinfobot',
          '2. Add TELEGRAM_ALLOWED_USERS=your_id to Vercel env vars',
          `3. Message @${meResult.result?.username || 'your_bot'} on Telegram`,
          '4. Send /start to begin',
        ],
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.description || 'Failed to set webhook',
        telegramResponse: result,
      }, { status: 400 })
    }
  } catch (error) {
    console.error('[Telegram Setup] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Telegram API',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

/**
 * DELETE /api/webhooks/telegram/setup
 * 
 * Removes the webhook (useful for debugging)
 */
export async function DELETE() {
  const token = process.env.TELEGRAM_BOT_TOKEN

  if (!token) {
    return NextResponse.json({
      success: false,
      error: 'TELEGRAM_BOT_TOKEN not configured',
    }, { status: 400 })
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`)
    const result = await response.json()

    return NextResponse.json({
      success: result.ok,
      message: result.ok ? 'Webhook removed' : result.description,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to remove webhook',
    }, { status: 500 })
  }
}
