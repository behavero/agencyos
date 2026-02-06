'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Upload,
  Image as ImageIcon,
  Video,
  Music,
  DollarSign,
  Trash2,
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FanvueMedia {
  uuid: string
  mediaType: string
  url: string
  thumbnailUrl: string
  name: string | null
  caption: string | null
  description: string | null
  recommendedPrice: number
  createdAt: string | null
  width: number | null
  height: number | null
  lengthMs: number | null
}

interface UploadedAsset {
  id: string
  file_name: string
  file_type: 'image' | 'video' | 'audio'
  url: string
  thumbnail_url: string | null
  title: string | null
  price: number
  content_type: string
  tags: string[]
  usage_count: number
  model_id: string | null
  created_at: string
}

interface Model {
  id: string
  name: string
}

interface VaultClientProps {
  initialAssets: UploadedAsset[]
  models: Model[]
  agencyId: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export function VaultClient({ initialAssets, models, agencyId }: VaultClientProps) {
  const supabase = createClient()

  // Model selection
  const [selectedModelId, setSelectedModelId] = useState<string>(models[0]?.id || '')
  const [activeTab, setActiveTab] = useState<'fanvue' | 'uploaded'>('fanvue')

  // Fanvue media (live from API)
  const [fanvueMedia, setFanvueMedia] = useState<FanvueMedia[]>([])
  const [fanvueLoading, setFanvueLoading] = useState(false)
  const [fanvuePage, setFanvuePage] = useState(1)
  const [fanvueHasMore, setFanvueHasMore] = useState(false)
  const [fanvueMediaType, setFanvueMediaType] = useState<string>('all')

  // Uploaded assets (from database)
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>(initialAssets)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // View
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  // ─── Fetch Fanvue media on-demand ─────────────────────────────────────────

  const fetchFanvueMedia = useCallback(
    async (page: number, append = false) => {
      if (!selectedModelId) return

      setFanvueLoading(true)
      try {
        const params = new URLSearchParams({
          modelId: selectedModelId,
          page: String(page),
          size: '30',
        })
        if (fanvueMediaType !== 'all') {
          params.set('mediaType', fanvueMediaType)
        }

        const res = await fetch(`/api/vault/fanvue-media?${params}`)
        const data = await res.json()

        if (!data.success) {
          toast.error(data.error || 'Failed to load Fanvue media')
          return
        }

        if (append) {
          setFanvueMedia(prev => [...prev, ...data.media])
        } else {
          setFanvueMedia(data.media)
        }
        setFanvuePage(data.pagination.page)
        setFanvueHasMore(data.pagination.hasMore)
      } catch (error) {
        console.error('[Vault] Fanvue fetch error:', error)
        toast.error('Failed to load media from Fanvue')
      } finally {
        setFanvueLoading(false)
      }
    },
    [selectedModelId, fanvueMediaType]
  )

  // Fetch when model or media type changes
  useEffect(() => {
    if (activeTab === 'fanvue' && selectedModelId) {
      setFanvueMedia([])
      setFanvuePage(1)
      fetchFanvueMedia(1)
    }
  }, [selectedModelId, fanvueMediaType, activeTab, fetchFanvueMedia])

  // ─── Upload handler ───────────────────────────────────────────────────────

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsUploading(true)
    const uploaded: UploadedAsset[] = []

    try {
      for (const file of Array.from(files)) {
        let fileType: 'image' | 'video' | 'audio' = 'image'
        if (file.type.startsWith('video/')) fileType = 'video'
        else if (file.type.startsWith('audio/')) fileType = 'audio'

        const timestamp = Date.now()
        const ext = file.name.split('.').pop()
        const fileName = `${agencyId}/${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('agency-assets')
          .upload(fileName, file, { cacheControl: '3600', upsert: false })

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}`)
          continue
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('agency-assets').getPublicUrl(fileName)

        const { data: asset, error: insertError } = await supabase
          .from('content_assets')
          .insert({
            agency_id: agencyId,
            model_id: selectedModelId || null,
            file_name: file.name,
            file_type: fileType,
            file_size: file.size,
            url: publicUrl,
            title: file.name.replace(/\.[^/.]+$/, ''),
          })
          .select()
          .single()

        if (insertError) {
          toast.error(`Failed to save ${file.name}`)
          continue
        }

        uploaded.push(asset)
      }

      if (uploaded.length > 0) {
        setUploadedAssets(prev => [...uploaded, ...prev])
        toast.success(`Uploaded ${uploaded.length} file(s)`)
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  // Drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFileUpload(e.dataTransfer.files)
    },
    [handleFileUpload]
  )

