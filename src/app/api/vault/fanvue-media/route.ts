/**
 * Live Fanvue Media API
 * Fetches creator media on-demand from Fanvue API — no database sync needed.
 * Content is displayed directly from Fanvue CDN URLs.
 *
 * Query params:
 *   modelId    - required, the internal model UUID
 *   page       - optional, defaults to 1
 *   size       - optional, defaults to 50 (max 50)
 *   mediaType  - optional, filter by image/video/audio
 *   folderName - optional, filter by Fanvue vault folder name
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'
import { getAgencyFanvueToken } from '@/lib/services/agency-fanvue-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 400 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('modelId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const size = Math.min(50, Math.max(1, parseInt(searchParams.get('size') || '50', 10)))
    const mediaType = searchParams.get('mediaType') as
      | 'image'
      | 'video'
      | 'audio'
      | 'document'
      | null
    const folderName = searchParams.get('folderName') || undefined

    if (!modelId) {
      return NextResponse.json({ error: 'modelId is required' }, { status: 400 })
    }

    // Get model's fanvue_user_uuid
    const admin = createAdminClient()
    const { data: model } = await admin
      .from('models')
      .select('id, name, fanvue_user_uuid')
      .eq('id', modelId)
      .eq('agency_id', profile.agency_id)
      .single()

    if (!model?.fanvue_user_uuid) {
      return NextResponse.json(
        { error: 'Model not found or not connected to Fanvue' },
        { status: 404 }
      )
    }

    // Get agency token
    const accessToken = await getAgencyFanvueToken(profile.agency_id)
    const fanvue = createFanvueClient(accessToken)

    // Fetch media from Fanvue API with thumbnail + main variants
    const response = await fanvue.getCreatorMedia(model.fanvue_user_uuid, {
      page,
      size,
      ...(mediaType ? { mediaType } : {}),
      ...(folderName ? { folderName } : {}),
      variants: 'main,thumbnail',
    })

    // Transform to a clean response
    const media = (response.data || [])
      .filter(item => item.mediaType) // Skip non-finalized items
      .map(item => {
        const mainVariant = item.variants?.find(v => v.variantType === 'main')
        const thumbVariant = item.variants?.find(v => v.variantType === 'thumbnail')

        return {
          uuid: item.uuid,
          mediaType: item.mediaType,
          url: mainVariant?.url || item.url || '',
          thumbnailUrl: thumbVariant?.url || mainVariant?.url || item.url || '',
          name: item.name || item.caption || null,
          caption: item.caption || null,
          description: item.description || null,
          recommendedPrice: item.recommendedPrice || 0,
          createdAt: item.createdAt || null,
          width: mainVariant?.width || null,
          height: mainVariant?.height || null,
          lengthMs: mainVariant?.lengthMs || null,
        }
      })

    return NextResponse.json({
      success: true,
      modelId: model.id,
      modelName: model.name,
      media,
      pagination: {
        page: response.pagination?.page || page,
        size: response.pagination?.size || media.length,
        hasMore: response.pagination?.hasMore ?? false,
      },
    })
  } catch (error) {
    console.error('[Vault Fanvue Media] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
