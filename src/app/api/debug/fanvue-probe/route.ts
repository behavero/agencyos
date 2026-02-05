/**
 * DEBUG PROBE - Raw Fanvue API Response
 * Phase 54C - Test Model Tokens + API Access (with Rate Limiting)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchWithRateLimit, getRateLimitInfo } from '@/lib/fanvue/rate-limiter'
import { requireAdminAuth } from '@/lib/utils/debug-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const supabase = createAdminClient()

    // STEP 1: Get the first model with a Fanvue token
    console.log('🔍 Looking for models with Fanvue tokens...')

    const { data: models, error: modelsError } = await supabase
      .from('models')
      .select('id, name, fanvue_username, fanvue_access_token')
      .not('fanvue_access_token', 'is', null)
      .limit(1)

    if (modelsError || !models || models.length === 0) {
      return NextResponse.json(
        {
          phase: 'MODEL_LOOKUP',
          status: 'FAILED',
          error: 'No models with Fanvue tokens found in database',
          hint: 'Connect a Fanvue account first via the dashboard',
          models_error: modelsError?.message,
        },
        { status: 404 }
      )
    }

    const model = models[0]
    const token = model.fanvue_access_token!

    console.log('✅ Found model:', model.name, model.fanvue_username)

    // STEP 2: Test API Access with the model token
    console.log('📊 Testing Fanvue Earnings API...')

    const startDate = new Date('2020-01-01T00:00:00.000Z') // All historical data
    const endDate = new Date() // Up to now

    const url = new URL('https://api.fanvue.com/insights/earnings')
    url.searchParams.set('startDate', startDate.toISOString())
    url.searchParams.set('endDate', endDate.toISOString())
    url.searchParams.set('size', '50') // Max allowed per Fanvue docs

    // Use rate-limit-aware fetch with automatic retry
    const apiResponse = await fetchWithRateLimit(
      url.toString(),
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Fanvue-API-Version': '2025-06-26',
          'Content-Type': 'application/json',
        },
      },
      3 // Max 3 retries on 429
    )

    const status = apiResponse.status
    const rateLimitInfo = getRateLimitInfo(apiResponse)
    const rawData = await apiResponse.json().catch(() => ({
      error: 'Failed to parse JSON response',
    }))

    // STEP 3: Return comprehensive diagnostics
    return NextResponse.json(
      {
        phase: 'COMPLETE_DIAGNOSTICS',
        model_info: {
          id: model.id,
          name: model.name,
          username: model.fanvue_username,
          has_token: true,
          token_preview: `${token.substring(0, 20)}...`,
          token_length: token.length,
        },
        rate_limit: rateLimitInfo
          ? {
              limit: rateLimitInfo.limit,
              remaining: rateLimitInfo.remaining,
              reset_timestamp: rateLimitInfo.reset,
              reset_date: new Date(rateLimitInfo.reset * 1000).toISOString(),
              usage_percentage: Math.round(
                ((rateLimitInfo.limit - rateLimitInfo.remaining) / rateLimitInfo.limit) * 100
              ),
            }
          : null,
        api_test: {
          status: status === 200 ? 'SUCCESS' : 'FAILED',
          http_status: status,
          url: url.toString(),
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            size: 50,
          },
        },
        raw_response: rawData,
        analysis: {
          has_data: rawData.data && rawData.data.length > 0,
          transaction_count: rawData.data ? rawData.data.length : 0,
          has_pagination: !!rawData.nextCursor,
          sample_transaction: rawData.data?.[0] || null,
          error_message: rawData.error || rawData.message || null,
        },
        next_steps:
          status === 200
            ? rawData.data && rawData.data.length > 0
              ? '✅ SUCCESS! Earnings data is accessible. The sync should work now.'
              : '⚠️ API works but returned 0 transactions. This means either: 1) No data in date range, 2) Wrong Fanvue account connected, or 3) Token expired.'
            : status === 401
              ? '❌ Token expired or invalid. Reconnect your Fanvue account in the dashboard.'
              : `❌ API returned ${status}. Check token permissions/scopes.`,
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        phase: 'FATAL_ERROR',
        error: error.message,
        stack: error.stack,
        hint: 'Check server logs for more details',
      },
      { status: 500 }
    )
  }
}
