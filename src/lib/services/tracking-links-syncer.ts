/**
 * Tracking Links Syncer
 *
 * Syncs tracking link data from Fanvue API to database.
 * Uses the agency endpoint: GET /creators/{creatorUserUuid}/tracking-links
 * which returns: uuid, name, linkUrl, externalSocialPlatform, createdAt, clicks
 *
 * NOTE: The Fanvue API does NOT return engagement (followers/subs) or earnings
 * data per tracking link. Only clicks are available from the API.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'
import { getAgencyFanvueToken } from '@/lib/services/agency-fanvue-auth'

interface SyncResult {
  synced: number
  errors: string[]
}

/**
 * Sync tracking links for a single model/creator using the Fanvue client
 */
export async function syncTrackingLinksForModel(
  modelId: string,
  agencyId: string,
  creatorUuid: string,
  accessToken: string
): Promise<SyncResult> {
  const supabase = createAdminClient()
  const fanvue = createFanvueClient(accessToken)
  const result: SyncResult = { synced: 0, errors: [] }

  try {
    let cursor: string | undefined
    let allLinks: Array<{
      uuid: string
      name: string
      linkUrl: string
      externalSocialPlatform: string
      createdAt: string
      clicks: number
      followsCount?: number
      subsCount?: number
      subsRevenue?: number
      userSpend?: number
    }> = []

    // Fetch all pages using the Fanvue client
    do {
      try {
        const response = await fanvue.getCreatorTrackingLinks(creatorUuid, {
          limit: 50,
          cursor,
        })
        allLinks = allLinks.concat(response.data || [])
        cursor = response.nextCursor || undefined
        console.log(
          `[tracking-links] Page fetched for ${creatorUuid}: ${response.data?.length || 0} links`
        )
      } catch (e: unknown) {
        const err = e as { statusCode?: number; message?: string }
        // 404 = no tracking links for this creator — not an error
        if (err.statusCode === 404) {
          console.log(`[tracking-links] No tracking links for creator ${creatorUuid} (404)`)
          break
        }
        // 403 = missing scope — token doesn't have read:tracking_links permission
        if (err.statusCode === 403) {
          console.error(
            `[tracking-links] 403 Forbidden for creator ${creatorUuid}. ` +
              `Token likely missing 'read:tracking_links' scope. Re-authorize with correct scopes.`
          )
          result.errors.push(
            `403 Forbidden: Token missing 'read:tracking_links' scope for ${creatorUuid}`
          )
          break
        }
        throw e
      }
    } while (cursor)

    console.log(
      `[tracking-links] Total fetched: ${allLinks.length} links for model ${modelId} (creator ${creatorUuid})`
    )

    // Log first link's fields to verify what the API returns
    if (allLinks.length > 0) {
      const sample = allLinks[0]
      console.log(
        `[tracking-links] Sample link fields: ${JSON.stringify({
          name: sample.name,
          clicks: sample.clicks,
          followsCount: sample.followsCount,
          subsCount: sample.subsCount,
          subsRevenue: sample.subsRevenue,
          userSpend: sample.userSpend,
        })}`
      )
    }

    // Upsert each tracking link
    for (const link of allLinks) {
      const { error } = await supabase.from('tracking_links').upsert(
        {
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
          // NOTE: total_revenue is a GENERATED column (subs_revenue + user_spend) — do NOT include it
          link_created_at: link.createdAt,
          last_synced_at: new Date().toISOString(),
        },
        {
          onConflict: 'fanvue_uuid,model_id',
        }
      )

      if (error) {
        console.error(
          `[tracking-links] Upsert error for link "${link.name}":`,
          error.message,
          error.details,
          error.hint
        )
        result.errors.push(`Failed to upsert link ${link.name}: ${error.message}`)
      } else {
        result.synced++
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[tracking-links] Sync failed for model ${modelId}:`, msg)
    result.errors.push(`Sync failed: ${msg}`)
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
  const supabase = createAdminClient()

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

  // Get agency OAuth token from agency_fanvue_connections (source of truth)
  let agencyToken: string | null = null
  try {
    agencyToken = await getAgencyFanvueToken(agencyId)
    console.log('[tracking-links] Using agency connection token')
  } catch {
    // Fall back to model-level token if agency connection unavailable
    const { data: agencyAdmin } = await supabase
      .from('models')
      .select('fanvue_access_token')
      .eq('agency_id', agencyId)
      .not('fanvue_access_token', 'is', null)
      .limit(1)
      .single()
    agencyToken = agencyAdmin?.fanvue_access_token || null
    if (agencyToken) {
      console.log('[tracking-links] Using model-level token as fallback')
    }
  }

  if (!agencyToken) {
    throw new Error('No agency access token available')
  }

  for (const model of models || []) {
    if (!model.fanvue_user_uuid) continue

    try {
      console.log(`[tracking-links] Syncing for ${model.name} (uuid: ${model.fanvue_user_uuid})...`)
      const result = await syncTrackingLinksForModel(
        model.id,
        agencyId,
        model.fanvue_user_uuid,
        agencyToken
      )

      totalSynced += result.synced
      modelsProcessed++

      if (result.errors.length > 0) {
        errors.push(...result.errors.map(e => `[${model.name}] ${e}`))
      }

      console.log(`[tracking-links] Synced ${result.synced} links for ${model.name}`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`[${model.name}] ${msg}`)
      console.error(`[tracking-links] Error for ${model.name}:`, msg)
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
): Promise<
  {
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
    modelName?: string
  }[]
> {
  const supabase = createAdminClient()
  const { sortBy = 'total_revenue', limit = 10, modelId } = options

  // Build query — include model name for "all models" view
  let query = supabase
    .from('tracking_links')
    .select('*, models(name)')
    .eq('agency_id', agencyId)
    .order(sortBy === 'roi' ? 'total_revenue' : sortBy, { ascending: false })
    .limit(limit)

  if (modelId) {
    query = query.eq('model_id', modelId)
  }

  const { data: links, error } = await query

  if (error) {
    console.error('[tracking-links] Error fetching top links:', error.message, error.details)
    return []
  }

  console.log(
    `[tracking-links] getTopTrackingLinks: agencyId=${agencyId}, modelId=${modelId || 'all'}, found=${links?.length || 0}`
  )

  // Calculate derived metrics and sort by ROI if needed
  const enrichedLinks = (links || []).map((link: Record<string, unknown>) => ({
    id: link.id as string,
    name: link.name as string,
    platform: link.external_social_platform as string | null,
    clicks: link.clicks as number,
    followsCount: link.follows_count as number,
    subsCount: link.subs_count as number,
    subsRevenue: Number(link.subs_revenue),
    userSpend: Number(link.user_spend),
    totalRevenue: Number(link.total_revenue),
    conversionRate:
      (link.clicks as number) > 0
        ? ((link.subs_count as number) / (link.clicks as number)) * 100
        : 0,
    roi: (link.clicks as number) > 0 ? Number(link.total_revenue) / (link.clicks as number) : 0,
    createdAt: link.link_created_at as string,
    modelName: (link.models as Record<string, unknown> | null)?.name as string | undefined,
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
  const supabase = createAdminClient()

  let query = supabase.from('tracking_links').select('clicks, subs_count').eq('agency_id', agencyId)

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
