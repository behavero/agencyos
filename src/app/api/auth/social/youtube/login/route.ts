import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { cookies } from 'next/headers'

/**
 * YouTube OAuth Login Route
 * 
 * Initiates the OAuth 2.0 flow with Google to connect a YouTube channel.
 * Uses the YouTube Data API v3 readonly scope.
 * 
 * @see https://developers.google.com/youtube/v3/getting-started
 */

// Get the redirect URI based on environment
function getRedirectUri(): string {
  // In production, use the Vercel URL
  if (process.env.NODE_ENV === 'production') {
    return 'https://onyxos.vercel.app/api/auth/social/youtube/callback'
  }
  // In development, use localhost
  return `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/social/youtube/callback`
}

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error('[YouTube OAuth] Missing Google credentials')
      return NextResponse.redirect(
        new URL('/dashboard?error=youtube_config_missing', request.url)
      )
    }

    const redirectUri = getRedirectUri()
    console.log('[YouTube OAuth] Redirect URI:', redirectUri)

    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    )

    // Generate a state token for CSRF protection
    const state = crypto.randomUUID()
    
    // Get the model ID from query params (optional - to link the connection)
    const searchParams = request.nextUrl.searchParams
    const modelId = searchParams.get('modelId')

    // Store state and modelId in cookies for callback verification
    const cookieStore = await cookies()
    cookieStore.set('youtube_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    if (modelId) {
      cookieStore.set('youtube_oauth_model_id', modelId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600,
        path: '/',
      })
    }

    // Generate the authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // CRITICAL: Gets refresh token
      prompt: 'consent', // Forces refresh token generation
      scope: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      state: state,
      include_granted_scopes: true,
    })

    console.log('[YouTube OAuth] Redirecting to Google...')
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('[YouTube OAuth] Login error:', error)
    return NextResponse.redirect(
      new URL('/dashboard?error=youtube_oauth_failed', request.url)
    )
  }
}
