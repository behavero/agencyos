import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCodeForToken, getClientId, getClientSecret } from '@/lib/fanvue/oauth'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const FANVUE_API_BASE = 'https://api.fanvue.com'

/**
 * OAuth Callback Route - handles Fanvue OAuth callback
 * Following the official fanvue-app-starter pattern
 * https://github.com/fanvue/fanvue-app-starter
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const providerError = url.searchParams.get('error')
  const providerErrorDescription = url.searchParams.get('error_description')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin

  console.log('[OAuth Callback] Received callback')
  console.log('[OAuth Callback] Code:', code ? 'present' : 'missing')
  console.log('[OAuth Callback] State:', state ? 'present' : 'missing')

  const cookieStore = await cookies()
  const storedState = cookieStore.get('oauth_state')?.value
  const verifier = cookieStore.get('oauth_verifier')?.value

  console.log('[OAuth Callback] Stored state:', storedState ? 'present' : 'missing')
  console.log('[OAuth Callback] Verifier:', verifier ? 'present' : 'missing')

  // Clean up cookies
  cookieStore.delete('oauth_state')
  cookieStore.delete('oauth_verifier')

  if (providerError) {
    console.error('[OAuth Callback] Provider error:', providerError, providerErrorDescription)
    const search = new URLSearchParams()
    search.set('error', providerError)
    if (providerErrorDescription) search.set('error_description', providerErrorDescription)
    return NextResponse.redirect(
      new URL(`${baseUrl}/dashboard/creator-management?${search.toString()}`)
    )
  }

  if (!code || !state || !storedState || !verifier || state !== storedState) {
    console.error('[OAuth Callback] State mismatch or missing data')
    return NextResponse.redirect(
      new URL(`${baseUrl}/dashboard/creator-management?error=oauth_state_mismatch`)
    )
  }

  const clientId = getClientId()
  const clientSecret = getClientSecret()
  const redirectUri = `${baseUrl}/api/oauth/callback`

  try {
    console.log('[OAuth Callback] Exchanging code for token...')
    const token = await exchangeCodeForToken({
      code,
      codeVerifier: verifier,
      redirectUri,
      clientId,
      clientSecret,
    })

    console.log('[OAuth Callback] Token received! Fetching user info...')

    // Fetch user info from Fanvue
    const userRes = await fetch(`${FANVUE_API_BASE}/users/me`, {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'X-Fanvue-API-Version': '2025-06-26',
      },
    })

    if (!userRes.ok) {
      const errorText = await userRes.text()
      console.error('[OAuth Callback] Failed to fetch user:', errorText)
      return NextResponse.redirect(
        new URL(`${baseUrl}/dashboard/creator-management?error=user_fetch_failed`)
      )
    }

    const fanvueUser = await userRes.json()
    console.log('[OAuth Callback] User fetched:', fanvueUser.handle || fanvueUser.displayName)

    // Get current OnyxOS user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL(`${baseUrl}/?error=not_logged_in`))
    }

    // Get user's agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.redirect(
        new URL(`${baseUrl}/dashboard/creator-management?error=no_agency`)
      )
    }

    // Store creator in database using admin client
    const adminClient = createAdminClient()

    // Check if creator already exists
    const { data: existingModel } = await adminClient
      .from('models')
      .select('id')
      .eq('fanvue_user_uuid', fanvueUser.uuid)
      .single()

    const modelData = {
      agency_id: profile.agency_id,
      name: fanvueUser.displayName || fanvueUser.handle || 'Unknown Creator',
      avatar_url: fanvueUser.avatarUrl,
      fanvue_user_uuid: fanvueUser.uuid,
      fanvue_username: fanvueUser.handle,
      fanvue_access_token: token.access_token,
      fanvue_refresh_token: token.refresh_token,
      fanvue_token_expires_at: token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000).toISOString()
        : null,
      status: 'active',
      updated_at: new Date().toISOString(),
    }

    if (existingModel) {
      console.log('[OAuth Callback] Updating existing creator')
      await adminClient.from('models').update(modelData).eq('id', existingModel.id)
    } else {
      console.log('[OAuth Callback] Creating new creator')
      await adminClient.from('models').insert(modelData)
    }

    console.log('[OAuth Callback] Success! Redirecting...')
    return NextResponse.redirect(
      new URL(`${baseUrl}/dashboard/creator-management?success=connected`)
    )
  } catch (e: any) {
    console.error('[OAuth Callback] Error:', e)
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
