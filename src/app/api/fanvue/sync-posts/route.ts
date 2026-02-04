import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { FanvueClient } from '@/lib/fanvue/client'

/**
 * POST /api/fanvue/sync-posts
 * Syncs posts/content from Fanvue for a specific model
 *
 * Body: { modelId: string }
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

    const body = await request.json()
    const { modelId } = body

    if (!modelId) {
      return NextResponse.json({ error: 'modelId required' }, { status: 400 })
    }

    // Get model with Fanvue token
    const adminClient = createAdminClient()
    const { data: model, error: modelError } = await adminClient
      .from('models')
      .select('id, agency_id, fanvue_access_token, name')
      .eq('id', modelId)
      .single()

    if (modelError || !model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    if (!model.fanvue_access_token) {
      return NextResponse.json(
        {
          error: 'Model not connected to Fanvue',
          needsConnection: true,
        },
        { status: 400 }
      )
    }

    // Initialize Fanvue client
    const fanvue = new FanvueClient(model.fanvue_access_token)

    let synced = 0
    let page = 1
    const pageSize = 50
    let hasMore = true
    const errors: string[] = []

    // Fetch all posts with pagination
    while (hasMore) {
      try {
        const postsResponse = await fanvue.getPosts({ page, size: pageSize })

        if (!postsResponse.data || postsResponse.data.length === 0) {
          hasMore = false
          break
        }

        // Upsert each post
        for (const post of postsResponse.data) {
          try {
            // Calculate engagement score (likes + comments*2 + tips*5)
            const engagementScore =
              (post.likesCount || 0) + (post.commentsCount || 0) * 2 + (post.tipsCount || 0) * 5

            await adminClient.from('fanvue_posts').upsert(
              {
                agency_id: model.agency_id,
                model_id: modelId,
                fanvue_uuid: post.uuid,
                content: post.content?.substring(0, 1000), // Truncate long content
                created_at_fanvue: post.createdAt,
                likes_count: post.likesCount || 0,
                comments_count: post.commentsCount || 0,
                tips_count: post.tipsCount || 0,
                media_count: post.mediaCount || 0,
                is_pay_to_view: post.isPayToView || false,
                price_cents: post.price ? Math.round(post.price * 100) : 0,
                engagement_score: engagementScore,
                last_synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: 'model_id,fanvue_uuid',
              }
            )

            synced++
          } catch (postError) {
            console.error(`[Sync Posts] Error saving post ${post.uuid}:`, postError)
            errors.push(
              `Post ${post.uuid}: ${postError instanceof Error ? postError.message : 'Unknown error'}`
            )
          }
        }

        // Check if there are more pages
        hasMore = postsResponse.data.length === pageSize
        page++

        // Rate limit: small delay between pages
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (pageError) {
        console.error(`[Sync Posts] Error fetching page ${page}:`, pageError)
        errors.push(
          `Page ${page}: ${pageError instanceof Error ? pageError.message : 'Unknown error'}`
        )
        hasMore = false
      }
    }

    // Also calculate revenue from transactions for PPV posts
    await calculatePostRevenue(adminClient, modelId)

    return NextResponse.json({
      success: true,
      synced,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('[Sync Posts] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}

/**
 * Calculate revenue for PPV posts from transactions
 */
async function calculatePostRevenue(
  adminClient: ReturnType<typeof createAdminClient>,
  modelId: string
) {
  try {
    // Get PPV/post transaction totals
    const { data: transactions } = await adminClient
      .from('fanvue_transactions')
      .select('amount, transaction_type')
      .eq('model_id', modelId)
      .in('transaction_type', ['ppv', 'post'])

    if (transactions && transactions.length > 0) {
      // Calculate total PPV revenue
      const totalPpvRevenue = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

      const unlockCount = transactions.length

      // Update PPV posts with average revenue distribution
      // In a more sophisticated system, we'd link transactions to specific posts
      const { data: ppvPosts } = await adminClient
        .from('fanvue_posts')
        .select('id')
        .eq('model_id', modelId)
        .eq('is_pay_to_view', true)

      if (ppvPosts && ppvPosts.length > 0) {
        const revenuePerPost = Math.round((totalPpvRevenue * 100) / ppvPosts.length)
        const unlocksPerPost = Math.round(unlockCount / ppvPosts.length)

        for (const post of ppvPosts) {
          await adminClient
            .from('fanvue_posts')
            .update({
              revenue_cents: revenuePerPost,
              unlocks_count: unlocksPerPost,
              updated_at: new Date().toISOString(),
            })
            .eq('id', post.id)
        }
      }
    }
  } catch (error) {
    console.error('[Calculate Post Revenue] Error:', error)
  }
}

/**
 * GET /api/fanvue/sync-posts?modelId=xxx
 * Get synced posts for a model
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

    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('modelId')
    const sortBy = searchParams.get('sortBy') || 'revenue'
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get user's agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    const adminClient = createAdminClient()

    let query = adminClient.from('fanvue_posts').select('*').eq('agency_id', profile.agency_id)

    if (modelId) {
      query = query.eq('model_id', modelId)
    }

    // Apply sorting
    switch (sortBy) {
      case 'revenue':
        query = query.order('revenue_cents', { ascending: false })
        break
      case 'engagement':
        query = query.order('engagement_score', { ascending: false })
        break
      case 'likes':
        query = query.order('likes_count', { ascending: false })
        break
      case 'recent':
        query = query.order('created_at_fanvue', { ascending: false })
        break
      default:
        query = query.order('revenue_cents', { ascending: false })
    }

    const { data: posts, error } = await query.limit(limit)

    if (error) {
      throw error
    }

    // Get summary stats
    const { data: summary } = await adminClient
      .from('fanvue_posts')
      .select('revenue_cents, is_pay_to_view, unlocks_count, engagement_score')
      .eq('agency_id', profile.agency_id)
      .eq(modelId ? 'model_id' : 'agency_id', modelId || profile.agency_id)

    const stats = {
      totalPosts: summary?.length || 0,
      ppvPosts: summary?.filter(p => p.is_pay_to_view).length || 0,
      totalRevenue: summary?.reduce((sum, p) => sum + (p.revenue_cents || 0), 0) || 0,
      totalUnlocks: summary?.reduce((sum, p) => sum + (p.unlocks_count || 0), 0) || 0,
      avgEngagement: summary?.length
        ? Math.round(
            summary.reduce((sum, p) => sum + (p.engagement_score || 0), 0) / summary.length
          )
        : 0,
    }

    return NextResponse.json({ posts, stats })
  } catch (error) {
    console.error('[Get Posts] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get posts' },
      { status: 500 }
    )
  }
}
