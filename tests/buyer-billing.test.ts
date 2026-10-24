// T-0705: the admin Buyers page shows, for each buyer, what they paid so far, the plan price, when they started, when the plan renews
// or ends, and its status; and above the table the total paid, the monthly recurring revenue and the plans about to renew.
// The REAL page is rendered over an in-memory database (Supabase and next/navigation are faked) and a PRETEND Polar, and the REAL
// functions that read and add up run on rows whose answers are worked out by hand below. Nothing is written anywhere.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import './support/admin-lang.ts'
import { setAdminLang } from './support/admin-lang.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(SRC, rel), 'utf8').replace(/\r\n/g, '\n')

let currentUser: { id: string; email: string } | null = null
let tutorRows: Record<string, unknown>[] = []
let adminClients = 0
const redirects: string[] = []

/** The part of the tutors table the Buyers page reads: select (with a head count), eq, in, order, limit. */
function fakeTutors() {
  return {
    from(table: string) {
      assert.equal(table, 'tutors')
      let result = [...tutorRows]
      let head = false
      const q = {
        select(_cols: string, opts?: { head?: boolean }) { head = !!opts?.head; return q },
        eq(col: string, v: unknown) { result = result.filter(r => r[col] === v); return q },
        in(col: string, vs: unknown[]) { result = result.filter(r => vs.includes(r[col])); return q },
        order(col: string, o: { ascending: boolean }) { result.sort((x, y) => String(x[col]).localeCompare(String(y[col])) * (o.ascending ? 1 : -1)); return q },
        limit(n: number) { result = result.slice(0, n); return q },
        then(resolve: (v: unknown) => unknown) { resolve(head ? { count: result.length, data: null } : { data: result, count: null }) },
      }
      return q
    },
  }
}

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }),
    createAdminClient: () => { adminClients++; return fakeTutors() },
  },
})
mock.module('next/navigation', {
  exports: { redirect: (to: string) => { redirects.push(to); throw new Error(`NEXT_REDIRECT:${to}`) }, usePathname: () => '/admin/buyers' },
})

const { ADMIN_EMAIL } = await import('./support/admin-account.ts')
const billing = await import('@/lib/buyer-billing.ts')
const { makeT } = await import('@/lib/admin-i18n.ts')
const BuyersPage = (await import('@/app/(admin)/admin/buyers/page.tsx')).default as () => Promise<React.ReactElement>

const ADMIN = { id: 'u-0', email: ADMIN_EMAIL }
const TUTOR = { id: 'u-1', email: 'ten@example.com' }
const NOW = new Date()
const at = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString()
const dayText = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

beforeEach(() => {
  currentUser = ADMIN; redirects.length = 0; adminClients = 0; setAdminLang(null)
  process.env.POLAR_ACCESS_TOKEN = 'polar_oat_secret_value_123'
  delete process.env.POLAR_API_BASE
  tutorRows = BUYERS
})

