/**
 * Vault Performance API
 * Phase 50 - Get asset performance metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAssetPerformance } from '@/lib/services/asset-attribution'

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

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 400 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const sortBy = searchParams.get('sortBy') as 'revenue' | 'conversion' | 'recent' | undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const minConversion = searchParams.get('minConversion')
      ? parseFloat(searchParams.get('minConversion')!)
      : undefined

    // Fetch asset performance
    const performance = await getAssetPerformance(profile.agency_id, {
      sortBy,
      limit,
      minConversion,
    })

    return NextResponse.json({
      success: true,
      data: performance,
      count: performance.length,
    })
  } catch (error) {
    console.error('Error fetching asset performance:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
