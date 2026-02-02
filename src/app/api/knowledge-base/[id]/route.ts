import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdateArticleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  category: z.enum(['sop', 'training', 'sales', 'technical', 'general']).optional(),
  tags: z.array(z.string()).optional(),
  visible_to: z.array(z.string()).optional(),
})

/**
 * GET /api/knowledge-base/[id]
 * Get a single article
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
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
    
    const adminSupabase = await createAdminClient()
    
    const { data: article, error } = await adminSupabase
      .from('knowledge_base')
      .select('*')
      .eq('id', params.id)
      .eq('agency_id', profile.agency_id)
      .contains('visible_to', [profile.role])
      .single()
    
    if (error || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }
    
    // Increment view count
    await adminSupabase
      .from('knowledge_base')
      .update({ view_count: (article.view_count || 0) + 1 })
      .eq('id', params.id)
    
    return NextResponse.json({ article })
  } catch (error) {
    console.error('GET /api/knowledge-base/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/knowledge-base/[id]
 * Update an article
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
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
    const validated = UpdateArticleSchema.parse(body)
    
    const adminSupabase = await createAdminClient()
    
    const updateData: any = {
      ...validated,
      updated_by: user.id,
    }
    
    if (validated.title) {
      updateData.slug = validated.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
    }
    
    if (validated.content) {
      updateData.excerpt = validated.content.substring(0, 150)
    }
    
    const { data: article, error } = await adminSupabase
      .from('knowledge_base')
      .update(updateData)
      .eq('id', params.id)
      .eq('agency_id', profile.agency_id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ article })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('PUT /api/knowledge-base/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update article' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/knowledge-base/[id]
 * Delete an article
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single()
    
    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const adminSupabase = await createAdminClient()
    
    const { error } = await adminSupabase
      .from('knowledge_base')
      .delete()
      .eq('id', params.id)
      .eq('agency_id', profile.agency_id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/knowledge-base/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    )
  }
}
