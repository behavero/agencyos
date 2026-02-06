/**
 * Fanvue OAuth Authentication Service
 * Phase 57 - Official OAuth 2.0 Implementation
 * Based on: https://github.com/fanvue/fanvue-app-starter
 */

import { createAdminClient } from '@/lib/supabase/server'
import { refreshAccessToken, getClientId, getClientSecret } from '@/lib/fanvue/oauth'
import { getAgencyFanvueToken } from '@/lib/services/agency-fanvue-auth'

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

/**
 * Gets a valid access token for a specific model
 * Automatically refreshes if expired or expiring soon
 */
export async function getModelAccessToken(modelId: string): Promise<string> {
  const supabase = createAdminClient()

  // Get model's token info
  const { data: model, error } = await supabase
    .from('models')
    .select('agency_id, fanvue_access_token, fanvue_refresh_token, fanvue_token_expires_at')
    .eq('id', modelId)
    .single()

  if (error || !model) {
    throw new Error(`Model not found: ${modelId}`)
  }

  // If model has no personal token, fall back to agency connection token
  // This is common for agency-imported creators who don't have individual OAuth tokens
  if (!model.fanvue_access_token) {
    if (model.agency_id) {
      console.log(`[fanvue-auth] Model ${modelId} has no personal token, trying agency token...`)
      return getAgencyFanvueToken(model.agency_id)
    }
    throw new Error(`Model ${modelId} has no Fanvue access token and no agency connection`)
  }

  // Check if token is expired or expiring soon (within 1 hour)
  const expiresAt = model.fanvue_token_expires_at ? new Date(model.fanvue_token_expires_at) : null
  const now = new Date()
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

  const needsRefresh = expiresAt && expiresAt < oneHourFromNow

  if (!needsRefresh) {
    console.log(`✅ Model ${modelId} token is valid`)
    return model.fanvue_access_token
  }

  // Token needs refresh
  if (!model.fanvue_refresh_token) {
    throw new Error(
      `Model ${modelId} token is expired but no refresh token available. ` +
        'User needs to reconnect their Fanvue account.'
    )
  }

  console.log(`🔄 Refreshing token for model ${modelId}...`)

  try {
    const refreshedToken = await refreshFanvueToken(model.fanvue_refresh_token)

    // Update database with new tokens
    await supabase.rpc('update_fanvue_token', {
      p_model_id: modelId,
      p_access_token: refreshedToken.access_token,
      p_refresh_token: refreshedToken.refresh_token || model.fanvue_refresh_token,
      p_expires_in: refreshedToken.expires_in || 3600,
    })

    console.log(`✅ Token refreshed successfully for model ${modelId}`)
    return refreshedToken.access_token
  } catch (error: any) {
    console.error(`❌ Failed to refresh token for model ${modelId}:`, error.message)
    throw new Error(
      `Token refresh failed: ${error.message}. User may need to reconnect their Fanvue account.`
    )
  }
}

/**
 * Refreshes a Fanvue access token using a refresh token
 * Uses the official OAuth helper from fanvue-app-starter
 */
async function refreshFanvueToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}> {
  const clientId = getClientId()
  const clientSecret = getClientSecret()

  if (!clientId || !clientSecret) {
    throw new Error(
      'Fanvue OAuth credentials not configured (FANVUE_CLIENT_ID / FANVUE_CLIENT_SECRET)'
    )
  }

  console.log('🔄 Refreshing Fanvue access token using official OAuth helper...')

  const tokenData = await refreshAccessToken({
    refreshToken,
    clientId,
    clientSecret,
  })

  console.log('✅ Token refreshed successfully')

  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in,
    token_type: tokenData.token_type,
  }
}
