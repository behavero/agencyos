/**
 * API: Get Tracking Links Analytics
 *
 * Returns tracking link data with calculated metrics for dashboard display.
 * Supports sorting by clicks, subs, revenue, or ROI.
 *
 * Queries directly using the admin client (bypasses RLS) for reliability.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

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

    // Get user's profile and agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    const agencyId = profile.agency_id

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const rawModelId = searchParams.get('modelId')
    const modelId = rawModelId && rawModelId !== 'all' ? rawModelId : undefined
    const sortBy =
      (searchParams.get('sortBy') as 'clicks' | 'subs_count' | 'total_revenue' | 'roi') ||
      'total_revenue'
    const limit = parseInt(searchParams.get('limit') || '10')

    // Query directly with admin client for reliability
    const adminClient = createAdminClient()

    // --- Top Links Query ---
    const orderCol = sortBy === 'roi' ? 'total_revenue' : sortBy
    let linksQuery = adminClient
      .from('tracking_links')
      .select('*')
      .eq('agency_id', agencyId)
      .gt('clicks', 0)
      .order(orderCol, { ascending: false })
      .limit(limit)

    if (modelId) {
      linksQuery = linksQuery.eq('model_id', modelId)
    }

    const { data: links, error: linksError } = await linksQuery

    if (linksError) {
      console.error('[tracking-links API] Query error:', linksError.message, linksError.details)
      return NextResponse.json(
        {
          success: false,
          error: `Database query failed: ${linksError.message}`,
        },
        { status: 500 }
      )
    }

    // Get model names for all model_ids in one query
    const modelIds = [...new Set((links || []).map(l => l.model_id))]
    let modelNameMap: Record<string, string> = {}
    if (modelIds.length > 0) {
      const { data: models } = await adminClient
        .from('models')
        .select('id, name')
        .in('id', modelIds)

      if (models) {
        modelNameMap = Object.fromEntries(models.map(m => [m.id, m.name || 'Unknown']))
      }
    }

    // Enrich links with calculated metrics
    const topLinks = (links || []).map(link => ({
      id: link.id,
      name: link.name,
      platform: link.external_social_platform,
      clicks: link.clicks,
      followsCount: link.follows_count,
      subsCount: link.subs_count,
      subsRevenue: Number(link.subs_revenue),
      userSpend: Number(link.user_spend),
      totalRevenue: Number(link.total_revenue),
      conversionRate: link.clicks > 0 ? (link.subs_count / link.clicks) * 100 : 0,
      roi: link.clicks > 0 ? Number(link.total_revenue) / link.clicks : 0,
      createdAt: link.link_created_at,
      modelName: modelNameMap[link.model_id] || undefined,
    }))

    // Sort by ROI if requested (needs in-memory sort since ROI is calculated)
    if (sortBy === 'roi') {
      topLinks.sort((a, b) => b.roi - a.roi)
    }

    // --- Click-to-Sub Stats ---
    let statsQuery = adminClient
      .from('tracking_links')
      .select('clicks, subs_count')
      .eq('agency_id', agencyId)

    if (modelId) {
      statsQuery = statsQuery.eq('model_id', modelId)
    }

    const { data: statsLinks } = await statsQuery

    const totalClicks = (statsLinks || []).reduce((sum, l) => sum + l.clicks, 0)
    const totalSubs = (statsLinks || []).reduce((sum, l) => sum + l.subs_count, 0)
    const clickToSubRate = totalClicks > 0 ? (totalSubs / totalClicks) * 100 : 0

    console.log(
      `[tracking-links API] agencyId=${agencyId}, modelId=${modelId || 'all'}, found=${topLinks.length}, totalClicks=${totalClicks}`
    )

    return NextResponse.json({
      success: true,
      data: {
        topLinks,
        stats: {
          totalClicks,
          totalSubs,
          clickToSubRate: Math.round(clickToSubRate * 100) / 100,
        },
      },
    })
  } catch (error) {
    console.error('[tracking-links API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
