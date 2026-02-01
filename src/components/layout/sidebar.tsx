'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  MessageSquare,
  Briefcase,
  Sparkles,
  Target,
  Users,
  Crown,
  CreditCard,
  Bell,
  ChevronDown,
} from 'lucide-react';

const navigation = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
    ],
  },
  {
    title: 'Tools',
    items: [
      { name: 'CRM', href: '/dashboard/crm', icon: Briefcase },
      { name: 'Quests', href: '/dashboard/quests', icon: Target },
      { name: 'Content Intel', href: '/dashboard/content', icon: Sparkles },
    ],
  },
  {
    title: 'Settings',
    items: [
      { name: 'Team', href: '/dashboard/team', icon: Users },
      { name: 'Creator', href: '/dashboard/creator', icon: Crown },
      { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
      { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-card border-r border-border">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">O</span>
          </div>
          <span className="font-bold text-xl">OnyxOS</span>
        </Link>
        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {navigation.map((section) => (
          <div key={section.title}>
            <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Agency Selector */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
        <div className="flex items-center gap-2 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">FFA Partners</p>
            <p className="text-xs text-muted-foreground">1 agency</p>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </aside>
  );
}
