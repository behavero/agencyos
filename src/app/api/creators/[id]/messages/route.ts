import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'
import { getModelAccessToken } from '@/lib/services/fanvue-auth'

/**
 * Messages API for a specific creator
 * - GET: Fetch chats/messages
 * - POST: Send a message to a fan
 */

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const size = parseInt(searchParams.get('size') || '20')

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get creator's access token (auto-refreshes if expired)
    let accessToken: string
    try {
      accessToken = await getModelAccessToken(id)
    } catch (error) {
      return NextResponse.json({ error: 'Creator not connected' }, { status: 400 })
    }

    const fanvue = createFanvueClient(accessToken)
    const chats = await fanvue.getChats({ page, size })

    return NextResponse.json(chats)
  } catch (error) {
    console.error('[Messages API] GET Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const { userUuid, text, mediaUuids, price, templateUuid } = body

  if (!userUuid) {
    return NextResponse.json({ error: 'userUuid is required' }, { status: 400 })
  }

  if (!text && !mediaUuids?.length) {
    return NextResponse.json({ error: 'Either text or mediaUuids is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get creator's access token (auto-refreshes if expired)
    let accessToken: string
    try {
      accessToken = await getModelAccessToken(id)
    } catch (error) {
      return NextResponse.json({ error: 'Creator not connected' }, { status: 400 })
    }

    const fanvue = createFanvueClient(accessToken)

    // Try to ensure chat exists (this is optional, sendMessage may auto-create)
    try {
      await fanvue.createChat(userUuid)
    } catch (e) {
      // Chat might already exist, which is fine
      console.log('[Messages API] Chat may already exist for user:', userUuid)
    }

    // Send message directly to the user (Fanvue API uses userUuid, not chatUuid)
    const result = await fanvue.sendMessage(userUuid, {
      text: text || null,
      mediaUuids,
      price: price || null,
      templateUuid: templateUuid || null,
    })

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      messageUuid: result.messageUuid,
    })
  } catch (error) {
    console.error('[Messages API] POST Error:', error)

    // Handle rate limiting
    const statusCode = (error as { statusCode?: number })?.statusCode
    if (statusCode === 429) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please wait before trying again.',
        },
        { status: 429 }
      )
    }

    const message = error instanceof Error ? error.message : 'Failed to send message'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
