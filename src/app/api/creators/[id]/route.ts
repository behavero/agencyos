import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * DELETE /api/creators/[id]
 * Delete a creator from the agency
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Use admin client to delete
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('models')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Delete Creator] Error:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Delete Creator] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete creator' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/creators/[id]
 * Get creator details with Fanvue stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { data: model, error } = await supabase
      .from('models')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    // TODO: Fetch real stats from Fanvue API using model.fanvue_api_key
    // For now, return mock stats
    const stats = {
      followers: 0,
      subscribers: 0,
      views: 0,
      revenue: 0,
      mediaCount: 0,
    }

    return NextResponse.json({
      ...model,
      stats,
    })
  } catch (error: any) {
    console.error('[Get Creator] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get creator' },
      { status: 500 }
    )
  }
}
