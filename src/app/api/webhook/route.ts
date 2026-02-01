import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-fanvue-signature')
    const body = await request.text()

    // Verify webhook signature
    const secret = process.env.FANVUE_WEBHOOK_SECRET!
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    const supabase = await createClient()

    // Handle different webhook events
    switch (event.type) {
      case 'transaction.created':
      case 'tip.received':
      case 'purchase.received':
        // Update treasury
        const amount = event.data.amount || 0
        await supabase.rpc('increment_treasury', { increment_amount: amount })
        
        // Check for whale alert
        if (amount > 100) {
          console.log('🐋 WHALE ALERT:', amount)
          // Trigger whale alert notification
        }
        break

      case 'subscription.created':
      case 'subscription.renewed':
        console.log('💎 New subscription:', event.data)
        break

      case 'message.received':
        console.log('💬 New message:', event.data)
        break
    }

    // Log webhook
    await supabase.from('webhook_logs').insert({
      event_type: event.type,
      payload: event,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
