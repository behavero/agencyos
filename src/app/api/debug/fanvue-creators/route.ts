import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireAdminAuth } from '@/lib/utils/debug-auth'

/**
 * Debug endpoint: Test the GET /creators Fanvue API call directly
 * Shows raw response from Fanvue to diagnose import issues
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) {
    return NextResponse.json({ error: 'No agency' }, { status: 400 })
  }

  // Get agency connection
  const adminClient = createAdminClient()
  const { data: connection, error: connError } = await adminClient
    .from('agency_fanvue_connections')
    .select('*')
    .eq('agency_id', profile.agency_id)
    .single()

  if (connError || !connection) {
    return NextResponse.json(
      {
        error: 'No agency Fanvue connection found',
        connError: connError?.message,
        agencyId: profile.agency_id,
      },
      { status: 404 }
    )
  }

  // Test the Fanvue API directly
  const accessToken = connection.fanvue_access_token

  const creatorsRes = await fetch('https://api.fanvue.com/creators?page=1&size=50', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Fanvue-API-Version': '2025-06-26',
    },
  })

  const rawBody = await creatorsRes.text()

  // Also test /users/me to check the token
  const meRes = await fetch('https://api.fanvue.com/users/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Fanvue-API-Version': '2025-06-26',
    },
  })

  const meBody = await meRes.text()

  return NextResponse.json({
    agencyId: profile.agency_id,
    connectionStatus: connection.status,
    tokenExpiry: connection.fanvue_token_expires_at,
    fanvueUserId: connection.fanvue_user_id,
    creatorsApi: {
      status: creatorsRes.status,
      statusText: creatorsRes.statusText,
      body: safeJsonParse(rawBody),
      rawBody: rawBody.substring(0, 1000),
    },
    usersMe: {
      status: meRes.status,
      body: safeJsonParse(meBody),
    },
  })
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
