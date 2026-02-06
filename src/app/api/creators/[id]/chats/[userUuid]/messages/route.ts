import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'
import { getAgencyFanvueToken } from '@/lib/services/agency-fanvue-auth'

/**
 * GET /api/creators/[id]/chats/[userUuid]/messages
 * Fetch message history between a creator and a fan (agency endpoint)
 * Uses /creators/{creatorUserUuid}/chats/{userUuid}/messages
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
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Get model's fanvue_user_uuid and agency_id
    const { data: model } = await admin
      .from('models')
      .select('fanvue_user_uuid, agency_id')
      .eq('id', id)
      .single()

    if (!model?.fanvue_user_uuid || !model?.agency_id) {
      return NextResponse.json({ error: 'Model not connected to Fanvue' }, { status: 400 })
    }

    // Use agency token with the creator-specific messages endpoint
    const accessToken = await getAgencyFanvueToken(model.agency_id)
    const fanvue = createFanvueClient(accessToken)
    const messages = await fanvue.getCreatorMessages(model.fanvue_user_uuid, userUuid, {
      page,
      size,
    })

    // Add isFromCreator flag
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
  } catch (error) {
    console.error('[Chat Messages API] GET Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
