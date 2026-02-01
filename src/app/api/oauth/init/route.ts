import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Store PKCE parameters in HTTP-only cookies
 * Called by the client before redirecting to Fanvue
 */
export async function POST(request: NextRequest) {
  try {
    const { codeVerifier, state } = await request.json()

    const cookieStore = await cookies()
    
    cookieStore.set('fanvue_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })
    
    cookieStore.set('fanvue_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[OAuth Init] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
