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

    // Fetch all data in parallel
    const [userInfo, earnings, subscribersCount, followers, posts, chats, trackingLinks] = await Promise.all([
      fanvue.getCurrentUser().catch(e => { console.error('User info error:', e); return null }),
      fanvue.getEarnings({ interval: 'month' }).catch(e => { console.error('Earnings error:', e); return null }),
      fanvue.getSubscribersCount().catch(e => { console.error('Subscribers count error:', e); return null }),
      fanvue.getFollowers(1, 1).catch(e => { console.error('Followers error:', e); return null }),
      fanvue.getPosts({ size: 1 }).catch(e => { console.error('Posts error:', e); return null }),
      fanvue.getChats({ size: 1 }).catch(e => { console.error('Chats error:', e); return null }),
      fanvue.getTrackingLinks().catch(e => { console.error('Tracking links error:', e); return null }),
    ])

    // Calculate totals
    const totalRevenue = earnings?.total || 0
    const totalSubscribers = subscribersCount?.active || userInfo?.fanCounts?.subscribersCount || 0
    const totalFollowers = followers?.totalCount || userInfo?.fanCounts?.followersCount || 0
    const totalPosts = posts?.totalCount || userInfo?.contentCounts?.postCount || 0
    const unreadChats = chats?.totalCount || 0
    const totalTrackingLinks = trackingLinks?.totalCount || 0

    // Build stats object
    const stats = {
      followers_count: totalFollowers,
      subscribers_count: totalSubscribers,
      posts_count: totalPosts,
      revenue_total: totalRevenue,
      unread_messages: unreadChats,
      tracking_links_count: totalTrackingLinks,
      avatar_url: userInfo?.avatarUrl || model.avatar_url,
      banner_url: userInfo?.bannerUrl,
      bio: userInfo?.bio,
      likes_count: userInfo?.likesCount || 0,
      image_count: userInfo?.contentCounts?.imageCount || 0,
      video_count: userInfo?.contentCounts?.videoCount || 0,
      audio_count: userInfo?.contentCounts?.audioCount || 0,
      stats_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

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
    })

  } catch (error: any) {
    console.error('[Stats API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
