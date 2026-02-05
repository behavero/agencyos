/**
 * PHASE 60: AGENCY SAAS LOOP (Proper SaaS Architecture)
 *
 * Uses the AGENCY's Fanvue token (not a model's token) for all operations.
 * Agency admins connect their own Fanvue account to manage all creators.
 *
 * The ultimate "One-Click" agency sync:
 * 1. Auto-discovers all creators from /agencies/creators
 * 2. Imports/updates them in the database
 * 3. Syncs transactions for each creator using /agencies/creators/{uuid}/earnings
 * 4. Returns detailed results for UI feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  getAgencyFanvueToken,
  fetchAgencyCreators,
  fetchCreatorEarnings,
  updateAgencyLastSync,
} from '@/lib/services/agency-fanvue-auth'
import { syncAgencyTopSpenders } from '@/lib/services/top-spenders-syncer'
import { syncAgencySubscriberHistory } from '@/lib/services/subscriber-history-syncer'

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

interface CreatorEarning {
  period: string
  revenue: number
  currency: string
}

/**
 * Import/update creators in the database
 */
async function importCreators(
  creators: FanvueCreator[],
  agencyId: string
): Promise<{
  imported: number
  updated: number
  modelIds: string[]
  creatorsMap: Map<string, string>
}> {
  const adminClient = createAdminClient()
  let imported = 0
  let updated = 0
  const modelIds: string[] = []
  const creatorsMap = new Map<string, string>() // uuid -> modelId

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
        creatorsMap.set(creator.uuid, existing.id)
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
          creatorsMap.set(creator.uuid, newModel.id)
        }
        console.log(`   🆕 Imported: ${creator.displayName} (@${creator.handle})`)
        imported++
      }
    } catch (error) {
      console.error(`   ❌ Failed to import ${creator.displayName}:`, error)
    }
  }

  console.log(`✅ Import complete: ${imported} new, ${updated} updated`)
  return { imported, updated, modelIds, creatorsMap }
}

/**
 * Sync earnings for all creators using agency endpoint
 */
async function syncAllCreatorsEarnings(
  agencyId: string,
  creators: FanvueCreator[],
  creatorsMap: Map<string, string>
): Promise<SyncResult[]> {
  const adminClient = createAdminClient()
  const results: SyncResult[] = []

  console.log(`\n💰 Syncing earnings for ${creators.length} creators...`)

  // Calculate date range (last 30 days)
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  for (const creator of creators) {
    const modelId = creatorsMap.get(creator.uuid)
    if (!modelId) {
      console.log(`   ⚠️ Skipping ${creator.displayName} - no model ID`)
      continue
    }

    try {
      console.log(`   📊 Syncing ${creator.displayName}...`)

      // Fetch earnings using agency endpoint
      const earnings = await fetchCreatorEarnings(agencyId, creator.uuid, startDate, endDate)

      // Store earnings in fanvue_transactions table
      let transactionsSynced = 0

      for (const earning of earnings) {
        // Fanvue API returns amounts in cents — convert to dollars
        const amountDollars = (earning.net || earning.gross || 0) / 100

        const { error: insertError } = await adminClient.from('fanvue_transactions').upsert(
          {
            model_id: modelId,
            fanvue_user_uuid: creator.uuid,
            transaction_date: earning.date,
            amount: amountDollars,
            currency: earning.currency || 'USD',
            description: `${earning.source || 'earnings'} via agency sync`,
            source: 'agency_api',
            created_at: new Date().toISOString(),
          },
          {
            onConflict: 'model_id,transaction_date',
          }
        )

        if (!insertError) {
          transactionsSynced++
        }
      }

      // Update model's last sync timestamp
      await adminClient
        .from('models')
        .update({
          last_transaction_sync: new Date().toISOString(),
          revenue_30d: earnings.reduce((sum, e) => sum + (e.net || e.gross || 0) / 100, 0),
        })
        .eq('id', modelId)

      results.push({
        creatorName: creator.displayName,
        creatorHandle: creator.handle,
        success: true,
        transactionsSynced,
        errors: [],
      })

      console.log(`   ✅ ${creator.displayName}: ${transactionsSynced} earnings synced`)
    } catch (error: any) {
      console.error(`   ❌ Sync failed for ${creator.displayName}:`, error.message)
      results.push({
        creatorName: creator.displayName,
        creatorHandle: creator.handle,
        success: false,
        transactionsSynced: 0,
        errors: [error.message],
      })
    }
  }

  return results
}

/**
 * POST handler: The Full Agency SaaS Loop
 */
