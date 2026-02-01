'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import {
  TrendingUp,
  Users,
  DollarSign,
  Zap,
  Target,
  Trophy,
  Flame,
  Crown,
  ArrowUpRight,
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
  const supabase = createClient()

  const handleAddModel = () => {
    router.push('/api/auth/fanvue')
  }

  // Calculate stats
  const revenueGrowth = '+11% vs last month'
  const activeModels = models.filter(m => m.status === 'active').length
  const totalEarnings = agency?.treasury_balance || 0
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
        {/* Revenue (Monthly) */}
        <Card className="glass hover-lift bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,980,130</div>
            <Badge className="mt-2 bg-accent text-accent-foreground">
              +11% Week
            </Badge>
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

      {/* Interaction History - Like Salesforce Design */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Interaction History</CardTitle>
              <CardDescription>Recent deals and opportunities</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Target className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Blue Card */}
            <div className="relative p-4 rounded-2xl bg-primary text-primary-foreground shadow-lg overflow-hidden group hover-lift">
              <div className="absolute top-2 right-2">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-primary-foreground/80">
                  ⋯
                </Button>
              </div>
              <div className="space-y-1 mb-4">
                <p className="text-xs opacity-80">Oct 4</p>
                <p className="font-medium">Royal Package Opportunity</p>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold">11,250$</p>
                <div className="flex -space-x-2">
                  <Avatar className="w-6 h-6 border-2 border-primary">
                    <AvatarFallback className="text-[10px]">JD</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-6 h-6 border-2 border-primary">
                    <AvatarFallback className="text-[10px]">AB</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-6 h-6 border-2 border-primary">
                    <AvatarFallback className="text-[10px]">CD</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>

            {/* Teal Card */}
            <div className="relative p-4 rounded-2xl bg-secondary text-secondary-foreground shadow-lg overflow-hidden group hover-lift">
              <div className="absolute top-2 right-2">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-secondary-foreground/80">
                  ⋯
                </Button>
              </div>
              <div className="space-y-1 mb-4">
                <p className="text-xs opacity-80">Oct 16</p>
                <p className="font-medium">Third Deal Most Useful</p>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold">21,300$</p>
                <div className="flex -space-x-2">
                  <Avatar className="w-6 h-6 border-2 border-secondary">
                    <AvatarFallback className="text-[10px]">EF</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-6 h-6 border-2 border-secondary">
                    <AvatarFallback className="text-[10px]">GH</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-6 h-6 border-2 border-secondary">
                    <AvatarFallback className="text-[10px]">IJ</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>

            {/* Dark Card */}
            <div className="relative p-4 rounded-2xl bg-foreground text-background shadow-lg overflow-hidden group hover-lift">
              <div className="absolute top-2 right-2">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-background/80">
                  ⋯
                </Button>
              </div>
              <div className="space-y-1 mb-4">
                <p className="text-xs opacity-80">Oct 12</p>
                <p className="font-medium">Absolute Success Deal</p>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold">2,100$</p>
                <div className="flex -space-x-2">
                  <Avatar className="w-6 h-6 border-2 border-foreground">
                    <AvatarFallback className="text-[10px]">KL</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-6 h-6 border-2 border-foreground">
                    <AvatarFallback className="text-[10px]">MN</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-6 h-6 border-2 border-foreground">
                    <AvatarFallback className="text-[10px]">OP</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Yellow Card */}
            <div className="relative p-4 rounded-2xl bg-accent text-accent-foreground shadow-lg overflow-hidden group hover-lift">
              <div className="absolute top-2 right-2">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-accent-foreground/80">
                  ⋯
                </Button>
              </div>
              <div className="space-y-1 mb-4">
                <p className="text-xs opacity-70">Oct 11</p>
                <p className="font-medium">Royal Package Opportunity</p>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold">4,160$</p>
                <div className="flex -space-x-2">
                  <Avatar className="w-6 h-6 border-2 border-accent">
                    <AvatarFallback className="text-[10px]">QR</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-6 h-6 border-2 border-accent">
                    <AvatarFallback className="text-[10px]">ST</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>

            {/* Light Gray Card */}
            <div className="relative p-4 rounded-2xl bg-muted text-muted-foreground shadow-sm overflow-hidden group hover-lift">
              <div className="absolute top-2 right-2">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  ⋯
                </Button>
              </div>
              <div className="space-y-1 mb-4">
                <p className="text-xs opacity-70">Oct 2</p>
                <p className="font-medium">Adaptive Business Services</p>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold">3,140$</p>
                <div className="flex -space-x-2">
                  <Avatar className="w-6 h-6 border-2 border-muted">
                    <AvatarFallback className="text-[10px]">UV</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-6 h-6 border-2 border-muted">
                    <AvatarFallback className="text-[10px]">WX</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>

            {/* Another Light Card */}
            <div className="relative p-4 rounded-2xl bg-muted text-muted-foreground shadow-sm overflow-hidden group hover-lift">
              <div className="absolute top-2 right-2">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  ⋯
                </Button>
              </div>
              <div className="space-y-1 mb-4">
                <p className="text-xs opacity-70">Oct 2</p>
                <p className="font-medium">Second deal - Common Service</p>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold">12,350$</p>
                <div className="flex -space-x-2">
                  <Avatar className="w-6 h-6 border-2 border-muted">
                    <AvatarFallback className="text-[10px]">YZ</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-6 h-6 border-2 border-muted">
                    <AvatarFallback className="text-[10px]">AB</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-6 h-6 border-2 border-muted">
                    <AvatarFallback className="text-[10px]">CD</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
