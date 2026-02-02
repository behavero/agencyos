import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { FanvueClient } from '@/lib/fanvue/client'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * Queue Processor - The Throttler
 * Processes pending messages from the marketing queue
 * Runs every 5-10 minutes via cron
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const now = new Date()

    // Fetch top 50 pending messages scheduled for now or earlier
    const { data: messages, error: fetchError } = await supabase
      .from('message_queue')
      .select('*, model:models(fanvue_api_key)')
      .eq('status', 'pending')
      .lte('scheduled_for', now.toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(50)

    if (fetchError) {
      console.error('[Queue Processor] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'Queue is empty' })
    }

    console.log(`[Queue Processor] Processing ${messages.length} messages`)

    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const msg of messages) {
      try {
        // Mark as processing
        await supabase
          .from('message_queue')
          .update({ status: 'processing', processed_at: now.toISOString() })
          .eq('id', msg.id)

        // Get API key from model
        const model = msg.model as { fanvue_api_key: string | null }
        if (!model?.fanvue_api_key) {
          throw new Error('Model API key not configured')
        }

        // Initialize Fanvue client
        const fanvueClient = new FanvueClient(model.fanvue_api_key)

        // Extract payload
        const { message, media_id, price } = msg.payload as {
          message: string
          media_id?: string
          price?: number
        }

        // Send message to fan
        await fanvueClient.sendMessage(msg.fan_id, {
          text: message,
          mediaUuids: media_id ? [media_id] : undefined,
          price,
        })

        // Mark as sent
        await supabase
          .from('message_queue')
          .update({ status: 'sent', processed_at: new Date().toISOString() })
          .eq('id', msg.id)

        sent++

        // Human-like delay: Random 1-5 seconds between messages
        const delay = Math.floor(Math.random() * 4000) + 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      } catch (error) {
        console.error(`[Queue Processor] Failed to send message ${msg.id}:`, error)

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const isRateLimit = errorMessage.includes('429') || errorMessage.includes('rate limit')

        // Update retry count
        const newRetryCount = (msg.retry_count || 0) + 1
        const shouldRetry = newRetryCount < 3 && !isRateLimit

        if (shouldRetry) {
          // Reschedule for 5 minutes later
          const retryAt = new Date(Date.now() + 5 * 60 * 1000)
          await supabase
            .from('message_queue')
            .update({
              status: 'pending',
              retry_count: newRetryCount,
              scheduled_for: retryAt.toISOString(),
              error_message: errorMessage,
            })
            .eq('id', msg.id)
        } else {
          // Mark as failed permanently
          await supabase
            .from('message_queue')
            .update({
              status: 'failed',
              error_message: errorMessage,
              processed_at: new Date().toISOString(),
            })
            .eq('id', msg.id)

          failed++
          errors.push(`Fan ${msg.fan_id}: ${errorMessage}`)
        }

        // If rate limited, pause processing
        if (isRateLimit) {
          console.log('[Queue Processor] Rate limit detected, pausing...')
          break
        }
      }
    }

    // Update campaign statuses if all messages processed
    if (messages.length > 0) {
      const campaignIds = [...new Set(messages.map(m => m.campaign_id).filter(Boolean))]
      for (const campaignId of campaignIds) {
        if (!campaignId) continue

        const { data: queueStatus } = await supabase
          .from('message_queue')
          .select('status')
          .eq('campaign_id', campaignId)

        const allProcessed = queueStatus?.every(q => q.status === 'sent' || q.status === 'failed')

        if (allProcessed) {
          await supabase
            .from('marketing_campaigns')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', campaignId)
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: sent + failed,
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('[Queue Processor] Fatal error:', error)
    const message = error instanceof Error ? error.message : 'Queue processing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
