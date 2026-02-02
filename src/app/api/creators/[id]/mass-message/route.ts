import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'

/**
 * Mass Message API for a specific creator
 * Send messages to multiple fans at once using Fanvue's list-based targeting
 */

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const {
    text,
    mediaUuids,
    price,
    // List-based targeting (Fanvue API v2025-06-26)
    smartListIds, // e.g., ['subscribers', 'followers']
    customListUuids, // UUIDs of custom lists
    excludeSmartListIds,
    excludeCustomListUuids,
  } = body

  if (!text && !mediaUuids?.length) {
    return NextResponse.json({ error: 'Either text or mediaUuids is required' }, { status: 400 })
  }

  if (!smartListIds?.length && !customListUuids?.length) {
    return NextResponse.json(
      { error: 'At least one list (smartListIds or customListUuids) is required for targeting' },
      { status: 400 }
    )
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

    // Build the request according to Fanvue API spec
    const massMessageData: {
      text?: string
      mediaUuids?: string[]
      price?: number | null
      includedLists: {
        smartListUuids?: string[]
        customListUuids?: string[]
      }
      excludedLists?: {
        smartListUuids?: string[]
        customListUuids?: string[]
      }
    } = {
      includedLists: {},
    }

    if (text) massMessageData.text = text
    if (mediaUuids?.length) massMessageData.mediaUuids = mediaUuids
    if (price !== undefined && price !== null) massMessageData.price = price

    // Set included lists
    if (smartListIds?.length) {
      massMessageData.includedLists.smartListUuids = smartListIds
    }
    if (customListUuids?.length) {
      massMessageData.includedLists.customListUuids = customListUuids
    }

    // Set excluded lists if provided
    if (excludeSmartListIds?.length || excludeCustomListUuids?.length) {
      massMessageData.excludedLists = {}
      if (excludeSmartListIds?.length) {
        massMessageData.excludedLists.smartListUuids = excludeSmartListIds
      }
      if (excludeCustomListUuids?.length) {
        massMessageData.excludedLists.customListUuids = excludeCustomListUuids
      }
    }

    // Send mass message
    const result = await fanvue.sendMassMessage(massMessageData)

    console.log(`[Mass Message] Sent to ${result.recipientCount} users, ID: ${result.id}`)

    return NextResponse.json({
      success: true,
      message: `Message sent to ${result.recipientCount} fans`,
      ...result,
    })
  } catch (error) {
    console.error('[Mass Message API] Error:', error)

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

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
