// Turning stored visitors and events into what /super-admin shows: the pages a
// buyer saw in order, the last page before checkout, the order result, and the
// funnel from source to paid order. Pure functions, no imports of their own
// beyond the source list, so the node tests can feed them sample data.
import { SOURCES, type Source } from '@/lib/visitor-source'

export type EventRow = {
  visitor_id: string
  kind: 'page_view' | 'checkout_click' | 'order_paid'
  path: string | null
  plan: string | null
  created_at: string
}

export type VisitorRow = {
  id: string
  first_seen_at: string
  country: string | null
  first_source: Source
  first_path: string | null
  tutor_id: string | null
  // only read where the timeline needs them
  first_referrer_host?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
}

export type OrderResult = 'paid' | 'checkout_not_paid' | 'no_checkout'

export const ORDER_RESULT_LABEL: Record<OrderResult, string> = {
  paid: 'Paid',
  checkout_not_paid: 'Checkout started, not paid',
  no_checkout: 'No checkout seen',
}

export function orderResult(flags: { paid: boolean; checkoutClicked: boolean }): OrderResult {
  if (flags.paid) return 'paid'
  return flags.checkoutClicked ? 'checkout_not_paid' : 'no_checkout'
}

export type Journey = {
  /** Page views in the order they happened; the same page twice in a row counts once. */
  pages: string[]
  /** The last page viewed before the first checkout click (the page of the click if none was seen before it). */
  lastBeforeCheckout: string | null
  checkoutPlan: string | null
  paidPlan: string | null
  result: OrderResult
}

const byTime = (a: EventRow, b: EventRow) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0)

export function buildJourney(events: EventRow[]): Journey {
  const sorted = [...events].sort(byTime)
  const pages: string[] = []
  for (const e of sorted) {
    if (e.kind !== 'page_view' || !e.path) continue
    if (pages[pages.length - 1] !== e.path) pages.push(e.path)
  }
  const click = sorted.find(e => e.kind === 'checkout_click')
  const paid = sorted.find(e => e.kind === 'order_paid')

  let lastBeforeCheckout: string | null = null
  if (click) {
    const before = sorted.filter(e => e.kind === 'page_view' && e.path && e.created_at <= click.created_at)
    lastBeforeCheckout = before.length > 0 ? before[before.length - 1].path : click.path
  }
  return {
    pages,
    lastBeforeCheckout,
    checkoutPlan: click?.plan ?? null,
    paidPlan: paid?.plan ?? null,
    result: orderResult({ paid: Boolean(paid), checkoutClicked: Boolean(click) }),
  }
}

export type FunnelRow = { source: Source; visitors: number; signedUp: number; checkout: number; paid: number }

/** One row per source (all of them, zeros included) plus the total. Events must belong to the given visitors. */
export function funnelBySource(visitors: VisitorRow[], events: EventRow[]): { rows: FunnelRow[]; total: FunnelRow } {
  const clicked = new Set(events.filter(e => e.kind === 'checkout_click').map(e => e.visitor_id))
  const paid = new Set(events.filter(e => e.kind === 'order_paid').map(e => e.visitor_id))
  const rows: FunnelRow[] = SOURCES.map(source => ({ source, visitors: 0, signedUp: 0, checkout: 0, paid: 0 }))
  const bySource = new Map(rows.map(r => [r.source, r]))
  for (const v of visitors) {
    const row = bySource.get(v.first_source) ?? bySource.get('other')!
    row.visitors++
    if (v.tutor_id) row.signedUp++
    // Paying implies a checkout happened, even if the click itself was not seen.
    if (clicked.has(v.id) || paid.has(v.id)) row.checkout++
    if (paid.has(v.id)) row.paid++
  }
  const total = rows.reduce<FunnelRow>((t, r) => ({
    source: 'other', visitors: t.visitors + r.visitors, signedUp: t.signedUp + r.signedUp,
    checkout: t.checkout + r.checkout, paid: t.paid + r.paid,
  }), { source: 'other', visitors: 0, signedUp: 0, checkout: 0, paid: 0 })
  return { rows, total }
}

// ---- date filter -------------------------------------------------------------

export type DateRange = { from: string | null; to: string | null } // YYYY-MM-DD, inclusive

const DAY = /^\d{4}-\d{2}-\d{2}$/

function validDay(v: string | null | undefined): string | null {
  if (!v || !DAY.test(v)) return null
  const d = new Date(`${v}T00:00:00Z`)
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? null : v
}

/** Query-string values to a safe range; anything that is not a real date is ignored. */
export function parseRange(from: string | null | undefined, to: string | null | undefined): DateRange {
  let f = validDay(from)
  let t = validDay(to)
  if (f && t && f > t) [f, t] = [t, f]
  return { from: f, to: t }
}

/** Start and end (exclusive) of the range as ISO timestamps, UTC, for database filters. */
export function rangeBounds(range: DateRange): { gte: string | null; lt: string | null } {
  const gte = range.from ? `${range.from}T00:00:00.000Z` : null
  let lt: string | null = null
  if (range.to) {
    const d = new Date(`${range.to}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + 1)
    lt = d.toISOString()
  }
  return { gte, lt }
}

export function inRange(iso: string, range: DateRange): boolean {
  const { gte, lt } = rangeBounds(range)
  const t = new Date(iso).toISOString()
  return (gte === null || t >= gte) && (lt === null || t < lt)
}
