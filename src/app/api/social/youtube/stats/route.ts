import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { fetchChannelStats } from '@/lib/services/youtube-stats'

/**
 * GET /api/social/youtube/stats
 * Fetch YouTube channel statistics for the current user's connections
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    const adminClient = await createAdminClient()

    // Get all YouTube connections
    const { data: connections } = await adminClient
      .from('social_connections')
      .select('*')
      .eq('platform', 'youtube')
      .eq('is_active', true)

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        connected: false,
        message: 'No YouTube channels connected',
      })
    }

    // Get optional refresh param
    const refresh = request.nextUrl.searchParams.get('refresh') === 'true'

    // Fetch stats for each connection
    const results = await Promise.all(
      connections.map(async (connection) => {
        if (refresh) {
          // Force refresh from YouTube API
          const stats = await fetchChannelStats(connection.id)
          return {
            connectionId: connection.id,
            channelId: connection.platform_user_id,
            channelName: connection.platform_username,
            modelId: connection.model_id,
            stats: stats || null,
            lastSync: connection.last_sync_at,
            metadata: connection.metadata,
          }
        } else {
          // Return cached data from DB
          const { data: latestStats } = await adminClient
            .from('social_stats')
            .select('*')
            .eq('platform', 'youtube')
            .eq('model_id', connection.model_id)
            .order('date', { ascending: false })
            .limit(1)
            .single()

          return {
            connectionId: connection.id,
            channelId: connection.platform_user_id,
            channelName: connection.platform_username,
            modelId: connection.model_id,
            stats: latestStats ? {
              subscriberCount: latestStats.followers,
              viewCount: latestStats.views,
            } : null,
            lastSync: connection.last_sync_at,
            metadata: connection.metadata,
          }
        }
      })
    )

    return NextResponse.json({
      connected: true,
      connections: results,
    })
  } catch (error) {
    console.error('[YouTube Stats API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch YouTube stats' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/social/youtube/stats
 * Refresh stats for a specific connection
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { connectionId } = await request.json()

    if (!connectionId) {
      return NextResponse.json({ error: 'connectionId required' }, { status: 400 })
    }

    const stats = await fetchChannelStats(connectionId)

    if (!stats) {
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('[YouTube Stats API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh stats' },
      { status: 500 }
    )
  }
}
