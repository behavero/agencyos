/**
 * Top Spenders Syncer
 * Syncs VIP fan data from Fanvue API to our database
 * Part of Phase A: Complete the Core Loop
 */

import { FanvueClient } from '@/lib/fanvue/client'
import { createAdminClient } from '@/lib/supabase/server'

interface TopSpenderData {
  model_id: string
  fan_uuid: string
  fan_handle: string
  fan_display_name: string
  fan_nickname: string | null
  fan_avatar_url: string | null
  gross_cents: number
  net_cents: number
  message_count: number
  is_top_spender: boolean
  registered_at: string
  last_synced_at: string
}

/**
 * Sync top spenders for a single creator
 * Fetches up to 50 top spenders and upserts them to the database
 */
export async function syncCreatorTopSpenders(
  modelId: string,
  creatorUserUuid: string,
  accessToken: string
): Promise<{
  success: boolean
  spendersCount: number
  totalSpent: number
  error?: string
}> {
  try {
    console.log(`[Top Spenders Sync] Starting for model ${modelId}...`)

    const fanvue = new FanvueClient(accessToken)

    // Fetch top 50 spenders (all-time)
    const response = await fanvue.getCreatorTopSpenders(creatorUserUuid, {
      size: 50,
      page: 1,
      // No date filters = all-time top spenders
    })

    if (!response.data || response.data.length === 0) {
      console.log(`[Top Spenders Sync] No top spenders found for model ${modelId}`)
      return { success: true, spendersCount: 0, totalSpent: 0 }
    }

    // Transform data for database
    const topSpenders: TopSpenderData[] = response.data.map(spender => ({
      model_id: modelId,
      fan_uuid: spender.user.uuid,
      fan_handle: spender.user.handle,
      fan_display_name: spender.user.displayName,
      fan_nickname: spender.user.nickname,
      fan_avatar_url: spender.user.avatarUrl,
      gross_cents: spender.gross,
      net_cents: spender.net,
      message_count: spender.messages,
      is_top_spender: spender.user.isTopSpender,
      registered_at: spender.user.registeredAt,
      last_synced_at: new Date().toISOString(),
    }))

    // Upsert to database (update existing, insert new)
    const adminClient = createAdminClient()
    const { error: upsertError } = await adminClient
      .from('creator_top_spenders')
      .upsert(topSpenders, {
        onConflict: 'model_id,fan_uuid',
        ignoreDuplicates: false, // Update existing records
      })

    if (upsertError) {
      console.error('[Top Spenders Sync] Upsert error:', upsertError)
      return {
        success: false,
        spendersCount: 0,
        totalSpent: 0,
        error: upsertError.message,
      }
    }

    const totalSpent = topSpenders.reduce((sum, s) => sum + s.net_cents, 0)

    console.log(
      `[Top Spenders Sync] ✅ Synced ${topSpenders.length} spenders (Total: $${(totalSpent / 100).toFixed(2)})`
    )

    return {
      success: true,
      spendersCount: topSpenders.length,
      totalSpent,
    }
  } catch (error) {
    console.error('[Top Spenders Sync] Error:', error)
    return {
      success: false,
      spendersCount: 0,
      totalSpent: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Sync top spenders for all creators in an agency
 * Runs syncs in parallel for better performance
 */
export async function syncAgencyTopSpenders(
  agencyId: string,
  accessToken: string
): Promise<{
  success: boolean
  totalSpenders: number
  totalRevenue: number
  creatorsProcessed: number
  errors: string[]
}> {
  try {
    console.log(`[Agency Top Spenders Sync] Starting for agency ${agencyId}...`)

    // Get all models in this agency with their fanvue_user_uuid
    const adminClient = createAdminClient()
    const { data: models, error: modelsError } = await adminClient
      .from('models')
      .select('id, name, fanvue_user_uuid')
      .eq('agency_id', agencyId)
      .not('fanvue_user_uuid', 'is', null)

    if (modelsError || !models) {
      throw new Error(`Failed to fetch models: ${modelsError?.message}`)
    }

    console.log(`[Agency Top Spenders Sync] Found ${models.length} creators to sync`)

    // Sync all creators in parallel
    const results = await Promise.all(
      models.map(model => syncCreatorTopSpenders(model.id, model.fanvue_user_uuid!, accessToken))
    )

    // Aggregate results
    const totalSpenders = results.reduce((sum, r) => sum + r.spendersCount, 0)
    const totalRevenue = results.reduce((sum, r) => sum + r.totalSpent, 0)
    const errors = results.filter(r => r.error).map(r => r.error!)
    const creatorsProcessed = results.filter(r => r.success).length

    console.log(
      `[Agency Top Spenders Sync] ✅ Complete: ${totalSpenders} spenders across ${creatorsProcessed} creators`
    )
    console.log(
      `[Agency Top Spenders Sync] Total revenue tracked: $${(totalRevenue / 100).toFixed(2)}`
    )

    if (errors.length > 0) {
      console.error(`[Agency Top Spenders Sync] ⚠️ ${errors.length} errors occurred:`, errors)
    }

    return {
      success: errors.length === 0,
      totalSpenders,
      totalRevenue,
      creatorsProcessed,
      errors,
    }
  } catch (error) {
    console.error('[Agency Top Spenders Sync] Fatal error:', error)
    return {
      success: false,
      totalSpenders: 0,
      totalRevenue: 0,
      creatorsProcessed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Get agency-wide VIP fans (fans who spend across multiple creators)
 * This queries the database view for aggregated data
 */
export async function getAgencyVIPFans(agencyId: string, limit = 50) {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient.rpc('get_agency_vip_fans', {
      p_agency_id: agencyId,
      p_limit: limit,
    })

    if (error) {
      console.error('[Get Agency VIP Fans] Error:', error)
      return { success: false, fans: [], error: error.message }
    }

    return { success: true, fans: data || [], error: null }
  } catch (error) {
    console.error('[Get Agency VIP Fans] Error:', error)
    return {
      success: false,
      fans: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
