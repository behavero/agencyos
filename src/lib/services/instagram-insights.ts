/**
 * Instagram Insights Service
 * 
 * Fetches Instagram Business account insights via Meta Graph API.
 * Includes reach, impressions, profile views, and follower count.
 */

import { createAdminClient } from '@/lib/supabase/server'

const META_GRAPH_API = 'https://graph.facebook.com/v18.0'

export interface InstagramInsights {
  accountId: string
  username: string
  // Basic account info
  followersCount: number
  followsCount: number
  mediaCount: number
  // Insights (last 30 days)
  reach: number
  impressions: number
  profileViews: number
  websiteClicks: number
  // Follower demographics (if available)
  followerGrowth?: number
}

interface MetricValue {
  value: number
  end_time?: string
}

interface InsightData {
  name: string
  period: string
  values: MetricValue[]
  title: string
  description: string
}

/**
 * Fetch Instagram account info
 */
async function getAccountInfo(
  businessAccountId: string,
  accessToken: string
): Promise<{ followersCount: number; followsCount: number; mediaCount: number; username: string }> {
  const url = new URL(`${META_GRAPH_API}/${businessAccountId}`)
  url.searchParams.set('fields', 'followers_count,follows_count,media_count,username')
  url.searchParams.set('access_token', accessToken)

  const response = await fetch(url.toString())
  const data = await response.json()

  if (!response.ok) {
    console.error('[instagram] Account info error:', data)
    throw new Error(data.error?.message || 'Failed to fetch account info')
  }

  return {
    followersCount: data.followers_count || 0,
    followsCount: data.follows_count || 0,
    mediaCount: data.media_count || 0,
    username: data.username || '',
  }
}

/**
 * Fetch Instagram insights metrics
 * Metrics available: impressions, reach, profile_views, website_clicks, follower_count
 */
async function getInsightsMetrics(
  businessAccountId: string,
  accessToken: string
): Promise<{
  reach: number
  impressions: number
  profileViews: number
  websiteClicks: number
}> {
  // Get insights for the last 30 days
  const url = new URL(`${META_GRAPH_API}/${businessAccountId}/insights`)
  url.searchParams.set('metric', 'impressions,reach,profile_views,website_clicks')
  url.searchParams.set('period', 'day')
  url.searchParams.set('metric_type', 'total_value')
  url.searchParams.set('access_token', accessToken)

  const response = await fetch(url.toString())
  const data = await response.json()

  if (!response.ok) {
    // Some metrics might not be available for all accounts
    console.warn('[instagram] Insights error (non-fatal):', data.error?.message)
    return {
      reach: 0,
      impressions: 0,
      profileViews: 0,
      websiteClicks: 0,
    }
  }

  const insights: InsightData[] = data.data || []
  
  // Sum up values from the insights
  const result = {
    reach: 0,
    impressions: 0,
    profileViews: 0,
    websiteClicks: 0,
  }

  for (const insight of insights) {
    const totalValue = insight.values?.reduce((sum, v) => sum + (v.value || 0), 0) || 0
    
    switch (insight.name) {
      case 'reach':
        result.reach = totalValue
        break
      case 'impressions':
        result.impressions = totalValue
        break
      case 'profile_views':
        result.profileViews = totalValue
        break
      case 'website_clicks':
        result.websiteClicks = totalValue
        break
    }
  }

  return result
}

/**
 * Get complete Instagram insights for a model
 */
export async function getInstagramInsights(modelId: string): Promise<InstagramInsights | null> {
  const supabase = await createAdminClient()

  // Get model's Instagram credentials
  const { data: model, error } = await supabase
    .from('models')
    .select('instagram_business_id, instagram_access_token, instagram_username')
    .eq('id', modelId)
    .single()

  if (error || !model?.instagram_business_id || !model?.instagram_access_token) {
    console.log('[instagram] No Instagram connection for model:', modelId)
    return null
  }

  try {
    // Fetch account info and insights in parallel
    const [accountInfo, insightsMetrics] = await Promise.all([
      getAccountInfo(model.instagram_business_id, model.instagram_access_token),
      getInsightsMetrics(model.instagram_business_id, model.instagram_access_token),
    ])

    return {
      accountId: model.instagram_business_id,
      username: accountInfo.username || model.instagram_username || '',
      followersCount: accountInfo.followersCount,
      followsCount: accountInfo.followsCount,
      mediaCount: accountInfo.mediaCount,
      reach: insightsMetrics.reach,
      impressions: insightsMetrics.impressions,
      profileViews: insightsMetrics.profileViews,
      websiteClicks: insightsMetrics.websiteClicks,
    }
  } catch (error) {
    console.error('[instagram] Error fetching insights:', error)
    return null
  }
}

/**
 * Get Instagram insights for all models in an agency
 */
export async function getAgencyInstagramInsights(agencyId: string): Promise<Map<string, InstagramInsights>> {
  const supabase = await createAdminClient()

  // Get all models with Instagram connected
  const { data: models, error } = await supabase
    .from('models')
    .select('id, instagram_business_id, instagram_access_token, instagram_username')
    .eq('agency_id', agencyId)
    .not('instagram_business_id', 'is', null)

  if (error || !models) {
    console.error('[instagram] Error fetching models:', error)
    return new Map()
  }

  const results = new Map<string, InstagramInsights>()

  for (const model of models) {
    if (!model.instagram_business_id || !model.instagram_access_token) continue

    try {
      const insights = await getInstagramInsights(model.id)
      if (insights) {
        results.set(model.id, insights)
      }
    } catch (error) {
      console.error(`[instagram] Error for model ${model.id}:`, error)
    }
  }

  return results
}

/**
 * Check if Instagram token needs refresh (expires within 7 days)
 */
export async function checkTokensNeedingRefresh(agencyId: string): Promise<string[]> {
  const supabase = await createAdminClient()
  
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

  const { data: models, error } = await supabase
    .from('models')
    .select('id, name, instagram_username, instagram_token_expires_at')
    .eq('agency_id', agencyId)
    .not('instagram_token_expires_at', 'is', null)
    .lt('instagram_token_expires_at', sevenDaysFromNow.toISOString())

  if (error || !models) {
    return []
  }

  return models.map(m => m.name || m.id)
}
