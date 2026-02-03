/**
 * Tracking Links Syncer
 * 
 * Syncs tracking link data from Fanvue API to database.
 * Includes clicks, follows, subscribers, and revenue data.
 */

import { createAdminClient } from '@/lib/supabase/server'

const FANVUE_API_VERSION = '2025-06-26'

interface FanvueTrackingLink {
  uuid: string
  name: string
  linkUrl: string
  externalSocialPlatform: string | null
  createdAt: string
  clicks: number
  // Additional fields that may be returned by the API
  followsCount?: number
  subsCount?: number
  subsRevenue?: number
  userSpend?: number
}

interface TrackingLinksResponse {
  data: FanvueTrackingLink[]
  nextCursor: string | null
}

interface SyncResult {
  synced: number
  errors: string[]
}

/**
 * Fetch tracking links from Fanvue API for a creator
 */
async function fetchTrackingLinks(
  creatorUuid: string,
  accessToken: string,
  cursor?: string
): Promise<TrackingLinksResponse> {
  const url = new URL(`https://api.fanvue.com/creators/${creatorUuid}/tracking-links`)
  url.searchParams.set('limit', '50')
  if (cursor) {
    url.searchParams.set('cursor', cursor)
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Fanvue-API-Version': FANVUE_API_VERSION,
    },
  })

  if (!response.ok) {
    throw new Error(`Fanvue API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Sync tracking links for a single model/creator
 */
export async function syncTrackingLinksForModel(
  modelId: string,
  agencyId: string,
  creatorUuid: string,
  accessToken: string
): Promise<SyncResult> {
  const supabase = await createAdminClient()
  const result: SyncResult = { synced: 0, errors: [] }

  try {
    let cursor: string | undefined
    let allLinks: FanvueTrackingLink[] = []

    // Fetch all pages
    do {
      const response = await fetchTrackingLinks(creatorUuid, accessToken, cursor)
      allLinks = allLinks.concat(response.data)
      cursor = response.nextCursor || undefined
    } while (cursor)

    console.log(`[tracking-links] Fetched ${allLinks.length} links for model ${modelId}`)

    // Upsert each tracking link
    for (const link of allLinks) {
      const { error } = await supabase
        .from('tracking_links')
        .upsert({
          fanvue_uuid: link.uuid,
          model_id: modelId,
          agency_id: agencyId,
          name: link.name,
          link_url: link.linkUrl,
          external_social_platform: link.externalSocialPlatform,
          clicks: link.clicks || 0,
          follows_count: link.followsCount || 0,
          subs_count: link.subsCount || 0,
          subs_revenue: link.subsRevenue || 0,
          user_spend: link.userSpend || 0,
          link_created_at: link.createdAt,
          last_synced_at: new Date().toISOString(),
        }, {
          onConflict: 'fanvue_uuid,model_id',
        })

      if (error) {
        result.errors.push(`Failed to upsert link ${link.name}: ${error.message}`)
      } else {
        result.synced++
      }
    }
  } catch (error) {
    result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return result
}

/**
 * Sync tracking links for all models in an agency
 */
export async function syncAllTrackingLinks(agencyId: string): Promise<{
  totalSynced: number
  modelsProcessed: number
  errors: string[]
}> {
  const supabase = await createAdminClient()
  
  // Get all models with Fanvue connection
  const { data: models, error: modelsError } = await supabase
    .from('models')
    .select('id, name, fanvue_user_uuid, fanvue_access_token')
    .eq('agency_id', agencyId)
    .not('fanvue_user_uuid', 'is', null)

  if (modelsError) {
    throw new Error(`Failed to fetch models: ${modelsError.message}`)
  }

  let totalSynced = 0
  let modelsProcessed = 0
  const errors: string[] = []

  for (const model of models || []) {
    if (!model.fanvue_user_uuid) continue

    // Get token - try model's own token first, then fall back to agency token
    let token = model.fanvue_access_token

    if (!token) {
      // Try to get agency admin token
      const { data: agencyModel } = await supabase
        .from('models')
        .select('fanvue_access_token')
        .eq('agency_id', agencyId)
        .not('fanvue_access_token', 'is', null)
        .limit(1)
        .single()

      token = agencyModel?.fanvue_access_token
    }

    if (!token) {
      errors.push(`No access token for model ${model.name}`)
      continue
    }

    try {
      const result = await syncTrackingLinksForModel(
        model.id,
        agencyId,
        model.fanvue_user_uuid,
        token
      )
      
      totalSynced += result.synced
      modelsProcessed++
      
      if (result.errors.length > 0) {
        errors.push(...result.errors.map(e => `[${model.name}] ${e}`))
      }
      
      console.log(`[tracking-links] Synced ${result.synced} links for ${model.name}`)
    } catch (error) {
      errors.push(`[${model.name}] ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return { totalSynced, modelsProcessed, errors }
}

/**
 * Get top tracking links for dashboard display
 */
export async function getTopTrackingLinks(
  agencyId: string,
  options: {
    modelId?: string
    sortBy?: 'clicks' | 'subs_count' | 'total_revenue' | 'roi'
    limit?: number
  } = {}
): Promise<{
  id: string
  name: string
  platform: string | null
  clicks: number
  followsCount: number
  subsCount: number
  subsRevenue: number
  userSpend: number
  totalRevenue: number
  conversionRate: number
  roi: number
  createdAt: string
}[]> {
  const supabase = await createAdminClient()
  const { sortBy = 'total_revenue', limit = 10, modelId } = options

  let query = supabase
    .from('tracking_links')
    .select('*')
    .eq('agency_id', agencyId)
    .gt('clicks', 0) // Only links with clicks
    .order(sortBy === 'roi' ? 'total_revenue' : sortBy, { ascending: false })
    .limit(limit)

  if (modelId) {
    query = query.eq('model_id', modelId)
  }

  const { data: links, error } = await query

  if (error) {
    console.error('[tracking-links] Error fetching top links:', error)
    return []
  }

  // Calculate derived metrics and sort by ROI if needed
  const enrichedLinks = (links || []).map(link => ({
    id: link.id,
    name: link.name,
    platform: link.external_social_platform,
    clicks: link.clicks,
    followsCount: link.follows_count,
    subsCount: link.subs_count,
    subsRevenue: Number(link.subs_revenue),
    userSpend: Number(link.user_spend),
    totalRevenue: Number(link.total_revenue),
    conversionRate: link.clicks > 0 ? (link.subs_count / link.clicks) * 100 : 0,
    roi: link.clicks > 0 ? Number(link.total_revenue) / link.clicks : 0,
    createdAt: link.link_created_at,
  }))

  // Sort by ROI if requested
  if (sortBy === 'roi') {
    enrichedLinks.sort((a, b) => b.roi - a.roi)
  }

  return enrichedLinks
}

/**
 * Calculate Click-to-Sub rate for all tracking links
 */
export async function getClickToSubRate(
  agencyId: string,
  modelId?: string
): Promise<{
  totalClicks: number
  totalSubs: number
  rate: number
}> {
  const supabase = await createAdminClient()

  let query = supabase
    .from('tracking_links')
    .select('clicks, subs_count')
    .eq('agency_id', agencyId)

  if (modelId) {
    query = query.eq('model_id', modelId)
  }

  const { data: links, error } = await query

  if (error || !links) {
    return { totalClicks: 0, totalSubs: 0, rate: 0 }
  }

  const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0)
  const totalSubs = links.reduce((sum, link) => sum + link.subs_count, 0)
  const rate = totalClicks > 0 ? (totalSubs / totalClicks) * 100 : 0

  return { totalClicks, totalSubs, rate }
}
