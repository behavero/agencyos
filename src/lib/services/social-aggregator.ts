/**
 * Social Aggregator Service
 * 
 * Handles integration with multiple social media platforms:
 * - Instagram (Meta Graph API)
 * - TikTok (TikTok for Business API)
 * - X/Twitter (Twitter API v2)
 * - YouTube (YouTube Data API v3)
 * - Facebook (Meta Graph API)
 * 
 * Each platform requires separate OAuth setup and API credentials.
 */

export type SocialPlatform = 
  | 'instagram' 
  | 'tiktok' 
  | 'x' 
  | 'youtube' 
  | 'facebook' 
  | 'snapchat' 
  | 'reddit' 
  | 'twitch'

export interface SocialConnection {
  id: string
  modelId: string
  platform: SocialPlatform
  platformUserId?: string
  platformUsername?: string
  accessToken?: string
  refreshToken?: string
  tokenExpiresAt?: Date
  scopes?: string[]
  metadata?: Record<string, any>
  isActive: boolean
  lastSyncAt?: Date
}

export interface SocialStats {
  followers: number
  following?: number
  posts?: number
  engagement?: number
  views?: number
  likes?: number
  comments?: number
  shares?: number
}

export interface SocialPost {
  id: string
  platform: SocialPlatform
  type: 'image' | 'video' | 'text' | 'story' | 'reel' | 'short'
  content?: string
  mediaUrl?: string
  thumbnailUrl?: string
  likes: number
  comments: number
  shares: number
  views?: number
  createdAt: Date
  url?: string
}

/**
 * Base class for platform-specific implementations
 */
abstract class SocialPlatformClient {
  protected accessToken: string
  protected refreshToken?: string
  
  constructor(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
  }
  
  abstract getStats(): Promise<SocialStats>
  abstract getPosts(limit?: number): Promise<SocialPost[]>
  abstract refreshAccessToken(): Promise<{ accessToken: string; expiresIn: number }>
}

/**
 * Instagram Client (Meta Graph API)
 */
class InstagramClient extends SocialPlatformClient {
  private baseUrl = 'https://graph.instagram.com'
  
  async getStats(): Promise<SocialStats> {
    const response = await fetch(
      `${this.baseUrl}/me?fields=followers_count,follows_count,media_count&access_token=${this.accessToken}`
    )
    const data = await response.json()
    
    return {
      followers: data.followers_count || 0,
      following: data.follows_count || 0,
      posts: data.media_count || 0,
    }
  }
  
  async getPosts(limit = 25): Promise<SocialPost[]> {
    const response = await fetch(
      `${this.baseUrl}/me/media?fields=id,caption,media_type,media_url,thumbnail_url,like_count,comments_count,timestamp,permalink&limit=${limit}&access_token=${this.accessToken}`
    )
    const data = await response.json()
    
    return (data.data || []).map((post: any) => ({
      id: post.id,
      platform: 'instagram' as SocialPlatform,
      type: post.media_type?.toLowerCase() || 'image',
      content: post.caption,
      mediaUrl: post.media_url,
      thumbnailUrl: post.thumbnail_url,
      likes: post.like_count || 0,
      comments: post.comments_count || 0,
      shares: 0,
      createdAt: new Date(post.timestamp),
      url: post.permalink,
    }))
  }
  
  async refreshAccessToken(): Promise<{ accessToken: string; expiresIn: number }> {
    const response = await fetch(
      `${this.baseUrl}/refresh_access_token?grant_type=ig_refresh_token&access_token=${this.accessToken}`
    )
    const data = await response.json()
    
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    }
  }
}

/**
 * TikTok Client (placeholder)
 */
class TikTokClient extends SocialPlatformClient {
  async getStats(): Promise<SocialStats> {
    // TODO: Implement TikTok for Business API
    console.log('[TikTok] Stats not yet implemented')
    return { followers: 0 }
  }
  
  async getPosts(): Promise<SocialPost[]> {
    // TODO: Implement TikTok for Business API
    console.log('[TikTok] Posts not yet implemented')
    return []
  }
  
