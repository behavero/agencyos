'use client'

import Link from 'next/link'
import {
  Bell,
  Search,
  Command,
  DollarSign,
  Users,
  MessageSquare,
  Settings,
  Building2,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TimeClock } from './time-clock'
import { useAgencyDataOptional } from '@/providers/agency-data-provider'
import { createClient } from '@/lib/supabase/client'

export function Header() {
  const agencyData = useAgencyDataOptional()

  const totalRevenue = agencyData?.agencyStats?.totalRevenue || 0
  const totalSubs = agencyData?.agencyStats?.totalSubscribers || 0
  const unreadMessages =
    agencyData?.models?.reduce((sum, m) => sum + (m.unread_messages || 0), 0) || 0
  const profileName = agencyData?.profile?.username || 'Grandmaster'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="search" placeholder="Search..." className="pl-9 h-9" />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">
              <Command className="w-3 h-3 inline" />
            </kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">K</kbd>
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Live Stats */}
        {totalRevenue > 0 && (
          <>
            <div className="hidden lg:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold text-primary">
                  $
                  {totalRevenue >= 1000
                    ? `${(totalRevenue / 1000).toFixed(1)}k`
                    : totalRevenue.toFixed(0)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-teal-400" />
                <span className="font-medium text-teal-400">{totalSubs.toLocaleString()}</span>
              </div>
              {unreadMessages > 0 && (
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-medium text-blue-400">{unreadMessages}</span>
                </div>
              )}
            </div>
            <Separator orientation="vertical" className="h-6 hidden lg:block" />
          </>
        )}

        {/* Time Clock Widget - Shows for non-owner employees */}
        <TimeClock />

        <Separator orientation="vertical" className="h-6" />

        {/* Notifications */}
        <Button
          size="icon"
          variant="ghost"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="w-5 h-5" />
          {unreadMessages > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse-lime" />
          )}
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer outline-none">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-foreground">{profileName}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {agencyData?.profile?.role || 'Member'}
                </p>
              </div>
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src="" alt="User" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-green-400 text-primary-foreground text-sm font-medium">
                  {profileName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{profileName}</p>
                <p className="text-xs text-muted-foreground font-normal">
                  {agencyData?.user?.email || ''}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="w-4 h-4" />
                Profile Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/dashboard/agency-settings"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                Agency Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                const supabase = createClient()
                await supabase.auth.signOut()
                window.location.href = '/'
              }}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
