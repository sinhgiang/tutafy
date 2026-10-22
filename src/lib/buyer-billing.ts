// What each buyer on the admin Buyers page has paid, what their plan costs and when it renews or ends (T-0705). READ-ONLY.
//
// The facts come from Polar, the same reader and the same token as the plan income on the Revenue page (src/lib/polar-read.ts): ONE
// GET list of the subscriptions and ONE of the orders of the organisation, matched to the buyers by `tutors.polar_subscription_id`
// (written by the Polar webhook). Nothing is written to Polar or to the database, and nothing is guessed: what Polar does not
// answer, or answers in a form this file does not understand, is shown as "not available" with a reason, never as 0 or a made-up date.
//
// Amounts: Polar counts money in the smallest unit (cents); this file hands pages whole amounts per currency, never added across currencies.
import { readPolarList, type PolarFetch, type PolarReason } from '@/lib/polar-read'

export type BillingStatus = 'active' | 'cancelled' | 'past_due' | 'other'
export type PolarSubscription = {
  id: string
  status: BillingStatus
  /** a monthly price in whole currency units, or a yearly one */
  amount: number
  currency: string
  interval: 'month' | 'year'
  started: string | null
  periodEnd: string | null
  /** when a cancelled plan stops (Polar's `ends_at`, else `ended_at`, else the end of the paid period) */
  endsAt: string | null
}
export type PolarOrder = { subscriptionId: string; currency: string; paid: number }

export type BuyerBilling = {
  sub: { price: { amount: number; currency: string; interval: 'month' | 'year' }; started: string | null; status: BillingStatus; dateKind: 'next' | 'ends' | null; date: string | null } | null
  /** why `sub` is empty although the read worked: no subscription id on the tutor, or Polar has no readable one with that id */
  subWhy: 'no_id' | 'not_found' | null
  /** everything the buyer has paid on this plan, per currency, after refunds; null when the orders could not be read */
  paid: { currency: string; amount: number }[] | null
}

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null)
const day = (v: unknown): string | null => { const s = text(v); return s !== null && !Number.isNaN(Date.parse(s)) ? s : null }
const money = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null)
const code = (v: unknown): string | null => (typeof v === 'string' && /^[A-Za-z]{3}$/.test(v) ? v.toUpperCase() : null)

function statusOf(polarStatus: unknown, cancelAtPeriodEnd: boolean): BillingStatus {
  if (polarStatus === 'canceled') return 'cancelled'
  if (polarStatus === 'active' || polarStatus === 'trialing') return cancelAtPeriodEnd ? 'cancelled' : 'active'
  if (polarStatus === 'past_due' || polarStatus === 'unpaid') return 'past_due'
  return 'other'
}

/** One subscription of Polar's list, or null when it is not one this file understands. */
export function parseSubscription(item: unknown): PolarSubscription | null {
  if (!item || typeof item !== 'object') return null
  const s = item as Record<string, unknown>
  const id = text(s.id)
  const cents = money(s.amount)
  const currency = code(s.currency)
  const interval = s.recurring_interval
  if (!id || cents === null || !currency || (interval !== 'month' && interval !== 'year')) return null
  return {
    id,
    status: statusOf(s.status, s.cancel_at_period_end === true),
    amount: cents / 100,
    currency,
    interval,
    started: day(s.started_at) ?? day(s.created_at),
    periodEnd: day(s.current_period_end),
    endsAt: day(s.ends_at) ?? day(s.ended_at) ?? day(s.current_period_end),
  }
}

/** One order of Polar's list: what the buyer really paid for it (the total with tax, less what was refunded), or null when not understood. */
export function parseOrder(item: unknown): PolarOrder | null {
  if (!item || typeof item !== 'object') return null
  const o = item as Record<string, unknown>
  const subscriptionId = text(o.subscription_id)
  const currency = code(o.currency)
  const total = money(o.total_amount)
  if (!subscriptionId || !currency || total === null) return null
  const status = o.status
  let cents = 0
  if (status === 'paid') cents = total
  else if (status === 'partially_refunded') cents = Math.max(0, total - (money(o.refunded_amount) ?? 0) - (money(o.refunded_tax_amount) ?? 0))
  // `refunded`, `pending`, `void` and any other state: nothing was kept, so nothing counts as paid
  return { subscriptionId, currency, paid: cents / 100 }
}

export type PolarBilling = {
  subscriptions: { ok: true; items: PolarSubscription[] } | { ok: false; reason: PolarReason }
  orders: { ok: true; items: PolarOrder[] } | { ok: false; reason: PolarReason }
  /** Polar had more records than the reader takes in one go, so totals may be low */
  truncated: boolean
  /** items Polar sent that this file did not understand (they are left out; the page says how many) */
  skipped: number
}

