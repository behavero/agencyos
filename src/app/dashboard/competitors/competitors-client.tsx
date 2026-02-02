'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Ghost,
  Plus,
  RefreshCw,
  Users,
  Eye,
  TrendingUp,
  TrendingDown,
  Instagram,
  Youtube,
  MoreVertical,
  Trash2,
  ExternalLink,
  Radar,
  Target,
  Sparkles,
  AlertCircle,
} from 'lucide-react'

interface WatchedAccount {
  id: string
  username: string
  platform: string
  account_type: string
  display_name: string | null
  avatar_url: string | null
  profile_url: string | null
  last_stats: {
    followers?: number
    following?: number
    postsCount?: number
    avgViews?: number
    avgLikes?: number
    engagementRate?: number
    bio?: string
    scrapedAt?: string
  } | null
  stats_history: Array<{
    followers?: number
    scrapedAt?: string
  }>
  last_scanned_at: string | null
  scan_error: string | null
  notes: string | null
  tags: string[]
}

interface CompetitorsClientProps {
  agencyId: string
  models: Array<{ id: string; name: string }>
}

// Platform icon component
const PlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform) {
    case 'instagram':
      return <Instagram className="w-4 h-4 text-pink-400" />
    case 'youtube':
      return <Youtube className="w-4 h-4 text-red-400" />
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-cyan-400" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      )
    case 'x':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-zinc-300" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      )
    default:
      return <Users className="w-4 h-4 text-zinc-400" />
  }
}

