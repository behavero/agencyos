import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserQuests } from '@/lib/services/quest-engine'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const quests = await getUserQuests(user.id)

    return NextResponse.json(quests)
  } catch (error) {
    console.error('[Gamification Quests] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 })
  }
}
