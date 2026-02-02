import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema for updating fan insights
const FanUpdateSchema = z.object({
  custom_attributes: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  is_blocked: z.boolean().optional(),
  is_vip: z.boolean().optional(),
})

/**
 * GET /api/fans/[fanId]
 * Get fan insights for a specific fan
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fanId: string }> }
) {
  try {
    const { fanId } = await params
    const modelId = request.nextUrl.searchParams.get('model_id')

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = await createAdminClient()

    let query = adminClient
      .from('fan_insights')
      .select('*, model:models(id, name)')
      .eq('fan_id', fanId)

    if (modelId) {
      query = query.eq('model_id', modelId)
    }

    const { data: fan, error } = await query.single()

    if (error || !fan) {
      // Return empty fan object for new fans
      return NextResponse.json({
        fan: null,
        isNew: true,
        fanId,
      })
    }

    // Calculate whale score
    const whaleScore = calculateWhaleScore(fan)

    return NextResponse.json({
      fan: {
        ...fan,
        whaleScore,
        ppvUnlockRate: fan.ppv_sent > 0 ? Math.round((fan.ppv_unlocked / fan.ppv_sent) * 100) : 0,
      },
      isNew: false,
    })
  } catch (error) {
    console.error('[Fan API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch fan' }, { status: 500 })
  }
}

/**
 * PATCH /api/fans/[fanId]
 * Update fan insights
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fanId: string }> }
) {
  try {
    const { fanId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = FanUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { model_id } = body // Required for updates
    if (!model_id) {
      return NextResponse.json({ error: 'model_id required' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    const adminClient = await createAdminClient()

    // Upsert fan insights
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    }

    if (validation.data.custom_attributes !== undefined) {
      // Merge with existing attributes
      const { data: existing } = await adminClient
        .from('fan_insights')
        .select('custom_attributes')
        .eq('fan_id', fanId)
        .eq('model_id', model_id)
        .single()

      updateData.custom_attributes = {
        ...(existing?.custom_attributes || {}),
        ...validation.data.custom_attributes,
      }
    }

    if (validation.data.notes !== undefined) {
      updateData.notes = validation.data.notes
    }

    if (validation.data.tags !== undefined) {
      updateData.tags = validation.data.tags
    }

    if (validation.data.is_blocked !== undefined) {
      updateData.is_blocked = validation.data.is_blocked
    }

    if (validation.data.is_vip !== undefined) {
      updateData.is_vip = validation.data.is_vip
    }

    const { data: fan, error } = await adminClient
      .from('fan_insights')
      .upsert(
        {
          agency_id: profile.agency_id,
          model_id,
          fan_id: fanId,
          ...updateData,
        },
        { onConflict: 'model_id,fan_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('[Fan API] Update error:', error)
      return NextResponse.json({ error: 'Failed to update fan' }, { status: 500 })
    }

    return NextResponse.json({ fan })
  } catch (error) {
    console.error('[Fan API] Error:', error)
    return NextResponse.json({ error: 'Failed to update fan' }, { status: 500 })
  }
}

/**
 * Calculate whale score (0-100)
 */
function calculateWhaleScore(fan: {
  total_spend: number
  tip_count: number
  ppv_unlocked: number
  ppv_sent: number
  message_count: number
}): number {
  let score = 0

  // Spend tiers
  if (fan.total_spend >= 1000) score += 40
  else if (fan.total_spend >= 500) score += 30
  else if (fan.total_spend >= 100) score += 20
  else if (fan.total_spend >= 50) score += 10

  // PPV unlock rate
  const unlockRate = fan.ppv_sent > 0 ? fan.ppv_unlocked / fan.ppv_sent : 0
  if (unlockRate >= 0.8) score += 30
  else if (unlockRate >= 0.5) score += 20
  else if (unlockRate >= 0.3) score += 10

  // Engagement (tip frequency)
  if (fan.tip_count >= 10) score += 20
  else if (fan.tip_count >= 5) score += 15
  else if (fan.tip_count >= 1) score += 10

  // Activity
  if (fan.message_count >= 100) score += 10
  else if (fan.message_count >= 50) score += 5

  return Math.min(100, score)
}
