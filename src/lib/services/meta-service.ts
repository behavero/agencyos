import { createAdminClient } from '@/lib/supabase/server'

/**
 * Meta (Instagram/Facebook) Graph API Service
 * 
 * Handles fetching Instagram Business Account insights and analytics.
 * Uses the official Graph API for accurate metrics.
 * 
 * @see https://developers.facebook.com/docs/instagram-api/reference/ig-user/insights
 */

const GRAPH_API_VERSION = 'v19.0'
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

export interface InstagramInsights {
  impressions: number
  reach: number
  profileViews: number
  websiteClicks: number
  followersCount: number
  mediaCount: number
}

export interface InstagramConnection {
  id: string
  model_id: string | null
  platform_user_id: string
  platform_username: string
  access_token: string | null
  token_expires_at: string | null
  metadata: {
    pageId?: string
    pageName?: string
    pageAccessToken?: string
    profilePicture?: string
    followersCount?: number
    mediaCount?: number
  }
}

/**
 * Check if the token is expired or about to expire (within 7 days)
 */
function isTokenExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return true
  const expiryDate = new Date(expiresAt)
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  return expiryDate < sevenDaysFromNow
}

/**
 * Refresh a long-lived token (valid for 60 days, can be refreshed before expiry)
 */
async function refreshLongLivedToken(accessToken: string): Promise<string | null> {
  const clientId = process.env.META_CLIENT_ID
  const clientSecret = process.env.META_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('[Meta] Missing credentials for token refresh')
    return null
  }

  try {
    const url = new URL(`${GRAPH_API_BASE}/oauth/access_token`)
    url.searchParams.set('grant_type', 'fb_exchange_token')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('client_secret', clientSecret)
    url.searchParams.set('fb_exchange_token', accessToken)

    const response = await fetch(url.toString())
    if (!response.ok) {
      console.error('[Meta] Token refresh failed:', await response.json())
      return null
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error('[Meta] Token refresh error:', error)
    return null
  }
}

/**
 * Fetch daily insights for an Instagram Business Account
 */
export async function getDailyInsights(connectionId: string): Promise<InstagramInsights | null> {
  try {
    const supabase = await createAdminClient()

    // Get connection
    const { data: connection, error } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'instagram')
      .single()

    if (error || !connection) {
      console.error('[Meta] Connection not found:', error)
      return null
    }

    const conn = connection as InstagramConnection

    if (!conn.access_token) {
      console.error('[Meta] No access token')
      return null
    }

    // Check if token needs refresh
    if (isTokenExpiringSoon(conn.token_expires_at)) {
      console.log('[Meta] Token expiring soon, refreshing...')
      const newToken = await refreshLongLivedToken(conn.access_token)
      
      if (newToken) {
        const newExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
        await supabase
          .from('social_connections')
          .update({
            access_token: newToken,
            token_expires_at: newExpiry,
            updated_at: new Date().toISOString(),
          })
          .eq('id', connectionId)
        
        conn.access_token = newToken
        console.log('[Meta] Token refreshed successfully')
      }
    }

    // Fetch insights
    const igUserId = conn.platform_user_id
    const insightsUrl = new URL(`${GRAPH_API_BASE}/${igUserId}/insights`)
    insightsUrl.searchParams.set('access_token', conn.access_token)
    insightsUrl.searchParams.set('metric', 'impressions,reach,profile_views,website_clicks')
    insightsUrl.searchParams.set('period', 'day')

    console.log('[Meta] Fetching insights for:', conn.platform_username)

    const insightsResponse = await fetch(insightsUrl.toString())
    if (!insightsResponse.ok) {
      const errorData = await insightsResponse.json()
      console.error('[Meta] Insights fetch error:', errorData)
      
      // Check for specific errors
      if (errorData.error?.code === 190) {
        // Token expired
        console.error('[Meta] Token has expired')
        await supabase
          .from('social_connections')
          .update({ is_active: false })
          .eq('id', connectionId)
      }
      
      return null
    }

    const insightsData = await insightsResponse.json()

    // Parse insights response
    const insights: InstagramInsights = {
      impressions: 0,
      reach: 0,
      profileViews: 0,
      websiteClicks: 0,
      followersCount: conn.metadata?.followersCount || 0,
      mediaCount: conn.metadata?.mediaCount || 0,
    }

    for (const metric of insightsData.data || []) {
      const value = metric.values?.[0]?.value || 0
      switch (metric.name) {
        case 'impressions':
          insights.impressions = value
          break
        case 'reach':
          insights.reach = value
          break
        case 'profile_views':
          insights.profileViews = value
          break
        case 'website_clicks':
          insights.websiteClicks = value
          break
      }
    }

    // Also fetch current account info for follower count
    const accountUrl = new URL(`${GRAPH_API_BASE}/${igUserId}`)
    accountUrl.searchParams.set('access_token', conn.access_token)
    accountUrl.searchParams.set('fields', 'followers_count,media_count')

    const accountResponse = await fetch(accountUrl.toString())
    if (accountResponse.ok) {
      const accountData = await accountResponse.json()
      insights.followersCount = accountData.followers_count || insights.followersCount
      insights.mediaCount = accountData.media_count || insights.mediaCount
    }

    // Save to social_stats
    const today = new Date().toISOString().split('T')[0]
    const statsData = {
      model_id: conn.model_id,
      platform: 'instagram' as const,
      followers: insights.followersCount,
      views: insights.impressions,
      likes: insights.reach, // Using reach as a proxy
      comments: insights.profileViews,
      shares: insights.websiteClicks,
      date: today,
      updated_at: new Date().toISOString(),
    }

    const { data: existingStats } = await supabase
      .from('social_stats')
      .select('id')
      .eq('platform', 'instagram')
      .eq('date', today)
      .eq('model_id', conn.model_id)
      .single()

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
          ...conn.metadata,
          followersCount: insights.followersCount,
          mediaCount: insights.mediaCount,
        },
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    console.log('[Meta] Insights fetched:', {
      username: conn.platform_username,
      impressions: insights.impressions,
      reach: insights.reach,
      profileViews: insights.profileViews,
    })

    return insights
  } catch (error) {
    console.error('[Meta] Error fetching insights:', error)
    return null
  }
}

/**
 * Refresh insights for all Instagram connections
 */
export async function refreshAllInstagramInsights(): Promise<{
  success: number
  failed: number
}> {
  const supabase = await createAdminClient()

  const { data: connections } = await supabase
    .from('social_connections')
    .select('id')
    .eq('platform', 'instagram')
    .eq('is_active', true)

  let success = 0
  let failed = 0

  for (const connection of connections || []) {
    const result = await getDailyInsights(connection.id)
    if (result) {
      success++
    } else {
      failed++
    }
  }

  return { success, failed }
}

/**
 * Get all active Instagram connections
 */
export async function getInstagramConnections(): Promise<InstagramConnection[]> {
  const supabase = await createAdminClient()

  const { data } = await supabase
    .from('social_connections')
    .select('*')
    .eq('platform', 'instagram')
    .eq('is_active', true)

  return (data || []) as InstagramConnection[]
}

/**
 * Disconnect an Instagram account
 */
export async function disconnectInstagram(connectionId: string): Promise<boolean> {
  try {
    const supabase = await createAdminClient()

    await supabase
      .from('social_connections')
      .update({
        is_active: false,
        access_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    return true
  } catch (error) {
    console.error('[Meta] Error disconnecting:', error)
    return false
  }
}
