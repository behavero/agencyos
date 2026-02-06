'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Database } from '@/types/database.types'
import {
  ArrowLeft,
  DollarSign,
  Users,
  Heart,
  TrendingUp,
  Settings,
  Link2,
  Save,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SocialConnector } from '@/components/creators/social-connector'

type Model = Database['public']['Tables']['models']['Row'] & {
  social_accounts?: Array<Database['public']['Tables']['social_accounts']['Row']>
}

interface CreatorDetailClientProps {
  model: Model
  agencyId: string
}

function formatCurrency(amount: number | null | undefined): string {
  if (!amount) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(num: number | null | undefined): string {
  if (!num) return '0'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export default function CreatorDetailClient({ model, agencyId }: CreatorDetailClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Settings form state
  const [settings, setSettings] = useState({
    name: model.name || '',
    fanvue_username: model.fanvue_username || '',
    agency_split_percentage: model.agency_split_percentage || 50,
    status: model.status || 'active',
  })

  const handleRefreshStats = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch(`/api/creators/${model.id}/stats`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to refresh stats')
      }

      toast.success('Stats updated successfully!')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to refresh stats')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/creators/${model.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save settings')
      }

      toast.success('Settings saved successfully!')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/creator-management">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <Avatar className="w-20 h-20 border-2 border-primary/20">
            <AvatarImage src={model.avatar_url || undefined} alt={model.name || ''} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
              {model.name?.[0]?.toUpperCase() || 'C'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{model.name || 'Unnamed Creator'}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={model.status === 'active' ? 'default' : 'secondary'}>
                {model.status === 'active' ? '🟢 Active' : '⚫ Inactive'}
              </Badge>
              {model.fanvue_username && (
                <a
                  href={`https://fanvue.com/${model.fanvue_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  <Link2 className="w-3 h-3" />@{model.fanvue_username}
                </a>
              )}
            </div>
          </div>
        </div>
        <Button
          onClick={handleRefreshStats}
          disabled={isRefreshing}
          className="gap-2"
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Stats'}
        </Button>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="socials">Socials</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="glass border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(model.revenue_total)}
                </div>
                <p className="text-xs text-muted-foreground">All-time earnings</p>
              </CardContent>
            </Card>

            <Card className="glass border-green-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
                <Users className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {formatNumber(model.subscribers_count)}
                </div>
                <p className="text-xs text-muted-foreground">Active subscribers</p>
              </CardContent>
            </Card>

            <Card className="glass border-violet-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Followers</CardTitle>
                <Heart className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-violet-500">
                  {formatNumber(model.followers_count)}
                </div>
                <p className="text-xs text-muted-foreground">Total followers</p>
              </CardContent>
            </Card>

            <Card className="glass border-blue-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagement</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  {formatNumber(model.likes_count)}
                </div>
                <p className="text-xs text-muted-foreground">Total likes</p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Content Performance</CardTitle>
                <CardDescription>Overview of content metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Content</span>
                    <span className="font-semibold">{model.posts_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Unread Messages</span>
                    <span className="font-semibold">{model.unread_messages || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tracking Links</span>
                    <span className="font-semibold">{model.tracking_links_count || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle>Agency Split</CardTitle>
                <CardDescription>Revenue distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Agency Share</span>
                    <span className="font-semibold text-primary">
                      {model.agency_split_percentage || 50}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Creator Share</span>
                    <span className="font-semibold text-green-500">
                      {100 - (model.agency_split_percentage || 50)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${model.agency_split_percentage || 50}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Socials Tab */}
        <TabsContent value="socials">
          <SocialConnector modelId={model.id} agencyId={agencyId} model={model} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Creator Settings</CardTitle>
              <CardDescription>Manage creator profile and configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={settings.name}
                  onChange={e => setSettings({ ...settings, name: e.target.value })}
                  placeholder="Enter display name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fanvue_username">Fanvue Username</Label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 rounded-md border border-border bg-muted text-muted-foreground">
                    @
                  </span>
                  <Input
                    id="fanvue_username"
                    value={settings.fanvue_username}
                    onChange={e =>
                      setSettings({ ...settings, fanvue_username: e.target.value.replace('@', '') })
                    }
                    placeholder="username"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="split">Agency Split Percentage</Label>
                <div className="flex gap-4 items-center">
                  <Input
                    id="split"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.agency_split_percentage}
                    onChange={e =>
                      setSettings({
                        ...settings,
                        agency_split_percentage: parseFloat(e.target.value),
                      })
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    Agency gets {settings.agency_split_percentage}%, Creator gets{' '}
                    {100 - settings.agency_split_percentage}%
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={settings.status}
                  onChange={e => setSettings({ ...settings, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="paused">Paused</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveSettings} disabled={isSaving} className="gap-2">
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSettings({
                      name: model.name || '',
                      fanvue_username: model.fanvue_username || '',
                      agency_split_percentage: model.agency_split_percentage || 50,
                      status: model.status || 'active',
                    })
                    toast.info('Changes discarded')
                  }}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
