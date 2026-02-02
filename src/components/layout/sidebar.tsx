'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { getNavigationForRole, UserRole } from '@/lib/auth/permissions'
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
  Calendar,
  CalendarClock,
  Link2,
  UserPlus,
  GraduationCap,
  ScrollText,
} from 'lucide-react'

interface NavigationItem {
  name: string
  href: string
  icon: React.ElementType
  permission?: keyof ReturnType<typeof getNavigationForRole>
}

interface NavigationSection {
  title: string
  items: NavigationItem[]
}

const fullNavigation: NavigationSection[] = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'showDashboard' },
      {
        name: 'Messages',
        href: '/dashboard/messages',
        icon: MessageSquare,
        permission: 'showMessages',
      },
      { name: 'Alfred AI', href: '/dashboard/alfred', icon: Bot, permission: 'showAlfred' },
    ],
  },
  {
    title: 'Management',
    items: [
      {
        name: 'Creators',
        href: '/dashboard/creator-management',
        icon: Crown,
        permission: 'showCreators',
      },
      { name: 'CRM', href: '/dashboard/crm', icon: Briefcase, permission: 'showCRM' },
      {
        name: 'Ghost Tracker',
        href: '/dashboard/competitors',
        icon: Ghost,
        permission: 'showGhostTracker',
      },
      { name: 'Quests', href: '/dashboard/quests', icon: Target, permission: 'showQuests' },
      { name: 'Content', href: '/dashboard/content', icon: Sparkles, permission: 'showContent' },
      {
        name: 'Calendar',
        href: '/dashboard/content/calendar',
        icon: Calendar,
        permission: 'showCalendar',
      },
      { name: 'Onyx Link', href: '/dashboard/content/bio', icon: Link2, permission: 'showVault' },
      { name: 'Vault', href: '/dashboard/content/vault', icon: Image, permission: 'showVault' },
      {
        name: 'Marketing',
        href: '/dashboard/marketing',
        icon: Megaphone,
        permission: 'showCampaigns',
      },
      {
        name: 'Academy',
        href: '/dashboard/academy',
        icon: GraduationCap,
        permission: 'showDashboard',
      },
      {
        name: 'Scripts',
        href: '/dashboard/academy/scripts',
        icon: ScrollText,
        permission: 'showDashboard',
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        name: 'Analytics',
        href: '/dashboard/finance/analytics',
        icon: BarChart3,
        permission: 'showDashboard',
      },
      {
        name: 'Expenses',
        href: '/dashboard/expenses',
        icon: CreditCard,
        permission: 'showExpenses',
      },
      {
        name: 'Payroll',
        href: '/dashboard/finance/payroll',
        icon: Banknote,
        permission: 'showPayroll',
      },
    ],
  },
  {
    title: 'Settings',
    items: [
      { name: 'Team', href: '/dashboard/team', icon: Users, permission: 'showTeam' },
      {
        name: 'Planning',
        href: '/dashboard/team/planning',
        icon: CalendarClock,
        permission: 'showTeam',
      },
      { name: 'Invite', href: '/dashboard/team/invite', icon: UserPlus, permission: 'showTeam' },
      {
        name: 'Agency HQ',
        href: '/dashboard/agency-settings',
        icon: Building2,
        permission: 'showAgencySettings',
      },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch user role
    const fetchRole = async () => {
      try {
        const res = await fetch('/api/user/profile')
        if (res.ok) {
          const data = await res.json()
          setUserRole(data.profile?.role || 'chatter')
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchRole()
  }, [])

  // Get permissions based on role
  const permissions = getNavigationForRole(userRole)

  // Filter navigation based on permissions
  const filteredNavigation = fullNavigation
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (!item.permission) return true
        return permissions[item.permission]
      }),
    }))
    .filter(section => section.items.length > 0)

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
        {loading ? (
          <div className="px-6 py-4">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-16 bg-zinc-700/50 rounded" />
                  <div className="space-y-1">
                    <div className="h-8 bg-zinc-700/30 rounded" />
                    <div className="h-8 bg-zinc-700/30 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          filteredNavigation.map(section => (
            <div key={section.title} className="px-3 mb-6">
              <h3 className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.items.map(item => {
                  const isActive =
                    pathname === item.href ||
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
                        <item.icon className={cn('w-5 h-5', isActive && 'text-sidebar-primary')} />
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
          ))
        )}
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
