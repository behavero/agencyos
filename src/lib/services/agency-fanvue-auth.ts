/**
 * Agency Fanvue OAuth Authentication Service
 * Phase 60 - SaaS Architecture Implementation
 *
 * This service handles agency-level Fanvue connections separately from model connections.
 * Agency admins connect their own Fanvue account to manage all creators in the agency.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { refreshAccessToken, getClientId, getClientSecret } from '@/lib/fanvue/oauth'
import { getCached, setCached } from '@/lib/fanvue/response-cache'

const API_URL = 'https://api.fanvue.com'

interface AgencyFanvueConnection {
  id: string
  agency_id: string
  admin_user_id: string
  fanvue_access_token: string
  fanvue_refresh_token: string
  fanvue_token_expires_at: string
  fanvue_user_id: string
  status: 'active' | 'expired' | 'revoked'
}

interface FanvueCreator {
  uuid: string
  handle: string
  displayName: string
  nickname: string | null
  avatarUrl: string | null
  registeredAt: string
  role: string
}

interface FanvueCreatorsResponse {
  data: FanvueCreator[]
  pagination: {
    page: number
    size: number
    hasMore: boolean
  }
}

interface FanvueEarningsResponse {
  data: {
    date: string
    gross: number
    net: number
    currency: string | null
    source: string
    user: {
      uuid: string
      handle: string
      displayName: string
      nickname: string | null
      isTopSpender: boolean
    } | null
  }[]
  nextCursor: string | null
}

/**
 * Gets a valid Fanvue access token for an agency.
 * Automatically refreshes if expired or expiring soon.
 * Auto-recovers expired connections by attempting a refresh before giving up.
 */
export async function getAgencyFanvueToken(agencyId: string): Promise<string> {
  // Check in-memory cache first (avoids DB read on concurrent requests)
  const cacheKey = `agency-token:${agencyId}`
  const cached = getCached<string>(cacheKey)
  if (cached) return cached

  const adminClient = createAdminClient()

  // Step 1: Try to find an active connection
  const { data: activeConnection } = await adminClient
    .from('agency_fanvue_connections')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('status', 'active')
    .single()

  if (activeConnection) {
    // Check if token is still valid (not expiring within 5 minutes)
    // IMPORTANT: Fanvue tokens last ~1 hour. Using a small window prevents
    // unnecessary refresh attempts that burn through refresh tokens.
    const expiresAt = new Date(activeConnection.fanvue_token_expires_at)
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)

    if (expiresAt > fiveMinutesFromNow) {
      console.log(`✅ Agency ${agencyId} token is valid (expires ${expiresAt.toISOString()})`)
      // Cache for 60s to avoid repeated DB reads on concurrent dashboard requests
      setCached(cacheKey, activeConnection.fanvue_access_token, 60_000)
      return activeConnection.fanvue_access_token
    }

    // Token is expiring in less than 5 minutes -- refresh it
    // LOCK: Prevent concurrent refreshes by checking/setting refreshing_since
    const { data: lockCheck } = await adminClient
      .from('agency_fanvue_connections')
      .select('refreshing_since')
      .eq('agency_id', agencyId)
      .single()

    const refreshingSince = lockCheck?.refreshing_since
      ? new Date(lockCheck.refreshing_since)
      : null
    const lockStale = refreshingSince ? Date.now() - refreshingSince.getTime() > 30000 : true // No lock = stale

    if (refreshingSince && !lockStale) {
      // Another process is refreshing. Wait briefly then re-read the token
      console.log(`⏳ Agency ${agencyId} token refresh in progress, waiting...`)
      await new Promise(r => setTimeout(r, 3000))
      return await fetchUpdatedToken(adminClient, agencyId)
    }

    console.log(`🔄 Agency ${agencyId} token expiring in <5min, refreshing...`)
    try {
      await refreshAgencyToken(agencyId)
      return await fetchUpdatedToken(adminClient, agencyId)
    } catch (err: any) {
      console.error(`❌ Failed to refresh expiring agency token:`, err.message)
      // If the token hasn't actually expired yet, use it anyway — it's better than nothing.
      // The cron will retry the refresh on the next run.
      const expiresAt = new Date(activeConnection.fanvue_token_expires_at)
      if (expiresAt > new Date()) {
        console.log(`⚠️ Using existing token (still valid until ${expiresAt.toISOString()})`)
        return activeConnection.fanvue_access_token
      }
      throw new Error(
        `Agency token refresh failed: ${err.message}. ` +
          'The cron job will retry automatically. If this persists, reconnect Fanvue in settings.'
      )
    }
  }

  // Step 2: No active connection -- check if there's an expired one we can recover
  const { data: expiredConnection } = await adminClient
    .from('agency_fanvue_connections')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('status', 'expired')
    .single()

  if (expiredConnection && expiredConnection.fanvue_refresh_token) {
    console.log(`🔄 Agency ${agencyId} connection expired, attempting auto-recovery...`)
    try {
      await refreshAgencyToken(agencyId)
      console.log(`✅ Agency ${agencyId} connection auto-recovered!`)
      return await fetchUpdatedToken(adminClient, agencyId)
    } catch (err: any) {
      console.error(`❌ Auto-recovery failed for agency ${agencyId}:`, err.message)
      // Fall through to the error below
    }
  }

  // Step 3: No recoverable connection found
  throw new Error(
    `NO_AGENCY_FANVUE_CONNECTION: Agency ${agencyId} has no active Fanvue connection. ` +
      'An agency admin must connect their Fanvue account in the agency settings.'
  )
}

