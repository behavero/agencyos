'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Bell,
  DollarSign,
  MessageCircle,
  Users,
  Target,
  TrendingUp,
  Clock
} from 'lucide-react'

// Mock notifications
const mockNotifications = [
  {
    id: '1',
    type: 'transaction',
    title: 'New subscription',
    message: 'Michael Johnson subscribed to Lana Valentine',
    amount: '$25.00',
    timestamp: '5 minutes ago',
    unread: true,
  },
  {
    id: '2',
    type: 'message',
    title: 'New message',
    message: 'You have 3 unread messages from fans',
    timestamp: '15 minutes ago',
    unread: true,
  },
  {
    id: '3',
    type: 'quest',
    title: 'Quest completed!',
    message: 'Daily quest "Post 3 TikToks" completed. +50 XP earned',
    timestamp: '1 hour ago',
    unread: false,
  },
  {
    id: '4',
    type: 'whale',
    title: 'Whale Alert! 🐋',
    message: 'Large tip received: $250 from premium subscriber',
    amount: '$250.00',
    timestamp: '2 hours ago',
    unread: false,
  },
]

const notificationIcons: Record<string, any> = {
  transaction: DollarSign,
  message: MessageCircle,
  quest: Target,
  whale: TrendingUp,
}

export default function NotificationsClient() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with your agency activity
          </p>
        </div>
        <Button variant="outline">Mark all as read</Button>
      </div>

      {/* Notification Settings */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <CardTitle>Notification Preferences</CardTitle>
          </div>
          <CardDescription>Choose what notifications you want to receive</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox id="transactions" defaultChecked />
                <Label htmlFor="transactions" className="cursor-pointer">
                  <div>
                    <p className="font-medium">Transactions</p>
                    <p className="text-sm text-muted-foreground">New subscriptions, tips, and payments</p>
                  </div>
                </Label>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox id="messages" defaultChecked />
                <Label htmlFor="messages" className="cursor-pointer">
                  <div>
                    <p className="font-medium">Messages</p>
                    <p className="text-sm text-muted-foreground">New fan messages and conversations</p>
                  </div>
                </Label>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox id="quests" defaultChecked />
                <Label htmlFor="quests" className="cursor-pointer">
                  <div>
                    <p className="font-medium">Quests & XP</p>
                    <p className="text-sm text-muted-foreground">Quest completions and level ups</p>
                  </div>
                </Label>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox id="whale" defaultChecked />
                <Label htmlFor="whale" className="cursor-pointer">
                  <div>
                    <p className="font-medium">Whale Alerts</p>
                    <p className="text-sm text-muted-foreground">High-value transactions over $100</p>
                  </div>
                </Label>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox id="team" />
                <Label htmlFor="team" className="cursor-pointer">
                  <div>
                    <p className="font-medium">Team Activity</p>
                    <p className="text-sm text-muted-foreground">Team member actions and updates</p>
                  </div>
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockNotifications.map((notification) => {
              const Icon = notificationIcons[notification.type] || Bell
              
              return (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-all hover-lift ${
                    notification.unread 
                      ? 'border-primary/50 bg-primary/5' 
                      : 'border-border bg-card'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    notification.type === 'whale' ? 'bg-accent' :
                    notification.type === 'transaction' ? 'bg-green-500/10' :
                    notification.type === 'message' ? 'bg-blue-500/10' :
                    'bg-purple-500/10'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      notification.type === 'whale' ? 'text-accent-foreground' :
                      notification.type === 'transaction' ? 'text-green-500' :
                      notification.type === 'message' ? 'text-blue-500' :
                      'text-purple-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h3 className="font-semibold">{notification.title}</h3>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                      </div>
                      {notification.amount && (
                        <Badge className="bg-green-500 flex-shrink-0">
                          {notification.amount}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                      <Clock className="w-3 h-3" />
                      {notification.timestamp}
                    </div>
                  </div>
                  {notification.unread && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
