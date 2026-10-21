'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Shield, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ADMIN_NAV } from './admin-nav'
import { LangToggle, useAdminT } from './AdminLang'
import { SignOutButton } from './SignOutButton'

// On a phone the admin sidebar is hidden; this top bar replaces it. It stays at the top of the window while the page
// scrolls and always carries the language switch and the Sign out button (the one and only Sign out on a phone). The
// menu button opens a drawer with the same links; a link, the dark backdrop, the close button or Escape closes it.
export function AdminMobileNav() {
  const pathname = usePathname()
  const t = useAdminT()
  // The drawer is open for the page it was opened on: going to another page closes it with no effect needed.
  const [openAt, setOpenAt] = useState<string | null>(null)
  const open = openAt === pathname
  const setOpen = (value: boolean) => setOpenAt(value ? pathname : null)
  const openRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpenAt(null); openRef.current?.focus() } }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 flex items-center gap-3 h-14 px-3 bg-gray-950 text-white border-b border-gray-800">
        <button ref={openRef} type="button" onClick={() => setOpen(true)} aria-label={t('shell.openMenu')} aria-expanded={open} aria-controls="admin-drawer"
          className="w-11 h-11 flex items-center justify-center rounded-lg text-gray-300 hover:bg-gray-800 bg-transparent border-0">
          <Menu className="h-5 w-5" />
        </button>
        <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <p className="hidden min-[480px]:block font-bold text-[15px] leading-none">{t('shell.title')}</p>
        <LangToggle className="ml-auto" />
        <SignOutButton className="shrink-0 px-2 min-h-[44px] rounded-lg text-gray-200 hover:bg-gray-800 hover:text-white" />
      </header>

      {open && (
        <div className="md:hidden fixed inset-0 z-50" id="admin-drawer" role="dialog" aria-modal="true" aria-label={t('shell.menu')}>
          <button type="button" aria-label={t('shell.closeMenu')} tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 w-full h-full bg-black/60 border-0 cursor-default" />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] max-w-[85vw] bg-gray-950 text-white flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-800">
              <span className="font-bold text-[15px]">{t('shell.subtitle')}</span>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label={t('shell.closeMenu')}
                className="w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-gray-300 hover:bg-gray-800 bg-transparent border-0">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-3 space-y-0.5">
              {ADMIN_NAV.map(({ href, labelKey, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href)
                return (
                  <Link key={href} href={href} onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 min-h-[48px] rounded-lg text-[15px]',
                      active ? 'bg-red-500/20 text-red-400 font-medium' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    )}>
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {t(labelKey)}
                  </Link>
                )
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  )
}
