import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'

/**
 * Tracking Links API for a specific creator
 * - GET: Fetch tracking links with stats
 * - POST: Create a new tracking link
 * - DELETE: Delete a tracking link
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const cursor = searchParams.get('cursor') || undefined

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    
    const { data: model } = await adminClient
      .from('models')
      .select('fanvue_access_token')
      .eq('id', id)
      .single()

    if (!model?.fanvue_access_token) {
      return NextResponse.json({ error: 'Creator not connected' }, { status: 400 })
    }

    const fanvue = createFanvueClient(model.fanvue_access_token)
    const links = await fanvue.getTrackingLinks({ limit, cursor })

    return NextResponse.json(links)

  } catch (error: any) {
    console.error('[Tracking Links API] GET Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { name } = body

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    
    const { data: model } = await adminClient
      .from('models')
      .select('fanvue_access_token, tracking_links_count')
      .eq('id', id)
      .single()

    if (!model?.fanvue_access_token) {
      return NextResponse.json({ error: 'Creator not connected' }, { status: 400 })
    }

    const fanvue = createFanvueClient(model.fanvue_access_token)
    const result = await fanvue.createTrackingLink({ name })

    // Update tracking links count
    await adminClient
      .from('models')
      .update({
        tracking_links_count: (model.tracking_links_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      message: 'Tracking link created',
      ...result,
    })

  } catch (error: any) {
    console.error('[Tracking Links API] POST Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const linkUuid = searchParams.get('linkUuid')

  if (!linkUuid) {
    return NextResponse.json({ error: 'linkUuid is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    
    const { data: model } = await adminClient
      .from('models')
      .select('fanvue_access_token, tracking_links_count')
      .eq('id', id)
      .single()

    if (!model?.fanvue_access_token) {
      return NextResponse.json({ error: 'Creator not connected' }, { status: 400 })
    }

    const fanvue = createFanvueClient(model.fanvue_access_token)
    await fanvue.deleteTrackingLink(linkUuid)

    // Update tracking links count
    await adminClient
      .from('models')
      .update({
        tracking_links_count: Math.max((model.tracking_links_count || 0) - 1, 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      message: 'Tracking link deleted',
    })

  } catch (error: any) {
    console.error('[Tracking Links API] DELETE Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
