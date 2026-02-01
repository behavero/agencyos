'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface ChatMessage {
  uuid: string
  text: string | null
  sentAt: string | null
  sender: { uuid: string; handle: string }
  recipient: { uuid: string; handle: string }
  hasMedia: boolean | null
  mediaType: string | null
  type: string
  pricing: { USD: { price: number } } | null
  purchasedAt: string | null
  isFromCreator: boolean
  // UI states
  isPending?: boolean
  isFailed?: boolean
}

interface UseChatMessagesOptions {
  creatorId: string | null
  userUuid: string | null
  size?: number
  pollingInterval?: number // in milliseconds, 0 to disable
}

interface UseChatMessagesResult {
  messages: ChatMessage[]
  loading: boolean
  error: string | null
  hasMore: boolean
  creatorUuid: string | null
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  sendMessage: (text: string, mediaUuids?: string[], price?: number) => Promise<boolean>
  addOptimisticMessage: (message: ChatMessage) => void
  removeOptimisticMessage: (uuid: string) => void
}

export function useChatMessages(options: UseChatMessagesOptions): UseChatMessagesResult {
  const { creatorId, userUuid, size = 50, pollingInterval = 10000 } = options
  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [creatorUuid, setCreatorUuid] = useState<string | null>(null)
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef(false)

  const fetchMessages = useCallback(async (pageNum: number, append: boolean = false, isPolling: boolean = false) => {
    if (!creatorId || !userUuid) {
      setMessages([])
      return
    }

    // Don't show loading for polling
    if (!isPolling) {
      setLoading(true)
    }
    
    if (!isPolling) {
      setError(null)
    }

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        size: size.toString(),
      })

      const response = await fetch(`/api/creators/${creatorId}/chats/${userUuid}/messages?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch messages')
      }

      setCreatorUuid(data.creatorUuid || null)

      // Transform messages - API returns newest first, we want oldest first for display
      const fetchedMessages: ChatMessage[] = (data.data || []).map((msg: any) => ({
        uuid: msg.uuid,
        text: msg.text,
        sentAt: msg.sentAt,
        sender: msg.sender,
        recipient: msg.recipient,
        hasMedia: msg.hasMedia,
        mediaType: msg.mediaType,
        type: msg.type,
        pricing: msg.pricing,
        purchasedAt: msg.purchasedAt,
        isFromCreator: msg.isFromCreator,
      }))

      // Reverse to show oldest first (chronological order)
      const sortedMessages = [...fetchedMessages].reverse()

      if (append) {
        // For load more, prepend older messages
        setMessages(prev => [...sortedMessages, ...prev])
      } else {
        // Merge with existing optimistic messages
        setMessages(prev => {
          const optimisticMessages = prev.filter(m => m.isPending)
          return [...sortedMessages, ...optimisticMessages]
        })
      }

      setHasMore(data.pagination?.hasMore || false)
      setPage(pageNum)

    } catch (err: any) {
      if (!isPolling) {
        console.error('[useChatMessages] Error:', err)
        setError(err.message || 'Failed to fetch messages')
      }
    } finally {
      if (!isPolling) {
        setLoading(false)
      }
    }
  }, [creatorId, userUuid, size])

  // Fetch on mount and when dependencies change
  useEffect(() => {
    setPage(1)
    setMessages([])
    fetchMessages(1, false)
  }, [creatorId, userUuid])

  // Polling for new messages
  useEffect(() => {
    if (!creatorId || !userUuid || pollingInterval <= 0) return

    const poll = async () => {
      if (isPollingRef.current) return
      isPollingRef.current = true
      await fetchMessages(1, false, true)
      isPollingRef.current = false
    }

    pollingRef.current = setInterval(poll, pollingInterval)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [creatorId, userUuid, pollingInterval, fetchMessages])

  const refresh = useCallback(async () => {
    setPage(1)
    await fetchMessages(1, false)
  }, [fetchMessages])

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await fetchMessages(page + 1, true)
  }, [fetchMessages, hasMore, loading, page])

  const addOptimisticMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, { ...message, isPending: true }])
  }, [])

  const removeOptimisticMessage = useCallback((uuid: string) => {
    setMessages(prev => prev.filter(m => m.uuid !== uuid))
  }, [])

  const sendMessage = useCallback(async (
    text: string,
    mediaUuids?: string[],
    price?: number
  ): Promise<boolean> => {
    if (!creatorId || !userUuid) return false

    // Create optimistic message
    const tempUuid = `temp-${Date.now()}`
    const optimisticMessage: ChatMessage = {
      uuid: tempUuid,
      text,
      sentAt: new Date().toISOString(),
      sender: { uuid: creatorUuid || '', handle: '' },
      recipient: { uuid: userUuid, handle: '' },
      hasMedia: Boolean(mediaUuids?.length),
      mediaType: null,
      type: 'text',
      pricing: price ? { USD: { price } } : null,
      purchasedAt: null,
      isFromCreator: true,
      isPending: true,
    }

    addOptimisticMessage(optimisticMessage)

    try {
      const response = await fetch(`/api/creators/${creatorId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUuid,
          text,
          mediaUuids,
          price,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      // Update optimistic message to confirmed
      setMessages(prev => prev.map(m => 
        m.uuid === tempUuid 
          ? { ...m, uuid: data.messageUuid || m.uuid, isPending: false }
          : m
      ))

      return true

    } catch (err: any) {
      console.error('[useChatMessages] Send error:', err)
      
      // Mark as failed
      setMessages(prev => prev.map(m => 
        m.uuid === tempUuid 
          ? { ...m, isPending: false, isFailed: true }
          : m
      ))

      return false
    }
  }, [creatorId, userUuid, creatorUuid, addOptimisticMessage])

  return {
    messages,
    loading,
    error,
    hasMore,
    creatorUuid,
    refresh,
    loadMore,
    sendMessage,
    addOptimisticMessage,
    removeOptimisticMessage,
  }
}
