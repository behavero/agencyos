import { NextResponse } from 'next/server'
import { generatePkce, getAuthorizeUrl } from '@/lib/fanvue/oauth'
import { createClient } from '@/lib/supabase/server'

/**
 * Agency OAuth Login Route
 *
 * Initiates Fanvue OAuth flow for AGENCY-LEVEL connection.
 * Agency admins connect their Fanvue account to manage all creators.
 *
 * Required scope: read:creator (for GET /creators agency endpoint)
 */

const AGENCY_SCOPES = 'read:creator'

export async function GET(request: Request) {
  const url = new URL(request.url)

  console.log('[Agency OAuth Login] Starting agency OAuth flow')

  // Validate env vars first
  const clientId = process.env.FANVUE_CLIENT_ID || process.env.NEXT_PUBLIC_FANVUE_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!clientId || !appUrl) {
    console.error('[Agency OAuth Login] Missing env vars:', {
      clientId: !!clientId,
      appUrl: !!appUrl,
    })
    return NextResponse.redirect(
      new URL('/dashboard/creator-management?error=oauth_not_configured', url.origin)
    )
  }

  // Check if user is authenticated
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('[Agency OAuth Login] User not authenticated')
    return NextResponse.redirect(new URL('/?error=not_logged_in', url.origin))
  }

  // Check if user is an agency admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('agency_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.agency_id) {
    console.error('[Agency OAuth Login] User has no agency')
    return NextResponse.redirect(
      new URL('/dashboard/creator-management?error=no_agency', url.origin)
    )
  }

  if (!['admin', 'owner', 'grandmaster'].includes(profile.role || '')) {
    console.error('[Agency OAuth Login] User is not an agency admin')
    return NextResponse.redirect(
      new URL('/dashboard/creator-management?error=not_admin', url.origin)
    )
  }

  // Generate PKCE and state
  const { verifier, challenge } = generatePkce()
  const state = crypto.randomUUID()
  const redirectUri = `${appUrl}/api/oauth/agency/callback`

  console.log('[Agency OAuth Login] Agency:', profile.agency_id)
  console.log('[Agency OAuth Login] Client ID:', clientId.substring(0, 8) + '...')
  console.log('[Agency OAuth Login] Redirect URI:', redirectUri)

  // Build authorize URL
  const authUrl = getAuthorizeUrl({
    state,
    codeChallenge: challenge,
    clientId,
    redirectUri,
    scopes: AGENCY_SCOPES,
  })

  console.log('[Agency OAuth Login] Auth URL:', authUrl)

  // Create redirect and set cookies DIRECTLY on the response object
  const secure = url.protocol === 'https:'
  const cookieOpts = {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure,
    maxAge: 600,
  }

  const res = NextResponse.redirect(authUrl)
  res.cookies.set('agency_oauth_state', state, cookieOpts)
  res.cookies.set('agency_oauth_verifier', verifier, cookieOpts)
  res.cookies.set('agency_oauth_agency_id', profile.agency_id, cookieOpts)
  res.cookies.set('agency_oauth_admin_id', user.id, cookieOpts)

  return res
}
