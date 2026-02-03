/**
 * Agency VIP Fans API Endpoint
 * Returns top-spending fans across all creators in an agency
 * Part of Phase A: Complete the Core Loop
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgencyVIPFans } from '@/lib/services/top-spenders-syncer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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

    // Get limit from query params (default 50)
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Fetch VIP fans
    const result = await getAgencyVIPFans(profile.agency_id, limit)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch VIP fans' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      fans: result.fans,
      count: result.fans.length,
    })
  } catch (error) {
    console.error('VIP Fans API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
