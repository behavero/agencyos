'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  MessageSquare,
  Briefcase,
  Sparkles,
  Target,
  Users,
  Crown,
  CreditCard,
  Bot,
  Building2,
  Leaf,
  Image,
  Megaphone,
  Banknote,
  Ghost,
  BarChart3,
} from 'lucide-react'

const navigation = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
      { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
      { name: 'Alfred AI', href: '/dashboard/alfred', icon: Bot },
    ],
  },
  {
    title: 'Management',
    items: [
      { name: 'Creators', href: '/dashboard/creator-management', icon: Crown },
      { name: 'CRM', href: '/dashboard/crm', icon: Briefcase },
      { name: 'Ghost Tracker', href: '/dashboard/competitors', icon: Ghost },
      { name: 'Quests', href: '/dashboard/quests', icon: Target },
      { name: 'Content', href: '/dashboard/content', icon: Sparkles },
      { name: 'Vault', href: '/dashboard/content/vault', icon: Image },
      { name: 'Campaigns', href: '/dashboard/messages/campaigns', icon: Megaphone },
    ],
  },
  {
    title: 'Finance',
    items: [
      { name: 'Expenses', href: '/dashboard/expenses', icon: CreditCard },
      { name: 'Payroll', href: '/dashboard/finance/payroll', icon: Banknote },
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
    <aside className="fixed left-0 top-0 z-40 h-screen w-[250px] bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
            <Leaf className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl text-sidebar-foreground">OnyxOS</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        {navigation.map((section) => (
          <div key={section.title} className="px-3 mb-6">
            <h3 className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
                        'menu-item-subtle',
                        isActive && 'bg-sidebar-accent text-sidebar-primary'
                      )}
                    >
                      <item.icon className={cn(
                        "w-5 h-5",
                        isActive && "text-sidebar-primary"
                      )} />
                      {item.name}
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-green-400 flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-medium">F</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">FFA Partners</p>
            <p className="text-xs text-muted-foreground">Pro Plan</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
