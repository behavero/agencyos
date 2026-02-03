/**
 * Meta OAuth Callback Route
 * 
 * Handles the OAuth callback from Facebook/Meta:
 * 1. Exchange authorization code for short-lived token
 * 2. Exchange short-lived token for long-lived token (60 days)
 * 3. Fetch connected Instagram Business Accounts
 * 4. Save credentials to the models table
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const META_GRAPH_API = 'https://graph.facebook.com/v18.0'

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
}

interface InstagramAccount {
  id: string
  username: string
  name?: string
  profile_picture_url?: string
}

interface FacebookPage {
  id: string
  name: string
  instagram_business_account?: InstagramAccount
  access_token: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

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

    const { modelId, userId } = stateData

    // Check state age (max 10 minutes)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(
        new URL('/dashboard?error=Authorization+expired', request.url)
      )
    }

    const clientId = process.env.NEXT_PUBLIC_META_APP_ID
    const clientSecret = process.env.META_APP_SECRET
    const redirectUri = process.env.META_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/meta/callback`

    if (!clientId || !clientSecret) {
      throw new Error('Meta credentials not configured')
    }

    // Step 1: Exchange code for short-lived token
    console.log('[meta/callback] Exchanging code for short-lived token...')
    const tokenUrl = new URL(`${META_GRAPH_API}/oauth/access_token`)
    tokenUrl.searchParams.set('client_id', clientId)
    tokenUrl.searchParams.set('client_secret', clientSecret)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('code', code)

    const tokenResponse = await fetch(tokenUrl.toString())
    const tokenData: TokenResponse = await tokenResponse.json()

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('[meta/callback] Token exchange failed:', tokenData)
      throw new Error('Failed to exchange authorization code')
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

    if (!longLivedResponse.ok || !longLivedData.access_token) {
      console.error('[meta/callback] Long-lived token exchange failed:', longLivedData)
      throw new Error('Failed to get long-lived token')
    }

    const longLivedToken = longLivedData.access_token
    // Default to 60 days if expires_in not provided
    const expiresIn = longLivedData.expires_in || 60 * 24 * 60 * 60
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    // Step 3: Get Facebook Pages with Instagram Business Accounts
    console.log('[meta/callback] Fetching connected Instagram accounts...')
    const pagesUrl = new URL(`${META_GRAPH_API}/me/accounts`)
    pagesUrl.searchParams.set('access_token', longLivedToken)
    pagesUrl.searchParams.set('fields', 'id,name,instagram_business_account{id,username,name,profile_picture_url},access_token')

    const pagesResponse = await fetch(pagesUrl.toString())
    const pagesData = await pagesResponse.json()

    if (!pagesResponse.ok) {
      console.error('[meta/callback] Failed to fetch pages:', pagesData)
      throw new Error('Failed to fetch connected pages')
    }

    // Find pages with Instagram Business accounts
    const pages: FacebookPage[] = pagesData.data || []
    const instagramAccounts: Array<{
      pageId: string
      pageName: string
      pageToken: string
      instagram: InstagramAccount
    }> = []

    for (const page of pages) {
      if (page.instagram_business_account) {
        instagramAccounts.push({
          pageId: page.id,
          pageName: page.name,
          pageToken: page.access_token,
          instagram: page.instagram_business_account,
        })
      }
    }

    console.log(`[meta/callback] Found ${instagramAccounts.length} Instagram Business accounts`)

    if (instagramAccounts.length === 0) {
      return NextResponse.redirect(
        new URL('/dashboard?error=No+Instagram+Business+accounts+found.+Make+sure+your+Instagram+is+connected+to+a+Facebook+Page.', request.url)
      )
    }

    // Use the first Instagram account (could add UI to select if multiple)
    const primaryAccount = instagramAccounts[0]

    // Step 4: Save to database
    const supabase = await createAdminClient()
    
    const { error: updateError } = await supabase
      .from('models')
      .update({
        instagram_access_token: primaryAccount.pageToken, // Use page token for insights
        instagram_business_id: primaryAccount.instagram.id,
        instagram_username: primaryAccount.instagram.username,
        instagram_token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', modelId)

    if (updateError) {
      console.error('[meta/callback] Database update failed:', updateError)
      throw new Error('Failed to save Instagram credentials')
    }

    console.log(`[meta/callback] Successfully connected @${primaryAccount.instagram.username} to model ${modelId}`)

    // Redirect back to dashboard with success message
    return NextResponse.redirect(
      new URL(`/dashboard?success=Instagram+connected+successfully!+@${primaryAccount.instagram.username}`, request.url)
    )
  } catch (error) {
    console.error('[meta/callback] Error:', error)
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`, request.url)
    )
  }
}
