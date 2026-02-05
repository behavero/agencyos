import { randomBytes, createHash } from 'crypto'

/**
 * Fanvue OAuth utilities
 *
 * Based on the official Fanvue App Starter Kit:
 * https://github.com/fanvue/fanvue-app-starter/blob/main/src/lib/oauth.ts
 *
 * Auth URL: https://auth.fanvue.com/oauth2/auth
 * Token URL: https://auth.fanvue.com/oauth2/token
 *
 * IMPORTANT: The scopes you request must EXACTLY match what you selected
 * in the Fanvue developer UI for your app.
 * Set the OAUTH_SCOPES environment variable to match your app config.
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

/**
 * System scopes that are always required.
 * Per the Fanvue docs: "Do not remove these, your app won't work without them"
 */
const DEFAULT_SCOPES = 'openid offline_access offline'

/**
 * Get the OAuth client ID from environment variables.
 */
export function getClientId(): string {
  return process.env.FANVUE_CLIENT_ID || process.env.NEXT_PUBLIC_FANVUE_CLIENT_ID || ''
}

/**
 * Get the OAuth client secret from environment variables.
 */
export function getClientSecret(): string {
  return process.env.FANVUE_CLIENT_SECRET || ''
}

/**
 * Build the Fanvue authorization URL.
 *
 * Scopes are read from the OAUTH_SCOPES environment variable.
 * These must exactly match what's configured in the Fanvue developer portal.
 *
 * Valid scopes: read:self, read:chat, write:chat, read:fan, read:creator,
 *   write:creator, read:media, write:media, write:post, read:insights
 */
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
  // Use provided scopes, or fall back to OAUTH_SCOPES env var, or minimal default
  const appScopes = scopes || process.env.OAUTH_SCOPES || 'read:self'

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: `${DEFAULT_SCOPES} ${appScopes}`,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return `${OAUTH_ISSUER_BASE_URL}/oauth2/auth?${params.toString()}`
}

/**
 * Exchange authorization code for tokens.
 *
 * Matches the official Fanvue App Starter Kit implementation:
 * - client_id in the POST body
 * - client_id:client_secret as Authorization: Basic header
 */
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

/**
 * Refresh an access token.
 *
 * Matches the official Fanvue App Starter Kit implementation:
 * - client_id in the POST body
 * - client_id:client_secret as Authorization: Basic header
 */
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
    console.error('[OAuth] Token refresh failed:', res.status, text)
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
