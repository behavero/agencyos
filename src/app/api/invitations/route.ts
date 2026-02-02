import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'
import crypto from 'crypto'

const CreateInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum([
    'owner',
    'admin',
    'grandmaster',
    'paladin',
    'alchemist',
    'ranger',
    'rogue',
    'chatter',
    'smm',
    'recruiter',
  ]),
})

/**
 * GET /api/invitations
 * List all invitations for the agency
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = await createAdminClient()

    const { data: invitations } = await adminSupabase
      .from('invitations')
      .select('*')
      .eq('agency_id', profile.agency_id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error('GET /api/invitations error:', error)
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
  }
}

/**
 * POST /api/invitations
 * Create a new magic link invitation
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validated = CreateInvitationSchema.parse(body)

    // Check if user already exists
    const adminSupabase = await createAdminClient()

    const { data: existingProfile } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('email', validated.email)
      .single()

    if (existingProfile) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Check for pending invites
    const { data: pendingInvite } = await adminSupabase
      .from('invitations')
      .select('id')
      .eq('agency_id', profile.agency_id)
      .eq('email', validated.email)
      .eq('status', 'pending')
      .single()

    if (pendingInvite) {
      return NextResponse.json({ error: 'Invitation already sent to this email' }, { status: 400 })
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex')

    // Set expiration (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invitation
    const { data: invitation, error } = await adminSupabase
      .from('invitations')
      .insert({
        agency_id: profile.agency_id,
        email: validated.email,
        role: validated.role,
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        invited_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Generate magic link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const magicLink = `${baseUrl}/join?token=${token}`

    return NextResponse.json({
      invitation,
      magic_link: magicLink,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    console.error('POST /api/invitations error:', error)
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }
}

/**
 * DELETE /api/invitations/[id]
 * Revoke an invitation
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(request.url)
    const invitationId = url.searchParams.get('id')

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID required' }, { status: 400 })
    }

    const adminSupabase = await createAdminClient()

    const { error } = await adminSupabase
      .from('invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId)
      .eq('agency_id', profile.agency_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/invitations error:', error)
    return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 })
  }
}
