'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  MessageSquare,
  Briefcase,
  Sparkles,
  Target,
  Users,
  Crown,
  CreditCard,
  Settings,
  Bot,
  Building2,
} from 'lucide-react'

const navigation = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
      { name: 'Alfred AI', href: '/dashboard/alfred', icon: Bot },
    ],
  },
  {
    title: 'Management',
    items: [
      { name: 'Creators', href: '/dashboard/creator-management', icon: Crown },
      { name: 'CRM', href: '/dashboard/crm', icon: Briefcase },
      { name: 'Quests', href: '/dashboard/quests', icon: Target },
      { name: 'Content', href: '/dashboard/content', icon: Sparkles },
    ],
  },
  {
    title: 'Finance',
    items: [
      { name: 'Expenses', href: '/dashboard/expenses', icon: CreditCard },
    ],
  },
  {
    title: 'Settings',
    items: [
      { name: 'Team', href: '/dashboard/team', icon: Users },
      { name: 'Agency HQ', href: '/dashboard/agency-settings', icon: Building2 },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[250px] bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-zinc-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <span className="text-zinc-900 font-bold text-lg">O</span>
          </div>
          <span className="font-bold text-xl text-white">OnyxOS</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        {navigation.map((section, idx) => (
          <div key={section.title} className="px-3 mb-6">
            <h3 className="px-3 mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))
                
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white text-sm font-medium">F</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">FFA Partners</p>
            <p className="text-xs text-zinc-500">Pro Plan</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
