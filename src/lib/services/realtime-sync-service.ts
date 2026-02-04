/**
 * Real-Time Sync Service
 *
 * Provides live data from Fanvue API
 * - Polling every 30 seconds for active chats
 * - Polling every 2 minutes for transactions/stats
 * - WebSocket-ready architecture (can upgrade later)
 */

import { createAdminClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'
import { getModelAccessToken } from './fanvue-auth'
import { syncModelTransactions } from './transaction-syncer'

interface SyncJob {
  modelId: string
  type: 'chats' | 'transactions' | 'stats'
  lastSync: Date
  interval: number // milliseconds
}

// In-memory sync queue (resets on deploy, but that's fine)
const syncQueue: Map<string, SyncJob> = new Map()

/**
 * Real-time sync for active conversations
 * Call this when user opens a chat
 */
export async function syncActiveChat(
  modelId: string,
  fanUuid: string
): Promise<{
  success: boolean
  newMessages?: number
  error?: string
}> {
  try {
    const token = await getModelAccessToken(modelId)
    const fanvue = createFanvueClient(token)

    // Fetch latest messages for this conversation
    const messages = await fanvue.getChatMessages(fanUuid, { limit: 50 })

    // TODO: Compare with local DB, return only new messages
    // For now, just return count
    return {
      success: true,
      newMessages: messages.data?.length || 0,
    }
  } catch (error: any) {
    console.error(`[Real-Time Sync] Failed to sync chat ${fanUuid}:`, error.message)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Sync transactions in real-time
 * Call this frequently (every 2 minutes) for live revenue data
 */
export async function syncTransactionsRealtime(modelId: string): Promise<{
  success: boolean
  newTransactions?: number
  error?: string
}> {
  try {
    const result = await syncModelTransactions(modelId)

    return {
      success: result.success,
      newTransactions: result.transactionsSynced,
      error: result.errors.length > 0 ? result.errors.join(', ') : undefined,
    }
  } catch (error: any) {
    console.error(`[Real-Time Sync] Failed to sync transactions for ${modelId}:`, error.message)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Sync model stats in real-time
 * Subscribers, earnings, etc.
 */
export async function syncStatsRealtime(modelId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = createAdminClient()

  try {
    const token = await getModelAccessToken(modelId)
    const fanvue = createFanvueClient(token)

    // Get current user (includes stats)
    const user = await fanvue.getCurrentUser()

    // Update model stats
    const { error } = await supabase
      .from('models')
      .update({
        subscribers_count: user.followersCount || 0,
        // Don't overwrite revenue_total - let transaction sync handle that
        last_stats_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', modelId)

    if (error) {
      throw new Error(`Database update failed: ${error.message}`)
    }

    return { success: true }
  } catch (error: any) {
    console.error(`[Real-Time Sync] Failed to sync stats for ${modelId}:`, error.message)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Get sync status for dashboard
 */
export async function getSyncStatus(modelId: string): Promise<{
  lastTransactionSync?: Date
  lastStatsSync?: Date
  isHealthy: boolean
}> {
  const supabase = createAdminClient()

  const { data: model } = await supabase
    .from('models')
    .select('last_transaction_sync, last_stats_sync')
    .eq('id', modelId)
    .single()

  const now = new Date()
  const lastTx = model?.last_transaction_sync ? new Date(model.last_transaction_sync) : null
  const lastStats = model?.last_stats_sync ? new Date(model.last_stats_sync) : null

  // Healthy if synced within last 5 minutes
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
  const isHealthy =
    (!lastTx || lastTx > fiveMinutesAgo) && (!lastStats || lastStats > fiveMinutesAgo)

  return {
    lastTransactionSync: lastTx || undefined,
    lastStatsSync: lastStats || undefined,
    isHealthy,
  }
}
