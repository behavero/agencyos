import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { refreshWatchedAccount, deleteWatchedAccount } from '@/lib/services/ghost-tracker'

/**
 * GET /api/ghost/accounts/[id]
 * Get a specific watched account
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = await createAdminClient()
    const { data: account, error } = await adminClient
      .from('watched_accounts')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    return NextResponse.json({ account })
  } catch (error) {
    console.error('[Ghost API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ghost/accounts/[id]
 * Refresh stats for a watched account
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Refresh the account
    const stats = await refreshWatchedAccount(id)

    if (!stats) {
      return NextResponse.json(
        { error: 'Failed to refresh stats' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('[Ghost API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh account' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/ghost/accounts/[id]
 * Update a watched account
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notes, tags, account_type, is_active, model_id } = body

    const adminClient = await createAdminClient()
    const { data: account, error } = await adminClient
      .from('watched_accounts')
      .update({
        ...(notes !== undefined && { notes }),
        ...(tags !== undefined && { tags }),
        ...(account_type !== undefined && { account_type }),
        ...(is_active !== undefined && { is_active }),
        ...(model_id !== undefined && { model_id }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ success: true, account })
  } catch (error) {
    console.error('[Ghost API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ghost/accounts/[id]
 * Delete a watched account
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const success = await deleteWatchedAccount(id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Ghost API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
