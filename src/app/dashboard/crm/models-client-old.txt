'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Database } from '@/types/database.types'
import { 
  Plus, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Eye, 
  MessageSquare,
  ExternalLink,
  Edit2,
  Trash2,
  Link as LinkIcon
} from 'lucide-react'
import { useRouter } from 'next/navigation'

type Model = Database['public']['Tables']['models']['Row']

interface ModelsClientProps {
  models: Model[]
  agencyId?: string
}

export default function ModelsClient({ models, agencyId }: ModelsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Manual Add Form (Fallback)
  const [manualForm, setManualForm] = useState({
    name: '',
    fanvue_api_key: '',
  })

  const handleFanvueOAuth = () => {
    // Redirect to Fanvue OAuth
    router.push('/api/auth/fanvue')
  }

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from('models')
        .insert({
          agency_id: agencyId,
          name: manualForm.name,
          fanvue_api_key: manualForm.fanvue_api_key,
          status: 'active',
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Model added successfully!')
      setIsAddDialogOpen(false)
      setManualForm({ name: '', fanvue_api_key: '' })
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add model')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return

    try {
      const { error } = await supabase
        .from('models')
        .delete()
        .eq('id', modelId)

      if (error) throw error

      toast.success('Model deleted successfully')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete model')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creator Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your Fanvue creators and track their performance
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg hover-lift">
              <Plus className="w-4 h-4" />
              Add Model
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Model</DialogTitle>
              <DialogDescription>
                Connect a Fanvue creator to your agency dashboard
              </DialogDescription>
            </DialogHeader>

            {/* Option 1: OAuth (Recommended) */}
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-border bg-muted/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <LinkIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">One-Click Connect (Recommended)</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Securely connect your Fanvue account with OAuth. No manual API keys needed.
                    </p>
                    <Button 
                      onClick={handleFanvueOAuth} 
                      className="w-full gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Connect with Fanvue
                    </Button>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              {/* Option 2: Manual */}
              <form onSubmit={handleManualAdd} className="space-y-4">
                <div>
                  <Label htmlFor="name">Model Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Lana Valentine"
                    value={manualForm.name}
                    onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="api_key">Fanvue API Key</Label>
                  <Input
                    id="api_key"
                    type="password"
                    placeholder="Enter API key from Fanvue developer settings"
                    value={manualForm.fanvue_api_key}
                    onChange={(e) => setManualForm({ ...manualForm, fanvue_api_key: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Get this from your Fanvue account settings → Developer
                  </p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Adding...' : 'Add Manually'}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Grid */}
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

      {/* Models Grid */}
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
                      <Badge 
                        variant={model.status === 'active' ? 'default' : 'secondary'}
                        className="mt-1"
                      >
                        {model.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(model.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Quick Stats */}
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

                  {/* Actions */}
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
              Connect your first Fanvue creator to start tracking performance and growing your agency.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Model
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
