/**
 * DEBUG PROBE - Raw Fanvue API Response
 * Phase 54C - Test OAuth Client Credentials + API Access
 */

import { NextResponse } from 'next/server'
import { getFanvueServerToken } from '@/lib/services/fanvue-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // STEP 1: Test OAuth Authentication
    console.log('🔐 Testing Fanvue OAuth Client Credentials...')

    let token: string
    try {
      token = await getFanvueServerToken()
    } catch (authError: any) {
      return NextResponse.json(
        {
          phase: 'OAUTH_AUTHENTICATION',
          status: 'FAILED',
          error: authError.message,
          hint: 'Check that FANVUE_CLIENT_ID and FANVUE_CLIENT_SECRET are set in Vercel environment variables',
          docs: 'https://github.com/fanvue/fanvue-app-starter',
        },
        { status: 500 }
      )
    }

    console.log('✅ OAuth token acquired successfully')

    // STEP 2: Test API Access with the token
    console.log('📊 Testing Fanvue Earnings API...')

    const startDate = new Date('2020-01-01T00:00:00.000Z') // All historical data
    const endDate = new Date() // Up to now

    const url = new URL('https://api.fanvue.com/insights/earnings')
    url.searchParams.set('startDate', startDate.toISOString())
    url.searchParams.set('endDate', endDate.toISOString())
    url.searchParams.set('size', '50') // Max allowed per Fanvue docs

    const apiResponse = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Fanvue-API-Version': '2025-06-26',
        'Content-Type': 'application/json',
      },
    })

    const status = apiResponse.status
    const rawData = await apiResponse.json().catch(() => ({
      error: 'Failed to parse JSON response',
    }))

    // STEP 3: Return comprehensive diagnostics
    return NextResponse.json(
      {
        phase: 'COMPLETE_DIAGNOSTICS',
        oauth_test: {
          status: 'SUCCESS',
          token_preview: `${token.substring(0, 20)}...`,
          token_length: token.length,
        },
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
              : '⚠️ API works but returned 0 transactions. Check date range or account has data.'
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
