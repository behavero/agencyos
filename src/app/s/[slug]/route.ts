import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

/**
 * GET /s/[slug]
 * Smart redirect with breakout detection
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createAdminClient()

    // Fetch the redirect link
    const { data: link, error } = await supabase
      .from('redirect_links')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !link) {
      return NextResponse.redirect(new URL('/404', request.url))
    }

    // Check expiration
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.redirect(new URL('/expired', request.url))
    }

    // Get user agent and headers
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || ''
    const referer = headersList.get('referer') || ''
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    
    // Simple hash for privacy
    const ipHash = Buffer.from(ip).toString('base64').slice(0, 16)

    // Detect in-app browser
    const isInstagram = userAgent.includes('Instagram')
    const isTikTok = userAgent.includes('TikTok') || userAgent.includes('musical_ly')
    const isFacebook = userAgent.includes('FBAN') || userAgent.includes('FBAV')
    const isInAppBrowser = isInstagram || isTikTok || isFacebook

    // Detect device type
    const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isTablet = /iPad|Tablet|PlayBook/i.test(userAgent)
    const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'

    // Detect browser
    let browser = 'unknown'
    if (userAgent.includes('Chrome')) browser = 'chrome'
    else if (userAgent.includes('Safari')) browser = 'safari'
    else if (userAgent.includes('Firefox')) browser = 'firefox'
    else if (userAgent.includes('Edge')) browser = 'edge'

    // Determine in-app source
    let inAppSource = null
    if (isInstagram) inAppSource = 'instagram'
    else if (isTikTok) inAppSource = 'tiktok'
    else if (isFacebook) inAppSource = 'facebook'

    // Log tracking event (async)
    supabase
      .from('tracking_events')
      .insert({
        agency_id: link.agency_id,
        source_type: 'redirect_link',
        source_id: link.id,
        event_type: 'click',
        user_agent: userAgent.slice(0, 500),
        ip_hash: ipHash,
        referrer: referer.slice(0, 500),
        device_type: deviceType,
        browser,
        is_in_app_browser: isInAppBrowser,
        in_app_source: inAppSource,
      })
      .then(() => {})

    // Increment click count
    supabase
      .from('redirect_links')
      .update({ click_count: (link.click_count || 0) + 1 })
      .eq('id', link.id)
      .then(() => {})

    // Determine if we should breakout
    const shouldBreakout = 
      (link.breakout_mode === 'force') ||
      (link.breakout_mode === 'smart' && isInAppBrowser)

    if (shouldBreakout) {
      // Return HTML page with breakout logic
      return new NextResponse(generateBreakoutHTML(link.target_url, inAppSource, deviceType), {
        headers: {
          'Content-Type': 'text/html',
        },
      })
    }

    // Direct redirect
    return NextResponse.redirect(link.target_url)
  } catch (error) {
    console.error('[Smart Redirect] Error:', error)
    return NextResponse.redirect(new URL('/404', request.url))
  }
}

/**
 * Generate HTML for breakout interstitial
 */
function generateBreakoutHTML(targetUrl: string, platform: string | null, device: string): string {
  const isIOS = device === 'mobile' // Simplified - could be more accurate
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Opening link...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 320px;
    }
    .arrow {
      font-size: 64px;
      animation: bounce 1s ease-in-out infinite;
      margin-bottom: 24px;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    p {
      font-size: 14px;
      color: rgba(255,255,255,0.7);
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      background: #84cc16;
      color: #000;
      padding: 12px 32px;
      border-radius: 999px;
      font-weight: 600;
      text-decoration: none;
      transition: transform 0.2s, opacity 0.2s;
    }
    .btn:hover {
      opacity: 0.9;
      transform: scale(1.02);
    }
    .skip {
      margin-top: 16px;
      color: rgba(255,255,255,0.5);
      font-size: 12px;
    }
    .skip a {
      color: inherit;
      text-decoration: underline;
    }
    .loading {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: #84cc16;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 24px auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container" id="content">
    ${isIOS ? `
      <div class="arrow">↗️</div>
      <h1>Open in Safari</h1>
      <p>
        For the best experience, tap the <strong>⋯</strong> menu at the bottom,
        then tap <strong>"Open in Safari"</strong>
      </p>
      <a href="${targetUrl}" class="btn">Or continue here</a>
    ` : `
      <div class="loading"></div>
      <h1>Opening in browser...</h1>
      <p>If nothing happens, tap the button below</p>
      <a href="${targetUrl}" class="btn">Open Link</a>
    `}
    <p class="skip">
      <a href="${targetUrl}">Continue in ${platform || 'app'} browser</a>
    </p>
  </div>

  <script>
    (function() {
      const target = "${targetUrl}";
      const isAndroid = /Android/i.test(navigator.userAgent);
      
      if (isAndroid) {
        // Try Chrome intent
        const chromeIntent = "intent://" + target.replace(/^https?:\\/\\//, '') + "#Intent;scheme=https;package=com.android.chrome;end";
        
        // Try to open in Chrome
        setTimeout(function() {
          window.location.href = chromeIntent;
        }, 100);
        
        // Fallback to direct link after delay
        setTimeout(function() {
          window.location.href = target;
        }, 2500);
      }
    })();
  </script>
</body>
</html>
  `.trim()
}
