'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Save,
  Eye,
  ExternalLink,
  Plus,
  Trash2,
  GripVertical,
  Type,
  Link2,
  Image,
  Play,
  Minus,
  AtSign,
  Timer,
  Palette,
  Settings,
  BarChart3,
  MousePointerClick,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Block Types
const BLOCK_TYPES = [
  { type: 'header', icon: Type, label: 'Header' },
  { type: 'button', icon: Link2, label: 'Button' },
  { type: 'social_row', icon: AtSign, label: 'Social Row' },
  { type: 'image', icon: Image, label: 'Image' },
  { type: 'video', icon: Play, label: 'Video' },
  { type: 'text', icon: Type, label: 'Text' },
  { type: 'spacer', icon: Minus, label: 'Spacer' },
  { type: 'countdown', icon: Timer, label: 'Countdown' },
]

// Button Styles
const BUTTON_STYLES = [
  { value: 'rounded', label: 'Rounded' },
  { value: 'sharp', label: 'Sharp' },
  { value: 'glass', label: 'Glass' },
  { value: 'outline', label: 'Outline' },
]

// Font Options
const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Playfair Display', label: 'Playfair' },
  { value: 'Space Mono', label: 'Mono' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Raleway', label: 'Raleway' },
]

interface BioBlock {
  id: string
  type: string
  content: Record<string, unknown>
  config: Record<string, unknown>
  order_index: number
  click_count: number
}

interface BuilderClientProps {
  page: {
    id: string
    slug: string
    title: string
    description?: string | null
    status: string
    theme: Record<string, string>
    pixels: Record<string, string>
    seo_title?: string | null
    seo_description?: string | null
    seo_image?: string | null
    total_visits: number
    total_clicks: number
    model?: { id: string; name: string; avatar_url?: string } | null
  }
  initialBlocks: BioBlock[]
}

