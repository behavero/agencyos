import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'
import { getModelAccessToken } from '@/lib/services/fanvue-auth'
import { getAgencyFanvueToken } from '@/lib/services/agency-fanvue-auth'

export const maxDuration = 120 // 2 minutes

/**
 * Derive subscriber/follower counts from our own data when Fanvue API calls fail.
 * Uses subscriber_history (most accurate), then falls back to transaction-based counts.
 */
async function getDerivedCounts(
  adminClient: ReturnType<typeof createAdminClient>,
  modelId: string,
  _agencyId: string
): Promise<{ subscribers: number; followers: number }> {
  // Strategy 1: Latest subscriber_history entry (most accurate)
  // Schema: subscribers_count, followers_count (not subscribers_total)
  const { data: latestHistory } = await adminClient
    .from('subscriber_history')
    .select('subscribers_count, followers_count')
    .eq('model_id', modelId)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  if (latestHistory) {
    const subs = latestHistory.subscribers_count || 0
    const followers = latestHistory.followers_count || 0
    if (subs > 0 || followers > 0) {
      return { subscribers: subs, followers }
    }
  }

  // Strategy 2: Count unique fans from subscription transactions (subs only, no follower data)
  const { count: uniqueSubFans } = await adminClient
    .from('fanvue_transactions')
    .select('fan_id', { count: 'exact', head: true })
    .eq('model_id', modelId)
    .eq('transaction_type', 'subscription')
    .not('fan_id', 'is', null)

  // NOTE: We only return subscribers from transactions; we do NOT return followers: 0
  // to avoid overwriting real follower data. Caller should skip writing followers if derived.
  return { subscribers: uniqueSubFans || 0, followers: -1 }
}

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

          if (useAgencyEndpoint) {
            // Agency token path: use actual subscribers/followers/media/tracking-links endpoints
            const [subsResult, followersResult, earningsResult, mediaResult, trackingLinksResult] =
              await Promise.allSettled([
                // Count actual subscribers by paginating /creators/{uuid}/subscribers
                (async () => {
                  let count = 0
                  let page = 1
                  let hasMore = true
                  while (hasMore && page <= 100) {
                    const resp = await fanvue.getCreatorSubscribers(uuid, { page, size: 50 })
                    count += resp.data.length
                    hasMore = resp.pagination.hasMore
                    page++
                  }
                  return count
                })(),
                // Count actual followers by paginating /creators/{uuid}/followers
                (async () => {
                  let count = 0
                  let page = 1
                  let hasMore = true
                  while (hasMore && page <= 100) {
                    const resp = await fanvue.getCreatorFollowers(uuid, { page, size: 50 })
                    count += resp.data.length
                    hasMore = resp.pagination.hasMore
                    page++
                  }
                  return count
                })(),
                fanvue.getCreatorEarnings(uuid, {
                  startDate: '2020-01-01T00:00:00Z',
                  endDate: new Date().toISOString(),
                  size: 50,
                }),
                // Count media items (proxy for posts_count — agency API has no posts endpoint)
                (async () => {
                  let count = 0
                  let page = 1
                  let hasMore = true
                  while (hasMore && page <= 20) {
                    const resp = await fanvue.getCreatorMedia(uuid, { page, size: 50 })
                    count += resp.data.length
                    hasMore = resp.pagination.hasMore
                    page++
                  }
                  return count
                })(),
                // Count tracking links
                (async () => {
                  let count = 0
                  let cursor: string | undefined
                  do {
                    const resp = await fanvue.getCreatorTrackingLinks(uuid, {
                      limit: 50,
                      cursor,
                    })
                    count += resp.data.length
                    cursor = resp.nextCursor || undefined
                  } while (cursor)
                  return count
                })(),
              ])

            let totalFollowers = 0
            let totalSubscribers = 0

            if (subsResult.status === 'fulfilled') {
              totalSubscribers = subsResult.value
            }
            if (followersResult.status === 'fulfilled') {
              totalFollowers = followersResult.value
            }

            // Media count as proxy for posts (agency API has no direct posts endpoint)
            let totalPosts = 0
            if (mediaResult.status === 'fulfilled') {
              totalPosts = mediaResult.value
            } else {
              console.error(`[Bulk Stats] Media count error for ${model.name}:`, mediaResult.reason)
            }

            // Tracking links count
            let trackingLinksCount = -1
            if (trackingLinksResult.status === 'fulfilled') {
              trackingLinksCount = trackingLinksResult.value
            } else {
              console.error(
                `[Bulk Stats] Tracking links error for ${model.name}:`,
                trackingLinksResult.reason
              )
            }

            console.log(
              `[Bulk Stats] Direct counts for ${model.name}: subs=${totalSubscribers}, followers=${totalFollowers}, media=${totalPosts}, links=${trackingLinksCount}`
            )

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

            // Only update followers/subs if we got real data from the API
            if (subsResult.status === 'fulfilled') {
              // Always write the count, even if 0 — this is the REAL count from Fanvue
              stats.subscribers_count = totalSubscribers
            }
            if (followersResult.status === 'fulfilled') {
              stats.followers_count = totalFollowers
            }

            // Fallback: if the direct API calls failed, derive from our own data
            if (stats.subscribers_count === undefined || stats.followers_count === undefined) {
              const derived = await getDerivedCounts(adminClient, model.id, agencyId)
              if (stats.subscribers_count === undefined && derived.subscribers > 0) {
                stats.subscribers_count = derived.subscribers
                console.log(
                  `[Bulk Stats] Using derived subscriber count for ${model.name}: ${derived.subscribers}`
                )
              }
              if (stats.followers_count === undefined && derived.followers > 0) {
                stats.followers_count = derived.followers
                console.log(
                  `[Bulk Stats] Using derived follower count for ${model.name}: ${derived.followers}`
                )
              }
            }

            // Only update revenue if we got earnings data (never overwrite with 0)
            if (totalRevenueCents > 0) {
              stats.revenue_total = totalRevenueCents / 100
            }

            // Posts count from media endpoint (agency API has no posts endpoint)
            if (totalPosts > 0) {
              stats.posts_count = totalPosts
            }

            // Tracking links count
            if (trackingLinksCount >= 0) {
              stats.tracking_links_count = trackingLinksCount
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
            // Personal endpoint path: only for models with their own token and NO agency token
            const tokenType = 'personal'
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

            // Only update user stats with non-zero values (never overwrite with 0)
            if (user) {
              if (user.fanCounts?.followersCount != null && user.fanCounts.followersCount > 0) {
                stats.followers_count = user.fanCounts.followersCount
              }
              if (user.fanCounts?.subscribersCount != null && user.fanCounts.subscribersCount > 0) {
                stats.subscribers_count = user.fanCounts.subscribersCount
              }
              if (user.contentCounts?.postCount != null && user.contentCounts.postCount > 0) {
                stats.posts_count = user.contentCounts.postCount
              }
              if (user.likesCount != null && user.likesCount > 0) {
                stats.likes_count = user.likesCount
              }
              if (user.avatarUrl) stats.avatar_url = user.avatarUrl
              if (user.bannerUrl) stats.banner_url = user.bannerUrl
              if (user.bio) stats.bio = user.bio
            }

            // Fallback: if getCurrentUser didn't return subscriber counts, try dedicated endpoints
            if (!stats.subscribers_count) {
              try {
                const subCount = await fanvue.getSubscribersCount()
                if (subCount?.total > 0) {
                  stats.subscribers_count = subCount.total
                  console.log(
                    `[Bulk Stats] Using getSubscribersCount for ${model.name}: ${subCount.total}`
                  )
                }
              } catch {
                // getSubscribersCount not available
              }
            }

            if (!stats.followers_count) {
              try {
                const followers = await fanvue.getFollowers(1, 1)
                if (followers?.totalCount > 0) {
                  stats.followers_count = followers.totalCount
                  console.log(
                    `[Bulk Stats] Using getFollowers for ${model.name}: ${followers.totalCount}`
                  )
                }
              } catch {
                // getFollowers not available
              }
            }

            // Last resort: derive from our own data
            if (!stats.subscribers_count || !stats.followers_count) {
              const derived = await getDerivedCounts(adminClient, model.id, agencyId)
              if (!stats.subscribers_count && derived.subscribers > 0) {
                stats.subscribers_count = derived.subscribers
                console.log(
                  `[Bulk Stats] Using derived subscriber count for ${model.name}: ${derived.subscribers}`
                )
              }
              if (!stats.followers_count && derived.followers > 0) {
                stats.followers_count = derived.followers
                console.log(
                  `[Bulk Stats] Using derived follower count for ${model.name}: ${derived.followers}`
                )
              }
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
