import { NextResponse } from 'next/server'
import { generatePkce, getAuthorizeUrl, getClientId } from '@/lib/fanvue/oauth'

/**
 * OAuth Login Route - initiates Fanvue OAuth flow for individual creator
 *
 * Following the official Fanvue App Starter Kit pattern:
 * https://github.com/fanvue/fanvue-app-starter/blob/main/src/app/api/oauth/login/route.ts
 *
 * Scopes are read from the OAUTH_SCOPES environment variable.
 * These must exactly match what's configured in the Fanvue developer portal.
 */
export async function GET(request: Request) {
  const { verifier, challenge } = generatePkce()
  const state = crypto.randomUUID()

  const url = new URL(request.url)
  const clientId = getClientId()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!clientId || !appUrl) {
    console.error('[OAuth Login] Missing env vars:', {
      clientId: !!clientId,
      appUrl: !!appUrl,
      FANVUE_CLIENT_ID: !!process.env.FANVUE_CLIENT_ID,
      NEXT_PUBLIC_FANVUE_CLIENT_ID: !!process.env.NEXT_PUBLIC_FANVUE_CLIENT_ID,
      NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
    })
    return NextResponse.redirect(
      new URL('/dashboard/creator-management?error=oauth_not_configured', url.origin)
    )
  }

  const redirectUri = `${appUrl}/api/oauth/callback`

  console.log('[OAuth Login] Starting OAuth flow')
  console.log('[OAuth Login] Client ID:', clientId.substring(0, 8) + '...')
  console.log('[OAuth Login] Redirect URI:', redirectUri)
  console.log(
    '[OAuth Login] OAUTH_SCOPES:',
    process.env.OAUTH_SCOPES || '(not set, defaulting to read:self)'
  )

  // Scopes come from OAUTH_SCOPES env var (via getAuthorizeUrl default)
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
