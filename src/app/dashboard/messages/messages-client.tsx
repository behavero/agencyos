'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import type { Database } from '@/types/database.types'
import {
  Search,
  Send,
  Smile,
  Clock,
  DollarSign,
  MoreVertical,
  Sparkles,
  X,
  ChevronDown,
  MapPin,
  Calendar,
  Heart,
  MessageCircle,
  Plus,
  RefreshCw,
  Image as ImageIcon,
  AlertCircle,
  Check,
  CheckCheck,
  Crown,
  ImageIcon as VaultIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  useChatRosterWithWhalePriority,
  ChatThreadWithTier,
} from '@/hooks/useChatRosterWithWhalePriority'
import { useChatMessages, ChatMessage } from '@/hooks/use-chat-messages'
import { useFanvueChat } from '@/hooks/useFanvueChat'
import { VirtualMessageList } from '@/components/chat/VirtualMessageList'
import { InputArea } from '@/components/chat/InputArea'
import { useChatStore } from '@/store/chatStore'
import { ModelSelectorTabs } from '@/components/chat/ModelSelectorTabs'

type Model = Database['public']['Tables']['models']['Row']

interface VaultAsset {
  id: string
  title: string | null
  file_name: string
  url: string
  file_type: string
  price: number
  content_type: string
  model_id: string | null
}