  // Delete uploaded asset
  const handleDeleteUploaded = async (asset: UploadedAsset) => {
    if (!confirm('Delete this uploaded asset?')) return
    const fileName = asset.url.split('/').pop()
    if (fileName) {
      await supabase.storage.from('agency-assets').remove([`${agencyId}/${fileName}`])
    }
    const { error } = await supabase.from('content_assets').delete().eq('id', asset.id)
    if (error) {
      toast.error('Failed to delete')
      return
    }
    setUploadedAssets(prev => prev.filter(a => a.id !== asset.id))
    toast.success('Deleted')
  }

  // ─── Filtered uploaded assets ─────────────────────────────────────────────

  const filteredUploaded = uploadedAssets.filter(a => {
    const matchesModel = !selectedModelId || !a.model_id || a.model_id === selectedModelId
    const matchesSearch =
      !searchQuery ||
      a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.file_name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesModel && matchesSearch
  })

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const getMediaIcon = (type: string) => {
    if (type === 'video') return <Video className="w-5 h-5" />
    if (type === 'audio') return <Music className="w-5 h-5" />
    return <ImageIcon className="w-5 h-5" />
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return null
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Content Vault</h1>
          <p className="text-muted-foreground">Browse and use your Fanvue media library directly</p>
        </div>
      </div>

      {/* Model Selector */}
      {models.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {models.map(m => (
            <Button
              key={m.id}
              variant={selectedModelId === m.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedModelId(m.id)}
            >
              {m.name}
            </Button>
          ))}
        </div>
      )}

