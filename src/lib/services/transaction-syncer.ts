/**
 * Transaction Syncer Service
 * Phase 55 - Intelligent cursor-based incremental sync with automatic token refresh
 * Phase 59 - Agency-wide token system for seamless multi-creator sync
 *
 * This service fetches only NEW transactions from Fanvue API using cursor-based
 * pagination and automatic token refresh for resilient, scalable syncing.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { createFanvueClient, FanvueAPIError } from '@/lib/fanvue/client'
import { getModelAccessToken } from '@/lib/services/fanvue-auth'
import { getAgencyFanvueToken } from '@/lib/services/agency-fanvue-auth'

export interface SyncResult {
  success: boolean
  transactionsSynced: number
  errors: string[]
  lastSyncedDate?: Date
}

/**
 * Get the agency admin token for accessing all creators' data.
 * First checks the agency_fanvue_connections table (set by "Connect Fanvue" button),
 * then falls back to checking individual model tokens.
 */
async function getAgencyAdminToken(agencyId: string): Promise<string> {
  // First: try the agency connection (from "Connect Fanvue" OAuth)
  try {
    const token = await getAgencyFanvueToken(agencyId)
    console.log('🔑 Using agency Fanvue connection token')
    return token
  } catch {
    console.log('🔑 No agency connection, checking individual model tokens...')
  }

  // Fallback: look for any model with a personal token
  const supabase = createAdminClient()
  const { data: models } = await supabase
    .from('models')
    .select('id, name')
    .eq('agency_id', agencyId)
    .not('fanvue_access_token', 'is', null)
    .order('fanvue_token_expires_at', { ascending: false, nullsFirst: false })
    .limit(1)

  if (!models || models.length === 0) {
    throw new Error(
      'No Fanvue connection found. Click "Connect Fanvue" on the Creator Management page first.'
    )
  }

  const model = models[0]
  console.log(`🔑 Using model token from: ${model.name}`)
  const token = await getModelAccessToken(model.id)
  return token
}

/**
 * Sync transactions for a specific model
 * Fetches earnings data from Fanvue API and stores in fanvue_transactions table
 */
