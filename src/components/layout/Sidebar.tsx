'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { hasPlan, PLAN_LABEL, type Plan } from '@/lib/plans'
import {
  LayoutDashboard, Users, Calendar, BookOpen,
  CreditCard, Clock, Sparkles, Settings, Zap, Crown, MessageCircle, Package, Upload, Gift, RefreshCw, Tag, ListOrdered, BarChart3, Code2, Wallet, Lock,
} from 'lucide-react'

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; plan?: Plan }

const NAV: { group: string; items: NavItem[] }[] = [
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
      { href: '/reports', label: 'Reports', icon: BarChart3, plan: 'pro' },
      { href: '/team', label: 'Team & Payroll', icon: Wallet, plan: 'academy' },
      { href: '/payments', label: 'Payments', icon: CreditCard },
      { href: '/packages', label: 'Packages', icon: Package, plan: 'pro' },
      { href: '/coupons', label: 'Coupons', icon: Tag, plan: 'pro' },
      { href: '/subscriptions', label: 'Subscriptions', icon: RefreshCw, plan: 'pro' },
      { href: '/waitlist', label: 'Waitlist', icon: ListOrdered, plan: 'pro' },
      { href: '/availability', label: 'Availability', icon: Clock },
      { href: '/ai', label: 'AI Tools', icon: Sparkles, plan: 'pro' },
      { href: '/import', label: 'Import', icon: Upload, plan: 'pro' },
    ],
  },
  {
    group: 'Account',
    items: [
      { href: '/referral', label: 'Refer & Earn', icon: Gift },
      { href: '/developers', label: 'API & Webhooks', icon: Code2, plan: 'pro' },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

const PLAN_META: Record<string, { label: string; color: string; textColor: string; desc: string }> = {
  free: { label: 'Free', color: 'border-white/10 bg-white/5', textColor: 'text-white/40', desc: 'Up to 10 students' },
  pro: { label: 'Pro', color: 'border-indigo-500/30 bg-indigo-500/10', textColor: 'text-indigo-300', desc: 'Unlimited students' },
  academy: { label: 'Academy', color: 'border-amber-500/30 bg-amber-500/10', textColor: 'text-amber-300', desc: 'Team 5 tutors' },
}

const LESSONS_SEEN_KEY = 'tutafy_lessons_last_seen'

export function Sidebar({ plan = 'free', unreadMessages = 0 }: { plan?: string; unreadMessages?: number }) {
  const pathname = usePathname()
  const meta = PLAN_META[plan] ?? PLAN_META.free
  const isPaid = plan === 'pro' || plan === 'academy'

  const [unread, setUnread] = useState(unreadMessages)
  const [newBookings, setNewBookings] = useState(0)
  const lastSeenRef = useRef<string | null>(null)

  // Keep unread in sync with the server-rendered value on each navigation
  useEffect(() => { setUnread(unreadMessages) }, [unreadMessages])

  // Poll for live badge counts: unread messages + new bookings.
  // Refreshes every 15s and whenever the tab regains focus, so numbers
  // update without a manual page reload.
  useEffect(() => {
    let seen = localStorage.getItem(LESSONS_SEEN_KEY)
    if (!seen) {
      // First load: baseline "now" so existing lessons aren't counted as new
      seen = new Date().toISOString()
      localStorage.setItem(LESSONS_SEEN_KEY, seen)
    }
    lastSeenRef.current = seen

    let active = true
    async function poll() {
      try {
        const since = lastSeenRef.current ?? ''
        const res = await fetch(`/api/nav-counts?since=${encodeURIComponent(since)}`, { cache: 'no-store' })
        if (!res.ok || !active) return
        const data = await res.json()
        if (!active) return
        setUnread(data.unreadMessages ?? 0)
        setNewBookings(data.newBookings ?? 0)
      } catch { /* ignore transient network errors */ }
    }
    poll()
    const interval = setInterval(poll, 15000)
    const onFocus = () => poll()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      active = false
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  // Opening the Lessons page marks all current bookings as seen → clears the badge
  useEffect(() => {
    if (pathname.startsWith('/lessons')) {
      const now = new Date().toISOString()
      localStorage.setItem(LESSONS_SEEN_KEY, now)
      lastSeenRef.current = now
      setNewBookings(0)
    }
  }, [pathname])

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
              {items.map(({ href, label, icon: Icon, plan: reqPlan }) => {
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                const isMessages = href === '/messages'
                const isLessons = href === '/lessons'
                const locked = reqPlan ? !hasPlan(plan, reqPlan) : false
                return (
                  <Link
                    key={href}
                    href={href}
                    title={locked ? `${PLAN_LABEL[reqPlan!]} feature` : undefined}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-all duration-150',
                      active
                        ? 'bg-white/10 text-white'
                        : locked
                          ? 'text-white/30 hover:text-white/60 hover:bg-white/5'
                          : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-indigo-400' : locked ? 'text-white/20' : 'text-white/30')} />
                    <span className={cn(locked && 'opacity-90')}>{label}</span>
                    {locked ? (
                      <span className="ml-auto flex items-center gap-1.5">
                        <span className={cn(
                          'text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
                          reqPlan === 'academy' ? 'bg-amber-500/15 text-amber-300/80' : 'bg-indigo-500/15 text-indigo-300/80'
                        )}>
                          {PLAN_LABEL[reqPlan!]}
                        </span>
                        <Lock className="h-3 w-3 text-white/25" />
                      </span>
                    ) : isMessages && unread > 0 ? (
                      <span className="ml-auto text-[9px] font-bold bg-indigo-500 text-white rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    ) : isLessons && newBookings > 0 ? (
                      <span className="ml-auto text-[9px] font-bold bg-emerald-500 text-white rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
                        {newBookings > 9 ? '9+' : newBookings}
                      </span>
                    ) : active ? (
                      <span className="ml-auto w-1 h-1 rounded-full bg-indigo-400" />
                    ) : null}
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
              Manage plan →
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Zap className="h-3 w-3 text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Free Plan</span>
            </div>
            <p className="text-[11px] text-white/30 mb-2">Up to 10 students</p>
            <Link href="/upgrade"
              className="block text-center text-[11px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors rounded-md py-1.5">
              Upgrade to Pro →
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
