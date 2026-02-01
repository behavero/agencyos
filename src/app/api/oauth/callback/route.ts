import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const OAUTH_CLIENT_ID = process.env.NEXT_PUBLIC_FANVUE_CLIENT_ID!
const OAUTH_CLIENT_SECRET = process.env.FANVUE_CLIENT_SECRET!
const OAUTH_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/callback`

/**
 * Fanvue OAuth Callback Handler
 * Following the official Fanvue App Starter pattern
 * https://github.com/fanvue/fanvue-app-starter
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  console.log('[Fanvue OAuth Callback] Received callback')

  // Handle errors from Fanvue
  if (error) {
    console.error('[Fanvue OAuth] Error from Fanvue:', error)
    return NextResponse.redirect(
      new URL('/dashboard/creator-management?error=oauth_denied', request.url)
    )
  }

  if (!code) {
    console.error('[Fanvue OAuth] No authorization code received')
    return NextResponse.redirect(
      new URL('/dashboard/creator-management?error=no_code', request.url)
    )
  }

  // Get stored PKCE verifier and state from cookies
  const cookieStore = await cookies()
  const codeVerifier = cookieStore.get('fanvue_code_verifier')?.value
  const storedState = cookieStore.get('fanvue_oauth_state')?.value

  // Validate state (CSRF protection)
  if (!state || !storedState || state !== storedState) {
    console.error('[Fanvue OAuth] State mismatch')
    return NextResponse.redirect(
      new URL('/dashboard/creator-management?error=invalid_state', request.url)
    )
  }

  if (!codeVerifier) {
    console.error('[Fanvue OAuth] No code verifier found')
    return NextResponse.redirect(
      new URL('/dashboard/creator-management?error=no_verifier', request.url)
    )
  }

  // Clear the cookies
  cookieStore.delete('fanvue_code_verifier')
  cookieStore.delete('fanvue_oauth_state')

  try {
    // Exchange code for tokens
    console.log('[Fanvue OAuth] Exchanging code for tokens...')
    const tokenResponse = await fetch('https://auth.fanvue.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: OAUTH_CLIENT_ID,
        client_secret: OAUTH_CLIENT_SECRET,
        code: code,
        redirect_uri: OAUTH_REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error('[Fanvue OAuth] Token exchange failed:', errorData)
      return NextResponse.redirect(
        new URL(`/dashboard/creator-management?error=token_failed&details=${encodeURIComponent(JSON.stringify(errorData))}`, request.url)
      )
    }

    const tokens = await tokenResponse.json()
    console.log('[Fanvue OAuth] Tokens received successfully!')

    // Fetch user info
    console.log('[Fanvue OAuth] Fetching user info...')
    const userResponse = await fetch('https://api.fanvue.com/users/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'X-Fanvue-API-Version': '2025-06-26',
      },
    })

    if (!userResponse.ok) {
      console.error('[Fanvue OAuth] Failed to fetch user info')
      return NextResponse.redirect(
        new URL('/dashboard/creator-management?error=user_fetch_failed', request.url)
      )
    }

    const fanvueUser = await userResponse.json()
    console.log('[Fanvue OAuth] User info received:', fanvueUser.handle)

    // Get current OnyxOS user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/?error=not_logged_in', request.url))
    }

    // Get user's agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.redirect(
        new URL('/dashboard/creator-management?error=no_agency', request.url)
      )
    }

    // Use admin client to store in database
    const adminClient = createAdminClient()

    // Check if creator already exists
    const { data: existingModel } = await adminClient
      .from('models')
      .select('id')
      .eq('fanvue_user_uuid', fanvueUser.uuid)
      .single()

    if (existingModel) {
      // Update existing model with new tokens
      await adminClient
        .from('models')
        .update({
          fanvue_access_token: tokens.access_token,
          fanvue_refresh_token: tokens.refresh_token,
          fanvue_token_expires_at: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
            : null,
          avatar_url: fanvueUser.avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingModel.id)

      console.log('[Fanvue OAuth] Updated existing creator')
    } else {
      // Create new model
      await adminClient.from('models').insert({
        agency_id: profile.agency_id,
        name: fanvueUser.displayName || fanvueUser.handle,
        avatar_url: fanvueUser.avatarUrl,
        fanvue_user_uuid: fanvueUser.uuid,
        fanvue_username: fanvueUser.handle,
        fanvue_access_token: tokens.access_token,
        fanvue_refresh_token: tokens.refresh_token,
        fanvue_token_expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        status: 'active',
      })

      console.log('[Fanvue OAuth] Created new creator:', fanvueUser.displayName)
    }

    // Redirect back to creator management with success
    return NextResponse.redirect(
      new URL('/dashboard/creator-management?success=connected', request.url)
    )

  } catch (error: any) {
    console.error('[Fanvue OAuth] Error:', error)
    return NextResponse.redirect(
      new URL(`/dashboard/creator-management?error=oauth_failed&details=${encodeURIComponent(error.message)}`, request.url)
    )
  }
}
