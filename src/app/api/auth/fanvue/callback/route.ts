import { FANVUE_CONFIG } from '@/lib/fanvue/config'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/dashboard?error=fanvue_oauth_failed', request.url))
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch(FANVUE_CONFIG.endpoints.token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: FANVUE_CONFIG.redirectUri,
        client_id: FANVUE_CONFIG.clientId,
        client_secret: FANVUE_CONFIG.clientSecret,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Token exchange failed')
    }

    const tokens = await tokenResponse.json()

    // Get user info from Fanvue
    const userResponse = await fetch(FANVUE_CONFIG.endpoints.user, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info')
    }

    const fanvueUser = await userResponse.json()

    // Store in Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/?error=not_logged_in', request.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    // Create model entry
    await supabase.from('models').insert({
      agency_id: profile?.agency_id,
      name: fanvueUser.username || fanvueUser.name,
      avatar_url: fanvueUser.avatar,
      fanvue_api_key: tokens.access_token,
      status: 'active',
    })

    return NextResponse.redirect(new URL('/dashboard?success=model_added', request.url))
  } catch (error) {
    console.error('Fanvue OAuth error:', error)
    return NextResponse.redirect(new URL('/dashboard?error=fanvue_oauth_failed', request.url))
  }
}
