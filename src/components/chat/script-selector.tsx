'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { 
  ScrollText,
  MessageSquare, 
  Target, 
  DollarSign, 
  HelpCircle, 
  Heart, 
  Sparkles,
  Search,
  Star,
  Copy,
  Check,
} from 'lucide-react'

interface Script {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  usage_count: number
  is_favorite: boolean
}

interface ScriptSelectorProps {
  onSelect: (content: string) => void
}

const categories = [
  { value: 'all', label: 'All', icon: ScrollText },
  { value: 'opener', label: 'Openers', icon: MessageSquare },
  { value: 'closer', label: 'Closers', icon: Target },
  { value: 'upsell', label: 'Upsell', icon: DollarSign },
  { value: 'objection', label: 'Objections', icon: HelpCircle },
  { value: 'ppv', label: 'PPV', icon: Heart },
]

export function ScriptSelector({ onSelect }: ScriptSelectorProps) {
  const [open, setOpen] = useState(false)
  const [scripts, setScripts] = useState<Script[]>([])
  const [grouped, setGrouped] = useState<Record<string, Script[]>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchScripts()
    }
  }, [open])

  const fetchScripts = async () => {
    try {
      const response = await fetch('/api/scripts')
      const data = await response.json()
      setScripts(data.scripts || [])
      setGrouped(data.grouped || {})
    } catch (error) {
      console.error('Failed to fetch scripts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = async (script: Script) => {
    onSelect(script.content)
    setCopiedId(script.id)
    
    // Track usage
    fetch(`/api/scripts/${script.id}`, { method: 'POST' }).catch(() => {})
    
    setTimeout(() => {
      setCopiedId(null)
      setOpen(false)
    }, 500)
  }

  const filteredScripts = scripts.filter(script => {
    const matchesCategory = selectedCategory === 'all' || script.category === selectedCategory
    const matchesSearch = !searchQuery || 
      script.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      script.content.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Separate favorites
  const favorites = filteredScripts.filter(s => s.is_favorite)
  const regular = filteredScripts.filter(s => !s.is_favorite)
  const sortedScripts = [...favorites, ...regular]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-zinc-400 hover:text-white"
        >
          <ScrollText className="w-4 h-4 text-amber-400" />
          <span className="text-xs">Scripts</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] p-0 bg-zinc-900 border-zinc-800" 
        align="start"
        sideOffset={8}
      >
        {/* Header with Search */}
        <div className="p-3 border-b border-zinc-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search scripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 bg-zinc-800 border-zinc-700"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-3 pt-2">
          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSelectedCategory(cat.value)}
              >
                <cat.icon className="w-3 h-3 mr-1" />
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Scripts List */}
        <ScrollArea className="h-[300px]">
          <div className="p-3 space-y-2">
            {loading ? (
              <div className="text-center py-8 text-zinc-500">Loading scripts...</div>
            ) : sortedScripts.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No scripts found</p>
              </div>
            ) : (
              sortedScripts.map((script) => (
                <div
                  key={script.id}
                  onClick={() => handleSelect(script)}
                  className="p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 cursor-pointer transition-colors border border-transparent hover:border-zinc-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {script.is_favorite && (
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        )}
                        <h4 className="font-medium text-white text-sm truncate">
                          {script.title}
                        </h4>
                      </div>
                      <p className="text-xs text-zinc-500 line-clamp-2 mt-1">
                        {script.content}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {script.category}
                        </Badge>
                        <span className="text-xs text-zinc-600">
                          Used {script.usage_count}x
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {copiedId === script.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-zinc-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 text-center">
          <a 
            href="/dashboard/academy/scripts" 
            className="text-xs text-primary hover:underline"
          >
            Manage Scripts →
          </a>
        </div>
      </PopoverContent>
    </Popover>
  )
}
