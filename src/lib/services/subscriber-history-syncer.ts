/**
 * Subscriber History Syncer
 * Syncs daily subscriber metrics from Fanvue API to our database
 * Part of Phase A: Complete the Core Loop
 */

import { FanvueClient } from '@/lib/fanvue/client'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface SubscriberHistoryData {
  model_id: string
  date: string // YYYY-MM-DD format
  subscribers_total: number
  new_subscribers: number
  cancelled_subscribers: number
  net_change: number
}

/**
 * Sync subscriber history for a single creator
 * Fetches all available daily metrics and upserts them to the database
 */
export async function syncCreatorSubscriberHistory(
  modelId: string,
  creatorUserUuid: string,
  accessToken: string,
  daysBack = 365 // Default: 1 year of history
): Promise<{
  success: boolean
  daysCount: number
  error?: string
}> {
  try {
    console.log(`[Subscriber History Sync] Starting for model ${modelId}...`)

    const fanvue = new FanvueClient(accessToken)

    // Calculate start date
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    const allHistory: SubscriberHistoryData[] = []
    let cursor: string | null = null

    // Paginate through all history data
    do {
      const response = await fanvue.getCreatorSubscriberHistory(creatorUserUuid, {
        startDate: startDate.toISOString(),
        size: 50,
        cursor: cursor || undefined,
      })

      if (response.data && response.data.length > 0) {
        // Transform data for database
        const historyBatch: SubscriberHistoryData[] = response.data.map(day => ({
          model_id: modelId,
          date: day.date.split('T')[0], // Extract just the date part (YYYY-MM-DD)
          subscribers_total: day.total,
          new_subscribers: day.newSubscribersCount,
          cancelled_subscribers: day.cancelledSubscribersCount,
          net_change: day.newSubscribersCount - day.cancelledSubscribersCount,
        }))

        allHistory.push(...historyBatch)
      }

      cursor = response.nextCursor
    } while (cursor)

    if (allHistory.length === 0) {
      console.log(`[Subscriber History Sync] No history data found for model ${modelId}`)
      return { success: true, daysCount: 0 }
    }

    // Upsert to database (update existing, insert new)
    const { error: upsertError } = await supabaseAdmin
      .from('subscriber_history')
      .upsert(allHistory, {
        onConflict: 'model_id,date',
        ignoreDuplicates: false, // Update existing records
      })

    if (upsertError) {
      console.error('[Subscriber History Sync] Upsert error:', upsertError)
      return {
        success: false,
        daysCount: 0,
        error: upsertError.message,
      }
    }

    console.log(`[Subscriber History Sync] ✅ Synced ${allHistory.length} days of history`)

    return {
      success: true,
      daysCount: allHistory.length,
    }
  } catch (error) {
    console.error('[Subscriber History Sync] Error:', error)
    return {
      success: false,
      daysCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Sync subscriber history for all creators in an agency
 * Runs syncs in parallel for better performance
 */
export async function syncAgencySubscriberHistory(
  agencyId: string,
  accessToken: string,
  daysBack = 365
): Promise<{
  success: boolean
  totalDays: number
  creatorsProcessed: number
  errors: string[]
}> {
  try {
    console.log(`[Agency Subscriber History Sync] Starting for agency ${agencyId}...`)

    // Get all models in this agency with their fanvue_user_uuid
    const { data: models, error: modelsError } = await supabaseAdmin
      .from('models')
      .select('id, name, fanvue_user_uuid')
      .eq('agency_id', agencyId)
      .not('fanvue_user_uuid', 'is', null)

    if (modelsError || !models) {
      throw new Error(`Failed to fetch models: ${modelsError?.message}`)
    }

    console.log(`[Agency Subscriber History Sync] Found ${models.length} creators to sync`)

    // Sync all creators in parallel
    const results = await Promise.all(
      models.map(model =>
        syncCreatorSubscriberHistory(model.id, model.fanvue_user_uuid!, accessToken, daysBack)
      )
    )

    // Aggregate results
    const totalDays = results.reduce((sum, r) => sum + r.daysCount, 0)
    const errors = results.filter(r => r.error).map(r => r.error!)
    const creatorsProcessed = results.filter(r => r.success).length

    console.log(
      `[Agency Subscriber History Sync] ✅ Complete: ${totalDays} data points across ${creatorsProcessed} creators`
    )

    if (errors.length > 0) {
      console.error(`[Agency Subscriber History Sync] ⚠️ ${errors.length} errors occurred:`, errors)
    }

    return {
      success: errors.length === 0,
      totalDays,
      creatorsProcessed,
      errors,
    }
  } catch (error) {
    console.error('[Agency Subscriber History Sync] Fatal error:', error)
    return {
      success: false,
      totalDays: 0,
      creatorsProcessed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Get subscriber trend for a specific creator
 * Queries the database for historical data
 */
export async function getCreatorSubscriberTrend(modelId: string, days = 30) {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_creator_subscriber_trend', {
      p_model_id: modelId,
      p_days: days,
    })

    if (error) {
      console.error('[Get Creator Subscriber Trend] Error:', error)
      return { success: false, trend: [], error: error.message }
    }

    return { success: true, trend: data || [], error: null }
  } catch (error) {
    console.error('[Get Creator Subscriber Trend] Error:', error)
    return {
      success: false,
      trend: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get agency-wide subscriber trend
 * Aggregates all creators' data for agency overview
 */
export async function getAgencySubscriberTrend(agencyId: string, days = 30) {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_agency_subscriber_trend', {
      p_agency_id: agencyId,
      p_days: days,
    })

    if (error) {
      console.error('[Get Agency Subscriber Trend] Error:', error)
      return { success: false, trend: [], error: error.message }
    }

    return { success: true, trend: data || [], error: null }
  } catch (error) {
    console.error('[Get Agency Subscriber Trend] Error:', error)
    return {
      success: false,
      trend: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
