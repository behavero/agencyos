'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Link2,
  ExternalLink,
  Eye,
  Edit2,
  Copy,
  Trash2,
  BarChart3,
  MousePointerClick,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BioPage {
  id: string
  slug: string
  title: string
  status: string
  total_visits: number
  total_clicks: number
  created_at: string
  model?: { id: string; name: string; avatar_url?: string } | null
}

interface Model {
  id: string
  name: string
  avatar_url?: string
}

interface BioListClientProps {
  pages: BioPage[]
  models: Model[]
}

export function BioListClient({ pages: initialPages, models }: BioListClientProps) {
  const router = useRouter()
  const [pages, setPages] = useState(initialPages)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    model_id: '',
  })

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const handleCreate = async () => {
    if (!formData.slug || !formData.title) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/bio/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        const data = await res.json()
        setPages(prev => [data.page, ...prev])
        setShowCreateDialog(false)
        setFormData({ slug: '', title: '', model_id: '' })
        router.push(`/dashboard/content/bio/${data.page.id}/builder`)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create page')
      }
    } catch (error) {
      console.error('Create error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (pageId: string) => {
    if (!confirm('Delete this bio page? This cannot be undone.')) return

    try {
      const res = await fetch(`/api/bio/pages/${pageId}`, { method: 'DELETE' })
      if (res.ok) {
        setPages(prev => prev.filter(p => p.id !== pageId))
      }
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${baseUrl}/u/${slug}`)
    // Could add a toast notification here
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'draft':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'banned':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
    }
  }

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    setFormData(prev => ({ ...prev, title, slug }))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" />
            Onyx Link
          </h1>
          <p className="text-muted-foreground">Bio pages and link management</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Bio Page
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pages</p>
                <p className="text-2xl font-bold text-foreground">{pages.length}</p>
              </div>
              <Link2 className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Visits</p>
                <p className="text-2xl font-bold text-foreground">
                  {pages.reduce((sum, p) => sum + (p.total_visits || 0), 0).toLocaleString()}
                </p>
              </div>
              <Eye className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clicks</p>
                <p className="text-2xl font-bold text-foreground">
                  {pages.reduce((sum, p) => sum + (p.total_clicks || 0), 0).toLocaleString()}
                </p>
              </div>
              <MousePointerClick className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pages Grid */}
      {pages.length === 0 ? (
        <Card className="py-12">
          <div className="text-center">
            <Link2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Bio Pages Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first bio page to replace Linktree
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Bio Page
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map(page => {
            const ctr = page.total_visits > 0
              ? ((page.total_clicks / page.total_visits) * 100).toFixed(1)
              : '0'

            return (
              <Card key={page.id} className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {page.model?.avatar_url ? (
                        <img
                          src={page.model.avatar_url}
                          alt={page.model.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                          <Link2 className="w-5 h-5 text-zinc-400" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base">{page.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">/{page.slug}</p>
                      </div>
                    </div>
                    <Badge className={cn('text-xs', getStatusColor(page.status))}>
                      {page.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="py-2 bg-zinc-800/50 rounded">
                      <p className="text-lg font-bold text-foreground">
                        {(page.total_visits || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">Visits</p>
                    </div>
                    <div className="py-2 bg-zinc-800/50 rounded">
                      <p className="text-lg font-bold text-foreground">
                        {(page.total_clicks || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">Clicks</p>
                    </div>
                    <div className="py-2 bg-zinc-800/50 rounded">
                      <p className="text-lg font-bold text-primary">{ctr}%</p>
                      <p className="text-[10px] text-muted-foreground uppercase">CTR</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => copyLink(page.slug)}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <a href={`/u/${page.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <Link href={`/dashboard/content/bio/${page.id}/builder`}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(page.id)}
                      className="text-red-400 hover:text-red-300 hover:border-red-500/50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Create Bio Page</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Page Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g., Lana's Links"
              />
            </div>

            <div className="space-y-2">
              <Label>URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/u/</span>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="lana"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Full URL: {baseUrl}/u/{formData.slug || 'your-slug'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Associated Model (Optional)</Label>
              <Select
                value={formData.model_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, model_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No model</SelectItem>
                  {models.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading || !formData.slug || !formData.title}>
              {loading ? 'Creating...' : 'Create & Edit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
