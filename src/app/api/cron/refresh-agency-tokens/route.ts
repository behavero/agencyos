/**
 * Cron Job: Refresh Agency Fanvue Tokens
 *
 * Runs every 30 minutes to keep all agency tokens alive.
 * This is the ONLY mechanism responsible for token lifecycle — it must be autonomous.
 *
 * Logic:
 * 1. Refresh active tokens expiring within 35 minutes (proactive)
 * 2. Attempt to revive expired tokens that still have a refresh_token (auto-recovery)
 * 3. Never mark a connection as expired without first attempting a refresh
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
  phase: 'proactive' | 'recovery'
  error?: string
}

export async function GET(request: NextRequest) {
  console.log('[cron/refresh-agency-tokens] Starting autonomous token refresh...')

  // Verify cron secret
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const authHeader = request.headers.get('authorization')

  if (secret !== process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[cron/refresh-agency-tokens] Invalid or missing CRON_SECRET')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const results: RefreshResult[] = []
  let refreshed = 0
  let failed = 0
  let recovered = 0

  try {
    // ─── Phase 1: Proactive refresh (active tokens expiring soon) ───
    // Refresh tokens expiring within 35 minutes (cron runs every 30 min)
    const thirtyFiveMinutesFromNow = new Date(Date.now() + 35 * 60 * 1000).toISOString()

    const { data: expiringConnections, error: expiringError } = await adminClient
      .from('agency_fanvue_connections')
      .select('agency_id, fanvue_token_expires_at')
      .eq('status', 'active')
      .lte('fanvue_token_expires_at', thirtyFiveMinutesFromNow)

    if (expiringError) {
      console.error('[cron/refresh-agency-tokens] Failed to query expiring:', expiringError)
    }

    const expiringList = expiringConnections || []
    if (expiringList.length > 0) {
      console.log(
        `[cron/refresh-agency-tokens] Phase 1: ${expiringList.length} active tokens expiring soon`
      )
    }

    for (const connection of expiringList) {
      try {
        await refreshAgencyToken(connection.agency_id)
        results.push({ agencyId: connection.agency_id, success: true, phase: 'proactive' })
        refreshed++
        console.log(`[cron/refresh-agency-tokens] ✅ Proactive refresh: ${connection.agency_id}`)
      } catch (err: any) {
        results.push({
          agencyId: connection.agency_id,
          success: false,
          phase: 'proactive',
          error: err.message,
        })
        failed++
        console.error(
          `[cron/refresh-agency-tokens] ❌ Proactive refresh failed: ${connection.agency_id}:`,
          err.message
        )
      }
    }

    // ─── Phase 2: Auto-recovery (expired connections with refresh tokens) ───
    // This is the critical fix: connections that previously failed should be
    // retried automatically, not left dead until the user manually reconnects.
    const { data: expiredConnections, error: expiredError } = await adminClient
      .from('agency_fanvue_connections')
      .select('agency_id, fanvue_refresh_token, updated_at')
      .eq('status', 'expired')
      .not('fanvue_refresh_token', 'is', null)

    if (expiredError) {
      console.error('[cron/refresh-agency-tokens] Failed to query expired:', expiredError)
    }

    const expiredList = expiredConnections || []
    if (expiredList.length > 0) {
      console.log(
        `[cron/refresh-agency-tokens] Phase 2: ${expiredList.length} expired connections to recover`
      )
    }

    for (const connection of expiredList) {
      // Don't retry connections that have been expired for more than 7 days
      // (refresh tokens may have been revoked by Fanvue at that point)
      const expiredSince = connection.updated_at
        ? Date.now() - new Date(connection.updated_at).getTime()
        : Infinity
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

      if (expiredSince > sevenDaysMs) {
        console.log(
          `[cron/refresh-agency-tokens] ⏭️ Skipping ${connection.agency_id} — expired >7 days`
        )
        continue
      }

      try {
        await refreshAgencyToken(connection.agency_id)
        results.push({ agencyId: connection.agency_id, success: true, phase: 'recovery' })
        recovered++
        console.log(`[cron/refresh-agency-tokens] ✅ Auto-recovered: ${connection.agency_id}`)
      } catch (err: any) {
        results.push({
          agencyId: connection.agency_id,
          success: false,
          phase: 'recovery',
          error: err.message,
        })
        failed++
        console.error(
          `[cron/refresh-agency-tokens] ❌ Auto-recovery failed: ${connection.agency_id}:`,
          err.message
        )
        // Do NOT mark as expired again — refreshAgencyToken already handles that.
        // We just log and move on. Next cron run will retry.
      }
    }

    // ─── Phase 3: Proactive refresh for tokens not yet expiring but expired in DB ───
    // Edge case: a token's `fanvue_token_expires_at` is in the past but status is still
    // `active` (e.g., server was down when expiry happened). Refresh immediately.
    const now = new Date().toISOString()
    const { data: alreadyExpiredActive } = await adminClient
      .from('agency_fanvue_connections')
      .select('agency_id')
      .eq('status', 'active')
      .lt('fanvue_token_expires_at', now)
      .not('fanvue_refresh_token', 'is', null)

    for (const connection of alreadyExpiredActive || []) {
      // Skip if we already processed this agency in Phase 1
      if (results.some(r => r.agencyId === connection.agency_id)) continue

      try {
        await refreshAgencyToken(connection.agency_id)
        results.push({ agencyId: connection.agency_id, success: true, phase: 'proactive' })
        refreshed++
        console.log(
          `[cron/refresh-agency-tokens] ✅ Caught stale-active token: ${connection.agency_id}`
        )
      } catch (err: any) {
        results.push({
          agencyId: connection.agency_id,
          success: false,
          phase: 'proactive',
          error: err.message,
        })
        failed++
      }
    }

    console.log('[cron/refresh-agency-tokens] Complete:', {
      refreshed,
      recovered,
      failed,
      total: results.length,
    })

    return NextResponse.json({
      success: true,
      refreshed,
      recovered,
      failed,
      total: results.length,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[cron/refresh-agency-tokens] Fatal error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        refreshed,
        recovered,
        failed,
        results,
      },
      { status: 500 }
    )
  }
}
