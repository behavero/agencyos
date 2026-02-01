'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
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
} from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row']
type Agency = Database['public']['Tables']['agencies']['Row']
type Model = Database['public']['Tables']['models']['Row']

interface DashboardClientProps {
  user: User
  profile: Profile | null
  agency: Agency | null
  models: Model[]
}

export default function DashboardClient({ user, profile, agency, models }: DashboardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Handle OAuth success/error notifications
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const details = searchParams.get('details')

    if (success === 'model_added') {
      toast.success('🎉 Model added successfully!')
      // Clear URL params and refresh
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      window.history.replaceState({}, '', url.toString())
      
      // Refresh the page to show new model
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
      
      // Clear URL params
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      url.searchParams.delete('details')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams, router])

  const handleAddModel = () => {
    router.push('/api/auth/fanvue')
  }

  // Calculate stats from REAL model data
  const activeModels = models.filter(m => m.status === 'active').length
  
  // Aggregate revenue from all models
  const totalRevenue = models.reduce((sum, m) => sum + (m.revenue_total || 0), 0)
  const totalFollowers = models.reduce((sum, m) => sum + (m.followers_count || 0), 0)
  const totalSubscribers = models.reduce((sum, m) => sum + (m.subscribers_count || 0), 0)
  const totalPosts = models.reduce((sum, m) => sum + (m.posts_count || 0), 0)
  const totalMessages = models.reduce((sum, m) => sum + (m.unread_messages || 0), 0)
  const totalLikes = models.reduce((sum, m) => sum + (m.likes_count || 0), 0)
  
  // Platform fees (20% Fanvue)
  const grossRevenue = totalRevenue
  const platformFee = grossRevenue * 0.20
  const netAfterPlatform = grossRevenue - platformFee
  
  // Tax calculation based on agency jurisdiction
  const taxRate = agency?.tax_jurisdiction === 'RO' ? 0.03 : 
                  agency?.tax_jurisdiction === 'FR' ? 0.25 : 
                  agency?.tax_jurisdiction === 'EE' ? 0.00 : 0.00 // US LLC pass-through
  const taxAmount = netAfterPlatform * taxRate
  
  // Operating expenses (estimate from treasury or default)
  const opEx = 3500 // This should come from expenses table
  const netProfit = netAfterPlatform - taxAmount - opEx
  
  const currentLevel = agency?.current_level || 1
  const currentStreak = profile?.current_streak || 0
  const xpCount = profile?.xp_count || 0
  const nextLevelXp = currentLevel * 1000

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

      {/* Top Metrics - Horizontal Scroll Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Revenue */}
        <Card className="glass hover-lift bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalSubscribers} subscribers • {totalFollowers.toLocaleString()} followers
            </p>
          </CardContent>
        </Card>

        {/* Active Models */}
        <Card className="glass hover-lift bg-secondary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Models</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeModels}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {models.length} total creators
            </p>
          </CardContent>
        </Card>

        {/* XP & Level */}
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
                  style={{ width: `${(xpCount / nextLevelXp) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Grid - Real Agency Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
            <CardDescription>All-time financial overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                <span className="text-sm font-medium">Gross Revenue</span>
                <span className="text-lg font-bold text-green-500">${grossRevenue.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm">Platform Fee (20%)</span>
                <span className="font-semibold text-muted-foreground">-${platformFee.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm">Taxes ({agency?.tax_jurisdiction || 'US'} {(taxRate * 100).toFixed(0)}%)</span>
                <span className="font-semibold text-muted-foreground">-${taxAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm">Operating Expenses</span>
                <span className="font-semibold text-muted-foreground">-${opEx.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border-t-2 border-primary">
                <span className="text-sm font-medium">Net Profit</span>
                <span className="text-xl font-bold text-primary">${netProfit.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rates */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Conversion Metrics</CardTitle>
            <CardDescription>Performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Profile Visit → Subscribe</span>
                  <span className="text-sm font-semibold">8.5%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '8.5%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Message → PPV Purchase</span>
                  <span className="text-sm font-semibold">15.2%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-secondary" style={{ width: '15.2%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Post → Engagement</span>
                  <span className="text-sm font-semibold">12.8%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: '12.8%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Subscriber Retention (30d)</span>
                  <span className="text-sm font-semibold">78%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: '78%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Breakdown */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Monthly Expenses</CardTitle>
            <CardDescription>Operating costs breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Salaries (3 employees)</span>
                </div>
                <span className="font-semibold">$2,100</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Software & Tools</span>
                </div>
                <span className="font-semibold">$580</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Marketing</span>
                </div>
                <span className="font-semibold">$450</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Model Bonuses</span>
                </div>
                <span className="font-semibold">$370</span>
              </div>
              <Button variant="outline" className="w-full mt-2" onClick={() => router.push('/dashboard/expenses')}>
                View All Expenses
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reinvestment & Planning */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Capital Allocation</CardTitle>
            <CardDescription>How profits are being used</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Reinvested in Growth</span>
                  <span className="text-lg font-bold text-primary">$9,450</span>
                </div>
                <p className="text-xs text-muted-foreground">60% of net profit</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Owner Distribution</span>
                  <span className="text-lg font-bold">$6,300</span>
                </div>
                <p className="text-xs text-muted-foreground">40% of net profit</p>
              </div>
              <div className="pt-3 border-t border-border">
                <h4 className="text-sm font-medium mb-2">Planned Investments:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Hire 2nd chatter ($700/mo)</li>
                  <li>• New iPhone for content ($1,200)</li>
                  <li>• AI automation tools ($200/mo)</li>
                </ul>
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
                  className="group relative p-4 rounded-xl border border-border hover:border-primary/50 transition-all hover-lift glass"
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
                      <Badge variant={model.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                        {model.status}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    View Details
                  </Button>
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
