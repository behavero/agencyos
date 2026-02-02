'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { 
  Instagram, 
  Twitter, 
  Youtube, 
  Music2, 
  ExternalLink,
  Crown,
  Heart,
  Sparkles,
  Star,
  Zap,
  ArrowUpRight,
  Play,
} from 'lucide-react'

interface BioBlock {
  id: string
  type: string
  content: Record<string, unknown>
  config: Record<string, unknown>
  order_index: number
  click_count: number
}

interface BioPageRendererProps {
  page: {
    id: string
    slug: string
    title: string
    description?: string | null
    theme: {
      backgroundType?: string
      backgroundValue?: string
      fontFamily?: string
      buttonStyle?: string
      textColor?: string
      accentColor?: string
    }
    model?: { id: string; name: string; avatar_url?: string } | null
  }
  blocks: BioBlock[]
}

// Icon mapping
const ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  tiktok: Music2,
  crown: Crown,
  heart: Heart,
  sparkles: Sparkles,
  star: Star,
  zap: Zap,
  link: ExternalLink,
}

// Detect in-app browser
function detectInAppBrowser(): { isInApp: boolean; platform: string | null } {
  if (typeof window === 'undefined') return { isInApp: false, platform: null }
  
  const ua = navigator.userAgent || ''
  
  if (ua.includes('Instagram')) return { isInApp: true, platform: 'instagram' }
  if (ua.includes('FBAN') || ua.includes('FBAV')) return { isInApp: true, platform: 'facebook' }
  if (ua.includes('TikTok') || ua.includes('musical_ly')) return { isInApp: true, platform: 'tiktok' }
  if (ua.includes('Snapchat')) return { isInApp: true, platform: 'snapchat' }
  if (ua.includes('Twitter')) return { isInApp: true, platform: 'twitter' }
  
  return { isInApp: false, platform: null }
}

// Breakout overlay component
function BreakoutOverlay({ platform, onDismiss }: { platform: string; onDismiss: () => void }) {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-sm">
        {isIOS ? (
          <>
            <div className="mb-8 animate-bounce">
              <ArrowUpRight className="w-16 h-16 text-white mx-auto" />
            </div>
            <h2 className="text-xl font-bold text-white mb-4">
              Open in Safari for the best experience
            </h2>
            <p className="text-white/70 mb-6 text-sm">
              Tap the <span className="font-bold">···</span> menu at the bottom, then tap{' '}
              <span className="font-bold">"Open in Safari"</span>
            </p>
          </>
        ) : (
          <>
            <div className="mb-8">
              <ExternalLink className="w-16 h-16 text-white mx-auto animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-white mb-4">
              Opening in your browser...
            </h2>
            <p className="text-white/70 mb-6 text-sm">
              If nothing happens, copy this link and paste it in Chrome
            </p>
          </>
        )}
        
        <button
          onClick={onDismiss}
          className="text-white/50 hover:text-white text-sm underline"
        >
          Continue anyway
        </button>
      </div>
    </div>
  )
}

