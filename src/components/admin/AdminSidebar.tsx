'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield } from 'lucide-react'
import { ADMIN_NAV } from './admin-nav'
import { SignOutButton } from './SignOutButton'
import { cn } from '@/lib/utils'
import { LangToggle, useAdminT } from './AdminLang'


export function AdminSidebar() {
  const pathname = usePathname()
  const t = useAdminT()

  return (
    // Fixed to the window: the sidebar is as tall as the window and stays at the top while the page scrolls, so the menu and
    // the Sign out button at its foot are in view on every admin page, however long. A long menu scrolls inside itself.
    <aside className="hidden md:flex w-60 shrink-0 self-start sticky top-0 h-screen bg-gray-950 text-white flex-col">
      <div className="px-5 py-5 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-none">{t('shell.title')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('shell.subtitle')}</p>
          </div>
        </div>
        <LangToggle className="mt-4" />
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-0.5">
        {ADMIN_NAV.map(({ href, labelKey, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-red-500/20 text-red-400 font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {t(labelKey)}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800 shrink-0">
        <SignOutButton className="w-full gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white" />
      </div>
    </aside>
  )
}
