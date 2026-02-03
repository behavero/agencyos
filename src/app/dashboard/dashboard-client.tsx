'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import type {
  RevenueDataPoint,
  RevenueBreakdownItem,
  ConversionStats,
  TrafficSource,
  SubscriberGrowthPoint,
  ModelPerformanceItem,
  DashboardKPIs,
  ExpenseHistoryPoint,
} from '@/types/dashboard'
import type { ChartDataPoint, KPIMetrics, CategoryBreakdown } from '@/lib/services/analytics-engine'
import { RevenueChart } from '@/components/dashboard/charts/revenue-chart'
import { EarningsBreakdown } from '@/components/dashboard/finance/earnings-breakdown'
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
  Globe,
} from 'lucide-react'
import { AggregatedSocialGrid } from '@/components/dashboard/social-grid'
import { BestSellersWidget } from '@/components/dashboard/best-sellers-widget'
import { SyncButton } from '@/components/dashboard/sync-button'
import { DateRangeFilter, type DateRangeValue } from '@/components/dashboard/date-range-filter'
import { NewFansAnalytics } from '@/components/dashboard/new-fans-analytics'

// Dark mode chart theme for Recharts
const CHART_THEME = {
  stroke: '#71717a', // zinc-500
  tick: { fill: '#e4e4e7', fontSize: 12 }, // zinc-200
  tooltip: {
    backgroundColor: '#18181b', // zinc-900
    border: '1px solid #27272a', // zinc-800
    borderRadius: '8px',
  },
}

type Profile = Database['public']['Tables']['profiles']['Row']
type Agency = Database['public']['Tables']['agencies']['Row']
type Model = Database['public']['Tables']['models']['Row']

interface DashboardClientProps {
  user: User
  profile: Profile | null
  agency: Agency | null
  models: Model[]
  totalExpenses: number
  // All analytics data is now fetched client-side via /api/analytics/dashboard
  // This ensures Overview and Fanvue tabs use the SAME data source
}

// Chart configs - Lime Theme
const revenueChartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'oklch(0.841 0.238 116.029)', // Lime primary
  },
  expenses: {
    label: 'Expenses',
    color: 'oklch(0.704 0.191 22.216)', // Destructive
  },
} satisfies ChartConfig

const subscriberChartConfig = {
  subscribers: {
    label: 'Subscribers',
    color: 'oklch(0.6 0.118 184.704)', // Teal
  },
  followers: {
    label: 'Followers',
    color: 'oklch(0.841 0.238 116.029)', // Lime
  },
} satisfies ChartConfig

const modelChartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'oklch(0.841 0.238 116.029)', // Lime primary
  },
} satisfies ChartConfig

