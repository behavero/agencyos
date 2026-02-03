/**
 * Cron Job: Sync Tracking Links
 * 
 * Fetches tracking link data from Fanvue API for all connected creators
 * and updates the tracking_links table with click/conversion metrics.
 * 
 * Schedule: Every 30 minutes (configured in vercel.json)
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { syncAllTrackingLinks } from '@/lib/services/tracking-links-syncer'

export const maxDuration = 300 // 5 minutes max execution time
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verify cron secret for security (optional)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const url = new URL(request.url)
  const manualTrigger = url.searchParams.get('manual') === 'true'
  
  // Allow access if:
  // 1. No CRON_SECRET is set (development)
  // 2. Authorization header matches CRON_SECRET
  // 3. Manual trigger parameter is set (for testing)
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isAuthorized = !cronSecret || authHeader === `Bearer ${cronSecret}` || isVercelCron || manualTrigger
  
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  console.log('[cron/sync-tracking-links] Starting tracking links sync...')

  try {
    const supabase = await createAdminClient()

    // Get all agencies
    const { data: agencies, error: agenciesError } = await supabase
      .from('agencies')
      .select('id, name')

    if (agenciesError) {
      throw new Error(`Failed to fetch agencies: ${agenciesError.message}`)
    }

    let totalSynced = 0
    let totalModels = 0
    const allErrors: string[] = []

    // Sync tracking links for each agency
    for (const agency of agencies || []) {
      try {
        const result = await syncAllTrackingLinks(agency.id)
        totalSynced += result.totalSynced
        totalModels += result.modelsProcessed
        
        if (result.errors.length > 0) {
          allErrors.push(...result.errors.map(e => `[${agency.name}] ${e}`))
        }
        
        console.log(`[cron/sync-tracking-links] Agency ${agency.name}: ${result.totalSynced} links from ${result.modelsProcessed} models`)
      } catch (error) {
        allErrors.push(`[${agency.name}] ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    const duration = Date.now() - startTime
    console.log(`[cron/sync-tracking-links] Completed in ${duration}ms: ${totalSynced} links from ${totalModels} models`)

    return NextResponse.json({
      success: true,
      synced: totalSynced,
      modelsProcessed: totalModels,
      agenciesProcessed: agencies?.length || 0,
      duration: `${duration}ms`,
      errors: allErrors.length > 0 ? allErrors : undefined,
    })
  } catch (error) {
    console.error('[cron/sync-tracking-links] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
