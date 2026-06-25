'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Calendar, BookOpen,
  CreditCard, Clock, Sparkles, Settings, Zap,
} from 'lucide-react'

const NAV = [
  {
    group: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/students', label: 'Students', icon: Users },
      { href: '/lessons', label: 'Lessons', icon: BookOpen },
      { href: '/calendar', label: 'Calendar', icon: Calendar },
    ],
  },
  {
    group: 'Business',
    items: [
      { href: '/payments', label: 'Payments', icon: CreditCard },
      { href: '/availability', label: 'Availability', icon: Clock },
      { href: '/ai', label: 'AI Tools', icon: Sparkles },
    ],
  },
  {
    group: 'Account',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-[220px] min-h-screen bg-[#0A0A0F] border-r border-white/[0.06] flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-[60px] border-b border-white/[0.06]">
        <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
          <Zap className="h-4 w-4 text-white" fill="white" />
        </div>
        <span className="text-[15px] font-semibold text-white tracking-tight">Tutafy</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV.map(({ group, items }) => (
          <div key={group}>
            <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-1.5">
              {group}
            </p>
            <div className="space-y-0.5">
              {items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-all duration-150',
                      active
                        ? 'bg-white/10 text-white'
                        : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-indigo-400' : 'text-white/30')} />
                    {label}
                    {active && <span className="ml-auto w-1 h-1 rounded-full bg-indigo-400" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Upgrade */}
      <div className="px-3 pb-4">
        <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Free Plan</span>
          </div>
          <p className="text-[11px] text-white/40 mb-2">5 students max</p>
          <Link
            href="/settings?tab=billing"
            className="block text-center text-[11px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors rounded-md py-1.5"
          >
            Upgrade →
          </Link>
        </div>
      </div>
    </aside>
  )
}
