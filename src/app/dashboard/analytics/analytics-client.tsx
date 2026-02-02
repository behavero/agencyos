'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Target,
  Users,
  DollarSign,
  MousePointer,
  Zap,
  ArrowRight,
  Activity,
  PieChart,
  Lightbulb,
} from 'lucide-react'

interface FunnelStep {
  name: string
  value: number
  percentage: number
  dropOff: number
}

interface Insight {
  type: 'critical' | 'warning' | 'success' | 'info'
  title: string
  description: string
  action?: string
  metric?: string
  value?: number
}

interface AgencyKPIs {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  metaReach: number
  metaProfileViews: number
  metaWebsiteClicks: number
  igConversionRate: number
  bioCTR: number
  trackingLinkClicks: number
  newSubscribers: number
  activeSubscribers: number
  fanConversionRate: number
  arpu: number
  ltv: number
  churnRate: number
  slaveReach: number
  totalEmpireReach: number
  ghostTrafficShare: number
  trends: {
    revenueChange: number
    conversionChange: number
    ctrChange: number
    subscriberChange: number
  }
  healthScores: {
    overall: number
    conversion: number
    engagement: number
    revenue: number
  }
  insights: Insight[]
  funnelData: FunnelStep[]
}

interface AnalyticsClientProps {
  agencyId: string
}

// Format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toFixed(0)
}

// Get trend icon
const TrendIcon = ({ value }: { value: number }) => {
  if (value > 0) return <TrendingUp className="w-4 h-4 text-green-400" />
  if (value < 0) return <TrendingDown className="w-4 h-4 text-red-400" />
  return null
}

// Get insight icon
const InsightIcon = ({ type }: { type: Insight['type'] }) => {
  switch (type) {
    case 'critical':
      return <AlertTriangle className="w-5 h-5 text-red-400" />
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-yellow-400" />
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-400" />
    default:
      return <Info className="w-5 h-5 text-blue-400" />
  }
}

