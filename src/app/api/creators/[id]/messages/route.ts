import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'
import { getAgencyFanvueToken } from '@/lib/services/agency-fanvue-auth'

/**
 * Messages API for a specific creator (agency endpoint)
 *
 * GET: Fetch the creator's chat roster via /creators/{uuid}/chats
 * POST: Send a message as the creator via /creators/{uuid}/chats/{userUuid}/message
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

    // Get model's fanvue_user_uuid and agency_id
    const admin = createAdminClient()
    const { data: model } = await admin
      .from('models')
      .select('fanvue_user_uuid, agency_id')
      .eq('id', id)
      .single()

    if (!model?.fanvue_user_uuid || !model?.agency_id) {
      return NextResponse.json({ error: 'Model not connected to Fanvue' }, { status: 400 })
    }

    // Use agency token with the creator-specific chats endpoint
    const accessToken = await getAgencyFanvueToken(model.agency_id)
    const fanvue = createFanvueClient(accessToken)
    const chats = await fanvue.getCreatorChats(model.fanvue_user_uuid, { page, size })

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

    // Get model's fanvue_user_uuid and agency_id
    const admin = createAdminClient()
    const { data: model } = await admin
      .from('models')
      .select('fanvue_user_uuid, agency_id')
      .eq('id', id)
      .single()

    if (!model?.fanvue_user_uuid || !model?.agency_id) {
      return NextResponse.json({ error: 'Model not connected to Fanvue' }, { status: 400 })
    }

    // Use agency token with the creator-specific message endpoint
    const accessToken = await getAgencyFanvueToken(model.agency_id)
    const fanvue = createFanvueClient(accessToken)

    const result = await fanvue.sendCreatorMessage(model.fanvue_user_uuid, userUuid, {
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
