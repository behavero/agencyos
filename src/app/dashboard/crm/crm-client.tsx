'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  Crown,
  Clock,
  DollarSign,
  MessageSquare,
  Heart,
  ShoppingBag,
  RefreshCw,
  UserCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAgencyData } from '@/providers/agency-data-provider'

interface Fan {
  fan_id: string
  fan_username: string | null
  model_id: string
  model_name: string
  total_spend: number
  transaction_count: number
  last_active: string
  first_seen?: string
  activity_types: string[]
  // fan_insights fields
  notes?: string
  whale_score?: number
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'subscription':
      return <Heart className="w-3 h-3 text-pink-400" />
    case 'message':
      return <MessageSquare className="w-3 h-3 text-blue-400" />
    case 'tip':
      return <DollarSign className="w-3 h-3 text-yellow-400" />
    case 'post':
    case 'ppv':
      return <ShoppingBag className="w-3 h-3 text-purple-400" />
    default:
      return <DollarSign className="w-3 h-3 text-muted-foreground" />
  }
}

const getSpenderTier = (amount: number) => {
  if (amount >= 500)
    return { label: 'Whale', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' }
  if (amount >= 100)
    return { label: 'VIP', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' }
  if (amount >= 25)
    return { label: 'Regular', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
  return { label: 'New', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' }
}

function FanRow({ fan }: { fan: Fan }) {
  const tier = getSpenderTier(fan.total_spend)

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/30 transition-colors">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
        <UserCircle className="w-6 h-6 text-primary" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate">
            {fan.fan_username || fan.fan_id.slice(0, 12)}
          </span>
          <Badge variant="outline" className={`text-xs ${tier.color}`}>
            {tier.label}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <span>{fan.model_name}</span>
          <span>{fan.transaction_count} transactions</span>
          <span>Last active {formatDate(fan.last_active)}</span>
        </div>
        {fan.activity_types.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1">
            {fan.activity_types.map(type => (
              <div key={type} className="flex items-center gap-0.5" title={type}>
                {getActivityIcon(type)}
                <span className="text-xs text-muted-foreground capitalize">{type}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spend */}
      <div className="text-right shrink-0">
        <div className="font-bold text-primary">{formatCurrency(fan.total_spend)}</div>
        <div className="text-xs text-muted-foreground">Total spent</div>
      </div>
    </div>
  )
}

export default function CRMClient() {
  const { models } = useAgencyData()
  const [selectedModelId, setSelectedModelId] = useState('all')
  const [activeTab, setActiveTab] = useState('all')

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['crm-fans', activeTab, selectedModelId],
    queryFn: async () => {
      const params = new URLSearchParams({ tab: activeTab, limit: '50' })
      if (selectedModelId !== 'all') params.set('modelId', selectedModelId)
      const res = await fetch(`/api/crm/fans?${params}`)
      return res.json()
    },
    staleTime: 30_000,
  })

  const fans: Fan[] = data?.fans || []
  const stats = data?.stats

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-primary" />
            Fan CRM
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your fans, track spending, and identify VIPs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedModelId} onValueChange={setSelectedModelId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Models" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {models.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Fans</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFans.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Unique fans across all models</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Fan Spend</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {formatCurrency(stats.totalSpend)}
              </div>
              <p className="text-xs text-muted-foreground">All-time from transactions</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Spend per Fan</CardTitle>
              <Crown className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                {formatCurrency(stats.avgSpend)}
              </div>
              <p className="text-xs text-muted-foreground">Average lifetime value</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="all" className="gap-2">
            <Users className="w-4 h-4" />
            All Fans
          </TabsTrigger>
          <TabsTrigger value="top-spenders" className="gap-2">
            <Crown className="w-4 h-4" />
            Top Spenders
          </TabsTrigger>
          <TabsTrigger value="recent" className="gap-2">
            <Clock className="w-4 h-4" />
            Recent Activity
          </TabsTrigger>
        </TabsList>

        {/* All tabs use same rendering */}
        {['all', 'top-spenders', 'recent'].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {isLoading ? (
              <Card className="glass">
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground">Loading fans...</div>
                </CardContent>
              </Card>
            ) : fans.length === 0 ? (
              <Card className="glass">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Fan Data Yet</h3>
                  <p className="text-muted-foreground mb-4 max-w-sm">
                    {tab === 'top-spenders'
                      ? 'Top spenders will appear here once fan insights are synced from transactions.'
                      : tab === 'recent'
                        ? 'Recent fan activity will appear once transactions are synced.'
                        : 'Fan data will populate once your Fanvue transactions are synced.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass">
                <CardHeader>
                  <CardTitle>
                    {tab === 'top-spenders'
                      ? 'VIP Fans'
                      : tab === 'recent'
                        ? 'Recent Activity'
                        : 'All Fans'}
                  </CardTitle>
                  <CardDescription>{data?.total?.toLocaleString() || 0} fans found</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {fans.map((fan, i) => (
                      <FanRow key={`${fan.fan_id}-${fan.model_id}-${i}`} fan={fan} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
