'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Send, 
  Sparkles,
  TrendingUp,
  Users,
  Target,
  Crown
} from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  id: string
  role: 'user' | 'alfred'
  content: string
  timestamp: Date
}

interface AlfredClientProps {
  userName: string
  agencyName: string
}

export default function AlfredClient({ userName, agencyName }: AlfredClientProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'alfred',
      content: `Good day, ${userName}. Alfred reporting for duty.\n\nI am your agency strategist, ready to provide insights on revenue, model performance, and team efficiency.\n\nHow may I assist you today?`,
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/alfred/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()

      const alfredMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'alfred',
        content: data.response,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, alfredMessage])
    } catch (error) {
      console.error('[Alfred] Error:', error)
      toast.error('Failed to connect to Alfred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-600/20 flex items-center justify-center border-2 border-yellow-500/50">
              <Crown className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Alfred</h1>
              <p className="text-muted-foreground">Your Agency Strategist</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytics
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="w-4 h-4" />
            Models
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Target className="w-4 h-4" />
            Tasks
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-950/50 border-yellow-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-500">Active Context</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agencyName}</div>
            <p className="text-xs text-muted-foreground mt-1">Real-time agency data</p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-950/50 border-yellow-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-500">Data Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground mt-1">Treasury, Models, Tasks, Team</p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-950/50 border-yellow-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-500">Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">&lt; 2s</div>
            <p className="text-xs text-muted-foreground mt-1">Average inference speed</p>
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface - "Batcave" Theme */}
      <Card className="bg-zinc-950/80 border-yellow-500/30 shadow-2xl">
        <CardHeader className="border-b border-yellow-500/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <CardTitle className="text-yellow-500">Strategy Room</CardTitle>
          </div>
          <CardDescription>Private consultation with your AI advisor</CardDescription>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Messages */}
          <ScrollArea ref={scrollRef} className="h-[500px] p-6">
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'alfred' && (
                    <Avatar className="w-10 h-10 border-2 border-yellow-500/50 bg-zinc-900">
                      <AvatarFallback className="bg-gradient-to-br from-yellow-500/20 to-amber-600/20 text-yellow-500 font-bold">
                        A
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`max-w-[70%] rounded-xl p-4 ${
                      message.role === 'alfred'
                        ? 'bg-zinc-900/80 border-2 border-yellow-500/30 text-zinc-100'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                    <p className="text-xs opacity-50 mt-2">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  
                  {message.role === 'user' && (
                    <Avatar className="w-10 h-10 border-2 border-primary bg-primary/20">
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                        {userName[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <Avatar className="w-10 h-10 border-2 border-yellow-500/50 bg-zinc-900">
                    <AvatarFallback className="bg-gradient-to-br from-yellow-500/20 to-amber-600/20 text-yellow-500 font-bold">
                      A
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-zinc-900/80 border-2 border-yellow-500/30 rounded-xl p-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce delay-75" />
                      <div className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce delay-150" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-yellow-500/20 p-4 bg-zinc-950/50">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Alfred anything about your agency..."
                disabled={isLoading}
                className="flex-1 bg-zinc-900/50 border-yellow-500/20 focus:border-yellow-500/50"
              />
              <Button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                <Send className="w-4 h-4" />
                Send
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Alfred has access to real-time agency data and performance metrics
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-zinc-950/50 border-yellow-500/20 hover:border-yellow-500/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="text-sm">💡 Strategic Analysis</CardTitle>
            <CardDescription>
              "Analyze current model performance and suggest optimization strategies"
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="bg-zinc-950/50 border-yellow-500/20 hover:border-yellow-500/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="text-sm">📊 Revenue Forecast</CardTitle>
            <CardDescription>
              "Project next month's revenue based on current trends"
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
