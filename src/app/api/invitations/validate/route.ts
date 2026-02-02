import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/invitations/validate?token=xxx
 * Validate an invitation token
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }
    
    const supabase = await createAdminClient()
    
    const { data: invitation } = await supabase
      .from('invitations')
      .select(`
        *,
        agency:agencies(id, name)
      `)
      .eq('token', token)
      .single()
    
    if (!invitation) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }
    
    // Check if already accepted
    if (invitation.status === 'accepted') {
      return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 })
    }
    
    // Check if revoked
    if (invitation.status === 'revoked') {
      return NextResponse.json({ error: 'Invitation was revoked' }, { status: 400 })
    }
    
    // Check if expired
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    
    if (now > expiresAt) {
      // Mark as expired
      await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)
      
      return NextResponse.json({ error: 'Invitation expired' }, { status: 400 })
    }
    
    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        agency_name: invitation.agency?.name,
        agency_id: invitation.agency_id,
      },
    })
  } catch (error) {
    console.error('GET /api/invitations/validate error:', error)
    return NextResponse.json(
      { error: 'Failed to validate invitation' },
      { status: 500 }
    )
  }
}
