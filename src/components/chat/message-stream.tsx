'use client'

import { useState, useRef, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DollarSign,
  Lock,
  Unlock,
  Image as ImageIcon,
  Play,
  User,
  Crown,
} from 'lucide-react'

interface Message {
  id: string
  role: 'fan' | 'model' | 'system'
  content: string
  timestamp: string
  media_url?: string
  media_type?: 'image' | 'video'
  price?: number
  is_unlocked?: boolean
  tip_amount?: number
}

interface MessageStreamProps {
  messages: Message[]
  blurMode: boolean
  modelName?: string
  fanName?: string
  onMediaClick?: (url: string) => void
}

export function MessageStream({
  messages,
  blurMode,
  modelName = 'Model',
  fanName = 'Fan',
  onMediaClick,
}: MessageStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  // Format time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Render media
  const renderMedia = (msg: Message) => {
    if (!msg.media_url) return null

    const isLocked = msg.price && !msg.is_unlocked
    const shouldBlur = blurMode && msg.role === 'model'

    return (
      <div className="relative mt-2 rounded-lg overflow-hidden max-w-xs">
        {msg.media_type === 'video' ? (
          <div className="relative bg-zinc-800 aspect-video">
            {isLocked ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-800">
                <Lock className="w-8 h-8 text-zinc-500 mb-2" />
                <span className="text-sm text-zinc-400">Unlock for ${msg.price}</span>
              </div>
            ) : (
              <video
                src={msg.media_url}
                className={cn(
                  'w-full h-full object-cover',
                  shouldBlur && 'blur-xl hover:blur-none transition-all duration-300'
                )}
                controls={!shouldBlur}
                poster={shouldBlur ? undefined : msg.media_url}
              />
            )}
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="bg-black/50">
                <Play className="w-3 h-3 mr-1" />
                Video
              </Badge>
            </div>
          </div>
        ) : (
          <div
            className="relative cursor-pointer"
            onClick={() => !isLocked && onMediaClick?.(msg.media_url!)}
          >
            {isLocked ? (
              <div className="aspect-square bg-zinc-800 flex flex-col items-center justify-center min-h-32">
                <Lock className="w-8 h-8 text-zinc-500 mb-2" />
                <span className="text-sm text-zinc-400">Unlock for ${msg.price}</span>
              </div>
            ) : (
              <img
                src={msg.media_url}
                alt="Media"
                className={cn(
                  'w-full rounded-lg',
                  shouldBlur && 'blur-xl hover:blur-none transition-all duration-300 cursor-pointer'
                )}
              />
            )}
          </div>
        )}

        {/* Price badge */}
        {msg.price && (
          <div className="absolute bottom-2 left-2">
            <Badge
              variant="outline"
              className={cn(
                'bg-black/70',
                msg.is_unlocked
                  ? 'text-green-400 border-green-500/30'
                  : 'text-yellow-400 border-yellow-500/30'
              )}
            >
              {msg.is_unlocked ? (
                <>
                  <Unlock className="w-3 h-3 mr-1" />
                  ${msg.price}
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 mr-1" />
                  ${msg.price}
                </>
              )}
            </Badge>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin"
    >
      {messages.map((msg) => {
        const isFan = msg.role === 'fan'
        const isSystem = msg.role === 'system'

        // System messages
        if (isSystem) {
          return (
            <div key={msg.id} className="flex justify-center">
              <div className="bg-zinc-800/50 rounded-full px-4 py-1 text-xs text-zinc-400">
                {msg.content}
              </div>
            </div>
          )
        }

        return (
          <div
            key={msg.id}
            className={cn(
              'flex gap-3',
              isFan ? 'justify-start' : 'justify-end'
            )}
          >
            {/* Fan Avatar */}
            {isFan && (
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-zinc-400" />
              </div>
            )}

            <div className={cn('max-w-[70%]', isFan ? 'order-last' : 'order-first')}>
              {/* Message bubble */}
              <div
                className={cn(
                  'rounded-2xl px-4 py-2',
                  isFan
                    ? 'bg-zinc-800 rounded-tl-sm'
                    : 'bg-primary/20 border border-primary/30 rounded-tr-sm'
                )}
              >
                {/* Tip indicator */}
                {msg.tip_amount && (
                  <div className="flex items-center gap-1 mb-1">
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <DollarSign className="w-3 h-3 mr-1" />
                      ${msg.tip_amount} Tip
                    </Badge>
                  </div>
                )}

                {/* Message content */}
                <p className="text-sm text-white whitespace-pre-wrap break-words">
                  {msg.content}
                </p>

                {/* Media */}
                {renderMedia(msg)}
              </div>

              {/* Timestamp */}
              <div
                className={cn(
                  'text-xs text-zinc-500 mt-1',
                  isFan ? 'text-left' : 'text-right'
                )}
              >
                {formatTime(msg.timestamp)}
              </div>
            </div>

            {/* Model Avatar */}
            {!isFan && (
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <Crown className="w-4 h-4 text-primary" />
              </div>
            )}
          </div>
        )
      })}

      {/* Blur mode indicator */}
      {blurMode && (
        <div className="fixed bottom-24 right-8 z-50">
          <Badge variant="destructive" className="animate-pulse">
            🔒 NSFW Blur Active
          </Badge>
        </div>
      )}
    </div>
  )
}
