/**
 * Fanvue Vault Sync Service
 * Syncs media from Fanvue Vault to content_assets table
 */

import { createAdminClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'
import { getAgencyFanvueToken } from '@/lib/services/agency-fanvue-auth'

export interface VaultSyncResult {
  success: boolean
  assetsSynced: number
  errors: string[]
}

/**
 * Sync Fanvue Vault media for a specific model
 */
export async function syncFanvueVault(modelId: string): Promise<VaultSyncResult> {
  const supabase = createAdminClient()

  try {
    // Get model details
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id, agency_id, fanvue_access_token, name')
      .eq('id', modelId)
      .single()

    if (modelError || !model) {
      return {
        success: false,
        assetsSynced: 0,
        errors: ['Model not found or no access'],
      }
    }

    // Use agency token as primary source (OAuth token has correct scopes)
    // Fall back to model's own token only if no agency connection
    let accessToken: string | null = null
    let tokenSource = 'none'

    if (model.agency_id) {
      try {
        accessToken = await getAgencyFanvueToken(model.agency_id)
        tokenSource = 'agency'
      } catch (e) {
        console.warn(
          `[Vault Sync] Agency token failed for ${model.name}:`,
          e instanceof Error ? e.message : e
        )
      }
    }

    if (!accessToken && model.fanvue_access_token) {
      accessToken = model.fanvue_access_token
      tokenSource = 'model'
    }

    if (!accessToken) {
      return {
        success: false,
        assetsSynced: 0,
        errors: [
          'No Fanvue access token available. Agency admin may need to reconnect their Fanvue account via OAuth.',
        ],
      }
    }

    // Initialize Fanvue client
    const fanvueClient = createFanvueClient(accessToken)

    // Fetch media from Fanvue Vault
    let vaultFolders
    try {
      vaultFolders = await fanvueClient.getVaultFolders()
    } catch (vaultError: any) {
      const status = vaultError?.status || vaultError?.statusCode || 'unknown'
      const msg = vaultError?.message || String(vaultError)
      let hint = ''
      if (status === 401) {
        hint = ' Token may be expired — try reconnecting the agency Fanvue account.'
      } else if (status === 403) {
        hint =
          ' The OAuth token may be missing the read:media scope. Re-authorize with the correct permissions.'
      }
      return {
        success: false,
        assetsSynced: 0,
        errors: [`Vault API error (${status}, token: ${tokenSource}): ${msg}.${hint}`],
      }
    }

    let totalSynced = 0
    const errors: string[] = []

    // Iterate through folders and fetch media
    for (const folder of vaultFolders.data) {
      try {
        const folderMedia = await fanvueClient.getVaultFolderMedia(folder.name, {
          size: 100, // Fetch 100 media items per folder
        })

        // Map Fanvue media to content_assets format
        const assets = folderMedia.data.map(media => ({
          agency_id: model.agency_id,
          model_id: model.id,
          file_name: media.name || `${folder.name}-${media.uuid}`,
          file_type:
            media.mediaType === 'image' ? 'image' : media.mediaType === 'video' ? 'video' : 'audio',
          media_type: media.mediaType,
          file_url: '', // Fanvue doesn't expose direct URLs in vault API
          thumbnail_url: null,
          fanvue_media_uuid: media.uuid,
          fanvue_folder: folder.name,
          title: media.name || folder.name,
          description: `From Fanvue Vault: ${folder.name}`,
          content_type: 'ppv' as const, // Default to PPV
          tags: [folder.name, 'fanvue-vault'],
          created_at: media.createdAt,
        }))

        // Upsert assets (avoid duplicates based on fanvue_media_uuid)
        for (const asset of assets) {
          const { error: upsertError } = await supabase.from('content_assets').upsert(asset, {
            onConflict: 'fanvue_media_uuid',
            ignoreDuplicates: true,
          })

          if (upsertError) {
            errors.push(`Failed to sync ${asset.file_name}: ${upsertError.message}`)
          } else {
            totalSynced++
          }
        }
      } catch (folderError) {
        errors.push(
          `Failed to sync folder ${folder.name}: ${folderError instanceof Error ? folderError.message : 'Unknown error'}`
        )
      }
    }

    return {
      success: errors.length === 0,
      assetsSynced: totalSynced,
      errors,
    }
  } catch (error) {
    console.error('Error syncing Fanvue vault:', error)
    return {
      success: false,
      assetsSynced: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Sync Fanvue Vault for all models in an agency
 */
export async function syncAgencyVault(agencyId: string): Promise<VaultSyncResult> {
  const supabase = createAdminClient()

  // Get all active models
  const { data: models, error } = await supabase
    .from('models')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('status', 'active')

  if (error || !models || models.length === 0) {
    return {
      success: false,
      assetsSynced: 0,
      errors: ['No active models found'],
    }
  }

  // Sync each model
  const results = await Promise.all(models.map(model => syncFanvueVault(model.id)))

  const totalSynced = results.reduce((sum, result) => sum + result.assetsSynced, 0)
  const allErrors = results.flatMap(result => result.errors)

  return {
    success: results.every(r => r.success),
    assetsSynced: totalSynced,
    errors: allErrors,
  }
}
