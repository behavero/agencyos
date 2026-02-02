/**
 * Fanvue OAuth Client Credentials Flow
 * Phase 54C - Official Authentication Service
 * Based on: https://github.com/fanvue/fanvue-app-starter
 */

interface FanvueTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope?: string
}

interface FanvueTokenCache {
  token: string
  expiresAt: number
}

// In-memory token cache (resets on server restart, but that's fine)
let tokenCache: FanvueTokenCache | null = null

/**
 * Gets a valid Fanvue access token using OAuth Client Credentials flow
 * Automatically refreshes if expired
 */
export async function getFanvueServerToken(): Promise<string> {
  // Check if we have a valid cached token
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    console.log('✅ Using cached Fanvue token')
    return tokenCache.token
  }

  console.log('🔄 Fetching fresh Fanvue token via OAuth...')

  // Validate environment variables
  const clientId = process.env.FANVUE_CLIENT_ID
  const clientSecret = process.env.FANVUE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      '❌ Missing Fanvue OAuth credentials. Set FANVUE_CLIENT_ID and FANVUE_CLIENT_SECRET in .env.local'
    )
  }

  // Try multiple possible OAuth endpoints (Fanvue's exact endpoint isn't documented)
  const possibleEndpoints = [
    `${process.env.FANVUE_API_URL || 'https://api.fanvue.com'}/oauth/token`, // Most common for API client credentials
    `${process.env.FANVUE_AUTH_URL || 'https://auth.fanvue.com'}/oauth/token`,
    `${process.env.FANVUE_AUTH_URL || 'https://auth.fanvue.com'}/token`,
  ]

  let lastError: any = null

  // Try each endpoint until one works
  for (const authUrl of possibleEndpoints) {
    try {
      console.log(`🔄 Trying OAuth endpoint: ${authUrl}`)

      // Make the OAuth token request
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          // Scopes needed for earnings data
          scope: 'read:self read:earnings read:transactions',
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.warn(`⚠️ Endpoint ${authUrl} failed: ${response.status}`)
        lastError = new Error(`${response.status} ${response.statusText}: ${errorText}`)
        continue // Try next endpoint
      }

      const data: FanvueTokenResponse = await response.json()

      if (!data.access_token) {
        console.warn(`⚠️ Endpoint ${authUrl} returned no token`)
        lastError = new Error('No access_token in response')
        continue
      }

      // SUCCESS! Cache the token
      const expiresIn = data.expires_in || 3600
      tokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + (expiresIn - 300) * 1000,
      }

      console.log('✅ Got fresh Fanvue token from:', authUrl, {
        token_preview: data.access_token.substring(0, 20) + '...',
        expires_in: expiresIn,
        scope: data.scope,
      })

      return data.access_token
    } catch (error: any) {
      console.warn(`⚠️ Error with endpoint ${authUrl}:`, error.message)
      lastError = error
      continue
    }
  }

  // All endpoints failed
  console.error('❌ All OAuth endpoints failed. Last error:', lastError)
  throw lastError || new Error('Failed to fetch Fanvue OAuth token from any endpoint')
}

/**
 * Clears the token cache (useful for testing)
 */
export function clearFanvueTokenCache() {
  tokenCache = null
  console.log('🗑️ Fanvue token cache cleared')
}
