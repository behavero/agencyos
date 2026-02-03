/**
 * Instagram OAuth Callback Route
 * 
 * Handles the OAuth callback from Instagram:
 * 1. Exchange authorization code for short-lived token
 * 2. Exchange short-lived token for long-lived token (60 days)
 * 3. Fetch Instagram account info
 * 4. Save credentials to the models table
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const INSTAGRAM_API = 'https://api.instagram.com'
const INSTAGRAM_GRAPH_API = 'https://graph.instagram.com'

interface TokenResponse {
  access_token: string
  user_id: number
  permissions?: string[]
  error_type?: string
  error_message?: string
}

interface LongLivedTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface InstagramUser {
  id: string
  username: string
  account_type?: string
  media_count?: number
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description') || searchParams.get('error_reason')

  // Handle OAuth errors
  if (error) {
    console.error('[instagram/callback] OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard?error=Missing+authorization+code', request.url)
    )
  }

  try {
    // Decode and validate state
    let stateData: { modelId: string; userId: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard?error=Invalid+state+parameter', request.url)
      )
    }

    const { modelId } = stateData

    // Check state age (max 10 minutes)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(
        new URL('/dashboard?error=Authorization+expired', request.url)
      )
    }

    // Use Instagram App credentials
    const clientId = process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID
    const clientSecret = process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET
    const redirectUri = process.env.META_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/meta/callback`

    if (!clientId || !clientSecret) {
      throw new Error('Instagram credentials not configured')
    }

    // Step 1: Exchange code for short-lived token
    console.log('[instagram/callback] Exchanging code for short-lived token...')
    
    const tokenResponse = await fetch(`${INSTAGRAM_API}/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code,
      }),
    })

    const tokenData: TokenResponse = await tokenResponse.json()

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('[instagram/callback] Token exchange failed:', tokenData)
      throw new Error(tokenData.error_message || 'Failed to exchange authorization code')
    }

    console.log('[instagram/callback] Got short-lived token for user:', tokenData.user_id)

    // Step 2: Exchange for long-lived token (60 days)
    console.log('[instagram/callback] Exchanging for long-lived token...')
    const longLivedUrl = new URL(`${INSTAGRAM_GRAPH_API}/access_token`)
    longLivedUrl.searchParams.set('grant_type', 'ig_exchange_token')
    longLivedUrl.searchParams.set('client_secret', clientSecret)
    longLivedUrl.searchParams.set('access_token', tokenData.access_token)

    const longLivedResponse = await fetch(longLivedUrl.toString())
    const longLivedData: LongLivedTokenResponse = await longLivedResponse.json()

    if (!longLivedResponse.ok || !longLivedData.access_token) {
      console.error('[instagram/callback] Long-lived token exchange failed:', longLivedData)
      // Fall back to short-lived token if long-lived fails
      console.log('[instagram/callback] Using short-lived token as fallback')
    }

    const accessToken = longLivedData.access_token || tokenData.access_token
    // Default to 60 days for long-lived, 1 hour for short-lived
    const expiresIn = longLivedData.expires_in || 60 * 60
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    // Step 3: Get Instagram account info
    console.log('[instagram/callback] Fetching Instagram account info...')
    const userUrl = new URL(`${INSTAGRAM_GRAPH_API}/me`)
    userUrl.searchParams.set('fields', 'id,username,account_type,media_count')
    userUrl.searchParams.set('access_token', accessToken)

    const userResponse = await fetch(userUrl.toString())
    const userData: InstagramUser = await userResponse.json()

    if (!userResponse.ok || !userData.id) {
      console.error('[instagram/callback] Failed to fetch user info:', userData)
      throw new Error('Failed to fetch Instagram account info')
    }

    console.log(`[instagram/callback] Found Instagram account: @${userData.username}`)

    // Step 4: Save to database
    const supabase = await createAdminClient()
    
    const { error: updateError } = await supabase
      .from('models')
      .update({
        instagram_access_token: accessToken,
        instagram_business_id: userData.id,
        instagram_username: userData.username,
        instagram_token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', modelId)

    if (updateError) {
      console.error('[instagram/callback] Database update failed:', updateError)
      throw new Error('Failed to save Instagram credentials')
    }

    console.log(`[instagram/callback] Successfully connected @${userData.username} to model ${modelId}`)

    // Redirect back to creator page with success message
    return NextResponse.redirect(
      new URL(`/dashboard/creator-management/${modelId}?success=Instagram+connected!+@${userData.username}`, request.url)
    )
  } catch (error) {
    console.error('[instagram/callback] Error:', error)
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`, request.url)
    )
  }
}
