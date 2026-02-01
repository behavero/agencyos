import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { FANVUE_CONFIG } from '@/lib/fanvue/config'
import { generateCodeVerifier, generateCodeChallenge, generateState } from '@/lib/fanvue/pkce'

/**
 * Fanvue OAuth Route - Returns HTTP 302 Redirect
 * This is the most basic redirect method that cannot be blocked.
 */
export async function GET() {
  // Generate PKCE parameters (required by Fanvue)
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const state = generateState()

  // Store in cookies for callback verification
  const cookieStore = await cookies()
  cookieStore.set('fanvue_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  cookieStore.set('fanvue_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  // Build the Fanvue OAuth URL
  const params = new URLSearchParams({
    client_id: FANVUE_CONFIG.clientId,
    redirect_uri: FANVUE_CONFIG.redirectUri,
    response_type: 'code',
    scope: FANVUE_CONFIG.scopes.join(' '),
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  const authUrl = `${FANVUE_CONFIG.endpoints.authorize}?${params.toString()}`
  
  console.log('[Fanvue OAuth] Redirecting to:', authUrl)
  
  // Return HTTP 302 redirect response - most reliable method
  return NextResponse.redirect(authUrl, { status: 302 })
}
