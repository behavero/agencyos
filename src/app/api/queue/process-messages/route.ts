import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'

// Prevent timeout - process in batches
export const maxDuration = 60

/**
 * Mass Message Queue Processor
 * Polls the mass_messages table and sends pending messages
 * 
 * Called by:
 * - Supabase pg_cron (every 5 minutes)
 * - Vercel Cron
 * - Manual trigger
 */
export async function POST(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  const isAuthorized = 
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (serviceKey && authHeader === `Bearer ${serviceKey}`)
  
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const results: { id: string; success: boolean; error?: string }[] = []
  const batchSize = 5 // Process 5 messages per run

  try {
    // Fetch pending messages (oldest first)
    const { data: pendingMessages, error: fetchError } = await adminClient
      .from('mass_messages')
      .select(`
        *,
        models!inner(fanvue_access_token, name)
      `)
      .eq('status', 'pending')
      .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`)
      .order('created_at', { ascending: true })
      .limit(batchSize)

    if (fetchError) {
      throw new Error(`Failed to fetch pending messages: ${fetchError.message}`)
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No pending messages',
        processed: 0,
      })
    }

    console.log(`[QUEUE] Processing ${pendingMessages.length} messages`)

    // Process each message
    for (const message of pendingMessages) {
      try {
        // Mark as processing
        await adminClient
          .from('mass_messages')
          .update({ 
            status: 'processing',
            started_at: new Date().toISOString(),
          })
          .eq('id', message.id)

        const accessToken = message.models?.fanvue_access_token
        if (!accessToken) {
          throw new Error('No Fanvue access token available')
        }

        const fanvue = createFanvueClient(accessToken)

        // Send the mass message
        await fanvue.sendMassMessage({
          text: message.content,
          mediaUuids: message.media_ids || [],
          price: message.price,
          includedLists: message.included_lists || {},
          excludedLists: message.excluded_lists || {},
        })

        // Mark as completed
        await adminClient
          .from('mass_messages')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', message.id)

        results.push({ id: message.id, success: true })
        console.log(`[QUEUE] Sent mass message ${message.id}`)

      } catch (messageError) {
        const errorMessage = messageError instanceof Error 
          ? messageError.message 
          : 'Unknown error'

        // Mark as failed
        await adminClient
          .from('mass_messages')
          .update({
            status: 'failed',
            error_message: errorMessage,
            completed_at: new Date().toISOString(),
          })
          .eq('id', message.id)

        results.push({ id: message.id, success: false, error: errorMessage })
        console.error(`[QUEUE] Failed message ${message.id}:`, errorMessage)
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful,
      failed,
      results,
    })

  } catch (error) {
    console.error('[QUEUE] Fatal error:', error)
    return NextResponse.json(
      { 
        error: 'Queue processing failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    info: 'Mass message queue processor. Send POST with Authorization header to process pending messages.',
  })
}
