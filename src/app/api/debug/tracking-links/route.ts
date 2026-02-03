/**
 * Debug endpoint to see raw Fanvue tracking links API response
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const FANVUE_API_VERSION = '2025-06-26'

export async function GET() {
  try {
    const supabase = await createAdminClient()
    
    // Get a model with a token
    const { data: model } = await supabase
      .from('models')
      .select('id, name, fanvue_user_uuid, fanvue_access_token')
      .not('fanvue_access_token', 'is', null)
      .limit(1)
      .single()

    if (!model || !model.fanvue_access_token || !model.fanvue_user_uuid) {
      return NextResponse.json({ error: 'No model with token found' })
    }

    // Fetch tracking links from Fanvue API
    const url = `https://api.fanvue.com/creators/${model.fanvue_user_uuid}/tracking-links?limit=5`
    
    console.log(`Fetching: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${model.fanvue_access_token}`,
        'X-Fanvue-API-Version': FANVUE_API_VERSION,
      },
    })

    const rawText = await response.text()
    
    let parsed = null
    try {
      parsed = JSON.parse(rawText)
    } catch {
      // Keep as text
    }

    return NextResponse.json({
      model: model.name,
      creatorUuid: model.fanvue_user_uuid,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      rawResponse: parsed || rawText,
      // Show all keys if it's parsed
      responseKeys: parsed?.data?.[0] ? Object.keys(parsed.data[0]) : null,
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