      {/* Tab: Fanvue Media vs Uploaded */}
      <div className="flex items-center gap-4 border-b">
        <button
          className={cn(
            'pb-2 px-1 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'fanvue'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setActiveTab('fanvue')}
        >
          Fanvue Media
        </button>
        <button
          className={cn(
            'pb-2 px-1 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'uploaded'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setActiveTab('uploaded')}
        >
          Uploaded ({filteredUploaded.length})
        </button>
      </div>

      {/* ─── FANVUE MEDIA TAB ─────────────────────────────────────────────── */}
      {activeTab === 'fanvue' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-4">
            <Select value={fanvueMediaType} onValueChange={setFanvueMediaType}>
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
            {fanvueMedia.length > 0 && (
              <Badge variant="outline" className="text-primary border-primary/30">
                {fanvueMedia.length} items{fanvueHasMore ? '+' : ''}
              </Badge>
            )}
          </div>

          {/* Loading state */}
          {fanvueLoading && fanvueMedia.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading media from Fanvue...</span>
            </div>
          )}

          {/* No model selected */}
          {!selectedModelId && (
            <Card>
              <CardContent className="py-16 text-center">
                <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a model</h3>
                <p className="text-muted-foreground">
                  Choose a model above to browse their Fanvue media
                </p>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {!fanvueLoading && selectedModelId && fanvueMedia.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center">
                <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No media found</h3>
                <p className="text-muted-foreground">
                  This model has no media on Fanvue, or the connection may need refreshing
                </p>
              </CardContent>
            </Card>
          )}

          {/* Media Grid */}
          {fanvueMedia.length > 0 && (
            <>
              <div
                className={cn(
                  viewMode === 'grid'
                    ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                    : 'space-y-2'
                )}
              >
                {fanvueMedia.map(item => (
                  <Card
                    key={item.uuid}
                    className="group overflow-hidden hover:border-primary/30 transition-colors"
                  >
                    {viewMode === 'grid' ? (
                      <>
                        <div className="aspect-square relative bg-muted">
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.name || item.caption || ''}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={e => {
                                ;(e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {getMediaIcon(item.mediaType || 'image')}
                            </div>
                          )}

                          {/* Type badge */}
                          <div className="absolute top-2 left-2 flex gap-1">
                            {item.mediaType === 'video' && (
                              <Badge className="bg-blue-500/90 text-white text-xs">
                                <Play className="w-3 h-3 mr-0.5" />
                                {formatDuration(item.lengthMs) || 'Video'}
                              </Badge>
                            )}
                            {item.mediaType === 'audio' && (
                              <Badge className="bg-purple-500/90 text-white text-xs">
                                <Music className="w-3 h-3 mr-0.5" />
                                Audio
                              </Badge>
                            )}
                          </div>

                          {/* Price */}
                          {item.recommendedPrice > 0 && (
                            <div className="absolute top-2 right-2">
                              <Badge className="bg-green-500/90 text-white">
                                <DollarSign className="w-3 h-3 mr-0.5" />
                                {item.recommendedPrice}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <p className="font-medium text-sm truncate">
                            {item.name || item.caption || `${item.mediaType || 'Media'}`}
                          </p>
                          {item.createdAt && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </CardContent>
                      </>
                    ) : (
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={e => {
                                ;(e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {getMediaIcon(item.mediaType || 'image')}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {item.name || item.caption || item.mediaType}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.mediaType}
                            {item.recommendedPrice > 0 && ` · $${item.recommendedPrice}`}
                            {item.createdAt &&
                              ` · ${new Date(item.createdAt).toLocaleDateString()}`}
                          </p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              {/* Pagination / Load More */}
              <div className="flex justify-center gap-2 pt-4">
                {fanvuePage > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={fanvueLoading}
                    onClick={() => fetchFanvueMedia(fanvuePage - 1)}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                )}
                <span className="flex items-center text-sm text-muted-foreground px-3">
                  Page {fanvuePage}
                </span>
                {fanvueHasMore && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={fanvueLoading}
                    onClick={() => fetchFanvueMedia(fanvuePage + 1)}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                {fanvueLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              </div>
            </>
          )}
        </>
      )}

      {/* ─── UPLOADED TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'uploaded' && (
        <>
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
                  {isDragging ? 'Drop files here' : 'Upload Custom Content'}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Drag and drop images, videos, or audio files
                </p>
                <Button
                  variant="outline"
                  disabled={isUploading}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Choose Files'}
                </Button>
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

          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search uploads..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
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

          {/* Uploaded Grid */}
          {filteredUploaded.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No uploaded assets</h3>
                <p className="text-muted-foreground">
                  Upload custom content above, or browse Fanvue media in the other tab
                </p>
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
              {filteredUploaded.map(asset => (
                <Card
                  key={asset.id}
                  className="group overflow-hidden hover:border-primary/30 transition-colors"
                >
                  {viewMode === 'grid' ? (
                    <>
                      <div className="aspect-square relative bg-muted">
                        {asset.thumbnail_url || asset.url ? (
                          <img
                            src={asset.thumbnail_url || asset.url}
                            alt={asset.title || asset.file_name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={e => {
                              ;(e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {getMediaIcon(asset.file_type)}
                          </div>
                        )}
                        {asset.price > 0 && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-green-500/90 text-white">
                              <DollarSign className="w-3 h-3 mr-0.5" />${asset.price}
                            </Badge>
                          </div>
                        )}
                        {/* Hover delete */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={e => {
                              e.stopPropagation()
                              handleDeleteUploaded(asset)
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <p className="font-medium text-sm truncate">
                          {asset.title || asset.file_name}
                        </p>
                        <p className="text-xs text-muted-foreground">Used {asset.usage_count}x</p>
                      </CardContent>
                    </>
                  ) : (
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                        {asset.thumbnail_url || asset.url ? (
                          <img
                            src={asset.thumbnail_url || asset.url}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {getMediaIcon(asset.file_type)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{asset.title || asset.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {asset.file_type} · Used {asset.usage_count}x
                          {asset.price > 0 && ` · $${asset.price}`}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDeleteUploaded(asset)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
