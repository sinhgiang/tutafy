// What the owner earns from the plans, read from Polar (T-0699). Read-only: ONE kind of request, a GET that lists the active
// subscriptions of the organisation, through the same reader as the Buyers page (src/lib/polar-read.ts). No new variable, nothing
// is written to Polar or anywhere else.
//
// Answers one of two things, never a made-up number:
//   { ok: true, ... }   the monthly recurring revenue per currency and how many subscriptions it adds up (a yearly price counts
//                       one twelfth of a month);
//   { ok: false, ... }  "not readable" with a short reason the page can print (see polar-read.ts).
import { readPolarList, NOT_READABLE, type PolarFetch, type PolarReason } from '@/lib/polar-read'

export { NOT_READABLE }

export type PolarIncome =
  | { ok: true; subscriptions: number; monthly: { currency: string; amount: number }[]; truncated: boolean }
  | { ok: false; reason: PolarReason; detail: string }

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

export async function readPolarIncome(env: Record<string, string | undefined> = process.env, doFetch?: PolarFetch): Promise<PolarIncome> {
  const list = await readPolarList('/v1/subscriptions/?active=true', env, doFetch)
  if (!list.ok) return list

  const cents = new Map<string, number>()
  let subscriptions = 0
  for (const item of list.items) {
    const m = monthlyCents(item)
    if (!m) return { ok: false, reason: 'unexpected', detail: NOT_READABLE.unexpected } // never guess at a subscription
    cents.set(m.currency, (cents.get(m.currency) ?? 0) + m.cents)
    subscriptions++
  }
  const monthly = [...cents].map(([currency, c]) => ({ currency, amount: Math.round(c) / 100 })).sort((a, b) => a.currency.localeCompare(b.currency))
  return { ok: true, subscriptions, monthly, truncated: list.truncated }
}
