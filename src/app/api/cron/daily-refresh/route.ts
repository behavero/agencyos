import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'

// Prevent timeout
export const maxDuration = 300 // 5 minutes

/**
 * Daily refresh cron job
 * Triggered by Supabase pg_cron at midnight UTC
 *
 * This endpoint:
 * 1. Fetches all models with valid Fanvue tokens
 * 2. Updates their stats from Fanvue API
 * 3. Resets daily quests
 */
export async function POST(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization')
  const expectedToken = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`

  // Also allow a dedicated cron secret
  const cronSecret = process.env.CRON_SECRET
  const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`
  const isServiceAuth = authHeader === expectedToken

  if (!isServiceAuth && !isCronAuth) {
    console.error('Unauthorized cron request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const results: { model: string; success: boolean; error?: string }[] = []

  try {
    // Fetch all models with valid tokens
    const { data: models, error: modelsError } = await adminClient
      .from('models')
      .select('id, name, fanvue_access_token, fanvue_refresh_token')
      .not('fanvue_access_token', 'is', null)

    if (modelsError) {
      throw new Error(`Failed to fetch models: ${modelsError.message}`)
    }

    console.log(`[CRON] Processing ${models?.length || 0} models`)

    // Process each model
    for (const model of models || []) {
      try {
        if (!model.fanvue_access_token) {
          results.push({ model: model.name, success: false, error: 'No access token' })
          continue
        }

        const fanvue = createFanvueClient(model.fanvue_access_token)

        // Fetch current user stats
        const currentUser = await fanvue.getCurrentUser()

        // PHASE 68 FIX: Calculate revenue from our DB transactions, NOT Fanvue API
        // This prevents the "cache overwrite" bug where failed API calls write $0
        // Our fanvue_transactions table is the single source of truth
        let totalEarnings: number | null = null
        try {
          const { data: revData } = await adminClient
            .from('fanvue_transactions')
            .select('amount')
            .eq('model_id', model.id)

          if (revData && revData.length > 0) {
            totalEarnings = revData.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
          }
        } catch (e) {
          console.warn(`[CRON] Could not calculate revenue for ${model.name}`)
          // totalEarnings remains null - we won't overwrite existing value
        }

        // Fetch chats for unread count
        let unreadMessages = 0
        try {
          const chats = await fanvue.getChats({ size: 100 })
          unreadMessages = (chats.data || []).filter((c: any) => c.hasUnread).length
        } catch (e) {
          console.warn(`[CRON] Could not fetch chats for ${model.name}`)
        }

        // Fetch tracking links count
        let trackingLinksCount = 0
        try {
          const links = await fanvue.getTrackingLinks({ limit: 1 })
          trackingLinksCount = links.data?.length || 0
        } catch (e) {
          console.warn(`[CRON] Could not fetch tracking links for ${model.name}`)
        }

        // Update model in database
        const updateData: Record<string, any> = {
          stats_updated_at: new Date().toISOString(),
        }

        if (currentUser) {
          updateData.name = currentUser.displayName || model.name
          updateData.fanvue_username = currentUser.handle
          updateData.avatar_url = currentUser.avatarUrl
          updateData.bio = currentUser.bio
          // Use available counts from Fanvue API
          updateData.subscribers_count = currentUser.fanCounts?.subscribersCount || 0
          updateData.followers_count = currentUser.fanCounts?.followersCount || 0
          updateData.posts_count = 0 // Not available in API
          updateData.likes_count = currentUser.likesCount || 0
          // Media counts not available in API response
          updateData.image_count = 0
          updateData.video_count = 0
          updateData.audio_count = 0
        }

        // PHASE 68: Only update revenue if we successfully calculated it
        // This prevents overwriting with $0 on API failures
        if (totalEarnings !== null) {
          updateData.revenue_total = totalEarnings
        }
        updateData.unread_messages = unreadMessages
        updateData.tracking_links_count = trackingLinksCount

        const { error: updateError } = await adminClient
          .from('models')
          .update(updateData)
          .eq('id', model.id)

        if (updateError) {
          throw new Error(`Failed to update model: ${updateError.message}`)
        }

        // INSERT INTO subscriber_history for Audience Growth chart
        if (
          updateData.subscribers_count !== undefined &&
          updateData.followers_count !== undefined
        ) {
          // Get model's agency_id
          const { data: modelData } = await adminClient
            .from('models')
            .select('agency_id')
            .eq('id', model.id)
            .single()

          if (modelData?.agency_id) {
            // Get previous day's counts to calculate net change
            const today = new Date().toISOString().split('T')[0]
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            const yesterdayDate = yesterday.toISOString().split('T')[0]

            const { data: prevHistory } = await adminClient
              .from('subscriber_history')
              .select('subscribers_total')
              .eq('model_id', model.id)
              .eq('date', yesterdayDate)
              .single()

            const prevSubscribers = prevHistory?.subscribers_total || 0
            const newSubscribers = Math.max(0, updateData.subscribers_count - prevSubscribers)
            const netChange = updateData.subscribers_count - prevSubscribers

            // Upsert today's snapshot
            await adminClient.from('subscriber_history').upsert(
              {
                model_id: model.id,
                agency_id: modelData.agency_id,
                date: today,
                subscribers_total: updateData.subscribers_count,
                followers_count: updateData.followers_count,
                new_subscribers: newSubscribers,
                cancelled_subscribers: netChange < 0 ? Math.abs(netChange) : 0,
                net_change: netChange,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: 'model_id,date',
              }
            )

            console.log(
              `[CRON] Saved subscriber history for ${model.name}: ${updateData.subscribers_count} subs, ${updateData.followers_count} followers`
            )

            // Generate daily analytics snapshot (Phase 65 optimization)
            try {
              await adminClient.rpc('generate_daily_snapshot', {
                p_agency_id: modelData.agency_id,
                p_model_id: model.id,
                p_date: today,
              })
              console.log(`[CRON] Generated analytics snapshot for ${model.name}`)
            } catch (snapshotError) {
              console.warn(`[CRON] Could not generate snapshot for ${model.name}:`, snapshotError)
            }
          }
        }

        results.push({ model: model.name, success: true })
        console.log(`[CRON] Updated ${model.name}`)
      } catch (modelError) {
        const errorMessage = modelError instanceof Error ? modelError.message : 'Unknown error'
        results.push({ model: model.name, success: false, error: errorMessage })
        console.error(`[CRON] Failed to update ${model.name}:`, errorMessage)
      }
    }

    // Reset daily quests
    try {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      await adminClient
        .from('quests')
        .update({
          current_progress: 0,
          completed_at: null,
          last_synced_at: new Date().toISOString(),
        })
        .eq('is_daily', true)
        .lt('completed_at', yesterday.toISOString())

      console.log('[CRON] Daily quests reset')
    } catch (e) {
      console.error('[CRON] Failed to reset daily quests:', e)
    }

    // Log summary
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`[CRON] Complete: ${successful} succeeded, ${failed} failed`)

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful,
      failed,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[CRON] Fatal error:', error)
    return NextResponse.json(
      {
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Also allow GET for manual testing (with auth)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({
      status: 'ready',
      info: 'Daily refresh cron endpoint. Send POST with Authorization header to trigger.',
    })
  }

  // If authorized, trigger the refresh
  return POST(request)
}
