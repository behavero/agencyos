/**
 * API: Get Instagram Insights
 * 
 * Returns Instagram reach, impressions, and profile stats for a model.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInstagramInsights } from '@/lib/services/instagram-insights'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get model ID from query params
    const modelId = request.nextUrl.searchParams.get('modelId')
    if (!modelId) {
      return NextResponse.json({ error: 'Model ID required' }, { status: 400 })
    }

    // Verify user has access to this model
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    // Verify model belongs to user's agency
    const { data: model } = await supabase
      .from('models')
      .select('id, agency_id')
      .eq('id', modelId)
      .eq('agency_id', profile.agency_id)
      .single()

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    // Fetch Instagram insights
    const insights = await getInstagramInsights(modelId)

    if (!insights) {
      return NextResponse.json({
        success: true,
        connected: false,
        message: 'Instagram not connected for this model',
      })
    }

    return NextResponse.json({
      success: true,
      connected: true,
      data: insights,
    })
  } catch (error) {
    console.error('[api/analytics/instagram] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
