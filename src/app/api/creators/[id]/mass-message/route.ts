import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'

/**
 * Mass Message API for a specific creator
 * Send messages to multiple fans at once
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { userUuids, content, mediaIds, price, listType, listUuid } = body

  // Either provide userUuids directly, or a list (smart/custom) to target
  if (!content) {
    return NextResponse.json(
      { error: 'content is required' },
      { status: 400 }
    )
  }

  if (!userUuids?.length && !listUuid) {
    return NextResponse.json(
      { error: 'Either userUuids or listUuid is required' },
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

    let targetUuids = userUuids || []

    // If using a list, fetch the members first
    if (listUuid && !userUuids?.length) {
      let members
      if (listType === 'smart') {
        members = await fanvue.getSmartListMembers(listUuid, { size: 100 })
      } else {
        members = await fanvue.getCustomListMembers(listUuid, { size: 100 })
      }
      targetUuids = members.data.map((m: any) => m.uuid)
    }

    if (!targetUuids.length) {
      return NextResponse.json(
        { error: 'No recipients found' },
        { status: 400 }
      )
    }

    // Send mass message
    const result = await fanvue.sendMassMessage({
      userUuids: targetUuids,
      content,
      mediaIds,
      price,
    })

    console.log(`[Mass Message] Sent to ${result.messageCount} users`)

    return NextResponse.json({
      success: true,
      message: `Message sent to ${result.messageCount} fans`,
      ...result,
    })

  } catch (error: any) {
    console.error('[Mass Message API] Error:', error)
    
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
