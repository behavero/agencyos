/**
 * DEBUG: Check if we have valid model tokens in the database
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createAdminClient()

    // Get all models with their token status
    const { data: models, error } = await supabase
      .from('models')
      .select('id, name, fanvue_username, fanvue_access_token, fanvue_user_uuid, stats_updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch models',
        details: error.message,
      })
    }

    const modelStatus = models?.map(model => ({
      id: model.id,
      name: model.name,
      fanvue_username: model.fanvue_username,
      fanvue_user_uuid: model.fanvue_user_uuid,
      has_access_token: !!model.fanvue_access_token,
      token_preview: model.fanvue_access_token
        ? `${model.fanvue_access_token.substring(0, 10)}...`
        : null,
      token_length: model.fanvue_access_token?.length || 0,
      last_sync: model.stats_updated_at,
    }))

    return NextResponse.json({
      total_models: models?.length || 0,
      models_with_tokens: modelStatus?.filter(m => m.has_access_token).length || 0,
      models: modelStatus,
      diagnosis: {
        has_models: (models?.length || 0) > 0,
        has_tokens: modelStatus?.some(m => m.has_access_token) || false,
        recommendation:
          modelStatus && modelStatus.length > 0 && modelStatus.some(m => m.has_access_token)
            ? '✅ Found models with tokens. Try syncing with existing tokens (no OAuth needed).'
            : '❌ No models with tokens found. You need to connect a Fanvue account first.',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}
