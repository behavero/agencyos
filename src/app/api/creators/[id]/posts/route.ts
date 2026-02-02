import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'

/**
 * Posts API for a specific creator
 * - GET: Fetch posts
 * - POST: Create a new post
 * - DELETE: Delete a post
 */

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const size = parseInt(searchParams.get('size') || '20')
  const type = searchParams.get('type') as 'image' | 'video' | 'audio' | 'text' | undefined

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get creator's tokens
    const { data: model } = await adminClient
      .from('models')
      .select('fanvue_access_token')
      .eq('id', id)
      .single()

    if (!model?.fanvue_access_token) {
      return NextResponse.json({ error: 'Creator not connected' }, { status: 400 })
    }

    const fanvue = createFanvueClient(model.fanvue_access_token)
    const posts = await fanvue.getPosts({ page, size, type })

    return NextResponse.json(posts)
  } catch (error) {
    console.error('[Posts API] GET Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const { content, mediaIds, price, scheduleAt } = body

  if (!content) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get creator's tokens
    const { data: model } = await adminClient
      .from('models')
      .select('fanvue_access_token, name, posts_count')
      .eq('id', id)
      .single()

    if (!model?.fanvue_access_token) {
      return NextResponse.json({ error: 'Creator not connected' }, { status: 400 })
    }

    const fanvue = createFanvueClient(model.fanvue_access_token)

    const result = await fanvue.createPost({
      content,
      mediaIds,
      price,
      scheduleAt,
    })

    // Update post count
    await adminClient
      .from('models')
      .update({
        posts_count: (model.posts_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    console.log(`[Posts API] Created post for ${model.name}`)

    return NextResponse.json({
      success: true,
      message: 'Post created successfully',
      ...result,
    })
  } catch (error) {
    console.error('[Posts API] POST Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const postUuid = searchParams.get('postUuid')

  if (!postUuid) {
    return NextResponse.json({ error: 'postUuid is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get creator's tokens
    const { data: model } = await adminClient
      .from('models')
      .select('fanvue_access_token, name, posts_count')
      .eq('id', id)
      .single()

    if (!model?.fanvue_access_token) {
      return NextResponse.json({ error: 'Creator not connected' }, { status: 400 })
    }

    const fanvue = createFanvueClient(model.fanvue_access_token)

    await fanvue.deletePost(postUuid)

    // Update post count
    await adminClient
      .from('models')
      .update({
        posts_count: Math.max((model.posts_count || 0) - 1, 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    console.log(`[Posts API] Deleted post ${postUuid} for ${model.name}`)

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
    })
  } catch (error) {
    console.error('[Posts API] DELETE Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
