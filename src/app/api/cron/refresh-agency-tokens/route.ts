/**
 * Cron Job: Refresh Agency Fanvue Tokens
 * Phase 60 - SaaS Architecture
 *
 * Runs daily to refresh all agency tokens before they expire.
 * Prevents agency operations from failing due to expired tokens.
 *
 * Endpoint: /api/cron/refresh-agency-tokens?secret=CRON_SECRET
 * Method: GET
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { refreshAgencyToken } from '@/lib/services/agency-fanvue-auth'

export const maxDuration = 300 // 5 minutes
export const dynamic = 'force-dynamic'

interface RefreshResult {
  agencyId: string
  success: boolean
  error?: string
}

export async function GET(request: NextRequest) {
  console.log('[cron/refresh-agency-tokens] Starting agency token refresh...')

  // Verify cron secret
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) {
    console.error('[cron/refresh-agency-tokens] Invalid or missing CRON_SECRET')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const results: RefreshResult[] = []
  let refreshed = 0
  let failed = 0
  const skipped = 0

  try {
    // Find all agency connections that need refreshing
    // Refresh tokens expiring within 35 minutes (cron runs every 30 min)
    // Using 35min ensures every expiring token is caught between cron runs
    // while still avoiding unnecessary refreshes for tokens with >35min left.
    const thirtyFiveMinutesFromNow = new Date(Date.now() + 35 * 60 * 1000).toISOString()

    const { data: connections, error } = await adminClient
      .from('agency_fanvue_connections')
      .select('agency_id, fanvue_token_expires_at, status')
      .eq('status', 'active')
      .lte('fanvue_token_expires_at', thirtyFiveMinutesFromNow)

    if (error) {
      throw new Error(`Failed to fetch agency connections: ${error.message}`)
    }

    if (!connections || connections.length === 0) {
      console.log('[cron/refresh-agency-tokens] No tokens need refreshing')
      return NextResponse.json({
        success: true,
        message: 'No tokens need refreshing',
        refreshed: 0,
        failed: 0,
        skipped: 0,
      })
    }

    console.log(`[cron/refresh-agency-tokens] Found ${connections.length} tokens to refresh`)

    // Refresh each token
    for (const connection of connections) {
      try {
        console.log(`[cron/refresh-agency-tokens] Refreshing agency ${connection.agency_id}...`)

        await refreshAgencyToken(connection.agency_id)

        results.push({
          agencyId: connection.agency_id,
          success: true,
        })

        refreshed++
        console.log(`[cron/refresh-agency-tokens] ✅ Refreshed agency ${connection.agency_id}`)
      } catch (error: any) {
        console.error(
          `[cron/refresh-agency-tokens] ❌ Failed to refresh agency ${connection.agency_id}:`,
          error.message
        )

        results.push({
          agencyId: connection.agency_id,
          success: false,
          error: error.message,
        })

        failed++
      }
    }

    // Also check for expired tokens to mark them
    const { data: expiredConnections } = await adminClient
      .from('agency_fanvue_connections')
      .select('agency_id')
      .eq('status', 'active')
      .lt('fanvue_token_expires_at', new Date().toISOString())

    if (expiredConnections && expiredConnections.length > 0) {
      console.log(
        `[cron/refresh-agency-tokens] Marking ${expiredConnections.length} expired connections`
      )

      for (const conn of expiredConnections) {
        await adminClient
          .from('agency_fanvue_connections')
          .update({ status: 'expired' })
          .eq('agency_id', conn.agency_id)
      }
    }

    console.log('[cron/refresh-agency-tokens] Complete:', {
      refreshed,
      failed,
      skipped,
      total: connections.length,
    })

    return NextResponse.json({
      success: true,
      message: `Refreshed ${refreshed} tokens, ${failed} failed`,
      refreshed,
      failed,
      skipped,
      results,
    })
  } catch (error: any) {
    console.error('[cron/refresh-agency-tokens] Fatal error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        refreshed,
        failed,
        results,
      },
      { status: 500 }
    )
  }
}
