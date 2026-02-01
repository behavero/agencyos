'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { Database } from '@/types/database.types'
import {
  Users,
  UserPlus,
  Crown,
  Sword,
  Sparkles,
  Target,
  Zap,
  MoreVertical,
  Shield,
  Calendar,
  Clock
} from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row']

interface TeamClientProps {
  teamMembers: Profile[]
  agencyId?: string
}

const roleIcons: Record<string, any> = {
  grandmaster: Crown,
  paladin: Sword,
  alchemist: Sparkles,
  ranger: Target,
  rogue: Zap,
}

const roleColors: Record<string, string> = {
  grandmaster: 'from-yellow-500 to-orange-500',
  paladin: 'from-blue-500 to-cyan-500',
  alchemist: 'from-purple-500 to-pink-500',
  ranger: 'from-green-500 to-emerald-500',
  rogue: 'from-red-500 to-rose-500',
}

const roleDescriptions: Record<string, string> = {
  grandmaster: 'Full access - CEO',
  paladin: 'Operations Manager',
  alchemist: 'Content Creator',
  ranger: 'Marketing Specialist',
  rogue: 'Sales & Chat',
}

export default function TeamClient({ teamMembers, agencyId }: TeamClientProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'rogue',
  })

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement invite logic
    console.log('Invite:', inviteForm)
    setIsInviteOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your agency team, roles, and schedule
          </p>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg hover-lift">
              <UserPlus className="w-4 h-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your agency
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="member@example.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  className="w-full px-3 py-2 rounded-md border border-border bg-background"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                >
                  <option value="rogue">Rogue - Sales & Chat</option>
                  <option value="ranger">Ranger - Marketing</option>
                  <option value="alchemist">Alchemist - Content</option>
                  <option value="paladin">Paladin - Operations</option>
                  <option value="grandmaster">Grandmaster - CEO</option>
                </select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Send Invitation</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="team" className="w-full">
        <TabsList>
          <TabsTrigger value="team" className="gap-2">
            <Users className="w-4 h-4" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <Calendar className="w-4 h-4" />
            Schedule
          </TabsTrigger>
        </TabsList>

        {/* Team Members Tab */}
        <TabsContent value="team" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamMembers.length}</div>
              </CardContent>
            </Card>

            <Card className="glass hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Grandmasters</CardTitle>
                <Crown className="w-4 h-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {teamMembers.filter(m => m.role === 'grandmaster').length}
                </div>
              </CardContent>
            </Card>

            <Card className="glass hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Chatters</CardTitle>
                <Zap className="w-4 h-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {teamMembers.filter(m => m.role === 'rogue').length}
                </div>
              </CardContent>
            </Card>

            <Card className="glass hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total XP</CardTitle>
                <Sparkles className="w-4 h-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {teamMembers.reduce((sum, m) => sum + (m.xp_count || 0), 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Members Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamMembers.map((member) => {
              const RoleIcon = roleIcons[member.role || 'rogue'] || Shield
              const roleColor = roleColors[member.role || 'rogue'] || 'from-gray-500 to-gray-600'
              
              return (
                <Card key={member.id} className="glass hover-lift group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${roleColor} flex items-center justify-center`}>
                          <RoleIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{member.username || 'Unnamed'}</CardTitle>
                          <Badge variant="outline" className="mt-1 capitalize">
                            {member.role}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {roleDescriptions[member.role || 'rogue']}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">XP</p>
                          <p className="font-semibold">{member.xp_count || 0}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Streak</p>
                          <p className="font-semibold">{member.current_streak || 0}🔥</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">League</p>
                          <p className="font-semibold text-xs">{member.league_rank || 'Iron'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Empty State */}
          {teamMembers.length === 0 && (
            <Card className="glass">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Team Members Yet</h3>
                <p className="text-muted-foreground mb-4 max-w-sm">
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
          <Card className="glass">
            <CardHeader>
              <CardTitle>Work Schedule</CardTitle>
              <CardDescription>Team member shift planning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Schedule Grid */}
                <div className="grid grid-cols-8 gap-2 text-center text-sm">
                  <div className="font-semibold">Member</div>
                  <div className="font-semibold">Mon</div>
                  <div className="font-semibold">Tue</div>
                  <div className="font-semibold">Wed</div>
                  <div className="font-semibold">Thu</div>
                  <div className="font-semibold">Fri</div>
                  <div className="font-semibold">Sat</div>
                  <div className="font-semibold">Sun</div>

                  <div className="text-left font-medium">Sarah</div>
                  <div className="p-2 rounded bg-primary/10 text-primary text-xs">9AM-5PM</div>
                  <div className="p-2 rounded bg-primary/10 text-primary text-xs">9AM-5PM</div>
                  <div className="p-2 rounded bg-primary/10 text-primary text-xs">9AM-5PM</div>
                  <div className="p-2 rounded bg-primary/10 text-primary text-xs">9AM-5PM</div>
                  <div className="p-2 rounded bg-primary/10 text-primary text-xs">9AM-5PM</div>
                  <div className="p-2 rounded bg-muted text-muted-foreground text-xs">Off</div>
                  <div className="p-2 rounded bg-muted text-muted-foreground text-xs">Off</div>

                  <div className="text-left font-medium">Mike</div>
                  <div className="p-2 rounded bg-muted text-muted-foreground text-xs">Off</div>
                  <div className="p-2 rounded bg-secondary/10 text-secondary text-xs">1PM-9PM</div>
                  <div className="p-2 rounded bg-secondary/10 text-secondary text-xs">1PM-9PM</div>
                  <div className="p-2 rounded bg-secondary/10 text-secondary text-xs">1PM-9PM</div>
                  <div className="p-2 rounded bg-secondary/10 text-secondary text-xs">1PM-9PM</div>
                  <div className="p-2 rounded bg-secondary/10 text-secondary text-xs">1PM-9PM</div>
                  <div className="p-2 rounded bg-muted text-muted-foreground text-xs">Off</div>

                  <div className="text-left font-medium">Emma</div>
                  <div className="p-2 rounded bg-accent/10 text-accent-foreground text-xs">5PM-1AM</div>
                  <div className="p-2 rounded bg-muted text-muted-foreground text-xs">Off</div>
                  <div className="p-2 rounded bg-accent/10 text-accent-foreground text-xs">5PM-1AM</div>
                  <div className="p-2 rounded bg-accent/10 text-accent-foreground text-xs">5PM-1AM</div>
                  <div className="p-2 rounded bg-accent/10 text-accent-foreground text-xs">5PM-1AM</div>
                  <div className="p-2 rounded bg-accent/10 text-accent-foreground text-xs">5PM-1AM</div>
                  <div className="p-2 rounded bg-accent/10 text-accent-foreground text-xs">5PM-1AM</div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t border-border">
                  <Clock className="w-4 h-4" />
                  <span>24/7 coverage with 3 shifts</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
