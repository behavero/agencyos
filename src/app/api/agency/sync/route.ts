/**
 * PHASE 59: AGENCY SAAS LOOP
 * The ultimate "One-Click" agency sync:
 * 1. Auto-discovers all creators from Fanvue
 * 2. Imports/updates them in the database
 * 3. Syncs transactions for each creator
 * 4. Returns detailed results for UI feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getModelAccessToken } from '@/lib/services/fanvue-auth'
import { syncModelTransactions } from '@/lib/services/transaction-syncer'

const API_URL = 'https://api.fanvue.com'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface FanvueCreator {
  uuid: string
  handle: string
  displayName: string
  nickname: string | null
  avatarUrl: string | null
  registeredAt: string
  role: string
}

interface SyncResult {
  creatorName: string
  creatorHandle: string
  success: boolean
  transactionsSynced: number
  errors: string[]
}

/**
 * Get a valid Fanvue access token for the agency
 */
async function getAgencyFanvueToken(agencyId: string): Promise<string> {
  const adminClient = createAdminClient()

  const { data: models } = await adminClient
    .from('models')
    .select('id, name, fanvue_access_token, fanvue_refresh_token, fanvue_token_expires_at')
    .eq('agency_id', agencyId)
    .not('fanvue_access_token', 'is', null)
    .order('fanvue_token_expires_at', { ascending: false, nullsFirst: false })
    .limit(1)

  if (!models || models.length === 0) {
    throw new Error(
      'NO_FANVUE_CONNECTION: No creators in this agency have connected their Fanvue account yet. ' +
        'Click "Connect with Fanvue" for at least one creator first, then try again.'
    )
  }

  const model = models[0]
  console.log(`🔑 Using token from ${model.name} for agency operations`)

  const token = await getModelAccessToken(model.id)
  return token
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
      console.warn('⚠️  Reached page limit, stopping')
      break
    }
  }

  console.log(`✅ Total creators found: ${allCreators.length}`)
  return allCreators
}

/**
 * Import/update creators in the database
 */
async function importCreators(
  creators: FanvueCreator[],
  agencyId: string
): Promise<{ imported: number; updated: number; modelIds: string[] }> {
  const adminClient = createAdminClient()
  let imported = 0
  let updated = 0
  const modelIds: string[] = []

  console.log(`📥 Importing ${creators.length} creators into agency ${agencyId}...`)

  for (const creator of creators) {
    try {
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
        status: 'active',
        updated_at: new Date().toISOString(),
      }

      if (existing) {
        await adminClient.from('models').update(modelData).eq('id', existing.id)
        modelIds.push(existing.id)
        console.log(`   ✅ Updated: ${creator.displayName} (@${creator.handle})`)
        updated++
      } else {
        const { data: newModel } = await adminClient
          .from('models')
          .insert(modelData)
          .select('id')
          .single()

        if (newModel) {
          modelIds.push(newModel.id)
        }
        console.log(`   🆕 Imported: ${creator.displayName} (@${creator.handle})`)
        imported++
      }
    } catch (error) {
      console.error(`   ❌ Failed to import ${creator.displayName}:`, error)
    }
  }

  console.log(`✅ Import complete: ${imported} new, ${updated} updated`)
  return { imported, updated, modelIds }
}

/**
 * Sync transactions for all models
 */
async function syncAllCreators(modelIds: string[]): Promise<SyncResult[]> {
  const adminClient = createAdminClient()
  const results: SyncResult[] = []

  console.log(`\n💰 Syncing transactions for ${modelIds.length} creators...`)

  for (const modelId of modelIds) {
    try {
      // Get model info for reporting
      const { data: model } = await adminClient
        .from('models')
        .select('name, fanvue_username')
        .eq('id', modelId)
        .single()

      if (!model) continue

      console.log(`   📊 Syncing ${model.name}...`)

      const syncResult = await syncModelTransactions(modelId)

      results.push({
        creatorName: model.name,
        creatorHandle: model.fanvue_username || '',
        success: syncResult.success,
        transactionsSynced: syncResult.transactionsSynced,
        errors: syncResult.errors || [],
      })

      console.log(
        `   ${syncResult.success ? '✅' : '❌'} ${model.name}: ${syncResult.transactionsSynced} transactions`
      )
    } catch (error) {
      console.error(`   ❌ Sync failed for model ${modelId}:`, error)
      results.push({
        creatorName: 'Unknown',
        creatorHandle: '',
        success: false,
        transactionsSynced: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      })
    }
  }

  return results
}

/**
 * POST handler: The Full Agency SaaS Loop
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

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

    console.log(`\n🏢 🔄 AGENCY SAAS LOOP START for agency ${profile.agency_id}`)

    // STEP 1: Auto-discover creators
    console.log('\n📡 STEP 1: AUTO-DISCOVERY')
    const agencyToken = await getAgencyFanvueToken(profile.agency_id)
    const creators = await fetchAgencyCreators(agencyToken)

    if (creators.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No creators found in agency account',
        creatorsFound: 0,
        creatorsImported: 0,
        creatorsUpdated: 0,
        syncResults: [],
      })
    }

    // STEP 2: Import/update creators
    console.log('\n📥 STEP 2: AUTO-IMPORT')
    const importResult = await importCreators(creators, profile.agency_id)

    // STEP 3: Sync all creators
    console.log('\n💰 STEP 3: TRANSACTION SYNC')
    const syncResults = await syncAllCreators(importResult.modelIds)

    // Calculate totals
    const totalSynced = syncResults.reduce((sum, r) => sum + r.transactionsSynced, 0)
    const successCount = syncResults.filter(r => r.success).length
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log(`\n✅ AGENCY SAAS LOOP COMPLETE in ${duration}s`)
    console.log(`   Creators discovered: ${creators.length}`)
    console.log(`   Creators imported: ${importResult.imported}`)
    console.log(`   Creators updated: ${importResult.updated}`)
    console.log(`   Creators synced successfully: ${successCount}/${syncResults.length}`)
    console.log(`   Total transactions synced: ${totalSynced}`)

    return NextResponse.json({
      success: true,
      message: `✅ Synced ${successCount} creators: ${totalSynced} transactions`,
      creatorsFound: creators.length,
      creatorsImported: importResult.imported,
      creatorsUpdated: importResult.updated,
      syncResults,
      summary: {
        totalCreators: creators.length,
        successfulSyncs: successCount,
        totalTransactions: totalSynced,
        durationSeconds: parseFloat(duration),
      },
    })
  } catch (error) {
    console.error('❌ AGENCY SAAS LOOP ERROR:', error)
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`   Duration before error: ${duration}s`)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
