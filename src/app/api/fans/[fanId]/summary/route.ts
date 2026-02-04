import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/fans/[fanId]/summary
 * Generate AI summary of fan from recent messages
 *
 * Phase 70-Rollback: AI integration disabled, awaiting OpenClaw connection
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fanId: string }> }
) {
  try {
    const { fanId } = await params
    const body = await request.json()
    const { model_id } = body

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!model_id) {
      return NextResponse.json({ error: 'model_id required' }, { status: 400 })
    }

    const adminClient = await createAdminClient()

    // Get existing fan data
    const { data: fan } = await adminClient
      .from('fan_insights')
      .select('*')
      .eq('fan_id', fanId)
      .eq('model_id', model_id)
      .single()

    // Return existing summary if available, otherwise placeholder
    const summary =
      fan?.ai_summary ||
      `🔧 **AI Summary Temporarily Unavailable**

The AI brain is being upgraded to OpenClaw. 

Existing CRM data:
- Total Spent: $${fan?.total_spend || 0}
- Tags: ${(fan?.tags || []).join(', ') || 'None'}

Full AI summaries will return shortly.`

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('[Fan Summary API] Error:', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
