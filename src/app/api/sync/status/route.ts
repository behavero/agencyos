/**
 * API: Sync Status Dashboard
 *
 * Returns real-time sync health for all models
 * Used by dashboard to show "Live" indicators
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getTokenHealth } from '@/lib/services/token-refresh-service'
import { getSyncStatus } from '@/lib/services/realtime-sync-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
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
      return NextResponse.json({ error: 'No agency found' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // Get all models in agency
    const { data: models } = await adminClient
      .from('models')
      .select('id, name, last_transaction_sync, last_stats_sync')
      .eq('agency_id', profile.agency_id)
      .not('fanvue_access_token', 'is', null)

    // Get token health
    const tokenHealth = await getTokenHealth()

    // Get sync status for each model
    const modelStatus = await Promise.all(
      (models || []).map(async model => {
        const syncStatus = await getSyncStatus(model.id)
        return {
          id: model.id,
          name: model.name,
          ...syncStatus,
        }
      })
    )

    // Calculate overall health
    const healthyModels = modelStatus.filter(m => m.isHealthy).length
    const totalModels = modelStatus.length

    return NextResponse.json({
      success: true,
      overall: {
        healthy: healthyModels === totalModels,
        healthyModels,
        totalModels,
      },
      tokens: tokenHealth,
      models: modelStatus,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[Sync Status API] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
