import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { authenticateWithCredentials } from '@/lib/fanvue/auth'

/**
 * Fanvue Direct Connection API
 * Authenticates with Fanvue using email/password and stores the tokens
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    console.log('[Fanvue Connect] Attempting to connect account:', email)

    // Get current user (with regular client)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get user's agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json(
        { error: 'No agency found for this user' },
        { status: 400 }
      )
    }

    // Authenticate with Fanvue in the background
    console.log('[Fanvue Connect] Authenticating with Fanvue...')
    const authResult = await authenticateWithCredentials(email, password)

    if (!authResult.success) {
      console.error('[Fanvue Connect] Authentication failed:', authResult.error)
      return NextResponse.json(
        { error: authResult.error || 'Failed to authenticate with Fanvue' },
        { status: 401 }
      )
    }

    console.log('[Fanvue Connect] Authentication successful!')
    const { tokens, user: fanvueUser } = authResult

    // Use admin client to bypass RLS for insert
    const adminClient = createAdminClient()

    // Check if model already exists by email or uuid
    const { data: existingModel } = await adminClient
      .from('models')
      .select('id')
      .eq('agency_id', profile.agency_id)
      .or(`fanvue_user_uuid.eq.${fanvueUser?.uuid},name.ilike.${fanvueUser?.displayName || email.split('@')[0]}`)
      .single()

    if (existingModel) {
      // Update existing model with new tokens
      const { error: updateError } = await adminClient
        .from('models')
        .update({
          fanvue_access_token: tokens?.accessToken,
          fanvue_refresh_token: tokens?.refreshToken,
          fanvue_token_expires_at: tokens?.expiresIn 
            ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingModel.id)

      if (updateError) throw updateError

      return NextResponse.json({
        success: true,
        message: 'Creator tokens refreshed',
        creator: {
          id: existingModel.id,
          name: fanvueUser?.displayName,
          isUpdate: true,
        }
      })
    }

    // Create new model entry with real data
    const { data: newModel, error: insertError } = await adminClient
      .from('models')
      .insert({
        agency_id: profile.agency_id,
        name: fanvueUser?.displayName || email.split('@')[0],
        avatar_url: fanvueUser?.avatarUrl,
        fanvue_user_uuid: fanvueUser?.uuid,
        fanvue_username: fanvueUser?.handle,
        fanvue_access_token: tokens?.accessToken,
        fanvue_refresh_token: tokens?.refreshToken,
        fanvue_token_expires_at: tokens?.expiresIn 
          ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
          : null,
        status: 'active',
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Fanvue Connect] Database error:', insertError)
      throw insertError
    }

    console.log('[Fanvue Connect] Creator connected successfully:', fanvueUser?.displayName)

    return NextResponse.json({
      success: true,
      message: 'Creator connected successfully',
      creator: {
        id: newModel.id,
        name: newModel.name,
        status: newModel.status,
        stats: fanvueUser ? {
          followers: fanvueUser.fanCounts?.followersCount || 0,
          subscribers: fanvueUser.fanCounts?.subscribersCount || 0,
          posts: fanvueUser.contentCounts?.postCount || 0,
          media: (fanvueUser.contentCounts?.imageCount || 0) + 
                 (fanvueUser.contentCounts?.videoCount || 0),
        } : null,
      }
    })

  } catch (error: any) {
    console.error('[Fanvue Connect] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to connect account' },
      { status: 500 }
    )
  }
}
