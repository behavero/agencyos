/**
 * Safe Chat Roster Hook
 * Fallback version with error handling for production stability
 */

import { useState, useEffect, useCallback, useMemo } from 'react'

interface ChatThread {
  uuid: string
  user: {
    uuid: string
    handle: string
    displayName: string
    nickname: string | null
    avatarUrl: string | null
    isTopSpender: boolean
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
}

interface UseChatRosterOptions {
  creatorId: string | null
  size?: number
  filter?: 'all' | 'unread'
  search?: string
}

export function useSafeChatRoster(options: UseChatRosterOptions) {
  const { creatorId, size = 20, filter = 'all', search = '' } = options

  const [chats, setChats] = useState<ChatThread[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchChats = useCallback(async () => {
    if (!creatorId) {
      setChats([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/creators/${creatorId}/chats?size=${size}&filter=${filter}&search=${search}`
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch chats: ${response.status}`)
      }

      const data = await response.json()
      setChats(data.data || [])
    } catch (err: any) {
      console.error('[SafeChatRoster] Error:', err)
      setError(err.message)
      setChats([])
    } finally {
      setLoading(false)
    }
  }, [creatorId, size, filter, search])

  useEffect(() => {
    fetchChats()
  }, [fetchChats])

  const refresh = useCallback(async () => {
    await fetchChats()
  }, [fetchChats])

  return {
    chats,
    loading,
    error,
    refresh,
  }
}
