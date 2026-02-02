/**
 * DEBUG PROBE - Raw Fanvue API Response
 * Phase 54B - Diagnostic endpoint to see exact API responses
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createAdminClient()

    // 1. Get the first model with Fanvue token
    const { data: models, error: modelsError } = await supabase
      .from('models')
      .select('*')
      .not('fanvue_access_token', 'is', null)
      .limit(1)

    if (modelsError || !models || models.length === 0) {
      return NextResponse.json({
        error: 'No models with Fanvue tokens found',
        hint: 'Go to dashboard and click "Add Model" to connect Fanvue',
        models_error: modelsError?.message,
      })
    }

    const model = models[0]
    const token = model.fanvue_access_token

    if (!token) {
      return NextResponse.json({
        error: 'Model has no access token',
        model: model.name,
      })
    }

    // 2. Construct the CORRECT Fanvue API URL (from docs)
    // https://api.fanvue.com/docs/api-reference/reference/insights/get-earnings
    const startDate = new Date('2020-01-01T00:00:00.000Z') // Fetch all historical data
    const endDate = new Date() // Up to now

    const url = new URL('https://api.fanvue.com/insights/earnings')
    url.searchParams.set('startDate', startDate.toISOString())
    url.searchParams.set('endDate', endDate.toISOString())
    url.searchParams.set('size', '50') // Max allowed

    // 3. Make the RAW request with correct headers
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Fanvue-API-Version': '2025-06-26',
        'Content-Type': 'application/json',
      },
    })

    const status = response.status
    const rawData = await response.json().catch(() => ({ error: 'Failed to parse JSON' }))

    // 4. Return EVERYTHING for debugging
    return NextResponse.json(
      {
        success: status === 200,
        debug_info: {
          status_code: status,
          api_url: url.toString(),
          model_name: model.name,
          model_username: model.fanvue_username,
          has_token: !!token,
          token_preview: token ? `${token.substring(0, 10)}...` : null,
          request_params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            size: 50,
          },
        },
        raw_fanvue_response: rawData,
        interpretation: {
          has_data: rawData.data && rawData.data.length > 0,
          transaction_count: rawData.data ? rawData.data.length : 0,
          has_next_page: !!rawData.nextCursor,
          sample_transaction: rawData.data && rawData.data[0] ? rawData.data[0] : null,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        fatal_error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}
