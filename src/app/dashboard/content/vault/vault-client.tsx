'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Upload,
  Image as ImageIcon,
  Video,
  Music,
  DollarSign,
  Tag,
  Trash2,
  Edit,
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Eye,
  Lock,
  TrendingUp,
  Flame,
  RefreshCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPerformanceColor } from '@/lib/services/asset-attribution'

interface ContentAsset {
  id: string
  file_name: string
  file_type: 'image' | 'video' | 'audio'
  url: string
  thumbnail_url: string | null
  title: string | null
  description: string | null
  price: number
  content_type: 'free' | 'ppv' | 'subscription' | 'tip'
  tags: string[]
  usage_count: number
  model_id: string | null
  models?: { id: string; name: string } | null
  created_at: string
  // Phase 50: Performance metrics
  performance?: {
    total_revenue: number
    conversion_rate: number
    times_sent: number
    times_unlocked: number
    performance_rating: string
  }
}

interface Model {
  id: string
  name: string
}

interface VaultClientProps {
  initialAssets: ContentAsset[]
  models: Model[]
  agencyId: string
}

export function VaultClient({ initialAssets, models, agencyId }: VaultClientProps) {
  const supabase = createClient()
  const [assets, setAssets] = useState<ContentAsset[]>(initialAssets)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<ContentAsset | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('recent')
  const [isCalculatingROI, setIsCalculatingROI] = useState(false)

  const [editForm, setEditForm] = useState<{
    title: string
    description: string
    price: number
    content_type: 'free' | 'ppv' | 'subscription' | 'tip'
    tags: string
    model_id: string
  }>({
    title: '',
    description: '',
    price: 0,
    content_type: 'free',
    tags: '',
    model_id: '',
  })

  // File upload handler
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsUploading(true)
    const uploadedAssets: ContentAsset[] = []

    try {
      for (const file of Array.from(files)) {
        // Determine file type
        let fileType: 'image' | 'video' | 'audio' = 'image'
        if (file.type.startsWith('video/')) fileType = 'video'
        else if (file.type.startsWith('audio/')) fileType = 'audio'

        // Generate unique filename
        const timestamp = Date.now()
        const ext = file.name.split('.').pop()
        const fileName = `${agencyId}/${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('agency-assets')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          toast.error(`Failed to upload ${file.name}`)
          continue
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('agency-assets').getPublicUrl(fileName)

        // Insert into content_assets table
        const { data: asset, error: insertError } = await supabase
          .from('content_assets')
          .insert({
            agency_id: agencyId,
            file_name: file.name,
            file_type: fileType,
            file_size: file.size,
            url: publicUrl,
            title: file.name.replace(/\.[^/.]+$/, ''),
          })
          .select()
          .single()

        if (insertError) {
          console.error('Insert error:', insertError)
          toast.error(`Failed to save ${file.name}`)
          continue
        }

        uploadedAssets.push(asset)
      }

      if (uploadedAssets.length > 0) {
        setAssets(prev => [...uploadedAssets, ...prev])
        toast.success(`Uploaded ${uploadedAssets.length} file(s)`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileUpload(e.dataTransfer.files)
  }, [])

  // Edit asset
  const openEditDialog = (asset: ContentAsset) => {
    setSelectedAsset(asset)
    setEditForm({
      title: asset.title || '',
      description: asset.description || '',
      price: asset.price || 0,
      content_type: (asset.content_type as 'free' | 'ppv' | 'subscription' | 'tip') || 'free',
      tags: asset.tags?.join(', ') || '',
      model_id: asset.model_id || '',
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedAsset) return

    const { error } = await supabase
      .from('content_assets')
      .update({
        title: editForm.title,
        description: editForm.description,
        price: editForm.price,
        content_type: editForm.content_type,
        tags: editForm.tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
        model_id: editForm.model_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedAsset.id)

    if (error) {
      toast.error('Failed to update asset')
      return
    }

    setAssets(prev =>
      prev.map(a =>
        a.id === selectedAsset.id
          ? {
              ...a,
              title: editForm.title,
              description: editForm.description,
              price: editForm.price,
              content_type: editForm.content_type as any,
              tags: editForm.tags
                .split(',')
                .map(t => t.trim())
                .filter(Boolean),
              model_id: editForm.model_id || null,
            }
          : a
      )
    )

    toast.success('Asset updated')
    setIsEditDialogOpen(false)
  }

  // Delete asset
  const handleDelete = async (asset: ContentAsset) => {
    if (!confirm('Are you sure you want to delete this asset?')) return

    // Delete from storage
    const fileName = asset.url.split('/').pop()
    if (fileName) {
      await supabase.storage.from('agency-assets').remove([`${agencyId}/${fileName}`])
    }

    // Delete from database
    const { error } = await supabase.from('content_assets').delete().eq('id', asset.id)

    if (error) {
      toast.error('Failed to delete asset')
      return
    }

    setAssets(prev => prev.filter(a => a.id !== asset.id))
    toast.success('Asset deleted')
  }

  // Phase 50: Calculate ROI for assets
  const handleCalculateROI = async () => {
    setIsCalculatingROI(true)
    try {
      const response = await fetch('/api/vault/calculate-roi', {
        method: 'POST',
      })
      const result = await response.json()

      if (result.success) {
        toast.success(`Calculated ROI for ${result.assetsUpdated} assets`)
        // Refresh performance data
        await refreshPerformanceData()
      } else {
        toast.error(result.error || 'Failed to calculate ROI')
      }
    } catch (error) {
      toast.error('Failed to calculate ROI')
    } finally {
      setIsCalculatingROI(false)
    }
  }

  // Fetch performance data for all assets
  const refreshPerformanceData = async () => {
    try {
      const response = await fetch(`/api/vault/performance?sortBy=${sortBy}`)
      const result = await response.json()

      if (result.success && result.data) {
        // Merge performance data with assets
        setAssets(prev =>
          prev.map(asset => {
            const perf = result.data.find((p: any) => p.assetId === asset.id)
            if (perf) {
              return {
                ...asset,
                performance: {
                  total_revenue: perf.totalRevenue,
                  conversion_rate: perf.conversionRate,
                  times_sent: perf.timesSent,
                  times_unlocked: perf.timesUnlocked,
                  performance_rating: perf.performanceRating,
                },
              }
            }
            return asset
          })
        )
      }
    } catch (error) {
      console.error('Failed to fetch performance data:', error)
    }
  }

  // Filter and sort assets
  const filteredAssets = assets
    .filter(asset => {
      const matchesSearch =
        asset.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesFilter = filterType === 'all' || asset.file_type === filterType

      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return (b.performance?.total_revenue || 0) - (a.performance?.total_revenue || 0)
        case 'conversion':
          return (b.performance?.conversion_rate || 0) - (a.performance?.conversion_rate || 0)
        case 'recent':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5" />
      case 'audio':
        return <Music className="w-5 h-5" />
      default:
        return <ImageIcon className="w-5 h-5" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Content Vault</h1>
          <p className="text-muted-foreground">
            Manage your media assets for campaigns and messages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-primary border-primary/30">
            {assets.length} Assets
          </Badge>
        </div>
      </div>

      {/* Upload Zone */}
      <Card
        className={cn(
          'border-2 border-dashed transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        )}
      >
        <CardContent className="py-8">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="flex flex-col items-center justify-center text-center"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              {isDragging ? 'Drop files here' : 'Upload Content'}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Drag and drop images, videos, or audio files
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={isUploading}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Plus className="w-4 h-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Choose Files'}
              </Button>
            </div>
            <input
              id="file-upload"
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              className="hidden"
              onChange={e => handleFileUpload(e.target.files)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40">
            <TrendingUp className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="revenue">
              <div className="flex items-center gap-2">
                <DollarSign className="w-3 h-3" />
                Revenue
              </div>
            </SelectItem>
            <SelectItem value="conversion">
              <div className="flex items-center gap-2">
                <Flame className="w-3 h-3" />
                Conversion
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={handleCalculateROI}
          disabled={isCalculatingROI}
          className="gap-2"
        >
          <RefreshCcw className={cn('w-4 h-4', isCalculatingROI && 'animate-spin')} />
          {isCalculatingROI ? 'Calculating...' : 'Calculate ROI'}
        </Button>
        <div className="flex border rounded-lg">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No assets yet</h3>
            <p className="text-muted-foreground">Upload your first content to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
              : 'space-y-2'
          )}
        >
          {filteredAssets.map(asset => (
            <Card
              key={asset.id}
              className="group overflow-hidden hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => openEditDialog(asset)}
            >
              {viewMode === 'grid' ? (
                <>
                  {/* Thumbnail */}
                  <div className="aspect-square relative bg-muted">
                    {asset.file_type === 'image' ? (
                      <img
                        src={asset.url}
                        alt={asset.title || asset.file_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {getFileIcon(asset.file_type)}
                      </div>
                    )}

                    {/* Overlays */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {asset.performance && asset.performance.total_revenue > 0 && (
                        <Badge className="bg-emerald-500/90 hover:bg-emerald-500">
                          <DollarSign className="w-3 h-3 mr-0.5" />$
                          {asset.performance.total_revenue.toFixed(0)}
                        </Badge>
                      )}
                      {asset.performance && asset.performance.conversion_rate > 0 && (
                        <Badge
                          className={cn(
                            'text-white',
                            asset.performance.conversion_rate >= 50
                              ? 'bg-red-500/90 hover:bg-red-500'
                              : asset.performance.conversion_rate >= 20
                                ? 'bg-green-500/90 hover:bg-green-500'
                                : asset.performance.conversion_rate >= 10
                                  ? 'bg-yellow-500/90 hover:bg-yellow-500'
                                  : 'bg-gray-500/90 hover:bg-gray-500'
                          )}
                        >
                          {asset.performance.conversion_rate >= 50 && '🔥 '}
                          {asset.performance.conversion_rate.toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      {asset.price > 0 && (
                        <Badge className="bg-green-500/90 hover:bg-green-500">
                          <DollarSign className="w-3 h-3 mr-0.5" />
                          {asset.price}
                        </Badge>
                      )}
                      {asset.content_type === 'ppv' && (
                        <Badge variant="secondary" className="bg-purple-500/90 text-white">
                          <Lock className="w-3 h-3 mr-0.5" />
                          PPV
                        </Badge>
                      )}
                    </div>

                    {/* Hover actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={e => {
                          e.stopPropagation()
                          openEditDialog(asset)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={e => {
                          e.stopPropagation()
                          handleDelete(asset)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm truncate">{asset.title || asset.file_name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">
                        {asset.performance ? (
                          <>
                            {asset.performance.times_sent}sent / {asset.performance.times_unlocked}
                            sold
                          </>
                        ) : (
                          <>Used {asset.usage_count}x</>
                        )}
                      </p>
                      {asset.performance && asset.performance.performance_rating && (
                        <span className="text-xs">{asset.performance.performance_rating}</span>
                      )}
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    {asset.file_type === 'image' ? (
                      <img src={asset.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getFileIcon(asset.file_type)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{asset.title || asset.file_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {asset.file_type} •{' '}
                      {asset.performance ? (
                        <>
                          ${asset.performance.total_revenue.toFixed(0)} revenue •{' '}
                          {asset.performance.conversion_rate.toFixed(1)}% conversion
                        </>
                      ) : (
                        <>Used {asset.usage_count}x</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {asset.price > 0 && <Badge className="bg-green-500/90">${asset.price}</Badge>}
                    {asset.content_type === 'ppv' && <Badge variant="secondary">PPV</Badge>}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>Update the metadata and pricing for this content</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Preview */}
            {selectedAsset && (
              <div className="aspect-video rounded-lg bg-muted overflow-hidden">
                {selectedAsset.file_type === 'image' ? (
                  <img src={selectedAsset.url} alt="" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {getFileIcon(selectedAsset.file_type)}
                    <span className="ml-2">{selectedAsset.file_name}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editForm.title}
                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Asset title"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editForm.description}
                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.price}
                  onChange={e =>
                    setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select
                  value={editForm.content_type}
                  onValueChange={v => setEditForm({ ...editForm, content_type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="ppv">PPV</SelectItem>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="tip">Tip Unlock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Model</Label>
              <Select
                value={editForm.model_id}
                onValueChange={v => setEditForm({ ...editForm, model_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No model</SelectItem>
                  {models.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={editForm.tags}
                onChange={e => setEditForm({ ...editForm, tags: e.target.value })}
                placeholder="sexy, gym, selfie"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
