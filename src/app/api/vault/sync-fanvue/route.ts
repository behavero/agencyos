/**
 * Fanvue Vault Sync API
 * Syncs media from Fanvue Vault to content_assets
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncFanvueVault, syncAgencyVault } from '@/lib/services/fanvue-vault-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
      message: `Synced ${result.assetsSynced} assets from Fanvue Vault`,
      assetsSynced: result.assetsSynced,
      errors: result.errors,
    })
  } catch (error) {
    console.error('Fanvue vault sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
