import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/user/mfa
 * Get the current user's MFA factors (enrolled TOTP devices)
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const totpFactors = data.totp || []
    const isEnabled = totpFactors.some((f: { status: string }) => f.status === 'verified')

    return NextResponse.json({
      enabled: isEnabled,
      factors: totpFactors.map((f: { id: string; friendly_name?: string; status: string }) => ({
        id: f.id,
        friendlyName: f.friendly_name || 'Authenticator',
        status: f.status,
      })),
    })
  } catch (error) {
    console.error('[MFA API] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch MFA status' }, { status: 500 })
  }
}

/**
 * POST /api/user/mfa
 * Enroll a new TOTP factor (step 1: generate QR code)
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'OnyxOS Authenticator',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      factorId: data.id,
      qrCode: data.totp.qr_code, // SVG data URI for QR code
      secret: data.totp.secret, // Manual entry secret
      uri: data.totp.uri, // otpauth:// URI
    })
  } catch (error) {
    console.error('[MFA API] POST error:', error)
    return NextResponse.json({ error: 'Failed to enroll MFA' }, { status: 500 })
  }
}

/**
 * DELETE /api/user/mfa
 * Unenroll (disable) a TOTP factor
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

    const { factorId } = await request.json()
    if (!factorId) {
      return NextResponse.json({ error: 'factorId is required' }, { status: 400 })
    }

    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[MFA API] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to disable MFA' }, { status: 500 })
  }
}
