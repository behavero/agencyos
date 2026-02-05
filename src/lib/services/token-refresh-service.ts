/**
 * Proactive Token Refresh Service
 *
 * Automatically refreshes Fanvue tokens BEFORE they expire
 * Runs via cron job every 30 minutes
 * Prevents expired token issues
 */

import { createAdminClient } from '@/lib/supabase/server'
import { refreshAccessToken, getClientId, getClientSecret } from '@/lib/fanvue/oauth'

interface RefreshResult {
  modelId: string
  success: boolean
  error?: string
  newExpiry?: Date
}

/**
 * Proactively refresh all tokens expiring within 2 hours
 * Called by cron job every 30 minutes
 */
export async function proactiveTokenRefresh(): Promise<{
  refreshed: number
  failed: number
  results: RefreshResult[]
}> {
  const supabase = createAdminClient()
  const results: RefreshResult[] = []

  // Find all models with tokens expiring within 2 hours
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
  const now = new Date().toISOString()

  const { data: models, error } = await supabase
    .from('models')
    .select('id, name, fanvue_refresh_token, fanvue_token_expires_at')
    .not('fanvue_refresh_token', 'is', null)
    .lte('fanvue_token_expires_at', twoHoursFromNow)
    .gte('fanvue_token_expires_at', now)

  if (error) {
    console.error('[Proactive Refresh] Failed to fetch models:', error)
    throw new Error(`Failed to fetch models: ${error.message}`)
  }

  console.log(`[Proactive Refresh] Found ${models?.length || 0} models needing refresh`)

  let refreshed = 0
  let failed = 0

  for (const model of models || []) {
    try {
      const result = await refreshSingleToken(model.id, model.fanvue_refresh_token!)
      results.push(result)
      if (result.success) refreshed++
      else failed++
    } catch (error: any) {
      results.push({
        modelId: model.id,
        success: false,
        error: error.message,
      })
      failed++
    }
  }

  console.log(`[Proactive Refresh] Complete: ${refreshed} refreshed, ${failed} failed`)

  return { refreshed, failed, results }
}

/**
 * Refresh a single model's token
 */
async function refreshSingleToken(modelId: string, refreshToken: string): Promise<RefreshResult> {
  const supabase = createAdminClient()

  try {
    const clientId = getClientId()
    const clientSecret = getClientSecret()

    if (!clientId || !clientSecret) {
      throw new Error(
        'Fanvue OAuth credentials not configured (FANVUE_CLIENT_ID / FANVUE_CLIENT_SECRET)'
      )
    }

    console.log(`[Proactive Refresh] Refreshing token for model ${modelId}...`)

    const tokenData = await refreshAccessToken({
      refreshToken,
      clientId,
      clientSecret,
    })

    // Calculate new expiry (subtract 5 min buffer)
    const expiresAt = new Date(Date.now() + (tokenData.expires_in - 300) * 1000)

    // Update database
    const { error } = await supabase
      .from('models')
      .update({
        fanvue_access_token: tokenData.access_token,
        fanvue_refresh_token: tokenData.refresh_token || refreshToken,
        fanvue_token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', modelId)

    if (error) {
      throw new Error(`Database update failed: ${error.message}`)
    }

    console.log(
      `[Proactive Refresh] ✅ Model ${modelId} token refreshed, expires: ${expiresAt.toISOString()}`
    )

    return {
      modelId,
      success: true,
      newExpiry: expiresAt,
    }
  } catch (error: any) {
    console.error(`[Proactive Refresh] ❌ Model ${modelId} failed:`, error.message)
    return {
      modelId,
      success: false,
      error: error.message,
    }
  }
}

/**
 * Get sync health status for dashboard
 */
export async function getTokenHealth(): Promise<{
  total: number
  healthy: number
  expiringSoon: number
  expired: number
}> {
  const supabase = createAdminClient()
  const now = new Date().toISOString()
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

  const { data: models } = await supabase
    .from('models')
    .select('fanvue_token_expires_at')
    .not('fanvue_access_token', 'is', null)

  const total = models?.length || 0
  let healthy = 0
  let expiringSoon = 0
  let expired = 0

  for (const model of models || []) {
    const expiresAt = model.fanvue_token_expires_at
    if (!expiresAt) {
      expired++
      continue
    }

    if (expiresAt < now) {
      expired++
    } else if (expiresAt < twoHoursFromNow) {
      expiringSoon++
    } else {
      healthy++
    }
  }

  return { total, healthy, expiringSoon, expired }
}
