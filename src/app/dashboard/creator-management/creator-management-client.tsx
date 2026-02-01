'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import type { Database } from '@/types/database.types'
import { 
  Plus, 
  Search,
  Users, 
  TrendingUp, 
  DollarSign, 
  Eye, 
  MoreVertical,
  Filter,
  Upload,
  UserPlus,
  Trash2
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { cn } from '@/lib/utils'

type Model = Database['public']['Tables']['models']['Row']

interface CreatorManagementClientProps {
  models: Model[]
  agencyId?: string
}

export default function CreatorManagementClient({ models, agencyId }: CreatorManagementClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importMode, setImportMode] = useState<'single' | 'bulk'>('single')
  
  // Bulk import state
  const [bulkCreators, setBulkCreators] = useState<Array<{ email: string; password: string }>>([
    { email: '', password: '' }
  ])

  // Simple OAuth redirect (full page - most reliable)
  const handleOAuthRedirect = () => {
    // Just navigate to the OAuth route - it will handle the redirect
    window.location.href = '/api/auth/fanvue'
  }

  // Handle OAuth success/error from URL params (fallback for direct navigation)
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const details = searchParams.get('details')

    if (success === 'model_added') {
      toast.success('🎉 Creator connected successfully!')
      
      // Clear URL params
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      window.history.replaceState({}, '', url.toString())
      
      // Refresh to show new model
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

  // Handle bulk import
  const handleBulkImport = async () => {
    // TODO: Implement bulk import API
    toast.info('Bulk import coming soon! For now, please use Single mode.')
  }
  
  const addBulkRow = () => {
    if (bulkCreators.length < 20) {
      setBulkCreators([...bulkCreators, { email: '', password: '' }])
    }
  }
  
  const removeBulkRow = (index: number) => {
    setBulkCreators(bulkCreators.filter((_, i) => i !== index))
  }
  
  const updateBulkCreator = (index: number, field: 'email' | 'password', value: string) => {
    const updated = [...bulkCreators]
    updated[index][field] = value
    setBulkCreators(updated)
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
        
        {/* Add Creator Button (with mode toggle) */}
        <Button
          onClick={() => setShowImportDialog(true)}
          className="gap-2 shadow-lg bg-violet-600 hover:bg-violet-700"
        >
          <Plus className="w-4 h-4" />
          Add Creator
        </Button>
      </div>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-violet-600" />
              Connect Fanvue Account
            </DialogTitle>
            <DialogDescription>
              Choose how you want to add creators to your agency
            </DialogDescription>
          </DialogHeader>

          {/* Mode Toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setImportMode('single')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-all font-medium",
                importMode === 'single'
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <UserPlus className="w-4 h-4" />
              Single
            </button>
            <button
              onClick={() => setImportMode('bulk')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-all font-medium",
                importMode === 'bulk'
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Upload className="w-4 h-4" />
              Bulk Import
            </button>
          </div>

          {/* Single Mode: OAuth */}
          {importMode === 'single' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-violet-600/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-violet-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Secure OAuth Connection</h4>
                  <p className="text-sm text-muted-foreground">
                    Connect safely through Fanvue's official authorization. Your credentials are encrypted and never stored on our servers.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">How it works:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Click "Connect Account" below</li>
                  <li>A popup will open to Fanvue's login page</li>
                  <li>Log in with your Fanvue creator account</li>
                  <li>Authorize OnyxOS to access your account</li>
                  <li>The popup will close and your creator will be added</li>
                </ol>
              </div>

              <Button
                onClick={() => {
                  setShowImportDialog(false)
                  handleOAuthRedirect()
                }}
                className="w-full gap-2 bg-violet-600 hover:bg-violet-700 h-12"
              >
                <UserPlus className="w-4 h-4" />
                Connect Account
              </Button>
            </div>
          )}

          {/* Bulk Mode: Email/Password (Coming Soon) */}
          {importMode === 'bulk' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="text-2xl">⚠️</div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1 text-amber-600 dark:text-amber-500">
                    Bulk Import Coming Soon
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    We're working on adding bulk import functionality. For now, please use the Single mode to add creators one at a time via OAuth.
                  </p>
                </div>
              </div>

              <div className="opacity-50 pointer-events-none">
                <div className="space-y-2 mb-3">
                  <label className="text-sm font-medium">Fanvue Accounts</label>
                  <p className="text-xs text-muted-foreground">
                    Add up to 20 accounts at once
                  </p>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {bulkCreators.map((creator, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="email@example.com"
                        value={creator.email}
                        onChange={(e) => updateBulkCreator(index, 'email', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="password"
                        placeholder="Password"
                        value={creator.password}
                        onChange={(e) => updateBulkCreator(index, 'password', e.target.value)}
                        className="flex-1"
                      />
                      {bulkCreators.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBulkRow(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={addBulkRow}
                  disabled={bulkCreators.length >= 20}
                  className="w-full mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Row ({bulkCreators.length}/20)
                </Button>

                <Button
                  onClick={handleBulkImport}
                  className="w-full mt-4 bg-violet-600 hover:bg-violet-700"
                  disabled
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import {bulkCreators.length} Account{bulkCreators.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          )}
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

      {/* Creators Grid/Table */}
      {filteredModels.length === 0 ? (
        <Card className="glass border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Creators Yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Connect your first Fanvue creator account to start managing their content and performance
            </p>
            <Button
              onClick={() => setShowImportDialog(true)}
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
            <Card key={model.id} className="glass hover:shadow-lg transition-shadow">
              <CardHeader>
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
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
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
