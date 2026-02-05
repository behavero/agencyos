/**
 * API: Health Check for Messages
 * Diagnostic endpoint to test chat system
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminAuth } from '@/lib/utils/debug-auth'

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Test database connection
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json(
        {
          healthy: false,
          error: 'Database connection failed',
          details: profileError.message,
        },
        { status: 500 }
      )
    }

    // Test models query
    const { data: models, error: modelsError } = await supabase
      .from('models')
      .select('id, name')
      .eq('agency_id', profile.agency_id)
      .limit(1)

    if (modelsError) {
      return NextResponse.json(
        {
          healthy: false,
          error: 'Models query failed',
          details: modelsError.message,
        },
        { status: 500 }
      )
    }

    // Test Fanvue connectivity (optional)
    const hasModels = models && models.length > 0

    return NextResponse.json({
      healthy: true,
      user: user.id,
      agencyId: profile.agency_id,
      hasModels,
      modelCount: models?.length || 0,
      message: 'Messages system is healthy',
    })
  } catch (error: any) {
    console.error('[Messages Health] Error:', error)
    return NextResponse.json(
      {
        healthy: false,
        error: 'Unexpected error',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
