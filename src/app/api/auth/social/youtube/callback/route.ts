import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { cookies } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * YouTube OAuth Callback Route
 * 
 * Handles the OAuth 2.0 callback from Google, exchanges the code for tokens,
 * fetches channel info, and stores the connection in the database.
 */

function getRedirectUri(): string {
  if (process.env.NODE_ENV === 'production') {
    return 'https://onyxos.vercel.app/api/auth/social/youtube/callback'
  }
  return `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/social/youtube/callback`
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    console.error('[YouTube OAuth] Error from Google:', error)
    return NextResponse.redirect(
      new URL(`/dashboard?error=youtube_${error}`, request.url)
    )
  }

  if (!code) {
    console.error('[YouTube OAuth] No code received')
    return NextResponse.redirect(
      new URL('/dashboard?error=youtube_no_code', request.url)
    )
  }

  try {
    const cookieStore = await cookies()
    const storedState = cookieStore.get('youtube_oauth_state')?.value
    const modelId = cookieStore.get('youtube_oauth_model_id')?.value

    // Verify state for CSRF protection
    if (!storedState || storedState !== state) {
      console.error('[YouTube OAuth] State mismatch')
      return NextResponse.redirect(
        new URL('/dashboard?error=youtube_state_mismatch', request.url)
      )
    }

    // Clear the state cookies
    cookieStore.delete('youtube_oauth_state')
    cookieStore.delete('youtube_oauth_model_id')

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('Missing Google credentials')
    }

    const redirectUri = getRedirectUri()

    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    )

    // Exchange code for tokens
    console.log('[YouTube OAuth] Exchanging code for tokens...')
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    console.log('[YouTube OAuth] Got tokens:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    })

    // Fetch channel info
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client })
    const channelResponse = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      mine: true,
    })

    const channel = channelResponse.data.items?.[0]
    if (!channel) {
      console.error('[YouTube OAuth] No channel found for this account')
      return NextResponse.redirect(
        new URL('/dashboard?error=youtube_no_channel', request.url)
      )
    }

    console.log('[YouTube OAuth] Channel found:', {
      id: channel.id,
      title: channel.snippet?.title,
      subscribers: channel.statistics?.subscriberCount,
    })

    // Get current user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        new URL('/login?error=not_authenticated', request.url)
      )
    }

    // Get user's agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.redirect(
        new URL('/dashboard?error=no_agency', request.url)
      )
    }

    // Use admin client to bypass RLS
    const adminClient = await createAdminClient()

    // Upsert the connection
    const connectionData = {
      model_id: modelId || null,
      platform: 'youtube' as const,
      platform_user_id: channel.id,
      platform_username: channel.snippet?.title || 'Unknown Channel',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokens.expiry_date 
        ? new Date(tokens.expiry_date).toISOString() 
        : null,
      scopes: tokens.scope?.split(' ') || [],
      metadata: {
        channelId: channel.id,
        customUrl: channel.snippet?.customUrl,
        thumbnail: channel.snippet?.thumbnails?.default?.url,
        country: channel.snippet?.country,
      },
      is_active: true,
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Check if connection exists
    const { data: existing } = await adminClient
      .from('social_connections')
      .select('id')
      .eq('platform', 'youtube')
      .eq('platform_user_id', channel.id)
      .single()

    if (existing) {
      // Update existing connection
      await adminClient
        .from('social_connections')
        .update(connectionData)
        .eq('id', existing.id)
    } else {
      // Insert new connection
      await adminClient
        .from('social_connections')
        .insert(connectionData)
    }

    // Also save initial stats to social_stats
    const today = new Date().toISOString().split('T')[0]
    const statsData = {
      model_id: modelId || null,
      platform: 'youtube' as const,
      followers: parseInt(channel.statistics?.subscriberCount || '0', 10),
      views: parseInt(channel.statistics?.viewCount || '0', 10),
      date: today,
      updated_at: new Date().toISOString(),
    }

    // Upsert stats (one per platform per day)
    const { data: existingStats } = await adminClient
      .from('social_stats')
      .select('id')
      .eq('platform', 'youtube')
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

    console.log('[YouTube OAuth] Connection saved successfully!')

    // Redirect to success
    return NextResponse.redirect(
      new URL('/dashboard?success=youtube_connected', request.url)
    )
  } catch (error) {
    console.error('[YouTube OAuth] Callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard?error=youtube_callback_failed', request.url)
    )
  }
}