// ---- the pretend Polar: seven buyers, each shaped to exercise one rule ----------------------------------------------------------
//
//   Ann  Pro      monthly $12, active, next charge in 5 days;  orders: 3 paid $12, 1 pending $12, 1 refunded $12  -> paid $36
//   Bo   Pro      yearly $120, active, next charge 9 Mar 2027;  orders: 1 paid $120                                 -> paid $120, counts $10 a month
//   Cy   Academy  monthly $29, cancelled at period end, ends in 10 days; orders: 2 paid $29                          -> paid $58, not recurring
//   Di   Pro      monthly $12, past due; orders: 1 paid $12, 1 partly refunded ($12 total, $3 back)                  -> paid $21, not recurring
//   Ed   Pro      no Polar subscription id on record                                                                 -> dashes, a reason
//   Flo  Academy  monthly EUR 25, active, next charge in 20 days; orders: 1 paid EUR 25                              -> paid EUR 25, EUR 25 a month
//   Gus  Pro      an id Polar does not know                                                                          -> dashes, a different reason
// By hand: paid USD 36 + 120 + 58 + 21 = 235, paid EUR 25. Monthly: USD 12 + 120/12 = 22, EUR 25 (Cy cancelled, Di past due, Ed and Gus unknown).
// Renewing within 7 days: Ann only = 1. Within 30 days: Ann and Flo = 2 (Bo is far off, Cy is ending, Di is overdue).
const BUYERS = [
  { id: 'A', name: 'Ann', email: 'ann@example.com', created_at: '2026-06-01T00:00:00Z', subscription_status: 'pro', polar_subscription_id: 'sub_A', timezone: null, students: [{ count: 2 }], lessons: [{ count: 5 }] },
  { id: 'B', name: 'Bo', email: 'bo@example.com', created_at: '2026-05-01T00:00:00Z', subscription_status: 'pro', polar_subscription_id: 'sub_B', timezone: 'UTC', students: [], lessons: [] },
  { id: 'C', name: 'Cy', email: 'cy@example.com', created_at: '2026-04-01T00:00:00Z', subscription_status: 'academy', polar_subscription_id: 'sub_C', timezone: null, students: [], lessons: [] },
  { id: 'D', name: 'Di', email: 'di@example.com', created_at: '2026-03-01T00:00:00Z', subscription_status: 'pro', polar_subscription_id: 'sub_D', timezone: null, students: [], lessons: [] },
  { id: 'E', name: 'Ed', email: 'ed@example.com', created_at: '2026-02-01T00:00:00Z', subscription_status: 'pro', polar_subscription_id: null, timezone: null, students: [], lessons: [] },
  { id: 'F', name: 'Flo', email: 'flo@example.com', created_at: '2026-01-01T00:00:00Z', subscription_status: 'academy', polar_subscription_id: 'sub_F', timezone: null, students: [], lessons: [] },
  { id: 'G', name: 'Gus', email: 'gus@example.com', created_at: '2025-12-01T00:00:00Z', subscription_status: 'pro', polar_subscription_id: 'sub_missing', timezone: null, students: [], lessons: [] },
  { id: 'Z', name: 'Zed', email: 'zed@example.com', created_at: '2025-11-01T00:00:00Z', subscription_status: 'free', polar_subscription_id: 'sub_Z', timezone: null, students: [], lessons: [] }, // free: not a buyer
]
const sub = (id: string, o: Record<string, unknown>) => ({ id, status: 'active', amount: 1200, currency: 'usd', recurring_interval: 'month', cancel_at_period_end: false, started_at: at(-80), current_period_end: at(5), ends_at: null, customer: { email: 'private-customer@example.com' }, ...o })
const order = (subscriptionId: string, total: number, o: Record<string, unknown> = {}) => ({ id: `ord_${Math.random()}`, status: 'paid', total_amount: total, currency: 'usd', subscription_id: subscriptionId, ...o })
const SUBSCRIPTIONS = [
  sub('sub_A', {}),
  sub('sub_B', { amount: 12000, recurring_interval: 'year', started_at: '2026-03-09T10:00:00Z', current_period_end: '2027-03-09T10:00:00Z' }),
  sub('sub_C', { amount: 2900, cancel_at_period_end: true, ends_at: at(10), current_period_end: at(10) }),
  sub('sub_D', { status: 'past_due', current_period_end: at(-2) }),
  sub('sub_F', { amount: 2500, currency: 'eur', current_period_end: at(20) }),
  sub('sub_Z', {}),
]
const ORDERS = [
  order('sub_A', 1200), order('sub_A', 1200), order('sub_A', 1200), order('sub_A', 1200, { status: 'pending' }), order('sub_A', 1200, { status: 'refunded', refunded_amount: 1200 }),
  order('sub_B', 12000),
  order('sub_C', 2900), order('sub_C', 2900),
  order('sub_D', 1200), order('sub_D', 1200, { status: 'partially_refunded', refunded_amount: 300 }),
  order('sub_F', 2500, { currency: 'eur' }),
  order('sub_Z', 9900), // a tutor who is no longer a buyer: never in the totals
]

