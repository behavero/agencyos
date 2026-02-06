import { createAdminClient } from '@/lib/supabase/server'

/**
 * Ghost Tracker Service
 *
 * Monitors public social media profiles WITHOUT requiring login.
 * Uses Firecrawl for web scraping public profile pages.
 *
 * Supported platforms:
 * - Instagram (public profiles only)
 * - TikTok (public profiles)
 * - X/Twitter (public profiles)
 * - YouTube (public channels)
 */

export interface PublicProfileStats {
  username: string
  displayName: string | null
  avatarUrl: string | null
  profileUrl: string
  followers: number
  following: number
  postsCount: number
  avgViews: number | null
  avgLikes: number | null
  engagementRate: number | null
  bio: string | null
  isVerified: boolean
  lastPostDate: string | null
  scrapedAt: string
}

export interface WatchedAccount {
  id: string
  agency_id: string
  model_id: string | null
  username: string
  platform: 'instagram' | 'tiktok' | 'x' | 'youtube' | 'facebook'
  account_type: 'competitor' | 'slave' | 'reference' | 'backup'
  display_name: string | null
  avatar_url: string | null
  profile_url: string | null
  last_stats: PublicProfileStats | null
  stats_history: PublicProfileStats[]
  is_active: boolean
  last_scanned_at: string | null
  scan_error: string | null
  notes: string | null
  tags: string[]
}

// Platform URL builders
const PLATFORM_URLS: Record<string, (username: string) => string> = {
  instagram: u => `https://www.instagram.com/${u}/`,
  tiktok: u => `https://www.tiktok.com/@${u}`,
  x: u => `https://x.com/${u}`,
  youtube: u => `https://www.youtube.com/@${u}`,
  facebook: u => `https://www.facebook.com/${u}`,
}

/**
 * Scrape a public profile using Firecrawl
 */
async function scrapeWithFirecrawl(url: string): Promise<{
  success: boolean
  markdown?: string
  metadata?: Record<string, unknown>
  error?: string
}> {
  const apiKey = process.env.FIRECRAWL_API_KEY

  if (!apiKey) {
    return {
      success: false,
      error: 'Web scraping not configured — set FIRECRAWL_API_KEY in Vercel env vars',
    }
  }

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 30000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: `Scrape failed: ${response.status} - ${errorData.error || 'Unknown error'}`,
      }
    }

    const data = await response.json()

    if (!data.success) {
      return { success: false, error: data.error || 'Scrape unsuccessful' }
    }

    return {
      success: true,
      markdown: data.data?.markdown || '',
      metadata: data.data?.metadata || {},
    }
  } catch (error) {
    console.error('[GhostTracker] Firecrawl error:', error)
    return { success: false, error: 'Network error during scrape' }
  }
}

/**
 * Parse Instagram profile from scraped content
 */
function parseInstagramProfile(markdown: string, username: string): Partial<PublicProfileStats> {
  const stats: Partial<PublicProfileStats> = {
    username,
    profileUrl: PLATFORM_URLS.instagram(username),
  }

  // Extract followers (various formats: "10K followers", "1,234 followers", "10.5M followers")
  const followersMatch = markdown.match(/(\d+(?:[.,]\d+)?[KMB]?)\s*(?:followers|Followers)/i)
  if (followersMatch) {
    stats.followers = parseMetricNumber(followersMatch[1])
  }

  // Extract following
  const followingMatch = markdown.match(/(\d+(?:[.,]\d+)?[KMB]?)\s*(?:following|Following)/i)
  if (followingMatch) {
    stats.following = parseMetricNumber(followingMatch[1])
  }

  // Extract posts count
  const postsMatch = markdown.match(/(\d+(?:[.,]\d+)?[KMB]?)\s*(?:posts|Posts)/i)
  if (postsMatch) {
    stats.postsCount = parseMetricNumber(postsMatch[1])
  }

  // Try to find verified badge
  stats.isVerified = markdown.toLowerCase().includes('verified') || markdown.includes('✓')

  return stats
}

/**
 * Parse TikTok profile from scraped content
 */
function parseTikTokProfile(markdown: string, username: string): Partial<PublicProfileStats> {
  const stats: Partial<PublicProfileStats> = {
    username,
    profileUrl: PLATFORM_URLS.tiktok(username),
  }

  // TikTok shows followers, following, likes
  const followersMatch = markdown.match(/(\d+(?:[.,]\d+)?[KMB]?)\s*(?:Followers|followers)/i)
  if (followersMatch) {
    stats.followers = parseMetricNumber(followersMatch[1])
  }

  const followingMatch = markdown.match(/(\d+(?:[.,]\d+)?[KMB]?)\s*(?:Following|following)/i)
  if (followingMatch) {
    stats.following = parseMetricNumber(followingMatch[1])
  }

  // TikTok shows total likes
  const likesMatch = markdown.match(/(\d+(?:[.,]\d+)?[KMB]?)\s*(?:Likes|likes)/i)
  if (likesMatch) {
    stats.avgLikes = parseMetricNumber(likesMatch[1])
  }

  return stats
}

