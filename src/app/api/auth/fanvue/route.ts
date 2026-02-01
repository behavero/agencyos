import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { FANVUE_CONFIG } from '@/lib/fanvue/config'
import { generateCodeVerifier, generateCodeChallenge, generateState } from '@/lib/fanvue/pkce'

export async function GET() {
  // Generate PKCE parameters (REQUIRED by Fanvue)
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const state = generateState()

  // Store code_verifier and state in HTTP-only cookies for security
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
    maxAge: 600, // 10 minutes
    path: '/',
  })

  const params = new URLSearchParams({
    client_id: FANVUE_CONFIG.clientId,
    redirect_uri: FANVUE_CONFIG.redirectUri,
    response_type: 'code',
    scope: FANVUE_CONFIG.scopes.join(' '),
    state: state, // CSRF protection
    code_challenge: codeChallenge, // PKCE challenge
    code_challenge_method: 'S256', // SHA-256 hashing
  })

  const authUrl = `${FANVUE_CONFIG.endpoints.authorize}?${params.toString()}`
  
  console.log('[Fanvue OAuth] Initiating OAuth flow')
  console.log('[Fanvue OAuth] Redirect URI:', FANVUE_CONFIG.redirectUri)
  console.log('[Fanvue OAuth] Authorization URL:', authUrl)
  
  redirect(authUrl)
}
