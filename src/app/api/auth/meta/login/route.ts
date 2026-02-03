/**
 * Facebook Login - Server-Side OAuth for Instagram Insights
 *
 * Uses traditional server-side OAuth redirect flow with explicit scopes.
 * This is the "Manual Flow" approach from Meta's documentation.
 *
 * Required scopes:
 * - instagram_basic: Basic Instagram account info
 * - instagram_manage_insights: Insights data (reach, impressions, etc.)
 * - pages_show_list: List Facebook Pages user manages
 * - pages_read_engagement: Read Page engagement data
 *
 * Docs: https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Get model ID from query params (which model to connect)
    const modelId = request.nextUrl.searchParams.get('modelId')
    if (!modelId) {
      return NextResponse.json({ error: 'Model ID required' }, { status: 400 })
    }

    // Use Facebook App ID
    const clientId = process.env.NEXT_PUBLIC_META_APP_ID
    const redirectUri =
      process.env.META_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/meta/callback`

    if (!clientId) {
      return NextResponse.json({ error: 'Meta App ID not configured' }, { status: 500 })
    }

    // Required scopes for Instagram Insights via Facebook Login
    // These must also be configured in your Facebook App's permissions
    const scopes = [
      'instagram_basic',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement',
    ].join(',')

    // Generate state parameter for CSRF protection (includes modelId)
    const state = Buffer.from(
      JSON.stringify({
        modelId,
        userId: user.id,
        timestamp: Date.now(),
      })
    ).toString('base64')

    // Build Facebook OAuth URL - Facebook Login for Business with Instagram
    // Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('display', 'page')
    // Add Instagram onboarding extras for simplified flow
    authUrl.searchParams.set('extras', JSON.stringify({ setup: { channel: 'IG_API_ONBOARDING' } }))

    console.log('[meta/login] Redirecting to Facebook OAuth:', {
      clientId,
      redirectUri,
      scopes,
    })

    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('[meta/login] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