export async function syncModelTransactions(modelId: string): Promise<SyncResult> {
  const supabase = createAdminClient()

  try {
    // Get model details
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id, agency_id, fanvue_user_uuid, last_transaction_sync, fanvue_access_token')
      .eq('id', modelId)
      .single()

    if (modelError || !model) {
      return {
        success: false,
        transactionsSynced: 0,
        errors: ['Model not found or no access'],
      }
    }

    if (!model.fanvue_user_uuid) {
      return {
        success: false,
        transactionsSynced: 0,
        errors: ['Model has no Fanvue UUID. Import via agency first.'],
      }
    }

    console.log(`🔄 Starting incremental sync for model ${model.id}...`)

    // PHASE 59: Agency-wide token system
    // Try to get model's own token first, fall back to agency admin token
    let accessToken: string = ''
    let useAgencyEndpoint = false

    if (model.fanvue_access_token) {
      // Model has its own token - use it with regular endpoint
      try {
        accessToken = await getModelAccessToken(modelId)
        console.log('[✓] Using model own token')
      } catch (error) {
        console.log('[!] Model token refresh failed, falling back to agency token')
        useAgencyEndpoint = true
      }
    } else {
      // Model doesn't have a token - use agency admin token
      useAgencyEndpoint = true
    }

    // If using agency endpoint, get the agency admin token
    if (useAgencyEndpoint) {
      try {
        accessToken = await getAgencyAdminToken(model.agency_id)
        console.log('[✓] Using agency admin token')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return {
          success: false,
          transactionsSynced: 0,
          errors: [
            `Agency token error: ${errorMessage}. Connect the agency admin via OAuth first.`,
          ],
        }
      }
    }

    // Initialize Fanvue client with the valid/refreshed token
    const fanvueClient = createFanvueClient(accessToken)

    // PHASE 55: Use last_transaction_sync for cursor-based incremental sync
    // This dramatically reduces API calls and sync time
    const startDate = model.last_transaction_sync
      ? new Date(new Date(model.last_transaction_sync).getTime() + 1000) // Add 1 second buffer
      : new Date('2020-01-01T00:00:00Z') // Default for first-time sync - go back further for full history

    console.log(`📅 Syncing transactions since: ${startDate.toISOString()}`)
    const timeSinceLastSync = Date.now() - startDate.getTime()
    const hoursSinceLastSync = Math.round(timeSinceLastSync / (1000 * 60 * 60))
    console.log(`⏱️  Last synced ${hoursSinceLastSync} hours ago`)

    // Fetch earnings from Fanvue (with pagination)
    type EarningRecord = {
      date: string
      gross: number
      net: number
      currency: string | null
      source: string
      user: { uuid: string; handle: string; displayName: string } | null
    }
    let allEarnings: EarningRecord[] = []
    let cursor: string | null = null
    let hasMore = true
    let pageCount = 0
    const maxPages = 100 // Safety limit (50 per page = 5000 transactions max)

    while (hasMore && pageCount < maxPages) {
      try {
        // Use agency endpoint if model doesn't have its own token
        let response: { data: any[]; nextCursor?: string | null; hasMore?: boolean }
        if (useAgencyEndpoint) {
          response = await fanvueClient.getCreatorEarnings(model.fanvue_user_uuid, {
            startDate: startDate.toISOString(),
            size: 50,
            cursor: cursor || undefined,
          })
        } else {
          response = await fanvueClient.getEarnings({
            startDate: startDate.toISOString(),
            size: 50,
            cursor: cursor || undefined,
          })
        }

        allEarnings = [...allEarnings, ...(response.data || [])]
        cursor = response.nextCursor ?? null
        hasMore = !!cursor
        pageCount++
      } catch (error) {
        if (error instanceof FanvueAPIError) {
          console.error(`Fanvue API error: ${error.message}`)
          break
        }
        throw error
      }
    }

    if (allEarnings.length === 0) {
      return {
        success: true,
        transactionsSynced: 0,
        errors: [],
        lastSyncedDate: new Date(),
      }
    }

    // Transform earnings to transactions
    const transactions = allEarnings.map(earning => {
      // Map Fanvue 'source' to database transaction_type enum
      // Must match CHECK constraint: subscription, tip, ppv, message, post, stream, other
      let category = 'other'
      const source = (earning.source || '').toLowerCase()

      if (source.includes('subscription') || source.includes('renewal')) category = 'subscription'
      else if (source.includes('tip')) category = 'tip'
      else if (source.includes('ppv')) category = 'ppv'
      else if (source.includes('message')) category = 'message'
      else if (source.includes('post') || source.includes('unlock')) category = 'post'
      else if (source.includes('stream') || source.includes('live')) category = 'stream'
      else if (source.includes('referral')) category = 'other' // Referral not in CHECK constraint, map to 'other'

      // Parse the date properly - Fanvue returns dates in ISO format (YYYY-MM-DD)
      // Ensure we create a proper timestamp for accurate charting
      const createdAtDate = new Date(earning.date)
      // If date is invalid, use current time as fallback
      const fanvueCreatedAt = isNaN(createdAtDate.getTime())
        ? new Date().toISOString()
        : createdAtDate.toISOString()

      return {
        agency_id: model.agency_id,
        model_id: model.id,
        fanvue_transaction_id: `${earning.date}_${earning.source}_${earning.gross}_${earning.user?.uuid || 'unknown'}_${Math.random().toString(36).substring(2, 11)}`, // Generate unique ID with random suffix to prevent collisions
        transaction_type: category, // Must match CHECK constraint: subscription, tip, ppv, message, post, stream, other
        amount: earning.gross / 100, // Convert cents to dollars (gross amount)
        // net_amount is auto-calculated by DB: (amount - platform_fee)
        platform_fee: (earning.gross - earning.net) / 100, // Calculate platform fee
        currency: earning.currency || 'USD',
        fan_id: earning.user?.uuid || null, // The fan who made the transaction
        fan_username: earning.user?.handle || null, // Fan's username
        description: earning.source,
        transaction_date: fanvueCreatedAt, // Original timestamp from Fanvue
        synced_at: new Date().toISOString(),
      }
    })

    // Upsert transactions (insert or update on conflict)
    // The unique constraint is on fanvue_transaction_id
    const { error: upsertError } = await supabase.from('fanvue_transactions').upsert(transactions, {
      onConflict: 'fanvue_transaction_id',
      ignoreDuplicates: false,
    })

    if (upsertError) {
      return {
        success: false,
        transactionsSynced: 0,
        errors: [upsertError.message],
      }
    }

    // PHASE 55: Mark sync complete with new cursor position
    await supabase.rpc('mark_sync_complete', {
      p_model_id: modelId,
      p_sync_type: 'transactions',
    })

    const syncDuration = Date.now() - Date.now()
    console.log(`✅ Sync complete: ${transactions.length} transactions in ${syncDuration}ms`)

    // Update model stats after successful sync
    await updateModelStats(modelId)

    return {
      success: true,
      transactionsSynced: transactions.length,
      errors: [],
      lastSyncedDate: new Date(),
    }
  } catch (error) {
    console.error('Error syncing transactions:', error)
    return {
      success: false,
      transactionsSynced: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Update model stats (revenue_total, transaction counts) from fanvue_transactions
 * This ensures the models table stays in sync with actual transaction data
 */
async function updateModelStats(modelId: string): Promise<void> {
  const supabase = createAdminClient()

  try {
    // Calculate totals from fanvue_transactions
    const { data: stats } = await supabase
      .from('fanvue_transactions')
      .select('amount, transaction_type')
      .eq('model_id', modelId)

    if (!stats) return

    const totalRevenue = stats.reduce((sum, tx) => sum + Number(tx.amount), 0)

    // Update the models table
    await supabase
      .from('models')
      .update({
        revenue_total: totalRevenue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', modelId)

    console.log(`✅ Updated model stats: $${totalRevenue.toFixed(2)}`)
  } catch (error) {
    console.error('Failed to update model stats:', error)
    // Don't throw - this is a non-critical update
  }
}

/**
 * Sync transactions for all models in an agency
 */
export async function syncAgencyTransactions(agencyId: string): Promise<SyncResult> {
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
      transactionsSynced: 0,
      errors: ['No active models found'],
    }
  }

  // Sync each model
  const results = await Promise.all(models.map(model => syncModelTransactions(model.id)))

  const totalSynced = results.reduce((sum, result) => sum + result.transactionsSynced, 0)
  const allErrors = results.flatMap(result => result.errors)

  return {
    success: results.every(r => r.success),
    transactionsSynced: totalSynced,
    errors: allErrors,
    lastSyncedDate: new Date(),
  }
}

/**
 * Sync transactions for all agencies (for cron job)
 */
export async function syncAllTransactions(): Promise<{
  agenciesSynced: number
  transactionsSynced: number
  errors: string[]
}> {
  const supabase = createAdminClient()

  // Get all agencies
  const { data: agencies, error } = await supabase.from('agencies').select('id')

  if (error || !agencies) {
    return {
      agenciesSynced: 0,
      transactionsSynced: 0,
      errors: ['Failed to fetch agencies'],
    }
  }

  // Sync each agency
  const results = await Promise.all(agencies.map(agency => syncAgencyTransactions(agency.id)))

  return {
    agenciesSynced: agencies.length,
    transactionsSynced: results.reduce((sum, r) => sum + r.transactionsSynced, 0),
    errors: results.flatMap(r => r.errors),
  }
}
