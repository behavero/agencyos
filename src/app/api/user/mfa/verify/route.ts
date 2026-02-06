import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/user/mfa/verify
 * Verify a TOTP code to complete enrollment (step 2)
 * Also used to verify during login challenge
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

    const { factorId, code } = await request.json()

    if (!factorId || !code) {
      return NextResponse.json({ error: 'factorId and code are required' }, { status: 400 })
    }

    // Create a challenge for this factor
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    })

    if (challengeError) {
      return NextResponse.json({ error: challengeError.message }, { status: 400 })
    }

    // Verify the code against the challenge
    const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    })

    if (verifyError) {
      return NextResponse.json({ error: verifyError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      verified: true,
    })
  } catch (error) {
    console.error('[MFA Verify API] Error:', error)
    return NextResponse.json({ error: 'Failed to verify MFA code' }, { status: 500 })
  }
}
