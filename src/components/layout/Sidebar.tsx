'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Calendar, BookOpen,
  CreditCard, Clock, Sparkles, Settings, Zap, Crown, MessageCircle, Package, Upload, Gift, RefreshCw, Tag, ListOrdered,
} from 'lucide-react'

const NAV = [
  {
    group: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/students', label: 'Students', icon: Users },
      { href: '/lessons', label: 'Lessons', icon: BookOpen },
      { href: '/calendar', label: 'Calendar', icon: Calendar },
      { href: '/messages', label: 'Messages', icon: MessageCircle },
    ],
  },
  {
    group: 'Business',
    items: [
      { href: '/payments', label: 'Payments', icon: CreditCard },
      { href: '/packages', label: 'Packages', icon: Package },
      { href: '/coupons', label: 'Coupons', icon: Tag },
      { href: '/subscriptions', label: 'Subscriptions', icon: RefreshCw },
      { href: '/waitlist', label: 'Waitlist', icon: ListOrdered },
      { href: '/availability', label: 'Availability', icon: Clock },
      { href: '/ai', label: 'AI Tools', icon: Sparkles },
      { href: '/import', label: 'Import', icon: Upload },
    ],
  },
  {
    group: 'Account',
    items: [
      { href: '/referral', label: 'Refer & Earn', icon: Gift },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

const PLAN_META: Record<string, { label: string; color: string; textColor: string; desc: string }> = {
  free: { label: 'Free', color: 'border-white/10 bg-white/5', textColor: 'text-white/40', desc: 'Tối đa 10 học sinh' },
  pro: { label: 'Pro', color: 'border-indigo-500/30 bg-indigo-500/10', textColor: 'text-indigo-300', desc: 'Không giới hạn' },
  academy: { label: 'Academy', color: 'border-amber-500/30 bg-amber-500/10', textColor: 'text-amber-300', desc: 'Team 5 tutors' },
}

export function Sidebar({ plan = 'free', unreadMessages = 0 }: { plan?: string; unreadMessages?: number }) {
  const pathname = usePathname()
  const meta = PLAN_META[plan] ?? PLAN_META.free
  const isPaid = plan === 'pro' || plan === 'academy'

  return (
    <aside className="hidden md:flex flex-col w-[220px] min-h-screen bg-[#0A0A0F] border-r border-white/[0.06] flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-[60px] border-b border-white/[0.06]">
        <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
          <Zap className="h-4 w-4 text-white" fill="white" />
        </div>
        <span className="text-[15px] font-semibold text-white tracking-tight">Tutafy</span>
        <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
          plan === 'academy' ? 'bg-amber-500/20 text-amber-300' :
          plan === 'pro' ? 'bg-indigo-500/30 text-indigo-300' :
          'bg-white/5 text-white/20'
        }`}>
          {meta.label.toUpperCase()}
        </span>
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
                const isMessages = href === '/messages'
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
                    {isMessages && unreadMessages > 0 && (
                      <span className="ml-auto text-[9px] font-bold bg-indigo-500 text-white rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                    {active && !isMessages && <span className="ml-auto w-1 h-1 rounded-full bg-indigo-400" />}
                    {active && isMessages && unreadMessages === 0 && <span className="ml-auto w-1 h-1 rounded-full bg-indigo-400" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Plan widget */}
      <div className="px-3 pb-4">
        {isPaid ? (
          <div className={`rounded-lg border p-3 ${meta.color}`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Crown className={`h-3 w-3 ${meta.textColor}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${meta.textColor}`}>
                {meta.label} Plan
              </span>
            </div>
            <p className="text-[11px] text-white/30">{meta.desc}</p>
            <Link href="/upgrade"
              className="block mt-2 text-center text-[11px] font-medium text-white/40 hover:text-white/60 transition-colors">
              Quản lý gói →
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Zap className="h-3 w-3 text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Free Plan</span>
            </div>
            <p className="text-[11px] text-white/30 mb-2">Tối đa 10 học sinh</p>
            <Link href="/upgrade"
              className="block text-center text-[11px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors rounded-md py-1.5">
              Nâng cấp Pro →
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
