/**
 * Manual Transaction Sync API
 * Phase 49 - Trigger transaction sync manually
 *
 * This endpoint allows users to manually trigger a transaction sync
 * for their agency or a specific model.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncAgencyTransactions, syncModelTransactions } from '@/lib/services/transaction-syncer'

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
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 400 })
    }

    // Parse request body
    const body = await request.json()
    const { modelId } = body

    let result

    if (modelId) {
      // Sync specific model
      result = await syncModelTransactions(modelId)
    } else {
      // Sync entire agency
      result = await syncAgencyTransactions(profile.agency_id)
    }

    return NextResponse.json({
      ...result,
      message: result.success ? `Synced ${result.transactionsSynced} transactions` : 'Sync failed',
    })
  } catch (error) {
    console.error('Manual sync error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        phase: 'SYNC_ERROR',
      },
      { status: 500 }
    )
  }
}