export async function POST(_request: NextRequest) {
  const startTime = Date.now()
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

    console.log(`\n🏢 🔄 AGENCY SAAS LOOP START for agency ${profile.agency_id}`)

    // STEP 1: Get agency token (validates connection exists)
    console.log('\n📡 STEP 1: VALIDATE AGENCY CONNECTION')
    const agencyToken = await getAgencyFanvueToken(profile.agency_id)
    console.log('✅ Agency token validated')

    // STEP 2: Auto-discover creators
    console.log('\n📡 STEP 2: AUTO-DISCOVERY')
    const creators = await fetchAgencyCreators(profile.agency_id)

    if (creators.length === 0) {
      await updateAgencyLastSync(profile.agency_id, 'No creators found')
      return NextResponse.json({
        success: false,
        message: 'No creators found in agency account',
        creatorsFound: 0,
        creatorsImported: 0,
        creatorsUpdated: 0,
        syncResults: [],
      })
    }

    // STEP 3: Import/update creators
    console.log('\n📥 STEP 3: AUTO-IMPORT')
    const importResult = await importCreators(creators, profile.agency_id)

    // STEP 4: Sync earnings using agency endpoint
    console.log('\n💰 STEP 4: EARNINGS SYNC (via /agencies/creators/{uuid}/earnings)')
    const syncResults = await syncAllCreatorsEarnings(
      profile.agency_id,
      creators,
      importResult.creatorsMap
    )

    // STEP 5: Sync Top Spenders (using agency token)
    console.log('\n🌟 STEP 5: TOP SPENDERS SYNC (VIP Analytics)')
    let topSpendersResult = { totalSpenders: 0, totalRevenue: 0 }
    try {
      topSpendersResult = await syncAgencyTopSpenders(profile.agency_id, agencyToken)
    } catch (error: any) {
      console.error('   ⚠️ Top spenders sync failed:', error.message)
    }

    // STEP 6: Sync Subscriber History (using agency token)
    console.log('\n📈 STEP 6: SUBSCRIBER HISTORY SYNC (Trend Analytics)')
    let subscriberHistoryResult = { totalDays: 0 }
    try {
      subscriberHistoryResult = await syncAgencySubscriberHistory(
        profile.agency_id,
        agencyToken,
        365
      )
    } catch (error: any) {
      console.error('   ⚠️ Subscriber history sync failed:', error.message)
    }

    // Update last sync timestamp
    await updateAgencyLastSync(profile.agency_id)

    // Calculate totals
    const totalSynced = syncResults.reduce((sum, r) => sum + r.transactionsSynced, 0)
    const successCount = syncResults.filter(r => r.success).length
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log(`\n✅ AGENCY SAAS LOOP COMPLETE in ${duration}s`)
    console.log(`   Creators discovered: ${creators.length}`)
    console.log(`   Creators imported: ${importResult.imported}`)
    console.log(`   Creators updated: ${importResult.updated}`)
    console.log(`   Creators synced successfully: ${successCount}/${syncResults.length}`)
    console.log(`   Total earnings synced: ${totalSynced}`)
    console.log(`   VIP fans tracked: ${topSpendersResult.totalSpenders}`)
    console.log(`   History days synced: ${subscriberHistoryResult.totalDays}`)

    return NextResponse.json({
      success: true,
      message: `✅ Synced ${successCount} creators: ${totalSynced} earnings, ${topSpendersResult.totalSpenders} VIP fans`,
      creatorsFound: creators.length,
      creatorsImported: importResult.imported,
      creatorsUpdated: importResult.updated,
      syncResults,
      topSpendersResult,
      subscriberHistoryResult,
      summary: {
        totalCreators: creators.length,
        successfulSyncs: successCount,
        totalEarnings: totalSynced,
        totalVIPFans: topSpendersResult.totalSpenders,
        totalVIPRevenue: topSpendersResult.totalRevenue,
        totalHistoryDays: subscriberHistoryResult.totalDays,
        durationSeconds: parseFloat(duration),
      },
    })
  } catch (error) {
    console.error('❌ AGENCY SAAS LOOP ERROR:', error)
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`   Duration before error: ${duration}s`)

    // Extract more helpful error message
    let errorMessage = 'Unknown error'
    let errorDetails = ''

    if (error instanceof Error) {
      errorMessage = error.message

      // Check for common error types
      if (errorMessage.includes('NO_AGENCY_FANVUE_CONNECTION')) {
        errorDetails = 'Agency admin needs to connect their Fanvue account in agency settings'
      } else if (errorMessage.includes('INSUFFICIENT_PERMISSIONS')) {
        errorDetails = 'The connected Fanvue account does not have agency admin access'
      } else if (errorMessage.includes('Failed to fetch creators')) {
        errorDetails = 'Could not fetch creators from Fanvue API'
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        errorDetails = 'Fanvue authentication failed. Agency admin needs to reconnect'
      } else if (errorMessage.includes('429') || errorMessage.includes('Too many requests')) {
        errorDetails = 'Rate limit exceeded. Please wait a minute and try again'
      }
    }

    // Try to update sync error
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
        details: errorDetails || errorMessage,
        troubleshooting: {
          step1: 'Ensure an agency admin has connected their Fanvue account in Agency Settings',
          step2: 'Verify the connected account has agency admin/owner permissions on Fanvue',
          step3: 'Check that Fanvue tokens are not expired',
          step4: 'Wait a minute if you recently synced (rate limit)',
        },
      },
      { status: 500 }
    )
  }
}
