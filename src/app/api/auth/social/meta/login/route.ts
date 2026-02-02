import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Meta (Instagram/Facebook) OAuth Login Route
 * 
 * Initiates the OAuth 2.0 flow with Facebook/Instagram Graph API.
 * Requests permissions for Instagram Business Account insights.
 * 
 * @see https://developers.facebook.com/docs/instagram-api/getting-started
 */

// Meta OAuth configuration
const META_AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth'

// Required permissions for Instagram Business insights
const SCOPES = [
  'pages_show_list',           // List connected Pages
  'instagram_basic',           // Basic Instagram profile info
  'instagram_manage_insights', // Read Instagram analytics
  'pages_read_engagement',     // Page engagement metrics
  'business_management',       // Business account management
].join(',')

function getRedirectUri(): string {
  if (process.env.NODE_ENV === 'production') {
    return 'https://onyxos.vercel.app/api/auth/social/meta/callback'
  }
  return `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/social/meta/callback`
}

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.META_CLIENT_ID

    if (!clientId) {
      console.error('[Meta OAuth] Missing META_CLIENT_ID')
      return NextResponse.redirect(
        new URL('/dashboard?error=meta_config_missing', request.url)
      )
    }

    const redirectUri = getRedirectUri()
    console.log('[Meta OAuth] Redirect URI:', redirectUri)

    // Generate state token for CSRF protection
    const state = crypto.randomUUID()

    // Get model ID from query params (optional)
    const searchParams = request.nextUrl.searchParams
    const modelId = searchParams.get('modelId')

    // Store state and modelId in cookies
    const cookieStore = await cookies()
    cookieStore.set('meta_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })

    if (modelId) {
      cookieStore.set('meta_oauth_model_id', modelId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600,
        path: '/',
      })
    }

    // Build the authorization URL
    const authUrl = new URL(META_AUTH_URL)
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('scope', SCOPES)
    authUrl.searchParams.set('response_type', 'code')
    // Request re-authentication to ensure we get a fresh token
    authUrl.searchParams.set('auth_type', 'rerequest')

    console.log('[Meta OAuth] Redirecting to Facebook...')
    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('[Meta OAuth] Login error:', error)
    return NextResponse.redirect(
      new URL('/dashboard?error=meta_oauth_failed', request.url)
    )
  }
}
