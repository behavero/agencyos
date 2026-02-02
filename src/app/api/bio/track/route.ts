import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

/**
 * POST /api/bio/track
 * Track clicks on bio page blocks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { page_id, block_id, event_type } = body

    if (!page_id || !event_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createAdminClient()
    const headersList = await headers()
    
    const userAgent = headersList.get('user-agent') || ''
    const referer = headersList.get('referer') || ''
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const ipHash = Buffer.from(ip).toString('base64').slice(0, 16)

    // Detect in-app browser
    const isInstagram = userAgent.includes('Instagram')
    const isTikTok = userAgent.includes('TikTok')
    const isFacebook = userAgent.includes('FBAN') || userAgent.includes('FBAV')
    
    let inAppSource = null
    if (isInstagram) inAppSource = 'instagram'
    else if (isTikTok) inAppSource = 'tiktok'
    else if (isFacebook) inAppSource = 'facebook'

    // Detect device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent)
    const deviceType = isMobile ? 'mobile' : 'desktop'

    // Get page's agency_id
    const { data: page } = await supabase
      .from('bio_pages')
      .select('agency_id')
      .eq('id', page_id)
      .single()

    // Insert tracking event
    await supabase.from('tracking_events').insert({
      agency_id: page?.agency_id || null,
      source_type: block_id ? 'bio_block' : 'bio_page',
      source_id: block_id || page_id,
      event_type,
      user_agent: userAgent.slice(0, 500),
      ip_hash: ipHash,
      referrer: referer.slice(0, 500),
      device_type: deviceType,
      is_in_app_browser: isInstagram || isTikTok || isFacebook,
      in_app_source: inAppSource,
    })

    // Update click count if it's a block click
    if (block_id && event_type === 'click') {
      await supabase.rpc('increment_block_clicks', { block_uuid: block_id })
        .then(() => {})
        .catch(() => {
          // Fallback if RPC doesn't exist
          supabase
            .from('bio_blocks')
            .select('click_count')
            .eq('id', block_id)
            .single()
            .then(({ data }) => {
              if (data) {
                supabase
                  .from('bio_blocks')
                  .update({ click_count: (data.click_count || 0) + 1 })
                  .eq('id', block_id)
              }
            })
        })

      // Also update page click count
      await supabase
        .from('bio_pages')
        .select('total_clicks')
        .eq('id', page_id)
        .single()
        .then(({ data }) => {
          if (data) {
            supabase
              .from('bio_pages')
              .update({ total_clicks: (data.total_clicks || 0) + 1 })
              .eq('id', page_id)
          }
        })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Bio Track API] Error:', error)
    return NextResponse.json({ error: 'Failed to track' }, { status: 500 })
  }
}
