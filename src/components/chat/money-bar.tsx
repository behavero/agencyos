'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'
import { ScriptSelector } from './script-selector'
import {
  Send,
  Image,
  DollarSign,
  Eye,
  EyeOff,
  X,
  Lock,
} from 'lucide-react'

interface VaultAsset {
  id: string
  url: string
  thumbnail_url?: string
  type: 'image' | 'video'
  title?: string
  price?: number
}

interface MoneyBarProps {
  onSend: (message: string, options?: { 
    price?: number
    mediaUrl?: string
    mediaType?: string 
  }) => void
  blurMode: boolean
  onBlurToggle: () => void
  onOpenVault?: () => void
  isLoading?: boolean
  placeholder?: string
}

export function MoneyBar({
  onSend,
  blurMode,
  onBlurToggle,
  onOpenVault,
  isLoading = false,
  placeholder = 'Type a message...',
}: MoneyBarProps) {
  const [message, setMessage] = useState('')
  const [price, setPrice] = useState<string>('')
  const [showPriceInput, setShowPriceInput] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<VaultAsset | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }, [message])

  // Handle send
  const handleSend = () => {
    if (!message.trim() && !selectedAsset) {
      toast.error('Please enter a message or attach media')
      return
    }

    const priceValue = price ? parseFloat(price) : undefined
    
    onSend(message, {
      price: priceValue,
      mediaUrl: selectedAsset?.url,
      mediaType: selectedAsset?.type,
    })

    // Reset
    setMessage('')
    setPrice('')
    setShowPriceInput(false)
    setSelectedAsset(null)
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Remove selected asset
  const removeAsset = () => {
    setSelectedAsset(null)
  }

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
      {/* Selected Asset Preview */}
      {selectedAsset && (
        <div className="px-4 pt-3">
          <div className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="relative w-16 h-16 rounded overflow-hidden bg-zinc-700 shrink-0">
              {selectedAsset.thumbnail_url || selectedAsset.url ? (
                <img
                  src={selectedAsset.thumbnail_url || selectedAsset.url}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="w-6 h-6 text-zinc-500" />
                </div>
              )}
              {selectedAsset.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <span className="text-xs text-white">VIDEO</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">
                {selectedAsset.title || 'Vault Asset'}
              </p>
              {selectedAsset.price && (
                <Badge variant="outline" className="text-green-400 border-green-500/30">
                  ${selectedAsset.price}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={removeAsset}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Tools Row */}
      <div className="flex items-center gap-1 px-4 pt-3">
        {/* Vault Button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-zinc-400 hover:text-white"
          onClick={onOpenVault}
        >
          <Lock className="w-4 h-4 text-purple-400" />
          <span className="text-xs">Vault</span>
        </Button>

        {/* Price Button */}
        <Popover open={showPriceInput} onOpenChange={setShowPriceInput}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 gap-1.5 ${price ? 'text-green-400' : 'text-zinc-400'} hover:text-white`}
            >
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">{price ? `$${price}` : 'Price'}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3 bg-zinc-800 border-zinc-700" align="start">
            <div className="space-y-2">
              <label className="text-xs text-zinc-400">PPV Price</label>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">$</span>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="h-8 bg-zinc-700 border-zinc-600"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {[5, 10, 25, 50, 100].map((p) => (
                  <Button
                    key={p}
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setPrice(p.toString())}
                  >
                    ${p}
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Scripts Selector */}
        <ScriptSelector onSelect={(content) => setMessage(content)} />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Blur Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 gap-1.5 ${blurMode ? 'text-red-400' : 'text-zinc-400'} hover:text-white`}
          onClick={onBlurToggle}
        >
          {blurMode ? (
            <>
              <EyeOff className="w-4 h-4" />
              <span className="text-xs">NSFW ON</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              <span className="text-xs">Blur</span>
            </>
          )}
        </Button>
      </div>

      {/* Message Input */}
      <div className="flex items-end gap-2 p-4 pt-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-10 max-h-36 resize-none bg-zinc-800 border-zinc-700 pr-12"
            rows={1}
          />
          
          {/* Character count */}
          {message.length > 0 && (
            <span className="absolute right-3 bottom-2 text-xs text-zinc-500">
              {message.length}
            </span>
          )}
        </div>

        <Button
          onClick={handleSend}
          disabled={isLoading || (!message.trim() && !selectedAsset)}
          className="h-10 w-10 shrink-0 bg-primary hover:bg-primary/80"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* PPV indicator */}
      {(price || selectedAsset) && (
        <div className="px-4 pb-3 flex items-center gap-2">
          {price && (
            <Badge variant="outline" className="text-green-400 border-green-500/30">
              💰 PPV: ${price}
            </Badge>
          )}
          {selectedAsset && (
            <Badge variant="outline" className="text-purple-400 border-purple-500/30">
              📎 Media attached
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
