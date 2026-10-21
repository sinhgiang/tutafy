// Test helper: the admin pages read the owner's language from a cookie (src/lib/admin-lang.ts → next/headers). Importing this file
// fakes that cookie jar; setAdminLang('vi') makes the next render Vietnamese, setAdminLang(null) goes back to the default (English).
import { mock } from 'node:test'
import { ADMIN_LANG_COOKIE, type AdminLang } from '../../src/lib/admin-i18n.ts'

let value: string | undefined

export function setAdminLang(lang: AdminLang | string | null): void {
  value = lang ?? undefined
}

mock.module('next/headers', {
  namedExports: {
    cookies: async () => ({
      get: (name: string) => (name === ADMIN_LANG_COOKIE && value !== undefined ? { name, value } : undefined),
      getAll: () => (value !== undefined ? [{ name: ADMIN_LANG_COOKIE, value }] : []),
      set: () => {},
    }),
  },
})