// Format large numbers
const formatNumber = (num: number | undefined): string => {
  if (!num) return '0'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

// Calculate growth from history
const calculateGrowth = (account: WatchedAccount): number | null => {
  if (!account.stats_history || account.stats_history.length < 2) return null
  
  const latest = account.last_stats?.followers || 0
  const previous = account.stats_history[account.stats_history.length - 2]?.followers || 0
  
  if (previous === 0) return null
  return Number(((latest - previous) / previous * 100).toFixed(1))
}

export function CompetitorsClient({ agencyId, models }: CompetitorsClientProps) {
  const [accounts, setAccounts] = useState<WatchedAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('all')

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    platform: 'instagram',
    accountType: 'competitor',
    modelId: '',
    notes: '',
  })

  // Fetch accounts
  const fetchAccounts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ghost/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  // Add account
  const handleAddAccount = async () => {
    if (!formData.username.trim()) {
      toast.error('Please enter a username')
      return
    }

    setIsAdding(true)
    try {
      const response = await fetch('/api/ghost/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          platform: formData.platform,
          accountType: formData.accountType,
          modelId: formData.modelId || undefined,
          notes: formData.notes || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`@${data.account.username} added to tracker! 👻`)
        setIsAddDialogOpen(false)
        setFormData({ username: '', platform: 'instagram', accountType: 'competitor', modelId: '', notes: '' })
        fetchAccounts()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add account')
      }
    } catch (error) {
      toast.error('Failed to add account')
    } finally {
      setIsAdding(false)
    }
  }

  // Refresh account
  const handleRefresh = async (accountId: string) => {
    setRefreshingId(accountId)
    try {
      const response = await fetch(`/api/ghost/accounts/${accountId}`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Stats refreshed! 📊')
        fetchAccounts()
      } else {
        toast.error('Failed to refresh stats')
      }
    } catch (error) {
      toast.error('Failed to refresh')
    } finally {
      setRefreshingId(null)
    }
  }

  // Delete account
  const handleDelete = async (accountId: string, username: string) => {
    if (!confirm(`Remove @${username} from tracking?`)) return

    try {
      const response = await fetch(`/api/ghost/accounts/${accountId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success(`@${username} removed`)
        fetchAccounts()
      } else {
        toast.error('Failed to delete')
      }
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  // Filter accounts by tab
  const filteredAccounts = accounts.filter(account => {
    if (activeTab === 'all') return true
    return account.account_type === activeTab
  })

  // Summary stats
  const totalFollowers = accounts
    .filter(a => a.account_type === 'slave')
    .reduce((sum, a) => sum + (a.last_stats?.followers || 0), 0)

  const competitorCount = accounts.filter(a => a.account_type === 'competitor').length
  const slaveCount = accounts.filter(a => a.account_type === 'slave').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Ghost className="w-8 h-8 text-primary" />
            Ghost Tracker
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor competitors and slave accounts without login
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Target
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Radar className="w-5 h-5 text-primary" />
                Add Account to Track
              </DialogTitle>
              <DialogDescription>
                Enter a public username to start monitoring
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  placeholder="@username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select
                    value={formData.platform}
                    onValueChange={(v) => setFormData({ ...formData, platform: v })}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="x">X (Twitter)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.accountType}
                    onValueChange={(v) => setFormData({ ...formData, accountType: v })}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="competitor">🎯 Competitor</SelectItem>
                      <SelectItem value="slave">👻 Slave Account</SelectItem>
                      <SelectItem value="backup">💾 Backup</SelectItem>
                      <SelectItem value="reference">📌 Reference</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {models.length > 0 && (
                <div className="space-y-2">
                  <Label>Link to Model (Optional)</Label>
                  <Select
                    value={formData.modelId}
                    onValueChange={(v) => setFormData({ ...formData, modelId: v })}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input
                  placeholder="Why are you tracking this account?"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAccount} disabled={isAdding}>
                {isAdding ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Radar className="w-4 h-4 mr-2" />
                    Add & Scan
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <Target className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Competitors</p>
                <p className="text-2xl font-bold text-white">{competitorCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                <Ghost className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Slave Accounts</p>
                <p className="text-2xl font-bold text-white">{slaveCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Slave Network Reach</p>
                <p className="text-2xl font-bold text-white">{formatNumber(totalFollowers)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-800 border-zinc-700">
          <TabsTrigger value="all">All ({accounts.length})</TabsTrigger>
          <TabsTrigger value="competitor">Competitors</TabsTrigger>
          <TabsTrigger value="slave">Slaves</TabsTrigger>
          <TabsTrigger value="backup">Backups</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="bg-zinc-900 border-zinc-800 animate-pulse">
                  <CardContent className="pt-6">
                    <div className="h-20 bg-zinc-800 rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredAccounts.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="py-12 text-center">
                <Ghost className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-400">No accounts being tracked yet</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Target
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAccounts.map((account) => {
                const growth = calculateGrowth(account)
                
                return (
                  <Card key={account.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-all">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                            <PlatformIcon platform={account.platform} />
                          </div>
                          <div>
                            <CardTitle className="text-base text-white">
                              @{account.username}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {account.display_name || account.platform}
                            </CardDescription>
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
                              onClick={() => handleRefresh(account.id)}
                              disabled={refreshingId === account.id}
                            >
                              <RefreshCw className={`w-4 h-4 mr-2 ${refreshingId === account.id ? 'animate-spin' : ''}`} />
                              Refresh Stats
                            </DropdownMenuItem>
                            {account.profile_url && (
                              <DropdownMenuItem asChild>
                                <a href={account.profile_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  View Profile
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDelete(account.id, account.username)}
                              className="text-red-400"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Type Badge */}
                      <Badge
                        variant="outline"
                        className={`w-fit mt-2 text-xs ${
                          account.account_type === 'competitor' ? 'border-red-500/30 text-red-400' :
                          account.account_type === 'slave' ? 'border-purple-500/30 text-purple-400' :
                          account.account_type === 'backup' ? 'border-yellow-500/30 text-yellow-400' :
                          'border-zinc-600 text-zinc-400'
                        }`}
                      >
                        {account.account_type}
                      </Badge>
                    </CardHeader>

                    <CardContent>
                      {account.scan_error ? (
                        <div className="flex items-center gap-2 text-sm text-yellow-400">
                          <AlertCircle className="w-4 h-4" />
                          {account.scan_error}
                        </div>
                      ) : account.last_stats ? (
                        <div className="space-y-3">
                          {/* Followers */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-zinc-500" />
                              <span className="text-sm text-zinc-400">Followers</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-white">
                                {formatNumber(account.last_stats.followers)}
                              </span>
                              {growth !== null && (
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    growth > 0 ? 'text-green-400 border-green-500/30' :
                                    growth < 0 ? 'text-red-400 border-red-500/30' :
                                    'text-zinc-400 border-zinc-600'
                                  }`}
                                >
                                  {growth > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                  {growth > 0 ? '+' : ''}{growth}%
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Posts */}
                          {account.last_stats.postsCount !== undefined && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-zinc-500" />
                                <span className="text-sm text-zinc-400">Posts</span>
                              </div>
                              <span className="text-sm text-white">
                                {formatNumber(account.last_stats.postsCount)}
                              </span>
                            </div>
                          )}

                          {/* Engagement */}
                          {account.last_stats.engagementRate && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-zinc-500" />
                                <span className="text-sm text-zinc-400">Engagement</span>
                              </div>
                              <span className="text-sm text-white">
                                {account.last_stats.engagementRate}%
                              </span>
                            </div>
                          )}

                          {/* Last Scanned */}
                          <Separator className="bg-zinc-800" />
                          <p className="text-xs text-zinc-500">
                            Last scanned: {account.last_scanned_at 
                              ? new Date(account.last_scanned_at).toLocaleDateString()
                              : 'Never'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500">No stats yet</p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
