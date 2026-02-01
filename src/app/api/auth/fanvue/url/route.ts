import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { FANVUE_CONFIG } from '@/lib/fanvue/config'
import { generateCodeVerifier, generateCodeChallenge, generateState } from '@/lib/fanvue/pkce'

/**
 * API Route to generate Fanvue OAuth URL
 * Returns the URL as JSON instead of redirecting
 * This allows the client to open it in a popup directly
 */
export async function GET() {
  try {
    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)
    const state = generateState()

    // Store in cookies for callback verification
    const cookieStore = await cookies()
    cookieStore.set('fanvue_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })
    cookieStore.set('fanvue_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })

    // Build OAuth URL
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

    console.log('[Fanvue OAuth] Generated OAuth URL for popup')
    console.log('[Fanvue OAuth] URL:', authUrl)

    return NextResponse.json({ 
      url: authUrl,
      state: state 
    })
  } catch (error: any) {
    console.error('[Fanvue OAuth] Error generating URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate OAuth URL' },
      { status: 500 }
    )
  }
}
