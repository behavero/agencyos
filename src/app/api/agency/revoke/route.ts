/**
 * POST /api/agency/revoke
 * Revokes the agency's Fanvue connection
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revokeAgencyConnection } from '@/lib/services/agency-fanvue-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest) {
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

    if (!['admin', 'owner', 'grandmaster'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Revoke the connection
    await revokeAgencyConnection(profile.agency_id)

    return NextResponse.json({
      success: true,
      message: 'Agency Fanvue connection revoked',
    })
  } catch (error: unknown) {
    console.error('Agency revoke error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke connection',
      },
      { status: 500 }
    )
  }
}
