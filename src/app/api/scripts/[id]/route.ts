import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdateScriptSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  category: z.enum(['opener', 'closer', 'upsell', 'objection', 'ppv', 'custom']).optional(),
  tags: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  is_favorite: z.boolean().optional(),
})

/**
 * GET /api/scripts/[id]
 * Get a single script
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
      .select('agency_id')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    const adminSupabase = await createAdminClient()
    
    const { data: script, error } = await adminSupabase
      .from('chat_scripts')
      .select('*')
      .eq('id', params.id)
      .eq('agency_id', profile.agency_id)
      .single()
    
    if (error || !script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }
    
    return NextResponse.json({ script })
  } catch (error) {
    console.error('GET /api/scripts/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch script' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/scripts/[id]
 * Update a script
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
    
    if (!profile || !['owner', 'admin', 'grandmaster', 'paladin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const validated = UpdateScriptSchema.parse(body)
    
    const adminSupabase = await createAdminClient()
    
    const { data: script, error } = await adminSupabase
      .from('chat_scripts')
      .update({
        ...validated,
        updated_by: user.id,
      })
      .eq('id', params.id)
      .eq('agency_id', profile.agency_id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ script })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('PUT /api/scripts/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update script' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/scripts/[id]/use
 * Increment usage count when a script is used
 */
export async function POST(
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
      .select('agency_id')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    const adminSupabase = await createAdminClient()
    
    // Get current usage count
    const { data: script } = await adminSupabase
      .from('chat_scripts')
      .select('usage_count')
      .eq('id', params.id)
      .eq('agency_id', profile.agency_id)
      .single()
    
    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }
    
    // Increment
    await adminSupabase
      .from('chat_scripts')
      .update({
        usage_count: (script.usage_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', params.id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/scripts/[id]/use error:', error)
    return NextResponse.json(
      { error: 'Failed to track usage' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/scripts/[id]
 * Delete a script
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
    
    // Soft delete by marking inactive
    const { error } = await adminSupabase
      .from('chat_scripts')
      .update({ is_active: false })
      .eq('id', params.id)
      .eq('agency_id', profile.agency_id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/scripts/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete script' },
      { status: 500 }
    )
  }
}
