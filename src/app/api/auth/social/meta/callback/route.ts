import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * Meta (Instagram/Facebook) OAuth Callback Route
 * 
 * Handles the OAuth callback, exchanges code for tokens,
 * converts to long-lived token, and fetches Instagram accounts.
 */

const GRAPH_API_VERSION = 'v19.0'
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

function getRedirectUri(): string {
  if (process.env.NODE_ENV === 'production') {
    return 'https://onyxos.vercel.app/api/auth/social/meta/callback'
  }
  return `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/social/meta/callback`
}

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
}

interface LongLivedTokenResponse {
  access_token: string
  token_type: string
  expires_in: number // 60 days in seconds
}

interface PageData {
  id: string
  name: string
  access_token: string
  instagram_business_account?: {
    id: string
  }
}

interface InstagramAccount {
  id: string
  username: string
  profile_picture_url?: string
  followers_count?: number
  media_count?: number
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorReason = searchParams.get('error_reason')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('[Meta OAuth] Error:', { error, errorReason, errorDescription })
    return NextResponse.redirect(
      new URL(`/dashboard?error=meta_${error}`, request.url)
    )
  }

  if (!code) {
    console.error('[Meta OAuth] No code received')
    return NextResponse.redirect(
      new URL('/dashboard?error=meta_no_code', request.url)
    )
  }

  try {
    const cookieStore = await cookies()
    const storedState = cookieStore.get('meta_oauth_state')?.value
    const modelId = cookieStore.get('meta_oauth_model_id')?.value

    // Verify state
    if (!storedState || storedState !== state) {
      console.error('[Meta OAuth] State mismatch')
      return NextResponse.redirect(
        new URL('/dashboard?error=meta_state_mismatch', request.url)
      )
    }

    // Clear cookies
    cookieStore.delete('meta_oauth_state')
    cookieStore.delete('meta_oauth_model_id')

    const clientId = process.env.META_CLIENT_ID
    const clientSecret = process.env.META_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('Missing Meta credentials')
    }

    const redirectUri = getRedirectUri()

    // Step 1: Exchange code for short-lived token
    console.log('[Meta OAuth] Exchanging code for token...')
    const tokenUrl = new URL(`${GRAPH_API_BASE}/oauth/access_token`)
    tokenUrl.searchParams.set('client_id', clientId)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('client_secret', clientSecret)
    tokenUrl.searchParams.set('code', code)

    const tokenResponse = await fetch(tokenUrl.toString())
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('[Meta OAuth] Token exchange error:', errorData)
      throw new Error('Failed to exchange code for token')
    }

    const tokenData: TokenResponse = await tokenResponse.json()
    console.log('[Meta OAuth] Got short-lived token')

    // Step 2: Exchange for long-lived token (60 days)
    console.log('[Meta OAuth] Exchanging for long-lived token...')
    const longLivedUrl = new URL(`${GRAPH_API_BASE}/oauth/access_token`)
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longLivedUrl.searchParams.set('client_id', clientId)
    longLivedUrl.searchParams.set('client_secret', clientSecret)
    longLivedUrl.searchParams.set('fb_exchange_token', tokenData.access_token)

    const longLivedResponse = await fetch(longLivedUrl.toString())
    if (!longLivedResponse.ok) {
      const errorData = await longLivedResponse.json()
      console.error('[Meta OAuth] Long-lived token error:', errorData)
      throw new Error('Failed to get long-lived token')
    }

    const longLivedData: LongLivedTokenResponse = await longLivedResponse.json()
    console.log('[Meta OAuth] Got long-lived token, expires in:', longLivedData.expires_in, 'seconds')

    // Step 3: Fetch connected Pages with Instagram accounts
    console.log('[Meta OAuth] Fetching connected Pages...')
    const pagesUrl = new URL(`${GRAPH_API_BASE}/me/accounts`)
    pagesUrl.searchParams.set('access_token', longLivedData.access_token)
    pagesUrl.searchParams.set('fields', 'id,name,access_token,instagram_business_account{id,username,profile_picture_url,followers_count,media_count}')

    const pagesResponse = await fetch(pagesUrl.toString())
    if (!pagesResponse.ok) {
      const errorData = await pagesResponse.json()
      console.error('[Meta OAuth] Pages fetch error:', errorData)
      throw new Error('Failed to fetch Pages')
    }

    const pagesData = await pagesResponse.json()
    const pages: PageData[] = pagesData.data || []

    console.log('[Meta OAuth] Found', pages.length, 'Pages')

    // Get current user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        new URL('/login?error=not_authenticated', request.url)
      )
    }

    const adminClient = await createAdminClient()

    // Step 4: Save connections for each Instagram account found
    let connectedCount = 0

    for (const page of pages) {
      if (page.instagram_business_account) {
        const igAccount = page.instagram_business_account as unknown as InstagramAccount

        console.log('[Meta OAuth] Found Instagram account:', igAccount.username)

        // Calculate expiry date (60 days from now)
        const expiresAt = new Date(Date.now() + longLivedData.expires_in * 1000).toISOString()

        const connectionData = {
          model_id: modelId || null,
          platform: 'instagram' as const,
          platform_user_id: igAccount.id,
          platform_username: igAccount.username || 'Unknown',
          access_token: longLivedData.access_token,
          refresh_token: null, // Meta uses long-lived tokens, not refresh tokens
          token_expires_at: expiresAt,
          scopes: ['instagram_basic', 'instagram_manage_insights', 'pages_read_engagement'],
          metadata: {
            pageId: page.id,
            pageName: page.name,
            pageAccessToken: page.access_token,
            profilePicture: igAccount.profile_picture_url,
            followersCount: igAccount.followers_count,
            mediaCount: igAccount.media_count,
          },
          is_active: true,
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // Upsert connection
        const { data: existing } = await adminClient
          .from('social_connections')
          .select('id')
          .eq('platform', 'instagram')
          .eq('platform_user_id', igAccount.id)
          .single()

        if (existing) {
          await adminClient
            .from('social_connections')
            .update(connectionData)
            .eq('id', existing.id)
        } else {
          await adminClient
            .from('social_connections')
            .insert(connectionData)
        }

        // Save initial stats
        if (igAccount.followers_count) {
          const today = new Date().toISOString().split('T')[0]
          const statsData = {
            model_id: modelId || null,
            platform: 'instagram' as const,
            followers: igAccount.followers_count,
            views: 0, // Will be fetched via insights
            date: today,
            updated_at: new Date().toISOString(),
          }

          const { data: existingStats } = await adminClient
            .from('social_stats')
            .select('id')
            .eq('platform', 'instagram')
            .eq('date', today)
            .eq('model_id', modelId || null)
            .single()

          if (existingStats) {
            await adminClient
              .from('social_stats')
              .update(statsData)
              .eq('id', existingStats.id)
          } else {
            await adminClient
              .from('social_stats')
              .insert(statsData)
          }
        }

        connectedCount++
      }
    }

    console.log('[Meta OAuth] Connected', connectedCount, 'Instagram accounts')

    if (connectedCount === 0) {
      return NextResponse.redirect(
        new URL('/dashboard?error=meta_no_instagram', request.url)
      )
    }

    return NextResponse.redirect(
      new URL('/dashboard?success=instagram_connected', request.url)
    )
  } catch (error) {
    console.error('[Meta OAuth] Callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard?error=meta_callback_failed', request.url)
    )
  }
}
