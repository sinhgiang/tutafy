'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ADMIN_LANGS, ADMIN_LANG_COOKIE, DEFAULT_ADMIN_LANG, makeT, type AdminLang, type AdminT } from '@/lib/admin-i18n'
import { cn } from '@/lib/utils'

// The language of the admin area for the client parts (menu, migrations page). The server pages read the same choice from the cookie.
const LangContext = createContext<AdminLang>(DEFAULT_ADMIN_LANG)

export function AdminLangProvider({ lang, children }: { lang: AdminLang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>
}

export function useAdminLang(): AdminLang {
  return useContext(LangContext)
}

export function useAdminT(): AdminT {
  const lang = useContext(LangContext)
  return useMemo(() => makeT(lang), [lang])
}

/** Remembers the choice in the owner's browser for a year; the admin pages read it on the server. */
export function rememberAdminLang(lang: AdminLang, doc: { cookie: string }, secure: boolean): void {
  doc.cookie = `${ADMIN_LANG_COOKIE}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? '; Secure' : ''}`
}

/**
 * What a press on EN or VI does: nothing when it is the language already shown; otherwise remember it in the browser and
 * ask the page to render again in place (no full reload). Returns whether anything was done.
 */
export function chooseAdminLang(shown: AdminLang, next: AdminLang, doc: { cookie: string }, secure: boolean, refresh: () => void): boolean {
  if (next === shown) return false
  rememberAdminLang(next, doc, secure)
  refresh()
  return true
}

/** EN | VI: one switch for the whole admin area. Picking a language saves it and re-renders the page in place (no full reload). */
export function LangToggle({ className }: { className?: string }) {
  const lang = useAdminLang()
  const t = useAdminT()
  const router = useRouter()
  const [picked, setPicked] = useState<AdminLang | null>(null)
  const shown = picked ?? lang

  function choose(next: AdminLang) {
    if (chooseAdminLang(shown, next, document, location.protocol === 'https:', () => router.refresh())) setPicked(next)
  }

  return (
    <div role="group" aria-label={t('shell.language')} data-testid="lang-toggle" className={cn('inline-flex rounded-lg border border-gray-700 overflow-hidden text-xs font-semibold', className)}>
      {ADMIN_LANGS.map(code => (
        <button
          key={code}
          type="button"
          data-lang={code}
          aria-pressed={shown === code}
          onClick={() => choose(code)}
          className={cn('min-w-[44px] px-3 py-1.5 border-0 transition-colors', shown === code ? 'bg-red-500 text-white' : 'bg-transparent text-gray-300 hover:bg-gray-800')}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
