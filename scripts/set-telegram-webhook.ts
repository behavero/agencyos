/**
 * Script: Set Telegram Webhook
 *
 * This script registers the OnyxOS webhook URL with Telegram.
 * Run once after deployment: npx ts-node scripts/set-telegram-webhook.ts
 *
 * Prerequisites:
 * - TELEGRAM_BOT_TOKEN in .env.local
 * - App deployed to Vercel (webhook URL must be accessible)
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://onyxos.vercel.app'

async function setWebhook() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set')
    process.exit(1)
  }

  const webhookEndpoint = `${WEBHOOK_URL}/api/webhooks/telegram`
  const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`

  console.log('🤖 Setting Telegram webhook...')
  console.log(`📍 Webhook URL: ${webhookEndpoint}`)

  try {
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookEndpoint,
        allowed_updates: ['message'],
      }),
    })

    const data = await response.json()

    if (data.ok) {
      console.log('✅ Webhook set successfully!')
      console.log('📋 Response:', JSON.stringify(data, null, 2))
    } else {
      console.error('❌ Failed to set webhook:', data.description)
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error setting webhook:', error)
    process.exit(1)
  }
}

setWebhook()
