// What the owner earns from the plans, read from Polar (T-0699). Read-only: ONE kind of request, a GET that lists the active
// subscriptions of the organisation, with the access token the server already has for the upgrade route (POLAR_ACCESS_TOKEN;
// POLAR_API_BASE for the address). No new variable, nothing is written to Polar or anywhere else.
//
// Answers one of two things, never a made-up number:
//   { ok: true, ... }   the monthly recurring revenue per currency and how many subscriptions it adds up (a yearly price counts
//                       one twelfth of a month);
//   { ok: false, ... }  "not readable" with a short reason the page can print: no token on the server, Polar refused the token,
//                       Polar could not be reached, or Polar answered something the reader does not understand. The reason
//                       never holds the token, the address of a customer or any part of Polar's answer.
const DEFAULT_BASE = 'https://api.polar.sh'
const PAGE_SIZE = 100
const MAX_PAGES = 20
const TIMEOUT_MS = 8000

export type PolarIncome =
  | { ok: true; subscriptions: number; monthly: { currency: string; amount: number }[]; truncated: boolean }
  | { ok: false; reason: 'no_token' | 'refused' | 'unreachable' | 'unexpected'; detail: string }

type Fetch = (url: string, init: { method: 'GET'; headers: Record<string, string>; cache: 'no-store'; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

export const NOT_READABLE: Record<Exclude<PolarIncome, { ok: true }>['reason'], string> = {
  no_token: 'could not be read: the server has no Polar read key (POLAR_ACCESS_TOKEN)',
  refused: "could not be read: Polar does not accept the server's read key",
  unreachable: 'could not be read: Polar cannot be reached right now',
  unexpected: 'could not be read: Polar answered in a form this page does not understand',
}

/** Cents per month of one subscription, or null when it is not one the reader understands. */
function monthlyCents(sub: unknown): { currency: string; cents: number } | null {
  if (!sub || typeof sub !== 'object') return null
  const s = sub as Record<string, unknown>
  const amount = typeof s.amount === 'number' ? s.amount : null
  const currency = typeof s.currency === 'string' && /^[A-Za-z]{3}$/.test(s.currency) ? s.currency.toUpperCase() : null
  const interval = s.recurring_interval
  if (amount === null || !Number.isFinite(amount) || amount < 0 || !currency) return null
  if (interval === 'month') return { currency, cents: amount }
  if (interval === 'year') return { currency, cents: amount / 12 }
  return null
}

export async function readPolarIncome(env: Record<string, string | undefined> = process.env, doFetch: Fetch = fetch as unknown as Fetch): Promise<PolarIncome> {
  const token = (env.POLAR_ACCESS_TOKEN ?? '').trim()
  if (!token) return { ok: false, reason: 'no_token', detail: NOT_READABLE.no_token }
  const base = (env.POLAR_API_BASE ?? DEFAULT_BASE).replace(/\/+$/, '')

  const cents = new Map<string, number>()
  let subscriptions = 0
  let truncated = false
  for (let page = 1; ; page++) {
    if (page > MAX_PAGES) { truncated = true; break }
    let res
    try {
      res = await doFetch(`${base}/v1/subscriptions/?active=true&limit=${PAGE_SIZE}&page=${page}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch {
      return { ok: false, reason: 'unreachable', detail: NOT_READABLE.unreachable }
    }
    if (res.status === 401 || res.status === 403) return { ok: false, reason: 'refused', detail: NOT_READABLE.refused }
    if (!res.ok) return { ok: false, reason: 'unreachable', detail: NOT_READABLE.unreachable }
    let body: unknown
    try { body = await res.json() } catch { return { ok: false, reason: 'unexpected', detail: NOT_READABLE.unexpected } }
    const items = body && typeof body === 'object' ? (body as { items?: unknown }).items : undefined
    if (!Array.isArray(items)) return { ok: false, reason: 'unexpected', detail: NOT_READABLE.unexpected }
    for (const item of items) {
      const m = monthlyCents(item)
      if (!m) return { ok: false, reason: 'unexpected', detail: NOT_READABLE.unexpected } // never guess at a subscription
      cents.set(m.currency, (cents.get(m.currency) ?? 0) + m.cents)
      subscriptions++
    }
    if (items.length < PAGE_SIZE) break
  }
  const monthly = [...cents].map(([currency, c]) => ({ currency, amount: Math.round(c) / 100 })).sort((a, b) => a.currency.localeCompare(b.currency))
  return { ok: true, subscriptions, monthly, truncated }
}
