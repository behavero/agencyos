/**
 * Phase 60: Agency Auto-Discovery (SaaS Architecture)
 *
 * IMPORTANT: This uses the AGENCY's Fanvue token (not a model's token).
 * Agency admins connect their own Fanvue account via OAuth with agency scopes.
 *
 * This fetches all creators from /agencies/creators endpoint
 * and imports them into the database.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  getAgencyFanvueToken,
  fetchAgencyCreators,
  updateAgencyLastSync,
} from '@/lib/services/agency-fanvue-auth'

const API_URL = 'https://api.fanvue.com'

interface FanvueCreator {
  uuid: string
  handle: string
  displayName: string
  nickname: string | null
  avatarUrl: string | null
  registeredAt: string
  role: string
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Import creators into the database
 * NOTE: We don't store tokens for auto-imported creators
 * They will need to connect individually via OAuth to enable personal syncing
 */
async function importCreators(
  creators: FanvueCreator[],
  agencyId: string
): Promise<{ imported: number; updated: number; errors: string[] }> {
  const adminClient = createAdminClient()
  let imported = 0
  let updated = 0
  const errors: string[] = []

  console.log(`📥 Importing ${creators.length} creators into agency ${agencyId}...`)

  for (const creator of creators) {
    try {
      // Check if creator already exists
      const { data: existing } = await adminClient
        .from('models')
        .select('id, fanvue_access_token')
        .eq('fanvue_user_uuid', creator.uuid)
        .single()

      const modelData = {
        agency_id: agencyId,
        name: creator.displayName,
        fanvue_username: creator.handle,
        fanvue_user_uuid: creator.uuid,
        avatar_url: creator.avatarUrl,
        status: 'active',
        updated_at: new Date().toISOString(),
      }

      if (existing) {
        // Update existing creator (but don't overwrite their token if they have one)
        await adminClient.from('models').update(modelData).eq('id', existing.id)

        console.log(`   ✅ Updated: ${creator.displayName} (@${creator.handle})`)
        updated++
      } else {
        // Create new creator (without token - they'll need to connect via OAuth)
        await adminClient.from('models').insert(modelData)

        console.log(`   🆕 Imported: ${creator.displayName} (@${creator.handle})`)
        imported++
      }
    } catch (error: any) {
      const errorMsg = `Failed to import ${creator.displayName}: ${error.message}`
      console.error(`   ❌ ${errorMsg}`)
      errors.push(errorMsg)
    }
  }

  console.log(`✅ Import complete: ${imported} new, ${updated} updated, ${errors.length} errors`)

  return { imported, updated, errors }
}

/**
 * POST handler: Import all agency creators
 */
export async function POST(_request: NextRequest) {
  let syncError: string | undefined

  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's agency and verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 400 })
    }

    if (!['admin', 'owner'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log(`\n🏢 AGENCY AUTO-DISCOVERY for agency ${profile.agency_id}`)

    // Step 1: Get a valid Fanvue token from agency connection
    const agencyToken = await getAgencyFanvueToken(profile.agency_id)

    // Step 2: Fetch all creators from agency
    const creators = await fetchAgencyCreators(profile.agency_id)

    if (creators.length === 0) {
      await updateAgencyLastSync(profile.agency_id, 'No creators found')
      return NextResponse.json({
        success: false,
        message: 'No creators found in agency account',
        imported: 0,
        updated: 0,
        errors: [],
      })
    }

    // Step 3: Import into database (without copying tokens)
    const result = await importCreators(creators, profile.agency_id)

    // Update last sync timestamp
    await updateAgencyLastSync(profile.agency_id)

    return NextResponse.json({
      success: true,
      message: `Imported ${result.imported} new creators, updated ${result.updated}`,
      imported: result.imported,
      updated: result.updated,
      total: creators.length,
      errors: result.errors,
      creators: creators.map(c => ({
        uuid: c.uuid,
        handle: c.handle,
        displayName: c.displayName,
      })),
    })
  } catch (error: unknown) {
    console.error('Agency import error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Agency import failed'
    syncError = errorMessage

    // Try to update sync error if we have agency ID
    try {
      const supabase = await createClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('agency_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
        .single()

      if (profile?.agency_id) {
        await updateAgencyLastSync(profile.agency_id, errorMessage)
      }
    } catch {
      // Ignore errors here
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}

/**
 * GET handler: Show import status
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 400 })
    }

    // Get current creators in database
    const { data: models } = await supabase
      .from('models')
      .select('id, name, fanvue_username, fanvue_user_uuid, avatar_url, created_at, updated_at')
      .eq('agency_id', profile.agency_id)
      .order('created_at', { ascending: false })

    // Get agency connection status
    const { data: connection } = await supabase
      .from('agency_fanvue_connections')
      .select('status, connected_at, last_synced_at, last_sync_error')
      .eq('agency_id', profile.agency_id)
      .single()

    return NextResponse.json({
      agencyId: profile.agency_id,
      isAdmin: ['admin', 'owner'].includes(profile.role || ''),
      fanvueConnection: connection
        ? {
            connected: connection.status === 'active',
            status: connection.status,
            connectedAt: connection.connected_at,
            lastSyncedAt: connection.last_synced_at,
            lastSyncError: connection.last_sync_error,
          }
        : null,
      totalCreators: models?.length || 0,
      creators: models || [],
      hint: 'POST to this endpoint to trigger agency auto-discovery',
    })
  } catch (error: unknown) {
    console.error('Agency status error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get agency status',
      },
      { status: 500 }
    )
  }
}
