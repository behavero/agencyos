import { FANVUE_CONFIG } from '@/lib/fanvue/config'
import { createClient } from '@/lib/supabase/server'
import { createFanvueClient } from '@/lib/fanvue/client'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    console.error('[Fanvue OAuth] Error from Fanvue:', error)
    return NextResponse.redirect(new URL('/dashboard/creator-management?error=fanvue_oauth_failed', request.url))
  }

  if (!code) {
    console.error('[Fanvue OAuth] No authorization code received')
    return NextResponse.redirect(new URL('/dashboard/creator-management?error=fanvue_oauth_failed', request.url))
  }

  // Retrieve stored PKCE parameters
  const cookieStore = await cookies()
  const codeVerifier = cookieStore.get('fanvue_code_verifier')?.value
  const storedState = cookieStore.get('fanvue_oauth_state')?.value

  // Validate state (CSRF protection)
  if (!state || !storedState || state !== storedState) {
    console.error('[Fanvue OAuth] State mismatch - possible CSRF attack')
    return NextResponse.redirect(new URL('/dashboard/creator-management?error=invalid_state', request.url))
  }

  if (!codeVerifier) {
    console.error('[Fanvue OAuth] Code verifier not found in cookies')
    return NextResponse.redirect(new URL('/dashboard/creator-management?error=missing_verifier', request.url))
  }

  // Clear cookies
  cookieStore.delete('fanvue_code_verifier')
  cookieStore.delete('fanvue_oauth_state')

  try {
    console.log('[Fanvue OAuth] Exchanging code for tokens')
    
    // Exchange code for token with PKCE verifier
    const tokenResponse = await fetch(FANVUE_CONFIG.endpoints.token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: FANVUE_CONFIG.redirectUri,
        client_id: FANVUE_CONFIG.clientId,
        client_secret: FANVUE_CONFIG.clientSecret,
        code_verifier: codeVerifier, // ✅ PKCE verifier (not challenge!)
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('[Fanvue OAuth] Token exchange failed:', errorData)
      throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`)
    }

    const tokens = await tokenResponse.json()
    console.log('[Fanvue OAuth] Tokens received successfully')

    // Get user info from Fanvue using our new client
    const fanvueClient = createFanvueClient(tokens.access_token)
    const fanvueUser = await fanvueClient.getCurrentUser()
    
    console.log('[Fanvue OAuth] User info retrieved:', {
      uuid: fanvueUser.uuid,
      handle: fanvueUser.handle,
      displayName: fanvueUser.displayName,
      isCreator: fanvueUser.isCreator
    })

    // Store in Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error('[Fanvue OAuth] No authenticated user')
      return NextResponse.redirect(new URL('/?error=not_logged_in', request.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    // Check if model already exists
    const { data: existingModel } = await supabase
      .from('models')
      .select('id')
      .eq('agency_id', profile?.agency_id)
      .eq('name', fanvueUser.handle)
      .single()

    if (existingModel) {
      console.log('[Fanvue OAuth] Model already exists, updating token')
      // Update existing model with new token
      await supabase
        .from('models')
        .update({
          fanvue_api_key: tokens.access_token,
          avatar_url: fanvueUser.avatarUrl,
          status: 'active',
        })
        .eq('id', existingModel.id)
    } else {
      // Create new model entry
      const { error: insertError } = await supabase.from('models').insert({
        agency_id: profile?.agency_id,
        name: fanvueUser.handle,
        avatar_url: fanvueUser.avatarUrl,
        fanvue_api_key: tokens.access_token,
        status: 'active',
      })

      if (insertError) {
        console.error('[Fanvue OAuth] Failed to insert model:', insertError)
        throw insertError
      }
    }

    console.log('[Fanvue OAuth] Model added/updated successfully')
    
    // Check if this is a popup window (has window.opener)
    const isPopup = request.headers.get('referer')?.includes('creator-management')
    
    if (isPopup) {
      // For popup flow: redirect to a success page that will close the popup
      return NextResponse.redirect(new URL('/oauth-success.html?success=model_added', request.url))
    } else {
      // For full-page flow: redirect back to creator management
      return NextResponse.redirect(new URL('/dashboard/creator-management?success=model_added', request.url))
    }
  } catch (error: any) {
    console.error('[Fanvue OAuth] Error:', error)
    
    const isPopup = request.headers.get('referer')?.includes('creator-management')
    
    if (isPopup) {
      return NextResponse.redirect(
        new URL(`/oauth-success.html?error=fanvue_oauth_failed&details=${encodeURIComponent(error.message)}`, request.url)
      )
    } else {
      return NextResponse.redirect(
        new URL(`/dashboard/creator-management?error=fanvue_oauth_failed&details=${encodeURIComponent(error.message)}`, request.url)
      )
    }
  }
}
