'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { ChartDataPoint, KPIMetrics, CategoryBreakdown } from '@/lib/services/analytics-engine'
import {
  DollarSign,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw,
  Download,
  Calendar,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Profile = Database['public']['Tables']['profiles']['Row']
type Agency = Database['public']['Tables']['agencies']['Row']
type Model = { id: string; name: string; avatar_url: string | null; status: string }

interface FinancialAnalyticsClientProps {
  user: User
  profile: Profile | null
  agency: Agency | null
  models: Model[]
  initialChartData: ChartDataPoint[]
  initialKPIMetrics: KPIMetrics
  initialCategoryBreakdown: CategoryBreakdown[]
}

const CHART_THEME = {
  stroke: '#71717a',
  tick: { fill: '#e4e4e7', fontSize: 12 },
}

const CATEGORY_COLORS: Record<string, string> = {
  Subscription: '#a3e635', // Lime
  Tip: '#22d3ee', // Cyan
  Message: '#a855f7', // Purple
  Post: '#f59e0b', // Amber
  Renewal: '#10b981', // Emerald
  Referral: '#ec4899', // Pink
  Other: '#6b7280', // Gray
}

export default function FinancialAnalyticsClient({
  agency,
  models,
  initialChartData,
  initialKPIMetrics,
  initialCategoryBreakdown,
}: FinancialAnalyticsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSyncing, setIsSyncing] = useState(false)

  // Filters
  const [selectedModel, setSelectedModel] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<string>('30d')

  // Data (initially from server, can be refreshed)
  const [chartData] = useState(initialChartData)
  const [kpiMetrics] = useState(initialKPIMetrics)
  const [categoryBreakdown] = useState(initialCategoryBreakdown)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: agency?.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleFilterChange = () => {
    startTransition(() => {
      // Build query params
      const params = new URLSearchParams()
      if (selectedModel !== 'all') params.set('modelId', selectedModel)
      if (timeRange !== '30d') params.set('timeRange', timeRange)

      // Refresh with new filters
      router.push(`/dashboard/finance/analytics?${params.toString()}`)
    })
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch('/api/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: selectedModel !== 'all' ? selectedModel : undefined,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Synced ${result.transactionsSynced} transactions!`)
        router.refresh()
      } else {
        toast.error(result.error || 'Sync failed')
      }
    } catch (error) {
      toast.error('Failed to sync transactions')
    } finally {
      setIsSyncing(false)
    }
  }

  const chartConfig = {
    subscriptions: { label: 'Subscriptions', color: CATEGORY_COLORS.Subscription },
    tips: { label: 'Tips', color: CATEGORY_COLORS.Tip },
    messages: { label: 'Messages', color: CATEGORY_COLORS.Message },
    posts: { label: 'Posts', color: CATEGORY_COLORS.Post },
  } satisfies ChartConfig

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Detailed revenue breakdown and insights powered by real Fanvue data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSync} disabled={isSyncing} variant="outline" className="gap-2">
            <RefreshCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Model Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  {models.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={model.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {model.name?.charAt(0) || 'M'}
                          </AvatarFallback>
                        </Avatar>
                        {model.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Apply Button */}
            <div className="flex items-end">
              <Button onClick={handleFilterChange} disabled={isPending} className="w-full">
                <Calendar className="w-4 h-4 mr-2" />
                {isPending ? 'Loading...' : 'Apply Filters'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="glass border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(kpiMetrics.totalRevenue)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {kpiMetrics.revenueGrowth >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-400" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-400" />
              )}
              <span
                className={`text-xs ${kpiMetrics.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                {kpiMetrics.revenueGrowth >= 0 ? '+' : ''}
                {kpiMetrics.revenueGrowth}% vs previous period
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Net Revenue */}
        <Card className="glass border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(kpiMetrics.netRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">After platform fees</p>
          </CardContent>
        </Card>

        {/* ARPU */}
        <Card className="glass border-violet-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARPU</CardTitle>
            <Users className="h-4 w-4 text-violet-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-400">
              {formatCurrency(kpiMetrics.arpu)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average revenue per user</p>
          </CardContent>
        </Card>

        {/* Transaction Count */}
        <Card className="glass border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {kpiMetrics.transactionCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {formatCurrency(kpiMetrics.tipAverage)} per tip
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Revenue Distribution</CardTitle>
            <CardDescription>Breakdown by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="amount"
                    label={(props: any) => {
                      const entry = categoryBreakdown.find(e => e.category === props.name)
                      return entry ? `${entry.category}: ${entry.percentage}%` : ''
                    }}
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[entry.category] || '#6b7280'}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid gap-2">
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {data.category}
                                </span>
                                <span className="font-bold text-primary">
                                  {formatCurrency(data.amount)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {data.transactionCount} transactions
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

        {/* Category List */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Earnings by Type</CardTitle>
            <CardDescription>Detailed breakdown with transaction counts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryBreakdown.map(category => (
              <div key={category.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[category.category] }}
                    />
                    <span className="font-medium">{category.category}</span>
                    <span className="text-xs text-muted-foreground">
                      ({category.transactionCount})
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{formatCurrency(category.amount)}</div>
                    <div className="text-xs text-muted-foreground">{category.percentage}%</div>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${category.percentage}%`,
                      backgroundColor: CATEGORY_COLORS[category.category],
                    }}
                  />
                </div>
              </div>
            ))}
            {categoryBreakdown.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No transactions found for the selected filters.</p>
                <Button onClick={handleSync} variant="outline" className="mt-4">
                  Sync Transactions
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Revenue Trend
          </CardTitle>
          <CardDescription>Daily revenue breakdown by category</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
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
                tickFormatter={value => `$${(value / 1000).toFixed(0)}k`}
                stroke={CHART_THEME.stroke}
                tick={CHART_THEME.tick}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="subscriptions" stackId="a" fill={CATEGORY_COLORS.Subscription} />
              <Bar dataKey="tips" stackId="a" fill={CATEGORY_COLORS.Tip} />
              <Bar dataKey="messages" stackId="a" fill={CATEGORY_COLORS.Message} />
              <Bar dataKey="posts" stackId="a" fill={CATEGORY_COLORS.Post} />
            </BarChart>
          </ChartContainer>
          {chartData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No chart data available for the selected filters.</p>
              <Button onClick={handleSync} variant="outline" className="mt-4">
                Sync Transactions
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
