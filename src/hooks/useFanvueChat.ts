'use client'

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useRef, useEffect } from 'react'
import { useChatStore } from '@/store/chatStore'
import type { ChatMessage } from './use-chat-messages'

/**
 * useFanvueChat - High-Performance Chat Hook
 *
 * Central brain for Fanvue chat integration:
 * - TanStack Query for async server state
 * - Optimistic UI updates
 * - Smart polling with visibility detection
 * - Rate limit handling (429 retry with exponential backoff)
 * - Message queueing for failed sends
 */

interface UseFanvueChatOptions {
  creatorId: string | null
  userUuid: string | null
  pageSize?: number
  pollingInterval?: number // milliseconds, 0 to disable
  enabled?: boolean
}

interface SendMessagePayload {
  userUuid: string
  text?: string | null
  mediaUuids?: string[]
  price?: number | null
  templateUuid?: string | null
}

interface MessageResponse {
  data: ChatMessage[]
  pagination: {
    page: number
    size: number
    hasMore: boolean
  }
  creatorUuid: string | null
}

interface SendMessageResponse {
  success: boolean
  messageUuid?: string
  error?: string
}

// Rate limit retry configuration
const RATE_LIMIT_RETRY_DELAYS = [1000, 2000, 4000, 8000] // Exponential backoff
const MAX_RETRIES = 3

/**
 * Fetch messages from API with retry logic for rate limits
 */
async function fetchMessagesWithRetry(url: string, retryCount = 0): Promise<MessageResponse> {
  try {
    const response = await fetch(url)
    const data = await response.json()

    // Handle rate limit (429)
    if (response.status === 429 && retryCount < MAX_RETRIES) {
      const delay = RATE_LIMIT_RETRY_DELAYS[retryCount] || 8000
      console.warn(
        `[useFanvueChat] Rate limited, retrying in ${delay}ms (attempt ${retryCount + 1})`
      )
      await new Promise(resolve => setTimeout(resolve, delay))
      return fetchMessagesWithRetry(url, retryCount + 1)
    }

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return data
  } catch (error) {
    if (retryCount < MAX_RETRIES && error instanceof Error && error.message.includes('429')) {
      const delay = RATE_LIMIT_RETRY_DELAYS[retryCount] || 8000
      await new Promise(resolve => setTimeout(resolve, delay))
      return fetchMessagesWithRetry(url, retryCount + 1)
    }
    throw error
  }
}

/**
 * Send message with retry logic
 */
