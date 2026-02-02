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

        // Fetch earnings (all-time)
        let totalEarnings = 0
        try {
          const earnings = await fanvue.getEarnings({
            startDate: '2020-01-01T00:00:00Z',
            endDate: new Date().toISOString(),
          })
          totalEarnings = (earnings.data || []).reduce(
            (sum: number, e: any) => sum + (e.amountInCents || 0) / 100,
            0
          )
        } catch (e) {
          console.warn(`[CRON] Could not fetch earnings for ${model.name}`)
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
          updateData.subscribers_count = currentUser.fanCounts?.totalCount || 0
          updateData.followers_count = currentUser.followingCount || 0
          updateData.posts_count = currentUser.postsCount || 0
          updateData.likes_count = currentUser.likesCount || 0
          // Media counts may not be available in API response
          updateData.image_count = 0
          updateData.video_count = 0
          updateData.audio_count = 0
        }

        updateData.revenue_total = totalEarnings
        updateData.unread_messages = unreadMessages
        updateData.tracking_links_count = trackingLinksCount

        await adminClient.from('models').update(updateData).eq('id', model.id)

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
