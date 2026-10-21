// The language of the owner's admin pages, read on the server from the cookie the EN | VI switch sets (src/components/admin/AdminLang.tsx).
// English unless the owner picked Vietnamese. Only the admin area calls this; no other page has a language switch.
import { cookies } from 'next/headers'
import { ADMIN_LANG_COOKIE, makeT, normalizeAdminLang, type AdminLang, type AdminT } from '@/lib/admin-i18n'

export async function getAdminLang(): Promise<AdminLang> {
  const jar = await cookies()
  return normalizeAdminLang(jar.get(ADMIN_LANG_COOKIE)?.value)
}

/** The language and its translator, for a page: `const { t } = await getAdminT()`. */
export async function getAdminT(): Promise<{ lang: AdminLang; t: AdminT }> {
  const lang = await getAdminLang()
  return { lang, t: makeT(lang) }
}
