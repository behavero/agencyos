import { NextResponse } from 'next/server'
import { generatePkce, getAuthorizeUrl } from '@/lib/fanvue/oauth'

/**
 * OAuth Login Route - initiates Fanvue OAuth flow for individual creator
 * Following the official fanvue-app-starter pattern
 */
export async function GET(request: Request) {
  const { verifier, challenge } = generatePkce()
  const state = crypto.randomUUID()

  const url = new URL(request.url)
  const clientId = process.env.FANVUE_CLIENT_ID || process.env.NEXT_PUBLIC_FANVUE_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!clientId || !appUrl) {
    console.error('[OAuth Login] Missing env vars:', { clientId: !!clientId, appUrl: !!appUrl })
    return NextResponse.redirect(
      new URL('/dashboard/creator-management?error=oauth_not_configured', url.origin)
    )
  }

  const redirectUri = `${appUrl}/api/oauth/callback`

  console.log('[OAuth Login] Starting OAuth flow')
  console.log('[OAuth Login] Client ID:', clientId.substring(0, 8) + '...')
  console.log('[OAuth Login] Redirect URI:', redirectUri)

  const authUrl = getAuthorizeUrl({
    state,
    codeChallenge: challenge,
    clientId,
    redirectUri,
  })

  console.log('[OAuth Login] Auth URL:', authUrl)

  // Set cookies DIRECTLY on the redirect response
  const secure = url.protocol === 'https:'
  const cookieOpts = {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure,
    maxAge: 600,
  }

  const res = NextResponse.redirect(authUrl)
  res.cookies.set('oauth_state', state, cookieOpts)
  res.cookies.set('oauth_verifier', verifier, cookieOpts)

  return res
}
