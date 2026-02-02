'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Leaf, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

export default function JoinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [inviteValid, setInviteValid] = useState(false)
  const [inviteData, setInviteData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      validateInvitation(token)
    } else {
      setError('No invitation token provided')
      setValidating(false)
    }
  }, [token])

  const validateInvitation = async (token: string) => {
    try {
      const response = await fetch(`/api/invitations/validate?token=${token}`)
      const data = await response.json()
      
      if (!response.ok || !data.valid) {
        throw new Error(data.error || 'Invalid invitation')
      }
      
      setInviteValid(true)
      setInviteData(data.invitation)
    } catch (err: any) {
      setError(err.message)
      setInviteValid(false)
    } finally {
      setValidating(false)
      setLoading(false)
    }
  }

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }
    
    if (password.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' })
      return
    }
    
    setSubmitting(true)
    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          username,
          password,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation')
      }
      
      toast({ title: 'Account created successfully!' })
      
      // Redirect to login
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } catch (err: any) {
      toast({ title: err.message || 'Failed to create account', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (validating) {
    return (
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-zinc-400">Validating invitation...</p>
        </CardContent>
      </Card>
    )
  }

  if (error || !inviteValid) {
    return (
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <XCircle className="w-6 h-6 text-red-500" />
          </div>
          <CardTitle className="text-white">Invalid Invitation</CardTitle>
          <CardDescription>{error || 'This invitation link is not valid'}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button asChild variant="outline">
            <Link href="/login">Go to Login</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-4">
          <Leaf className="w-6 h-6 text-black" />
        </div>
        <CardTitle className="text-white text-2xl">Join OnyxOS</CardTitle>
        <CardDescription>
          You've been invited to join <strong>{inviteData?.agency_name}</strong> as a{' '}
          <strong className="capitalize">{inviteData?.role}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAcceptInvitation} className="space-y-4">
          {/* Email (read-only) */}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={inviteData?.email || ''}
              disabled
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          {/* Username */}
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
              required
              minLength={3}
              maxLength={50}
            />
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
              required
              minLength={8}
            />
            <p className="text-xs text-zinc-500 mt-1">At least 8 characters</p>
          </div>

          {/* Confirm Password */}
          <div>
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
              required
              minLength={8}
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary/90 text-black"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Accept & Join
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
