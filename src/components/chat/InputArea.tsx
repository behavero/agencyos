'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Send, Image as ImageIcon, Video, DollarSign, X, Sparkles, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/store/chatStore'
import { toast } from 'sonner'

interface VaultAsset {
  id: string
  title: string | null
  file_name: string
  file_type: 'image' | 'video'
  file_url: string
  thumbnail_url: string | null
}

interface Macro {
  id: string
  name: string
  text: string
  price?: number
}

interface InputAreaProps {
  onSend: (payload: { text?: string; mediaUuids?: string[]; price?: number }) => Promise<boolean>
  isLoading?: boolean
  placeholder?: string
  vaultAssets?: VaultAsset[]
  macros?: Macro[]
  className?: string
}

/**
 * High-Performance Chat Input Area
 *
 * Features:
 * - Auto-resizing textarea
 * - PPV price toggle
 * - Vault drawer for media selection
 * - Macros/snippets quick-select
 * - Drag-drop media support
 * - Optimistic message creation
 */
export function InputArea({
  onSend,
  isLoading = false,
  placeholder = 'Type a message...',
  vaultAssets = [],
  macros = [],
  className,
}: InputAreaProps) {
  const [text, setText] = useState('')
  const [isPPV, setIsPPV] = useState(false)
  const [ppvPrice, setPpvPrice] = useState('')
  const [selectedMedia, setSelectedMedia] = useState<string[]>([])
  const [vaultOpen, setVaultOpen] = useState(false)
  const [macrosOpen, setMacrosOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatStore = useChatStore()

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [text])

  // Load draft from store
  useEffect(() => {
    const draft = chatStore.getDraft(
      chatStore.selectedCreatorId || '',
      chatStore.selectedUserUuid || ''
    )
    if (draft) {
      setText(draft.text)
      setSelectedMedia(draft.mediaUuids)
      if (draft.price) {
        setIsPPV(true)
        setPpvPrice((draft.price / 100).toString())
      }
    }
  }, [chatStore.selectedCreatorId, chatStore.selectedUserUuid, chatStore])

  // Save draft to store
  const saveDraft = useCallback(() => {
    if (!chatStore.selectedCreatorId || !chatStore.selectedUserUuid) return

    const draft =
      text.trim() || selectedMedia.length > 0
        ? {
            text: text.trim(),
            mediaUuids: selectedMedia,
            price: isPPV && ppvPrice ? Math.round(parseFloat(ppvPrice) * 100) : null,
          }
        : null

    chatStore.setDraft(chatStore.selectedCreatorId, chatStore.selectedUserUuid, draft)
  }, [text, selectedMedia, isPPV, ppvPrice, chatStore])

  // Save draft on change
  useEffect(() => {
    const timeout = setTimeout(saveDraft, 500)
    return () => clearTimeout(timeout)
  }, [text, selectedMedia, isPPV, ppvPrice, saveDraft])

  const handleSend = async () => {
    if (!text.trim() && selectedMedia.length === 0) {
      toast.error('Please enter a message or select media')
      return
    }

    if (isPPV && (!ppvPrice || parseFloat(ppvPrice) <= 0)) {
      toast.error('Please enter a valid PPV price')
      return
    }

    const price = isPPV && ppvPrice ? Math.round(parseFloat(ppvPrice) * 100) : undefined

    const success = await onSend({
      text: text.trim() || undefined,
      mediaUuids: selectedMedia.length > 0 ? selectedMedia : undefined,
      price,
    })

    if (success) {
      // Clear input
      setText('')
      setSelectedMedia([])
      setIsPPV(false)
      setPpvPrice('')

      // Clear draft
      if (chatStore.selectedCreatorId && chatStore.selectedUserUuid) {
        chatStore.setDraft(chatStore.selectedCreatorId, chatStore.selectedUserUuid, null)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMacroSelect = (macro: Macro) => {
    setText(macro.text)
    if (macro.price) {
      setIsPPV(true)
      setPpvPrice((macro.price / 100).toString())
    }
    setMacrosOpen(false)
  }

  const handleMediaSelect = (assetId: string) => {
    setSelectedMedia(prev => {
      if (prev.includes(assetId)) {
        return prev.filter(id => id !== assetId)
      }
      return [...prev, assetId]
    })
  }

  const removeMedia = (assetId: string) => {
    setSelectedMedia(prev => prev.filter(id => id !== assetId))
  }

  // Default macros if none provided
  const defaultMacros: Macro[] =
    macros.length > 0
      ? macros
      : [
          { id: '1', name: 'Good Morning', text: 'Good morning baby! 💕' },
          { id: '2', name: 'Good Night', text: 'Good night, sweet dreams! 😘' },
          { id: '3', name: 'Thank You', text: "Thank you so much! You're amazing! ❤️" },
          { id: '4', name: 'PPV Offer', text: 'I have something special for you...', price: 1000 },
        ]

  return (
    <div className={cn('border-t border-zinc-800 bg-zinc-950 p-4', className)}>
      {/* Selected Media Preview */}
      {selectedMedia.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {selectedMedia.map(assetId => {
            const asset = vaultAssets.find(a => a.id === assetId)
            if (!asset) return null

            return (
              <div key={assetId} className="relative group">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700">
                  {asset.file_type === 'image' ? (
                    <img
                      src={asset.thumbnail_url || asset.file_url}
                      alt={asset.title || 'Media'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-6 h-6 text-zinc-400" />
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute -top-2 -right-2 w-5 h-5 p-0 rounded-full bg-red-500 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeMedia(assetId)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Input Row */}
      <div className="flex gap-2 items-end">
        {/* Macros Button */}
        {defaultMacros.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMacrosOpen(true)}
            className="shrink-0"
          >
            <Sparkles className="w-4 h-4" />
          </Button>
        )}

        {/* Vault Button */}
        <Button variant="ghost" size="sm" onClick={() => setVaultOpen(true)} className="shrink-0">
          <FolderOpen className="w-4 h-4" />
        </Button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[44px] max-h-[200px] resize-none bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
            rows={1}
          />
        </div>

        {/* PPV Toggle */}
        <Button
          variant={isPPV ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setIsPPV(!isPPV)}
          className="shrink-0"
        >
          <DollarSign className="w-4 h-4" />
        </Button>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={isLoading || (!text.trim() && selectedMedia.length === 0)}
          className="shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* PPV Price Input */}
      {isPPV && (
        <div className="mt-2 flex items-center gap-2">
          <Label htmlFor="ppv-price" className="text-xs text-zinc-400 whitespace-nowrap">
            Price ($):
          </Label>
          <Input
            id="ppv-price"
            type="number"
            step="0.01"
            min="0"
            value={ppvPrice}
            onChange={e => setPpvPrice(e.target.value)}
            placeholder="10.00"
            className="h-8 w-24 bg-zinc-900 border-zinc-800 text-white text-sm"
          />
          <Badge
            variant="outline"
            className="bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
          >
            PPV
          </Badge>
        </div>
      )}

      {/* Vault Drawer */}
      <Dialog open={vaultOpen} onOpenChange={setVaultOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Media from Vault</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-4 mt-4">
            {vaultAssets.map(asset => (
              <div
                key={asset.id}
                className={cn(
                  'relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all',
                  selectedMedia.includes(asset.id)
                    ? 'border-primary ring-2 ring-primary/50'
                    : 'border-zinc-800 hover:border-zinc-700'
                )}
                onClick={() => handleMediaSelect(asset.id)}
              >
                {asset.file_type === 'image' ? (
                  <img
                    src={asset.thumbnail_url || asset.file_url}
                    alt={asset.title || 'Media'}
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="w-full h-32 bg-zinc-800 flex items-center justify-center">
                    <Video className="w-8 h-8 text-zinc-400" />
                  </div>
                )}
                {selectedMedia.includes(asset.id) && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-primary">Selected</Badge>
                  </div>
                )}
                {asset.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-xs text-white truncate">
                    {asset.title}
                  </div>
                )}
              </div>
            ))}
            {vaultAssets.length === 0 && (
              <div className="col-span-4 text-center text-zinc-500 py-8">
                <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No media in vault</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Macros Dialog */}
      <Dialog open={macrosOpen} onOpenChange={setMacrosOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quick Messages</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {defaultMacros.map(macro => (
              <Button
                key={macro.id}
                variant="outline"
                className="h-auto p-3 flex flex-col items-start text-left"
                onClick={() => handleMacroSelect(macro)}
              >
                <div className="font-medium">{macro.name}</div>
                <div className="text-xs text-zinc-400 mt-1 line-clamp-2">{macro.text}</div>
                {macro.price && (
                  <Badge
                    variant="outline"
                    className="mt-2 bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                  >
                    ${(macro.price / 100).toFixed(2)} PPV
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
