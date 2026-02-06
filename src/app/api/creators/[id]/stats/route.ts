import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'
import { getModelAccessToken } from '@/lib/services/fanvue-auth'
import { getAgencyFanvueToken } from '@/lib/services/agency-fanvue-auth'

/**
 * Fetch and update real stats from Fanvue API
 * Phase 59: Uses agency-wide token system for seamless multi-creator support
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const adminClient = createAdminClient()

    // Get the model's info
    const { data: model, error } = await adminClient
      .from('models')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !model) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    if (!model.fanvue_user_uuid) {
      return NextResponse.json(
        { error: 'Creator has no Fanvue UUID. Import via agency first.' },
        { status: 400 }
      )
    }

    // PHASE 59: Agency-wide token system
    // Try to get model's own token first, fall back to agency admin token
    let accessToken: string = ''
    let useAgencyEndpoint = false

    if (model.fanvue_access_token) {
      // Model has its own token - use it
      try {
        accessToken = await getModelAccessToken(id)
        console.log('[Stats API] Using model own token')
      } catch (error) {
        console.log('[Stats API] Model token refresh failed, falling back to agency token')
        useAgencyEndpoint = true
      }
    } else {
      // Model doesn't have a token - use agency admin token
      useAgencyEndpoint = true
    }

    // If using agency endpoint, get the token from the agency_fanvue_connections table
    if (useAgencyEndpoint) {
      try {
        accessToken = await getAgencyFanvueToken(model.agency_id)
        console.log('[Stats API] Using agency connection token')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // If agency token not found, fall back to checking models table
        if (errorMessage.includes('NO_AGENCY_FANVUE_CONNECTION')) {
          console.log('[Stats API] No agency connection, checking models table...')
          try {
            const { data: adminModel } = await adminClient
              .from('models')
              .select('id')
              .eq('agency_id', model.agency_id)
              .not('fanvue_access_token', 'is', null)
              .order('fanvue_token_expires_at', { ascending: false, nullsFirst: false })
              .limit(1)
              .single()

            if (!adminModel) {
              return NextResponse.json(
                {
                  error:
                    'No Fanvue connection found. Click "Connect Fanvue" on the Creator Management page first.',
                },
                { status: 400 }
              )
            }

            accessToken = await getModelAccessToken(adminModel.id)
            console.log('[Stats API] Using model token as fallback')
          } catch (fallbackErr) {
            const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : 'Unknown error'
            return NextResponse.json(
              { error: `No Fanvue token available: ${fallbackMsg}` },
              { status: 401 }
            )
          }
        } else {
          return NextResponse.json(
            { error: `Agency token error: ${errorMessage}` },
            { status: 401 }
          )
        }
      }
    }

    // Create Fanvue client and fetch all stats
    const fanvue = createFanvueClient(accessToken)

    // Check if this model IS the connected Fanvue user (personal endpoints available)
    let isConnectedUser = false
    if (useAgencyEndpoint && model.agency_id) {
      const { data: conn } = await adminClient
        .from('agency_fanvue_connections')
        .select('fanvue_user_id')
        .eq('agency_id', model.agency_id)
        .single()
      isConnectedUser = conn?.fanvue_user_id === model.fanvue_user_uuid
    }

    // If this model is the connected user, use personal endpoints (more data available)
    const usePersonalEndpoints = !useAgencyEndpoint || isConnectedUser
    const tokenLabel = isConnectedUser
      ? 'agency-personal'
      : useAgencyEndpoint
        ? 'agency'
        : 'own token'

    console.log(`[Stats API] Fetching stats for ${model.name} (using ${tokenLabel})`)

    // Different data sources based on token type
    let userInfo = null
    let unreadCount = null
    let trackingLinks = null
    const followersData = null
    const subscribersData = null
    let chatsData = null

    // Initialize counters (will be populated based on token type)
    let totalFollowers = 0
    let totalSubscribers = 0
    let totalMessages = 0

    if (usePersonalEndpoints) {
      // OPTION A: Using creator's own token - get everything from personal endpoints
      userInfo = await fanvue.getCurrentUser().catch(e => {
        console.error('[Stats API] User info error:', e.message)
        return null
      })

      console.log('[Stats API] User info:', JSON.stringify(userInfo, null, 2))

      // Fetch stats in parallel with detailed logging - only with own token
      ;[unreadCount, trackingLinks] = await Promise.all([
        // Unread messages count
        fanvue
          .getUnreadCount()
          .then(data => {
            console.log('[Stats API] Unread count raw:', JSON.stringify(data, null, 2))
            return data
          })
          .catch(e => {
            console.error('[Stats API] Unread count error:', e.message, e.statusCode)
            return null
          }),

        // Tracking links (requires read:tracking_links scope)
        fanvue
          .getTrackingLinks({ limit: 100 })
          .then(data => {
            console.log('[Stats API] Tracking links raw:', JSON.stringify(data, null, 2))
            return data
          })
          .catch(e => {
            console.error('[Stats API] Tracking links error:', e.message, e.statusCode)
            return null
          }),
      ])
    } else {
      // OPTION B: Using agency admin token - fetch via agency endpoints
      console.log('[Stats API] Fetching stats via agency endpoints...')

      // Use Smart Lists endpoint for ACCURATE follower/subscriber counts (single API call!)
      const smartListsResponse = await fanvue
        .getCreatorSmartLists(model.fanvue_user_uuid)
        .catch(e => {
          console.error('[Stats API] Smart lists error:', e.message)
          return null
        })

      if (smartListsResponse) {
        const followersSmartList = smartListsResponse.find(list => list.uuid === 'followers')
        // "subscribers" smart list = ALL (active + expired + free trial)
        // Use auto_renewing + non_renewing + free_trial for ACTIVE count
        const autoRenewing = smartListsResponse.find(list => list.uuid === 'auto_renewing')
        const nonRenewing = smartListsResponse.find(list => list.uuid === 'non_renewing')
        const freeTrialSubs = smartListsResponse.find(
          list => list.uuid === 'free_trial_subscribers'
        )

        totalFollowers = followersSmartList?.count || 0
        totalSubscribers =
          (autoRenewing?.count || 0) + (nonRenewing?.count || 0) + (freeTrialSubs?.count || 0)

        console.log('[Stats API] Smart Lists:', {
          followers: totalFollowers,
          activeSubscribers: totalSubscribers,
          allLists: smartListsResponse.map(l => `${l.name}: ${l.count}`).join(', '),
        })
      }

      // Get chat count with a single page request (just to get the total)
      // Instead of paginating ALL chats O(n), we fetch 1 page and use the count if available
      console.log('[Stats API] Fetching chat count (single page)...')
      const chatsPage = await fanvue
        .getCreatorChats(model.fanvue_user_uuid, { page: 1, size: 1 })
        .catch(e => {
          console.error('[Stats API] Chats count error:', e.message)
          return null
        })

      const pagination = chatsPage?.pagination as Record<string, unknown> | undefined
      if (pagination?.totalCount) {
        // API returns totalCount in pagination metadata
        totalMessages = pagination.totalCount as number
      } else if (chatsPage?.data) {
        // Fallback: estimate from pagination hasMore
        // If first page returned data and hasMore is true, we know there's at least > 1
        // Use the existing unread_messages from DB as the cached count
        const { data: existingModel } = await adminClient
          .from('models')
          .select('unread_messages')
          .eq('id', id)
          .single()
        totalMessages = existingModel?.unread_messages || chatsPage.data.length
      }

      console.log(`[Stats API] Chat count: ${totalMessages}`)

      chatsData = chatsPage as any
    }

    // Fetch ALL earnings with pagination (from account creation to now)
    // Use ISO 8601 datetime format with timezone as required by Fanvue API
    const earningsStartDate = '2020-01-01T00:00:00Z' // Fanvue launched ~2021, so this captures everything
    const earningsEndDate = new Date().toISOString() // Now in ISO 8601 format

    let allEarnings: Record<string, unknown>[] = []
    let earningsCursor: string | null = null
    let earningsPageCount = 0
    const MAX_EARNINGS_PAGES = 200 // Increased limit for accounts with many transactions

    try {
      do {
        const params: Record<string, string | number> = {
          startDate: earningsStartDate,
          endDate: earningsEndDate,
          size: 50, // Max allowed by API (1-50)
        }
        if (earningsCursor) {
          params.cursor = earningsCursor
        }

        console.log(
          `[Stats API] Fetching earnings page ${earningsPageCount + 1} with params:`,
          params
        )

        // Use personal endpoint for own token or connected user; agency endpoint otherwise
        const earningsPage = usePersonalEndpoints
          ? await fanvue.getEarnings(params)
          : await fanvue.getCreatorEarnings(model.fanvue_user_uuid, params)

        console.log(
          `[Stats API] Earnings page ${earningsPageCount + 1} response:`,
          JSON.stringify(earningsPage).substring(0, 500)
        )

        if (earningsPage?.data && Array.isArray(earningsPage.data)) {
          allEarnings = [...allEarnings, ...earningsPage.data]
          earningsCursor = earningsPage.nextCursor || null
          earningsPageCount++
          console.log(
            `[Stats API] Earnings page ${earningsPageCount}: ${earningsPage.data.length} transactions, total so far: ${allEarnings.length}`
          )
        } else {
          console.log('[Stats API] No data in earnings response or data is not array')
          break
        }
      } while (earningsCursor && earningsPageCount < MAX_EARNINGS_PAGES)

      console.log(
        `[Stats API] Fetched ${allEarnings.length} total earnings transactions across ${earningsPageCount} pages`
      )
    } catch (e: unknown) {
      const error = e as { message?: string; statusCode?: number; response?: unknown }
      console.error('[Stats API] Earnings error:', error.message)
      console.error('[Stats API] Earnings error details:', error.statusCode, error.response)
    }

    // Extract values from different sources based on token type
    // Note: For agency endpoints, totalFollowers/totalSubscribers/totalMessages are already calculated above
    let totalPosts = 0
    let totalLikes = 0

    if (usePersonalEndpoints) {
      // Using personal endpoints - extract from userInfo
      totalFollowers = userInfo?.fanCounts?.followersCount || 0
      totalSubscribers = userInfo?.fanCounts?.subscribersCount || 0
      totalPosts = userInfo?.contentCounts?.postCount || 0
      totalLikes = userInfo?.likesCount || 0

      console.log('[Stats API] Personal stats from userInfo:', {
        followers: totalFollowers,
        subscribers: totalSubscribers,
        posts: totalPosts,
        likes: totalLikes,
      })
    }
    // If pure agency endpoint, the counts were already set in the agency section above

    console.log('[Stats API] Final counts:', {
      followers: totalFollowers,
      subscribers: totalSubscribers,
      messages: totalMessages,
      posts: totalPosts,
      likes: totalLikes,
    })

    // Extract earnings - Fanvue returns amounts in CENTS, sum gross from all pages
    let totalRevenue = 0
    if (allEarnings.length > 0) {
      // Sum up gross earnings from all transactions (amounts are in cents)
      const totalCents = allEarnings.reduce(
        (sum: number, item: Record<string, unknown>) => sum + ((item.gross as number) || 0),
        0
      )
      // Convert cents to dollars
      totalRevenue = totalCents / 100
      console.log(
        '[Stats API] Earnings: Found',
        allEarnings.length,
        'transactions, total cents:',
        totalCents,
        'dollars:',
        totalRevenue
      )
    }
    console.log('[Stats API] Total revenue calculated:', totalRevenue)

    // Unread messages - API returns unreadMessagesCount
    const unreadMessages = unreadCount?.unreadMessagesCount || 0
    console.log(
      '[Stats API] Unread messages:',
      unreadMessages,
      'Unread chats:',
      unreadCount?.unreadChatsCount || 0
    )

    // Tracking links count (API returns data array + nextCursor, no totalCount)
    let totalTrackingLinks = 0
    if (trackingLinks?.data && Array.isArray(trackingLinks.data)) {
      totalTrackingLinks = trackingLinks.data.length
      // Note: If there's a nextCursor, there are more links not counted here
      if (trackingLinks.nextCursor) {
        console.log('[Stats API] More tracking links exist (has nextCursor)')
      }
    }
    console.log('[Stats API] Tracking links:', totalTrackingLinks)

    // Build stats object — only include non-zero values to prevent overwriting good data
    const stats: Record<string, any> = {
      stats_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Revenue — always write if we got earnings data
    if (totalRevenue > 0) {
      stats.revenue_total = totalRevenue
    }

    if (usePersonalEndpoints) {
      // Personal endpoints: full stats available from /users/me
      if (totalFollowers > 0) stats.followers_count = totalFollowers
      if (totalSubscribers > 0) stats.subscribers_count = totalSubscribers
      if (totalPosts > 0) stats.posts_count = totalPosts
      if (totalLikes > 0) stats.likes_count = totalLikes
      if (unreadMessages > 0) stats.unread_messages = unreadMessages
      if (totalTrackingLinks > 0) stats.tracking_links_count = totalTrackingLinks
      if (userInfo?.avatarUrl) stats.avatar_url = userInfo.avatarUrl
      if (userInfo?.bannerUrl) stats.banner_url = userInfo.bannerUrl
      if (userInfo?.bio) stats.bio = userInfo.bio
      if (userInfo?.contentCounts?.imageCount) stats.image_count = userInfo.contentCounts.imageCount
      if (userInfo?.contentCounts?.videoCount) stats.video_count = userInfo.contentCounts.videoCount
      if (userInfo?.contentCounts?.audioCount) stats.audio_count = userInfo.contentCounts.audioCount
    } else {
      // Agency endpoints: only subs/followers available via smart lists
      if (totalFollowers > 0) stats.followers_count = totalFollowers
      if (totalSubscribers > 0) stats.subscribers_count = totalSubscribers
      if (totalMessages > 0) stats.unread_messages = totalMessages
      // posts_count, likes_count NOT available via agency API — omit to preserve existing values
    }

    // Fallback: if we still don't have subscriber counts, try dedicated endpoints
    if (!stats.subscribers_count) {
      try {
        if (usePersonalEndpoints) {
          const subCount = await fanvue.getSubscribersCount()
          if (subCount?.total > 0) stats.subscribers_count = subCount.total
        } else {
          // Try subscriber history endpoint (agency endpoint)
          const subHistory = await fanvue.getCreatorSubscriberHistory(model.fanvue_user_uuid, {
            startDate: new Date(Date.now() - 7 * 86400000).toISOString(),
            size: 1,
          })
          if (subHistory?.data?.length > 0) {
            const latest = subHistory.data[subHistory.data.length - 1]
            if (latest.total > 0) stats.subscribers_count = latest.total
          }
        }
      } catch {
        // Fallback endpoint not available
      }
    }

    if (!stats.followers_count && usePersonalEndpoints) {
      try {
        const followers = await fanvue.getFollowers(1, 1)
        if (followers?.totalCount > 0) stats.followers_count = followers.totalCount
      } catch {
        // Fallback not available
      }
    }

    console.log('[Stats API] Final stats:', stats)

    // Update the model in database
    const { error: updateError } = await adminClient.from('models').update(stats).eq('id', id)

    if (updateError) {
      console.error('[Stats API] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 })
    }

    console.log('[Stats API] Stats updated successfully')

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        name: model.name,
      },
      debug: {
        tokenType: tokenLabel,
        earningsCount: allEarnings.length,
        earningsPages: earningsPageCount,
        ...(!usePersonalEndpoints
          ? {
              // Agency endpoint debug data
              dataSource: 'smart_lists + full_pagination',
              followersCount: totalFollowers,
              subscribersCount: totalSubscribers,
              chatsCount: totalMessages,
              chatsPagesScanned: chatsData?.pagination?.page || 0,
            }
          : {
              // Personal endpoint debug data
              dataSource: 'personal_token',
              unreadRaw: unreadCount,
              trackingLinksRaw: trackingLinks,
            }),
      },
    })
  } catch (error: unknown) {
    console.error('[Stats API] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stats'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
