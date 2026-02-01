'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import {
  TrendingUp,
  Users,
  DollarSign,
  Trophy,
  Crown,
  Target,
  Plus,
  Calculator,
  PiggyBank,
  Receipt,
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
  
  // Sum up total revenue from all models (from Fanvue API)
  const totalGrossRevenue = models.reduce((sum, m) => sum + Number(m.revenue_total || 0), 0)
  
  // Platform fee (Fanvue takes 20%)
  const platformFee = totalGrossRevenue * 0.20
  const afterPlatformFee = totalGrossRevenue - platformFee
  
  // Get tax rate from agency settings (default 20%)
  const taxRate = agency?.tax_rate ?? 0.20
  
  // Calculate taxes on profit after expenses
  const profitBeforeTax = afterPlatformFee - totalExpenses
  const taxes = Math.max(0, profitBeforeTax * taxRate)
  
  // NET PROFIT = (Gross - Platform Fee - Expenses) × (1 - Tax Rate)
  const netProfit = Math.max(0, profitBeforeTax - taxes)
  
  // Stats
  const activeModels = models.filter(m => m.status === 'active').length
  const currentLevel = agency?.current_level || 1
  const currentStreak = profile?.current_streak || 0
  const xpCount = profile?.xp_count || 0
  const nextLevelXp = currentLevel * 1000
  const totalFollowers = models.reduce((sum, m) => sum + Number(m.followers_count || 0), 0)
  const totalSubscribers = models.reduce((sum, m) => sum + Number(m.subscribers_count || 0), 0)
  const totalUnreadMessages = models.reduce((sum, m) => sum + Number(m.unread_messages || 0), 0)

  // Tax jurisdiction label
  const taxJurisdictionLabels: Record<string, string> = {
    US: 'US LLC (0%)',
    RO: 'Romania (3% + 8%)',
    EE: 'Estonia (0%/20%)',
    FR: 'France (25%)',
  }
  const taxLabel = taxJurisdictionLabels[agency?.tax_jurisdiction || 'US'] || 'N/A'

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: agency?.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

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

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <Card className="glass hover-lift bg-green-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatCurrency(totalGrossRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total all-time from Fanvue</p>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="glass hover-lift bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <PiggyBank className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(netProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">After fees, expenses & tax</p>
          </CardContent>
        </Card>

        {/* Active Models */}
        <Card className="glass hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Models</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeModels}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalSubscribers.toLocaleString()} subscribers • {totalFollowers.toLocaleString()} followers
            </p>
          </CardContent>
        </Card>

        {/* Agency Level */}
        <Card className="glass hover-lift bg-gradient-to-br from-primary/10 to-secondary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agency Level</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Level {currentLevel}</div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{xpCount} XP</span>
                <span>{nextLevelXp} XP</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                  style={{ width: `${Math.min((xpCount / nextLevelXp) * 100, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown - REAL DATA */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              <CardTitle>Revenue Breakdown</CardTitle>
            </div>
            <CardDescription>Real-time financial calculations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                <span className="text-sm font-medium">Gross Revenue (Fanvue)</span>
                <span className="text-lg font-bold text-green-500">{formatCurrency(totalGrossRevenue)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm">Platform Fee (20%)</span>
                <span className="font-semibold text-red-400">-{formatCurrency(platformFee)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Operating Expenses</span>
                </div>
                <span className="font-semibold text-red-400">-{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Taxes ({(taxRate * 100).toFixed(0)}%)</span>
                  <Badge variant="outline" className="text-xs">{taxLabel}</Badge>
                </div>
                <span className="font-semibold text-red-400">-{formatCurrency(taxes)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border-t-2 border-primary">
                <span className="text-sm font-medium">Net Profit</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(netProfit)}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => router.push('/dashboard/agency-settings')}
              >
                Configure Tax Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Expenses Summary */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-muted-foreground" />
              <CardTitle>Monthly Expenses</CardTitle>
            </div>
            <CardDescription>From your expenses tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="text-4xl font-bold text-muted-foreground mb-2">
                {formatCurrency(totalExpenses)}
              </div>
              <p className="text-sm text-muted-foreground">Total monthly operating costs</p>
            </div>
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Profit Margin</span>
                <span className="font-semibold">
                  {totalGrossRevenue > 0 
                    ? `${((netProfit / totalGrossRevenue) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Expenses / Revenue</span>
                <span className="font-semibold">
                  {totalGrossRevenue > 0 
                    ? `${((totalExpenses / totalGrossRevenue) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4" 
              onClick={() => router.push('/dashboard/expenses')}
            >
              Manage Expenses
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Across all models</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold">{totalFollowers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold">{totalSubscribers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Subscribers</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold">{totalUnreadMessages}</div>
                <p className="text-xs text-muted-foreground">Unread Messages</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold">{models.length}</div>
                <p className="text-xs text-muted-foreground">Total Models</p>
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
                <p className="text-xs text-muted-foreground">Suggested for hiring, equipment, marketing</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Owner Distribution (40%)</span>
                  <span className="text-lg font-bold">{formatCurrency(netProfit * 0.4)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Available for withdrawal</p>
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
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(Number(model.revenue_total || 0))} revenue
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={model.status === 'active' ? 'default' : 'secondary'}>
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
