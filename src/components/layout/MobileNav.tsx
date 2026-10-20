'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, BookOpen, Calendar, Menu, X, Lock, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
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
      <nav aria-label="Main" data-mobile-nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0F] border-t border-white/[0.06] flex items-center justify-around px-2 pb-safe">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className={cn(
                'flex flex-col items-center gap-1 py-3 px-3 min-w-[56px] transition-colors',
                active ? 'text-indigo-400' : 'text-white/30 hover:text-white/60'
              )}>
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
        <button ref={moreRef} type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="mobile-more-sheet"
          className={cn(
            'relative flex flex-col items-center gap-1 py-3 px-3 min-w-[56px] transition-colors bg-transparent border-0',
            open || inMore ? 'text-indigo-400' : 'text-white/30 hover:text-white/60'
          )}>
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium">More</span>
          {unreadMessages > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500" aria-label="Unread messages" />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="All pages" id="mobile-more-sheet">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 w-full h-full bg-black/60 border-0 cursor-default" tabIndex={-1} />
          <div className="absolute left-0 right-0 bottom-0 max-h-[85dvh] overflow-y-auto overscroll-contain bg-[#0A0A0F] text-white rounded-t-2xl border-t border-white/10 pb-safe">
            <div className="sticky top-0 bg-[#0A0A0F] flex items-center justify-between px-5 h-14 border-b border-white/[0.06]">
              <span className="text-[15px] font-semibold">All pages</span>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close menu"
                className="w-11 h-11 -mr-3 flex items-center justify-center rounded-lg text-white/60 hover:text-white bg-transparent border-0">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-3 py-3 space-y-4">
              {NAV.map(({ group, items }) => (
                <div key={group}>
                  <p className="text-[12px] font-semibold text-white/40 uppercase tracking-widest px-2 mb-1">{group}</p>
                  <ul className="m-0 p-0 list-none">
                    {items.map(({ href, label, icon: Icon, plan: reqPlan }) => {
                      const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                      const locked = reqPlan ? !hasPlan(plan, reqPlan) : false
                      return (
                        <li key={href}>
                          <Link href={href} onClick={() => setOpen(false)}
                            className={cn(
                              'flex items-center gap-3 px-3 min-h-[48px] rounded-lg text-[15px] font-medium',
                              active ? 'bg-white/10 text-white' : locked ? 'text-white/40' : 'text-white/70'
                            )}>
                            <Icon className={cn('h-5 w-5 flex-shrink-0', active ? 'text-indigo-400' : 'text-white/40')} />
                            <span>{label}</span>
                            {locked ? (
                              <span className="ml-auto flex items-center gap-1.5 text-[12px] font-bold uppercase text-indigo-300/80">
                                {PLAN_LABEL[reqPlan!]}<Lock className="h-3.5 w-3.5 text-white/30" />
                              </span>
                            ) : href === '/messages' && unreadMessages > 0 ? (
                              <span className="ml-auto text-[12px] font-bold bg-indigo-500 text-white rounded-full px-2 py-0.5 min-w-[22px] text-center">{unreadMessages > 9 ? '9+' : unreadMessages}</span>
                            ) : null}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
              {plan === 'free' && (
                <Link href="/upgrade" onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 min-h-[48px] rounded-lg bg-indigo-500 text-white text-[15px] font-semibold">
                  <Zap className="h-4 w-4" fill="white" /> Upgrade to Pro
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
