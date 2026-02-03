/**
 * Instagram OAuth Login Route
 * 
 * Redirects user to Instagram OAuth dialog to authorize access.
 * Uses Instagram Business Login API for insights access.
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

    // Instagram OAuth configuration
    // Use Instagram App ID (not Facebook App ID)
    const clientId = process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID
    const redirectUri = process.env.META_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/meta/callback`
    
    if (!clientId) {
      return NextResponse.json({ error: 'Instagram App ID not configured' }, { status: 500 })
    }

    // Required scopes for Instagram Business API
    const scopes = [
      'instagram_business_basic',
      'instagram_business_manage_insights',
    ].join(',')

    // Generate state parameter for CSRF protection (includes modelId)
    const state = Buffer.from(JSON.stringify({
      modelId,
      userId: user.id,
      timestamp: Date.now(),
    })).toString('base64')

    // Build Instagram OAuth URL (not Facebook!)
    const authUrl = new URL('https://www.instagram.com/oauth/authorize')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('force_reauth', 'true') // Always show login

    console.log('[instagram/login] Redirecting to Instagram OAuth:', authUrl.toString())

    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('[instagram/login] Error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