/**
 * Helper: fetch the latest access token from the database after a refresh
 */
async function fetchUpdatedToken(
  adminClient: ReturnType<typeof createAdminClient>,
  agencyId: string
): Promise<string> {
  const { data: updatedConnection } = await adminClient
    .from('agency_fanvue_connections')
    .select('fanvue_access_token')
    .eq('agency_id', agencyId)
    .eq('status', 'active')
    .single()

  if (!updatedConnection) {
    throw new Error('Failed to retrieve updated token after refresh')
  }

  return updatedConnection.fanvue_access_token
}

/**
 * Utility: sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Refreshes a Fanvue access token for an agency.
 * Retries up to 3 times with exponential backoff before marking expired.
 * A single network blip should not kill the connection.
 */
export async function refreshAgencyToken(agencyId: string): Promise<void> {
  const adminClient = createAdminClient()

  const clientId = getClientId()
  const clientSecret = getClientSecret()

  if (!clientId || !clientSecret) {
    throw new Error(
      'Fanvue OAuth credentials not configured (FANVUE_CLIENT_ID / FANVUE_CLIENT_SECRET)'
    )
  }

  // Get current connection (don't filter by status -- allow refreshing expired connections too)
  const { data: connection, error } = await adminClient
    .from('agency_fanvue_connections')
    .select('fanvue_refresh_token, status')
    .eq('agency_id', agencyId)
    .single()

  if (error || !connection) {
    throw new Error(`Agency connection not found: ${agencyId}`)
  }

  if (!connection.fanvue_refresh_token) {
    throw new Error(`Agency ${agencyId} has no refresh token. Reconnect required.`)
  }

  console.log(`🔄 Refreshing Fanvue token for agency ${agencyId}...`)

  // Acquire refresh lock
  await adminClient
    .from('agency_fanvue_connections')
    .update({ refreshing_since: new Date().toISOString() })
    .eq('agency_id', agencyId)

  const MAX_RETRIES = 3
  const BACKOFF_MS = [0, 2000, 5000] // immediate, 2s, 5s
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 1) {
        const delay = BACKOFF_MS[attempt - 1] || 5000
        console.log(`   Retry ${attempt}/${MAX_RETRIES} after ${delay}ms...`)
        await sleep(delay)
      }

      const tokenData = await refreshAccessToken({
        refreshToken: connection.fanvue_refresh_token,
        clientId,
        clientSecret,
      })

      // Update database with new tokens and mark active
      const { error: updateError } = await adminClient
        .from('agency_fanvue_connections')
        .update({
          fanvue_access_token: tokenData.access_token,
          fanvue_refresh_token: tokenData.refresh_token || connection.fanvue_refresh_token,
          fanvue_token_expires_at: new Date(
            Date.now() + (tokenData.expires_in || 3600) * 1000
          ).toISOString(),
          status: 'active',
          refreshing_since: null, // Release lock
          updated_at: new Date().toISOString(),
        })
        .eq('agency_id', agencyId)

      if (updateError) {
        throw new Error(`Failed to update tokens: ${updateError.message}`)
      }

      console.log(`✅ Agency ${agencyId} token refreshed successfully (attempt ${attempt})`)
      return // Success -- exit
    } catch (err: any) {
      lastError = err
      console.error(
        `❌ Refresh attempt ${attempt}/${MAX_RETRIES} failed for agency ${agencyId}:`,
        err.message
      )

      // If it's a 400/401 error (invalid refresh token), don't retry -- it won't help
      if (err.message?.includes('400') || err.message?.includes('401')) {
        console.error(`   Auth error (${err.message}), skipping remaining retries`)
        break
      }
    }
  }

  // All retries exhausted
  // Only mark as expired if the error was an auth error (refresh token revoked/invalid).
  // For transient errors (network, 500, timeout), keep the status unchanged so the
  // next cron run will retry automatically.
  const isAuthError =
    lastError?.message?.includes('400') ||
    lastError?.message?.includes('401') ||
    lastError?.message?.includes('invalid_grant') ||
    lastError?.message?.includes('token has been revoked')

  if (isAuthError) {
    console.error(`❌ Agency ${agencyId} refresh token is permanently invalid. Marking expired.`)
    await adminClient
      .from('agency_fanvue_connections')
      .update({
        status: 'expired',
        refreshing_since: null,
        updated_at: new Date().toISOString(),
      })
      .eq('agency_id', agencyId)
  } else {
    console.error(
      `❌ All ${MAX_RETRIES} refresh attempts failed for agency ${agencyId} (transient error). ` +
        'Keeping status unchanged — next cron run will retry.'
    )
    await adminClient
      .from('agency_fanvue_connections')
      .update({
        refreshing_since: null, // Release lock only
      })
      .eq('agency_id', agencyId)
  }

  throw lastError || new Error('Token refresh failed after all retries')
}