/** The two reads. Nothing is asked when there is no buyer to look up. */
export async function readPolarBilling(hasBuyers: boolean, env: Record<string, string | undefined> = process.env, doFetch?: PolarFetch): Promise<PolarBilling | null> {
  if (!hasBuyers) return null
  const [subs, orders] = await Promise.all([readPolarList('/v1/subscriptions/', env, doFetch), readPolarList('/v1/orders/', env, doFetch)])
  let skipped = 0
  const parsed = <T,>(items: unknown[], parse: (i: unknown) => T | null): T[] => items.flatMap(i => { const p = parse(i); if (p === null) skipped++; return p === null ? [] : [p] })
  return {
    subscriptions: subs.ok ? { ok: true, items: parsed(subs.items, parseSubscription) } : { ok: false, reason: subs.reason },
    orders: orders.ok ? { ok: true, items: parsed(orders.items, parseOrder) } : { ok: false, reason: orders.reason },
    truncated: (subs.ok && subs.truncated) || (orders.ok && orders.truncated),
    skipped,
  }
}

/** Match Polar's answer to each buyer. A buyer with no subscription id is told apart from one Polar does not know. */
export function buildBuyerBilling(buyers: { id: string; polar_subscription_id?: string | null }[], polar: PolarBilling | null): Map<string, BuyerBilling> {
  const out = new Map<string, BuyerBilling>()
  const subs = new Map(polar?.subscriptions.ok ? polar.subscriptions.items.map(s => [s.id, s]) : [])
  for (const b of buyers) {
    const id = text(b.polar_subscription_id)
    let sub: BuyerBilling['sub'] = null
    let subWhy: BuyerBilling['subWhy'] = null
    if (!id) subWhy = 'no_id'
    else if (polar?.subscriptions.ok) {
      const s = subs.get(id)
      if (!s) subWhy = 'not_found'
      else {
        const dateKind = s.status === 'cancelled' ? 'ends' : s.status === 'active' || s.status === 'past_due' ? 'next' : null
        sub = { price: { amount: s.amount, currency: s.currency, interval: s.interval }, started: s.started, status: s.status, dateKind, date: dateKind === 'ends' ? s.endsAt : dateKind === 'next' ? s.periodEnd : null }
      }
    }
    let paid: BuyerBilling['paid'] = null
    if (polar?.orders.ok && id && !subWhy) { // a buyer Polar does not know gets a dash and a reason, never a made-up zero
      const per = new Map<string, number>()
      for (const o of polar.orders.items) if (o.subscriptionId === id) per.set(o.currency, (per.get(o.currency) ?? 0) + o.paid)
      paid = [...per].map(([currency, amount]) => ({ currency, amount: Math.round(amount * 100) / 100 })).sort((x, y) => x.currency.localeCompare(y.currency))
    }
    out.set(b.id, { sub, subWhy, paid })
  }
  return out
}

export type BillingSummary = {
  /** what all the listed buyers have paid, one total per currency */
  paid: { currency: string; amount: number }[]
  /** monthly recurring revenue per currency: active plans only (not cancelled, not past due); a yearly price counts one twelfth */
  mrr: { currency: string; amount: number }[]
  /** active plans whose next charge falls within the next 7 and 30 days */
  renewing7: number
  renewing30: number
}

const DAY = 86_400_000

export function summarizeBilling(billing: Map<string, BuyerBilling>, now: Date): BillingSummary {
  const paid = new Map<string, number>()
  const monthlyCents = new Map<string, number>()
  let renewing7 = 0
  let renewing30 = 0
  for (const b of billing.values()) {
    for (const p of b.paid ?? []) paid.set(p.currency, (paid.get(p.currency) ?? 0) + Math.round(p.amount * 100))
    if (b.sub?.status !== 'active') continue
    const { amount, currency, interval } = b.sub.price
    monthlyCents.set(currency, (monthlyCents.get(currency) ?? 0) + (interval === 'year' ? amount * 100 / 12 : amount * 100))
    if (b.sub.date) {
      const left = Date.parse(b.sub.date) - now.getTime()
      if (left >= 0 && left <= 7 * DAY) renewing7++
      if (left >= 0 && left <= 30 * DAY) renewing30++
    }
  }
  const whole = (m: Map<string, number>) => [...m].map(([currency, c]) => ({ currency, amount: Math.round(c) / 100 })).sort((x, y) => x.currency.localeCompare(y.currency))
  return { paid: whole(paid), mrr: whole(monthlyCents), renewing7, renewing30 }
}
