'use client'

import { useState, useEffect, useCallback } from 'react'

export interface ChatThread {
  uuid: string
  user: {
    uuid: string
    handle: string
    displayName: string
    nickname: string | null
    avatarUrl: string | null
    isTopSpender: boolean
    registeredAt: string
  }
  lastMessage: {
    uuid: string
    text: string | null
    type: string
    sentAt: string
    hasMedia: boolean | null
    mediaType: string | null
    senderUuid: string
  } | null
  lastMessageAt: string | null
  unreadMessagesCount: number
  isRead: boolean
  isMuted: boolean
  createdAt: string
}

interface UseChatRosterOptions {
  creatorId: string | null
  size?: number
  filter?: 'all' | 'unread'
  search?: string
  sortBy?: 'most_recent_messages' | 'online_now' | 'most_unanswered_chats'
}

interface UseChatRosterResult {
  chats: ChatThread[]
  loading: boolean
  error: string | null
  hasMore: boolean
  page: number
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
}

export function useChatRoster(options: UseChatRosterOptions): UseChatRosterResult {
  const { creatorId, size = 50, filter = 'all', search, sortBy = 'most_recent_messages' } = options

  const [chats, setChats] = useState<ChatThread[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  const fetchChats = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (!creatorId) {
        setChats([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          size: size.toString(),
          sortBy,
        })

        if (search) {
          params.set('search', search)
        }

        const response = await fetch(`/api/creators/${creatorId}/messages?${params}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch chats')
        }

        // Transform API response to ChatThread format
        const threads: ChatThread[] = (data.data || []).map((chat: any) => ({
          uuid: chat.user?.uuid || '', // Using user.uuid as the chat identifier
          user: {
            uuid: chat.user?.uuid || '',
            handle: chat.user?.handle || '',
            displayName: chat.user?.displayName || chat.user?.handle || 'Unknown',
            nickname: chat.user?.nickname || null,
            avatarUrl: chat.user?.avatarUrl || null,
            isTopSpender: chat.user?.isTopSpender || false,
            registeredAt: chat.user?.registeredAt || '',
          },
          lastMessage: chat.lastMessage
            ? {
                uuid: chat.lastMessage.uuid || '',
                text: chat.lastMessage.text || null,
                type: chat.lastMessage.type || 'text',
                sentAt: chat.lastMessage.sentAt || '',
                hasMedia: chat.lastMessage.hasMedia || false,
                mediaType: chat.lastMessage.mediaType || null,
                senderUuid: chat.lastMessage.senderUuid || '',
              }
            : null,
          lastMessageAt: chat.lastMessageAt || chat.lastMessage?.sentAt || null,
          unreadMessagesCount: chat.unreadMessagesCount || 0,
          isRead: chat.isRead ?? true,
          isMuted: chat.isMuted ?? false,
          createdAt: chat.createdAt || '',
        }))

        // Sort by lastMessageAt descending
        threads.sort((a, b) => {
          const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
          const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
          return dateB - dateA
        })

        // Filter by unread if needed
        const filteredThreads =
          filter === 'unread' ? threads.filter(t => t.unreadMessagesCount > 0) : threads

        if (append) {
          setChats(prev => [...prev, ...filteredThreads])
        } else {
          setChats(filteredThreads)
        }

        setHasMore(data.pagination?.hasMore || false)
        setPage(pageNum)
      } catch (err: any) {
        console.error('[useChatRoster] Error:', err)
        setError(err.message || 'Failed to fetch chats')
      } finally {
        setLoading(false)
      }
    },
    [creatorId, size, filter, search, sortBy]
  )

  // Fetch on mount and when dependencies change
  useEffect(() => {
    setPage(1)
    fetchChats(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorId, size, filter, search, sortBy])

  const refresh = useCallback(async () => {
    setPage(1)
    await fetchChats(1, false)
  }, [fetchChats])

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await fetchChats(page + 1, true)
  }, [fetchChats, hasMore, loading, page])

  return {
    chats,
    loading,
    error,
    hasMore,
    page,
    refresh,
    loadMore,
  }
}
