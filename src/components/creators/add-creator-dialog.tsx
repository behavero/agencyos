'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plus, Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ConnectFanvueButton } from './connect-fanvue-button'
import { Separator } from '@/components/ui/separator'

interface AddCreatorDialogProps {
  agencyId: string
}

export function AddCreatorDialog({ agencyId }: AddCreatorDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    fanvue_username: '',
    avatar_file: null as File | null,
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB')
        return
      }

      setFormData({ ...formData, avatar_file: file })

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Please enter a display name')
      return
    }

    setIsSubmitting(true)

    try {
      // If avatar file exists, upload to Vercel Blob first
      let avatar_url = null

      if (formData.avatar_file) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', formData.avatar_file)

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload avatar')
        }

        const uploadData = await uploadResponse.json()
        avatar_url = uploadData.url
      }

      // Create creator
      const response = await fetch('/api/creators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          fanvue_username: formData.fanvue_username.replace('@', '').trim() || null,
          avatar_url,
          agency_id: agencyId,
          status: 'active',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create creator')
      }

      const result = await response.json()

      toast.success(`${formData.name} has been added!`)

      // Reset form
      setFormData({
        name: '',
        fanvue_username: '',
        avatar_file: null,
      })
      setAvatarPreview(null)
      setOpen(false)

      // Refresh the page to show new creator
      router.refresh()

      // Optionally navigate to the new creator's detail page
      if (result.id) {
        router.push(`/dashboard/creator-management/${result.id}`)
      }
    } catch (error: any) {
      console.error('Create creator error:', error)
      toast.error(error.message || 'Failed to create creator')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg bg-violet-600 hover:bg-violet-700">
          <Plus className="w-4 h-4" />
          Add Creator
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Creator</DialogTitle>
            <DialogDescription>Create a new creator profile for your agency</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* OAuth Connect Option */}
            <div className="space-y-4">
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
                <h4 className="text-sm font-medium mb-2">✨ Recommended: Connect via Fanvue</h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Securely connect your Fanvue creator account to automatically import profile data,
                  earnings, and enable real-time sync.
                </p>
                <ConnectFanvueButton variant="default" size="sm" className="w-full" />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or add manually</span>
                </div>
              </div>
            </div>
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-24 h-24 border-2 border-primary/20">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {formData.name?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Avatar
                </Button>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <p className="text-xs text-muted-foreground">Optional. Max 5MB. JPG, PNG, or GIF.</p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Display Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Lana Valentine"
                required
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                The internal name for this creator (visible to your team)
              </p>
            </div>

            {/* Fanvue Username */}
            <div className="space-y-2">
              <Label htmlFor="fanvue_username">Fanvue Username</Label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 rounded-md border border-border bg-muted text-muted-foreground">
                  @
                </span>
                <Input
                  id="fanvue_username"
                  value={formData.fanvue_username}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      fanvue_username: e.target.value.replace('@', ''),
                    })
                  }
                  placeholder="username"
                  className="flex-1"
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Optional. The creator's Fanvue profile username.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Creator
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