// Health score color
const getHealthColor = (score: number): string => {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

const getHealthBg = (score: number): string => {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-yellow-500'
  if (score >= 40) return 'bg-orange-500'
  return 'bg-red-500'
}

export function AnalyticsClient({ agencyId }: AnalyticsClientProps) {
  const [kpis, setKpis] = useState<AgencyKPIs | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d')

  const fetchKPIs = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/analytics/kpis?range=${dateRange}`)
      if (response.ok) {
        const data = await response.json()
        setKpis(data.kpis)
      } else {
        toast.error('Failed to load analytics')
      }
    } catch (error) {
      console.error('Error fetching KPIs:', error)
      toast.error('Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchKPIs()
  }, [dateRange])

  if (isLoading || !kpis) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Business Intelligence</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-zinc-900 border-zinc-800 animate-pulse">
              <CardContent className="pt-6">
                <div className="h-20 bg-zinc-800 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Business Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            Advanced KPIs and conversion analytics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as '7d' | '30d' | '90d')}>
            <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchKPIs}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Health Score Overview */}
      <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Agency Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Overall */}
            <div className="text-center">
              <div className={`text-4xl font-bold ${getHealthColor(kpis.healthScores.overall)}`}>
                {kpis.healthScores.overall}
              </div>
              <p className="text-sm text-zinc-400 mt-1">Overall Health</p>
              <Progress 
                value={kpis.healthScores.overall} 
                className="h-2 mt-2"
              />
            </div>

            {/* Conversion */}
            <div className="text-center">
              <div className={`text-4xl font-bold ${getHealthColor(kpis.healthScores.conversion)}`}>
                {kpis.healthScores.conversion}
              </div>
              <p className="text-sm text-zinc-400 mt-1">Conversion</p>
              <Progress 
                value={kpis.healthScores.conversion} 
                className="h-2 mt-2"
              />
            </div>

            {/* Engagement */}
            <div className="text-center">
              <div className={`text-4xl font-bold ${getHealthColor(kpis.healthScores.engagement)}`}>
                {kpis.healthScores.engagement}
              </div>
              <p className="text-sm text-zinc-400 mt-1">Engagement</p>
              <Progress 
                value={kpis.healthScores.engagement} 
                className="h-2 mt-2"
              />
            </div>

            {/* Revenue */}
            <div className="text-center">
              <div className={`text-4xl font-bold ${getHealthColor(kpis.healthScores.revenue)}`}>
                {kpis.healthScores.revenue}
              </div>
              <p className="text-sm text-zinc-400 mt-1">Revenue</p>
              <Progress 
                value={kpis.healthScores.revenue} 
                className="h-2 mt-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Profile Conversion */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-zinc-400">Profile Conversion</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {kpis.igConversionRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <TrendIcon value={kpis.trends.conversionChange} />
              <span className={`text-sm ${kpis.trends.conversionChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {kpis.trends.conversionChange >= 0 ? '+' : ''}{kpis.trends.conversionChange.toFixed(1)}%
              </span>
              <span className="text-xs text-zinc-500">vs avg 3%</span>
            </div>
          </CardContent>
        </Card>

        {/* Bio CTR */}
        <Card className={`bg-zinc-900 border-zinc-800 ${kpis.bioCTR < 5 ? 'ring-2 ring-red-500/50' : ''}`}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-zinc-400">Bio CTR</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {kpis.bioCTR.toFixed(1)}%
                </p>
              </div>
              <div className={`p-3 rounded-xl ${kpis.bioCTR < 5 ? 'bg-red-500/10 border border-red-500/30' : 'bg-blue-500/10 border border-blue-500/30'}`}>
                <MousePointer className={`w-5 h-5 ${kpis.bioCTR < 5 ? 'text-red-400' : 'text-blue-400'}`} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <TrendIcon value={kpis.trends.ctrChange} />
              <span className={`text-sm ${kpis.trends.ctrChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {kpis.trends.ctrChange >= 0 ? '+' : ''}{kpis.trends.ctrChange.toFixed(1)}%
              </span>
              {kpis.bioCTR < 5 && (
                <Badge variant="destructive" className="text-xs">CRITICAL</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ARPU */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-zinc-400">ARPU</p>
                <p className="text-3xl font-bold text-white mt-1">
                  ${kpis.arpu.toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm text-zinc-500">
                LTV: ${kpis.ltv.toFixed(0)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Ghost Traffic */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-zinc-400">Ghost Traffic Share</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {kpis.ghostTrafficShare.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                <Zap className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm text-zinc-500">
                {formatNumber(kpis.slaveReach)} slave reach
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            Conversion Funnel
          </CardTitle>
          <CardDescription>
            Track drop-off at each stage of the customer journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {kpis.funnelData.map((step, index) => (
              <div key={step.name} className="flex items-center gap-4 flex-1">
                {/* Funnel Step */}
                <div className="flex-1 text-center">
                  <div 
                    className="mx-auto rounded-xl bg-gradient-to-b from-primary/20 to-primary/5 border border-primary/30 p-4 transition-all hover:border-primary/50"
                    style={{ 
                      width: `${Math.max(30, 100 - (index * 15))}%`,
                      minWidth: '100px'
                    }}
                  >
                    <p className="text-2xl font-bold text-white">
                      {formatNumber(step.value)}
                    </p>
                    <p className="text-sm text-zinc-400 mt-1">{step.name}</p>
                  </div>
                  {index > 0 && step.dropOff > 0 && (
                    <Badge 
                      variant="outline" 
                      className={`mt-2 ${step.dropOff > 80 ? 'text-red-400 border-red-500/30' : 'text-zinc-400'}`}
                    >
                      -{step.dropOff.toFixed(0)}% drop-off
                    </Badge>
                  )}
                </div>

                {/* Arrow */}
                {index < kpis.funnelData.length - 1 && (
                  <ArrowRight className="w-6 h-6 text-zinc-600 shrink-0 hidden md:block" />
                )}
              </div>
            ))}
          </div>

          {/* Funnel Summary */}
          <Separator className="my-6 bg-zinc-800" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{formatNumber(kpis.metaReach)}</p>
              <p className="text-xs text-zinc-500">Total Reach</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{formatNumber(kpis.metaProfileViews)}</p>
              <p className="text-xs text-zinc-500">Profile Views</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{formatNumber(kpis.metaWebsiteClicks)}</p>
              <p className="text-xs text-zinc-500">Link Clicks</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{kpis.newSubscribers}</p>
              <p className="text-xs text-zinc-500">New Subscribers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actionable Insights */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            Actionable Insights
          </CardTitle>
          <CardDescription>
            AI-generated recommendations based on your metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {kpis.insights.map((insight, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border ${
                  insight.type === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                  insight.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                  insight.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
                  'bg-blue-500/10 border-blue-500/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <InsightIcon type={insight.type} />
                  <div className="flex-1">
                    <h4 className="font-semibold text-white flex items-center gap-2">
                      {insight.title}
                      {insight.value !== undefined && (
                        <Badge variant="outline" className="text-xs">
                          {insight.value.toFixed(1)}%
                        </Badge>
                      )}
                    </h4>
                    <p className="text-sm text-zinc-400 mt-1">
                      {insight.description}
                    </p>
                    {insight.action && (
                      <p className="text-sm text-primary mt-2">
                        💡 {insight.action}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Financial Metrics */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Total Revenue</span>
              <span className="text-xl font-bold text-white">${formatNumber(kpis.totalRevenue)}</span>
            </div>
            <Separator className="bg-zinc-800" />
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Total Expenses</span>
              <span className="text-lg text-red-400">-${formatNumber(kpis.totalExpenses)}</span>
            </div>
            <Separator className="bg-zinc-800" />
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Net Profit</span>
              <span className={`text-xl font-bold ${kpis.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${formatNumber(kpis.netProfit)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Profit Margin</span>
              <Badge variant={kpis.profitMargin >= 30 ? 'default' : 'destructive'}>
                {kpis.profitMargin.toFixed(1)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Subscriber Metrics */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Subscriber Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Active Subscribers</span>
              <span className="text-xl font-bold text-white">{kpis.activeSubscribers}</span>
            </div>
            <Separator className="bg-zinc-800" />
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">New This Period</span>
              <span className="text-lg text-green-400">+{kpis.newSubscribers}</span>
            </div>
            <Separator className="bg-zinc-800" />
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Churn Rate</span>
              <Badge variant={kpis.churnRate <= 5 ? 'default' : 'destructive'}>
                {kpis.churnRate}%
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Fan Conversion Rate</span>
              <span className="text-white">{kpis.fanConversionRate.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
