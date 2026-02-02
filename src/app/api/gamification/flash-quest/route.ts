import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createFlashQuest } from '@/lib/services/quest-engine'
import { z } from 'zod'

const CreateFlashQuestSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['revenue', 'messages', 'unlocks']),
  targetValue: z.number().min(1),
  rewardAmount: z.number().min(0),
  durationMinutes: z.number().min(5).max(1440), // 5 mins to 24 hours
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = await createAdminClient()

    // Check if user is admin/owner
    const { data: profile } = await adminClient
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!['owner', 'admin', 'grandmaster'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Only admins can create flash quests' }, { status: 403 })
    }

    const body = await request.json()
    const validation = CreateFlashQuestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    const result = await createFlashQuest({
      agencyId: profile.agency_id!,
      title: validation.data.title,
      description: validation.data.description || '',
      type: validation.data.type,
      targetValue: validation.data.targetValue,
      rewardAmount: validation.data.rewardAmount,
      durationMinutes: validation.data.durationMinutes,
      createdBy: user.id,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      quest: result.quest,
      message: `Flash quest "${validation.data.title}" created!`,
    })
  } catch (error) {
    console.error('[Flash Quest] Error:', error)
    return NextResponse.json({ error: 'Failed to create flash quest' }, { status: 500 })
  }
}