/**
 * Parse X/Twitter profile from scraped content
 */
function parseXProfile(markdown: string, username: string): Partial<PublicProfileStats> {
  const stats: Partial<PublicProfileStats> = {
    username,
    profileUrl: PLATFORM_URLS.x(username),
  }

  const followersMatch = markdown.match(/(\d+(?:[.,]\d+)?[KMB]?)\s*(?:Followers|followers)/i)
  if (followersMatch) {
    stats.followers = parseMetricNumber(followersMatch[1])
  }

  const followingMatch = markdown.match(/(\d+(?:[.,]\d+)?[KMB]?)\s*(?:Following|following)/i)
  if (followingMatch) {
    stats.following = parseMetricNumber(followingMatch[1])
  }

  stats.isVerified = markdown.includes('✓') || markdown.toLowerCase().includes('verified')

  return stats
}

/**
 * Parse YouTube channel from scraped content
 */
function parseYouTubeProfile(markdown: string, username: string): Partial<PublicProfileStats> {
  const stats: Partial<PublicProfileStats> = {
    username,
    profileUrl: PLATFORM_URLS.youtube(username),
  }

  // YouTube shows subscribers
  const subsMatch = markdown.match(/(\d+(?:[.,]\d+)?[KMB]?)\s*(?:subscribers|Subscribers)/i)
  if (subsMatch) {
    stats.followers = parseMetricNumber(subsMatch[1])
  }

  // Video count
  const videosMatch = markdown.match(/(\d+(?:[.,]\d+)?[KMB]?)\s*(?:videos|Videos)/i)
  if (videosMatch) {
    stats.postsCount = parseMetricNumber(videosMatch[1])
  }

  return stats
}

/**
 * Parse metric numbers with K, M, B suffixes
 */
function parseMetricNumber(str: string): number {
  const cleaned = str.replace(/,/g, '')
  const num = parseFloat(cleaned)

  if (cleaned.toUpperCase().endsWith('K')) {
    return Math.round(num * 1000)
  }
  if (cleaned.toUpperCase().endsWith('M')) {
    return Math.round(num * 1000000)
  }
  if (cleaned.toUpperCase().endsWith('B')) {
    return Math.round(num * 1000000000)
  }

  return Math.round(num)
}

/**
 * Scan a public profile and extract stats
 */
export async function scanPublicProfile(
  username: string,
  platform: 'instagram' | 'tiktok' | 'x' | 'youtube' | 'facebook'
): Promise<PublicProfileStats | null> {
  // Clean username (remove @ if present)
  const cleanUsername = username.replace(/^@/, '').trim()

  if (!cleanUsername) {
    console.error('[GhostTracker] Empty username')
    return null
  }

  const profileUrl = PLATFORM_URLS[platform]?.(cleanUsername)
  if (!profileUrl) {
    console.error('[GhostTracker] Unknown platform:', platform)
    return null
  }

  console.log(`[GhostTracker] Scanning ${platform}: @${cleanUsername}`)

  // Scrape the profile
  const scrapeResult = await scrapeWithFirecrawl(profileUrl)

  if (!scrapeResult.success || !scrapeResult.markdown) {
    const errorMsg = scrapeResult.error || 'Scrape returned no content'
    console.error('[GhostTracker] Scrape failed:', errorMsg)
    // Throw so callers can capture the specific error message
    throw new Error(errorMsg)
  }

  // Parse based on platform
  let parsedStats: Partial<PublicProfileStats>

  switch (platform) {
    case 'instagram':
      parsedStats = parseInstagramProfile(scrapeResult.markdown, cleanUsername)
      break
    case 'tiktok':
      parsedStats = parseTikTokProfile(scrapeResult.markdown, cleanUsername)
      break
    case 'x':
      parsedStats = parseXProfile(scrapeResult.markdown, cleanUsername)
      break
    case 'youtube':
      parsedStats = parseYouTubeProfile(scrapeResult.markdown, cleanUsername)
      break
    default:
      parsedStats = { username: cleanUsername, profileUrl }
  }

  // Build full stats object
  const stats: PublicProfileStats = {
    username: cleanUsername,
    displayName: (scrapeResult.metadata?.title as string) || null,
    avatarUrl: null,
    profileUrl,
    followers: parsedStats.followers || 0,
    following: parsedStats.following || 0,
    postsCount: parsedStats.postsCount || 0,
    avgViews: parsedStats.avgViews || null,
    avgLikes: parsedStats.avgLikes || null,
    engagementRate: null,
    bio: (scrapeResult.metadata?.description as string) || null,
    isVerified: parsedStats.isVerified || false,
    lastPostDate: null,
    scrapedAt: new Date().toISOString(),
  }

  // Calculate engagement rate if we have the data
  if (stats.followers > 0 && stats.avgLikes) {
    stats.engagementRate = Number(((stats.avgLikes / stats.followers) * 100).toFixed(2))
  }

  console.log('[GhostTracker] Stats extracted:', {
    username: stats.username,
    followers: stats.followers,
    posts: stats.postsCount,
  })

  return stats
}

