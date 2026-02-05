import { NextResponse } from 'next/server'
import { generatePkce, getAuthorizeUrl } from '@/lib/fanvue/oauth'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

/**
 * Agency OAuth Login Route
 * Phase 60 - SaaS Architecture
 *
 * Initiates Fanvue OAuth flow for AGENCY-LEVEL connection.
 * This is separate from model OAuth - agency admins connect their
 * own Fanvue account to manage all creators in the agency.
 *
 * Required scopes for agency operations:
 * - read:agency - Access agency-level data
 * - read:creators - List all creators in the agency
 * - read:team - Access team member information
 * - read:earnings - Access earnings data for all creators
 */

// Agency-specific OAuth scopes (must match what's enabled in Fanvue app)
const AGENCY_SCOPES = 'read:agency read:creator'

export async function GET(request: Request) {
  const url = new URL(request.url)

  console.log('[Agency OAuth Login] Starting agency OAuth flow')

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
    return NextResponse.redirect(new URL('/dashboard/agency-settings?error=no_agency', url.origin))
  }

  if (!['admin', 'owner', 'grandmaster'].includes(profile.role || '')) {
    console.error('[Agency OAuth Login] User is not an agency admin')
    return NextResponse.redirect(new URL('/dashboard/agency-settings?error=not_admin', url.origin))
  }

  // Generate PKCE and state
  const { verifier, challenge } = generatePkce()
  const state = crypto.randomUUID()

  const clientId = process.env.NEXT_PUBLIC_FANVUE_CLIENT_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/agency/callback`

  console.log('[Agency OAuth Login] Agency:', profile.agency_id)
  console.log('[Agency OAuth Login] Admin:', user.id)
  console.log('[Agency OAuth Login] Redirect URI:', redirectUri)
  console.log('[Agency OAuth Login] Scopes:', AGENCY_SCOPES)

  // Build authorize URL with agency-specific scopes
  const authUrl = getAuthorizeUrl({
    state,
    codeChallenge: challenge,
    clientId,
    redirectUri,
    scopes: AGENCY_SCOPES,
  })

  console.log('[Agency OAuth Login] Full Auth URL:', authUrl)

  // Store OAuth state in cookies
  const cookieStore = await cookies()
  const secure = url.protocol === 'https:'

  cookieStore.set('agency_oauth_state', state, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure,
    maxAge: 600,
  })
  cookieStore.set('agency_oauth_verifier', verifier, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure,
    maxAge: 600,
  })

  // Store agency context for callback
  cookieStore.set('agency_oauth_agency_id', profile.agency_id, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure,
    maxAge: 600,
  })
  cookieStore.set('agency_oauth_admin_id', user.id, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure,
    maxAge: 600,
  })

  const res = NextResponse.redirect(authUrl)
  res.headers.set('Content-Security-Policy', "frame-ancestors 'self'")
  res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  return res
}

/**
 * Builds the authorize URL with agency-specific scopes
 */
function getAgencyAuthorizeUrl({
  state,
  codeChallenge,
  clientId,
  redirectUri,
}: {
  state: string
  codeChallenge: string
  clientId: string
  redirectUri: string
}) {
  const OAUTH_ISSUER_BASE_URL = 'https://auth.fanvue.com'

  // Base scopes + agency-specific scopes
  const scopes = `openid offline_access offline ${AGENCY_SCOPES}`

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return `${OAUTH_ISSUER_BASE_URL}/oauth2/auth?${params.toString()}`
}
