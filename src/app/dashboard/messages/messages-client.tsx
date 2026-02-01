'use client'

import { useState, useEffect, useRef } from 'react'
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
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { useChatRoster, ChatThread } from '@/hooks/use-chat-roster'
import { useChatMessages, ChatMessage } from '@/hooks/use-chat-messages'

type Model = Database['public']['Tables']['models']['Row']

interface VaultAsset {
  id: string
  title: string | null
  file_name: string
  url: string
  file_type: string
  price: number
  content_type: string
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
  const [selectedModel, setSelectedModel] = useState<Model | null>(models[0] || null)
  const [selectedChat, setSelectedChat] = useState<ChatThread | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [notes, setNotes] = useState('')
  const [isVaultOpen, setIsVaultOpen] = useState(false)
  const [selectedAttachment, setSelectedAttachment] = useState<VaultAsset | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Chat roster hook
  const {
    chats,
    loading: chatsLoading,
    error: chatsError,
    refresh: refreshChats,
  } = useChatRoster({
    creatorId: selectedModel?.id || null,
    filter,
    search: searchQuery,
  })

  // Chat messages hook with 10-second polling
  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    sendMessage: sendMessageApi,
    refresh: refreshMessages,
    creatorUuid,
  } = useChatMessages({
    creatorId: selectedModel?.id || null,
    userUuid: selectedChat?.user.uuid || null,
    pollingInterval: 10000, // 10 seconds
  })

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

  const handleSendMessage = async () => {
    if (!messageInput.trim() || sendingMessage) return
    
    setSendingMessage(true)
    const text = messageInput
    setMessageInput('')

    const success = await sendMessageApi(text)
    
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
    const query = searchQuery.toLowerCase()
    return (
      chat.user.displayName.toLowerCase().includes(query) ||
      chat.user.handle.toLowerCase().includes(query)
    )
  })

  if (models.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-background">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Creators Connected</h2>
            <p className="text-muted-foreground mb-4">
              Connect a Fanvue creator to start managing messages.
            </p>
            <Button onClick={() => window.location.href = '/dashboard/creator-management'}>
              Go to Creator Management
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#0a0f1a]">
      {/* Left Sidebar - Conversations */}
      <div className="w-80 border-r border-zinc-800 flex flex-col bg-[#0d1321]">
        {/* Model Tabs */}
        <div className="flex items-center gap-2 p-3 border-b border-zinc-800 bg-[#0a0f1a] overflow-x-auto">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                setSelectedModel(model)
                setSelectedChat(null)
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedModel?.id === model.id
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800/50'
              }`}
            >
              <Avatar className="w-6 h-6">
                <AvatarImage src={model.avatar_url || undefined} />
                <AvatarFallback className="bg-violet-600 text-xs">
                  {model.name?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[100px]">{model.name}</span>
              {model.unread_messages && model.unread_messages > 0 && (
                <Badge className="bg-green-500 text-xs">{model.unread_messages}</Badge>
              )}
            </button>
          ))}
        </div>

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
              onChange={(e) => setSearchQuery(e.target.value)}
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
              {filteredChats.map((chat) => (
                <button
                  key={chat.user.uuid}
                  onClick={() => setSelectedChat(chat)}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${
                    selectedChat?.user.uuid === chat.user.uuid
                      ? 'bg-zinc-800'
                      : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="relative">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={chat.user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-zinc-700 text-white">
                        {chat.user.displayName?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {chat.user.isTopSpender && (
                      <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-white truncate">
                        {chat.user.nickname || chat.user.displayName}
                      </span>
                      <span className="text-xs text-zinc-500 flex-shrink-0">
                        {formatRelativeTime(chat.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-zinc-400 truncate">
                        @{chat.user.handle}
                      </span>
                    </div>
                    {chat.lastMessage && (
                      <div className="flex items-center gap-2 mt-1">
                        {chat.unreadMessagesCount > 0 && (
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
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Center - Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0a0f1a]">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#0d1321]">
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
                    <span className="text-zinc-400 text-sm">
                      @{selectedChat.user.handle}
                    </span>
                    {selectedChat.user.isTopSpender && (
                      <Badge className="bg-yellow-500/20 text-yellow-500 text-xs gap-1">
                        <Crown className="w-3 h-3" />
                        Top Spender
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">
                      Member since {new Date(selectedChat.user.registeredAt).toLocaleDateString()}
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

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {messagesLoading && messages.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-zinc-500" />
                  </div>
                ) : messagesError ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                    <p className="text-red-400">{messagesError}</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.uuid}
                      className={`flex ${message.isFromCreator ? 'justify-end' : 'justify-start'}`}
                    >
                      {!message.isFromCreator && (
                        <Avatar className="w-8 h-8 mr-2 flex-shrink-0">
                          <AvatarImage src={selectedChat.user.avatarUrl || undefined} />
                          <AvatarFallback className="bg-zinc-700 text-xs">
                            {selectedChat.user.displayName?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="max-w-[70%]">
                        <div
                          className={`rounded-2xl px-4 py-2.5 ${
                            message.isFromCreator
                              ? message.isPending
                                ? 'bg-violet-600/50 text-white/70'
                                : message.isFailed
                                ? 'bg-red-600/50 text-white'
                                : 'bg-violet-600 text-white'
                              : 'bg-zinc-700 text-white'
                          }`}
                        >
                          {message.hasMedia && (
                            <div className="flex items-center gap-1 text-sm opacity-75 mb-1">
                              <ImageIcon className="w-4 h-4" />
                              <span>{message.mediaType || 'Media'}</span>
                            </div>
                          )}
                          {message.pricing && (
                            <div className="flex items-center gap-1 text-sm text-yellow-300 mb-1">
                              <DollarSign className="w-4 h-4" />
                              <span>${message.pricing.USD.price} PPV</span>
                              {message.purchasedAt && <Check className="w-4 h-4" />}
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{message.text || ''}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 px-1">
                          <span className="text-xs text-zinc-500">
                            {formatTime(message.sentAt)}
                          </span>
                          {message.isFromCreator && (
                            <>
                              {message.isPending ? (
                                <Clock className="w-3 h-3 text-zinc-500" />
                              ) : message.isFailed ? (
                                <AlertCircle className="w-3 h-3 text-red-500" />
                              ) : (
                                <CheckCheck className="w-3 h-3 text-blue-400" />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {message.isFromCreator && (
                        <Avatar className="w-8 h-8 ml-2 flex-shrink-0">
                          <AvatarImage src={selectedModel?.avatar_url || undefined} />
                          <AvatarFallback className="bg-violet-600 text-xs">
                            {selectedModel?.name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-zinc-800 bg-[#0d1321]">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                  <Smile className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`text-zinc-400 hover:text-white ${selectedAttachment ? 'text-primary' : ''}`}
                  onClick={() => setIsVaultOpen(true)}
                  title="Attach from Vault"
                >
                  <VaultIcon className="w-5 h-5" />
                </Button>
                {selectedAttachment && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-zinc-800 rounded-lg">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <span className="text-xs text-zinc-300 max-w-20 truncate">
                      {selectedAttachment.title || selectedAttachment.file_name}
                    </span>
                    <button 
                      onClick={() => setSelectedAttachment(null)}
                      className="text-zinc-500 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                  <DollarSign className="w-5 h-5" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  className="flex-1 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
                  disabled={sendingMessage}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendingMessage}
                  className="bg-violet-600 hover:bg-violet-700 gap-2"
                >
                  {sendingMessage ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Send
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
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
      <div className="w-80 border-l border-zinc-800 bg-[#0d1321] flex flex-col">
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
                      <p className="text-sm text-white">{selectedChat.isMuted ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="font-medium text-white mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start border-zinc-700 text-zinc-300">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Send PPV Content
                    </Button>
                    <Button variant="outline" className="w-full justify-start border-zinc-700 text-zinc-300">
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
                    onChange={(e) => setNotes(e.target.value)}
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

      {/* Vault Modal */}
      <Dialog open={isVaultOpen} onOpenChange={setIsVaultOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select from Vault</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto py-4">
            {vaultAssets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => {
                  setSelectedAttachment(asset)
                  setIsVaultOpen(false)
                  toast.success('Attachment selected')
                }}
                className={`aspect-square rounded-lg overflow-hidden border transition-all hover:border-primary ${
                  selectedAttachment?.id === asset.id
                    ? 'border-primary ring-2 ring-primary'
                    : 'border-border'
                }`}
              >
                {asset.file_type === 'image' ? (
                  <img src={asset.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1 px-2 truncate max-w-full">
                      {asset.title || asset.file_name}
                    </span>
                  </div>
                )}
              </button>
            ))}
            {vaultAssets.length === 0 && (
              <div className="col-span-3 py-8 text-center text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No assets in vault</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.location.href = '/dashboard/content/vault'}
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