async function sendMessageWithRetry(
  url: string,
  payload: SendMessagePayload,
  retryCount = 0
): Promise<SendMessageResponse> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    // Handle rate limit (429)
    if (response.status === 429 && retryCount < MAX_RETRIES) {
      const delay = RATE_LIMIT_RETRY_DELAYS[retryCount] || 8000
      console.warn(`[useFanvueChat] Rate limited on send, retrying in ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return sendMessageWithRetry(url, payload, retryCount + 1)
    }

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return { success: true, messageUuid: data.messageUuid }
  } catch (error) {
    if (retryCount < MAX_RETRIES && error instanceof Error && error.message.includes('429')) {
      const delay = RATE_LIMIT_RETRY_DELAYS[retryCount] || 8000
      await new Promise(resolve => setTimeout(resolve, delay))
      return sendMessageWithRetry(url, payload, retryCount + 1)
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message',
    }
  }
}

/**
 * Smart polling interval based on tab visibility
 */
function getPollingInterval(isVisible: boolean, baseInterval: number): number {
  if (baseInterval <= 0) return 0
  // Slow down polling when tab is inactive (save rate limits)
  return isVisible ? baseInterval : baseInterval * 3
}

export function useFanvueChat(options: UseFanvueChatOptions) {
  const { creatorId, userUuid, pageSize = 50, pollingInterval = 10000, enabled = true } = options

  const queryClient = useQueryClient()
  const chatStore = useChatStore()
  const visibilityRef = useRef(true)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Tab visibility detection for smart polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      visibilityRef.current = !document.hidden
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Query key for messages
  const messagesQueryKey = ['fanvue-messages', creatorId, userUuid]

  // Infinite query for paginated messages
  const messagesQuery = useInfiniteQuery({
    queryKey: messagesQueryKey,
    queryFn: async ({ pageParam = 1 }) => {
      if (!creatorId || !userUuid) {
        throw new Error('Creator ID and User UUID required')
      }

      const params = new URLSearchParams({
        page: pageParam.toString(),
        size: pageSize.toString(),
      })

      const url = `/api/creators/${creatorId}/chats/${userUuid}/messages?${params}`
      return fetchMessagesWithRetry(url)
    },
    enabled: enabled && !!creatorId && !!userUuid,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.pagination.hasMore) {
        return allPages.length + 1
      }
      return undefined
    },
    initialPageParam: 1,
    // Refetch on window focus
    refetchOnWindowFocus: true,
    // Stale time: consider data fresh for 5 seconds
    staleTime: 5000,
  })

  // Flatten messages from all pages
  const allMessages = messagesQuery.data?.pages.flatMap(page => page.data) || []

  // Merge with optimistic messages from store
  const optimisticMessages = Array.from(chatStore.optimisticMessages.values())
  const mergedMessages: ChatMessage[] = [
    ...allMessages,
    ...optimisticMessages.map(opt => ({
      uuid: opt.tempId,
      text: opt.text,
      sentAt: opt.sentAt,
      sender: { uuid: '', handle: '' }, // Will be filled by API response
      recipient: { uuid: userUuid || '', handle: '' },
      hasMedia: opt.mediaUuids.length > 0,
      mediaType: null,
      type: opt.price ? 'ppv' : 'text',
      pricing: opt.price ? { USD: { price: opt.price } } : null,
      purchasedAt: null,
      isFromCreator: true,
      isPending: opt.isSending,
      isFailed: opt.isFailed,
    })),
  ].sort((a, b) => {
    // Sort by sentAt, newest first (for display, we'll reverse in component)
    const timeA = a.sentAt ? new Date(a.sentAt).getTime() : 0
    const timeB = b.sentAt ? new Date(b.sentAt).getTime() : 0
    return timeB - timeA
  })

  // Smart polling with visibility detection
  useEffect(() => {
    if (pollingInterval <= 0 || !enabled || !creatorId || !userUuid) {
      return
    }

    const poll = () => {
      const interval = getPollingInterval(visibilityRef.current, pollingInterval)
      if (interval > 0) {
        // Refetch only if tab is visible or we're due for a check
        if (visibilityRef.current || Math.random() < 0.1) {
          // 10% chance to poll even when hidden (for critical updates)
          queryClient.invalidateQueries({ queryKey: messagesQueryKey })
        }
      }
    }

    // Initial poll
    const initialInterval = getPollingInterval(visibilityRef.current, pollingInterval)
    pollingRef.current = setInterval(poll, initialInterval)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [pollingInterval, enabled, creatorId, userUuid, queryClient, messagesQueryKey])

  // Send message mutation with optimistic updates
  const sendMessageMutation = useMutation({
    mutationFn: async (payload: SendMessagePayload) => {
      if (!creatorId || !userUuid) {
        throw new Error('Creator ID and User UUID required')
      }

      // Create optimistic message
      const tempId = chatStore.addOptimisticMessage(userUuid, {
        text: payload.text || null,
        mediaUuids: payload.mediaUuids || [],
        price: payload.price || null,
        isSending: true,
        isFailed: false,
      })

      // Send to API
      const url = `/api/creators/${creatorId}/messages`
      const result = await sendMessageWithRetry(url, payload)

      if (result.success && result.messageUuid) {
        // Update optimistic message with real UUID
        chatStore.updateOptimisticMessage(tempId, {
          isSending: false,
        })

        // Invalidate queries to refetch with real message
        queryClient.invalidateQueries({ queryKey: messagesQueryKey })

        // Remove optimistic after a short delay (to allow refetch)
        setTimeout(() => {
          chatStore.removeOptimisticMessage(tempId)
        }, 1000)

        return { success: true, messageUuid: result.messageUuid, tempId }
      } else {
        // Mark as failed
        chatStore.markOptimisticAsFailed(tempId, result.error || 'Failed to send')
        throw new Error(result.error || 'Failed to send message')
      }
    },
    onError: error => {
      console.error('[useFanvueChat] Send error:', error)
    },
  })

  // Send message wrapper
  const sendMessage = useCallback(
    async (payload: SendMessagePayload): Promise<boolean> => {
      try {
        await sendMessageMutation.mutateAsync(payload)
        return true
      } catch (error) {
        return false
      }
    },
    [sendMessageMutation]
  )

  // Load more messages
  const loadMore = useCallback(() => {
    if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
      messagesQuery.fetchNextPage()
    }
  }, [messagesQuery])

  // Refresh messages
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: messagesQueryKey })
  }, [queryClient, messagesQueryKey])

  return {
    // Messages (merged with optimistic)
    messages: mergedMessages,

    // Query state
    loading: messagesQuery.isLoading,
    error: messagesQuery.error?.message || null,
    hasMore: messagesQuery.hasNextPage || false,
    isFetching: messagesQuery.isFetching,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,

    // Creator info
    creatorUuid: messagesQuery.data?.pages[0]?.creatorUuid || null,

    // Actions
    sendMessage,
    loadMore,
    refresh,

    // Optimistic message management
    optimisticMessages: Array.from(chatStore.optimisticMessages.values()),
  }
}
