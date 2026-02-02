'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Mail, Copy, Check, Trash2, Clock, UserPlus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Invitation {
  id: string
  email: string
  role: string
  token: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  created_at: string
  expires_at: string
}

export default function InviteClient() {
  const { toast } = useToast()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  
  // Form state
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string>('chatter')

  useEffect(() => {
    fetchInvitations()
  }, [])

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/invitations')
      const data = await response.json()
      setInvitations(data.invitations || [])
    } catch (error) {
      console.error('Failed to fetch invitations:', error)
    }
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !role) {
      toast({ title: 'Please fill all fields', variant: 'destructive' })
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }
      
      toast({ title: `Invitation sent to ${email}!` })
      
      // Copy magic link to clipboard
      if (data.magic_link) {
        await navigator.clipboard.writeText(data.magic_link)
        toast({ title: 'Magic link copied to clipboard!' })
      }
      
      // Reset form
      setEmail('')
      setRole('chatter')
      fetchInvitations()
    } catch (error: any) {
      toast({ title: error.message || 'Failed to send invitation', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const copyMagicLink = async (token: string) => {
    const baseUrl = window.location.origin
    const magicLink = `${baseUrl}/join?token=${token}`
    
    await navigator.clipboard.writeText(magicLink)
    setCopiedToken(token)
    toast({ title: 'Magic link copied!' })
    
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const revokeInvitation = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return
    
    try {
      const response = await fetch(`/api/invitations?id=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) throw new Error()
      
      toast({ title: 'Invitation revoked' })
      fetchInvitations()
    } catch (error) {
      toast({ title: 'Failed to revoke invitation', variant: 'destructive' })
    }
  }

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date()
    
    if (isExpired && status === 'pending') {
      return <Badge variant="outline" className="text-red-500 border-red-500">Expired</Badge>
    }
    
    switch (status) {
      case 'accepted':
        return <Badge variant="default" className="bg-green-600">Accepted</Badge>
      case 'pending':
        return <Badge variant="outline" className="text-amber-500 border-amber-500">Pending</Badge>
      case 'revoked':
        return <Badge variant="outline" className="text-zinc-500 border-zinc-500">Revoked</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Send Invite Form */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Send Invitation
          </CardTitle>
          <CardDescription>
            Enter email and role to generate a secure magic link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="sarah@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chatter">Chatter</SelectItem>
                    <SelectItem value="smm">Social Media Manager</SelectItem>
                    <SelectItem value="recruiter">Recruiter</SelectItem>
                    <SelectItem value="alchemist">Alchemist (Content)</SelectItem>
                    <SelectItem value="ranger">Ranger (Marketing)</SelectItem>
                    <SelectItem value="rogue">Rogue (Sales)</SelectItem>
                    <SelectItem value="paladin">Paladin (COO)</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-black">
              <Mail className="w-4 h-4 mr-2" />
              {loading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Invitations Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Recent Invitations</CardTitle>
          <CardDescription>Manage pending and accepted invitations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                <TableHead className="text-zinc-400">Email</TableHead>
                <TableHead className="text-zinc-400">Role</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400">Expires</TableHead>
                <TableHead className="text-zinc-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invite) => (
                <TableRow key={invite.id} className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableCell className="text-white font-medium">{invite.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {invite.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(invite.status, invite.expires_at)}</TableCell>
                  <TableCell className="text-zinc-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {invite.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyMagicLink(invite.token)}
                          >
                            {copiedToken === invite.token ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revokeInvitation(invite.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {invitations.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              No invitations sent yet. Send your first invitation above!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
