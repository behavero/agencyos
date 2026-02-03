/**
 * Facebook Login for Business - Instagram Graph API
 *
 * Uses Facebook Login with Configuration ID for Instagram Insights.
 * Configuration ID: 1432619911747660
 *
 * Permissions granted:
 * - instagram_basic
 * - instagram_manage_insights
 * - pages_show_list
 * - pages_read_engagement
 * - read_insights
 * - business_management
 *
 * Docs: https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Instagram Graph API Configuration ID from Meta Developer Console
const META_CONFIG_ID = process.env.META_CONFIG_ID || '1432619911747660'

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

    // Use Facebook App ID for Facebook Login
    const clientId = process.env.NEXT_PUBLIC_META_APP_ID
    const redirectUri =
      process.env.META_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/meta/callback`

    if (!clientId) {
      return NextResponse.json({ error: 'Meta App ID not configured' }, { status: 500 })
    }

    // Generate state parameter for CSRF protection (includes modelId)
    const state = Buffer.from(
      JSON.stringify({
        modelId,
        userId: user.id,
        timestamp: Date.now(),
      })
    ).toString('base64')

    // Build Facebook OAuth URL with Configuration ID
    // Using config_id instead of scope - this uses the pre-configured permissions
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('config_id', META_CONFIG_ID) // Use Configuration ID!
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('response_type', 'code')

    console.log('[meta/login] Redirecting to Facebook OAuth with config_id:', META_CONFIG_ID)

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
