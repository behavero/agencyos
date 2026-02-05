'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Search,
  Users,
  DollarSign,
  MoreVertical,
  Trash2,
  Settings,
  RefreshCw,
  MessageCircle,
  Image,
  Heart,
  Link2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { AddCreatorDialog } from '@/components/creators/add-creator-dialog'
import { AgencyImportButton } from '@/components/creators/agency-import-button'
import { ConnectAgencyFanvueButton } from '@/components/creators/connect-agency-fanvue-button'
import { useAgencyData } from '@/providers/agency-data-provider'

// Props interface removed - now using useAgencyData() context
// Phase 64: Unified Data Architecture

// Format number with K/M suffix
function formatNumber(num: number | null | undefined): string {
  if (!num) return '0'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

// Format currency
function formatCurrency(amount: number | null | undefined): string {
  if (!amount) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format relative time
function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

/**
 * Creator Management Client Component
 * Phase 64 - Unified Data Architecture
 *
 * Now uses useAgencyData() context for all data.
 */
export default function CreatorManagementClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get data from unified context
  const { models, agency, refreshData } = useAgencyData()
  const agencyId = agency?.id
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set())

  // Handle OAuth success/error from URL params
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'agency_connected') {
      toast.success('🎉 Agency Fanvue connected! Your creators will be imported.')
      window.history.replaceState({}, '', '/dashboard/creator-management')
      router.refresh()
    } else if (success === 'connected') {
      toast.success('🎉 Creator connected successfully!')
      window.history.replaceState({}, '', '/dashboard/creator-management')

      // Auto-refresh stats for new creator
      const latestModel = models[0]
      if (latestModel) {
        handleRefreshStats(latestModel.id, latestModel.name || 'Creator')
      }

      router.refresh()
    } else if (error) {
      const errorMessages: Record<string, string> = {
        oauth_denied: 'OAuth authorization was denied',
        no_code: 'No authorization code received',
        invalid_state: 'Security validation failed',
        no_verifier: 'Session expired. Please try again.',
        token_failed: 'Failed to exchange tokens',
        user_fetch_failed: 'Failed to fetch user info',
        no_agency: 'No agency found for this user',
        oauth_failed: 'OAuth authentication failed',
        oauth_not_configured: 'Fanvue OAuth is not configured. Contact admin.',
        not_admin: 'Only agency admins can connect Fanvue.',
        session_expired: 'Session expired. Please try again.',
        session_mismatch: 'Session mismatch. Please try again.',
        agency_mismatch: 'Agency mismatch error.',
        oauth_state_mismatch: 'Security state mismatch. Please try again.',
        oauth_token_exchange_failed: 'Failed to exchange OAuth token with Fanvue.',
      }
      toast.error(errorMessages[error] || 'An error occurred')
      window.history.replaceState({}, '', '/dashboard/creator-management')
    }
  }, [searchParams, router, models])

  // Navigate to OAuth connect page
  const handleConnectCreator = () => {
    router.push('/connect-fanvue')
  }

  // Handle delete creator
  const handleDeleteCreator = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return

    try {
      const response = await fetch(`/api/creators/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete')
      }

      toast.success(`${name} has been removed`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete creator')
    }
  }

  // Handle refresh stats - REAL API CALL
  const handleRefreshStats = async (id: string, name?: string) => {
    if (refreshingIds.has(id)) return

    setRefreshingIds(prev => new Set(prev).add(id))
    toast.info(`Fetching stats for ${name || 'creator'}...`)

    try {
      const response = await fetch(`/api/creators/${id}/stats`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh stats')
      }

      toast.success(`✅ Stats updated for ${name || 'creator'}!`)
      router.refresh()
    } catch (error: any) {
      console.error('[Refresh Stats] Error:', error)
      toast.error(error.message || 'Failed to refresh stats')
    } finally {
      setRefreshingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // Refresh all creators
  const handleRefreshAll = async () => {
    for (const model of filteredModels) {
      await handleRefreshStats(model.id, model.name || undefined)
    }
  }

  const filteredModels = models.filter(model => {
    const matchesSearch = model.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || model.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creator Management</h1>
          <p className="text-muted-foreground mt-1">Manage your creators and their settings</p>
        </div>

        <div className="flex gap-2">
          {filteredModels.length > 0 && (
            <Button
              onClick={handleRefreshAll}
              variant="outline"
              className="gap-2"
              disabled={refreshingIds.size > 0}
            >
              <RefreshCw className={`w-4 h-4 ${refreshingIds.size > 0 ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
          )}
          <ConnectAgencyFanvueButton />
          <AgencyImportButton />
          <AddCreatorDialog agencyId={agencyId || ''} />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search creators..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-md border border-border bg-background"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Creators Grid */}
      {filteredModels.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Creators Yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Add your first creator to start managing their content and performance
            </p>

            <div className="flex gap-3 justify-center flex-wrap">
              <ConnectAgencyFanvueButton />
              <AgencyImportButton />
              <AddCreatorDialog agencyId={agencyId || ''} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredModels.map(model => {
            const isRefreshing = refreshingIds.has(model.id)

            return (
              <Card key={model.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={model.avatar_url || undefined} alt={model.name || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xl">
                        {model.name?.[0]?.toUpperCase() || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg truncate">
                            {model.name || 'Unnamed Creator'}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={model.status === 'active' ? 'default' : 'secondary'}>
                              {model.status === 'active' ? '🟢 Active' : '⚫ Inactive'}
                            </Badge>
                            {model.stats_updated_at && (
                              <span className="text-xs text-muted-foreground">
                                Updated {formatRelativeTime(model.stats_updated_at)}
                              </span>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleRefreshStats(model.id, model.name || undefined)}
                              disabled={isRefreshing}
                            >
                              <RefreshCw
                                className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
                              />
                              {isRefreshing ? 'Refreshing...' : 'Refresh Stats'}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Settings className="w-4 h-4 mr-2" />
                              Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteCreator(model.id, model.name || 'Creator')}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid - Real Data */}
                  <div className="grid grid-cols-3 gap-4 text-center mt-6">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <Heart className="w-3 h-3" />
                        <span className="text-xs">Followers</span>
                      </div>
                      <p className="font-semibold">{formatNumber(model.followers_count)}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <Users className="w-3 h-3" />
                        <span className="text-xs">Subscribers</span>
                      </div>
                      <p className="font-semibold">{formatNumber(model.subscribers_count)}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <DollarSign className="w-3 h-3" />
                        <span className="text-xs">Revenue</span>
                      </div>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(model.revenue_total)}
                      </p>
                    </div>
                  </div>

                  {/* Secondary Stats */}
                  <div className="grid grid-cols-4 gap-2 text-center mt-4 pt-4 border-t">
                    <div>
                      <div className="flex items-center justify-center text-muted-foreground mb-1">
                        <Image className="w-3 h-3" />
                      </div>
                      <p className="text-sm font-medium">{model.posts_count || 0}</p>
                      <p className="text-xs text-muted-foreground">Posts</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center text-muted-foreground mb-1">
                        <MessageCircle className="w-3 h-3" />
                      </div>
                      <p className="text-sm font-medium">{model.unread_messages || 0}</p>
                      <p className="text-xs text-muted-foreground">Messages</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center text-muted-foreground mb-1">
                        <Heart className="w-3 h-3" />
                      </div>
                      <p className="text-sm font-medium">{formatNumber(model.likes_count)}</p>
                      <p className="text-xs text-muted-foreground">Likes</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center text-muted-foreground mb-1">
                        <Link2 className="w-3 h-3" />
                      </div>
                      <p className="text-sm font-medium">{model.tracking_links_count || 0}</p>
                      <p className="text-xs text-muted-foreground">Links</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Link href={`/dashboard/creator-management/${model.id}`} className="flex-1">
                      <Button className="w-full" variant="outline">
                        View Details
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRefreshStats(model.id, model.name || undefined)}
                      disabled={isRefreshing}
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
