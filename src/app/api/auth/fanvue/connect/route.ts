import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Fanvue Direct Connection API
 * Connects a Fanvue account using email/password credentials
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

    // Get current user
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

    // TODO: Replace with actual Fanvue API authentication
    // For now, we'll simulate a successful connection
    // The actual implementation would:
    // 1. Call Fanvue's login API with email/password
    // 2. Get the access token and user info
    // 3. Store the token securely
    
    // Simulated Fanvue user data (replace with real API call)
    const fanvueUser = {
      uuid: `fv_${Date.now()}`,
      displayName: email.split('@')[0],
      handle: email.split('@')[0].toLowerCase(),
      avatarUrl: null,
    }

    // Check if model already exists
    const { data: existingModel } = await supabase
      .from('models')
      .select('id')
      .eq('agency_id', profile?.agency_id)
      .ilike('name', fanvueUser.displayName)
      .single()

    if (existingModel) {
      return NextResponse.json(
        { error: 'This creator is already connected' },
        { status: 409 }
      )
    }

    // Create new model entry
    const { data: newModel, error: insertError } = await supabase
      .from('models')
      .insert({
        agency_id: profile?.agency_id,
        name: fanvueUser.displayName,
        avatar_url: fanvueUser.avatarUrl,
        fanvue_api_key: `token_${Date.now()}`, // Would be real token from Fanvue
        fanvue_user_uuid: fanvueUser.uuid,
        status: 'active',
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Fanvue Connect] Database error:', insertError)
      throw insertError
    }

    console.log('[Fanvue Connect] Creator connected successfully:', fanvueUser.displayName)

    return NextResponse.json({
      success: true,
      message: 'Creator connected successfully',
      creator: {
        id: newModel.id,
        name: newModel.name,
        status: newModel.status,
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
