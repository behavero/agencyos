import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'
import { getModelAccessToken } from '@/lib/services/fanvue-auth'
import { getAgencyFanvueToken } from '@/lib/services/agency-fanvue-auth'

/**
 * Bulk refresh stats for all creators in an agency.
 * Fetches live data from Fanvue API in parallel for all creators.
 *
 * POST /api/creators/stats/refresh-all
 * Body: { agencyId: string }
 */
export async function POST(request: Request) {
  try {
    const { agencyId } = await request.json()

    if (!agencyId) {
      return NextResponse.json({ error: 'agencyId is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get all models for this agency that have a Fanvue UUID
    const { data: models, error } = await adminClient
      .from('models')
      .select('id, name, fanvue_user_uuid, fanvue_access_token, agency_id, stats_updated_at')
      .eq('agency_id', agencyId)
      .not('fanvue_user_uuid', 'is', null)

    if (error || !models || models.length === 0) {
      return NextResponse.json({ error: 'No creators found', models: 0 }, { status: 404 })
    }

    console.log(`[Bulk Stats] Refreshing ${models.length} creators for agency ${agencyId}`)

    // Get the agency token + connected user ID (shared for all creators)
    let agencyToken: string | null = null
    let connectedFanvueUserId = ''
    try {
      agencyToken = await getAgencyFanvueToken(agencyId)
      console.log('[Bulk Stats] Got agency connection token')

      // Get the connected Fanvue user ID for personal endpoint detection
      const { data: conn } = await adminClient
        .from('agency_fanvue_connections')
        .select('fanvue_user_id')
        .eq('agency_id', agencyId)
        .single()
      connectedFanvueUserId = conn?.fanvue_user_id || ''
    } catch {
      console.log('[Bulk Stats] No agency connection token available')
    }

    // Refresh all creators in parallel
    const results = await Promise.allSettled(
      models.map(async model => {
        try {
          // Determine which token to use
          let accessToken: string
          let useAgencyEndpoint = false

          if (model.fanvue_access_token) {
            try {
              accessToken = await getModelAccessToken(model.id)
            } catch {
              if (!agencyToken) throw new Error('No token available')
              accessToken = agencyToken
              useAgencyEndpoint = true
            }
          } else if (agencyToken) {
            accessToken = agencyToken
            useAgencyEndpoint = true
          } else {
            throw new Error('No Fanvue token available for this creator')
          }

          const fanvue = createFanvueClient(accessToken)
          const uuid = model.fanvue_user_uuid!

          // Check if this model IS the connected Fanvue user
          const isConnectedUser = uuid === connectedFanvueUserId

          if (useAgencyEndpoint && !isConnectedUser) {
            // Agency token path: use agency endpoints (for non-connected creators)
            const [smartListsResult, earningsResult] = await Promise.allSettled([
              fanvue.getCreatorSmartLists(uuid),
              fanvue.getCreatorEarnings(uuid, {
                startDate: '2020-01-01T00:00:00Z',
                endDate: new Date().toISOString(),
                size: 50,
              }),
            ])

            let totalFollowers = 0
            let totalSubscribers = 0

            if (smartListsResult.status === 'fulfilled' && smartListsResult.value) {
              const followers = smartListsResult.value.find(l => l.uuid === 'followers')
              const subscribers = smartListsResult.value.find(l => l.uuid === 'subscribers')
              totalFollowers = followers?.count || 0
              totalSubscribers = subscribers?.count || 0
            }

            // Calculate total revenue from earnings (first page only for speed)
            let totalRevenueCents = 0
            let earningsCount = 0
            if (earningsResult.status === 'fulfilled' && earningsResult.value?.data) {
              totalRevenueCents = earningsResult.value.data.reduce(
                (sum, item) => sum + (item.gross || 0),
                0
              )
              earningsCount = earningsResult.value.data.length

              // If there are more pages, continue fetching
              let cursor = earningsResult.value.nextCursor
              let pages = 1
              while (cursor && pages < 200) {
                try {
                  const nextPage = await fanvue.getCreatorEarnings(uuid, {
                    startDate: '2020-01-01T00:00:00Z',
                    endDate: new Date().toISOString(),
                    size: 50,
                    cursor,
                  })
                  if (nextPage?.data?.length) {
                    totalRevenueCents += nextPage.data.reduce(
                      (sum, item) => sum + (item.gross || 0),
                      0
                    )
                    earningsCount += nextPage.data.length
                    cursor = nextPage.nextCursor || null
                    pages++
                  } else {
                    break
                  }
                } catch {
                  break
                }
              }
            }

            // SAFETY: Only update fields that have real data from API
            // This prevents overwriting good existing data with 0s when API calls fail
            const stats: Record<string, any> = {
              stats_updated_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }

            // Only update followers/subs if we got real data (API call succeeded)
            if (smartListsResult.status === 'fulfilled' && smartListsResult.value) {
              stats.followers_count = totalFollowers
              stats.subscribers_count = totalSubscribers
            }

            // Only update revenue if we got earnings data (never overwrite with 0)
            if (totalRevenueCents > 0) {
              stats.revenue_total = totalRevenueCents / 100
            }

            await adminClient.from('models').update(stats).eq('id', model.id)

            return {
              id: model.id,
              name: model.name,
              success: true,
              stats,
              earningsCount,
              tokenType: 'agency',
            }
          } else {
            // Personal endpoint path:
            // - Models with their own token
            // - OR the connected Fanvue user (use personal endpoints with agency token)
            const tokenType = isConnectedUser ? 'agency-personal' : 'personal'
            console.log(`[Bulk Stats] Using personal endpoint for ${model.name} (${tokenType})`)

            const [userInfo, earningsResult] = await Promise.allSettled([
              fanvue.getCurrentUser(),
              fanvue.getEarnings({
                startDate: '2020-01-01T00:00:00Z',
                endDate: new Date().toISOString(),
                size: 50,
              }),
            ])

            let totalRevenueCents = 0
            let earningsCount = 0
            if (earningsResult.status === 'fulfilled' && earningsResult.value?.data) {
              totalRevenueCents = earningsResult.value.data.reduce(
                (sum, item) => sum + (item.gross || 0),
                0
              )
              earningsCount = earningsResult.value.data.length

              let cursor = earningsResult.value.nextCursor
              let pages = 1
              while (cursor && pages < 200) {
                try {
                  const nextPage = await fanvue.getEarnings({
                    startDate: '2020-01-01T00:00:00Z',
                    endDate: new Date().toISOString(),
                    size: 50,
                    cursor,
                  })
                  if (nextPage?.data?.length) {
                    totalRevenueCents += nextPage.data.reduce(
                      (sum, item) => sum + (item.gross || 0),
                      0
                    )
                    earningsCount += nextPage.data.length
                    cursor = nextPage.nextCursor || null
                    pages++
                  } else {
                    break
                  }
                } catch {
                  break
                }
              }
            }

            const user = userInfo.status === 'fulfilled' ? userInfo.value : null

            // SAFETY: Only update fields that have real data from API
            const stats: Record<string, any> = {
              stats_updated_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }

            // Only update user stats if we got user info
            if (user) {
              stats.followers_count = user.fanCounts?.followersCount || 0
              stats.subscribers_count = user.fanCounts?.subscribersCount || 0
              stats.posts_count = user.contentCounts?.postCount || 0
              stats.likes_count = user.likesCount || 0
              if (user.avatarUrl) stats.avatar_url = user.avatarUrl
              if (user.bannerUrl) stats.banner_url = user.bannerUrl
              if (user.bio) stats.bio = user.bio
            }

            // Only update revenue if we got earnings data (never overwrite with 0)
            if (totalRevenueCents > 0) {
              stats.revenue_total = totalRevenueCents / 100
            }

            await adminClient.from('models').update(stats).eq('id', model.id)

            return {
              id: model.id,
              name: model.name,
              success: true,
              stats,
              earningsCount,
              tokenType,
            }
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          console.error(`[Bulk Stats] Error for ${model.name}:`, message)
          return { id: model.id, name: model.name, success: false, error: message }
        }
      })
    )

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failCount = results.length - successCount

    const details = results.map(r =>
      r.status === 'fulfilled' ? r.value : { success: false, error: 'Promise rejected' }
    )

    console.log(`[Bulk Stats] Complete: ${successCount} success, ${failCount} failed`)

    return NextResponse.json({
      success: true,
      total: models.length,
      refreshed: successCount,
      failed: failCount,
      details,
    })
  } catch (err) {
    console.error('[Bulk Stats] Fatal error:', err)
    const message = err instanceof Error ? err.message : 'Failed to refresh stats'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
