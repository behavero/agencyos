import { randomBytes, createHash } from 'crypto'

/**
 * Fanvue OAuth utilities - copied from official fanvue-app-starter
 * https://github.com/fanvue/fanvue-app-starter
 */

const OAUTH_ISSUER_BASE_URL = 'https://auth.fanvue.com'

function base64url(input: Buffer) {
  return input.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function generatePkce() {
  const verifier = base64url(randomBytes(32))
  const challenge = base64url(createHash('sha256').update(verifier).digest())
  return { verifier, challenge, method: 'S256' as const }
}

// Do not remove these, your app won't work without them
const DEFAULT_SCOPES = 'openid offline_access offline'

export function getAuthorizeUrl({
  state,
  codeChallenge,
  clientId,
  redirectUri,
  scopes,
}: {
  state: string
  codeChallenge: string
  clientId: string
  redirectUri: string
  scopes?: string
}) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: `${DEFAULT_SCOPES} ${scopes || 'read:self read:creator read:insights read:chat write:chat read:fan read:media read:post write:post read:agency read:tracking_links write:tracking_links'}`,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${OAUTH_ISSUER_BASE_URL}/oauth2/auth?${params.toString()}`
}

export async function exchangeCodeForToken({
  code,
  codeVerifier,
  redirectUri,
  clientId,
  clientSecret,
}: {
  code: string
  codeVerifier: string
  redirectUri: string
  clientId: string
  clientSecret: string
}) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  })

  const res = await fetch(`${OAUTH_ISSUER_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: params.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[OAuth] Token exchange failed:', res.status, text)
    throw new Error(`Token exchange failed: ${res.status} ${text}`)
  }

  return (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
    token_type: string
    scope?: string
    id_token?: string
  }
}

export async function refreshAccessToken({
  refreshToken,
  clientId,
  clientSecret,
}: {
  refreshToken: string
  clientId: string
  clientSecret: string
}) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  })

  const res = await fetch(`${OAUTH_ISSUER_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: params.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token refresh failed: ${res.status} ${text}`)
  }

  return (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
    token_type: string
    scope?: string
    id_token?: string
  }
}
