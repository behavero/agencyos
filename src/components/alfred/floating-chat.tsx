'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from 'ai/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  X,
  Send,
  Leaf,
  Minimize2,
  Maximize2,
  Bot,
  User,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const SUGGESTED_PROMPTS = [
  { icon: '📊', text: 'Give me a full agency performance report' },
  { icon: '💡', text: 'What strategies can increase our revenue?' },
  { icon: '🎯', text: 'Which quests should we prioritize today?' },
  { icon: '📱', text: 'How can we improve social media reach?' },
  { icon: '💰', text: 'Audit our expenses and find savings' },
  { icon: '🌟', text: 'Analyze our top performer\'s growth potential' },
]

interface AlfredFloatingChatProps {
  modelId?: string
}

export function AlfredFloatingChat({ modelId }: AlfredFloatingChatProps = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, reload, error } = useChat({
    api: '/api/chat',
    body: { modelId },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I'm Alfred, your OnyxOS AI strategist powered by Llama 3.3 70B. I have instant access to your Fanvue revenue, social stats, and team productivity. What would you like to analyze?",
      },
    ],
  })

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, isMinimized])

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt)
    // Trigger submit after setting input
    setTimeout(() => {
      const form = document.getElementById('alfred-chat-form') as HTMLFormElement
      if (form) form.requestSubmit()
    }, 50)
  }

  const showSuggestions = messages.length <= 1 && !isLoading

  // Floating button when closed - Lime theme
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl bg-gradient-to-br from-lime-400 to-green-500 hover:from-lime-300 hover:to-green-400 z-50 glow-lime transition-all hover:scale-105"
        size="icon"
      >
        <Leaf className="w-6 h-6 text-green-900" />
      </Button>
    )
  }

  // Minimized state - Lime theme
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 shadow-2xl">
          <Leaf className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-foreground">Alfred</span>
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => setIsMinimized(false)}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )
  }

  // Full chat window - Lime theme
  return (
    <div className="fixed bottom-6 right-6 w-[420px] h-[560px] bg-card border border-border rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
      {/* Header - Lime gradient */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/20 to-green-500/20 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lime-400 to-green-500 flex items-center justify-center shadow-lg">
            <Leaf className="w-5 h-5 text-green-900" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Alfred</h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span>AI Strategist • Llama 3.3 70B</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' && 'flex-row-reverse'
              )}
            >
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className={cn(
                  message.role === 'assistant'
                    ? 'bg-gradient-to-br from-lime-400 to-green-500 text-green-900'
                    : 'bg-secondary text-foreground'
                )}>
                  {message.role === 'assistant' ? (
                    <Bot className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2.5',
                  message.role === 'assistant'
                    ? 'bg-secondary text-foreground'
                    : 'bg-primary text-primary-foreground'
                )}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}

          {/* Suggested Prompts */}
          {showSuggestions && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Suggested Questions</p>
              <div className="grid gap-2">
                {SUGGESTED_PROMPTS.slice(0, 4).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestedPrompt(prompt.text)}
                    className="flex items-center gap-2 w-full p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary text-left text-sm transition-colors group"
                  >
                    <span className="text-base">{prompt.icon}</span>
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                      {prompt.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gradient-to-br from-lime-400 to-green-500 text-green-900">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-secondary rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Alfred is thinking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-destructive/20 text-destructive">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-destructive/10 border border-destructive/20 rounded-2xl px-4 py-3">
                <p className="text-sm text-destructive">
                  {error.message || 'Something went wrong. Please try again.'}
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => reload()}
                  className="mt-2 text-xs"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <form id="alfred-chat-form" onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            placeholder="Ask Alfred anything..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Powered by GPT-4o • Has access to your Fanvue data
        </p>
      </div>
    </div>
  )
}
