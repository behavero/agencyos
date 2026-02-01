'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Database } from '@/types/database.types'
import { 
  Plus, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Eye, 
  MessageSquare,
  BarChart3,
  Lock,
  FileText,
  Zap,
  Clock,
  Target,
  Award
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

type Model = Database['public']['Tables']['models']['Row']

interface ModelsClientProps {
  models: Model[]
  agencyId?: string
}

export default function ModelsClient({ models, agencyId }: ModelsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [addModelOpen, setAddModelOpen] = useState(false)

  // Handle OAuth success
  useEffect(() => {
    const success = searchParams.get('success')
    if (success === 'model_added') {
      toast.success('🎉 Model connected successfully!')
      setAddModelOpen(false)
      // Clear URL params
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      window.history.replaceState({}, '', url.toString())
      // Refresh
      setTimeout(() => router.refresh(), 1000)
    }
  }, [searchParams, router])

  const handleConnectFanvue = () => {
    // Redirect to Fanvue OAuth
    window.location.href = '/api/auth/fanvue'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM - Creator Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage models, employees, content, and automation
          </p>
        </div>
        
        {/* Add Model Dialog */}
        <Dialog open={addModelOpen} onOpenChange={setAddModelOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg hover-lift">
              <Plus className="w-4 h-4" />
              Add Model
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Model</DialogTitle>
              <DialogDescription>
                Connect a Fanvue creator account to your agency
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Click the button below to authorize a Fanvue account. The creator will need to:
                </p>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                  <li>Log in to their Fanvue account</li>
                  <li>Authorize your agency to access their data</li>
                  <li>Their account will be added to your CRM</li>
                </ol>
              </div>
              
              <Button 
                onClick={handleConnectFanvue} 
                className="w-full gap-2"
                size="lg"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                </svg>
                Connect with Fanvue
              </Button>
              
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Secure OAuth 2.0 authentication • Your data is safe
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="models" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="models" className="gap-2">
            <Users className="w-4 h-4" />
            Models
          </TabsTrigger>
          <TabsTrigger value="employees" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Employee Stats
          </TabsTrigger>
          <TabsTrigger value="vault" className="gap-2">
            <Lock className="w-4 h-4" />
            Vault
          </TabsTrigger>
          <TabsTrigger value="scripts" className="gap-2">
            <FileText className="w-4 h-4" />
            Scripts
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-2">
            <Zap className="w-4 h-4" />
            Automations
          </TabsTrigger>
        </TabsList>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Models</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{models.length}</div>
                <p className="text-xs text-muted-foreground">
                  {models.filter(m => m.status === 'active').length} active
                </p>
              </CardContent>
            </Card>
            <Card className="glass hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$45,231</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  +20.1% from last month
                </p>
              </CardContent>
            </Card>
            <Card className="glass hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
                <Eye className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,350</div>
                <p className="text-xs text-muted-foreground">
                  +180 this month
                </p>
              </CardContent>
            </Card>
            <Card className="glass hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">573</div>
                <p className="text-xs text-muted-foreground">
                  Pending responses
                </p>
              </CardContent>
            </Card>
          </div>

          {models.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {models.map((model) => (
                <Card key={model.id} className="glass hover-lift group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-14 h-14">
                          <AvatarImage src={model.avatar_url || undefined} alt={model.name || ''} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-lg">
                            {model.name?.charAt(0) || 'M'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{model.name}</CardTitle>
                          <Badge variant={model.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                            {model.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Revenue</p>
                          <p className="font-semibold">$12.5K</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Subs</p>
                          <p className="font-semibold">850</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Posts</p>
                          <p className="font-semibold">42</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button className="flex-1" variant="outline" size="sm">
                          View Details
                        </Button>
                        <Button className="flex-1" size="sm">
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Chat
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="glass">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Models Yet</h3>
                <p className="text-muted-foreground mb-4 max-w-sm">
                  Connect your first Fanvue creator to start tracking performance.
                </p>
                <Button onClick={() => router.push('/dashboard/crm')} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Your First Model
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Employee Stats Tab */}
        <TabsContent value="employees" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Chatters</CardTitle>
                <MessageSquare className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">
                  Online now
                </p>
              </CardContent>
            </Card>
            <Card className="glass hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
                <BarChart3 className="w-4 h-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,247</div>
                <p className="text-xs text-muted-foreground">
                  Today
                </p>
              </CardContent>
            </Card>
            <Card className="glass hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="w-4 h-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3.2m</div>
                <p className="text-xs text-muted-foreground">
                  -1.5m from yesterday
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Employee Performance</CardTitle>
              <CardDescription>Individual chatter statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Sarah (Rogue)', messages: 482, revenue: 8450, conversion: 15.2 },
                  { name: 'Mike (Rogue)', messages: 398, revenue: 6200, conversion: 12.8 },
                  { name: 'Emma (Rogue)', messages: 367, revenue: 5890, conversion: 11.5 },
                ].map((employee, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 transition-all">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center text-white font-bold">
                      {employee.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{employee.name}</h3>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{employee.messages} msgs</span>
                        <span>${employee.revenue} revenue</span>
                        <span className="text-primary">{employee.conversion}% conversion</span>
                      </div>
                    </div>
                    <Badge className="bg-primary">
                      <Award className="w-3 h-3 mr-1" />
                      Top Performer
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vault Tab - PPV Media Library */}
        <TabsContent value="vault" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Media Vault</CardTitle>
              <CardDescription>PPV content library for quick sending</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="relative group">
                    <div className="aspect-square rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
                      <Lock className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="absolute inset-0 rounded-lg bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" className="gap-1">
                        <Eye className="w-3 h-3" />
                        View
                      </Button>
                    </div>
                    <Badge className="absolute top-2 right-2 bg-accent">$25</Badge>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Upload New Media
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scripts Tab */}
        <TabsContent value="scripts" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Chat Scripts</CardTitle>
                  <CardDescription>Quick message templates for chatters</CardDescription>
                </div>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Script
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Welcome Message', category: 'Openers', uses: 247 },
                  { name: 'PPV Offer - Gym Set', category: 'Sales', uses: 89 },
                  { name: 'Price Objection Response', category: 'Objections', uses: 156 },
                  { name: 'High Spender Thank You', category: 'Retention', uses: 42 },
                  { name: 'Custom Request Upsell', category: 'Sales', uses: 67 },
                ].map((script, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 transition-all">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{script.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{script.category}</Badge>
                        <span className="text-xs text-muted-foreground">{script.uses} uses</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automations Tab */}
        <TabsContent value="automations" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Automations</CardTitle>
                  <CardDescription>AI-powered workflows</CardDescription>
                </div>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Automation
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Auto-welcome new subscribers', trigger: 'New subscription', status: 'active', runs: 147 },
                  { name: 'PPV upsell after 3 messages', trigger: 'Message count', status: 'active', runs: 89 },
                  { name: 'Re-engagement for inactive fans', trigger: '7 days no activity', status: 'active', runs: 34 },
                  { name: 'High spender VIP treatment', trigger: 'Spend > $100', status: 'paused', runs: 12 },
                ].map((auto, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 transition-all">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      auto.status === 'active' ? 'bg-green-500/10' : 'bg-muted'
                    }`}>
                      <Zap className={`w-5 h-5 ${
                        auto.status === 'active' ? 'text-green-500' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{auto.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Trigger: {auto.trigger} • {auto.runs} runs
                      </p>
                    </div>
                    <Badge variant={auto.status === 'active' ? 'default' : 'secondary'}>
                      {auto.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
