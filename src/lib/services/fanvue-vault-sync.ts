/**
 * Fanvue Vault Sync Service
 * Syncs media from Fanvue creator media library to content_assets table.
 *
 * IMPORTANT: Uses the agency endpoint GET /creators/{uuid}/media
 * (NOT /vault/folders which requires a personal token).
 * Scopes required: read:creator, read:media
 */

import { createAdminClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'
import { getAgencyFanvueToken } from '@/lib/services/agency-fanvue-auth'

export interface VaultSyncResult {
  success: boolean
  assetsSynced: number
  assetsSkipped: number
  totalMediaFound: number
  errors: string[]
  modelResults: Array<{
    modelId: string
    modelName: string
    synced: number
    skipped: number
    total: number
    error?: string
  }>
}

const MAX_PAGES = 20 // Safety limit: 20 pages × 50 items = 1000 media per creator (keeps within Vercel 120s timeout)
const PAGE_SIZE = 50 // Max allowed by Fanvue API

/**
 * Sync Fanvue media library for a specific model using the agency endpoint
 */
export async function syncFanvueVault(modelId: string): Promise<VaultSyncResult> {
  const supabase = createAdminClient()
  const modelResults: VaultSyncResult['modelResults'] = []

  try {
    // Get model details including fanvue_user_uuid
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id, agency_id, fanvue_user_uuid, fanvue_access_token, name')
      .eq('id', modelId)
      .single()

    if (modelError || !model) {
      return {
        success: false,
        assetsSynced: 0,
        assetsSkipped: 0,
        totalMediaFound: 0,
        errors: ['Model not found or no access'],
        modelResults: [],
      }
    }

    if (!model.fanvue_user_uuid) {
      return {
        success: false,
        assetsSynced: 0,
        assetsSkipped: 0,
        totalMediaFound: 0,
        errors: [
          `Model "${model.name}" has no fanvue_user_uuid. Sync creator stats first to populate this field.`,
        ],
        modelResults: [],
      }
    }

    // Get agency token (required for the /creators/{uuid}/media endpoint)
    let accessToken: string | null = null

    if (model.agency_id) {
      try {
        accessToken = await getAgencyFanvueToken(model.agency_id)
      } catch (e) {
        console.warn(
          `[Vault Sync] Agency token failed for ${model.name}:`,
          e instanceof Error ? e.message : e
        )
      }
    }

    // Fallback to model's own token (won't work for agency endpoint, but try anyway)
    if (!accessToken && model.fanvue_access_token) {
      accessToken = model.fanvue_access_token
    }

    if (!accessToken) {
      return {
        success: false,
        assetsSynced: 0,
        assetsSkipped: 0,
        totalMediaFound: 0,
        errors: [
          'No Fanvue access token available. Agency admin may need to reconnect their Fanvue account via OAuth.',
        ],
        modelResults: [],
      }
    }

    const result = await syncModelMedia(supabase, accessToken, model)
    modelResults.push(result)

    const totalSynced = result.synced
    const totalSkipped = result.skipped
    const totalMedia = result.total

    return {
      success: !result.error,
      assetsSynced: totalSynced,
      assetsSkipped: totalSkipped,
      totalMediaFound: totalMedia,
      errors: result.error ? [result.error] : [],
      modelResults,
    }
  } catch (error) {
    console.error('[Vault Sync] Fatal error:', error)
    return {
      success: false,
      assetsSynced: 0,
      assetsSkipped: 0,
      totalMediaFound: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      modelResults,
    }
  }
}

/**
 * Sync Fanvue media library for all models in an agency
 */
export async function syncAgencyVault(agencyId: string): Promise<VaultSyncResult> {
  const supabase = createAdminClient()

  // Get agency token once (shared across all models)
  let accessToken: string
  try {
    accessToken = await getAgencyFanvueToken(agencyId)
  } catch (e) {
    return {
      success: false,
      assetsSynced: 0,
      assetsSkipped: 0,
      totalMediaFound: 0,
      errors: [`Failed to get agency Fanvue token: ${e instanceof Error ? e.message : String(e)}`],
      modelResults: [],
    }
  }

  // Get all active models with fanvue_user_uuid
  const { data: models, error } = await supabase
    .from('models')
    .select('id, name, fanvue_user_uuid')
    .eq('agency_id', agencyId)
    .eq('status', 'active')

  if (error || !models || models.length === 0) {
    return {
      success: false,
      assetsSynced: 0,
      assetsSkipped: 0,
      totalMediaFound: 0,
      errors: ['No active models found for this agency'],
      modelResults: [],
    }
  }

  const modelResults: VaultSyncResult['modelResults'] = []
  let totalSynced = 0
  let totalSkipped = 0
  let totalMedia = 0
  const errors: string[] = []

  // Sync each model sequentially (to avoid rate limiting)
  for (const model of models) {
    if (!model.fanvue_user_uuid) {
      modelResults.push({
        modelId: model.id,
        modelName: model.name,
        synced: 0,
        skipped: 0,
        total: 0,
        error: 'No fanvue_user_uuid — sync creator stats first',
      })
      continue
    }

    try {
      const result = await syncModelMedia(supabase, accessToken, {
        id: model.id,
        agency_id: agencyId,
        fanvue_user_uuid: model.fanvue_user_uuid,
        name: model.name,
      })
      modelResults.push(result)
      totalSynced += result.synced
      totalSkipped += result.skipped
      totalMedia += result.total
      if (result.error) {
        errors.push(`${model.name}: ${result.error}`)
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e)
      errors.push(`${model.name}: ${errMsg}`)
      modelResults.push({
        modelId: model.id,
        modelName: model.name,
        synced: 0,
        skipped: 0,
        total: 0,
        error: errMsg,
      })
    }
  }

  return {
    success: errors.length === 0,
    assetsSynced: totalSynced,
    assetsSkipped: totalSkipped,
    totalMediaFound: totalMedia,
    errors,
    modelResults,
  }
}

/**
 * Sync media for a single model by paginating through the agency media endpoint
 */
async function syncModelMedia(
  supabase: ReturnType<typeof createAdminClient>,
  accessToken: string,
  model: {
    id: string
    agency_id: string
    fanvue_user_uuid: string
    name: string
  }
): Promise<VaultSyncResult['modelResults'][0]> {
  const fanvue = createFanvueClient(accessToken)

  let page = 1
  let hasMore = true
  let synced = 0
  let skipped = 0
  let total = 0

  console.log(
    `[Vault Sync] Starting media sync for "${model.name}" (uuid: ${model.fanvue_user_uuid})`
  )

  try {
    while (hasMore && page <= MAX_PAGES) {
      // Fetch media with main + thumbnail variants so we get actual URLs
      const response = await fanvue.getCreatorMedia(model.fanvue_user_uuid, {
        page,
        size: PAGE_SIZE,
        variants: 'main,thumbnail',
      })

      if (!response?.data || response.data.length === 0) {
        break
      }

      total += response.data.length

      // Process each media item
      for (const media of response.data) {
        // Skip non-finalized media (only uuid + status returned for those)
        if (!media.mediaType) {
          skipped++
          continue
        }

        // Extract URLs from variants
        let mainUrl = media.url || ''
        let thumbnailUrl: string | null = null

        if (media.variants && media.variants.length > 0) {
          const mainVariant = media.variants.find(v => v.variantType === 'main')
          const thumbVariant = media.variants.find(v => v.variantType === 'thumbnail')

          if (mainVariant?.url) mainUrl = mainVariant.url
          if (thumbVariant?.url) thumbnailUrl = thumbVariant.url
        }

        // Map Fanvue media type to our file_type
        const fileType =
          media.mediaType === 'image'
            ? 'image'
            : media.mediaType === 'video'
              ? 'video'
              : media.mediaType === 'audio'
                ? 'audio'
                : 'image'

        const asset = {
          agency_id: model.agency_id,
          model_id: model.id,
          file_name: media.name || `${model.name}-${media.uuid}`,
          file_type: fileType,
          media_type: media.mediaType,
          url: mainUrl,
          file_url: mainUrl,
          thumbnail_url: thumbnailUrl,
          fanvue_media_uuid: media.uuid,
          title: media.name || media.caption || `Media ${media.uuid.slice(0, 8)}`,
          description: media.description || media.caption || null,
          content_type: 'ppv' as const,
          tags: ['fanvue-vault', fileType],
          price: media.recommendedPrice || 0,
          created_at: media.createdAt || new Date().toISOString(),
        }

        const { error: upsertError } = await supabase.from('content_assets').upsert(asset, {
          onConflict: 'fanvue_media_uuid',
        })

        if (upsertError) {
          console.error(`[Vault Sync] Failed to upsert media ${media.uuid}:`, upsertError.message)
          skipped++
        } else {
          synced++
        }
      }

      hasMore = response.pagination?.hasMore ?? false
      page++

      // Small delay between pages to avoid rate limiting
      if (hasMore) {
        await new Promise(r => setTimeout(r, 200))
      }
    }

    console.log(
      `[Vault Sync] "${model.name}": ${synced} synced, ${skipped} skipped, ${total} found across ${page - 1} pages`
    )

    return {
      modelId: model.id,
      modelName: model.name,
      synced,
      skipped,
      total,
    }
  } catch (e: unknown) {
    const err = e as { status?: number; statusCode?: number; message?: string }
    const status = err.status || err.statusCode || 'unknown'
    const msg = err.message || String(e)

    let hint = ''
    if (status === 401) {
      hint = ' Token may be expired — reconnect the agency Fanvue account.'
    } else if (status === 403) {
      hint =
        ' The OAuth token may be missing read:media scope. Re-authorize with the correct permissions.'
    } else if (status === 404) {
      hint = ` Creator UUID ${model.fanvue_user_uuid} may be incorrect.`
    }

    const errorMsg = `Fanvue API error (${status}): ${msg}.${hint}`
    console.error(`[Vault Sync] "${model.name}":`, errorMsg)

    return {
      modelId: model.id,
      modelName: model.name,
      synced,
      skipped,
      total,
      error: errorMsg,
    }
  }
}