type Call = { url: string; method: string; auth: string }
/** Replace the global fetch with a Polar that answers from these two lists (paged like the real one) and writes down every request. */
function withPolar(subscriptions: unknown[], orders: unknown[], over: { subs?: () => unknown; ordersReply?: () => unknown } = {}) {
  const calls: Call[] = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (url: string, init?: { method?: string; headers?: Record<string, string> }) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET', auth: init?.headers?.Authorization ?? '' })
    const page = Number(/page=(\d+)/.exec(String(url))?.[1] ?? 1)
    const all = String(url).includes('/v1/orders/') ? orders : subscriptions
    const special = String(url).includes('/v1/orders/') ? over.ordersReply?.() : over.subs?.()
    if (special) return special
    return { ok: true, status: 200, json: async () => ({ items: all.slice((page - 1) * 100, page * 100) }) }
  }) as unknown as typeof fetch
  return { calls, restore: () => { globalThis.fetch = realFetch } }
}
const reply = (status: number, body: unknown = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

const render = async () => renderToStaticMarkup(await BuyersPage())
const row = (html: string, id: string) => new RegExp(`<tr[^>]*data-buyer="${id}".*?</tr>`, 's').exec(html)?.[0] ?? ''
const cell = (html: string, id: string, col: string) => {
  const m = new RegExp(`data-col="${col}"[^>]*>(.*?)</td>`, 's').exec(row(html, id))
  return (m?.[1] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
const card = (html: string, testid: string) => [...html.matchAll(new RegExp(`data-testid="${testid}"[^>]*>(.*?)</p>`, 'gs'))].map(m => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())

// ---- the readers of one item ------------------------------------------------------------------------------------------------------

test('parseSubscription: price in whole units, the status in the words of the page, the end date of a cancelled plan', () => {
  const p = billing.parseSubscription
  const base = { id: 's1', status: 'active', amount: 1999, currency: 'eur', recurring_interval: 'year', started_at: '2026-01-02T03:04:05Z', current_period_end: '2027-01-02T03:04:05Z' }
  assert.deepEqual(p(base), { id: 's1', status: 'active', amount: 19.99, currency: 'EUR', interval: 'year', started: '2026-01-02T03:04:05Z', periodEnd: '2027-01-02T03:04:05Z', endsAt: '2027-01-02T03:04:05Z' })
  assert.equal(p({ ...base, status: 'trialing' })?.status, 'active')
  assert.equal(p({ ...base, cancel_at_period_end: true })?.status, 'cancelled')
  assert.equal(p({ ...base, status: 'canceled' })?.status, 'cancelled')
  assert.equal(p({ ...base, status: 'past_due' })?.status, 'past_due')
  assert.equal(p({ ...base, status: 'unpaid' })?.status, 'past_due')
  assert.equal(p({ ...base, status: 'incomplete' })?.status, 'other')
  // the end date: ends_at first, then ended_at, then the end of the paid period
  assert.equal(p({ ...base, cancel_at_period_end: true, ends_at: '2026-12-01T00:00:00Z' })?.endsAt, '2026-12-01T00:00:00Z')
  assert.equal(p({ ...base, ended_at: '2026-11-01T00:00:00Z' })?.endsAt, '2026-11-01T00:00:00Z')
  // the start falls back to the creation date
  assert.equal(p({ ...base, started_at: null, created_at: '2025-05-05T00:00:00Z' })?.started, '2025-05-05T00:00:00Z')
  assert.equal(p({ ...base, started_at: 'not a date' })?.started, null)
})

test('parseSubscription: anything it does not understand is null, never a guess', () => {
  const ok = { id: 's1', status: 'active', amount: 1200, currency: 'usd', recurring_interval: 'month' }
  for (const bad of [null, undefined, 'x', 5, [], {}, { ...ok, id: '' }, { ...ok, id: 7 }, { ...ok, amount: '1200' }, { ...ok, amount: -1 }, { ...ok, amount: NaN }, { ...ok, currency: 'dollars' }, { ...ok, currency: null }, { ...ok, recurring_interval: 'week' }, { ...ok, recurring_interval: null }]) {
    assert.equal(billing.parseSubscription(bad), null, JSON.stringify(bad))
  }
  assert.notEqual(billing.parseSubscription(ok), null)
})

test('parseOrder: a paid order counts in full (with tax), a partly refunded one less what came back, everything else nothing', () => {
  const o = billing.parseOrder
  const base = { status: 'paid', total_amount: 1200, currency: 'usd', subscription_id: 'sub_1' }
  assert.deepEqual(o(base), { subscriptionId: 'sub_1', currency: 'USD', paid: 12 })
  assert.equal(o({ ...base, status: 'partially_refunded', refunded_amount: 300 })?.paid, 9)
  assert.equal(o({ ...base, status: 'partially_refunded', refunded_amount: 250, refunded_tax_amount: 50 })?.paid, 9, 'the tax that came back is taken off too')
  assert.equal(o({ ...base, status: 'partially_refunded', refunded_amount: 5000 })?.paid, 0, 'never below zero')
  assert.equal(o({ ...base, status: 'partially_refunded' })?.paid, 12, 'no refund figure means nothing refunded')
  for (const status of ['refunded', 'pending', 'void', 'something_new']) assert.equal(o({ ...base, status })?.paid, 0, status)
  for (const bad of [null, 'x', {}, { ...base, subscription_id: null }, { ...base, total_amount: '1200' }, { ...base, total_amount: -1 }, { ...base, currency: 'US' }]) {
    assert.equal(o(bad), null, JSON.stringify(bad))
  }
})

// ---- matching Polar's answer to each buyer, and adding up ------------------------------------------------------------------------------

function polarOf(subs: unknown[], orders: unknown[]) {
  return {
    subscriptions: { ok: true as const, items: subs.map(billing.parseSubscription).filter(Boolean) as NonNullable<ReturnType<typeof billing.parseSubscription>>[] },
    orders: { ok: true as const, items: orders.map(billing.parseOrder).filter(Boolean) as NonNullable<ReturnType<typeof billing.parseOrder>>[] },
    truncated: false, skipped: 0,
  }
}

test('buildBuyerBilling: each buyer gets their own price, dates, status and paid total; the unknown ones get a reason, not a zero', () => {
  const map = billing.buildBuyerBilling(BUYERS.filter(b => b.subscription_status !== 'free'), polarOf(SUBSCRIPTIONS, ORDERS))
  const a = map.get('A')!
  assert.deepEqual(a.paid, [{ currency: 'USD', amount: 36 }])
  assert.deepEqual(a.sub?.price, { amount: 12, currency: 'USD', interval: 'month' })
  assert.deepEqual([a.sub?.status, a.sub?.dateKind], ['active', 'next'])
  assert.deepEqual(map.get('B')!.paid, [{ currency: 'USD', amount: 120 }])
  assert.equal(map.get('B')!.sub?.date, '2027-03-09T10:00:00Z')
  assert.equal(map.get('B')!.sub?.started, '2026-03-09T10:00:00Z')
  const c = map.get('C')!
  assert.deepEqual([c.sub?.status, c.sub?.dateKind, c.sub?.date], ['cancelled', 'ends', c.sub?.date])
  assert.ok(c.sub?.date && Math.abs(Date.parse(c.sub.date) - Date.parse(at(10))) < 5000, 'a cancelled plan shows the day it ends')
  assert.deepEqual(map.get('C')!.paid, [{ currency: 'USD', amount: 58 }])
  assert.deepEqual([map.get('D')!.sub?.status, map.get('D')!.paid], ['past_due', [{ currency: 'USD', amount: 21 }]])
  assert.deepEqual(map.get('F')!.paid, [{ currency: 'EUR', amount: 25 }])
  assert.deepEqual([map.get('E')!.sub, map.get('E')!.subWhy, map.get('E')!.paid], [null, 'no_id', null])
  assert.deepEqual([map.get('G')!.sub, map.get('G')!.subWhy, map.get('G')!.paid], [null, 'not_found', null], 'Polar knows no such plan: no price and no amount, not a zero')
  assert.equal(map.has('Z'), false)
})

test('summarizeBilling: the totals match the figures worked out by hand (paid per currency, monthly recurring, renewals in 7 and 30 days)', () => {
  const map = billing.buildBuyerBilling(BUYERS.filter(b => b.subscription_status !== 'free'), polarOf(SUBSCRIPTIONS, ORDERS))
  const s = billing.summarizeBilling(map, NOW)
  assert.deepEqual(s.paid, [{ currency: 'EUR', amount: 25 }, { currency: 'USD', amount: 235 }])
  assert.deepEqual(s.mrr, [{ currency: 'EUR', amount: 25 }, { currency: 'USD', amount: 22 }])
  assert.deepEqual([s.renewing7, s.renewing30], [1, 2])
})

test('summarizeBilling: the edges of the 7 and 30 day windows, and plans that do not recur never count', () => {
  const one = (periodEnd: string, over: Record<string, unknown> = {}) => billing.buildBuyerBilling([{ id: 'X', polar_subscription_id: 'sub_X' }], polarOf([sub('sub_X', { current_period_end: periodEnd, ...over })], []))
  const w = (m: Map<string, ReturnType<typeof billing.buildBuyerBilling> extends Map<string, infer V> ? V : never>) => { const s = billing.summarizeBilling(m, NOW); return [s.renewing7, s.renewing30] }
  assert.deepEqual(w(one(NOW.toISOString())), [1, 1], 'charging this very moment is within the window')
  assert.deepEqual(w(one(new Date(NOW.getTime() + 7 * 86_400_000).toISOString())), [1, 1], 'exactly seven days is in')
  assert.deepEqual(w(one(new Date(NOW.getTime() + 7 * 86_400_000 + 60_000).toISOString())), [0, 1], 'a minute past seven days is only in the 30')
  assert.deepEqual(w(one(new Date(NOW.getTime() + 30 * 86_400_000 + 60_000).toISOString())), [0, 0])
  assert.deepEqual(w(one(new Date(NOW.getTime() - 60_000).toISOString())), [0, 0], 'a charge date that has passed is not "coming"')
  assert.deepEqual(w(one(at(3), { cancel_at_period_end: true })), [0, 0], 'a cancelled plan ends, it does not renew')
  assert.deepEqual(w(one(at(3), { status: 'past_due' })), [0, 0])
  assert.deepEqual(billing.summarizeBilling(one(at(3), { cancel_at_period_end: true }), NOW).mrr, [])
  assert.deepEqual(billing.summarizeBilling(one(at(3), { amount: 100, recurring_interval: 'year' }), NOW).mrr, [{ currency: 'USD', amount: 0.08 }], 'a yearly $1 is 8 cents a month (one twelfth, rounded)')
})

test('the monthly figure and the paid figure never add one currency to another', () => {
  const map = billing.buildBuyerBilling(
    [{ id: 'P', polar_subscription_id: 'sub_P' }, { id: 'Q', polar_subscription_id: 'sub_Q' }],
    polarOf([sub('sub_P', { amount: 1000, currency: 'usd' }), sub('sub_Q', { amount: 1000, currency: 'eur' })], [order('sub_P', 1000), order('sub_Q', 1000, { currency: 'eur' })]))
  const s = billing.summarizeBilling(map, NOW)
  assert.deepEqual(s.paid, [{ currency: 'EUR', amount: 10 }, { currency: 'USD', amount: 10 }])
  assert.deepEqual(s.mrr, [{ currency: 'EUR', amount: 10 }, { currency: 'USD', amount: 10 }])
})

// ---- reading Polar ---------------------------------------------------------------------------------------------------------------------

test('readPolarBilling: with no buyer nothing is asked; with buyers it is two GET lists, with the read key and no other request', async () => {
  const none = withPolar([], [])
  try {
    assert.equal(await billing.readPolarBilling(false), null)
    assert.equal(none.calls.length, 0)
  } finally { none.restore() }
  const p = withPolar(SUBSCRIPTIONS, ORDERS)
  try {
    const r = await billing.readPolarBilling(true)
    assert.equal(r?.subscriptions.ok && r.orders.ok, true)
    assert.deepEqual(p.calls.map(c => c.method), ['GET', 'GET'])
    assert.deepEqual(p.calls.map(c => c.url).sort(), ['https://api.polar.sh/v1/orders/?limit=100&page=1', 'https://api.polar.sh/v1/subscriptions/?limit=100&page=1'])
    assert.ok(p.calls.every(c => c.auth === 'Bearer polar_oat_secret_value_123'))
  } finally { p.restore() }
})

test('readPolarBilling: a list that fails does not take the other one down, and every failure has a reason of its own', async () => {
  const p = withPolar(SUBSCRIPTIONS, ORDERS, { ordersReply: () => reply(403) })
  try {
    const r = await billing.readPolarBilling(true)
    assert.equal(r?.subscriptions.ok, true)
    assert.deepEqual(r?.orders, { ok: false, reason: 'refused' })
    const map = billing.buildBuyerBilling(BUYERS, r!)
    assert.equal(map.get('A')!.paid, null, 'no orders read: no amount, not zero')
    assert.deepEqual(map.get('A')!.sub?.price, { amount: 12, currency: 'USD', interval: 'month' }, 'the plan facts are still there')
  } finally { p.restore() }
  const q = withPolar(SUBSCRIPTIONS, ORDERS, { subs: () => reply(500) })
  try {
    const r = await billing.readPolarBilling(true)
    assert.deepEqual(r?.subscriptions, { ok: false, reason: 'unreachable' })
    const map = billing.buildBuyerBilling(BUYERS, r!)
    assert.deepEqual([map.get('A')!.sub, map.get('A')!.subWhy], [null, null], 'a failed read gives no "no subscription" claim about the buyer')
    assert.deepEqual(map.get('A')!.paid, [{ currency: 'USD', amount: 36 }])
  } finally { q.restore() }
})

test('readPolarBilling: records it does not understand are counted and left out, and a list longer than the reader takes is flagged', async () => {
  const p = withPolar([...SUBSCRIPTIONS, { id: 'weird', amount: 'a lot' }, null], [...ORDERS, { status: 'paid' }])
  try {
    const r = await billing.readPolarBilling(true)
    assert.equal(r?.skipped, 3)
    assert.equal(r?.truncated, false)
  } finally { p.restore() }
  const many = Array.from({ length: 2100 }, (_, i) => sub(`sub_${i}`, {}))
  const q = withPolar(many, [])
  try {
    const r = await billing.readPolarBilling(true)
    assert.equal(r?.truncated, true)
    assert.equal(q.calls.filter(c => c.url.includes('/subscriptions/')).length, 20, 'twenty pages and no more')
  } finally { q.restore() }
})

// ---- the real page ---------------------------------------------------------------------------------------------------------------------

test('Buyers page: every buyer row shows paid so far, plan price, start, next charge or end, and status, as worked out by hand', async () => {
  const p = withPolar(SUBSCRIPTIONS, ORDERS)
  try {
    const html = await render()
    assert.deepEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G'].filter(id => row(html, id) !== ''), ['A', 'B', 'C', 'D', 'E', 'F', 'G'])
    assert.equal(row(html, 'Z'), '', 'a free tutor is not a buyer')
    // Ann: $36 paid, $12 a month, active, next charge in 5 days
    assert.match(cell(html, 'A', 'paid'), /^\$36\.00 USD$/)
    assert.match(cell(html, 'A', 'price'), /^\$12\.00 per month · USD$/)
    assert.equal(cell(html, 'A', 'started'), dayText(at(-80)))
    assert.equal(cell(html, 'A', 'date'), `${dayText(at(5))} Next charge`)
    assert.equal(cell(html, 'A', 'status'), 'Active')
    // Bo: yearly, fixed dates
    assert.match(cell(html, 'B', 'paid'), /^\$120\.00 USD$/)
    assert.match(cell(html, 'B', 'price'), /^\$120\.00 per year · USD$/)
    assert.equal(cell(html, 'B', 'started'), '9 Mar 2026')
    assert.equal(cell(html, 'B', 'date'), '9 Mar 2027 Next charge')
    // Cy: cancelled, the date is where the plan ENDS
    assert.equal(cell(html, 'C', 'date'), `${dayText(at(10))} Ends`)
    assert.equal(cell(html, 'C', 'status'), 'Cancelled')
    assert.match(cell(html, 'C', 'paid'), /^\$58\.00 USD$/)
    // Di: past due, a partly refunded order counted less the refund
    assert.equal(cell(html, 'D', 'status'), 'Past due')
    assert.match(cell(html, 'D', 'paid'), /^\$21\.00 USD$/)
    // Flo: euros, shown as euros
    assert.match(cell(html, 'F', 'paid'), /^€25\.00 EUR$/)
    assert.match(cell(html, 'F', 'price'), /^€25\.00 per month · EUR$/)
    // Ed and Gus: dashes with a reason that tells the two cases apart
    for (const col of ['price', 'started', 'date', 'status']) { assert.equal(cell(html, 'E', col), '—'); assert.equal(cell(html, 'G', col), '—') }
    assert.match(cell(html, 'E', 'paid'), /^— No Polar subscription on record for this buyer$/)
    assert.equal(cell(html, 'G', 'paid'), '— Polar has no readable subscription with this id')
  } finally { p.restore() }
})

test('Buyers page: the cards above the table are the sums worked out by hand', async () => {
  const p = withPolar(SUBSCRIPTIONS, ORDERS)
  try {
    const html = await render()
    assert.deepEqual(card(html, 'paid-total-value'), ['€25.00 EUR', '$235.00 USD'])
    assert.deepEqual(card(html, 'mrr-value'), ['€25.00 EUR', '$22.00 USD'])
    assert.deepEqual([card(html, 'renew-7-value'), card(html, 'renew-30-value')], [['1'], ['2']])
    assert.deepEqual([card(html, 'buyers-pro'), card(html, 'buyers-academy'), card(html, 'buyers-total')], [['5'], ['2'], ['7']])
    assert.doesNotMatch(html, /buyers-polar-unreadable/)
  } finally { p.restore() }
})

test('Buyers page: it asks Polar for nothing but two reads, and shows nothing Polar said about a customer, nor the key', async () => {
  const p = withPolar(SUBSCRIPTIONS, ORDERS)
  try {
    const html = await render()
    assert.deepEqual(p.calls.map(c => c.method), ['GET', 'GET'])
    assert.doesNotMatch(html, /polar_oat_secret_value_123|private-customer@example\.com|sub_A|sub_missing|api\.polar\.sh/)
  } finally { p.restore() }
})

test('Buyers page: in Vietnamese the same figures with the words from the table, and no English column names are left over', async () => {
  setAdminLang('vi')
  const p = withPolar(SUBSCRIPTIONS, ORDERS)
  try {
    const html = await render()
    const vi = makeT('vi')
    for (const k of ['buyers.colPaid', 'buyers.colPrice', 'buyers.colStarted', 'buyers.colDate', 'buyers.sumPaid', 'buyers.sumMrr', 'buyers.renew7', 'buyers.renew30'] as const) assert.ok(html.includes(vi(k)), k)
    assert.equal(cell(html, 'A', 'status'), 'Đang hoạt động')
    assert.equal(cell(html, 'C', 'status'), 'Đã huỷ')
    assert.equal(cell(html, 'D', 'status'), 'Trả chậm')
    assert.equal(cell(html, 'C', 'date'), `${dayText(at(10))} Hết hạn`)
    assert.match(cell(html, 'A', 'price'), /mỗi tháng/)
    assert.match(cell(html, 'E', 'paid'), /Chưa ghi gói đăng ký Polar nào/)
    assert.deepEqual(card(html, 'paid-total-value'), ['€25.00 EUR', '$235.00 USD'], 'the numbers are the same in both languages')
    for (const phrase of ['Paid so far', 'Plan price', 'Next charge', 'Monthly recurring', 'Past due']) assert.ok(!html.includes(phrase), phrase)
  } finally { p.restore() }
})

test('Buyers page: in English there is no Vietnamese anywhere on it', async () => {
  const p = withPolar(SUBSCRIPTIONS, ORDERS)
  try {
    const html = renderToStaticMarkup(await BuyersPage())
    assert.doesNotMatch(html, /[ăâđêôơưĂÂĐÊÔƠƯạảãấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/)
  } finally { p.restore() }
})

test('Buyers page: with no Polar key every figure is a dash, with the reason said once and no request made', async () => {
  delete process.env.POLAR_ACCESS_TOKEN
  const p = withPolar(SUBSCRIPTIONS, ORDERS)
  try {
    const html = await render()
    assert.equal(p.calls.length, 0)
    assert.match(html, /data-testid="buyers-polar-unreadable"[^>]*>.*Polar · Prices, dates and statuses:<\/span> Could not be read: the server has no Polar read key/s)
    assert.match(html, /Polar · Amounts paid:<\/span> Could not be read: the server has no Polar read key/)
    for (const id of ['paid-total-value', 'mrr-value', 'renew-7-value', 'renew-30-value']) assert.deepEqual(card(html, id), ['—'], id)
    for (const col of ['price', 'started', 'date', 'status']) assert.equal(cell(html, 'A', col), '—', col)
    assert.equal(cell(html, 'A', 'paid'), '— Payments could not be read')
    assert.deepEqual([card(html, 'buyers-total')], [['7']], 'the counts from our own table still show')
  } finally { p.restore() }
})

test('Buyers page: when only the payments cannot be read, the plan facts and the monthly figure stay and the paid figure is a dash', async () => {
  const p = withPolar(SUBSCRIPTIONS, ORDERS, { ordersReply: () => reply(401) })
  try {
    const html = await render()
    assert.match(html, /Polar · Amounts paid:<\/span> Could not be read: Polar does not accept the server&#x27;s read key/)
    assert.doesNotMatch(html, /Polar · Prices, dates and statuses/)
    assert.deepEqual(card(html, 'paid-total-value'), ['—'])
    assert.deepEqual(card(html, 'mrr-value'), ['€25.00 EUR', '$22.00 USD'])
    assert.match(cell(html, 'A', 'paid'), /^— Payments could not be read$/)
    assert.match(cell(html, 'A', 'price'), /^\$12\.00 per month/)
  } finally { p.restore() }
})

test('Buyers page: nobody has bought yet, so Polar is not asked and the cards say zero', async () => {
  tutorRows = BUYERS.filter(b => b.subscription_status === 'free')
  const p = withPolar(SUBSCRIPTIONS, ORDERS)
  try {
    const html = await render()
    assert.equal(p.calls.length, 0)
    assert.deepEqual([card(html, 'mrr-value'), card(html, 'renew-7-value')], [['$0.00'], ['0']])
  } finally { p.restore() }
})

test('Buyers page: a note says when Polar sent records it could not read or more than the page takes', async () => {
  const p = withPolar([...SUBSCRIPTIONS, { id: 'odd', amount: 'x' }], ORDERS)
  try {
    const html = await render()
    assert.match(html, /data-testid="buyers-polar-skipped"[^>]*>1 records from Polar were not understood/)
  } finally { p.restore() }
})

test('Buyers page: only the admin gets in, and for anyone else nothing is read from the database or from Polar', async () => {
  const p = withPolar(SUBSCRIPTIONS, ORDERS)
  try {
    currentUser = TUTOR
    await assert.rejects(BuyersPage(), /NEXT_REDIRECT:\/dashboard/)
    currentUser = null
    await assert.rejects(BuyersPage(), /NEXT_REDIRECT:\/login/)
    assert.equal(adminClients, 0)
    assert.equal(p.calls.length, 0)
  } finally { p.restore() }
})

test('the page and the readers write nothing: no insert, update, delete or upsert, and no Polar request but a GET', () => {
  const files = ['app/(admin)/admin/buyers/page.tsx', 'lib/buyer-billing.ts', 'lib/buyers-data.ts', 'lib/polar-read.ts']
  for (const f of files) {
    const src = read(f)
    assert.doesNotMatch(src, /\.(insert|update|delete|upsert|rpc)\(/, f)
    assert.doesNotMatch(src, /method: '(POST|PUT|PATCH|DELETE)'/, f)
  }
  assert.deepEqual([...new Set([...read('lib/polar-read.ts').matchAll(/method: '(\w+)'/g)].map(m => m[1]))], ['GET'])
})

test('the page runs the admin check before it creates the database client', () => {
  const page = read('app/(admin)/admin/buyers/page.tsx')
  const gate = page.indexOf('await requireAdminPage()')
  assert.ok(gate > 0 && gate < page.indexOf('createAdminClient()'))
  assert.ok(gate < page.indexOf('readPolarBilling('), 'and before Polar is asked')
})
