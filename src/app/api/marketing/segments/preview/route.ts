import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PreviewSchema = z.object({
  model_id: z.string().uuid(),
  criteria: z.record(z.string(), z.unknown()),
})

/**
 * POST /api/marketing/segments/preview
 * Preview how many fans match segment criteria
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    const body = await request.json()
    const validation = PreviewSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { model_id, criteria } = validation.data

    // Build query based on criteria
    let query = supabase
      .from('fan_insights')
      .select('id', { count: 'exact', head: true })
      .eq('model_id', model_id)

    // Apply filters based on criteria
    if (criteria.status === 'active') {
      query = query.eq('is_subscribed', true)
    } else if (criteria.status === 'expired') {
      query = query.eq('is_subscribed', false)
    }

    if (criteria.total_spend_min) {
      query = query.gte('total_spend', criteria.total_spend_min)
    }

    if (criteria.total_spend_max) {
      query = query.lte('total_spend', criteria.total_spend_max)
    }

    if (criteria.days_since_last_activity_min) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - Number(criteria.days_since_last_activity_min))
      query = query.lte('last_message_at', cutoffDate.toISOString())
    }

    if (criteria.days_since_last_activity_max) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - Number(criteria.days_since_last_activity_max))
      query = query.gte('last_message_at', cutoffDate.toISOString())
    }

    if (criteria.is_vip !== undefined) {
      query = query.eq('is_vip', criteria.is_vip)
    }

    if (criteria.tags && Array.isArray(criteria.tags) && criteria.tags.length > 0) {
      query = query.contains('tags', criteria.tags)
    }

    const { count, error } = await query

    if (error) {
      console.error('[Segment Preview API] Error:', error)
      return NextResponse.json({ error: 'Failed to preview segment' }, { status: 500 })
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error('[Segment Preview API] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to preview segment'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
