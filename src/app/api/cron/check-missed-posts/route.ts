import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/cron/check-missed-posts
 * 
 * Cron job to check for posts that are scheduled but past their time.
 * - Marks posts as "missed" if >2 hours late
 * - Sends Telegram alert if configured
 * 
 * Should be called hourly via Supabase pg_cron or external scheduler.
 */

// Verify cron secret
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.warn('[Cron] CRON_SECRET not configured')
    return false
  }

  return authHeader === `Bearer ${cronSecret}`
}

// Send Telegram alert
async function sendTelegramAlert(message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const allowedUsers = process.env.TELEGRAM_ALLOWED_USERS?.split(',').filter(Boolean)

  if (!botToken || !allowedUsers?.length) {
    console.log('[Cron] Telegram not configured, skipping alert')
    return false
  }

  try {
    // Send to all allowed users
    for (const userId of allowedUsers) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: userId.trim(),
          text: message,
          parse_mode: 'Markdown',
        }),
      })
    }
    return true
  } catch (error) {
    console.error('[Cron] Failed to send Telegram alert:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  // Verify authorization
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createAdminClient()
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

    console.log('[Cron] Checking for missed posts...')

    // Find scheduled posts that are >2 hours past their time
    const { data: overduePosts, error } = await supabase
      .from('content_tasks')
      .select('id, title, platform, scheduled_at, model:models(name)')
      .eq('status', 'scheduled')
      .lt('scheduled_at', twoHoursAgo.toISOString())
      .order('scheduled_at', { ascending: true })

    if (error) {
      console.error('[Cron] Error fetching posts:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!overduePosts || overduePosts.length === 0) {
      console.log('[Cron] No missed posts found')
      return NextResponse.json({
        success: true,
        message: 'No missed posts',
        checked: true,
        missedCount: 0,
      })
    }

    console.log(`[Cron] Found ${overduePosts.length} overdue posts`)

    // Mark posts as missed
    const postIds = overduePosts.map(p => p.id)
    const { error: updateError } = await supabase
      .from('content_tasks')
      .update({
        status: 'missed',
        updated_at: now.toISOString(),
      })
      .in('id', postIds)

    if (updateError) {
      console.error('[Cron] Error updating posts:', updateError)
    }

    // Build alert message
    const alertLines = overduePosts.map(post => {
      const scheduledTime = new Date(post.scheduled_at!)
      const hoursLate = Math.round((now.getTime() - scheduledTime.getTime()) / (1000 * 60 * 60))
      const modelName = (post.model as { name?: string } | null)?.name || 'Unknown'
      
      const platformEmoji: Record<string, string> = {
        instagram: '📸',
        tiktok: '🎵',
        youtube: '📺',
        fanvue: '💜',
        x: '𝕏',
      }

      return `${platformEmoji[post.platform] || '📝'} **${post.platform.toUpperCase()}** (${modelName}): "${post.title}" - ${hoursLate}h late`
    })

    const alertMessage = `⚠️ **Missed Posts Alert**

${overduePosts.length} post(s) have been marked as missed:

${alertLines.join('\n')}

_Check the Content Calendar for details._`

    // Send Telegram alert
    const alertSent = await sendTelegramAlert(alertMessage)

    return NextResponse.json({
      success: true,
      message: `Marked ${overduePosts.length} posts as missed`,
      missedCount: overduePosts.length,
      alertSent,
      posts: overduePosts.map(p => ({
        id: p.id,
        title: p.title,
        platform: p.platform,
        scheduledAt: p.scheduled_at,
      })),
    })
  } catch (error) {
    console.error('[Cron] Error:', error)
    return NextResponse.json(
      { error: 'Check failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/check-missed-posts
 * Health check and status
 */
export async function GET() {
  const hasCronSecret = !!process.env.CRON_SECRET
  const hasTelegram = !!process.env.TELEGRAM_BOT_TOKEN

  return NextResponse.json({
    endpoint: '/api/cron/check-missed-posts',
    method: 'POST',
    authorization: 'Bearer CRON_SECRET',
    configured: {
      cronSecret: hasCronSecret,
      telegram: hasTelegram,
    },
    frequency: 'Hourly recommended',
    description: 'Checks for scheduled posts that are >2 hours late and marks them as missed',
    actions: [
      'Marks overdue posts as missed',
      'Sends Telegram alert to configured users',
    ],
  })
}
