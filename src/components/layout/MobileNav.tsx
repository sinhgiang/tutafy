'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, BookOpen, Calendar, Menu, X, Zap } from 'lucide-react'
import { hasPlan, PLAN_LABEL } from '@/lib/plans'
import { NAV } from './nav-items'

// The four pages used most stay one tap away; "More" opens a sheet with every other
// page of the app (the desktop sidebar is hidden on a phone, so without this sheet
// Messages, Payments, Upgrade and the rest could not be reached from the menu).
const ITEMS = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/lessons', label: 'Lessons', icon: BookOpen },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
]

export function MobileNav({ plan = 'free', unreadMessages = 0 }: { plan?: string; unreadMessages?: number }) {
  const pathname = usePathname()
  // The sheet is open for the page it was opened on: going to another page closes it with no effect needed.
  const [openAt, setOpenAt] = useState<string | null>(null)
  const open = openAt === pathname
  const setOpen = (value: boolean | ((v: boolean) => boolean)) => setOpenAt((typeof value === 'function' ? value(open) : value) ? pathname : null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)

  // While the sheet is open: Escape closes it, the page behind does not scroll, focus starts on the close button.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpenAt(null); moreRef.current?.focus() } }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])

  const inMore = !ITEMS.some(i => pathname === i.href || (i.href !== '/dashboard' && pathname.startsWith(i.href)))

  return (
    <>
      <nav aria-label="Main" data-mobile-nav className="dash-tabbar md:hidden">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined} className="dash-tab">
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          )
        })}
        <button ref={moreRef} type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="mobile-more-sheet"
          className={open || inMore ? 'dash-tab is-open' : 'dash-tab'}>
          <Menu aria-hidden="true" />
          <span>More</span>
          {unreadMessages > 0 && <span className="dash-dot-unread" role="img" aria-label="Unread messages" />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="All pages" id="mobile-more-sheet">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 w-full h-full bg-black/60 border-0 cursor-default" tabIndex={-1} />
          <div className="dash-sheet">
            <div className="dash-sheet-head">
              <span>All pages</span>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="dash-icon-btn" style={{ width: 44, height: 44, marginRight: -12 }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-3 py-3 space-y-4">
              {NAV.map(({ group, items }) => (
                <div key={group}>
                  <p className="dash-sheet-group">{group}</p>
                  <ul className="m-0 p-0 list-none">
                    {items.map(({ href, label, icon: Icon, plan: reqPlan }) => {
                      const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                      const locked = reqPlan ? !hasPlan(plan, reqPlan) : false
                      return (
                        <li key={href}>
                          <Link href={href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined} className="dash-sheet-link">
                            <Icon aria-hidden="true" />
                            <span>{label}</span>
                            {locked ? (
                              <span className="dash-link-lock">{PLAN_LABEL[reqPlan!]}</span>
                            ) : href === '/messages' && unreadMessages > 0 ? (
                              <span className="dash-count" style={{ position: 'static', marginLeft: 'auto', lineHeight: '20px', minWidth: 22 }}>{unreadMessages > 9 ? '9+' : unreadMessages}</span>
                            ) : null}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
              {plan === 'free' && (
                <Link href="/upgrade" onClick={() => setOpen(false)} className="dash-btn is-primary w-full" style={{ minHeight: 48 }}>
                  <Zap className="h-4 w-4" fill="currentColor" /> Upgrade to Pro
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