export function BioPageRenderer({ page, blocks }: BioPageRendererProps) {
  const [showBreakout, setShowBreakout] = useState(false)
  const [inAppPlatform, setInAppPlatform] = useState<string | null>(null)

  useEffect(() => {
    const { isInApp, platform } = detectInAppBrowser()
    if (isInApp) {
      setInAppPlatform(platform)
      // Only auto-show for smart breakout
      setShowBreakout(true)
      
      // Try Android intent
      const isAndroid = /Android/.test(navigator.userAgent)
      if (isAndroid) {
        // Try to open in Chrome
        const url = window.location.href
        const chromeIntent = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`
        window.location.href = chromeIntent
      }
    }
  }, [])

  // Track click
  const trackClick = async (blockId: string, url: string) => {
    try {
      await fetch('/api/bio/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_id: page.id,
          block_id: blockId,
          event_type: 'click',
        }),
      })
    } catch (e) {
      // Silent fail
    }
    window.open(url, '_blank')
  }

  // Background style
  const backgroundStyle: React.CSSProperties = {}
  if (page.theme.backgroundType === 'color') {
    backgroundStyle.backgroundColor = page.theme.backgroundValue || '#0a0a0a'
  } else if (page.theme.backgroundType === 'gradient') {
    backgroundStyle.background = page.theme.backgroundValue
  } else if (page.theme.backgroundType === 'image') {
    backgroundStyle.backgroundImage = `url(${page.theme.backgroundValue})`
    backgroundStyle.backgroundSize = 'cover'
    backgroundStyle.backgroundPosition = 'center'
  }

  // Button style
  const getButtonClasses = () => {
    const style = page.theme.buttonStyle || 'rounded'
    const base = 'w-full py-3 px-4 font-medium transition-all duration-200 flex items-center justify-center gap-2'
    
    switch (style) {
      case 'sharp':
        return cn(base, 'rounded-none border-2')
      case 'glass':
        return cn(base, 'rounded-xl bg-white/10 backdrop-blur-md border border-white/20')
      case 'outline':
        return cn(base, 'rounded-full border-2 bg-transparent')
      default:
        return cn(base, 'rounded-full')
    }
  }

  // Font family
  const fontFamily = page.theme.fontFamily || 'Inter'

  return (
    <>
      {showBreakout && inAppPlatform && (
        <BreakoutOverlay
          platform={inAppPlatform}
          onDismiss={() => setShowBreakout(false)}
        />
      )}

      <main
        className="min-h-screen flex flex-col items-center py-12 px-4"
        style={{
          ...backgroundStyle,
          fontFamily: `"${fontFamily}", sans-serif`,
          color: page.theme.textColor || '#ffffff',
        }}
      >
        <div className="w-full max-w-md space-y-4">
          {blocks.map((block) => (
            <BlockRenderer
              key={block.id}
              block={block}
              theme={page.theme}
              buttonClasses={getButtonClasses()}
              onTrackClick={trackClick}
            />
          ))}
        </div>
        
        {/* Powered by footer */}
        <div className="mt-12 text-center opacity-50 text-xs">
          <a
            href="https://onyxos.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-100 transition-opacity"
          >
            Powered by OnyxOS
          </a>
        </div>
      </main>
    </>
  )
}

// Individual block renderer
function BlockRenderer({
  block,
  theme,
  buttonClasses,
  onTrackClick,
}: {
  block: BioBlock
  theme: BioPageRendererProps['page']['theme']
  buttonClasses: string
  onTrackClick: (blockId: string, url: string) => void
}) {
  const content = block.content || {}
  const config = block.config || {}
  
  // Animation class
  const animationClass = config.animation === 'wiggle' 
    ? 'animate-[wiggle_1s_ease-in-out_infinite]'
    : config.animation === 'pulse'
    ? 'animate-pulse'
    : config.animation === 'bounce'
    ? 'animate-bounce'
    : ''

  switch (block.type) {
    case 'header':
      return (
        <div className="text-center mb-6">
          {(content.avatar_url as string) && (
            <img
              src={content.avatar_url as string}
              alt={content.title as string}
              className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white/20 object-cover"
            />
          )}
          <h1 className="text-2xl font-bold">{content.title as string}</h1>
          {(content.subtitle as string) && (
            <p className="opacity-70 mt-1">{content.subtitle as string}</p>
          )}
        </div>
      )

    case 'button':
      const IconComponent = ICONS[(content.icon as string) || 'link'] || ExternalLink
      return (
        <button
          onClick={() => onTrackClick(block.id, content.url as string)}
          className={cn(
            buttonClasses,
            animationClass,
            'hover:scale-[1.02] active:scale-[0.98]'
          )}
          style={{
            backgroundColor: (config.style as Record<string, string>)?.backgroundColor || theme.accentColor || '#84cc16',
            borderColor: (config.style as Record<string, string>)?.borderColor || theme.accentColor || '#84cc16',
            color: (config.style as Record<string, string>)?.textColor || '#000000',
          }}
        >
          <IconComponent className="w-5 h-5" />
          <span>{content.label as string}</span>
        </button>
      )

    case 'social_row':
      const links = (content.links as Array<{ platform: string; url: string }>) || []
      return (
        <div className="flex justify-center gap-4">
          {links.map((link, i) => {
            const SocialIcon = ICONS[link.platform] || ExternalLink
            return (
              <button
                key={i}
                onClick={() => onTrackClick(block.id, link.url)}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                style={{
                  backgroundColor: theme.accentColor || '#84cc16',
                  color: '#000000',
                }}
              >
                <SocialIcon className="w-6 h-6" />
              </button>
            )
          })}
        </div>
      )

    case 'video':
      return (
        <div className="relative rounded-xl overflow-hidden bg-black/30 aspect-video">
          {(content.thumbnail_url as string) ? (
            <>
              <img
                src={content.thumbnail_url as string}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => onTrackClick(block.id, content.url as string)}
                className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: theme.accentColor || '#84cc16' }}
                >
                  <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
                </div>
              </button>
            </>
          ) : (
            <video
              src={content.url as string}
              poster={content.thumbnail_url as string}
              controls
              className="w-full h-full"
            />
          )}
        </div>
      )

    case 'text':
      return (
        <div
          className="text-center opacity-80"
          dangerouslySetInnerHTML={{ __html: content.html as string }}
        />
      )

    case 'spacer':
      return <div style={{ height: (content.height as number) || 20 }} />

    case 'divider':
      return (
        <hr
          className="border-t opacity-20"
          style={{ borderColor: theme.textColor || '#ffffff' }}
        />
      )

    case 'image':
      const imageElement = (
        <img
          src={content.url as string}
          alt={(content.alt as string) || ''}
          className="w-full rounded-xl"
        />
      )
      
      if (content.link) {
        return (
          <button
            onClick={() => onTrackClick(block.id, content.link as string)}
            className="block w-full hover:opacity-90 transition-opacity"
          >
            {imageElement}
          </button>
        )
      }
      return imageElement

    case 'countdown':
      return <CountdownBlock content={content} theme={theme} />

    default:
      return null
  }
}

// Countdown component
function CountdownBlock({
  content,
  theme,
}: {
  content: Record<string, unknown>
  theme: BioPageRendererProps['page']['theme']
}): React.ReactElement {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const targetDate = new Date(content.target_date as string)
    
    const interval = setInterval(() => {
      const now = new Date()
      const diff = targetDate.getTime() - now.getTime()
      
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        clearInterval(interval)
        return
      }
      
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [content.target_date])

  return (
    <div className="text-center">
      {content.label ? (
        <p className="text-sm opacity-70 mb-2">{String(content.label)}</p>
      ) : null}
      <div className="flex justify-center gap-3">
        {[
          { value: timeLeft.days, label: 'Days' },
          { value: timeLeft.hours, label: 'Hrs' },
          { value: timeLeft.minutes, label: 'Min' },
          { value: timeLeft.seconds, label: 'Sec' },
        ].map((unit, i) => (
          <div
            key={i}
            className="w-16 py-2 rounded-lg"
            style={{ backgroundColor: theme.accentColor || '#84cc16', color: '#000' }}
          >
            <div className="text-2xl font-bold">{String(unit.value).padStart(2, '0')}</div>
            <div className="text-xs opacity-70">{unit.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
