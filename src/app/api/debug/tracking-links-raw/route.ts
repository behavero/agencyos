/**
 * DEBUG: Returns raw Fanvue API response for tracking links
 * This endpoint is temporary — remove after debugging
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'
import { getAgencyFanvueToken } from '@/lib/services/agency-fanvue-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const adminClient = createAdminClient()

    // Get first agency
    const { data: agency } = await adminClient.from('agencies').select('id').limit(1).single()

    if (!agency) {
      return NextResponse.json({ error: 'No agency found' })
    }

    const agencyToken = await getAgencyFanvueToken(agency.id)
    const fanvue = createFanvueClient(agencyToken)

    // Get first model with a UUID
    const { data: models } = await adminClient
      .from('models')
      .select('id, name, fanvue_user_uuid')
      .eq('agency_id', agency.id)
      .not('fanvue_user_uuid', 'is', null)
      .limit(3)

    if (!models?.length) {
      return NextResponse.json({ error: 'No models found' })
    }

    const results: Record<string, unknown> = {}

    for (const model of models) {
      try {
        // Get raw response from the Fanvue client
        const response = await fanvue.getCreatorTrackingLinks(model.fanvue_user_uuid!, {
          limit: 2,
        })

        results[model.name] = {
          dataLength: response.data.length,
          nextCursor: response.nextCursor,
          // Show ALL fields from the first item
          firstItemKeys: response.data[0] ? Object.keys(response.data[0]) : [],
          firstItemRaw: response.data[0] || null,
          // Show second item too if available
          secondItemRaw: response.data[1] || null,
        }
      } catch (err) {
        results[model.name] = {
          error: err instanceof Error ? err.message : String(err),
        }
      }
    }

    return NextResponse.json({
      debug: true,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
