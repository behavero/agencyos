import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'
import { getModelAccessToken } from '@/lib/services/fanvue-auth'

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

    // If using agency endpoint, get the agency admin token
    if (useAgencyEndpoint) {
      try {
        // Find any model in this agency with a valid token (typically the agency admin)
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
                'No connected accounts in this agency. Connect the agency admin via OAuth first.',
            },
            { status: 400 }
          )
        }

        accessToken = await getModelAccessToken(adminModel.id)
        console.log('[Stats API] Using agency admin token')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: `Agency token error: ${errorMessage}` }, { status: 401 })
      }
    }

    // Create Fanvue client and fetch all stats
    const fanvue = createFanvueClient(accessToken)

    console.log(
      '[Stats API] Fetching stats for',
      model.name,
      '(using',
      useAgencyEndpoint ? 'agency token' : 'own token',
      ')'
    )

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

    if (!useAgencyEndpoint) {
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
        const subscribersSmartList = smartListsResponse.find(list => list.uuid === 'subscribers')

        totalFollowers = followersSmartList?.count || 0
        totalSubscribers = subscribersSmartList?.count || 0

        console.log('[Stats API] Smart Lists (accurate counts):', {
          followers: totalFollowers,
          subscribers: totalSubscribers,
          allLists: smartListsResponse.map(l => `${l.name}: ${l.count}`).join(', '),
        })
      }

      // For chats, we need to paginate through ALL pages to get exact count
      console.log('[Stats API] Fetching ALL chats (full pagination)...')
      let allChats: unknown[] = []
      let page = 1
      let hasMore = true
      const maxPages = 100 // Safety limit

      while (hasMore && page <= maxPages) {
        const chatsPage = await fanvue
          .getCreatorChats(model.fanvue_user_uuid, { page, size: 50 })
          .catch(e => {
            console.error(`[Stats API] Chats page ${page} error:`, e.message)
            return null
          })

        if (chatsPage?.data && chatsPage.data.length > 0) {
          allChats = [...allChats, ...chatsPage.data]
          hasMore = chatsPage.pagination.hasMore
          page++
          console.log(
            `[Stats API] Chats page ${page - 1}: ${chatsPage.data.length} chats, total: ${allChats.length}`
          )
        } else {
          hasMore = false
        }

        if (page > maxPages) {
          console.warn('[Stats API] Reached max pages limit for chats')
        }
      }

      totalMessages = allChats.length
      console.log(`[Stats API] Total chats: ${totalMessages} (fetched across ${page - 1} pages)`)

      // Store for debug output
      chatsData = {
        data: allChats,
        pagination: { page: page - 1, size: allChats.length, hasMore: false },
      } as any
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

        // Use agency endpoint if model doesn't have its own token
        const earningsPage = useAgencyEndpoint
          ? await fanvue.getCreatorEarnings(model.fanvue_user_uuid, params)
          : await fanvue.getEarnings(params)

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

    if (!useAgencyEndpoint) {
      // Using personal token - extract from userInfo
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
    // If useAgencyEndpoint, the counts were already set in the agency section above

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

    // Build stats object based on available data
    const stats = {
      ...(useAgencyEndpoint
        ? {
            // Agency token: Revenue + basic fan metrics available via agency endpoints
            revenue_total: totalRevenue,
            followers_count: totalFollowers,
            subscribers_count: totalSubscribers,
            // Messages count is just the number of chats we can see
            unread_messages: totalMessages,
            // Posts/Likes not available via agency endpoints (need creator's own token)
            posts_count: 0,
            likes_count: 0,
            tracking_links_count: 0,
            stats_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        : {
            // Own token: Full stats available from personal endpoints
            followers_count: totalFollowers,
            subscribers_count: totalSubscribers,
            posts_count: totalPosts,
            revenue_total: totalRevenue,
            unread_messages: unreadMessages,
            tracking_links_count: totalTrackingLinks,
            avatar_url: userInfo?.avatarUrl || model.avatar_url,
            banner_url: userInfo?.bannerUrl,
            bio: userInfo?.bio,
            likes_count: totalLikes,
            image_count: userInfo?.contentCounts?.imageCount || 0,
            video_count: userInfo?.contentCounts?.videoCount || 0,
            audio_count: userInfo?.contentCounts?.audioCount || 0,
            stats_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
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
        tokenType: useAgencyEndpoint ? 'agency' : 'personal',
        earningsCount: allEarnings.length,
        earningsPages: earningsPageCount,
        ...(useAgencyEndpoint
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
