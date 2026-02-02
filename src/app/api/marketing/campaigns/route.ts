import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CampaignSchema = z.object({
  model_id: z.string().uuid(),
  segment_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  message_template: z.string().min(1),
  media_id: z.string().uuid().optional(),
  price: z.number().min(0).optional(),
  scheduled_for: z.string().datetime().optional(),
  fan_ids: z.array(z.string()).optional(), // For custom audience
})

/**
 * GET /api/marketing/campaigns
 * List all campaigns for the agency
 */
export async function GET(_request: NextRequest) {
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

    const { data: campaigns, error } = await supabase
      .from('marketing_campaigns')
      .select(
        `
        *,
        model:models(id, name, avatar_url),
        segment:marketing_segments(id, name)
      `
      )
      .eq('agency_id', profile.agency_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Campaigns API] GET error:', error)
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
    }

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error('[Campaigns API] GET error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch campaigns'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/marketing/campaigns
 * Create and optionally launch a new campaign
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
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    // Check permissions
    if (!['owner', 'admin', 'grandmaster', 'paladin'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const validation = CampaignSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()

    // Create campaign
    const { data: campaign, error: campaignError } = await adminClient
      .from('marketing_campaigns')
      .insert({
        agency_id: profile.agency_id,
        created_by: user.id,
        model_id: validation.data.model_id,
        segment_id: validation.data.segment_id,
        name: validation.data.name,
        message_template: validation.data.message_template,
        media_id: validation.data.media_id,
        price: validation.data.price || 0,
        scheduled_for: validation.data.scheduled_for || new Date().toISOString(),
        status: validation.data.scheduled_for ? 'scheduled' : 'draft',
      })
      .select()
      .single()

    if (campaignError) {
      console.error('[Campaigns API] POST error:', campaignError)
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
    }

    // If fan_ids provided, queue messages immediately
    if (validation.data.fan_ids && validation.data.fan_ids.length > 0) {
      const scheduledFor = validation.data.scheduled_for
        ? new Date(validation.data.scheduled_for)
        : new Date()

      const queueItems = validation.data.fan_ids.map(fanId => ({
        agency_id: profile.agency_id,
        campaign_id: campaign.id,
        model_id: validation.data.model_id,
        fan_id: fanId,
        payload: {
          message: validation.data.message_template,
          media_id: validation.data.media_id,
          price: validation.data.price || 0,
        },
        scheduled_for: scheduledFor.toISOString(),
      }))

      const { error: queueError } = await adminClient.from('message_queue').insert(queueItems)

      if (queueError) {
        console.error('[Campaigns API] Queue error:', queueError)
        // Continue anyway, campaign was created
      }

      // Update campaign status to running if scheduled for now
      if (!validation.data.scheduled_for || new Date(validation.data.scheduled_for) <= new Date()) {
        await adminClient
          .from('marketing_campaigns')
          .update({
            status: 'running',
            started_at: new Date().toISOString(),
          })
          .eq('id', campaign.id)
      }
    }

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    console.error('[Campaigns API] POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create campaign'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
