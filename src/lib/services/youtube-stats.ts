import { google } from 'googleapis'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * YouTube Statistics Service
 * 
 * Handles fetching and refreshing YouTube channel statistics.
 * Uses OAuth2 refresh tokens for background updates.
 * 
 * @see https://developers.google.com/youtube/v3/getting-started
 */

export interface YouTubeStats {
  channelId: string
  channelTitle: string
  subscriberCount: number
  viewCount: number
  videoCount: number
  thumbnailUrl: string | null
  customUrl: string | null
  country: string | null
  hiddenSubscriberCount: boolean
}

export interface YouTubeConnection {
  id: string
  model_id: string | null
  platform_user_id: string
  platform_username: string
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  metadata: Record<string, unknown>
}

/**
 * Create an authenticated OAuth2 client from stored tokens
 */
async function createOAuth2Client(connection: YouTubeConnection) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)

  // Set existing credentials
  oauth2Client.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    expiry_date: connection.token_expires_at 
      ? new Date(connection.token_expires_at).getTime() 
      : undefined,
  })

  // Check if token needs refresh
  const tokenInfo = oauth2Client.credentials
  const isExpired = tokenInfo.expiry_date && tokenInfo.expiry_date < Date.now()

  if (isExpired && connection.refresh_token) {
    console.log('[YouTube] Token expired, refreshing...')
    const { credentials } = await oauth2Client.refreshAccessToken()
    oauth2Client.setCredentials(credentials)

    // Update tokens in database
    const supabase = await createAdminClient()
    await supabase
      .from('social_connections')
      .update({
        access_token: credentials.access_token,
        token_expires_at: credentials.expiry_date
          ? new Date(credentials.expiry_date).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    console.log('[YouTube] Token refreshed successfully')
  }

  return oauth2Client
}

/**
 * Fetch channel statistics from YouTube API
 */
export async function fetchChannelStats(connectionId: string): Promise<YouTubeStats | null> {
  try {
    const supabase = await createAdminClient()

    // Get connection
    const { data: connection, error } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'youtube')
      .single()

    if (error || !connection) {
      console.error('[YouTube] Connection not found:', error)
      return null
    }

    if (!connection.refresh_token) {
      console.error('[YouTube] No refresh token available')
      return null
    }

    // Create authenticated client
    const oauth2Client = await createOAuth2Client(connection as YouTubeConnection)
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client })

    // Fetch channel data
    const response = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      id: [connection.platform_user_id],
    })

    const channel = response.data.items?.[0]
    if (!channel) {
      console.error('[YouTube] Channel not found')
      return null
    }

    const stats: YouTubeStats = {
      channelId: channel.id || '',
      channelTitle: channel.snippet?.title || 'Unknown',
      subscriberCount: parseInt(channel.statistics?.subscriberCount || '0', 10),
      viewCount: parseInt(channel.statistics?.viewCount || '0', 10),
      videoCount: parseInt(channel.statistics?.videoCount || '0', 10),
      thumbnailUrl: channel.snippet?.thumbnails?.default?.url || null,
      customUrl: channel.snippet?.customUrl || null,
      country: channel.snippet?.country || null,
      hiddenSubscriberCount: channel.statistics?.hiddenSubscriberCount || false,
    }

    // Update social_stats table
    const today = new Date().toISOString().split('T')[0]
    
    const { data: existingStats } = await supabase
      .from('social_stats')
      .select('id')
      .eq('platform', 'youtube')
      .eq('date', today)
      .eq('model_id', connection.model_id)
      .single()

    const statsData = {
      model_id: connection.model_id,
      platform: 'youtube' as const,
      followers: stats.subscriberCount,
      views: stats.viewCount,
      date: today,
      updated_at: new Date().toISOString(),
    }

    if (existingStats) {
      await supabase
        .from('social_stats')
        .update(statsData)
        .eq('id', existingStats.id)
    } else {
      await supabase
        .from('social_stats')
        .insert(statsData)
    }

    // Update connection metadata
    await supabase
      .from('social_connections')
      .update({
        metadata: {
          channelId: stats.channelId,
          customUrl: stats.customUrl,
          thumbnail: stats.thumbnailUrl,
          country: stats.country,
          videoCount: stats.videoCount,
        },
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    console.log('[YouTube] Stats fetched:', {
      channel: stats.channelTitle,
      subscribers: stats.subscriberCount,
      views: stats.viewCount,
    })

    return stats
  } catch (error) {
    console.error('[YouTube] Error fetching stats:', error)
    return null
  }
}

/**
 * Refresh stats for all YouTube connections
 */
export async function refreshAllYouTubeStats(): Promise<{
  success: number
  failed: number
}> {
  const supabase = await createAdminClient()

  const { data: connections } = await supabase
    .from('social_connections')
    .select('id')
    .eq('platform', 'youtube')
    .eq('is_active', true)

  let success = 0
  let failed = 0

  for (const connection of connections || []) {
    const result = await fetchChannelStats(connection.id)
    if (result) {
      success++
    } else {
      failed++
    }
  }

  return { success, failed }
}

/**
 * Get all YouTube connections for display
 */
export async function getYouTubeConnections(): Promise<YouTubeConnection[]> {
  const supabase = await createAdminClient()

  const { data } = await supabase
    .from('social_connections')
    .select('*')
    .eq('platform', 'youtube')
    .eq('is_active', true)

  return (data || []) as YouTubeConnection[]
}
