import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Verify that the request is from an admin/owner user.
 * Used to gate debug endpoints in production.
 *
 * Returns null if authorized, or a NextResponse error if not.
 */
export async function requireAdminAuth(request: NextRequest): Promise<NextResponse | null> {
  // In development, allow all access
  if (process.env.NODE_ENV === 'development') {
    return null
  }

  // Check for cron secret (for automated/cron callers)
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret && secret === process.env.CRON_SECRET) {
    return null
  }

  // Check for authenticated admin user
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized — login required' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin', 'grandmaster'].includes(profile.role || '')) {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 })
  }

  return null // Authorized
}
