/**
 * Cron Job: Proactive Token Refresh
 *
 * Runs every 30 minutes
 * Refreshes tokens BEFORE they expire
 * Prevents "token expired" errors
 */

import { NextRequest, NextResponse } from 'next/server'
import { proactiveTokenRefresh } from '@/lib/services/token-refresh-service'

export const maxDuration = 300 // 5 minutes
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  console.log('[cron/refresh-tokens] Starting proactive token refresh...')

  try {
    const result = await proactiveTokenRefresh()

    console.log(
      `[cron/refresh-tokens] Complete: ${result.refreshed} refreshed, ${result.failed} failed`
    )

    return NextResponse.json({
      success: true,
      refreshed: result.refreshed,
      failed: result.failed,
      details: result.results,
    })
  } catch (error: any) {
    console.error('[cron/refresh-tokens] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}
