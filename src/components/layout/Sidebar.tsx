'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { hasPlan, PLAN_LABEL } from '@/lib/plans'
import { Zap } from 'lucide-react'
import { NAV } from './nav-items'

const PLAN_META: Record<string, { label: string; desc: string }> = {
  free: { label: 'Free', desc: 'Up to 10 students' },
  pro: { label: 'Pro', desc: 'Unlimited students' },
  academy: { label: 'Academy', desc: 'Team of 5 tutors' },
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
    <aside data-dash-sidebar className="dash-side" aria-label="Sidebar">
      <div className="dash-brand">
        <Link href="/dashboard" aria-label="Tutafy dashboard">
          <span className="dash-logo" aria-hidden="true"><Zap className="h-4 w-4" fill="currentColor" /></span>
          <span className="dash-brand-name">Tutafy</span>
        </Link>
        <span className="dash-plan-tag">{meta.label.toUpperCase()}</span>
      </div>

      <nav aria-label="Pages">
        {NAV.map(({ group, items }) => (
          <div key={group} className="dash-group">
            <p className="dash-group-title">{group}</p>
            {items.map(({ href, label, icon: Icon, plan: reqPlan }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
              const locked = reqPlan ? !hasPlan(plan, reqPlan) : false
              const badge = href === '/messages' && unread > 0 ? { n: unread, fresh: false } : href === '/lessons' && newBookings > 0 ? { n: newBookings, fresh: true } : null
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  aria-label={locked ? `${label} (${PLAN_LABEL[reqPlan!]} plan)` : label}
                  aria-current={active ? 'page' : undefined}
                  className="dash-link"
                >
                  <Icon aria-hidden="true" />
                  <span className="dash-link-label">{label}</span>
                  {locked ? (
                    <span className="dash-link-lock">{PLAN_LABEL[reqPlan!]}</span>
                  ) : badge ? (
                    <span className={badge.fresh ? 'dash-count is-new' : 'dash-count'}>{badge.n > 9 ? '9+' : badge.n}</span>
                  ) : null}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="dash-side-foot">
        <div className="dash-plan-card">
          <b>{isPaid ? `${meta.label} plan` : 'Free plan'}</b>
          <span>{meta.desc}</span>
          <Link href="/upgrade" className={isPaid ? 'is-quiet' : undefined}>{isPaid ? 'Manage plan' : 'Upgrade to Pro'}</Link>
        </div>
      </div>
    </aside>
  )
}
