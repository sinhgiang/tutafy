'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  CreditCard,
  Clock,
  Sparkles,
  Settings,
  GraduationCap,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/lessons', label: 'Lessons', icon: BookOpen },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/availability', label: 'Availability', icon: Clock },
  { href: '/ai', label: 'AI Tools', icon: Sparkles },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-white border-r border-gray-200">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200">
        <GraduationCap className="h-7 w-7 text-blue-600" />
        <span className="text-xl font-bold text-gray-900">Tutafy</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-700">FREE PLAN</p>
          <p className="text-xs text-blue-600 mt-0.5">5 students max</p>
          <Link
            href="/settings?tab=billing"
            className="text-xs font-medium text-blue-700 hover:underline mt-1 block"
          >
            Upgrade to Solo →
          </Link>
        </div>
      </div>
    </aside>
  )
}
