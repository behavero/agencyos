import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'

/**
 * Messages API for a specific creator
 * - GET: Fetch chats/messages
 * - POST: Send a message to a fan
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const size = parseInt(searchParams.get('size') || '20')

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    
    // Get creator's tokens
    const { data: model } = await adminClient
      .from('models')
      .select('fanvue_access_token')
      .eq('id', id)
      .single()

    if (!model?.fanvue_access_token) {
      return NextResponse.json({ error: 'Creator not connected' }, { status: 400 })
    }

    const fanvue = createFanvueClient(model.fanvue_access_token)
    const chats = await fanvue.getChats({ page, size })

    return NextResponse.json(chats)

  } catch (error: any) {
    console.error('[Messages API] GET Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { fanUuid, content, mediaIds, price } = body

  if (!fanUuid || !content) {
    return NextResponse.json(
      { error: 'fanUuid and content are required' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    
    // Get creator's tokens
    const { data: model } = await adminClient
      .from('models')
      .select('fanvue_access_token, name')
      .eq('id', id)
      .single()

    if (!model?.fanvue_access_token) {
      return NextResponse.json({ error: 'Creator not connected' }, { status: 400 })
    }

    const fanvue = createFanvueClient(model.fanvue_access_token)

    // Create or get existing chat
    let chat
    try {
      chat = await fanvue.createChat(fanUuid)
    } catch (e) {
      // Chat might already exist, try to get it
      console.log('[Messages API] Chat creation failed, might exist already')
    }

    // If we have a chat UUID, send the message
    if (chat?.uuid) {
      const result = await fanvue.sendMessage(chat.uuid, {
        content,
        mediaIds,
        price,
      })

      return NextResponse.json({
        success: true,
        message: 'Message sent successfully',
        ...result,
      })
    }

    return NextResponse.json(
      { error: 'Could not create or find chat' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('[Messages API] POST Error:', error)
    
    // Handle rate limiting
    if (error.statusCode === 429) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please wait before trying again.',
        },
        { status: 429 }
      )
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