/**
 * Revokes an agency's Fanvue connection
 */
export async function revokeAgencyConnection(agencyId: string): Promise<void> {
  const adminClient = createAdminClient()

  console.log(`🗑️ Revoking Fanvue connection for agency ${agencyId}...`)

  const { error } = await adminClient
    .from('agency_fanvue_connections')
    .update({
      status: 'revoked',
      updated_at: new Date().toISOString(),
    })
    .eq('agency_id', agencyId)

  if (error) {
    throw new Error(`Failed to revoke connection: ${error.message}`)
  }

  console.log(`✅ Agency ${agencyId} connection revoked`)
}

/**
 * Stores a new agency Fanvue connection after OAuth callback
 */
export async function storeAgencyConnection(
  agencyId: string,
  adminUserId: string,
  tokens: {
    access_token: string
    refresh_token: string
    expires_in: number
  },
  fanvueUserId: string
): Promise<void> {
  const adminClient = createAdminClient()

  console.log(`💾 Storing Fanvue connection for agency ${agencyId}...`)

  const { error } = await adminClient.from('agency_fanvue_connections').upsert(
    {
      agency_id: agencyId,
      admin_user_id: adminUserId,
      fanvue_access_token: tokens.access_token,
      fanvue_refresh_token: tokens.refresh_token,
      fanvue_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      fanvue_user_id: fanvueUserId,
      status: 'active',
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'agency_id',
    }
  )

  if (error) {
    throw new Error(`Failed to store connection: ${error.message}`)
  }

  console.log(`✅ Agency ${agencyId} connection stored`)
}

/**
 * Fetches all creators from the agency's Fanvue account.
 *
 * Endpoint: GET https://api.fanvue.com/creators
 * Scope required: read:creator
 * Docs: https://api.fanvue.com/docs/api-reference/reference/agencies/list-creators
 */
