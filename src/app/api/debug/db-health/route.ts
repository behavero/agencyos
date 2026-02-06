/**
 * DEBUG: Database health check
 * Quick snapshot of models, connections, and transactions status.
 * No auth required (debug-only, remove in production).
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createAdminClient()

    // 1. Check models table
    const { data: models, error: modelsError } = await supabase
      .from('models')
      .select(
        'id, name, fanvue_user_uuid, agency_id, revenue_total, subscribers_count, followers_count, posts_count, likes_count, stats_updated_at, unread_messages, status'
      )
      .order('name')

    // 2. Check agency_fanvue_connections
    const { data: connections, error: connError } = await supabase
      .from('agency_fanvue_connections')
      .select(
        'agency_id, status, fanvue_user_id, connected_at, last_synced_at, last_sync_error, updated_at'
      )

    // 3. Check fanvue_transactions count
    const { count: txCount, error: txError } = await supabase
      .from('fanvue_transactions')
      .select('*', { count: 'exact', head: true })

    // 4. Check agencies
    const { data: agencies, error: agError } = await supabase.from('agencies').select('id, name')

    // 5. Check profiles
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('id, display_name, role, agency_id')

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      models: {
        count: models?.length || 0,
        error: modelsError?.message,
        data: models?.map(m => ({
          id: m.id,
          name: m.name,
          fanvue_uuid: m.fanvue_user_uuid,
          agency_id: m.agency_id,
          revenue_total: m.revenue_total,
          subscribers: m.subscribers_count,
          followers: m.followers_count,
          posts: m.posts_count,
          likes: m.likes_count,
          unread_messages: m.unread_messages,
          stats_updated: m.stats_updated_at,
          status: m.status,
        })),
      },
      connections: {
        count: connections?.length || 0,
        error: connError?.message,
        data: connections?.map(c => ({
          agency_id: c.agency_id,
          status: c.status,
          fanvue_user_id: c.fanvue_user_id,
          connected_at: c.connected_at,
          last_synced_at: c.last_synced_at,
          last_sync_error: c.last_sync_error,
          updated_at: c.updated_at,
        })),
      },
      transactions: {
        count: txCount,
        error: txError?.message,
      },
      agencies: {
        count: agencies?.length || 0,
        error: agError?.message,
        data: agencies,
      },
      profiles: {
        count: profiles?.length || 0,
        error: profError?.message,
        data: profiles?.map(p => ({
          id: p.id.substring(0, 8) + '...',
          name: p.display_name,
          role: p.role,
          agency_id: p.agency_id,
        })),
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 5),
      },
      { status: 500 }
    )
  }
}
