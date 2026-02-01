'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Eye,
  MessageCircle,
  Plus,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

type Model = Database['public']['Tables']['models']['Row']

interface MessagesClientProps {
  models: Model[]
}

interface Chat {
  uuid: string
  user: {
    uuid: string
    handle: string
    displayName: string
    avatarUrl?: string
  }
  lastMessage?: {
    text: string
    createdAt: string
    isFromCreator: boolean
  }
  unreadCount: number
  isPinned?: boolean
}

interface Message {
  uuid: string
  text: string
  createdAt: string
  isFromCreator: boolean
  hasMedia?: boolean
  price?: number
  sentByAI?: boolean
}

interface FanProfile {
  uuid: string
  handle: string
  displayName: string
  avatarUrl?: string
  location?: string
  birthday?: string
  preferences?: string[]
  lastSeen?: string
  lastResponse?: string
  lastRead?: string
  totalSpent?: number
  totalTips?: number
  totalPpv?: number
  isSubscriber?: boolean
  avgTips?: number
  avgPpv?: number
  customAttributes?: { key: string; value: string }[]
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `about ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

export default function MessagesClient({ models }: MessagesClientProps) {
  const [selectedModel, setSelectedModel] = useState<Model | null>(models[0] || null)
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [fanProfile, setFanProfile] = useState<FanProfile | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch chats when model changes
  useEffect(() => {
    if (selectedModel) {
      fetchChats()
    }
  }, [selectedModel])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchChats = async () => {
    if (!selectedModel) return
    setLoading(true)
    
    try {
      const response = await fetch(`/api/creators/${selectedModel.id}/messages?size=50`)
      const data = await response.json()
      
      if (response.ok && data.data) {
        setChats(data.data)
        if (data.data.length > 0 && !selectedChat) {
          setSelectedChat(data.data[0])
          fetchMessages(data.data[0].user.uuid)
        }
      } else {
        console.error('Failed to fetch chats:', data.error)
      }
    } catch (error) {
      console.error('Error fetching chats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (userUuid: string) => {
    if (!selectedModel) return
    
    try {
      // For now, we'll show the last message from the chat
      // In production, you'd fetch the full message history
      const chat = chats.find(c => c.user.uuid === userUuid)
      if (chat?.lastMessage) {
        setMessages([{
          uuid: '1',
          text: chat.lastMessage.text,
          createdAt: chat.lastMessage.createdAt,
          isFromCreator: chat.lastMessage.isFromCreator,
        }])
      }
      
      // Set basic fan profile from chat data
      setFanProfile({
        uuid: chat?.user.uuid || userUuid,
        handle: chat?.user.handle || '',
        displayName: chat?.user.displayName || '',
        avatarUrl: chat?.user.avatarUrl,
      })
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedChat || !selectedModel) return
    
    setSendingMessage(true)
    const messageText = messageInput
    setMessageInput('')
    
    // Optimistically add message to UI
    const tempMessage: Message = {
      uuid: `temp-${Date.now()}`,
      text: messageText,
      createdAt: new Date().toISOString(),
      isFromCreator: true,
    }
    setMessages(prev => [...prev, tempMessage])
    
    try {
      const response = await fetch(`/api/creators/${selectedModel.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUuid: selectedChat.user.uuid,
          text: messageText,
        }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success('Message sent!')
      } else {
        toast.error(data.error || 'Failed to send message')
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.uuid !== tempMessage.uuid))
        setMessageInput(messageText) // Restore the message
      }
    } catch (error) {
      toast.error('Failed to send message')
      setMessages(prev => prev.filter(m => m.uuid !== tempMessage.uuid))
      setMessageInput(messageText)
    } finally {
      setSendingMessage(false)
    }
  }

  const filteredChats = chats.filter(chat => {
    if (filter === 'unread' && chat.unreadCount === 0) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return chat.user.displayName.toLowerCase().includes(query) ||
             chat.user.handle.toLowerCase().includes(query)
    }
    return true
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
        <div className="flex items-center gap-2 p-3 border-b border-zinc-800 bg-[#0a0f1a]">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                setSelectedModel(model)
                setSelectedChat(null)
                setMessages([])
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
              {selectedModel?.id === model.id && (
                <X className="w-3 h-3 text-zinc-500" />
              )}
            </button>
          ))}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
            <Plus className="w-4 h-4" />
          </Button>
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
            onClick={fetchChats}
            disabled={loading}
            className="h-8 w-8 text-zinc-400"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-zinc-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {loading && chats.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-zinc-500" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-4 text-center text-zinc-500">
              {filter === 'unread' ? 'No unread messages' : 'No conversations yet'}
            </div>
          ) : (
            <div className="p-2">
              {filteredChats.map((chat) => (
                <button
                  key={chat.uuid}
                  onClick={() => {
                    setSelectedChat(chat)
                    fetchMessages(chat.user.uuid)
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${
                    selectedChat?.uuid === chat.uuid
                      ? 'bg-zinc-800'
                      : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={chat.user.avatarUrl} />
                    <AvatarFallback className="bg-zinc-700 text-white">
                      {chat.user.displayName?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-white truncate">
                        {chat.user.displayName}
                      </span>
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-violet-400" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-zinc-400 truncate">
                        @{chat.user.handle}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {chat.lastMessage && formatRelativeTime(chat.lastMessage.createdAt)}
                      </span>
                    </div>
                    {chat.lastMessage && (
                      <div className="flex items-center gap-2 mt-1">
                        {chat.unreadCount > 0 && (
                          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        )}
                        <p className="text-sm text-zinc-400 truncate">
                          {chat.lastMessage.text}
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
                  <AvatarImage src={selectedChat.user.avatarUrl} />
                  <AvatarFallback className="bg-zinc-700 text-white">
                    {selectedChat.user.displayName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {selectedChat.user.displayName}
                    </span>
                    <span className="text-zinc-400 text-sm">
                      @{selectedChat.user.handle}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs text-zinc-500">is offline</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-violet-600 text-white gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI enabled
                </Badge>
                <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                  9/10 Scripts available
                </Badge>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map((message) => (
                  <div
                    key={message.uuid}
                    className={`flex ${message.isFromCreator ? 'justify-start' : 'justify-end'}`}
                  >
                    {message.isFromCreator && (
                      <Avatar className="w-8 h-8 mr-2 flex-shrink-0">
                        <AvatarImage src={selectedModel?.avatar_url || undefined} />
                        <AvatarFallback className="bg-violet-600 text-xs">
                          {selectedModel?.name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="max-w-[70%]">
                      <div
                        className={`rounded-2xl px-4 py-2.5 ${
                          message.isFromCreator
                            ? 'bg-zinc-700 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 px-1">
                        <span className="text-xs text-zinc-500">
                          {formatTime(message.createdAt)}
                        </span>
                        {message.isFromCreator && (
                          <>
                            <span className="text-blue-400">✓✓</span>
                            {message.sentByAI && (
                              <span className="text-xs text-zinc-500">• Sent by AI</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-zinc-800 bg-[#0d1321]">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                  <Smile className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                  <Clock className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                  <DollarSign className="w-5 h-5" />
                </Button>
                <Input
                  placeholder="Type something..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  className="flex-1 bg-transparent border-0 text-white placeholder:text-zinc-500 focus-visible:ring-0"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || sendingMessage}
                  className="bg-violet-600 hover:bg-violet-700 gap-2"
                >
                  Send
                  <Send className="w-4 h-4" />
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
        {selectedChat && fanProfile ? (
          <>
            {/* Profile Toggle */}
            <div className="flex border-b border-zinc-800">
              <button className="flex-1 py-3 text-sm font-medium text-white border-b-2 border-white flex items-center justify-center gap-2">
                <Heart className="w-4 h-4" />
                Fan
              </button>
              <button className="flex-1 py-3 text-sm font-medium text-zinc-500 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                Creator
              </button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {/* Fan Header */}
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {fanProfile.displayName}
                  </h2>
                  <p className="text-zinc-400">@{fanProfile.handle}</p>
                </div>

                {/* Basic Info */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">Location</span>
                    </div>
                    <button className="text-sm text-violet-400 hover:text-violet-300">
                      Click to select country <ChevronDown className="w-3 h-3 inline" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Birthday</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="text-sm text-violet-400 hover:text-violet-300">
                        Set date <ChevronDown className="w-3 h-3 inline" />
                      </button>
                      <span className="text-zinc-500">-</span>
                      <span className="text-violet-400">27y</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Heart className="w-4 h-4" />
                      <span className="text-sm">Preferences</span>
                    </div>
                    <span className="text-violet-400 text-sm">rock music</span>
                  </div>
                </div>

                {/* Activity */}
                <div>
                  <button className="flex items-center justify-between w-full py-2">
                    <span className="font-medium text-white">Activity</span>
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  </button>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">Seen</p>
                      <p className="text-sm text-white">-</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">Response</p>
                      <p className="text-sm text-white">2/1 7:26pm</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">Read</p>
                      <p className="text-sm text-white">2/1 7:26pm</p>
                    </div>
                  </div>
                </div>

                {/* Financial */}
                <div>
                  <button className="flex items-center justify-between w-full py-2">
                    <span className="font-medium text-white">Financial</span>
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  </button>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">Spent</p>
                      <p className="text-sm text-white">$0</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">Tips</p>
                      <p className="text-sm text-white">$0</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">PPV</p>
                      <p className="text-sm text-white">$0</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">Sub</p>
                      <p className="text-sm text-white">No</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">Avg Tips</p>
                      <p className="text-sm text-white">$0</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">Avg PPV</p>
                      <p className="text-sm text-white">$0</p>
                    </div>
                  </div>
                </div>

                {/* Custom Attributes */}
                <div>
                  <button className="flex items-center justify-between w-full py-2">
                    <span className="font-medium text-white">Custom Attributes (10)</span>
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  </button>
                  <Button
                    variant="outline"
                    className="w-full mt-2 border-zinc-700 text-zinc-400 hover:text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between p-2 rounded bg-zinc-800/50">
                      <span className="text-sm text-zinc-400">Payday</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white">N/A</span>
                        <MoreVertical className="w-4 h-4 text-zinc-500" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-zinc-800/50">
                      <span className="text-sm text-zinc-400">Salary</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white">-</span>
                        <MoreVertical className="w-4 h-4 text-zinc-500" />
                      </div>
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
  )
}