interface MessagesClientProps {
  models: Model[]
  vaultAssets?: VaultAsset[]
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function MessagesClient({ models, vaultAssets = [] }: MessagesClientProps) {
  const availableModels = useMemo(() => {
    const hasActive = models.some(model => model.status === 'active')
    if (hasActive) {
      return models.filter(model => model.status === 'active')
    }
    return models
  }, [models])

  const [selectedModel, setSelectedModel] = useState<Model | null>(availableModels[0] || null)
  const [selectedChat, setSelectedChat] = useState<ChatThreadWithTier | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [notes, setNotes] = useState('')
  const [isVaultOpen, setIsVaultOpen] = useState(false)
  const [selectedAttachment, setSelectedAttachment] = useState<VaultAsset | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ─── Live Fanvue media for vault picker ────────────────────────────────
  const [fanvueVaultMedia, setFanvueVaultMedia] = useState<
    Array<{
      id: string
      title: string | null
      file_name: string
      file_type: 'image' | 'video'
      file_url: string
      thumbnail_url: string | null
    }>
  >([])

  useEffect(() => {
    if (!selectedModel?.id) {
      setFanvueVaultMedia([])
      return
    }
    let cancelled = false
    const fetchAllMedia = async () => {
      type MediaItem = {
        uuid: string
        name: string | null
        caption: string | null
        mediaType: string
        url: string
        thumbnailUrl: string
      }
      const allMedia: typeof fanvueVaultMedia = []
      let hasMore = true
      let page = 1
      const maxPages = 5 // Up to 250 items for the chat picker

      while (hasMore && page <= maxPages && !cancelled) {
        try {
          const res = await fetch(
            `/api/vault/fanvue-media?modelId=${selectedModel.id}&size=50&page=${page}`
          )
          const data = await res.json()
          if (!data.success) break

          const mapped = (data.media || [])
            .filter((m: MediaItem) => m.mediaType === 'image' || m.mediaType === 'video')
            .map((m: MediaItem) => ({
              id: m.uuid, // Fanvue media UUID — used directly in send message API
              title: m.name || m.caption,
              file_name: m.name || m.caption || `${m.mediaType}-${m.uuid.slice(0, 8)}`,
              file_type: m.mediaType as 'image' | 'video',
              file_url: m.url,
              thumbnail_url: m.thumbnailUrl || m.url,
            }))

          allMedia.push(...mapped)
          hasMore = data.pagination?.hasMore ?? false
          page++
        } catch {
          break
        }
      }

      if (!cancelled) {
        setFanvueVaultMedia(allMedia)
      }
    }
    fetchAllMedia()
    return () => {
      cancelled = true
    }
  }, [selectedModel?.id])

  // Chat roster hook with Whale Priority sorting
  const {
    chats,
    loading: chatsLoading,
    error: chatsError,
    refresh: refreshChats,
  } = useChatRosterWithWhalePriority({
    creatorId: selectedModel?.id || null,
    filter,
    search: searchQuery,
  })

  // Fallback to old hook (useFanvueChat requires QueryProvider from layout)
  const { messages: fallbackMessages, sendMessage: fallbackSendMessage } = useChatMessages({
    creatorId: selectedModel?.id || null,
    userUuid: selectedChat?.user.uuid || null,
    pollingInterval: 10000, // 10 seconds
  })

  // Use old messages as default (new hook disabled until QueryProvider issue resolved)
  const fanvueMessages = fallbackMessages
  const messagesLoading = false
  const messagesError: string | null = null
  const sendMessageApi = fallbackSendMessage
  const refreshMessages = async () => {
    // Trigger data refresh
    window.location.reload()
  }
  const creatorUuid = selectedModel?.fanvue_user_id || null

  // Use new messages if available, otherwise fallback
  const messages = fanvueMessages.length > 0 ? fanvueMessages : fallbackMessages

  // Wrapper to handle both new and old sendMessage signatures
  const sendMessage = useCallback(
    async (payload: { text?: string; mediaUuids?: string[]; price?: number } | string) => {
      const userUuid = selectedChat?.user?.uuid
      if (!userUuid) {
        console.error('[MessagesClient] Cannot send message: no user selected')
        return false
      }

      if (typeof payload === 'string') {
        // String payload - call with text directly
        if (fallbackSendMessage) {
          return await fallbackSendMessage(payload)
        }
        return false
      } else {
        // Object payload - extract text and optional params
        if (fallbackSendMessage && payload.text) {
          return await fallbackSendMessage(payload.text, payload.mediaUuids, payload.price)
        }
        return false
      }
    },
    [fallbackSendMessage, selectedChat?.user?.uuid]
  )

  // Update chat store with selected conversation
  const setSelectedConversation = useChatStore(state => state.setSelectedConversation)
  const optimisticMessages = useChatStore(state => state.optimisticMessages)
  // DISABLED: Temporarily sever potential infinite loop (React #185).
  // Re-enable after confirming safe store/router interaction.
  // useEffect(() => {
  //   setSelectedConversation(selectedModel?.id || null, selectedChat?.user.uuid || null)
  // }, [selectedModel?.id, selectedChat?.user.uuid, setSelectedConversation])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Auto-select first chat when chats load
  useEffect(() => {
    if (chats.length > 0 && !selectedChat) {
      setSelectedChat(chats[0])
    }
  }, [chats, selectedChat])

  // Reset selected chat when model changes
  useEffect(() => {
    setSelectedChat(null)
  }, [selectedModel?.id])

  // Keep selected model in sync when list changes
  useEffect(() => {
    if (availableModels.length === 0) {
      setSelectedModel(null)
      return
    }
    if (!selectedModel || !availableModels.some(model => model.id === selectedModel.id)) {
      setSelectedModel(availableModels[0])
    }
  }, [availableModels, selectedModel])

  const handleSelectModel = useCallback(
    (modelId: string) => {
      const nextModel = availableModels.find(model => model.id === modelId) || null
      setSelectedModel(nextModel)
      setSelectedChat(null)
      setSelectedConversation(nextModel?.id || null, null)
    },
    [availableModels, setSelectedConversation]
  )

  const handleSendMessage = async () => {
    if (!messageInput.trim() || sendingMessage) return

    setSendingMessage(true)
    const text = messageInput
    setMessageInput('')

    const success = await sendMessage(text)

    if (success) {
      toast.success('Message sent!')
    } else {
      toast.error('Failed to send message')
      setMessageInput(text) // Restore on failure
    }

    setSendingMessage(false)
  }

  // Filter chats based on search
  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true
    if (!chat?.user) return false // Safety check
    const query = searchQuery.toLowerCase()
    return (
      (chat.user.displayName?.toLowerCase() || '').includes(query) ||
      (chat.user.handle?.toLowerCase() || '').includes(query)
    )
  })

  if (availableModels.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-zinc-950">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Creators Connected</h2>
            <p className="text-muted-foreground mb-4">
              Connect a Fanvue creator to start managing messages.
            </p>
            <Button onClick={() => (window.location.href = '/dashboard/creator-management')}>
              Go to Creator Management
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-zinc-950">
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Bar - Model Tabs */}
        <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(prev => !prev)}
            className="text-zinc-400 hover:text-white"
          >
            {isSidebarOpen ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
          <ModelSelectorTabs
            models={availableModels}
            selectedModelId={selectedModel?.id || null}
            onSelect={handleSelectModel}
          />
          <div className="flex-1" />
          {selectedModel?.unread_messages && selectedModel.unread_messages > 0 && (
            <Badge className="bg-green-500 text-xs">{selectedModel.unread_messages} unread</Badge>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Conversations */}
          <div
            className={`border-r border-zinc-800 flex flex-col bg-zinc-950 transition-all duration-200 ${
              isSidebarOpen ? 'w-80' : 'w-0'
            }`}
          >
            {isSidebarOpen && (
              <>
                {/* Filter Tabs */}
                <div className="flex items-center gap-2 p-3 border-b border-zinc-800">
                  <Button
                    variant={filter === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter('all')}
                    className={filter === 'all' ? 'bg-zinc-700' : 'text-zinc-400'}
                  >
                    All
                  </Button>
                  <Button
                    variant={filter === 'unread' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter('unread')}
                    className={filter === 'unread' ? 'bg-zinc-700' : 'text-zinc-400'}
                  >
                    Unread
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={refreshChats}
                    disabled={chatsLoading}
                    className="h-8 w-8 text-zinc-400"
                  >
                    <RefreshCw className={`w-4 h-4 ${chatsLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {/* Search */}
                <div className="p-3 border-b border-zinc-800">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      placeholder="Search fans..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                  </div>
                </div>

                {/* Conversations List */}
                <ScrollArea className="flex-1">
                  {chatsLoading && chats.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-zinc-500" />
                    </div>
                  ) : chatsError ? (
                    <div className="p-4 text-center">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                      <p className="text-red-400 text-sm">{chatsError}</p>
                      <Button variant="ghost" size="sm" onClick={refreshChats} className="mt-2">
                        Retry
                      </Button>
                    </div>
                  ) : filteredChats.length === 0 ? (
                    <div className="p-4 text-center text-zinc-500">
                      {filter === 'unread' ? 'No unread messages' : 'No conversations yet'}
                    </div>
                  ) : (
                    <div className="p-2">
                      {filteredChats
                        .filter(chat => chat?.user?.uuid) // Safety: Filter out chats without user
                        .map(chat => {
                          // Defensive checks
                          if (!chat?.user) return null
                          const user = chat.user
                          const userUuid = user.uuid || ''
                          const displayName = user.displayName || user.handle || 'Unknown'
                          const handle = user.handle || 'unknown'

                          return (
                            <button
                              key={userUuid}
                              onClick={() => setSelectedChat(chat)}
                              className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${
                                selectedChat?.user?.uuid === userUuid
                                  ? 'bg-zinc-800'
                                  : 'hover:bg-zinc-800/50'
                              }`}
                            >
                              <div className="relative">
                                <Avatar className="w-10 h-10 flex-shrink-0">
                                  <AvatarImage src={user.avatarUrl || undefined} />
                                  <AvatarFallback className="bg-zinc-700 text-white">
                                    {displayName[0]?.toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                {user.isTopSpender && (
                                  <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-medium text-white truncate">
                                      {user.nickname || displayName}
                                    </span>
                                    {chat.tier && (
                                      <Badge
                                        className={`text-xs shrink-0 ${
                                          chat.tier === 'whale'
                                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                            : chat.tier === 'spender'
                                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                              : 'bg-zinc-700/50 text-zinc-400 border-zinc-600'
                                        }`}
                                      >
                                        {chat.tier === 'whale'
                                          ? '🐋'
                                          : chat.tier === 'spender'
                                            ? '💰'
                                            : '👤'}{' '}
                                        {chat.tier}
                                      </Badge>
                                    )}
                                    {chat.ltv !== undefined &&
                                      chat.ltv !== null &&
                                      chat.ltv > 0 && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs shrink-0 bg-zinc-800/50 border-zinc-700 text-zinc-300"
                                        >
                                          ${(chat.ltv / 100).toFixed(0)}
                                        </Badge>
                                      )}
                                  </div>
                                  <span className="text-xs text-zinc-500 flex-shrink-0">
                                    {formatRelativeTime(chat.lastMessageAt)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-sm text-zinc-400 truncate">@{handle}</span>
                                </div>
                                {chat.lastMessage && (
                                  <div className="flex items-center gap-2 mt-1">
                                    {(chat.unreadMessagesCount || 0) > 0 && (
                                      <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                                    )}
                                    <p className="text-sm text-zinc-400 truncate">
                                      {chat.lastMessage.hasMedia && !chat.lastMessage.text
                                        ? '📷 Media'
                                        : chat.lastMessage.text || 'No message'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </button>
                          )
                        })
                        .filter(Boolean)}
                    </div>
                  )}
                </ScrollArea>
              </>
            )}
          </div>

          {/* Center - Chat Area */}
          <div className="flex-1 flex flex-col bg-zinc-950">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={selectedChat.user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-zinc-700 text-white">
                        {selectedChat.user.displayName?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {selectedChat.user.nickname || selectedChat.user.displayName}
                        </span>
                        <span className="text-zinc-400 text-sm">@{selectedChat.user.handle}</span>
                        {selectedChat.user.isTopSpender && (
                          <Badge className="bg-yellow-500/20 text-yellow-500 text-xs gap-1">
                            <Crown className="w-3 h-3" />
                            Top Spender
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">
                          Member since{' '}
                          {new Date(selectedChat.user.registeredAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={refreshMessages}
                      disabled={messagesLoading}
                      className="text-zinc-400"
                    >
                      <RefreshCw className={`w-4 h-4 ${messagesLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Badge className="bg-violet-600 text-white gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI enabled
                    </Badge>
                  </div>
                </div>

                {/* Virtualized Message List - Handles 5,000+ messages at 60fps */}
                <div className="flex-1 overflow-hidden">
                  {messagesLoading && messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-zinc-500" />
                        <p className="text-zinc-400">Loading messages...</p>
                      </div>
                    </div>
                  ) : messagesError ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                        <p className="text-red-400">{messagesError}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => refreshMessages()}
                        >
                          Retry
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <VirtualMessageList
                      messages={messages}
                      creatorUuid={creatorUuid}
                      className="h-full"
                      onRetryMessage={tempId => {
                        // Retry failed message
                        const optimisticMsg = optimisticMessages.get(tempId)
                        if (optimisticMsg && selectedChat) {
                          sendMessage({
                            text: optimisticMsg.text || undefined,
                            mediaUuids:
                              optimisticMsg.mediaUuids.length > 0
                                ? optimisticMsg.mediaUuids
                                : undefined,
                            price: optimisticMsg.price || undefined,
                          })
                        }
                      }}
                      onUnlockPPV={messageUuid => {
                        toast.info('PPV unlock feature coming soon!')
                      }}
                    />
                  )}
                </div>

                {/* High-Performance Input Area with PPV/Vault/Macros */}
                {selectedChat && (
                  <InputArea
                    onSend={async payload => {
                      if (!sendMessage) return false
                      return await sendMessage(payload)
                    }}
                    isLoading={sendingMessage}
                    placeholder="Type a message..."
                    vaultAssets={fanvueVaultMedia}
                    macros={[
                      { id: '1', name: 'Good Morning', text: 'Good morning baby! 💕' },
                      { id: '2', name: 'Good Night', text: 'Good night, sweet dreams! 😘' },
                      { id: '3', name: 'Thank You', text: "Thank you so much! You're amazing! ❤️" },
                    ]}
                    conversationHistory={
                      Array.isArray(messages)
                        ? messages
                            .slice(-10)
                            .map(msg => ({
                              role: (msg.isFromCreator ? 'assistant' : 'user') as
                                | 'user'
                                | 'assistant'
                                | 'system',
                              content: msg.text || (msg.hasMedia ? '[Media]' : ''),
                            }))
                            .filter(msg => msg.content) // Filter out empty messages
                        : []
                    }
                    userModel={selectedModel?.name || undefined}
                    subscriberTier={
                      (selectedChat?.tier as 'whale' | 'spender' | 'free' | 'unknown') || 'unknown'
                    }
                    fanUuid={selectedChat?.user?.uuid}
                    modelId={selectedModel?.id || undefined}
                  />
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-zinc-500">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Fan Profile */}
          <div className="w-80 border-l border-zinc-800 bg-zinc-950 flex flex-col">
            {selectedChat ? (
              <>
                {/* Profile Header */}
                <div className="p-4 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={selectedChat.user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-zinc-700 text-xl">
                        {selectedChat.user.displayName?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {selectedChat.user.nickname || selectedChat.user.displayName}
                      </h2>
                      <p className="text-zinc-400 text-sm">@{selectedChat.user.handle}</p>
                      {selectedChat.user.isTopSpender && (
                        <Badge className="mt-1 bg-yellow-500/20 text-yellow-500">
                          <Crown className="w-3 h-3 mr-1" />
                          Top Spender
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-6">
                    {/* Activity Stats */}
                    <div>
                      <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Activity
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-zinc-800/50 rounded-lg p-3">
                          <p className="text-xs text-zinc-500">First Message</p>
                          <p className="text-sm text-white">
                            {new Date(selectedChat.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg p-3">
                          <p className="text-xs text-zinc-500">Last Message</p>
                          <p className="text-sm text-white">
                            {selectedChat.lastMessageAt
                              ? formatRelativeTime(selectedChat.lastMessageAt)
                              : 'Never'}
                          </p>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg p-3">
                          <p className="text-xs text-zinc-500">Unread</p>
                          <p className="text-sm text-white">{selectedChat.unreadMessagesCount}</p>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg p-3">
                          <p className="text-xs text-zinc-500">Muted</p>
                          <p className="text-sm text-white">
                            {selectedChat.isMuted ? 'Yes' : 'No'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div>
                      <h3 className="font-medium text-white mb-3">Quick Actions</h3>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start border-zinc-700 text-zinc-300"
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Send PPV Content
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start border-zinc-700 text-zinc-300"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Use AI Script
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start border-zinc-700 text-zinc-300"
                          onClick={() => setIsVaultOpen(true)}
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Open Vault
                        </Button>
                      </div>
                    </div>

                    {/* Notes Section */}
                    <div>
                      <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Notes
                      </h3>
                      <Textarea
                        placeholder="Add notes about this fan..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[100px]"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-zinc-400"
                        onClick={() => toast.info('Notes saving coming soon!')}
                      >
                        Save Notes
                      </Button>
                    </div>

                    {/* Member Info */}
                    <div>
                      <h3 className="font-medium text-white mb-3">Member Info</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">User ID</span>
                          <span className="text-white font-mono text-xs truncate max-w-[150px]">
                            {selectedChat.user.uuid}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">Registered</span>
                          <span className="text-white">
                            {new Date(selectedChat.user.registeredAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-500">
                <p>Select a chat to view fan details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vault Modal */}
      <Dialog open={isVaultOpen} onOpenChange={setIsVaultOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select from Vault</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto py-4">
            {fanvueVaultMedia.map(media => (
              <button
                key={media.id}
                onClick={() => {
                  setSelectedAttachment({
                    id: media.id,
                    title: media.title,
                    file_name: media.file_name,
                    url: media.file_url,
                    file_type: media.file_type,
                    price: 0,
                    content_type: 'ppv',
                    model_id: selectedModel?.id || null,
                  })
                  setIsVaultOpen(false)
                  toast.success('Attachment selected')
                }}
                className={`aspect-square rounded-lg overflow-hidden border transition-all hover:border-primary ${
                  selectedAttachment?.id === media.id
                    ? 'border-primary ring-2 ring-primary'
                    : 'border-border'
                }`}
              >
                {media.file_type === 'image' ? (
                  <img
                    src={media.thumbnail_url || media.file_url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1 px-2 truncate max-w-full">
                      {media.title || media.file_name}
                    </span>
                  </div>
                )}
              </button>
            ))}
            {fanvueVaultMedia.length === 0 && (
              <div className="col-span-3 py-8 text-center text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No media for this model</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => (window.location.href = '/dashboard/content/vault')}
                >
                  Go to Vault
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
