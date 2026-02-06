/**
 * Content Sync API
 *
 * Fetches posts from Fanvue API for all connected creators
 * and populates the content_analysis table.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getAgencyFanvueToken } from '@/lib/services/agency-fanvue-auth'

const FANVUE_API_URL = 'https://api.fanvue.com'
const FANVUE_API_VERSION = '2025-06-26'

interface FanvuePost {
  uuid: string
  text: string | null
  createdAt: string
  publishedAt: string | null
  price: number | null
  audience: string
  likesCount: number
  commentsCount: number
  tips: {
    count: number
    totalGross: number
    totalNet: number
  }
  mediaUuids: string[]
  isPinned: boolean
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    const agencyId = profile.agency_id
    const adminClient = createAdminClient()

    // Get agency token
    let accessToken: string
    try {
      accessToken = await getAgencyFanvueToken(agencyId)
    } catch {
      return NextResponse.json(
        { error: 'No Fanvue token. Connect your agency first.' },
        { status: 400 }
      )
    }

    // Get models
    const { data: models } = await adminClient
      .from('models')
      .select('id, name, fanvue_user_uuid')
      .eq('agency_id', agencyId)
      .not('fanvue_user_uuid', 'is', null)

    if (!models || models.length === 0) {
      return NextResponse.json({ error: 'No connected creators found' }, { status: 404 })
    }

    let totalSynced = 0
    const errors: string[] = []

    for (const model of models) {
      try {
        // Fetch posts for this creator using their UUID
        // The /posts endpoint is self-auth, but using agency token should scope to the creator
        // We'll try fetching via creator context
        let page = 1
        let hasMore = true
        const allPosts: FanvuePost[] = []

        while (hasMore && page <= 10) {
          // Cap at 10 pages (500 posts)
          const url = `${FANVUE_API_URL}/creators/${model.fanvue_user_uuid}/posts?page=${page}&size=50`

          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'X-Fanvue-API-Version': FANVUE_API_VERSION,
            },
          })

          if (!response.ok) {
            // Try self-endpoint as fallback
            if (response.status === 404 || response.status === 403) {
              console.log(
                `[content-sync] Agency posts endpoint failed for ${model.name}, trying self-endpoint`
              )
              break
            }
            errors.push(`[${model.name}] Posts API error: ${response.status}`)
            break
          }

          const data = await response.json()
          const posts = data.data || []
          allPosts.push(...posts)

          hasMore = data.pagination?.hasMore || false
          page++
        }

        // Upsert posts into content_analysis
        for (const post of allPosts) {
          const tipRevenue = (post.tips?.totalGross || 0) / 100 // cents to dollars
          const totalEngagement = post.likesCount + post.commentsCount + post.tips.count

          // Calculate a simple performance score
          const performanceScore = Math.min(
            100,
            Math.round(
              (post.likesCount * 1 +
                post.commentsCount * 3 +
                post.tips.count * 10 +
                (post.price ? 5 : 0)) /
                2
            )
          )

          const { error: upsertError } = await adminClient.from('content_analysis').upsert(
            {
              id: post.uuid,
              post_url: `https://fanvue.com/post/${post.uuid}`,
              platform: 'fanvue',
              title: post.text?.slice(0, 100) || null,
              views: post.likesCount + post.commentsCount, // Approximate
              likes: post.likesCount,
              comments: post.commentsCount,
              conversion_rate: post.price
                ? (post.tips.count / Math.max(1, post.likesCount)) * 100
                : 0,
              performance_score: performanceScore,
              ai_tags: post.audience
                ? [
                    post.audience,
                    post.isPinned ? 'pinned' : null,
                    post.price ? 'ppv' : 'free',
                  ].filter(Boolean)
                : [],
              engagement_rate:
                post.likesCount > 0
                  ? ((post.commentsCount + post.tips.count) / post.likesCount) * 100
                  : 0,
              created_at: post.publishedAt || post.createdAt,
              model_id: model.id,
              agency_id: agencyId,
            },
            { onConflict: 'id' }
          )

          if (upsertError) {
            errors.push(`[${model.name}] Upsert error: ${upsertError.message}`)
          } else {
            totalSynced++
          }
        }

        console.log(`[content-sync] Synced ${allPosts.length} posts for ${model.name}`)
      } catch (modelError) {
        errors.push(
          `[${model.name}] ${modelError instanceof Error ? modelError.message : 'Unknown error'}`
        )
      }
    }

    return NextResponse.json({
      success: true,
      synced: totalSynced,
      models: models.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('[content-sync] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
