import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { processMessage } from '@/lib/alfred/runtime'

/**
 * Alfred - The Agency AI Strategist
 * 
 * Now powered by the new Alfred Runtime with:
 * - Real agency context injection
 * - Skills/Tools system (OpenClaw pattern)
 * - Smart response generation
 * 
 * @see https://docs.openclaw.ai/concepts/agent-runtime
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Process message through Alfred Runtime
    const response = await processMessage({
      userId: user.id,
      message,
    })

    return NextResponse.json({
      response: response.content,
      messageId: response.id,
      timestamp: response.timestamp.toISOString(),
      metadata: response.metadata,
    })

  } catch (error: any) {
    console.error('[Alfred] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    )
  }
}
