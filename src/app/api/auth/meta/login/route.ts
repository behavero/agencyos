/**
 * Facebook Login for Business - Instagram API
 * 
 * Uses Facebook OAuth with special IG_API_ONBOARDING flow.
 * This is REQUIRED for Instagram Insights access!
 * 
 * Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Get model ID from query params (which model to connect)
    const modelId = request.nextUrl.searchParams.get('modelId')
    if (!modelId) {
      return NextResponse.json({ error: 'Model ID required' }, { status: 400 })
    }

    // Use Facebook App ID (not Instagram App ID) for Facebook Login
    const clientId = process.env.NEXT_PUBLIC_META_APP_ID
    const redirectUri = process.env.META_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/meta/callback`
    
    if (!clientId) {
      return NextResponse.json({ error: 'Meta App ID not configured' }, { status: 500 })
    }

    // Required scopes for Instagram Insights via Facebook Login
    // Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login
    const scopes = [
      'instagram_basic',           // Basic Instagram account info
      'instagram_manage_insights', // Insights data (reach, impressions, etc.)
      'pages_show_list',           // List Facebook Pages
      'pages_read_engagement',     // Read Page engagement
    ].join(',')

    // Generate state parameter for CSRF protection (includes modelId)
    const state = Buffer.from(JSON.stringify({
      modelId,
      userId: user.id,
      timestamp: Date.now(),
    })).toString('base64')

    // Special extras parameter for Instagram API onboarding
    // This enables the simplified onboarding flow
    const extras = JSON.stringify({
      setup: {
        channel: 'IG_API_ONBOARDING'
      }
    })

    // Build Facebook OAuth URL with Instagram onboarding
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('display', 'page')
    authUrl.searchParams.set('extras', extras) // Instagram onboarding flow

    console.log('[meta/login] Redirecting to Facebook OAuth with IG onboarding:', authUrl.toString())

    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('[meta/login] Error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