/**
 * Add a new account to watch
 */
export async function addWatchedAccount(params: {
  agencyId: string
  username: string
  platform: 'instagram' | 'tiktok' | 'x' | 'youtube' | 'facebook'
  accountType: 'competitor' | 'slave' | 'reference' | 'backup'
  modelId?: string
  notes?: string
  tags?: string[]
  userId?: string
}): Promise<WatchedAccount | null> {
  const supabase = await createAdminClient()

  const cleanUsername = params.username.replace(/^@/, '').trim()

  // Check if already exists
  const { data: existing } = await supabase
    .from('watched_accounts')
    .select('id')
    .eq('agency_id', params.agencyId)
    .eq('username', cleanUsername)
    .eq('platform', params.platform)
    .single()

  if (existing) {
    console.log('[GhostTracker] Account already being watched')
    return null
  }

  // Scan the profile first
  let stats: PublicProfileStats | null = null
  let scanError: string | null = null
  try {
    stats = await scanPublicProfile(cleanUsername, params.platform)
  } catch (e) {
    scanError = e instanceof Error ? e.message : 'Scan failed'
  }

  // Insert the watched account
  const { data, error } = await supabase
    .from('watched_accounts')
    .insert({
      agency_id: params.agencyId,
      model_id: params.modelId || null,
      username: cleanUsername,
      platform: params.platform,
      account_type: params.accountType,
      display_name: stats?.displayName || null,
      avatar_url: stats?.avatarUrl || null,
      profile_url: stats?.profileUrl || PLATFORM_URLS[params.platform]?.(cleanUsername),
      last_stats: stats || {},
      stats_history: stats ? [stats] : [],
      last_scanned_at: stats ? new Date().toISOString() : null,
      scan_error: stats ? null : scanError || 'Scan unavailable',
      notes: params.notes || null,
      tags: params.tags || [],
      created_by: params.userId || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[GhostTracker] Error adding account:', error)
    return null
  }

  return data as WatchedAccount
}

/**
 * Refresh stats for a watched account
 */
export async function refreshWatchedAccount(accountId: string): Promise<PublicProfileStats | null> {
  const supabase = await createAdminClient()

  // Get the account
  const { data: account, error } = await supabase
    .from('watched_accounts')
    .select('*')
    .eq('id', accountId)
    .single()

  if (error || !account) {
    console.error('[GhostTracker] Account not found:', error)
    return null
  }

  // Scan the profile
  let stats: PublicProfileStats | null = null
  let scanError: string | null = null

  try {
    stats = await scanPublicProfile(account.username, account.platform)
  } catch (e) {
    scanError = e instanceof Error ? e.message : 'Scan failed'
    console.error(`[GhostTracker] Scan failed for @${account.username}:`, scanError)
  }

  // Update the account
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (stats) {
    // Add to history (keep last 30 snapshots)
    const history = Array.isArray(account.stats_history) ? account.stats_history : []
    history.push(stats)
    if (history.length > 30) {
      history.shift()
    }

    updateData.last_stats = stats
    updateData.stats_history = history
    updateData.last_scanned_at = new Date().toISOString()
    updateData.scan_error = null
    updateData.display_name = stats.displayName || account.display_name
    updateData.avatar_url = stats.avatarUrl || account.avatar_url
  } else {
    updateData.scan_error = scanError || 'Scan failed — unknown error'
  }

  await supabase.from('watched_accounts').update(updateData).eq('id', accountId)

  return stats
}

/**
 * Get all watched accounts for an agency
 */
export async function getWatchedAccounts(agencyId: string): Promise<WatchedAccount[]> {
  const supabase = await createAdminClient()

  const { data } = await supabase
    .from('watched_accounts')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (data || []) as WatchedAccount[]
}

/**
 * Get watched accounts by type
 */
export async function getWatchedAccountsByType(
  agencyId: string,
  accountType: 'competitor' | 'slave' | 'reference' | 'backup'
): Promise<WatchedAccount[]> {
  const supabase = await createAdminClient()

  const { data } = await supabase
    .from('watched_accounts')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('account_type', accountType)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (data || []) as WatchedAccount[]
}

/**
 * Delete a watched account
 */
export async function deleteWatchedAccount(accountId: string): Promise<boolean> {
  const supabase = await createAdminClient()

  const { error } = await supabase.from('watched_accounts').delete().eq('id', accountId)

  return !error
}

/**
 * Refresh all active watched accounts for an agency
 */
export async function refreshAllWatchedAccounts(agencyId: string): Promise<{
  success: number
  failed: number
}> {
  const accounts = await getWatchedAccounts(agencyId)

  let success = 0
  let failed = 0

  for (const account of accounts) {
    const result = await refreshWatchedAccount(account.id)
    if (result) {
      success++
    } else {
      failed++
    }
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  return { success, failed }
}
