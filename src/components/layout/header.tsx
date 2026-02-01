'use client'

import { Bell, Search, Command } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80 px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-700 h-9"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 text-xs text-zinc-600">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">
              <Command className="w-3 h-3 inline" />
            </kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">K</kbd>
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Button 
          size="icon" 
          variant="ghost" 
          className="relative text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

        <Separator orientation="vertical" className="h-6 bg-zinc-800" />

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-white">Martin</p>
            <p className="text-xs text-zinc-500">Grandmaster</p>
          </div>
          <Avatar className="h-8 w-8 border border-zinc-700">
            <AvatarImage src="" alt="User" />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
              M
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
