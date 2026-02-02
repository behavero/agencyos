import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const AcceptInvitationSchema = z.object({
  token: z.string(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
})

/**
 * POST /api/invitations/accept
 * Accept an invitation and create user account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = AcceptInvitationSchema.parse(body)
    
    const supabase = await createAdminClient()
    
    // Validate invitation
    const { data: invitation } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', validated.token)
      .eq('status', 'pending')
      .single()
    
    if (!invitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 })
    }
    
    // Check expiration
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    
    if (now > expiresAt) {
      await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)
      
      return NextResponse.json({ error: 'Invitation expired' }, { status: 400 })
    }
    
    // Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password: validated.password,
      email_confirm: true, // Auto-confirm email since they have a valid invite
      user_metadata: {
        username: validated.username,
      },
    })
    
    if (authError) {
      console.error('Failed to create auth user:', authError)
      return NextResponse.json(
        { error: 'Failed to create account: ' + authError.message },
        { status: 400 }
      )
    }
    
    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }
    
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        agency_id: invitation.agency_id,
        username: validated.username,
        email: invitation.email,
        role: invitation.role,
      })
    
    if (profileError) {
      console.error('Failed to create profile:', profileError)
      // Cleanup: Delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      )
    }
    
    // Mark invitation as accepted
    await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: authData.user.id,
      })
      .eq('id', invitation.id)
    
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        username: validated.username,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('POST /api/invitations/accept error:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}
