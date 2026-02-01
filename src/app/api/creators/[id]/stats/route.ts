import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'
import { refreshAccessToken } from '@/lib/fanvue/oauth'

/**
 * Fetch and update real stats from Fanvue API
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const adminClient = createAdminClient()

    // Get the model's Fanvue tokens
    const { data: model, error } = await adminClient
      .from('models')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !model) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    if (!model.fanvue_access_token) {
      return NextResponse.json({ error: 'Creator not connected to Fanvue' }, { status: 400 })
    }

    let accessToken = model.fanvue_access_token

    // Check if token is expired and refresh if needed
    if (model.fanvue_token_expires_at) {
      const expiresAt = new Date(model.fanvue_token_expires_at)
      if (expiresAt < new Date() && model.fanvue_refresh_token) {
        console.log('[Stats API] Token expired, refreshing...')
        try {
          const newTokens = await refreshAccessToken({
            refreshToken: model.fanvue_refresh_token,
            clientId: process.env.NEXT_PUBLIC_FANVUE_CLIENT_ID!,
            clientSecret: process.env.FANVUE_CLIENT_SECRET!,
          })

          accessToken = newTokens.access_token

          // Update tokens in database
          await adminClient
            .from('models')
            .update({
              fanvue_access_token: newTokens.access_token,
              fanvue_refresh_token: newTokens.refresh_token || model.fanvue_refresh_token,
              fanvue_token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
            })
            .eq('id', id)
        } catch (refreshError) {
          console.error('[Stats API] Token refresh failed:', refreshError)
          return NextResponse.json({ error: 'Token expired, please reconnect' }, { status: 401 })
        }
      }
    }

    // Create Fanvue client and fetch all stats
    const fanvue = createFanvueClient(accessToken)

    console.log('[Stats API] Fetching stats for', model.name)

    // Fetch user info first (most reliable)
    const userInfo = await fanvue.getCurrentUser().catch(e => {
      console.error('[Stats API] User info error:', e.message)
      return null
    })

    console.log('[Stats API] User info:', JSON.stringify(userInfo, null, 2))

    // Calculate date range for earnings (last 30 days)
    const endDate = new Date().toISOString()
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Fetch additional stats in parallel with detailed logging
    const [earnings, unreadCount, trackingLinks] = await Promise.all([
      // Earnings - fetch last 30 days of transactions
      fanvue.getEarnings({ startDate, endDate, size: 50 }).then(data => {
        console.log('[Stats API] Earnings raw:', JSON.stringify(data, null, 2))
        return data
      }).catch(e => {
        console.error('[Stats API] Earnings error:', e.message, e.statusCode)
        return null
      }),

      // Unread messages count
      fanvue.getUnreadCount().then(data => {
        console.log('[Stats API] Unread count raw:', JSON.stringify(data, null, 2))
        return data
      }).catch(e => {
        console.error('[Stats API] Unread count error:', e.message, e.statusCode)
        return null
      }),

      // Tracking links (requires read:tracking_links scope)
      fanvue.getTrackingLinks({ limit: 100 }).then(data => {
        console.log('[Stats API] Tracking links raw:', JSON.stringify(data, null, 2))
        return data
      }).catch(e => {
        console.error('[Stats API] Tracking links error:', e.message, e.statusCode)
        return null
      }),
    ])

    // Extract values from user info (most reliable source)
    const totalFollowers = userInfo?.fanCounts?.followersCount || 0
    const totalSubscribers = userInfo?.fanCounts?.subscribersCount || 0
    const totalPosts = userInfo?.contentCounts?.postCount || 0
    const totalLikes = userInfo?.likesCount || 0

    // Extract earnings - Fanvue returns amounts in CENTS, sum gross from data array
    let totalRevenue = 0
    if (earnings && earnings.data && Array.isArray(earnings.data)) {
      // Sum up gross earnings from data array (amounts are in cents)
      const totalCents = earnings.data.reduce((sum: number, item: any) => sum + (item.gross || 0), 0)
      // Convert cents to dollars
      totalRevenue = totalCents / 100
      console.log('[Stats API] Earnings: Found', earnings.data.length, 'transactions, total cents:', totalCents, 'dollars:', totalRevenue)
    }
    console.log('[Stats API] Total revenue calculated:', totalRevenue)

    // Unread messages - API returns unreadMessagesCount
    const unreadMessages = unreadCount?.unreadMessagesCount || 0
    console.log('[Stats API] Unread messages:', unreadMessages, 'Unread chats:', unreadCount?.unreadChatsCount || 0)

    // Tracking links count
    let totalTrackingLinks = 0
    if (trackingLinks) {
      if (typeof trackingLinks.totalCount === 'number') {
        totalTrackingLinks = trackingLinks.totalCount
      } else if (trackingLinks.data && Array.isArray(trackingLinks.data)) {
        totalTrackingLinks = trackingLinks.data.length
      }
    }
    console.log('[Stats API] Tracking links:', totalTrackingLinks)

    // Build stats object
    const stats = {
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
    }

    console.log('[Stats API] Final stats:', stats)

    // Update the model in database
    const { error: updateError } = await adminClient
      .from('models')
      .update(stats)
      .eq('id', id)

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
        earningsRaw: earnings,
        unreadRaw: unreadCount,
        trackingLinksRaw: trackingLinks,
      }
    })

  } catch (error: any) {
    console.error('[Stats API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
