/**
 * Fanvue Vault Sync API
 * Syncs creator media from Fanvue (via agency endpoint) to content_assets.
 *
 * Uses GET /creators/{uuid}/media (agency endpoint) which works with agency OAuth tokens.
 * The old /vault/folders endpoint required a personal creator token and always failed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncFanvueVault, syncAgencyVault } from '@/lib/services/fanvue-vault-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120 // Allow up to 2 minutes for large vaults

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

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 400 })
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { modelId } = body

    let result

    if (modelId) {
      // Sync specific model
      result = await syncFanvueVault(modelId)
    } else {
      // Sync entire agency
      result = await syncAgencyVault(profile.agency_id)
    }

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Synced ${result.assetsSynced} media items from Fanvue (${result.totalMediaFound} found, ${result.assetsSkipped} skipped)`
        : `Partial sync: ${result.assetsSynced} synced with ${result.errors.length} error(s)`,
      assetsSynced: result.assetsSynced,
      assetsSkipped: result.assetsSkipped,
      totalMediaFound: result.totalMediaFound,
      modelResults: result.modelResults,
      errors: result.errors,
    })
  } catch (error) {
    console.error('[Vault Sync API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
