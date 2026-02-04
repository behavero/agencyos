'use client'

import { useEffect, useRef, useMemo } from 'react'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  Lock,
  Unlock,
  Image as ImageIcon,
  Play,
  Crown,
  AlertCircle,
  RefreshCw,
  MessageCircle,
} from 'lucide-react'
import type { ChatMessage } from '@/hooks/use-chat-messages'

interface VirtualMessageListProps {
  messages: ChatMessage[]
  creatorUuid: string | null
  className?: string
  onRetryMessage?: (tempId: string) => void
  onUnlockPPV?: (messageUuid: string) => void
}

/**
 * Virtualized Message List Component
 *
 * Uses react-virtuoso to render thousands of messages efficiently.
 * Handles:
 * - Optimistic messages (sending state)
 * - Failed messages (retry option)
 * - PPV messages (lock/unlock UI)
 * - Auto-scroll to bottom
 */
export function VirtualMessageList({
  messages,
  creatorUuid,
  className,
  onRetryMessage,
  onUnlockPPV,
}: VirtualMessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const lastMessageCountRef = useRef(messages.length)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const newMessageCount = messages.length
    if (newMessageCount > lastMessageCountRef.current) {
      // New message added - scroll to bottom
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: 'LAST',
          behavior: 'smooth',
        })
      }, 100)
    }
    lastMessageCountRef.current = newMessageCount
  }, [messages.length])

  // Sort messages: oldest first (for display)
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const timeA = a.sentAt ? new Date(a.sentAt).getTime() : 0
      const timeB = b.sentAt ? new Date(b.sentAt).getTime() : 0
      return timeA - timeB // Oldest first
    })
  }, [messages])

  const formatTime = (dateStr: string | null): string => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  const renderMessage = (index: number) => {
    const msg = sortedMessages[index]
    if (!msg) return null

    const isFromCreator = msg.isFromCreator
    const isPending = msg.isPending
    const isFailed = msg.isFailed
    const isPPV = msg.pricing !== null && msg.pricing.USD.price > 0
    const isUnlocked = msg.purchasedAt !== null
    const hasMedia = msg.hasMedia

    return (
      <div
        key={msg.uuid}
        className={cn(
          'flex gap-3 px-4 py-2',
          isFromCreator ? 'flex-row-reverse' : 'flex-row',
          isPending && 'opacity-50'
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
            isFromCreator
              ? 'bg-primary/20 border border-primary/30'
              : 'bg-zinc-800 border border-zinc-700'
          )}
        >
          {isFromCreator ? (
            <Crown className="w-4 h-4 text-primary" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-zinc-600" />
          )}
        </div>

        {/* Message Content */}
        <div
          className={cn(
            'flex flex-col gap-1 max-w-[70%]',
            isFromCreator ? 'items-end' : 'items-start'
          )}
        >
          {/* PPV Lock Badge */}
          {isPPV && !isUnlocked && (
            <Badge
              variant="outline"
              className="mb-1 bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
            >
              <Lock className="w-3 h-3 mr-1" />${(msg.pricing?.USD.price || 0) / 100} PPV
            </Badge>
          )}

          {/* Failed Message Retry */}
          {isFailed && (
            <div className="flex items-center gap-2 mb-1 text-red-400 text-xs">
              <AlertCircle className="w-3 h-3" />
              <span>Failed to send</span>
              {onRetryMessage && msg.uuid.startsWith('temp-') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-2 text-xs"
                  onClick={() => onRetryMessage(msg.uuid)}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          )}

          {/* Message Bubble */}
          <div
            className={cn(
              'rounded-2xl px-4 py-2 break-words',
              isFromCreator
                ? 'bg-primary/20 border border-primary/30 rounded-tr-sm'
                : 'bg-zinc-800 rounded-tl-sm',
              isPending && 'opacity-60'
            )}
          >
            {/* Pending Indicator */}
            {isPending && (
              <div className="flex items-center gap-1 mb-1 text-xs text-zinc-400">
                <div className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse" />
                <span>Sending...</span>
              </div>
            )}

            {/* Message Text */}
            {msg.text && <p className="text-sm text-white whitespace-pre-wrap">{msg.text}</p>}

            {/* Media Preview */}
            {hasMedia && (
              <div className="mt-2 rounded-lg bg-zinc-900/50 p-2 flex items-center gap-2">
                {msg.mediaType === 'image' ? (
                  <ImageIcon className="w-4 h-4 text-zinc-400" />
                ) : (
                  <Play className="w-4 h-4 text-zinc-400" />
                )}
                <span className="text-xs text-zinc-400">
                  {msg.mediaType === 'image' ? 'Image' : 'Video'}
                </span>
              </div>
            )}

            {/* PPV Unlock Button */}
            {isPPV && !isUnlocked && onUnlockPPV && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
                onClick={() => onUnlockPPV(msg.uuid)}
              >
                <Unlock className="w-3 h-3 mr-1" />
                Unlock for ${(msg.pricing?.USD.price || 0) / 100}
              </Button>
            )}

            {/* Unlocked Indicator */}
            {isPPV && isUnlocked && (
              <Badge
                variant="outline"
                className="mt-2 bg-green-500/10 border-green-500/30 text-green-400"
              >
                <Unlock className="w-3 h-3 mr-1" />
                Unlocked
              </Badge>
            )}
          </div>

          {/* Timestamp */}
          <div
            className={cn('text-xs text-zinc-500 mt-1', isFromCreator ? 'text-right' : 'text-left')}
          >
            {formatTime(msg.sentAt)}
          </div>
        </div>
      </div>
    )
  }

  if (sortedMessages.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full text-zinc-500', className)}>
        <div className="text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No messages yet</p>
          <p className="text-xs mt-1">Start the conversation</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('h-full w-full', className)}>
      <Virtuoso
        ref={virtuosoRef}
        data={sortedMessages}
        totalCount={sortedMessages.length}
        itemContent={renderMessage}
        initialTopMostItemIndex={sortedMessages.length - 1}
        followOutput="smooth"
        increaseViewportBy={200}
        // Performance optimizations
        overscan={5}
        defaultItemHeight={80}
        // Auto-scroll to bottom on new messages
        atBottomStateChange={atBottom => {
          if (atBottom && sortedMessages.length > 0) {
            // User is at bottom - keep following
          }
        }}
      />
    </div>
  )
}
