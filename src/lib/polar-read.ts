// The one way the owner's admin pages READ from Polar (T-0699, T-0705). Read-only: only GET requests, with the access token the
// server already has for the upgrade route (POLAR_ACCESS_TOKEN; POLAR_API_BASE for the address). No new variable, nothing is written
// to Polar or anywhere else. Import-free, so the node tests can load it.
//
// A list is read page by page (100 a page, at most 20 pages) and the answer is one of two things, never a made-up number:
//   { ok: true, items, truncated }  every item of the pages read (truncated = there were more pages than the reader takes);
//   { ok: false, reason, detail }   "not readable" with a short reason a page can print: no token on the server, Polar refused the
//                                   token, Polar could not be reached, or Polar answered something the reader does not understand.
//                                   The reason never holds the token, the address of a customer or any part of Polar's answer.
const DEFAULT_BASE = 'https://api.polar.sh'
export const POLAR_PAGE_SIZE = 100
export const POLAR_MAX_PAGES = 20
const TIMEOUT_MS = 8000

export type PolarReason = 'no_token' | 'refused' | 'unreachable' | 'unexpected'

export type PolarFetch = (url: string, init: { method: 'GET'; headers: Record<string, string>; cache: 'no-store'; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

export const NOT_READABLE: Record<PolarReason, string> = {
  no_token: 'could not be read: the server has no Polar read key (POLAR_ACCESS_TOKEN)',
  refused: "could not be read: Polar does not accept the server's read key",
  unreachable: 'could not be read: Polar cannot be reached right now',
  unexpected: 'could not be read: Polar answered in a form this page does not understand',
}

export type PolarList =
  | { ok: true; items: unknown[]; truncated: boolean }
  | { ok: false; reason: PolarReason; detail: string }

const fail = (reason: PolarReason): PolarList => ({ ok: false, reason, detail: NOT_READABLE[reason] })

/** `path` is the address after the host, with or without a query: `/v1/subscriptions/?active=true` or `/v1/orders/`. */
export async function readPolarList(path: string, env: Record<string, string | undefined> = process.env, doFetch: PolarFetch = fetch as unknown as PolarFetch): Promise<PolarList> {
  const token = (env.POLAR_ACCESS_TOKEN ?? '').trim()
  if (!token) return fail('no_token')
  const base = (env.POLAR_API_BASE ?? DEFAULT_BASE).replace(/\/+$/, '')
  const sep = path.includes('?') ? '&' : '?'

  const items: unknown[] = []
  let truncated = false
  for (let page = 1; ; page++) {
    if (page > POLAR_MAX_PAGES) { truncated = true; break }
    let res
    try {
      res = await doFetch(`${base}${path}${sep}limit=${POLAR_PAGE_SIZE}&page=${page}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch {
      return fail('unreachable')
    }
    if (res.status === 401 || res.status === 403) return fail('refused')
    if (!res.ok) return fail('unreachable')
    let body: unknown
    try { body = await res.json() } catch { return fail('unexpected') }
    const got = body && typeof body === 'object' ? (body as { items?: unknown }).items : undefined
    if (!Array.isArray(got)) return fail('unexpected')
    items.push(...got)
    if (got.length < POLAR_PAGE_SIZE) break
  }
  return { ok: true, items, truncated }
}