export function BuilderClient({ page, initialBlocks }: BuilderClientProps) {
  const router = useRouter()
  const [blocks, setBlocks] = useState<BioBlock[]>(initialBlocks)
  const [theme, setTheme] = useState(page.theme)
  const [status, setStatus] = useState(page.status)
  const [saving, setSaving] = useState(false)
  const [editingBlock, setEditingBlock] = useState<BioBlock | null>(null)
  const [activeTab, setActiveTab] = useState('blocks')

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  // Save page settings
  const savePageSettings = async (updates: Record<string, unknown>) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/bio/pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to save')
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  // Save theme
  const saveTheme = async (newTheme: Record<string, string>) => {
    setTheme(newTheme)
    await savePageSettings({ theme: newTheme })
  }

  // Toggle publish
  const togglePublish = async () => {
    const newStatus = status === 'published' ? 'draft' : 'published'
    setStatus(newStatus)
    await savePageSettings({ status: newStatus })
  }

  // Add block
  const addBlock = async (type: string) => {
    const defaultContent = getDefaultContent(type)
    
    try {
      const res = await fetch('/api/bio/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_id: page.id,
          type,
          content: defaultContent,
          config: {},
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setBlocks(prev => [...prev, data.block])
      }
    } catch (error) {
      console.error('Add block error:', error)
    }
  }

  // Get default content for block type
  const getDefaultContent = (type: string): Record<string, unknown> => {
    switch (type) {
      case 'header':
        return { title: page.title, subtitle: 'Welcome!', avatar_url: page.model?.avatar_url || '' }
      case 'button':
        return { label: 'Click Me', url: 'https://', icon: 'link' }
      case 'social_row':
        return { links: [{ platform: 'instagram', url: 'https://instagram.com/' }] }
      case 'text':
        return { html: '<p>Your text here</p>' }
      case 'spacer':
        return { height: 20 }
      case 'image':
        return { url: '', alt: '', link: '' }
      case 'video':
        return { url: '', thumbnail_url: '', autoplay: false }
      case 'countdown':
        return { target_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), label: 'Coming Soon!' }
      default:
        return {}
    }
  }

  // Update block
  const updateBlock = async (blockId: string, updates: Partial<BioBlock>) => {
    try {
      const res = await fetch(`/api/bio/blocks/${blockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (res.ok) {
        setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, ...updates } : b))
      }
    } catch (error) {
      console.error('Update block error:', error)
    }
  }

  // Delete block
  const deleteBlock = async (blockId: string) => {
    try {
      const res = await fetch(`/api/bio/blocks/${blockId}`, { method: 'DELETE' })
      if (res.ok) {
        setBlocks(prev => prev.filter(b => b.id !== blockId))
      }
    } catch (error) {
      console.error('Delete block error:', error)
    }
  }

  // Move block
  const moveBlock = async (blockId: string, direction: 'up' | 'down') => {
    const currentIndex = blocks.findIndex(b => b.id === blockId)
    if (currentIndex === -1) return
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= blocks.length) return

    const newBlocks = [...blocks]
    const [movedBlock] = newBlocks.splice(currentIndex, 1)
    newBlocks.splice(newIndex, 0, movedBlock)
    
    // Update order_index for all blocks
    const updatedBlocks = newBlocks.map((b, i) => ({ ...b, order_index: i }))
    setBlocks(updatedBlocks)

    // Save new order
    try {
      await fetch('/api/bio/blocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_id: page.id,
          block_order: updatedBlocks.map(b => b.id),
        }),
      })
    } catch (error) {
      console.error('Reorder error:', error)
    }
  }

  const ctr = page.total_visits > 0
    ? ((page.total_clicks / page.total_visits) * 100).toFixed(1)
    : '0'

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <div className="h-14 border-b border-border px-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/content/bio">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-semibold text-foreground">{page.title}</h1>
            <p className="text-xs text-muted-foreground">/{page.slug}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className={cn(
            status === 'published' 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-amber-500/20 text-amber-400'
          )}>
            {status}
          </Badge>
          <Button variant="outline" size="sm" asChild>
            <a href={`/u/${page.slug}`} target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </a>
          </Button>
          <Button
            size="sm"
            onClick={togglePublish}
            disabled={saving}
          >
            {status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Toolbox */}
        <div className="w-72 border-r border-border bg-card overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="blocks">Blocks</TabsTrigger>
              <TabsTrigger value="theme">Theme</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <div className="p-4">
              <TabsContent value="blocks" className="m-0 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Add Block</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {BLOCK_TYPES.map(({ type, icon: Icon, label }) => (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-xs">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="theme" className="m-0 space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Background Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="color"
                        value={theme.backgroundValue || '#0a0a0a'}
                        onChange={(e) => saveTheme({ ...theme, backgroundType: 'color', backgroundValue: e.target.value })}
                        className="w-12 h-9 p-1 cursor-pointer"
                      />
                      <Input
                        value={theme.backgroundValue || '#0a0a0a'}
                        onChange={(e) => saveTheme({ ...theme, backgroundType: 'color', backgroundValue: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Accent Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="color"
                        value={theme.accentColor || '#84cc16'}
                        onChange={(e) => saveTheme({ ...theme, accentColor: e.target.value })}
                        className="w-12 h-9 p-1 cursor-pointer"
                      />
                      <Input
                        value={theme.accentColor || '#84cc16'}
                        onChange={(e) => saveTheme({ ...theme, accentColor: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Text Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="color"
                        value={theme.textColor || '#ffffff'}
                        onChange={(e) => saveTheme({ ...theme, textColor: e.target.value })}
                        className="w-12 h-9 p-1 cursor-pointer"
                      />
                      <Input
                        value={theme.textColor || '#ffffff'}
                        onChange={(e) => saveTheme({ ...theme, textColor: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Font Family</Label>
                    <Select
                      value={theme.fontFamily || 'Inter'}
                      onValueChange={(v) => saveTheme({ ...theme, fontFamily: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Button Style</Label>
                    <Select
                      value={theme.buttonStyle || 'rounded'}
                      onValueChange={(v) => saveTheme({ ...theme, buttonStyle: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUTTON_STYLES.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="m-0 space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Meta Pixel ID</Label>
                    <Input
                      value={page.pixels.meta_pixel_id || ''}
                      placeholder="123456789..."
                      onChange={(e) => savePageSettings({ pixels: { ...page.pixels, meta_pixel_id: e.target.value } })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">TikTok Pixel ID</Label>
                    <Input
                      value={page.pixels.tiktok_pixel_id || ''}
                      placeholder="..."
                      onChange={(e) => savePageSettings({ pixels: { ...page.pixels, tiktok_pixel_id: e.target.value } })}
                      className="mt-1"
                    />
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 overflow-y-auto bg-zinc-950 flex items-start justify-center p-8">
          <div
            className="w-[375px] min-h-[667px] rounded-[40px] overflow-hidden border-[8px] border-zinc-800 shadow-2xl"
            style={{
              backgroundColor: theme.backgroundValue || '#0a0a0a',
              fontFamily: theme.fontFamily || 'Inter',
              color: theme.textColor || '#ffffff',
            }}
          >
            <div className="p-6 space-y-4">
              {blocks.map((block, index) => (
                <div
                  key={block.id}
                  className="group relative"
                >
                  {/* Block controls */}
                  <div className="absolute -left-14 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                    <button
                      onClick={() => moveBlock(block.id, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => moveBlock(block.id, 'down')}
                      disabled={index === blocks.length - 1}
                      className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setEditingBlock(block)}
                      className="p-1 rounded bg-primary hover:bg-primary/80"
                    >
                      <Settings className="h-3 w-3 text-black" />
                    </button>
                    <button
                      onClick={() => deleteBlock(block.id)}
                      className="p-1 rounded bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Block preview */}
                  <div
                    className="cursor-pointer hover:ring-2 hover:ring-primary rounded-lg transition-all"
                    onClick={() => setEditingBlock(block)}
                  >
                    <BlockPreview block={block} theme={theme} />
                  </div>
                </div>
              ))}

              {blocks.length === 0 && (
                <div className="text-center py-12 text-zinc-500">
                  <Plus className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Add blocks from the sidebar</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Stats */}
        <div className="w-64 border-l border-border bg-card p-4 space-y-4">
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase mb-3">Live Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Visits Today</span>
                <span className="font-bold">{page.total_visits}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Clicks Today</span>
                <span className="font-bold">{page.total_clicks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">CTR</span>
                <span className="font-bold text-primary">{ctr}%</span>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase mb-3">Block Performance</h3>
            <div className="space-y-2">
              {blocks
                .filter(b => b.type === 'button')
                .sort((a, b) => (b.click_count || 0) - (a.click_count || 0))
                .slice(0, 5)
                .map(block => (
                  <div key={block.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-muted-foreground">
                      {(block.content.label as string) || 'Button'}
                    </span>
                    <span className="font-medium">{block.click_count || 0}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Block Edit Dialog */}
      {editingBlock && (
        <BlockEditDialog
          block={editingBlock}
          onClose={() => setEditingBlock(null)}
          onSave={(updates) => {
            updateBlock(editingBlock.id, updates)
            setEditingBlock(null)
          }}
        />
      )}
    </div>
  )
}

// Block Preview Component
function BlockPreview({ block, theme }: { block: BioBlock; theme: Record<string, string> }) {
  const content = block.content || {}
  
  switch (block.type) {
    case 'header':
      return (
        <div className="text-center py-4">
          {(content.avatar_url as string) && (
            <img
              src={content.avatar_url as string}
              alt=""
              className="w-20 h-20 rounded-full mx-auto mb-3 object-cover"
            />
          )}
          <h2 className="text-xl font-bold">{content.title as string}</h2>
          {(content.subtitle as string) && (
            <p className="text-sm opacity-70">{content.subtitle as string}</p>
          )}
        </div>
      )

    case 'button':
      return (
        <button
          className="w-full py-3 px-4 rounded-full font-medium"
          style={{ backgroundColor: theme.accentColor || '#84cc16', color: '#000' }}
        >
          {content.label as string}
        </button>
      )

    case 'text':
      return (
        <div
          className="text-sm text-center opacity-80"
          dangerouslySetInnerHTML={{ __html: content.html as string }}
        />
      )

    case 'spacer':
      return <div style={{ height: (content.height as number) || 20 }} className="bg-white/5 rounded" />

    case 'social_row':
      return (
        <div className="flex justify-center gap-3">
          {((content.links as Array<{ platform: string }>) || []).map((link, i) => (
            <div
              key={i}
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: theme.accentColor || '#84cc16', color: '#000' }}
            >
              {link.platform.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      )

    default:
      return (
        <div className="py-4 text-center text-sm opacity-50">
          {block.type} block
        </div>
      )
  }
}

// Block Edit Dialog
function BlockEditDialog({
  block,
  onClose,
  onSave,
}: {
  block: BioBlock
  onClose: () => void
  onSave: (updates: Partial<BioBlock>) => void
}) {
  const [content, setContent] = useState(block.content)
  const [config, setConfig] = useState(block.config)

  const handleSave = () => {
    onSave({ content, config })
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {block.type.charAt(0).toUpperCase() + block.type.slice(1)}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {block.type === 'header' && (
            <>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={(content.title as string) || ''}
                  onChange={(e) => setContent({ ...content, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Input
                  value={(content.subtitle as string) || ''}
                  onChange={(e) => setContent({ ...content, subtitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Avatar URL</Label>
                <Input
                  value={(content.avatar_url as string) || ''}
                  onChange={(e) => setContent({ ...content, avatar_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </>
          )}

          {block.type === 'button' && (
            <>
              <div className="space-y-2">
                <Label>Button Text</Label>
                <Input
                  value={(content.label as string) || ''}
                  onChange={(e) => setContent({ ...content, label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input
                  value={(content.url as string) || ''}
                  onChange={(e) => setContent({ ...content, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Animation</Label>
                <Select
                  value={(config.animation as string) || 'none'}
                  onValueChange={(v) => setConfig({ ...config, animation: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="pulse">Pulse</SelectItem>
                    <SelectItem value="wiggle">Wiggle</SelectItem>
                    <SelectItem value="bounce">Bounce</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {block.type === 'text' && (
            <div className="space-y-2">
              <Label>Text Content</Label>
              <textarea
                value={(content.html as string) || ''}
                onChange={(e) => setContent({ ...content, html: e.target.value })}
                className="w-full h-32 rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="<p>Your text here</p>"
              />
            </div>
          )}

          {block.type === 'spacer' && (
            <div className="space-y-2">
              <Label>Height (px)</Label>
              <Input
                type="number"
                value={(content.height as number) || 20}
                onChange={(e) => setContent({ ...content, height: parseInt(e.target.value) })}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
