import { redirect } from 'next/navigation'
import { FANVUE_CONFIG } from '@/lib/fanvue/config'

export async function GET() {
  const params = new URLSearchParams({
    client_id: FANVUE_CONFIG.clientId,
    redirect_uri: FANVUE_CONFIG.redirectUri,
    response_type: 'code',
    scope: FANVUE_CONFIG.scopes.join(' '),
  })

  const authUrl = `${FANVUE_CONFIG.endpoints.authorize}?${params.toString()}`
  
  console.log('[Fanvue OAuth] Redirecting to:', authUrl)
  console.log('[Fanvue OAuth] Redirect URI:', FANVUE_CONFIG.redirectUri)
  
  redirect(authUrl)
}
