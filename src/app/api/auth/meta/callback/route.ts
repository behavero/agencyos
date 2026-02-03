/**
 * Facebook Login for Business - OAuth Callback
 * 
 * Handles the OAuth callback from Facebook:
 * 1. Exchange authorization code for access token
 * 2. Exchange for long-lived token (60 days)
 * 3. Get Facebook Pages with connected Instagram accounts
 * 4. Save credentials to the models table
 * 
 * Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const META_GRAPH_API = 'https://graph.facebook.com/v18.0'

interface TokenResponse {
  access_token: string
  token_type?: string
  expires_in?: number
  error?: {
    message: string
    type: string
    code: number
  }
}

interface InstagramAccount {
  id: string
  username?: string
}

interface FacebookPage {
  id: string
  name: string
  access_token: string
  instagram_business_account?: InstagramAccount
}

interface PagesResponse {
  data: FacebookPage[]
  error?: {
    message: string
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description') || searchParams.get('error_reason')

  // Handle OAuth errors
  if (error) {
    console.error('[meta/callback] OAuth error:', error, errorDescription)
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

    // Use Facebook App credentials
    const clientId = process.env.NEXT_PUBLIC_META_APP_ID
    const clientSecret = process.env.META_APP_SECRET
    const redirectUri = process.env.META_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/meta/callback`

    if (!clientId || !clientSecret) {
      throw new Error('Meta credentials not configured')
    }

    // Step 1: Exchange code for access token
    console.log('[meta/callback] Exchanging code for access token...')
    const tokenUrl = new URL(`${META_GRAPH_API}/oauth/access_token`)
    tokenUrl.searchParams.set('client_id', clientId)
    tokenUrl.searchParams.set('client_secret', clientSecret)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('code', code)

    const tokenResponse = await fetch(tokenUrl.toString())
    const tokenData: TokenResponse = await tokenResponse.json()

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('[meta/callback] Token exchange failed:', tokenData)
      throw new Error(tokenData.error?.message || 'Failed to exchange authorization code')
    }

    // Step 2: Exchange for long-lived token (60 days)
    console.log('[meta/callback] Exchanging for long-lived token...')
    const longLivedUrl = new URL(`${META_GRAPH_API}/oauth/access_token`)
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longLivedUrl.searchParams.set('client_id', clientId)
    longLivedUrl.searchParams.set('client_secret', clientSecret)
    longLivedUrl.searchParams.set('fb_exchange_token', tokenData.access_token)

    const longLivedResponse = await fetch(longLivedUrl.toString())
    const longLivedData: TokenResponse = await longLivedResponse.json()

    const userToken = longLivedData.access_token || tokenData.access_token
    const expiresIn = longLivedData.expires_in || 60 * 24 * 60 * 60 // Default 60 days
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    // Step 3: Get Facebook Pages with Instagram Business accounts
    console.log('[meta/callback] Fetching connected Instagram accounts...')
    const pagesUrl = new URL(`${META_GRAPH_API}/me/accounts`)
    pagesUrl.searchParams.set('access_token', userToken)
    pagesUrl.searchParams.set('fields', 'id,name,access_token,instagram_business_account{id,username}')

    const pagesResponse = await fetch(pagesUrl.toString())
    const pagesData: PagesResponse = await pagesResponse.json()

    if (!pagesResponse.ok || pagesData.error) {
      console.error('[meta/callback] Failed to fetch pages:', pagesData)
      throw new Error(pagesData.error?.message || 'Failed to fetch connected pages')
    }

    // Find pages with Instagram Business accounts
    const pagesWithInstagram = pagesData.data?.filter(page => page.instagram_business_account) || []

    console.log(`[meta/callback] Found ${pagesWithInstagram.length} pages with Instagram`)

    if (pagesWithInstagram.length === 0) {
      return NextResponse.redirect(
        new URL('/dashboard?error=No+Instagram+Professional+account+found.+Make+sure+your+Instagram+is+a+Professional+account+connected+to+a+Facebook+Page.', request.url)
      )
    }

    // Use the first page with Instagram (could add UI to select if multiple)
    const selectedPage = pagesWithInstagram[0]
    const instagramAccount = selectedPage.instagram_business_account!

    // Get Instagram username if not included
    let instagramUsername = instagramAccount.username
    if (!instagramUsername) {
      const igUrl = new URL(`${META_GRAPH_API}/${instagramAccount.id}`)
      igUrl.searchParams.set('fields', 'username')
      igUrl.searchParams.set('access_token', selectedPage.access_token)
      const igResponse = await fetch(igUrl.toString())
      const igData = await igResponse.json()
      instagramUsername = igData.username || 'unknown'
    }

    console.log(`[meta/callback] Found Instagram: @${instagramUsername}`)

    // Step 4: Save to database
    const supabase = await createAdminClient()
    
    const { error: updateError } = await supabase
      .from('models')
      .update({
        instagram_access_token: selectedPage.access_token, // Use Page token for API calls
        instagram_business_id: instagramAccount.id,
        instagram_username: instagramUsername,
        instagram_token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', modelId)

    if (updateError) {
      console.error('[meta/callback] Database update failed:', updateError)
      throw new Error('Failed to save Instagram credentials')
    }

    console.log(`[meta/callback] Successfully connected @${instagramUsername} to model ${modelId}`)

    // Redirect back to creator page with success message
    return NextResponse.redirect(
      new URL(`/dashboard/creator-management/${modelId}?success=Instagram+connected!+@${instagramUsername}`, request.url)
    )
  } catch (error) {
    console.error('[meta/callback] Error:', error)
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`, request.url)
    )
  }
}
