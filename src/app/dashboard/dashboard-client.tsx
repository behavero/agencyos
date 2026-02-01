'use client'

import { useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Trophy,
  Crown,
  Plus,
  PiggyBank,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  Eye,
  Heart,
} from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row']
type Agency = Database['public']['Tables']['agencies']['Row']
type Model = Database['public']['Tables']['models']['Row']

interface DashboardClientProps {
  user: User
  profile: Profile | null
  agency: Agency | null
  models: Model[]
  totalExpenses: number
}

// Chart configs
const revenueChartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(142, 76%, 36%)',
  },
  expenses: {
    label: 'Expenses',
    color: 'hsl(0, 84%, 60%)',
  },
} satisfies ChartConfig

const subscriberChartConfig = {
  subscribers: {
    label: 'Subscribers',
    color: 'hsl(262, 83%, 58%)',
  },
  followers: {
    label: 'Followers',
    color: 'hsl(221, 83%, 53%)',
  },
} satisfies ChartConfig

const modelChartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(142, 76%, 36%)',
  },
} satisfies ChartConfig

export default function DashboardClient({ user, profile, agency, models, totalExpenses }: DashboardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Handle OAuth success/error notifications
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const details = searchParams.get('details')

    if (success === 'model_added') {
      toast.success('🎉 Model added successfully!')
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      window.history.replaceState({}, '', url.toString())
      setTimeout(() => router.refresh(), 1000)
    } else if (error) {
      const errorMessages: Record<string, string> = {
        fanvue_oauth_failed: 'Failed to connect Fanvue account',
        invalid_state: 'Security validation failed. Please try again.',
        missing_verifier: 'Session expired. Please try again.',
        not_logged_in: 'Please log in first',
      }
      const message = errorMessages[error] || 'An error occurred'
      const fullMessage = details ? `${message}: ${decodeURIComponent(details)}` : message
      toast.error(fullMessage)
      
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      url.searchParams.delete('details')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams, router])

  const handleAddModel = () => {
    router.push('/api/oauth/login')
  }

  // ===== REAL CALCULATIONS =====
  const totalGrossRevenue = models.reduce((sum, m) => sum + Number(m.revenue_total || 0), 0)
  const platformFee = totalGrossRevenue * 0.20
  const afterPlatformFee = totalGrossRevenue - platformFee
  const taxRate = agency?.tax_rate ?? 0.20
  const profitBeforeTax = afterPlatformFee - totalExpenses
  const taxes = Math.max(0, profitBeforeTax * taxRate)
  const netProfit = Math.max(0, profitBeforeTax - taxes)
  
  const activeModels = models.filter(m => m.status === 'active').length
  const currentLevel = agency?.current_level || 1
  const currentStreak = profile?.current_streak || 0
  const xpCount = profile?.xp_count || 0
  const nextLevelXp = currentLevel * 1000
  const totalFollowers = models.reduce((sum, m) => sum + Number(m.followers_count || 0), 0)
  const totalSubscribers = models.reduce((sum, m) => sum + Number(m.subscribers_count || 0), 0)
  const totalUnreadMessages = models.reduce((sum, m) => sum + Number(m.unread_messages || 0), 0)
  const totalLikes = models.reduce((sum, m) => sum + Number(m.likes_count || 0), 0)
  const totalPosts = models.reduce((sum, m) => sum + Number(m.posts_count || 0), 0)

  // Generate mock monthly data for charts (in production, fetch from API)
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    const baseRevenue = totalGrossRevenue / 6
    return months.map((month, i) => ({
      month,
      revenue: Math.round(baseRevenue * (0.7 + Math.random() * 0.6)),
      expenses: Math.round(totalExpenses * (0.8 + Math.random() * 0.4)),
      subscribers: Math.round(totalSubscribers / 6 * (0.5 + i * 0.2)),
      followers: Math.round(totalFollowers / 6 * (0.3 + i * 0.25)),
    }))
  }, [totalGrossRevenue, totalExpenses, totalSubscribers, totalFollowers])

  // Model performance data for bar chart
  const modelPerformanceData = useMemo(() => {
    return models.map(m => ({
      name: m.name?.split(' ')[0] || 'Model',
      revenue: Number(m.revenue_total || 0),
      subscribers: Number(m.subscribers_count || 0),
    }))
  }, [models])

  // Pie chart data for revenue distribution
  const revenueDistribution = useMemo(() => {
    if (models.length === 0) return []
    return models.map((m, i) => ({
      name: m.name || 'Unknown',
      value: Number(m.revenue_total || 0),
      fill: `hsl(${262 + i * 30}, 70%, ${50 + i * 5}%)`,
    }))
  }, [models])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: agency?.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const profitMargin = totalGrossRevenue > 0 ? ((netProfit / totalGrossRevenue) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile?.username || 'Grandmaster'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {agency?.name || 'Your Agency'} • Level {currentLevel} • {currentStreak} day streak 🔥
          </p>
        </div>
        <Button onClick={handleAddModel} className="gap-2 shadow-lg hover-lift">
          <Plus className="w-4 h-4" />
          Add Model
        </Button>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <Card className="glass border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatCurrency(totalGrossRevenue)}</div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-500" />
              <span className="text-xs text-green-500">All-time from Fanvue</span>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="glass border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <PiggyBank className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(netProfit)}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-muted-foreground">{profitMargin}% margin</span>
            </div>
          </CardContent>
        </Card>

        {/* Subscribers */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
            <Users className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscribers.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-muted-foreground">{totalFollowers.toLocaleString()} followers</span>
            </div>
          </CardContent>
        </Card>

        {/* Agency Level */}
        <Card className="glass bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agency Level</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Level {currentLevel}</div>
            <div className="mt-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
                  style={{ width: `${Math.min((xpCount / nextLevelXp) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{xpCount}/{nextLevelXp} XP</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue & Expenses Area Chart */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Revenue vs Expenses
            </CardTitle>
            <CardDescription>Monthly financial overview</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="h-[250px] w-full">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tickLine={false} 
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  className="text-xs"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(142, 76%, 36%)"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="hsl(0, 84%, 60%)"
                  strokeWidth={2}
                  fill="url(#colorExpenses)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Subscriber Growth Line Chart */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-500" />
              Audience Growth
            </CardTitle>
            <CardDescription>Subscribers & followers over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={subscriberChartConfig} className="h-[250px] w-full">
              <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tickLine={false} 
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="subscribers"
                  stroke="hsl(262, 83%, 58%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(262, 83%, 58%)', strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="followers"
                  stroke="hsl(221, 83%, 53%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(221, 83%, 53%)', strokeWidth: 0 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model Performance Bar Chart */}
        {models.length > 0 && (
          <Card className="glass lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Model Performance
              </CardTitle>
              <CardDescription>Revenue by creator</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={modelChartConfig} className="h-[250px] w-full">
                <BarChart data={modelPerformanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="revenue" 
                    fill="hsl(142, 76%, 36%)" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Across all models</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Unread Messages</span>
              </div>
              <span className="font-bold">{totalUnreadMessages}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                <span className="text-sm">Total Likes</span>
              </div>
              <span className="font-bold">{totalLikes.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-green-500" />
                <span className="text-sm">Total Posts</span>
              </div>
              <span className="font-bold">{totalPosts}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Monthly Expenses</span>
              </div>
              <span className="font-bold">{formatCurrency(totalExpenses)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
            <CardDescription>How your earnings are distributed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                <span className="text-sm font-medium">Gross Revenue</span>
                <span className="text-lg font-bold text-green-500">{formatCurrency(totalGrossRevenue)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm">Platform Fee (20%)</span>
                <span className="font-semibold text-red-400">-{formatCurrency(platformFee)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm">Operating Expenses</span>
                <span className="font-semibold text-red-400">-{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Taxes ({(taxRate * 100).toFixed(0)}%)</span>
                </div>
                <span className="font-semibold text-red-400">-{formatCurrency(taxes)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border-t-2 border-primary">
                <span className="text-sm font-medium">Net Profit</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(netProfit)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Capital Allocation */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Capital Allocation</CardTitle>
            <CardDescription>Suggested profit distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Reinvest in Growth (60%)</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(netProfit * 0.6)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '60%' }} />
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Owner Distribution (40%)</span>
                  <span className="text-lg font-bold">{formatCurrency(netProfit * 0.4)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: '40%' }} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => router.push('/dashboard/expenses')}
                >
                  View Expenses
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => router.push('/dashboard/agency-settings')}
                >
                  Tax Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Models Grid */}
      {models.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle>Your Models</CardTitle>
            <CardDescription>Manage your creators and track performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map((model) => (
                <div
                  key={model.id}
                  className="group relative p-4 rounded-xl border border-border hover:border-primary/50 transition-all hover-lift glass cursor-pointer"
                  onClick={() => router.push('/dashboard/creator-management')}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={model.avatar_url || undefined} alt={model.name || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                        {model.name?.charAt(0) || 'M'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{model.name}</h3>
                      <p className="text-sm text-green-500 font-medium">
                        {formatCurrency(Number(model.revenue_total || 0))}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={model.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {model.status}
                        </Badge>
                        {Number(model.unread_messages || 0) > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {model.unread_messages} unread
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-center text-xs">
                    <div>
                      <div className="font-semibold">{Number(model.subscribers_count || 0).toLocaleString()}</div>
                      <div className="text-muted-foreground">Subs</div>
                    </div>
                    <div>
                      <div className="font-semibold">{Number(model.followers_count || 0).toLocaleString()}</div>
                      <div className="text-muted-foreground">Followers</div>
                    </div>
                    <div>
                      <div className="font-semibold">{Number(model.posts_count || 0)}</div>
                      <div className="text-muted-foreground">Posts</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {models.length === 0 && (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Models Yet</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Connect your first Fanvue creator to start tracking performance and growing your agency.
            </p>
            <Button onClick={handleAddModel} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Model
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
