'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Database } from '@/types/database.types'
import {
  Search,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  DollarSign,
  Image as ImageIcon,
  Lock,
  Zap,
  MessageCircle
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

type Model = Database['public']['Tables']['models']['Row']

interface MessagesClientProps {
  models: Model[]
}

// Mock conversations
const mockConversations = [
  {
    id: '1',
    fanName: 'Alex Thompson',
    avatar: '👤',
    lastMessage: 'Hey beautiful! 💕',
    timestamp: '2m ago',
    unread: 3,
    modelId: '1',
    isWhale: false,
  },
  {
    id: '2',
    fanName: 'Michael Johnson',
    avatar: '💎',
    lastMessage: 'Can I get a custom video?',
    timestamp: '15m ago',
    unread: 1,
    modelId: '1',
    isWhale: true,
  },
  {
    id: '3',
    fanName: 'Sarah Williams',
    avatar: '🌟',
    lastMessage: 'Thanks for the pic!',
    timestamp: '1h ago',
    unread: 0,
    modelId: '1',
    isWhale: false,
  },
  {
    id: '4',
    fanName: 'David Martinez',
    avatar: '🔥',
    lastMessage: 'When are you posting next?',
    timestamp: '2h ago',
    unread: 2,
    modelId: '1',
    isWhale: false,
  },
]

// Mock messages
const mockMessages = [
  {
    id: '1',
    content: 'Hey beautiful! 💕',
    sender: 'fan',
    timestamp: '10:30 AM',
    isPPV: false,
  },
  {
    id: '2',
    content: 'Hi! Thanks for subscribing! 😊',
    sender: 'model',
    timestamp: '10:32 AM',
    isPPV: false,
  },
  {
    id: '3',
    content: 'Do you have any exclusive content?',
    sender: 'fan',
    timestamp: '10:35 AM',
    isPPV: false,
  },
  {
    id: '4',
    content: 'Yes! Check this out 🔥',
    sender: 'model',
    timestamp: '10:36 AM',
    isPPV: true,
    ppvPrice: 25,
  },
]

export default function MessagesClient({ models }: MessagesClientProps) {
  const [selectedConversation, setSelectedConversation] = useState(mockConversations[0])
  const [messageInput, setMessageInput] = useState('')

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversations List */}
      <div className="w-80 border-r border-border flex flex-col bg-card">
        {/* Search Header */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-9 bg-muted/50 border-0"
            />
          </div>
        </div>

        {/* Model Filter */}
        <div className="p-3 border-b border-border">
          <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2">
            <Badge variant="default" className="cursor-pointer whitespace-nowrap">
              All ({mockConversations.length})
            </Badge>
            <Badge variant="outline" className="cursor-pointer whitespace-nowrap">
              🔥 Hot (2)
            </Badge>
            <Badge variant="outline" className="cursor-pointer whitespace-nowrap">
              💎 Whales (1)
            </Badge>
            <Badge variant="outline" className="cursor-pointer whitespace-nowrap">
              ⏰ Pending (4)
            </Badge>
          </div>
        </div>

        {/* Conversations */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {mockConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 ${
                  selectedConversation.id === conversation.id ? 'bg-muted' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-2xl">
                    {conversation.avatar}
                  </div>
                  {conversation.isWhale && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                      💎
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold truncate">{conversation.fanName}</p>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {conversation.timestamp}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.lastMessage}
                    </p>
                    {conversation.unread > 0 && (
                      <Badge className="h-5 px-2 bg-primary text-xs">
                        {conversation.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-xl">
              {selectedConversation.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{selectedConversation.fanName}</h2>
                {selectedConversation.isWhale && (
                  <Badge className="bg-accent text-accent-foreground gap-1">
                    <DollarSign className="w-3 h-3" />
                    Whale
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Active now</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Video className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-4xl mx-auto">
            {mockMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'model' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] ${
                    message.sender === 'model'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  } rounded-2xl p-3 ${message.isPPV ? 'border-2 border-accent' : ''}`}
                >
                  {message.isPPV && (
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-primary-foreground/20">
                      <Lock className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        PPV Content - ${message.ppvPrice}
                      </span>
                    </div>
                  )}
                  <p className="text-sm">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === 'model'
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {message.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Quick Actions Bar */}
        <div className="px-4 py-2 border-t border-border bg-card">
          <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2">
            <Button variant="outline" size="sm" className="gap-1 flex-shrink-0">
              ⚡ Script
            </Button>
            <Button variant="outline" size="sm" className="gap-1 flex-shrink-0">
              🔒 Vault
            </Button>
            <Button variant="outline" size="sm" className="gap-1 flex-shrink-0">
              💸 Send PPV
            </Button>
            <Button variant="outline" size="sm" className="gap-1 flex-shrink-0">
              🎁 Offer
            </Button>
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex items-end gap-2">
            <div className="flex gap-1">
              <Button variant="ghost" size="icon">
                <Paperclip className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <ImageIcon className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Smile className="w-5 h-5" />
              </Button>
            </div>
            <Input
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  // Send message logic here
                  setMessageInput('')
                }
              }}
            />
            <Button className="gap-2">
              <Send className="w-4 h-4" />
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Fan Info */}
      <div className="w-80 border-l border-border bg-card p-4 overflow-y-auto scrollbar-thin">
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-4xl mx-auto mb-3">
            {selectedConversation.avatar}
          </div>
          <h3 className="font-semibold text-lg">{selectedConversation.fanName}</h3>
          <p className="text-sm text-muted-foreground">@alex_thompson</p>
        </div>

        {/* Stats */}
        <Card className="glass mb-4">
          <CardContent className="p-4">
            <h4 className="font-semibold mb-3">Fan Stats</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Spent</span>
                <span className="font-semibold">$485</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Messages</span>
                <span className="font-semibold">142</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Member Since</span>
                <span className="font-semibold">Jan 2024</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tier</span>
                <Badge>Premium</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card className="glass">
          <CardContent className="p-4">
            <h4 className="font-semibold mb-3">Tags</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">High Spender</Badge>
              <Badge variant="secondary">PPV Buyer</Badge>
              <Badge variant="secondary">Regular</Badge>
              <Badge variant="secondary">Engaged</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="glass mt-4">
          <CardContent className="p-4">
            <h4 className="font-semibold mb-3">Notes</h4>
            <textarea
              className="w-full min-h-[100px] p-2 rounded-lg bg-muted border border-border text-sm resize-none"
              placeholder="Add private notes about this fan..."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
