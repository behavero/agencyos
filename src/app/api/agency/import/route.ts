/**
 * Phase 59: Agency Auto-Discovery
 * Automatically imports all creators from the agency's Fanvue account
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const AUTH_URL = 'https://auth.fanvue.com/oauth2/token'
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

interface AgencyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope?: string
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Get agency access token using client credentials
 */
async function getAgencyToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_FANVUE_CLIENT_ID
  const clientSecret = process.env.FANVUE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Fanvue agency credentials not configured')
  }

  console.log('🔐 Getting agency token...')

  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'read:creator read:fan read:insights read:chat read:media read:post read:agency',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Agency auth failed: ${response.status} ${errorText}`)
  }

  const data: AgencyTokenResponse = await response.json()

  if (!data.access_token) {
    throw new Error('No access token in agency response')
  }

  console.log('✅ Agency token acquired')
  return data.access_token
}

/**
 * Fetch all creators from the agency
 */
async function fetchAgencyCreators(token: string): Promise<FanvueCreator[]> {
  const allCreators: FanvueCreator[] = []
  let page = 1
  let hasMore = true

  console.log('👥 Fetching agency creators...')

  while (hasMore) {
    const response = await fetch(`${API_URL}/creators?page=${page}&size=50`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Fanvue-API-Version': '2025-06-26',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch creators: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    const creators: FanvueCreator[] = data.data || []

    allCreators.push(...creators)

    hasMore = data.pagination?.hasMore || false
    page++

    console.log(`   Fetched page ${page - 1}: ${creators.length} creators`)

    if (page > 10) {
      // Safety limit
      console.warn('⚠️  Reached page limit, stopping')
      break
    }
  }

  console.log(`✅ Total creators found: ${allCreators.length}`)
  return allCreators
}

/**
 * Import creators into the database
 */
async function importCreators(
  creators: FanvueCreator[],
  agencyId: string,
  agencyToken: string
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
        .select('id')
        .eq('fanvue_user_uuid', creator.uuid)
        .single()

      const modelData = {
        agency_id: agencyId,
        name: creator.displayName,
        fanvue_username: creator.handle,
        fanvue_user_uuid: creator.uuid,
        avatar_url: creator.avatarUrl,
        // Store agency token for this creator (they all share the agency token)
        fanvue_access_token: agencyToken,
        status: 'active',
        updated_at: new Date().toISOString(),
      }

      if (existing) {
        // Update existing creator
        await adminClient.from('models').update(modelData).eq('id', existing.id)

        console.log(`   ✅ Updated: ${creator.displayName} (@${creator.handle})`)
        updated++
      } else {
        // Create new creator
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
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 400 })
    }

    console.log(`\n🏢 AGENCY AUTO-DISCOVERY for agency ${profile.agency_id}`)

    // Step 1: Get agency token
    const agencyToken = await getAgencyToken()

    // Step 2: Fetch all creators
    const creators = await fetchAgencyCreators(agencyToken)

    if (creators.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No creators found in agency account',
        imported: 0,
        updated: 0,
        errors: [],
      })
    }

    // Step 3: Import into database
    const result = await importCreators(creators, profile.agency_id, agencyToken)

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
  } catch (error: any) {
    console.error('Agency import error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Agency import failed',
      },
      { status: 500 }
    )
  }
}

/**
 * GET handler: Show import status
 */
export async function GET(request: NextRequest) {
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
      .select('agency_id')
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

    return NextResponse.json({
      agencyId: profile.agency_id,
      totalCreators: models?.length || 0,
      creators: models || [],
      hint: 'POST to this endpoint to trigger agency auto-discovery',
    })
  } catch (error: any) {
    console.error('Agency status error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to get agency status',
      },
      { status: 500 }
    )
  }
}
