import { FANVUE_CONFIG } from '@/lib/fanvue/config'
import { NextResponse } from 'next/server'

export async function GET() {
  const params = new URLSearchParams({
    client_id: FANVUE_CONFIG.clientId,
    redirect_uri: FANVUE_CONFIG.redirectUri,
    response_type: 'code',
    scope: FANVUE_CONFIG.scopes.join(' '),
  })

  const authUrl = `${FANVUE_CONFIG.endpoints.authorize}?${params.toString()}`
  
  return NextResponse.redirect(authUrl)
}
