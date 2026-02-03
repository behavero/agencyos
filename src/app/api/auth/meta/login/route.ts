/**
 * Meta OAuth Login Route
 * 
 * Redirects user to Facebook Login dialog to authorize Instagram access.
 * Required scopes:
 * - instagram_basic: Access to basic Instagram account info
 * - instagram_manage_insights: Access to Instagram Insights API
 * - pages_show_list: List Facebook Pages connected to account
 * - pages_read_engagement: Read Page engagement metrics
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

    // Meta OAuth configuration
    const clientId = process.env.NEXT_PUBLIC_META_APP_ID
    const redirectUri = process.env.META_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/meta/callback`
    
    if (!clientId) {
      return NextResponse.json({ error: 'Meta App ID not configured' }, { status: 500 })
    }

    // Required scopes for Instagram Business insights
    const scopes = [
      'instagram_basic',
      'instagram_manage_insights', 
      'pages_show_list',
      'pages_read_engagement',
      'business_management', // For accessing business accounts
    ].join(',')

    // Generate state parameter for CSRF protection (includes modelId)
    const state = Buffer.from(JSON.stringify({
      modelId,
      userId: user.id,
      timestamp: Date.now(),
    })).toString('base64')

    // Build Facebook OAuth URL
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('response_type', 'code')

    console.log('[meta/login] Redirecting to Meta OAuth:', authUrl.toString())

    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('[meta/login] Error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
