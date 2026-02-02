import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  addWatchedAccount,
  getWatchedAccounts,
  getWatchedAccountsByType,
} from '@/lib/services/ghost-tracker'
import { z } from 'zod'

// Validation schema
const AddAccountSchema = z.object({
  username: z.string().min(1).max(100),
  platform: z.enum(['instagram', 'tiktok', 'x', 'youtube', 'facebook']),
  accountType: z.enum(['competitor', 'slave', 'reference', 'backup']),
  modelId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
})

/**
 * GET /api/ghost/accounts
 * Get all watched accounts for the user's agency
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

    // Get user's agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    // Check for type filter
    const accountType = request.nextUrl.searchParams.get('type') as
      | 'competitor'
      | 'slave'
      | 'reference'
      | 'backup'
      | null

    let accounts
    if (accountType) {
      accounts = await getWatchedAccountsByType(profile.agency_id, accountType)
    } else {
      accounts = await getWatchedAccounts(profile.agency_id)
    }

    // Group by type for summary
    const summary = {
      competitors: accounts.filter(a => a.account_type === 'competitor').length,
      slaves: accounts.filter(a => a.account_type === 'slave').length,
      references: accounts.filter(a => a.account_type === 'reference').length,
      backups: accounts.filter(a => a.account_type === 'backup').length,
      total: accounts.length,
    }

    return NextResponse.json({
      accounts,
      summary,
    })
  } catch (error) {
    console.error('[Ghost API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

/**
 * POST /api/ghost/accounts
 * Add a new account to watch
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

    // Get user's agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    // Parse and validate body
    const body = await request.json()
    const validation = AddAccountSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { username, platform, accountType, modelId, notes, tags } = validation.data

    // Add the account
    const account = await addWatchedAccount({
      agencyId: profile.agency_id,
      username,
      platform,
      accountType,
      modelId,
      notes,
      tags,
      userId: user.id,
    })

    if (!account) {
      return NextResponse.json({ error: 'Account already exists or scan failed' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      account,
    })
  } catch (error) {
    console.error('[Ghost API] Error:', error)
    return NextResponse.json({ error: 'Failed to add account' }, { status: 500 })
  }
}
