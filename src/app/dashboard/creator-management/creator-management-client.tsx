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
  Filter
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

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
  const [isConnecting, setIsConnecting] = useState(false)

  // OAuth Popup Handler
  const handleOAuthPopup = async () => {
    setIsConnecting(true)
    
    try {
      console.log('[OAuth DEBUG] Step 1: Fetching OAuth URL from /api/auth/fanvue/url')
      
      // Get the OAuth URL from our API (stores PKCE in cookies)
      const response = await fetch('/api/auth/fanvue/url')
      
      console.log('[OAuth DEBUG] Step 2: Response status:', response.status)
      
      if (!response.ok) {
        throw new Error('Failed to generate OAuth URL')
      }
      
      const data = await response.json()
      console.log('[OAuth DEBUG] Step 3: Received data:', data)
      console.log('[OAuth DEBUG] Step 4: URL value:', data.url)
      console.log('[OAuth DEBUG] Step 5: URL starts with https://auth.fanvue.com?', data.url?.startsWith('https://auth.fanvue.com'))
      
      const { url } = data
      
      if (!url || !url.startsWith('https://auth.fanvue.com')) {
        console.error('[OAuth DEBUG] ❌ CRITICAL: URL is not a Fanvue URL!', url)
        toast.error('Invalid OAuth URL received')
        setIsConnecting(false)
        return
      }
      
      console.log('[OAuth DEBUG] Step 6: ✅ URL is valid Fanvue OAuth URL')
      console.log('[OAuth DEBUG] Step 7: Opening popup with window.open()')
      
      // Popup window dimensions
      const width = 600
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2
      
      // Open Fanvue OAuth directly in popup
      const popup = window.open(
        url, // Direct Fanvue URL, not our API route
        'fanvue-oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
      )
      
      console.log('[OAuth DEBUG] Step 8: Popup opened?', !!popup)
      
      if (!popup) {
        console.error('[OAuth DEBUG] ❌ Popup was blocked!')
        toast.error('Please allow popups for this site')
        setIsConnecting(false)
        return
      }
      
      console.log('[OAuth DEBUG] Step 9: ✅ Popup opened successfully')
      console.log('[OAuth DEBUG] Step 10: Popup location:', popup.location?.href)
      
      // Listen for OAuth completion
      const handleMessage = (event: MessageEvent) => {
        console.log('[OAuth DEBUG] Message received:', event.data)
        
        // Verify origin
        if (event.origin !== window.location.origin) {
          console.log('[OAuth DEBUG] Ignoring message from:', event.origin)
          return
        }
        
        if (event.data.type === 'oauth-success') {
          console.log('[OAuth] Success received from popup')
          popup?.close()
          toast.success('🎉 Creator connected successfully!')
          setIsConnecting(false)
          router.refresh()
        } else if (event.data.type === 'oauth-error') {
          console.error('[OAuth] Error:', event.data.error)
          popup?.close()
          toast.error(event.data.message || 'Failed to connect Fanvue account')
          setIsConnecting(false)
        }
      }
      
      window.addEventListener('message', handleMessage)
      
      // Poll popup to detect manual close
      const pollTimer = setInterval(() => {
        if (popup?.closed) {
          console.log('[OAuth DEBUG] Popup closed by user')
          clearInterval(pollTimer)
          window.removeEventListener('message', handleMessage)
          setIsConnecting(false)
        }
      }, 500)
    } catch (error) {
      console.error('[OAuth DEBUG] ❌ Exception:', error)
      toast.error('Failed to start OAuth flow')
      setIsConnecting(false)
    }
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
        
        {/* OAuth Popup Button */}
        <Button
          onClick={handleOAuthPopup}
          disabled={isConnecting}
          className="gap-2 shadow-lg bg-violet-600 hover:bg-violet-700"
        >
          {isConnecting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add Creator
            </>
          )}
        </Button>
      </div>

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
              onClick={handleOAuthPopup}
              disabled={isConnecting}
              className="gap-2 bg-violet-600 hover:bg-violet-700"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Your First Creator
                </>
              )}
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
