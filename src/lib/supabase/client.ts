import { createBrowserClient } from '@supabase/ssr'
import { VIEW_FLAG_COOKIE, VIEW_REST_PREFIX } from '@/lib/view-as'

const viewFlagOn = () => typeof document !== 'undefined' && document.cookie.split('; ').some(c => c === `${VIEW_FLAG_COOKIE}=1`)

/**
 * While the admin has a "View as this tutor" open (T-0708), a dashboard page that reads the database from the browser must not read
 * with the admin's own session (that would show the admin's data) and must not be able to write. Its client then sends every request to
 * our own server (src/app/api/admin/view-rest/[...path]/route.ts), which answers reads only, for the viewed tutor, with secrets
 * removed; anything else (a write, a sign-out, the storage, a token refresh) gets a refusal here and again on the server. The flag
 * cookie is only a hint for which way to read; it grants nothing: the server checks the real view every time.
 */
function viewFetch(supabaseUrl: string): typeof fetch {
  const base = new URL(supabaseUrl)
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    if (url.origin !== base.origin || !(url.pathname.startsWith('/rest/v1/') || url.pathname === '/auth/v1/user')) {
      return Response.json({ code: 'VIEW_READ_ONLY', message: 'This is a read-only view of a tutor: nothing can be changed here.' }, { status: 403 })
    }
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    const pass: Record<string, string> = {}
    for (const name of ['accept', 'range', 'range-unit', 'prefer']) { const v = headers.get(name); if (v) pass[name] = v }
    return fetch(`${VIEW_REST_PREFIX}${url.pathname}${url.search}`, { method, headers: pass, credentials: 'same-origin', cache: 'no-store' })
  }
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  if (viewFlagOn()) return createBrowserClient(url, key, { global: { fetch: viewFetch(url) } })
  return createBrowserClient(url, key)
}

/** The signed-in account's own client, whatever view is open: for the admin's own sign-out button. */
export function createRealClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
