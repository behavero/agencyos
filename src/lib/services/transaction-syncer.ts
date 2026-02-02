/**
 * Transaction Syncer Service
 * Phase 49 - Syncs Fanvue transactions to local database
 *
 * This service fetches transactions from Fanvue API and stores them
 * in the fanvue_transactions table for granular analytics.
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createFanvueClient, FanvueAPIError } from '@/lib/fanvue/client'

export interface SyncResult {
  success: boolean
  transactionsSynced: number
  errors: string[]
  lastSyncedDate?: Date
}

/**
 * Sync transactions for a specific model
 * Fetches earnings data from Fanvue API and stores in fanvue_transactions table
 */
export async function syncModelTransactions(modelId: string): Promise<SyncResult> {
  const supabase = await createAdminClient()

  try {
    // Get model details
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id, agency_id, fanvue_access_token, fanvue_user_uuid')
      .eq('id', modelId)
      .single()

    if (modelError || !model) {
      return {
        success: false,
        transactionsSynced: 0,
        errors: ['Model not found or no access'],
      }
    }

    if (!model.fanvue_access_token) {
      return {
        success: false,
        transactionsSynced: 0,
        errors: ['No Fanvue access token for this model'],
      }
    }

    // Initialize Fanvue client
    const fanvueClient = createFanvueClient(model.fanvue_access_token)

    // Get last synced transaction date
    const { data: lastTransaction } = await supabase
      .from('fanvue_transactions')
      .select('fanvue_created_at')
      .eq('model_id', modelId)
      .order('fanvue_created_at', { ascending: false })
      .limit(1)
      .single()

    const startDate = lastTransaction?.fanvue_created_at
      ? new Date(lastTransaction.fanvue_created_at)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Default: last 90 days

    // Fetch earnings from Fanvue (with pagination)
    let allEarnings: any[] = []
    let cursor: string | null = null
    let hasMore = true
    let pageCount = 0
    const maxPages = 10 // Safety limit

    while (hasMore && pageCount < maxPages) {
      try {
        const response = await fanvueClient.getEarnings({
          startDate: startDate.toISOString().split('T')[0],
          size: 100,
          cursor: cursor || undefined,
        })

        allEarnings = [...allEarnings, ...(response.data || [])]
        cursor = response.nextCursor
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
      // Map Fanvue 'source' to our category enum
      let category = 'other'
      const source = (earning.source || '').toLowerCase()

      if (source.includes('subscription')) category = 'subscription'
      else if (source.includes('tip')) category = 'tip'
      else if (source.includes('message') || source.includes('ppv')) category = 'message'
      else if (source.includes('post') || source.includes('unlock')) category = 'post'

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
        fanvue_id: `${earning.date}_${earning.source}_${earning.gross}`, // Generate unique ID
        fanvue_user_id: earning.user?.uuid || null,
        amount: earning.gross / 100, // Convert cents to dollars
        net_amount: earning.net / 100, // Convert cents to dollars
        currency: earning.currency || 'USD',
        category,
        description: earning.source,
        fanvue_created_at: fanvueCreatedAt,
        synced_at: new Date().toISOString(),
      }
    })

    // Upsert transactions (insert or update on conflict)
    const { error: upsertError } = await supabase.from('fanvue_transactions').upsert(transactions, {
      onConflict: 'fanvue_id,model_id',
      ignoreDuplicates: false,
    })

    if (upsertError) {
      return {
        success: false,
        transactionsSynced: 0,
        errors: [upsertError.message],
      }
    }

    // Update model's last sync timestamp
    await supabase
      .from('models')
      .update({ stats_updated_at: new Date().toISOString() })
      .eq('id', modelId)

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
 * Sync transactions for all models in an agency
 */
export async function syncAgencyTransactions(agencyId: string): Promise<SyncResult> {
  const supabase = await createAdminClient()

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
  const supabase = await createAdminClient()

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
