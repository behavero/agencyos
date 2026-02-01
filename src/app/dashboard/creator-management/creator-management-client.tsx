'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Database } from '@/types/database.types'
import { 
  Plus, 
  Search,
  Users, 
  DollarSign, 
  Eye, 
  MoreVertical,
  Shield,
  Loader2,
  Trash2,
  Settings,
  RefreshCw
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Model = Database['public']['Tables']['models']['Row']

interface CreatorManagementClientProps {
  models: Model[]
  agencyId?: string
}

export default function CreatorManagementClient({ models, agencyId }: CreatorManagementClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Connection dialog state
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Handle delete creator
  const handleDeleteCreator = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return

    try {
      const response = await fetch(`/api/creators/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete')
      }

      toast.success(`${name} has been removed`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete creator')
    }
  }

  // Handle refresh stats
  const handleRefreshStats = async (id: string) => {
    toast.info('Refreshing stats... (coming soon)')
    // TODO: Implement real Fanvue API call
  }

  // Handle form submission
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Please enter email and password')
      return
    }

    setIsConnecting(true)

    try {
      const response = await fetch('/api/auth/fanvue/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect')
      }

      toast.success(`🎉 ${data.creator.name} connected successfully!`)
      setShowConnectDialog(false)
      setEmail('')
      setPassword('')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect account')
    } finally {
      setIsConnecting(false)
    }
  }

  const filteredModels = models.filter((model) => {
    const matchesSearch = model.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || model.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creator Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your creators and their settings
          </p>
        </div>
        
        <Button
          onClick={() => setShowConnectDialog(true)}
          className="gap-2 shadow-lg bg-violet-600 hover:bg-violet-700"
        >
          <Plus className="w-4 h-4" />
          Add Creator
        </Button>
      </div>

      {/* Connect Dialog - Email/Password Form */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#00D632] flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-black" fill="currentColor">
                  <path d="M13.5 2L3 7.5v9L13.5 22 24 16.5v-9L13.5 2zM12 17.5l-6-3.5v-4l6 3.5 6-3.5v4l-6 3.5z"/>
                </svg>
              </div>
              <DialogTitle className="text-xl">Connect to Fanvue</DialogTitle>
            </div>
            <DialogDescription>
              Enter your Fanvue creator account credentials
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConnect} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isConnecting}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isConnecting}
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Secure connection. Your credentials are encrypted and never stored on our servers.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isConnecting || !email || !password}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Account'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search creators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-md border border-border bg-background"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Creators Grid */}
      {filteredModels.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Creators Yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Connect your first Fanvue creator account to start managing their content and performance
            </p>
            
            <Button
              onClick={() => setShowConnectDialog(true)}
              className="gap-2 bg-violet-600 hover:bg-violet-700"
            >
              <Plus className="w-4 h-4" />
              Add Your First Creator
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredModels.map((model) => (
            <Card key={model.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={model.avatar_url || undefined} alt={model.name || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {model.name?.[0]?.toUpperCase() || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg truncate">{model.name || 'Unnamed Creator'}</h3>
                        <Badge variant={model.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                          {model.status === 'active' ? '🟢 Active' : '⚫ Inactive'}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRefreshStats(model.id)}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh Stats
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteCreator(model.id, model.name || 'Creator')}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center mt-6">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Eye className="w-3 h-3" />
                      <span className="text-xs">Views</span>
                    </div>
                    <p className="font-semibold">0</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Users className="w-3 h-3" />
                      <span className="text-xs">Subs</span>
                    </div>
                    <p className="font-semibold">0</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <DollarSign className="w-3 h-3" />
                      <span className="text-xs">Revenue</span>
                    </div>
                    <p className="font-semibold">$0</p>
                  </div>
                </div>
                
                <Button className="w-full mt-4" variant="outline">
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
