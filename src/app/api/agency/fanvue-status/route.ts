import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/agency/fanvue-status?agencyId=xxx
 * Returns the current Fanvue connection status for an agency
 */
export async function GET(request: NextRequest) {
  const agencyId = request.nextUrl.searchParams.get('agencyId')
  if (!agencyId) {
    return NextResponse.json({ error: 'agencyId required' }, { status: 400 })
  }

  try {
    const adminClient = createAdminClient()

    const { data: connection } = await adminClient
      .from('agency_fanvue_connections')
      .select('status, fanvue_username, fanvue_user_id, fanvue_token_expires_at')
      .eq('agency_id', agencyId)
      .single()

    if (!connection) {
      return NextResponse.json({ connected: false })
    }

    // Count creators synced for this agency
    const { count: creatorsCount } = await adminClient
      .from('models')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .not('fanvue_user_uuid', 'is', null)

    return NextResponse.json({
      connected: true,
      status: connection.status,
      fanvueUsername: connection.fanvue_username || null,
      creatorsCount: creatorsCount || 0,
      expiresAt: connection.fanvue_token_expires_at,
    })
  } catch (error) {
    console.error('[Fanvue Status API] Error:', error)
    return NextResponse.json({ connected: false })
  }
}
