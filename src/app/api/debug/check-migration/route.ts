/**
 * Check if Phase 55 migration was applied
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createAdminClient()

    // Try to query the new columns
    const { data: models, error } = await supabase
      .from('models')
      .select('id, fanvue_refresh_token, fanvue_token_expires_at, last_transaction_sync')
      .limit(1)

    if (error) {
      return NextResponse.json({
        migration_applied: false,
        error: error.message,
        hint: '❌ Migration NOT applied. Columns do not exist.',
        action: 'Apply supabase/migrations/20260203_optimize_sync.sql in Supabase Dashboard',
      })
    }

    // Check if the view exists
    const { data: viewCheck, error: viewError } = await supabase
      .from('models_needing_sync')
      .select('id')
      .limit(1)

    return NextResponse.json({
      migration_applied: true,
      columns_exist: true,
      view_exists: !viewError,
      sample_model: models?.[0] || null,
      status: '✅ Phase 55 migration is applied correctly!',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        migration_applied: false,
        error: error.message,
        hint: '❌ Migration check failed',
      },
      { status: 500 }
    )
  }
}
