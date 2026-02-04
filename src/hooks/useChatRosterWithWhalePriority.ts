'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ChatThread } from './use-chat-roster'

// Extended ChatThread with whale priority metadata
export interface ChatThreadWithTier extends ChatThread {
  tier?: UserTier
  ltv?: number
  whaleScore?: number
}

/**
 * Enhanced Chat Roster Hook with Whale Priority Sorting
 *
 * Sorts conversations by User Tier:
 * - Whale: total_spend >= $1000 OR whaleScore >= 70
 * - Spender: total_spend >= $100 OR whaleScore >= 40
 * - Free: Everything else
 *
 * Within each tier, sorts by lastMessageAt (most recent first)
 */

interface FanInsights {
  fan_id: string
  total_spend: number
  whaleScore: number
}

interface UseChatRosterWithWhalePriorityOptions {
  creatorId: string | null
  size?: number
  filter?: 'all' | 'unread'
  search?: string
}

interface UseChatRosterWithWhalePriorityResult {
  chats: ChatThreadWithTier[]
  loading: boolean
  error: string | null
  hasMore: boolean
  page: number
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
}

type UserTier = 'whale' | 'spender' | 'free'

function getUserTier(fanInsights: FanInsights | null): UserTier {
  if (!fanInsights) return 'free'

  const totalSpend = fanInsights.total_spend || 0
  const whaleScore = fanInsights.whaleScore || 0

  // Whale: $1000+ spend OR whaleScore >= 70
  if (totalSpend >= 100000 || whaleScore >= 70) {
    return 'whale'
  }

  // Spender: $100+ spend OR whaleScore >= 40
  if (totalSpend >= 10000 || whaleScore >= 40) {
    return 'spender'
  }

  return 'free'
}

function getTierPriority(tier: UserTier): number {
  switch (tier) {
    case 'whale':
      return 3
    case 'spender':
      return 2
    case 'free':
      return 1
  }
}

export function useChatRosterWithWhalePriority(
  options: UseChatRosterWithWhalePriorityOptions
): UseChatRosterWithWhalePriorityResult {
  const { creatorId, size = 50, filter = 'all', search } = options

  const [chats, setChats] = useState<ChatThreadWithTier[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  // Fetch chats from API
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
          sortBy: 'most_recent_messages',
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
          uuid: chat.user?.uuid || '',
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

        // Fetch fan insights for each user to determine tier
        const fanUuids = threads.map(t => t.user.uuid).filter(Boolean)
        const fanInsightsMap = new Map<string, FanInsights>()

        if (fanUuids.length > 0) {
          // Batch fetch fan insights
          const insightsPromises = fanUuids.map(async userUuid => {
            try {
              // Try to get from fan_insights table via API
              const insightsResponse = await fetch(`/api/fans/${userUuid}?model_id=${creatorId}`)
              if (insightsResponse.ok) {
                const insightsData = await insightsResponse.json()
                if (insightsData.fan) {
                  return {
                    userUuid,
                    insights: {
                      fan_id: userUuid,
                      total_spend: insightsData.fan.total_spend || 0,
                      whaleScore: insightsData.fan.whaleScore || 0,
                    },
                  }
                }
              }
            } catch (err) {
              console.warn(
                `[useChatRosterWithWhalePriority] Failed to fetch insights for ${userUuid}:`,
                err
              )
            }
            return {
              userUuid,
              insights: {
                fan_id: userUuid,
                total_spend: 0,
                whaleScore: 0,
              },
            }
          })

          const insightsResults = await Promise.all(insightsPromises)
          insightsResults.forEach(({ userUuid, insights }) => {
            fanInsightsMap.set(userUuid, insights)
          })
        }

        // Sort by tier priority, then by lastMessageAt
        const sortedThreads = threads.sort((a, b) => {
          const tierA = getUserTier(fanInsightsMap.get(a.user.uuid) || null)
          const tierB = getUserTier(fanInsightsMap.get(b.user.uuid) || null)

          const priorityA = getTierPriority(tierA)
          const priorityB = getTierPriority(tierB)

          // First sort by tier (Whale > Spender > Free)
          if (priorityA !== priorityB) {
            return priorityB - priorityA
          }

          // Within same tier, sort by lastMessageAt (most recent first)
          const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
          const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
          return dateB - dateA
        })

        // Filter by unread if needed
        const filteredThreads =
          filter === 'unread' ? sortedThreads.filter(t => t.unreadMessagesCount > 0) : sortedThreads

        // Add tier metadata to threads (for UI display)
        const threadsWithTier: ChatThreadWithTier[] = filteredThreads.map(thread => {
          const insights = fanInsightsMap.get(thread.user.uuid)
          const tier = getUserTier(insights || null)
          return {
            ...thread,
            tier,
            ltv: insights?.total_spend || 0,
            whaleScore: insights?.whaleScore || 0,
          }
        })

        if (append) {
          setChats(prev => [...prev, ...threadsWithTier])
        } else {
          setChats(threadsWithTier)
        }

        setHasMore(data.pagination?.hasMore || false)
        setPage(pageNum)
      } catch (err: any) {
        console.error('[useChatRosterWithWhalePriority] Error:', err)
        setError(err.message || 'Failed to fetch chats')
      } finally {
        setLoading(false)
      }
    },
    [creatorId, size, filter, search]
  )

  // Fetch on mount and when dependencies change
  useEffect(() => {
    setPage(1)
    fetchChats(1, false)
  }, [fetchChats])

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
