import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'

/**
 * GET /api/creators/[id]/chats/[userUuid]/messages
 * Fetch message history for a specific chat
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userUuid: string }> }
) {
  const { id, userUuid } = await params
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const size = parseInt(searchParams.get('size') || '50')

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
      .select('fanvue_access_token, fanvue_user_uuid')
      .eq('id', id)
      .single()

    if (!model?.fanvue_access_token) {
      return NextResponse.json({ error: 'Creator not connected' }, { status: 400 })
    }

    const fanvue = createFanvueClient(model.fanvue_access_token)
    const messages = await fanvue.getMessages(userUuid, { page, size })

    // Transform messages to include isFromCreator flag
    const creatorUuid = model.fanvue_user_uuid
    const transformedMessages = messages.data.map(msg => ({
      ...msg,
      isFromCreator: msg.sender.uuid === creatorUuid,
    }))

    return NextResponse.json({
      data: transformedMessages,
      pagination: messages.pagination,
      creatorUuid,
    })

  } catch (error: any) {
    console.error('[Chat Messages API] GET Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
