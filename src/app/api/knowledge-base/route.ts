import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const KnowledgeBaseSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string(),
  category: z.enum(['sop', 'training', 'sales', 'technical', 'general']).default('general'),
  tags: z.array(z.string()).optional(),
  visible_to: z.array(z.string()).optional(),
})

/**
 * GET /api/knowledge-base
 * List all accessible knowledge base articles
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
      .select('agency_id, role')
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
      .from('knowledge_base')
      .select('*')
      .eq('agency_id', profile.agency_id)
      .contains('visible_to', [profile.role])
      .order('updated_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
    }

    const { data: articles, error } = await query

    if (error) throw error

    return NextResponse.json({ articles })
  } catch (error) {
    console.error('GET /api/knowledge-base error:', error)
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }
}

/**
 * POST /api/knowledge-base
 * Create a new article
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

    if (!profile || !['owner', 'admin', 'grandmaster'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validated = KnowledgeBaseSchema.parse(body)

    // Generate slug from title
    const slug = validated.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    const adminSupabase = await createAdminClient()

    const { data: article, error } = await adminSupabase
      .from('knowledge_base')
      .insert({
        agency_id: profile.agency_id,
        title: validated.title,
        slug,
        content: validated.content,
        excerpt: validated.content.substring(0, 150),
        category: validated.category,
        tags: validated.tags || [],
        visible_to: validated.visible_to || ['owner', 'admin', 'chatter', 'smm'],
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ article })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    console.error('POST /api/knowledge-base error:', error)
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 })
  }
}