  async refreshAccessToken(): Promise<{ accessToken: string; expiresIn: number }> {
    throw new Error('TikTok token refresh not implemented')
  }
}

/**
 * X/Twitter Client (placeholder)
 */
class XClient extends SocialPlatformClient {
  async getStats(): Promise<SocialStats> {
    // TODO: Implement Twitter API v2
    console.log('[X] Stats not yet implemented')
    return { followers: 0 }
  }
  
  async getPosts(): Promise<SocialPost[]> {
    // TODO: Implement Twitter API v2
    console.log('[X] Posts not yet implemented')
    return []
  }
  
  async refreshAccessToken(): Promise<{ accessToken: string; expiresIn: number }> {
    throw new Error('X token refresh not implemented')
  }
}

/**
 * YouTube Client (placeholder)
 */
class YouTubeClient extends SocialPlatformClient {
  async getStats(): Promise<SocialStats> {
    // TODO: Implement YouTube Data API v3
    console.log('[YouTube] Stats not yet implemented')
    return { followers: 0 }
  }
  
  async getPosts(): Promise<SocialPost[]> {
    // TODO: Implement YouTube Data API v3
    console.log('[YouTube] Posts not yet implemented')
    return []
  }
  
  async refreshAccessToken(): Promise<{ accessToken: string; expiresIn: number }> {
    throw new Error('YouTube token refresh not implemented')
  }
}

/**
 * Social Aggregator Factory
 */
export function createSocialClient(
  platform: SocialPlatform,
  accessToken: string,
  refreshToken?: string
): SocialPlatformClient | null {
  switch (platform) {
    case 'instagram':
      return new InstagramClient(accessToken, refreshToken)
    case 'tiktok':
      return new TikTokClient(accessToken, refreshToken)
    case 'x':
      return new XClient(accessToken, refreshToken)
    case 'youtube':
      return new YouTubeClient(accessToken, refreshToken)
    default:
      console.warn(`[SocialAggregator] Platform ${platform} not implemented`)
      return null
  }
}

/**
 * Aggregate stats from all connected social platforms for a model
 */
export async function getAggregatedStats(connections: SocialConnection[]): Promise<{
  platforms: Record<SocialPlatform, SocialStats | null>
  total: SocialStats
}> {
  const platforms: Record<SocialPlatform, SocialStats | null> = {} as any
  const total: SocialStats = {
    followers: 0,
    following: 0,
    posts: 0,
    engagement: 0,
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
  }
  
  for (const conn of connections) {
    if (!conn.isActive || !conn.accessToken) {
      platforms[conn.platform] = null
      continue
    }
    
    try {
      const client = createSocialClient(conn.platform, conn.accessToken, conn.refreshToken)
      if (!client) {
        platforms[conn.platform] = null
        continue
      }
      
      const stats = await client.getStats()
      platforms[conn.platform] = stats
      
      // Aggregate totals
      total.followers += stats.followers || 0
      total.following! += stats.following || 0
      total.posts! += stats.posts || 0
      total.views! += stats.views || 0
      total.likes! += stats.likes || 0
      total.comments! += stats.comments || 0
      total.shares! += stats.shares || 0
    } catch (error) {
      console.error(`[SocialAggregator] Error fetching ${conn.platform} stats:`, error)
      platforms[conn.platform] = null
    }
  }
  
  return { platforms, total }
}

/**
 * Get OAuth authorization URL for a platform
 */
export function getOAuthUrl(platform: SocialPlatform, redirectUri: string, state: string): string | null {
  switch (platform) {
    case 'instagram':
      return `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user_profile,user_media&response_type=code&state=${state}`
    case 'tiktok':
      return `https://www.tiktok.com/v2/auth/authorize/?client_key=${process.env.TIKTOK_CLIENT_KEY}&scope=user.info.basic,video.list&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
    case 'x':
      return `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.X_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.read%20users.read&state=${state}&code_challenge=challenge&code_challenge_method=plain`
    case 'youtube':
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/youtube.readonly&state=${state}`
    default:
      return null
  }
}
