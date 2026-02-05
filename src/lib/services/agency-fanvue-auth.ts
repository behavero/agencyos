/**
 * Agency Fanvue OAuth Authentication Service
 * Phase 60 - SaaS Architecture Implementation
 *
 * This service handles agency-level Fanvue connections separately from model connections.
 * Agency admins connect their own Fanvue account to manage all creators in the agency.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { refreshAccessToken } from '@/lib/fanvue/oauth'

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
    hasMore: boolean
    nextPage: number | null
  }
}

interface FanvueEarningsResponse {
  data: {
    period: string
    revenue: number
    currency: string
  }[]
}

/**
 * Gets a valid Fanvue access token for an agency
 * Automatically refreshes if expired
 */
export async function getAgencyFanvueToken(agencyId: string): Promise<string> {
  const adminClient = createAdminClient()

  // Get the agency's connection
  const { data: connection, error } = await adminClient
    .from('agency_fanvue_connections')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('status', 'active')
    .single()

  if (error || !connection) {
    throw new Error(
      `NO_AGENCY_FANVUE_CONNECTION: Agency ${agencyId} has no active Fanvue connection. ` +
        'An agency admin must connect their Fanvue account in the agency settings.'
    )
  }

  // Check if token is expired or expiring soon (within 1 hour)
  const expiresAt = new Date(connection.fanvue_token_expires_at)
  const now = new Date()
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

  const needsRefresh = expiresAt < oneHourFromNow

  if (!needsRefresh) {
    console.log(`✅ Agency ${agencyId} token is valid`)
    return connection.fanvue_access_token
  }

  // Token needs refresh
  console.log(`🔄 Refreshing agency ${agencyId} token...`)

  try {
    await refreshAgencyToken(agencyId)

    // Fetch the updated token
    const { data: updatedConnection } = await adminClient
      .from('agency_fanvue_connections')
      .select('fanvue_access_token')
      .eq('agency_id', agencyId)
      .single()

    if (!updatedConnection) {
      throw new Error('Failed to retrieve updated token after refresh')
    }

    return updatedConnection.fanvue_access_token
  } catch (error: any) {
    console.error(`❌ Failed to refresh agency token:`, error.message)
    throw new Error(
      `Agency token refresh failed: ${error.message}. ` +
        'Agency admin may need to reconnect their Fanvue account.'
    )
  }
}

/**
 * Refreshes a Fanvue access token for an agency
 */
export async function refreshAgencyToken(agencyId: string): Promise<void> {
  const adminClient = createAdminClient()

  const clientId = process.env.NEXT_PUBLIC_FANVUE_CLIENT_ID
  const clientSecret = process.env.FANVUE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Fanvue OAuth credentials not configured')
  }

  // Get current connection
  const { data: connection, error } = await adminClient
    .from('agency_fanvue_connections')
    .select('fanvue_refresh_token')
    .eq('agency_id', agencyId)
    .single()

  if (error || !connection) {
    throw new Error(`Agency connection not found: ${agencyId}`)
  }

  console.log(`🔄 Refreshing Fanvue token for agency ${agencyId}...`)

  try {
    const tokenData = await refreshAccessToken({
      refreshToken: connection.fanvue_refresh_token,
      clientId,
      clientSecret,
    })

    // Update database with new tokens
    const { error: updateError } = await adminClient
      .from('agency_fanvue_connections')
      .update({
        fanvue_access_token: tokenData.access_token,
        fanvue_refresh_token: tokenData.refresh_token || connection.fanvue_refresh_token,
        fanvue_token_expires_at: new Date(
          Date.now() + (tokenData.expires_in || 3600) * 1000
        ).toISOString(),
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('agency_id', agencyId)

    if (updateError) {
      throw new Error(`Failed to update tokens: ${updateError.message}`)
    }

    console.log(`✅ Agency ${agencyId} token refreshed successfully`)
  } catch (error: any) {
    console.error(`❌ Token refresh failed for agency ${agencyId}:`, error.message)

    // Mark connection as expired
    await adminClient
      .from('agency_fanvue_connections')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('agency_id', agencyId)

    throw error
  }
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
 * Fetches all creators from the agency's Fanvue account
 * Uses the /agencies/creators endpoint
 */
export async function fetchAgencyCreators(agencyId: string): Promise<FanvueCreator[]> {
  const token = await getAgencyFanvueToken(agencyId)
  const allCreators: FanvueCreator[] = []
  let page = 1
  let hasMore = true

  console.log('👥 Fetching agency creators from /agencies/creators...')

  while (hasMore) {
    const response = await fetch(`${API_URL}/agencies/creators?page=${page}&size=50`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Fanvue-API-Version': '2025-06-26',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()

      // Handle specific error cases
      if (response.status === 403) {
        throw new Error(
          'INSUFFICIENT_PERMISSIONS: The connected Fanvue account does not have agency access. ' +
            'Make sure you are connecting an admin/owner account with read:agency scope.'
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
 * Fetches earnings for a specific creator
 * Uses the /agencies/creators/{uuid}/earnings endpoint
 */
export async function fetchCreatorEarnings(
  agencyId: string,
  creatorUuid: string,
  startDate?: string,
  endDate?: string
): Promise<FanvueEarningsResponse['data']> {
  const token = await getAgencyFanvueToken(agencyId)

  const params = new URLSearchParams()
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)

  const url = `${API_URL}/agencies/creators/${creatorUuid}/earnings?${params.toString()}`

  console.log(`💰 Fetching earnings for creator ${creatorUuid}...`)

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
  return data.data || []
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
