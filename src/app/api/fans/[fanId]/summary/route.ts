import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { groq } from '@/lib/ai/provider'

/**
 * POST /api/fans/[fanId]/summary
 * Generate AI summary of fan from recent messages
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fanId: string }> }
) {
  try {
    const { fanId } = await params
    const body = await request.json()
    const { model_id, messages } = body

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

    // Build context for AI
    const messageContext =
      messages?.length > 0
        ? messages
            .slice(-50)
            .map(
              (m: { role: string; content: string }) =>
                `${m.role === 'fan' ? 'Fan' : 'Model'}: ${m.content}`
            )
            .join('\n')
        : 'No recent messages available.'

    const existingData = fan
      ? `
Current CRM Data:
- Total Spent: $${fan.total_spend || 0}
- Custom Attributes: ${JSON.stringify(fan.custom_attributes || {})}
- Tags: ${(fan.tags || []).join(', ') || 'None'}
- Notes: ${fan.notes || 'None'}
`
      : 'New fan - no existing data.'

    // Generate summary
    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: `You are an analyst for a creator management agency. Generate a brief, actionable summary of a fan based on their chat history and CRM data.

RULES:
- Be concise (max 3-4 sentences)
- Focus on revenue potential and engagement patterns
- Note any personal details mentioned (job, location, interests)
- Identify personality type (generous, needy, time-waster, etc.)
- Suggest engagement strategy

OUTPUT FORMAT:
Brief summary paragraph, then:
💰 Revenue potential: Low/Medium/High
🎯 Strategy: One sentence recommendation`,
      prompt: `${existingData}

Recent Chat Messages:
${messageContext}

Generate a fan intelligence summary:`,
      temperature: 0.7,
    })

    const summary = result.text

    // Save summary to database
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (profile?.agency_id) {
      await adminClient.from('fan_insights').upsert(
        {
          agency_id: profile.agency_id,
          model_id,
          fan_id: fanId,
          ai_summary: summary,
          ai_summary_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'model_id,fan_id' }
      )
    }

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('[Fan Summary API] Error:', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
