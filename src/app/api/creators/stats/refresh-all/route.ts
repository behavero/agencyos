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

    // Get the agency token once (shared for all creators)
    let agencyToken: string | null = null
    try {
      agencyToken = await getAgencyFanvueToken(agencyId)
      console.log('[Bulk Stats] Got agency connection token')
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

          if (useAgencyEndpoint) {
            // Agency token path: use agency endpoints
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

            const stats = {
              followers_count: totalFollowers,
              subscribers_count: totalSubscribers,
              revenue_total: totalRevenueCents / 100,
              stats_updated_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
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
            // Personal token path
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
            const stats = {
              followers_count: user?.fanCounts?.followersCount || 0,
              subscribers_count: user?.fanCounts?.subscribersCount || 0,
              posts_count: user?.contentCounts?.postCount || 0,
              likes_count: user?.likesCount || 0,
              revenue_total: totalRevenueCents / 100,
              avatar_url: user?.avatarUrl || undefined,
              banner_url: user?.bannerUrl || undefined,
              bio: user?.bio || undefined,
              stats_updated_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }

            await adminClient.from('models').update(stats).eq('id', model.id)

            return {
              id: model.id,
              name: model.name,
              success: true,
              stats,
              earningsCount,
              tokenType: 'personal',
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
