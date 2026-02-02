'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { Database } from '@/types/database.types'
import { CheckCircle2, Circle, Instagram, Twitter, Save, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type Model = Database['public']['Tables']['models']['Row']

interface SocialConnectorProps {
  modelId: string
  agencyId: string
  model: Model
}

// TikTok SVG Icon Component
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  )
}

function validateHandle(handle: string, platform: string): boolean {
  if (!handle || handle.trim() === '') return false

  // Remove @ if present
  const cleanHandle = handle.replace('@', '').trim()

  // Basic validation - alphanumeric, underscores, dots, max 30 chars
  const regex = /^[a-zA-Z0-9_.]{1,30}$/
  return regex.test(cleanHandle)
}

export function SocialConnector({ modelId, agencyId, model }: SocialConnectorProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [handles, setHandles] = useState({
    instagram: model.instagram_handle || '',
    twitter: model.twitter_handle || '',
    tiktok: model.tiktok_handle || '',
  })

  const [verified, setVerified] = useState({
    instagram: !!model.instagram_handle,
    twitter: !!model.twitter_handle,
    tiktok: !!model.tiktok_handle,
  })

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Clean handles (remove @ if present)
      const cleanedHandles = {
        instagram_handle: handles.instagram.replace('@', '').trim() || null,
        twitter_handle: handles.twitter.replace('@', '').trim() || null,
        tiktok_handle: handles.tiktok.replace('@', '').trim() || null,
      }

      const response = await fetch(`/api/creators/${modelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedHandles),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save social handles')
      }

      // Update verified status
      setVerified({
        instagram: !!cleanedHandles.instagram_handle,
        twitter: !!cleanedHandles.twitter_handle,
        tiktok: !!cleanedHandles.tiktok_handle,
      })

      toast.success('Social handles saved successfully!')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save social handles')
    } finally {
      setIsSaving(false)
    }
  }

  const handleVerify = (platform: 'instagram' | 'twitter' | 'tiktok') => {
    const handle = handles[platform]
    if (validateHandle(handle, platform)) {
      const cleanHandle = handle.replace('@', '').trim()
      let url = ''

      switch (platform) {
        case 'instagram':
          url = `https://instagram.com/${cleanHandle}`
          break
        case 'twitter':
          url = `https://twitter.com/${cleanHandle}`
          break
        case 'tiktok':
          url = `https://tiktok.com/@${cleanHandle}`
          break
      }

      window.open(url, '_blank')
      toast.info(`Opening ${platform} profile...`)
    } else {
      toast.error('Please enter a valid handle first')
    }
  }

  const platforms = [
    {
      id: 'instagram' as const,
      name: 'Instagram',
      icon: Instagram,
      placeholder: 'username',
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/20',
    },
    {
      id: 'twitter' as const,
      name: 'Twitter / X',
      icon: Twitter,
      placeholder: 'username',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      id: 'tiktok' as const,
      name: 'TikTok',
      icon: TikTokIcon,
      placeholder: 'username',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
  ]

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle>Social Media Accounts</CardTitle>
          <CardDescription>
            Connect your social media handles for tracking and analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {platforms.map(platform => {
            const Icon = platform.icon
            const isConnected = verified[platform.id]
            const handle = handles[platform.id]

            return (
              <div
                key={platform.id}
                className={cn(
                  'p-4 rounded-lg border-2 transition-colors',
                  isConnected ? platform.borderColor : 'border-border',
                  isConnected && platform.bgColor
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-lg flex items-center justify-center',
                      platform.bgColor
                    )}
                  >
                    <Icon className={cn('w-6 h-6', platform.color)} />
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{platform.name}</h3>
                        {isConnected ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={cn('gap-1', platform.borderColor, platform.color)}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Connected
                            </Badge>
                            <span className="text-xs text-muted-foreground">@{handle}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="gap-1 mt-1">
                            <Circle className="w-3 h-3" />
                            Not Connected
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor={platform.id} className="sr-only">
                          {platform.name} Handle
                        </Label>
                        <div className="flex gap-2">
                          <span className="flex items-center px-3 rounded-md border border-border bg-muted text-muted-foreground text-sm">
                            @
                          </span>
                          <Input
                            id={platform.id}
                            value={handle}
                            onChange={e =>
                              setHandles({ ...handles, [platform.id]: e.target.value })
                            }
                            placeholder={platform.placeholder}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerify(platform.id)}
                        disabled={!handle}
                        className="gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Verify
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setHandles({
                  instagram: model.instagram_handle || '',
                  twitter: model.twitter_handle || '',
                  tiktok: model.tiktok_handle || '',
                })
                toast.info('Changes discarded')
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Social Tracking Info Card */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm">🎯 Social Tracking Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Monitor account health and shadowban risk</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Track follower growth and engagement metrics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Get recommended posting times and frequency</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Manage multiple accounts (main, backup, slave)</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
