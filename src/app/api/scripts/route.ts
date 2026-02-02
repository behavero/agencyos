import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateScriptSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  category: z.enum(['opener', 'closer', 'upsell', 'objection', 'ppv', 'custom']).default('custom'),
  tags: z.array(z.string()).optional(),
})

/**
 * GET /api/scripts
 * List all scripts for the agency
 */
export async function GET(request: NextRequest) {
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

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    const adminSupabase = await createAdminClient()

    let query = adminSupabase
      .from('chat_scripts')
      .select('*')
      .eq('agency_id', profile.agency_id)
      .eq('is_active', true)
      .order('usage_count', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
    }

    const { data: scripts, error } = await query

    if (error) throw error

    // Group by category
    const grouped = scripts?.reduce(
      (acc, script) => {
        const cat = script.category
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(script)
        return acc
      },
      {} as Record<string, typeof scripts>
    )

    return NextResponse.json({ scripts, grouped })
  } catch (error) {
    console.error('GET /api/scripts error:', error)
    return NextResponse.json({ error: 'Failed to fetch scripts' }, { status: 500 })
  }
}

/**
 * POST /api/scripts
 * Create a new script
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

    if (!profile || !['owner', 'admin', 'grandmaster', 'paladin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validated = CreateScriptSchema.parse(body)

    const adminSupabase = await createAdminClient()

    const { data: script, error } = await adminSupabase
      .from('chat_scripts')
      .insert({
        agency_id: profile.agency_id,
        title: validated.title,
        content: validated.content,
        category: validated.category,
        tags: validated.tags || [],
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ script })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    console.error('POST /api/scripts error:', error)
    return NextResponse.json({ error: 'Failed to create script' }, { status: 500 })
  }
}
