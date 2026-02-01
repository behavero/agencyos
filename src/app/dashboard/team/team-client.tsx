'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Database } from '@/types/database.types'
import { toast } from 'sonner'
import {
  Users,
  UserPlus,
  Crown,
  Sword,
  Sparkles,
  Target,
  Zap,
  MoreHorizontal,
  Shield,
  Calendar,
  Clock,
  Flame,
  Mail,
} from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row']

interface TeamClientProps {
  teamMembers: Profile[]
  agencyId?: string | null
}

const ROLES = [
  { value: 'rogue', label: 'Rogue', description: 'Sales & Chat', icon: Zap, color: 'text-red-400 bg-red-400/10 border-red-400/30' },
  { value: 'ranger', label: 'Ranger', description: 'Marketing', icon: Target, color: 'text-green-400 bg-green-400/10 border-green-400/30' },
  { value: 'alchemist', label: 'Alchemist', description: 'Content', icon: Sparkles, color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
  { value: 'paladin', label: 'Paladin', description: 'Operations', icon: Sword, color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  { value: 'grandmaster', label: 'Grandmaster', description: 'CEO', icon: Crown, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
] as const

const getRoleConfig = (role: string | null) => {
  return ROLES.find(r => r.value === role) || ROLES[0]
}

export default function TeamClient({ teamMembers, agencyId }: TeamClientProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'rogue',
  })

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    toast.success('Invitation sent!')
    setIsInviteOpen(false)
    setInviteForm({ email: '', role: 'rogue' })
  }

  // Calculate team stats
  const totalXp = teamMembers.reduce((sum, m) => sum + (m.xp_count || 0), 0)
  const roleBreakdown = ROLES.map(role => ({
    ...role,
    count: teamMembers.filter(m => m.role === role.value).length,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Team</h1>
          <p className="text-zinc-400">Manage your agency team members</p>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white">Invite Team Member</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Send an invitation to join your agency
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Email Address</Label>
                <Input
                  type="email"
                  placeholder="member@example.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex items-center gap-2">
                          <role.icon className="w-4 h-4" />
                          {role.label} - {role.description}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="gap-2">
                  <Mail className="w-4 h-4" />
                  Send Invite
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="members" className="space-y-6">
        <TabsList className="bg-zinc-900 border border-zinc-800 p-1">
          <TabsTrigger 
            value="members" 
            className="gap-2 data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
          >
            <Users className="w-4 h-4" />
            Members
          </TabsTrigger>
          <TabsTrigger 
            value="schedule"
            className="gap-2 data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
          >
            <Calendar className="w-4 h-4" />
            Schedule
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <Users className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{teamMembers.length}</p>
                    <p className="text-xs text-zinc-500">Total Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {roleBreakdown.slice(0, 4).map((role) => (
              <Card key={role.value} className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${role.color}`}>
                      <role.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{role.count}</p>
                      <p className="text-xs text-zinc-500">{role.label}s</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Team Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers.map((member) => {
              const roleConfig = getRoleConfig(member.role)
              const xpProgress = ((member.xp_count || 0) % 1000) / 10
              
              return (
                <Card 
                  key={member.id} 
                  className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors group"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-zinc-700">
                          <AvatarImage src="" alt={member.username || ''} />
                          <AvatarFallback className={`${roleConfig.color}`}>
                            {member.username?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-white">
                            {member.username || 'Unnamed'}
                          </h3>
                          <Badge className={`${roleConfig.color} border mt-1 text-xs`}>
                            <roleConfig.icon className="w-3 h-3 mr-1" />
                            {roleConfig.label}
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>

                    <p className="text-sm text-zinc-500 mb-4">
                      {roleConfig.description}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="p-2 rounded-lg bg-zinc-800 text-center">
                        <p className="text-lg font-bold text-white">
                          {member.xp_count?.toLocaleString() || 0}
                        </p>
                        <p className="text-xs text-zinc-500">XP</p>
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-800 text-center">
                        <p className="text-lg font-bold text-white flex items-center justify-center gap-1">
                          {member.current_streak || 0}
                          <Flame className="w-4 h-4 text-orange-500" />
                        </p>
                        <p className="text-xs text-zinc-500">Streak</p>
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-800 text-center">
                        <p className="text-lg font-bold text-white capitalize">
                          {member.league_rank || 'Iron'}
                        </p>
                        <p className="text-xs text-zinc-500">League</p>
                      </div>
                    </div>

                    {/* XP Progress */}
                    <div>
                      <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span>Level Progress</span>
                        <span>{xpProgress.toFixed(0)}%</span>
                      </div>
                      <Progress value={xpProgress} className="h-1.5 bg-zinc-800" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Empty State */}
          {teamMembers.length === 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-zinc-600" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Team Members Yet</h3>
                <p className="text-zinc-400 mb-4 max-w-sm">
                  Invite your first team member to start building your agency.
                </p>
                <Button onClick={() => setIsInviteOpen(true)} className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Invite First Member
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Work Schedule</CardTitle>
              <CardDescription className="text-zinc-400">
                Team member shift planning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-8 gap-2 text-center text-sm min-w-[600px]">
                  {/* Header */}
                  <div className="font-medium text-zinc-400 text-left">Member</div>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="font-medium text-zinc-400">{day}</div>
                  ))}

                  {/* Example rows */}
                  <div className="text-left font-medium text-white">Sarah</div>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-2 rounded bg-green-500/10 text-green-400 text-xs border border-green-500/20">
                      9-5 PM
                    </div>
                  ))}
                  <div className="p-2 rounded bg-zinc-800 text-zinc-500 text-xs">Off</div>
                  <div className="p-2 rounded bg-zinc-800 text-zinc-500 text-xs">Off</div>

                  <div className="text-left font-medium text-white">Mike</div>
                  <div className="p-2 rounded bg-zinc-800 text-zinc-500 text-xs">Off</div>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-2 rounded bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20">
                      1-9 PM
                    </div>
                  ))}
                  <div className="p-2 rounded bg-zinc-800 text-zinc-500 text-xs">Off</div>

                  <div className="text-left font-medium text-white">Emma</div>
                  <div className="p-2 rounded bg-purple-500/10 text-purple-400 text-xs border border-purple-500/20">
                    5-1 AM
                  </div>
                  <div className="p-2 rounded bg-zinc-800 text-zinc-500 text-xs">Off</div>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-2 rounded bg-purple-500/10 text-purple-400 text-xs border border-purple-500/20">
                      5-1 AM
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-zinc-500 pt-6 mt-6 border-t border-zinc-800">
                <Clock className="w-4 h-4" />
                <span>24/7 coverage with 3 shifts</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