export async function fetchAgencyCreators(agencyId: string): Promise<FanvueCreator[]> {
  const token = await getAgencyFanvueToken(agencyId)
  const allCreators: FanvueCreator[] = []
  let page = 1
  let hasMore = true

  console.log('👥 Fetching agency creators from GET /creators...')

  while (hasMore) {
    const response = await fetch(`${API_URL}/creators?page=${page}&size=50`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Fanvue-API-Version': '2025-06-26',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()

      if (response.status === 403) {
        throw new Error(
          'INSUFFICIENT_PERMISSIONS: The connected Fanvue account does not have agency access. ' +
            'Make sure you are connecting an admin/owner account with read:creator scope.'
        )
      }

      throw new Error(`Failed to fetch creators: ${response.status} ${errorText}`)
    }

    const data: FanvueCreatorsResponse = await response.json()
    const creators = data.data || []

    allCreators.push(...creators)

    hasMore = data.pagination?.hasMore || false
    page++

    console.log(`   Fetched page ${page - 1}: ${creators.length} creators`)

    if (page > 10) {
      console.warn('⚠️ Reached page limit, stopping')
      break
    }
  }

  console.log(`✅ Total creators found: ${allCreators.length}`)
  return allCreators
}

/**
 * Fetches earnings for a specific creator.
 *
 * Endpoint: GET https://api.fanvue.com/creators/{creatorUserUuid}/insights/earnings
 * Scopes required: read:creator, read:insights
 * Docs: https://api.fanvue.com/docs/api-reference/reference/agencies/get-creator-earnings
 *
 * Returns cursor-paginated invoice data. Amounts are in CENTS.
 */
export async function fetchCreatorEarnings(
  agencyId: string,
  creatorUuid: string,
  startDate?: string,
  endDate?: string
): Promise<FanvueEarningsResponse['data']> {
  const token = await getAgencyFanvueToken(agencyId)
  const allEarnings: FanvueEarningsResponse['data'] = []
  let cursor: string | null = null

  const baseParams = new URLSearchParams()
  if (startDate) baseParams.set('startDate', startDate)
  if (endDate) baseParams.set('endDate', endDate)
  baseParams.set('size', '50')

  console.log(`💰 Fetching earnings for creator ${creatorUuid}...`)

  let pages = 0
  do {
    const params = new URLSearchParams(baseParams)
    if (cursor) params.set('cursor', cursor)

    const url = `${API_URL}/creators/${creatorUuid}/insights/earnings?${params.toString()}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Fanvue-API-Version': '2025-06-26',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch earnings: ${response.status} ${errorText}`)
    }

    const data: FanvueEarningsResponse = await response.json()
    allEarnings.push(...(data.data || []))

    cursor = data.nextCursor
    pages++

    if (pages > 20) {
      console.warn('⚠️ Reached page limit for earnings, stopping')
      break
    }
  } while (cursor)

  console.log(`✅ Total earnings records: ${allEarnings.length}`)
  return allEarnings
}

/**
 * Gets the agency's Fanvue connection status
 */
export async function getAgencyConnectionStatus(agencyId: string): Promise<{
  connected: boolean
  status?: 'active' | 'expired' | 'revoked'
  connectedAt?: string
  lastSyncedAt?: string
  fanvueUserId?: string
} | null> {
  const adminClient = createAdminClient()

  const { data: connection, error } = await adminClient
    .from('agency_fanvue_connections')
    .select('status, connected_at, last_synced_at, fanvue_user_id')
    .eq('agency_id', agencyId)
    .single()

  if (error || !connection) {
    return { connected: false }
  }

  return {
    connected: connection.status === 'active',
    status: connection.status,
    connectedAt: connection.connected_at,
    lastSyncedAt: connection.last_synced_at,
    fanvueUserId: connection.fanvue_user_id,
  }
}

/**
 * Updates the last sync timestamp for an agency
 */
export async function updateAgencyLastSync(agencyId: string, error?: string): Promise<void> {
  const adminClient = createAdminClient()

  await adminClient
    .from('agency_fanvue_connections')
    .update({
      last_synced_at: new Date().toISOString(),
      last_sync_error: error || null,
      updated_at: new Date().toISOString(),
    })
    .eq('agency_id', agencyId)
}
