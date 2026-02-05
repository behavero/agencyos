import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCodeForToken } from '@/lib/fanvue/oauth'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { storeAgencyConnection } from '@/lib/services/agency-fanvue-auth'

const FANVUE_API_BASE = 'https://api.fanvue.com'

/**
 * Agency OAuth Callback Route
 * Phase 60 - SaaS Architecture
 *
 * Handles Fanvue OAuth callback for AGENCY-LEVEL connection.
 * Stores tokens in agency_fanvue_connections table (not models table).
 */

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const providerError = url.searchParams.get('error')
  const providerErrorDescription = url.searchParams.get('error_description')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin

  console.log('[Agency OAuth Callback] Received callback')
  console.log('[Agency OAuth Callback] Code:', code ? 'present' : 'missing')
  console.log('[Agency OAuth Callback] State:', state ? 'present' : 'missing')

  const cookieStore = await cookies()
  const storedState = cookieStore.get('agency_oauth_state')?.value
  const verifier = cookieStore.get('agency_oauth_verifier')?.value
  const agencyId = cookieStore.get('agency_oauth_agency_id')?.value
  const adminId = cookieStore.get('agency_oauth_admin_id')?.value

  console.log('[Agency OAuth Callback] Stored state:', storedState ? 'present' : 'missing')
  console.log('[Agency OAuth Callback] Verifier:', verifier ? 'present' : 'missing')
  console.log('[Agency OAuth Callback] Agency ID:', agencyId)
  console.log('[Agency OAuth Callback] Admin ID:', adminId)

  // Clean up cookies
  cookieStore.delete('agency_oauth_state')
  cookieStore.delete('agency_oauth_verifier')
  cookieStore.delete('agency_oauth_agency_id')
  cookieStore.delete('agency_oauth_admin_id')

  // Handle provider errors
  if (providerError) {
    console.error(
      '[Agency OAuth Callback] Provider error:',
      providerError,
      providerErrorDescription
    )
    const search = new URLSearchParams()
    search.set('error', providerError)
    if (providerErrorDescription) search.set('error_description', providerErrorDescription)
    return NextResponse.redirect(
      new URL(`${baseUrl}/dashboard/creator-management?${search.toString()}`)
    )
  }

  // Validate state and required data
  if (!code || !state || !storedState || !verifier || state !== storedState) {
    console.error('[Agency OAuth Callback] State mismatch or missing data')
    return NextResponse.redirect(
      new URL(`${baseUrl}/dashboard/creator-management?error=oauth_state_mismatch`)
    )
  }

  if (!agencyId || !adminId) {
    console.error('[Agency OAuth Callback] Missing agency context')
    return NextResponse.redirect(
      new URL(`${baseUrl}/dashboard/creator-management?error=session_expired`)
    )
  }

  const clientId = process.env.NEXT_PUBLIC_FANVUE_CLIENT_ID!
  const clientSecret = process.env.FANVUE_CLIENT_SECRET!
  const redirectUri = `${baseUrl}/api/oauth/agency/callback`

  try {
    console.log('[Agency OAuth Callback] Exchanging code for token...')

    const token = await exchangeCodeForToken({
      code,
      codeVerifier: verifier,
      redirectUri,
      clientId,
      clientSecret,
    })

    console.log('[Agency OAuth Callback] Token received!')
    console.log(
      '[Agency OAuth Callback] Access token:',
      token.access_token.substring(0, 20) + '...'
    )
    console.log('[Agency OAuth Callback] Refresh token present:', !!token.refresh_token)
    console.log('[Agency OAuth Callback] Expires in:', token.expires_in)
    console.log('[Agency OAuth Callback] Scope:', token.scope)

    // Fetch user info from Fanvue to get the Fanvue user ID
    console.log('[Agency OAuth Callback] Fetching user info...')

    let fanvueUserId = 'unknown'
    let fanvueUserHandle = 'unknown'

    try {
      const userRes = await fetch(`${FANVUE_API_BASE}/users/me`, {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          'X-Fanvue-API-Version': '2025-06-26',
        },
      })

      if (userRes.ok) {
        const fanvueUser = await userRes.json()
        fanvueUserId = fanvueUser.uuid || 'unknown'
        fanvueUserHandle = fanvueUser.handle || fanvueUser.displayName || 'unknown'
        console.log('[Agency OAuth Callback] Fanvue user:', fanvueUserHandle)
        console.log('[Agency OAuth Callback] Fanvue UUID:', fanvueUserId)
      } else {
        const errorText = await userRes.text()
        console.error(
          '[Agency OAuth Callback] Failed to fetch user (continuing anyway):',
          errorText
        )
        // Don't fail - we have the token, that's what matters
      }
    } catch (userError) {
      console.error('[Agency OAuth Callback] Error fetching user (continuing):', userError)
    }

    // Verify the user is still authenticated
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.id !== adminId) {
      console.error('[Agency OAuth Callback] User session mismatch')
      return NextResponse.redirect(
        new URL(`${baseUrl}/dashboard/creator-management?error=session_mismatch`)
      )
    }

    // Verify the user still belongs to the agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.agency_id !== agencyId) {
      console.error('[Agency OAuth Callback] Agency mismatch')
      return NextResponse.redirect(
        new URL(`${baseUrl}/dashboard/creator-management?error=agency_mismatch`)
      )
    }

    if (!['admin', 'owner', 'grandmaster'].includes(profile.role || '')) {
      console.error('[Agency OAuth Callback] User is not an admin')
      return NextResponse.redirect(
        new URL(`${baseUrl}/dashboard/creator-management?error=not_admin`)
      )
    }

    // Store the agency connection
    await storeAgencyConnection(
      agencyId,
      adminId,
      {
        access_token: token.access_token,
        refresh_token: token.refresh_token || '',
        expires_in: token.expires_in,
      },
      fanvueUserId
    )

    console.log('[Agency OAuth Callback] ✅ Agency connection stored successfully!')
    console.log('[Agency OAuth Callback] Redirecting to agency settings...')

    return NextResponse.redirect(
      new URL(`${baseUrl}/dashboard/creator-management?success=agency_connected`)
    )
  } catch (e: any) {
    console.error('[Agency OAuth Callback] Error:', e)
    return NextResponse.redirect(
      new URL(
        `${baseUrl}/dashboard/creator-management?error=oauth_token_exchange_failed&details=${encodeURIComponent(e.message)}`
      )
    )
  }
}

// Also handle POST for form_post response mode
export async function POST(request: Request) {
  const form = await request.formData()
  const code = form.get('code') as string | null
  const state = form.get('state') as string | null
  const error = form.get('error') as string | null
  const errorDescription = form.get('error_description') as string | null

  const url = new URL(request.url)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin

  if (error) {
    const search = new URLSearchParams()
    search.set('error', error)
    if (errorDescription) search.set('error_description', errorDescription)
    return NextResponse.redirect(
      new URL(`${baseUrl}/dashboard/creator-management?${search.toString()}`)
    )
  }

  // Reuse GET logic by constructing a URL with query params
  const redirectUrl = new URL(request.url)
  if (code) redirectUrl.searchParams.set('code', code)
  if (state) redirectUrl.searchParams.set('state', state)

  return GET(new Request(redirectUrl.toString()))
}