export default function DashboardClient({
  user,
  profile,
  agency,
  models,
  totalExpenses,
}: DashboardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Default empty arrays for removed server-side props (now fetched client-side)
  const revenueHistory: RevenueDataPoint[] = []
  const revenueBreakdown: RevenueBreakdownItem[] = []
  const conversionStats = {
    clickToSubscriberRate: 0,
    messageConversionRate: 0,
    ppvConversionRate: 0,
    trend: 0,
  }
  const trafficSources: TrafficSource[] = []
  const subscriberGrowth: SubscriberGrowthPoint[] = []
  const modelPerformance: ModelPerformanceItem[] = []
  const dashboardKPIs = {
    totalRevenue: 0,
    activeSubscribers: 0,
    averageRevenuePerUser: 0,
    conversionRate: 0,
  }
  const expenseHistory: ExpenseHistoryPoint[] = []

  // Model filter state
  const [selectedModelId, setSelectedModelId] = useState<string>('all')
  const [isLoadingModelData, setIsLoadingModelData] = useState(false)
  const [modelChartData, setModelChartData] = useState<ChartDataPoint[]>([])
  const [modelKPIMetrics, setModelKPIMetrics] = useState<KPIMetrics | null>(null)
  const [modelCategoryBreakdown, setModelCategoryBreakdown] = useState<CategoryBreakdown[]>([])

  // Date range filter state (for both Overview and Fanvue tabs)
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: 'all', // Default to "All Time" to show full history
  })

  // Overview-specific state (separate from Fanvue tab)
  const [overviewData, setOverviewData] = useState<{
    chartData: ChartDataPoint[]
    kpiMetrics: KPIMetrics
    categoryBreakdown: CategoryBreakdown[]
  } | null>(null)
  const [isLoadingOverview, setIsLoadingOverview] = useState(false)

  const selectedModel = models.find(m => m.id === selectedModelId)

  // Fetch Overview tab data when date range changes (ALWAYS agency-wide, no model filter)
  useEffect(() => {
    const fetchOverviewData = async () => {
      setIsLoadingOverview(true)
      try {
        const params = new URLSearchParams()
        params.set('agencyId', agency?.id || '')

        // Map preset to timeRange format
        const timeRangeMap: Record<string, string> = {
          all: 'all',
          today: '7d',
          yesterday: '7d',
          last7days: '7d',
          last30days: '30d',
          thisMonth: '30d',
          thisYear: '1y',
          custom: 'all',
        }

        const timeRange = dateRange.preset ? timeRangeMap[dateRange.preset] || 'all' : 'all'
        params.set('timeRange', timeRange)

        if (dateRange.startDate) {
          params.set('startDate', dateRange.startDate.toISOString())
        }
        if (dateRange.endDate) {
          params.set('endDate', dateRange.endDate.toISOString())
        }

        console.log('[Overview] Fetching data with params:', {
          preset: dateRange.preset,
          timeRange,
          startDate: dateRange.startDate?.toISOString(),
          endDate: dateRange.endDate?.toISOString(),
          url: `/api/analytics/dashboard?${params.toString()}`,
        })

        const response = await fetch(`/api/analytics/dashboard?${params.toString()}`)
        if (!response.ok) throw new Error('Failed to fetch overview data')

        const data = await response.json()
        console.log('[Overview] Received data:', {
          totalRevenue: data.kpiMetrics?.totalRevenue,
          transactionCount: data.kpiMetrics?.transactionCount,
          chartDataPoints: data.chartData?.length,
        })

        setOverviewData({
          chartData: data.chartData || [],
          kpiMetrics: data.kpiMetrics,
          categoryBreakdown: data.categoryBreakdown || [],
        })
      } catch (error) {
        console.error('Error fetching overview data:', error)
        toast.error('Failed to load overview data')
      } finally {
        setIsLoadingOverview(false)
      }
    }

    fetchOverviewData()

    // Auto-refresh every 2 minutes (120000ms) for LIVE data
    const refreshInterval = setInterval(() => {
      console.log('[Overview] Auto-refreshing data...')
      fetchOverviewData()
    }, 120000) // 2 minutes

    return () => clearInterval(refreshInterval)
  }, [dateRange, agency?.id])

  // Fetch Fanvue tab data when model selection or date range changes
  useEffect(() => {
    const fetchModelData = async () => {
      setIsLoadingModelData(true)
      try {
        // Build query params
        const params = new URLSearchParams()
        params.set('agencyId', agency?.id || '')

        // Add modelId ONLY if not 'all'
        if (selectedModelId !== 'all') {
          params.set('modelId', selectedModelId)
        }

        // Map preset to timeRange format
        const timeRangeMap: Record<string, string> = {
          all: 'all',
          today: '7d', // Use 7d for today (will be filtered by startDate/endDate)
          yesterday: '7d',
          last7days: '7d',
          last30days: '30d',
          thisMonth: '30d',
          thisYear: '1y',
          custom: 'all', // For custom, use all and filter by dates
        }

        // Set timeRange (default to 'all' if not set)
        const timeRange = dateRange.preset ? timeRangeMap[dateRange.preset] || 'all' : 'all'
        params.set('timeRange', timeRange)

        // Add date range params for custom filtering
        if (dateRange.startDate) {
          params.set('startDate', dateRange.startDate.toISOString())
        }
        if (dateRange.endDate) {
          params.set('endDate', dateRange.endDate.toISOString())
        }

        const response = await fetch(`/api/analytics/dashboard?${params.toString()}`)
        if (!response.ok) throw new Error('Failed to fetch model data')

        const data = await response.json()
        setModelChartData(data.chartData || [])
        setModelKPIMetrics(data.kpiMetrics)
        setModelCategoryBreakdown(data.categoryBreakdown || [])
      } catch (error) {
        console.error('Error fetching model data:', error)
        toast.error('Failed to load model data')
      } finally {
        setIsLoadingModelData(false)
      }
    }

    fetchModelData()

    // Auto-refresh every 2 minutes (120000ms) for LIVE data
    const refreshInterval = setInterval(() => {
      console.log('[Fanvue] Auto-refreshing data...')
      fetchModelData()
    }, 120000) // 2 minutes

    return () => clearInterval(refreshInterval)
  }, [selectedModelId, dateRange, agency?.id])

  // Empty KPI metrics for initial load
  const emptyKPIMetrics: KPIMetrics = {
    totalRevenue: 0,
    netRevenue: 0,
    activeSubscribers: 0,
    arpu: 0,
    messageConversionRate: 0,
    ppvConversionRate: 0,
    tipAverage: 0,
    transactionCount: 0,
    revenueGrowth: 0,
    ltv: 0,
    goldenRatio: 0,
    totalMessagesSent: 0,
    totalPPVSent: 0,
    newFans: 0,
    unlockRate: 0,
  }

  // ALWAYS use the dynamically fetched data (ignores stale server-side props)
  const filteredFanvueData = useMemo(() => {
    return {
      chartData: modelChartData,
      kpiMetrics: modelKPIMetrics || emptyKPIMetrics, // Fallback during initial load
      categoryBreakdown: modelCategoryBreakdown,
    }
  }, [modelChartData, modelKPIMetrics, modelCategoryBreakdown])

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

  // Helper to format date range label
  const getDateRangeLabel = () => {
    const presetLabels: Record<string, string> = {
      all: 'All time',
      today: 'Today',
      yesterday: 'Yesterday',
      last7days: 'Last 7 days',
      last30days: 'Last 30 days',
      thisMonth: 'This month',
      thisYear: 'This year',
    }

    if (dateRange.preset === 'custom' && dateRange.startDate && dateRange.endDate) {
      const start = dateRange.startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
      const end = dateRange.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return `${start} – ${end}`
    }

    return presetLabels[dateRange.preset] || 'Last 30 days'
  }

  // ===== DYNAMIC CALCULATIONS (from filtered API data) =====
  // ALWAYS use overviewData (no fallbacks to static data!)
  const totalGrossRevenue = overviewData?.kpiMetrics?.totalRevenue ?? 0
  const totalNetRevenue = overviewData?.kpiMetrics?.netRevenue ?? 0
  const platformFee = totalGrossRevenue - totalNetRevenue
  const afterPlatformFee = totalNetRevenue
  const taxRate = agency?.tax_rate ?? 0.2
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

  // ===== DYNAMIC DATA FROM API (filtered by date range) =====
  // Format revenue + expense data for "Revenue vs Expenses" chart
  // ALWAYS use dynamic overviewData (no static fallbacks!)
  const monthlyData = useMemo(() => {
    console.log('[monthlyData] overviewData:', overviewData)

    // Use dynamic overview data (filtered by date)
    if (overviewData?.chartData && overviewData.chartData.length > 0) {
      console.log('[monthlyData] Using filtered overview data from API')
      return overviewData.chartData.map(point => ({
        month: point.date, // Will be "Jan", "Feb" etc. (already formatted by analytics-engine)
        revenue: point.total || 0,
        expenses: 0, // TODO: Add expense tracking
        subscribers: 0,
        followers: 0,
      }))
    }

    // No fallback - return empty if no data (show loading state in UI)
    console.log('[monthlyData] No data available yet - still loading or no transactions')
    return []
  }, [overviewData])

  // Model performance data from analytics service
  const modelPerformanceData = useMemo(() => {
    if (modelPerformance.length > 0) {
      return modelPerformance.map(m => ({
        name: m.name,
        revenue: m.revenue,
        subscribers: m.subscribers,
      }))
    }
    // Fallback to models table data
    return models.map(m => ({
      name: m.name?.split(' ')[0] || 'Model',
      revenue: Number(m.revenue_total || 0),
      subscribers: Number(m.subscribers_count || 0),
    }))
  }, [modelPerformance, models])

  // Pie chart data for revenue distribution - Lime palette
  const revenueDistribution = useMemo(() => {
    if (revenueBreakdown.length > 0) {
      const colors = ['#a3e635', '#84cc16', '#65a30d', '#4d7c0f', '#3f6212']
      return revenueBreakdown.map((item, i) => ({
        name: item.name,
        value: item.value,
        fill: colors[i % colors.length],
      }))
    }
    // Fallback: distribution by model
    if (models.length === 0) return []
    const colors = ['#a3e635', '#84cc16', '#65a30d', '#4d7c0f', '#3f6212']
    return models.map((m, i) => ({
      name: m.name || 'Unknown',
      value: Number(m.revenue_total || 0),
      fill: colors[i % colors.length],
    }))
  }, [revenueBreakdown, models])

  const formatCurrency = (amount: number, showCents = false) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: agency?.currency || 'USD',
      minimumFractionDigits: showCents ? 2 : 0,
      maximumFractionDigits: showCents ? 2 : 0,
    }).format(amount)
  }

  const profitMargin =
    totalGrossRevenue > 0 ? ((netProfit / totalGrossRevenue) * 100).toFixed(1) : '0'

  // Get transaction count from overview data (filtered by date)
  const totalTransactions = overviewData?.kpiMetrics?.transactionCount ?? 0

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
        <div className="flex items-center gap-3">
          <DateRangeFilter
            value={dateRange}
            onChange={setDateRange}
            className="border-primary/20"
          />
          <SyncButton />
          <Button onClick={handleAddModel} className="gap-2 shadow-lg hover-lift">
            <Plus className="w-4 h-4" />
            Add Model
          </Button>
        </div>
      </div>

      {/* Unified Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-primary data-[state=active]:text-black"
          >
            📊 Overview
          </TabsTrigger>
          <TabsTrigger
            value="fanvue"
            className="data-[state=active]:bg-primary data-[state=active]:text-black"
          >
            💰 Fanvue & Finance
          </TabsTrigger>
          <TabsTrigger
            value="social"
            className="data-[state=active]:bg-primary data-[state=active]:text-black"
          >
            👻 Social Media
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-0">
          {/* Date Range Filter for Overview */}
          <div className="flex justify-end mb-4">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>

          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Gross Revenue */}
            <Card className="glass border-primary/20 card-interactive">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(totalGrossRevenue)}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3 text-primary" />
                  <span className="text-xs text-primary/80">All-time from Fanvue</span>
                </div>
              </CardContent>
            </Card>

            {/* Net Profit */}
            <Card className="glass border-green-500/20 card-interactive">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <PiggyBank className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">{formatCurrency(netProfit)}</div>
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
                  <span className="text-xs text-muted-foreground">
                    {totalFollowers.toLocaleString()} followers
                  </span>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {xpCount}/{nextLevelXp} XP
                  </p>
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
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Revenue vs Expenses
                </CardTitle>
                <CardDescription>Monthly financial overview</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={revenueChartConfig} className="h-[250px] w-full">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a3e635" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a3e635" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      className="text-xs"
                      stroke={CHART_THEME.stroke}
                      tick={CHART_THEME.tick}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={value => `$${(value / 1000).toFixed(0)}k`}
                      stroke={CHART_THEME.stroke}
                      tick={CHART_THEME.tick}
                      className="text-xs"
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#a3e635"
                      strokeWidth={2}
                      fill="url(#colorRevenue)"
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="#f87171"
                      strokeWidth={2}
                      fill="url(#colorExpenses)"
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Subscriber Growth Line Chart - Now with 2 lines: Subscribers & Followers */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-400" />
                  Audience Growth
                </CardTitle>
                <CardDescription>Subscribers & followers over time</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingOverview ? (
                  <div className="h-[250px] flex items-center justify-center">
                    <div className="text-muted-foreground">Loading audience data...</div>
                  </div>
                ) : overviewData?.chartData && overviewData.chartData.length > 0 ? (
                  <ChartContainer config={subscriberChartConfig} className="h-[250px] w-full">
                    <LineChart
                      data={overviewData.chartData.map(point => ({
                        date: point.date,
                        subscribers: point.subscribers || 0,
                        followers: point.followers || 0,
                      }))}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        stroke={CHART_THEME.stroke}
                        tick={CHART_THEME.tick}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={value => value.toLocaleString()}
                        stroke={CHART_THEME.stroke}
                        tick={CHART_THEME.tick}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="subscribers"
                        stroke="#2dd4bf"
                        strokeWidth={2}
                        dot={{ fill: '#2dd4bf', strokeWidth: 0 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="followers"
                        stroke="#a3e635"
                        strokeWidth={2}
                        dot={{ fill: '#a3e635', strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <p className="mb-2">No historical audience data yet</p>
                      <p className="text-sm">Data will appear after daily sync runs</p>
                    </div>
                  </div>
                )}
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
                    <BarChart
                      data={modelPerformanceData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        stroke={CHART_THEME.stroke}
                        tick={CHART_THEME.tick}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={value => `$${(value / 1000).toFixed(0)}k`}
                        stroke={CHART_THEME.stroke}
                        tick={CHART_THEME.tick}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="#a3e635" radius={[4, 4, 0, 0]} />
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

          {/* Best Sellers Widget Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {/* Placeholder for future widget - Alfred's Daily Brief */}
              <Card className="glass h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">🤖 Alfred's Daily Brief</CardTitle>
                  <CardDescription>AI-powered insights and recommendations</CardDescription>
                </CardHeader>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p className="text-sm">Coming soon: AI-powered daily briefings</p>
                </CardContent>
              </Card>
            </div>
            <div>
              <BestSellersWidget />
            </div>
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
                  {models.map(model => (
                    <div
                      key={model.id}
                      className="group relative p-4 rounded-xl border border-border hover:border-primary/50 transition-all hover-lift glass cursor-pointer"
                      onClick={() => router.push('/dashboard/creator-management')}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={model.avatar_url || undefined} alt={model.name || ''} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-green-400 text-primary-foreground font-medium">
                            {model.name?.charAt(0) || 'M'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{model.name}</h3>
                          <p className="text-sm text-primary font-medium">
                            {formatCurrency(Number(model.revenue_total || 0))}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant={model.status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
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
                          <div className="font-semibold">
                            {Number(model.subscribers_count || 0).toLocaleString()}
                          </div>
                          <div className="text-muted-foreground">Subs</div>
                        </div>
                        <div>
                          <div className="font-semibold">
                            {Number(model.followers_count || 0).toLocaleString()}
                          </div>
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
                  Connect your first Fanvue creator to start tracking performance and growing your
                  agency.
                </p>
                <Button onClick={handleAddModel} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Your First Model
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Fanvue & Finance Tab */}
        <TabsContent value="fanvue" className="space-y-6 mt-0">
          {/* Model Filter Selector & Date Range Filter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label htmlFor="model-filter" className="text-sm font-medium">
                View Stats For:
              </label>
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger id="model-filter" className="w-[240px]">
                  <SelectValue placeholder="Select a model..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="font-medium">All Models</span>
                    <span className="text-xs text-muted-foreground ml-2">(Agency-wide)</span>
                  </SelectItem>
                  {models.length > 0 && (
                    <>
                      <div className="h-px bg-border my-1" />
                      {models.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center gap-2">
                            <span>{model.name}</span>
                            {model.fanvue_username && (
                              <span className="text-xs text-muted-foreground">
                                @{model.fanvue_username}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              {selectedModelId !== 'all' && selectedModel && (
                <Badge variant="outline" className="gap-1">
                  <Users className="w-3 h-3" />
                  Individual Stats
                </Badge>
              )}
            </div>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>

          {/* Advanced Fanvue Analytics - Revenue Chart & Breakdown */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Revenue Over Time Chart (Takes 4 columns) */}
            <Card className="col-span-4 glass border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Revenue Over Time
                </CardTitle>
                <CardDescription>
                  {getDateRangeLabel()} •{' '}
                  {filteredFanvueData.kpiMetrics.transactionCount.toLocaleString()} transactions
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                {filteredFanvueData.chartData.length > 0 ? (
                  <RevenueChart data={filteredFanvueData.chartData} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-center p-6">
                    <p className="text-muted-foreground mb-2">No revenue data available yet.</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedModelId === 'all'
                        ? 'Sync your Fanvue transactions to see charts.'
                        : 'Individual model filtering requires transaction-level data.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Earnings Breakdown (Takes 3 columns) - Fanvue Style */}
            <Card className="col-span-3 glass border-green-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-green-400" />
                  Earnings by Type
                </CardTitle>
                <CardDescription>Revenue breakdown with transaction counts</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredFanvueData.categoryBreakdown.length > 0 ? (
                  <EarningsBreakdown
                    data={filteredFanvueData.categoryBreakdown}
                    currency={agency?.currency}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-center p-6">
                    <p className="text-muted-foreground mb-2">No earnings data available yet.</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedModelId === 'all'
                        ? 'Sync your Fanvue transactions to see breakdown.'
                        : 'Run a sync to populate transaction data for this model.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(filteredFanvueData.kpiMetrics.totalRevenue)}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {filteredFanvueData.kpiMetrics.revenueGrowth >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-green-400" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-400" />
                  )}
                  <span
                    className={`text-xs ${filteredFanvueData.kpiMetrics.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {filteredFanvueData.kpiMetrics.revenueGrowth >= 0 ? '+' : ''}
                    {filteredFanvueData.kpiMetrics.revenueGrowth}% vs previous period
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-green-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">
                  {formatCurrency(filteredFanvueData.kpiMetrics.netRevenue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">After platform fees</p>
              </CardContent>
            </Card>

            <Card className="glass border-violet-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ARPU</CardTitle>
                <Users className="h-4 w-4 text-violet-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-violet-400">
                  {formatCurrency(filteredFanvueData.kpiMetrics.arpu, true)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Average revenue per user</p>
              </CardContent>
            </Card>

            <Card className="glass border-cyan-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Tip</CardTitle>
                <DollarSign className="h-4 w-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-cyan-400">
                  {formatCurrency(filteredFanvueData.kpiMetrics.tipAverage, true)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Per tip transaction</p>
              </CardContent>
            </Card>
          </div>

          {/* New KPI Metrics Row (Competitor Parity) */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="glass border-amber-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">LTV</CardTitle>
                <Trophy className="h-4 w-4 text-amber-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-400">
                  {formatCurrency(filteredFanvueData.kpiMetrics.ltv, true)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Lifetime value</p>
              </CardContent>
            </Card>

            <Card className="glass border-pink-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Golden Ratio</CardTitle>
                <Crown className="h-4 w-4 text-pink-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-pink-400">
                  {filteredFanvueData.kpiMetrics.goldenRatio.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Content monetization</p>
              </CardContent>
            </Card>

            <Card className="glass border-blue-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
                <MessageSquare className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">
                  {filteredFanvueData.kpiMetrics.totalMessagesSent.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Paid messages</p>
              </CardContent>
            </Card>

            <Card className="glass border-purple-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">PPV Sent</CardTitle>
                <Eye className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-400">
                  {filteredFanvueData.kpiMetrics.totalPPVSent.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Posts & PPV</p>
              </CardContent>
            </Card>

            <Card className="glass border-indigo-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Fans</CardTitle>
                <Users className="h-4 w-4 text-indigo-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-400">
                  {filteredFanvueData.kpiMetrics.newFans.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">In period</p>
              </CardContent>
            </Card>

            <Card className="glass border-rose-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unlock Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-rose-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-400">
                  {filteredFanvueData.kpiMetrics.unlockRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">N/A until chat tracking</p>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass border-teal-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-teal-400" />
                  Click to Sub Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-400">0%</div>
                <p className="text-xs text-muted-foreground mt-1">Requires tracking links</p>
              </CardContent>
            </Card>

            <Card className="glass border-blue-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                  Message Purchase Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">
                  {filteredFanvueData.kpiMetrics.messageConversionRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Avg messages bought per sub</p>
              </CardContent>
            </Card>

            <Card className="glass border-purple-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4 text-purple-400" />
                  PPV Purchase Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-400">
                  {filteredFanvueData.kpiMetrics.ppvConversionRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Avg PPV bought per sub</p>
              </CardContent>
            </Card>
          </div>

          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Revenue Analysis
              </CardTitle>
              <CardDescription>Detailed breakdown of your Fanvue financials</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Revenue Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm text-muted-foreground">Gross Revenue</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(totalGrossRevenue)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Platform Fee (20%)</p>
                    <p className="text-2xl font-bold text-red-400">
                      -{formatCurrency(platformFee)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Expenses</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      -{formatCurrency(totalExpenses)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-muted-foreground">Net Profit</p>
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(netProfit)}</p>
                  </div>
                </div>

                {/* Profit Margin */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-green-500/10 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Profit Margin</span>
                    <span className="text-3xl font-bold text-primary">{profitMargin}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full transition-all"
                      style={{ width: `${Math.min(Number(profitMargin), 100)}%` }}
                    />
                  </div>
                </div>

                {/* Tax Info */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Taxes</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {agency?.tax_jurisdiction || 'Unknown'} • {(taxRate * 100).toFixed(0)}% rate
                      </p>
                    </div>
                    <p className="text-xl font-bold text-yellow-400">{formatCurrency(taxes)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* New Fans Analytics Section */}
          <NewFansAnalytics
            newFansCount={filteredFanvueData.kpiMetrics.newFans}
            variation={filteredFanvueData.kpiMetrics.revenueGrowth}
            dateRangeLabel={getDateRangeLabel()}
            className="mt-6"
          />

          {/* Revenue Breakdown by Type */}
          {revenueBreakdown.length > 0 && (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  Revenue Breakdown by Type
                </CardTitle>
                <CardDescription>Distribution of income sources (Last 30 days)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${formatCurrency(value as number)}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {revenueBreakdown.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              ['#a3e635', '#84cc16', '#65a30d', '#4d7c0f', '#3f6212'][index % 5]
                            }
                          />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      {payload[0].name}
                                    </span>
                                    <span className="font-bold text-primary">
                                      {formatCurrency(payload[0].value as number)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Model Performance Comparison */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-violet-500" />
                Model Performance
              </CardTitle>
              <CardDescription>
                Compare revenue and subscribers across your creators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {models.map(model => {
                  const modelRevenue = Number(model.revenue_total || 0)
                  const modelSubs = Number(model.subscribers_count || 0)
                  const revenuePercent =
                    totalGrossRevenue > 0 ? (modelRevenue / totalGrossRevenue) * 100 : 0

                  return (
                    <div
                      key={model.id}
                      className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={model.avatar_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-green-400">
                              {model.name?.charAt(0) || 'M'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{model.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {modelSubs.toLocaleString()} subscribers
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(modelRevenue)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {revenuePercent.toFixed(1)}% of total
                          </p>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full transition-all"
                          style={{ width: `${Math.min(revenuePercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                {models.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No models connected yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Media Tab */}
        <TabsContent value="social" className="space-y-6 mt-0">
          <AggregatedSocialGrid
            models={models.map(m => ({ id: m.id, name: m.name || 'Unknown' }))}
          />

          {/* Traffic Sources Chart */}
          {trafficSources.length > 0 && (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-400" />
                  Traffic Sources
                </CardTitle>
                <CardDescription>Where your visitors come from (Last 30 days)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={trafficSources}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {trafficSources.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              ['#3b82f6', '#a855f7', '#ec4899', '#f59e0b', '#10b981'][index % 5]
                            }
                          />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      {payload[0].name}
                                    </span>
                                    <span className="font-bold text-muted-foreground">
                                      {payload[0].value} visits
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="glass border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-purple-400" />
                Social Media Strategy
              </CardTitle>
              <CardDescription>
                Track your presence across Instagram, TikTok, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <Globe className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold">Total Reach</h3>
                  </div>
                  <p className="text-3xl font-bold text-purple-400">
                    {totalFollowers.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Followers across all platforms
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <p className="text-sm text-muted-foreground">Active Models</p>
                    <p className="text-2xl font-bold">{models.length}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <p className="text-sm text-muted-foreground">Total Posts</p>
                    <p className="text-2xl font-bold">
                      {models.reduce((sum, m) => sum + Number(m.posts_count || 0), 0)}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border bg-gradient-to-r from-blue-500/5 to-purple-500/5">
                  <p className="text-sm font-medium mb-2">💡 Pro Tip</p>
                  <p className="text-sm text-muted-foreground">
                    Use the <strong>Ghost Tracker</strong> feature to monitor competitors and slave
                    accounts without logging in.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => router.push('/dashboard/competitors')}
                  >
                    Open Ghost Tracker →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
