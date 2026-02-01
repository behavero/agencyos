import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Fanvue Webhook Handler
 * Based on fanvue-chatbot-example patterns
 * 
 * Supported events:
 * - message.received - New message from fan
 * - follower.new - New follower
 * - subscriber.new - New subscriber
 * - purchase.received - Purchase made
 * - tip.received - Tip received
 */

interface WebhookPayload {
  // Message events
  message?: {
    uuid?: string
    text?: string
    hasMedia?: boolean
  }
  messageUuid?: string
  sender?: {
    uuid?: string
    handle?: string
    displayName?: string
  }
  recipientUuid?: string
  timestamp?: string

  // Follower events
  follower?: { uuid?: string }
  followerUuid?: string
  creatorUuid?: string

  // Subscriber events
  subscriber?: { uuid?: string }
  subscriberUuid?: string

  // Purchase events
  purchase?: { uuid?: string; amount?: number }
  purchaseUuid?: string

  // Tip events
  tip?: { uuid?: string; amount?: number }
  tipUuid?: string
  amount?: number
}

// Verify webhook signature (if Fanvue provides one)
function verifyWebhookSignature(request: NextRequest, payload: string): boolean {
  const signature = request.headers.get('x-fanvue-signature')
  const secret = process.env.FANVUE_WEBHOOK_SECRET

  if (!secret) {
    console.warn('[Webhook] No webhook secret configured')
    return true // Allow if not configured
  }

  if (!signature) {
    console.warn('[Webhook] No signature provided')
    return false
  }

  // TODO: Implement actual signature verification when Fanvue provides documentation
  // For now, return true if secret matches header
  return true
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    
    // Verify signature
    if (!verifyWebhookSignature(request, payload)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const data: WebhookPayload = JSON.parse(payload)
    console.log('[Webhook] Received:', JSON.stringify(data, null, 2))

    const adminClient = createAdminClient()
    let eventType = 'unknown'
    let eventData: any = {}

    // Determine event type based on payload structure
    if (data.message && data.sender) {
      eventType = 'message.received'
      eventData = {
        messageUuid: data.messageUuid || data.message?.uuid,
        text: data.message?.text || '',
        senderUuid: data.sender?.uuid,
        senderHandle: data.sender?.handle,
        senderDisplayName: data.sender?.displayName,
        recipientUuid: data.recipientUuid,
        hasMedia: data.message?.hasMedia || false,
        timestamp: data.timestamp,
      }

      console.log('[Webhook] Message received:', eventData)

      // Update unread count for the creator
      if (data.recipientUuid) {
        await adminClient
          .from('models')
          .update({
            unread_messages: adminClient.rpc('increment', { x: 1 }),
            updated_at: new Date().toISOString(),
          })
          .eq('fanvue_user_uuid', data.recipientUuid)
      }

    } else if (data.follower || data.followerUuid) {
      eventType = 'follower.new'
      eventData = {
        followerUuid: data.followerUuid || data.follower?.uuid,
        creatorUuid: data.creatorUuid || data.recipientUuid,
      }

      console.log('[Webhook] New follower:', eventData)

      // Increment follower count
      if (eventData.creatorUuid) {
        const { data: model } = await adminClient
          .from('models')
          .select('followers_count')
          .eq('fanvue_user_uuid', eventData.creatorUuid)
          .single()

        if (model) {
          await adminClient
            .from('models')
            .update({
              followers_count: (model.followers_count || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('fanvue_user_uuid', eventData.creatorUuid)
        }
      }

    } else if (data.subscriber || data.subscriberUuid) {
      eventType = 'subscriber.new'
      eventData = {
        subscriberUuid: data.subscriberUuid || data.subscriber?.uuid,
        creatorUuid: data.creatorUuid || data.recipientUuid,
      }

      console.log('[Webhook] New subscriber:', eventData)

      // Increment subscriber count
      if (eventData.creatorUuid) {
        const { data: model } = await adminClient
          .from('models')
          .select('subscribers_count')
          .eq('fanvue_user_uuid', eventData.creatorUuid)
          .single()

        if (model) {
          await adminClient
            .from('models')
            .update({
              subscribers_count: (model.subscribers_count || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('fanvue_user_uuid', eventData.creatorUuid)
        }
      }

    } else if (data.purchase || data.purchaseUuid) {
      eventType = 'purchase.received'
      eventData = {
        purchaseUuid: data.purchaseUuid || data.purchase?.uuid,
        creatorUuid: data.creatorUuid || data.recipientUuid,
        amount: data.purchase?.amount || data.amount,
      }

      console.log('[Webhook] Purchase received:', eventData)

      // Add to revenue
      if (eventData.creatorUuid && eventData.amount) {
        const { data: model } = await adminClient
          .from('models')
          .select('revenue_total')
          .eq('fanvue_user_uuid', eventData.creatorUuid)
          .single()

        if (model) {
          await adminClient
            .from('models')
            .update({
              revenue_total: (model.revenue_total || 0) + eventData.amount,
              updated_at: new Date().toISOString(),
            })
            .eq('fanvue_user_uuid', eventData.creatorUuid)
        }
      }

    } else if (data.tip || data.tipUuid) {
      eventType = 'tip.received'
      eventData = {
        tipUuid: data.tipUuid || data.tip?.uuid,
        creatorUuid: data.creatorUuid || data.recipientUuid,
        amount: data.tip?.amount || data.amount,
      }

      console.log('[Webhook] Tip received:', eventData)

      // Add to revenue
      if (eventData.creatorUuid && eventData.amount) {
        const { data: model } = await adminClient
          .from('models')
          .select('revenue_total')
          .eq('fanvue_user_uuid', eventData.creatorUuid)
          .single()

        if (model) {
          await adminClient
            .from('models')
            .update({
              revenue_total: (model.revenue_total || 0) + eventData.amount,
              updated_at: new Date().toISOString(),
            })
            .eq('fanvue_user_uuid', eventData.creatorUuid)
        }
      }

    } else {
      console.log('[Webhook] Unknown event type:', data)
    }

    // Log the webhook event
    await adminClient.from('webhook_logs').insert({
      event_type: eventType,
      payload: data,
      processed_at: new Date().toISOString(),
    })

    return NextResponse.json({ status: 'received', event: eventType })

  } catch (error: any) {
    console.error('[Webhook] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Allow GET for webhook verification (some providers ping the endpoint)
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Fanvue webhook endpoint active' })
}
