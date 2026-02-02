import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { BioPageRenderer } from './bio-page-renderer'
import Script from 'next/script'

interface BioPageProps {
  params: Promise<{ slug: string }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: BioPageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createAdminClient()

  const { data: page } = await supabase
    .from('bio_pages')
    .select('title, seo_title, seo_description, seo_image, description')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!page) {
    return { title: 'Page Not Found' }
  }

  return {
    title: page.seo_title || page.title,
    description: page.seo_description || page.description || `Links from ${page.title}`,
    openGraph: {
      title: page.seo_title || page.title,
      description: page.seo_description || page.description,
      images: page.seo_image ? [{ url: page.seo_image }] : undefined,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: page.seo_title || page.title,
      description: page.seo_description || page.description,
      images: page.seo_image ? [page.seo_image] : undefined,
    },
  }
}

export default async function BioPage({ params }: BioPageProps) {
  const { slug } = await params
  const supabase = await createAdminClient()

  // Fetch page with blocks
  const { data: page, error } = await supabase
    .from('bio_pages')
    .select(`
      *,
      model:models(id, name, avatar_url),
      blocks:bio_blocks(*)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !page) {
    notFound()
  }

  // Sort blocks by order_index
  const blocks = (page.blocks || []).sort(
    (a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index
  )

  // Increment view count (async, fire and forget)
  supabase
    .from('bio_pages')
    .update({ total_visits: (page.total_visits || 0) + 1 })
    .eq('id', page.id)
    .then(() => {})

  // Log tracking event (async)
  supabase
    .from('tracking_events')
    .insert({
      agency_id: page.agency_id,
      source_type: 'bio_page',
      source_id: page.id,
      event_type: 'view',
    })
    .then(() => {})

  // Parse theme and pixels
  const theme = page.theme as {
    backgroundType?: string
    backgroundValue?: string
    fontFamily?: string
    buttonStyle?: string
    textColor?: string
    accentColor?: string
  }
  
  const pixels = page.pixels as {
    meta_pixel_id?: string
    tiktok_pixel_id?: string
    google_analytics_id?: string
  } | null

  return (
    <>
      {/* Meta Pixel */}
      {pixels?.meta_pixel_id && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixels.meta_pixel_id}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {/* TikTok Pixel */}
      {pixels?.tiktok_pixel_id && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
              ttq.load('${pixels.tiktok_pixel_id}');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      )}

      {/* Google Analytics */}
      {pixels?.google_analytics_id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${pixels.google_analytics_id}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${pixels.google_analytics_id}');
            `}
          </Script>
        </>
      )}

      <BioPageRenderer
        page={{
          id: page.id,
          slug: page.slug,
          title: page.title,
          description: page.description,
          theme,
          model: page.model as { id: string; name: string; avatar_url?: string } | null,
        }}
        blocks={blocks}
      />
    </>
  )
}
