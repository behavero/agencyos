/**
 * Best Sellers API
 * Phase 50 - Get top performing content assets
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBestSellers } from '@/lib/services/asset-attribution'

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
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 7
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10

    // Fetch best sellers
    const bestSellers = await getBestSellers(profile.agency_id, days, limit)

    return NextResponse.json({
      success: true,
      data: bestSellers,
      count: bestSellers.length,
      period: `Last ${days} days`,
    })
  } catch (error) {
    console.error('Error fetching best sellers:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
