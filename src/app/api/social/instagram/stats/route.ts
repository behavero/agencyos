import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getDailyInsights } from '@/lib/services/meta-service'

/**
 * GET /api/social/instagram/stats
 * Fetch Instagram insights for the current user's connections
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = await createAdminClient()

    // Get all Instagram connections
    const { data: connections } = await adminClient
      .from('social_connections')
      .select('*')
      .eq('platform', 'instagram')
      .eq('is_active', true)

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        connected: false,
        message: 'No Instagram accounts connected',
      })
    }

    // Get optional refresh param
    const refresh = request.nextUrl.searchParams.get('refresh') === 'true'

    // Fetch stats for each connection
    const results = await Promise.all(
      connections.map(async (connection) => {
        if (refresh) {
          // Force refresh from Instagram API
          const insights = await getDailyInsights(connection.id)
          return {
            connectionId: connection.id,
            accountId: connection.platform_user_id,
            username: connection.platform_username,
            modelId: connection.model_id,
            insights: insights || null,
            lastSync: connection.last_sync_at,
            metadata: connection.metadata,
          }
        } else {
          // Return cached data from DB
          const { data: latestStats } = await adminClient
            .from('social_stats')
            .select('*')
            .eq('platform', 'instagram')
            .eq('model_id', connection.model_id)
            .order('date', { ascending: false })
            .limit(1)
            .single()

          return {
            connectionId: connection.id,
            accountId: connection.platform_user_id,
            username: connection.platform_username,
            modelId: connection.model_id,
            insights: latestStats ? {
              impressions: latestStats.views,
              reach: latestStats.likes,
              profileViews: latestStats.comments,
              websiteClicks: latestStats.shares,
              followersCount: latestStats.followers,
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
    console.error('[Instagram Stats API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Instagram stats' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/social/instagram/stats
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

    const insights = await getDailyInsights(connectionId)

    if (!insights) {
      return NextResponse.json(
        { error: 'Failed to fetch insights' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      insights,
    })
  } catch (error) {
    console.error('[Instagram Stats API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh stats' },
      { status: 500 }
    )
  }
}
