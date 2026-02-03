/**
 * Debug endpoint to see raw Fanvue tracking links API response
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const FANVUE_API_VERSION = '2025-06-26'

export async function GET(request: Request) {
  try {
    const supabase = await createAdminClient()
    const url = new URL(request.url)
    const modelName = url.searchParams.get('model')
    
    // Get all models with tokens
    const { data: models } = await supabase
      .from('models')
      .select('id, name, fanvue_user_uuid, fanvue_access_token')
      .not('fanvue_user_uuid', 'is', null)

    // Get the agency token
    const { data: agencyModel } = await supabase
      .from('models')
      .select('fanvue_access_token')
      .not('fanvue_access_token', 'is', null)
      .limit(1)
      .single()

    const agencyToken = agencyModel?.fanvue_access_token

    // Find the specified model or get one with tracking links
    let model = models?.find(m => m.name.toLowerCase().includes(modelName?.toLowerCase() || ''))
    if (!model) {
      model = models?.[0]
    }

    if (!agencyToken) {
      return NextResponse.json({ error: 'No agency token found' })
    }

    // Test all models and find one with tracking links
    const results = []
    
    for (const m of models || []) {
      if (!m.fanvue_user_uuid) continue
      
      const apiUrl = `https://api.fanvue.com/creators/${m.fanvue_user_uuid}/tracking-links?limit=5`
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${agencyToken}`,
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

      const hasLinks = parsed?.data?.length > 0

      results.push({
        model: m.name,
        creatorUuid: m.fanvue_user_uuid,
        status: response.status,
        linksCount: parsed?.data?.length || 0,
        // Show full response only for models with links
        rawResponse: hasLinks ? parsed : undefined,
        responseKeys: parsed?.data?.[0] ? Object.keys(parsed.data[0]) : null,
        sampleLink: parsed?.data?.[0] || null,
      })

      // Stop if we found one with links
      if (hasLinks && !modelName) break
    }

    return NextResponse.json({
      totalModels: models?.length || 0,
      results,
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
