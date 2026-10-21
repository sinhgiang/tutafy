// T-0699: the owner's first page "Khách hàng của tôi" (/admin) and the page that used to be called Revenue.
// The REAL pages are rendered to HTML over an in-memory database (Supabase and next/navigation are faked), the REAL functions
// that count run on the same rows, and the Polar reader runs against a pretend Polar. Nothing is written anywhere.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(SRC, rel), 'utf8').replace(/\r\n/g, '\n')

let currentUser: { id: string; email: string } | null = null
let db: { from(table: string): unknown } = createFakeDb({})
let adminClients = 0
const redirects: string[] = []

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }),
    createAdminClient: () => { adminClients++; return db },
  },
})
mock.module('next/navigation', {
  exports: { redirect: (to: string) => { redirects.push(to); throw new Error(`NEXT_REDIRECT:${to}`) }, usePathname: () => '/admin' },
})

const { ADMIN_EMAIL } = await import('@/lib/admin.ts')
const customers = await import('@/lib/customers.ts')
const data = await import('@/lib/customers-data.ts')
const polar = await import('@/lib/polar-income.ts')
const { ADMIN_NAV } = await import('@/components/admin/admin-nav.ts')
const OverviewPage = (await import('@/app/(admin)/admin/page.tsx')).default as () => Promise<React.ReactElement>
const RevenuePage = (await import('@/app/(admin)/admin/revenue/page.tsx')).default as () => Promise<React.ReactElement>

const ADMIN = { id: 'u-0', email: ADMIN_EMAIL }
const TUTOR = { id: 'u-1', email: 'ten@example.com' }
// "Now" is the real now: the pages ask the clock themselves, and every row below is placed relative to it
const NOW = new Date()
const ago = (days: number, hours = 0) => new Date(NOW.getTime() - days * 86_400_000 - hours * 3_600_000).toISOString()

beforeEach(() => { currentUser = ADMIN; redirects.length = 0; adminClients = 0; delete process.env.POLAR_ACCESS_TOKEN; delete process.env.POLAR_API_BASE })

// Ten tutors. Pro: Ann (bought 3 days ago, recorded order), Bo (bought 20 days ago, recorded). Academy: Cy (no order recorded,
// signed up 5 days ago). Free: the rest. Real students: Dee and Eve and Ann have one; Fay only a self-added one.
const tutorRows = [
  { id: 'A', name: 'Ann', email: 'ann@example.com', created_at: ago(40), subscription_status: 'pro' },
  { id: 'B', name: 'Bo', email: 'bo@example.com', created_at: ago(90), subscription_status: 'pro' },
  { id: 'C', name: 'Cy', email: 'cy@example.com', created_at: ago(5), subscription_status: 'academy' },
  { id: 'D', name: 'Dee', email: 'dee@example.com', created_at: ago(2), subscription_status: 'free' },
  { id: 'E', name: 'Eve', email: 'eve@example.com', created_at: ago(20), subscription_status: 'free' },
  { id: 'F', name: 'Fay', email: 'fay@example.com', created_at: ago(1), subscription_status: 'free' },
  { id: 'G', name: 'Gus', email: 'gus@example.com', created_at: ago(6, 23), subscription_status: null },
  { id: 'H', name: 'Hal', email: 'hal@example.com', created_at: ago(200), subscription_status: 'free' },
  { id: 'I', name: 'Ivy', email: 'ivy@example.com', created_at: ago(300), subscription_status: 'cancelled' },
  { id: 'J', name: 'Jo', email: 'jo@example.com', created_at: ago(8), subscription_status: 'free' },
]
const studentRows = [
  { id: 's1', tutor_id: 'A', email: 'kid1@example.com' },
  { id: 's2', tutor_id: 'D', email: 'kid2@example.com' },
  { id: 's3', tutor_id: 'E', email: 'kid3@example.com' },
  { id: 's4', tutor_id: 'F', email: ' FAY@example.com ' }, // self-added
  { id: 's5', tutor_id: 'J', email: null }, // no email: counts as a real student
]
const lessonRows = [
  { id: 'l1', tutor_id: 'A', student_id: 's1', status: 'scheduled', created_at: ago(1), starts_at: ago(-3) }, // booked yesterday
  { id: 'l2', tutor_id: 'D', student_id: 's2', status: 'scheduled', created_at: ago(2), starts_at: ago(-2) },
  { id: 'l3', tutor_id: 'D', student_id: 's2', status: 'cancelled', created_at: ago(3), starts_at: ago(-1) }, // booked, then cancelled: not counted
  { id: 'l4', tutor_id: 'E', student_id: 's3', status: 'completed', created_at: ago(30), starts_at: ago(2) }, // taught 2 days ago: tutor E used
  { id: 'l5', tutor_id: 'B', student_id: 's1', status: 'scheduled', created_at: ago(8), starts_at: ago(-1) }, // booked 8 days ago: not in 7 days
  { id: 'l6', tutor_id: 'H', student_id: 's1', status: 'completed', created_at: ago(40), starts_at: ago(9) }, // taught 9 days ago: not used
  { id: 'l7', tutor_id: 'F', student_id: 's4', status: 'scheduled', created_at: ago(0, 2), starts_at: ago(-5) }, // booked two hours ago
]
const visitors = [{ id: 'v-A', tutor_id: 'A', first_seen_at: ago(60) }, { id: 'v-B', tutor_id: 'B', first_seen_at: ago(100) }]
const events = [
  { id: 'e1', visitor_id: 'v-A', kind: 'order_paid', path: null, plan: 'pro', created_at: ago(3) },
  { id: 'e2', visitor_id: 'v-B', kind: 'order_paid', path: null, plan: 'pro', created_at: ago(20) },
  { id: 'e3', visitor_id: 'v-A', kind: 'checkout_click', path: '/upgrade', plan: 'pro', created_at: ago(3, 1) },
]
const sample = () => createFakeDb({ tutors: tutorRows, students: studentRows, lessons: lessonRows, visitors, visitor_events: events })

/** The same database, but reading these tables answers an error (as the real one does when a table is missing). */
function failing(ok: FakeDb, ...broken: string[]): { from(table: string): unknown } {
  return {
    from: (table: string) => (broken.includes(table)
      ? Object.assign(ok.from(table), { then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: { message: 'relation does not exist' }, count: null }) })
      : ok.from(table)),
  }
}

const card = (html: string, id: string) => new RegExp(`data-card="${id}".*?data-value[^>]*>([^<]*)<`).exec(html)?.[1]
const stat = (html: string, id: string) => new RegExp(`data-stat="${id}".*?data-value[^>]*>([^<]*)<`).exec(html)?.[1]
const render = async (page: () => Promise<React.ReactElement>) => renderToStaticMarkup(await page())

// ---- the counting functions -------------------------------------------------------------------------------------------

test('percentOne: one decimal, half up, and nothing to divide by gives null', () => {
  assert.equal(customers.percentOne(3, 723), 0.4)
  assert.equal(customers.percentOne(1, 3), 33.3)
  assert.equal(customers.percentOne(2, 3), 66.7)
  assert.equal(customers.percentOne(0, 10), 0)
  assert.equal(customers.percentOne(10, 10), 100)
  assert.equal(customers.percentOne(1, 0), null)
})

test('buildCustomers: people on each plan from subscription_status, the rest are free, and the rate is paying over all tutors', () => {
  const c = customers.buildCustomers(tutorRows, studentRows, lessonRows, NOW)
  assert.deepEqual([c.tutors, c.pro, c.academy, c.free, c.paying, c.movedUpPercent], [10, 2, 1, 7, 3, 30])
  // a plan the Buyers page does not know ("cancelled", null) is not a paying tutor, as on the Buyers page
  assert.equal(customers.buildCustomers([{ id: 'x', email: null, created_at: ago(1), subscription_status: 'weird' }], [], [], NOW).paying, 0)
  assert.equal(customers.buildCustomers([], [], [], NOW).movedUpPercent, null)
})

test('buildCustomers: tutors used in 7 days, lessons booked in 7 days, and new tutors with a first REAL student', () => {
  const a = customers.buildCustomers(tutorRows, studentRows, lessonRows, NOW).activity
  // used: A (lesson booked yesterday), D (booked 2 days ago), E (taught 2 days ago), F (booked 2 hours ago); not B (booked 8 days ago), not H (taught 9 days ago)
  assert.equal(a.usedTutors7, 4)
  // booked in 7 days, cancelled not counted: l1, l2, l7
  assert.equal(a.lessonsBooked7, 3)
  // joined in 7 days: C (5), D (2), F (1), G (6 days 23 hours); in 30 days also E (20) and J (8)
  assert.deepEqual([a.newTutors7, a.newTutors30], [4, 6])
  // with a real student: D, E, J (no email); not F (self-added only), not C, G
  assert.deepEqual([a.newWithRealStudent7, a.newWithRealStudent30], [1, 3])
})

test('the windows have edges: seven days ago to the minute is in, a minute earlier is out; the future is out', () => {
  const t = (created_at: string) => ({ id: 'z', email: 'z@example.com', created_at, subscription_status: 'free' })
  const at = (iso: string) => customers.buildCustomers([t(iso)], [], [], NOW).activity.newTutors7
  assert.equal(at(ago(7)), 1)
  assert.equal(at(new Date(NOW.getTime() - 7 * 86_400_000 - 60_000).toISOString()), 0)
  assert.equal(at(new Date(NOW.getTime() + 60_000).toISOString()), 0)
  assert.equal(at('not a date'), 0)
})

test('buildPayingCustomers: the purchase day is the recorded order, else the sign-up day, and the new ones are counted by it', () => {
  const buyers = [
    { id: 'A', name: 'Ann', email: 'ann@example.com', created_at: ago(40), subscription_status: 'pro', students: [{ count: 2 }], lessons: [{ count: 5 }] },
    { id: 'B', name: 'Bo', email: 'bo@example.com', created_at: ago(90), subscription_status: 'pro' },
    { id: 'C', name: 'Cy', email: 'cy@example.com', created_at: ago(5), subscription_status: 'academy' },
    { id: 'X', name: 'Xi', email: 'xi@example.com', created_at: ago(1), subscription_status: 'free' }, // not paying: left out
  ]
  const { customers: list, newPaying } = customers.buildPayingCustomers(buyers, new Map([['A', ago(3)], ['B', ago(20)]]), NOW)
  assert.deepEqual(list.map(c => [c.id, c.boughtDateKnown, c.students, c.lessons]), [['A', true, 2, 5], ['C', false, 0, 0], ['B', true, 0, 0]], 'newest purchase first; a free tutor is not listed')
  assert.deepEqual(newPaying, { d7: 2, d30: 3, datedBySignup: 1 })
  assert.deepEqual(customers.buildPayingCustomers(buyers, new Map(), NOW).newPaying, { d7: 1, d30: 1, datedBySignup: 1 }, 'no order recorded for anyone: only Cy signed up inside 30 days')
})

// ---- what is read ----------------------------------------------------------------------------------------------------

test('loadOrderDates: the first recorded paid order of each tutor, and nothing for a tutor with none', async () => {
  const { dates, failedTables } = await data.loadOrderDates(sample() as never, ['A', 'B', 'C'])
  assert.deepEqual([...dates].sort(), [['A', ago(3)], ['B', ago(20)]])
  assert.deepEqual(failedTables, [])
})

test('loadPaying: the same totals as the Buyers page, the list with dates, and the note when the visitor tables cannot be read', async () => {
  const ok = await data.loadPaying(sample() as never, NOW)
  assert.deepEqual([ok.pro, ok.academy, ok.total, ok.failed, ok.listCut], [2, 1, 3, false, false])
  assert.deepEqual(ok.newPaying, { d7: 2, d30: 3, datedBySignup: 1 })
  const noTables = await data.loadPaying(failing(sample(), 'visitors', 'visitor_events') as never, NOW)
  assert.deepEqual(noTables.datesFailedTables.sort(), ['visitor_events', 'visitors'].filter(t => noTables.datesFailedTables.includes(t)).sort())
  assert.ok(noTables.datesFailedTables.length >= 1, 'the failure is named')
  assert.equal(noTables.customers.every(c => !c.boughtDateKnown), true, 'every date falls back to the sign-up day')
  const noTutors = await data.loadPaying(failing(sample(), 'tutors') as never, NOW)
  assert.equal(noTutors.failed, true)
})

// ---- the real first page ----------------------------------------------------------------------------------------------

test('/admin: only the admin gets in; a tutor and a signed-out visitor are turned away before any read', async () => {
  db = sample()
  currentUser = TUTOR
  await assert.rejects(OverviewPage(), /NEXT_REDIRECT:\/dashboard/)
  currentUser = null
  await assert.rejects(OverviewPage(), /NEXT_REDIRECT:\/login/)
  assert.equal(adminClients, 0, 'the service-role client is not even created for them')
  currentUser = ADMIN
  assert.ok((await render(OverviewPage)).includes('Khách hàng của tôi'))
})

test('/admin prints who pays: people on each plan, the rate, the new buyers, from the real rows', async () => {
  db = sample()
  const html = await render(OverviewPage)
  assert.deepEqual(
    Object.fromEntries(['pro', 'academy', 'free', 'moved-up', 'new-paying-7', 'new-paying-30'].map(id => [id, card(html, id)])),
    { pro: '2', academy: '1', free: '7', 'moved-up': '30%', 'new-paying-7': '2', 'new-paying-30': '3' },
  )
  assert.match(html, /3 trong 10 gia sư đang trả phí/)
  assert.ok(!html.includes('overview-error'), 'no error box when every read worked')
})

test('/admin prints how they use it: tutors used, lessons booked, new tutors with a first real student, sign-ups per week', async () => {
  db = sample()
  const html = await render(OverviewPage)
  assert.deepEqual(
    Object.fromEntries(['used-7', 'booked-7', 'new-real-7', 'new-real-30'].map(id => [id, card(html, id)])),
    { 'used-7': '4', 'booked-7': '3', 'new-real-7': '1', 'new-real-30': '3' },
  )
  assert.match(html, /trong 4 gia sư đăng ký 7 ngày qua/)
  assert.equal([...html.matchAll(/data-week="/g)].length, 12)
  assert.match(html, /Tuần này/)
})

test('/admin keeps the platform-wide numbers of T-0680 under "Toàn nền tảng"', async () => {
  db = sample()
  const html = await render(OverviewPage)
  assert.match(html, /Toàn nền tảng/)
  assert.equal(stat(html, 'tutors'), '10')
  assert.equal(stat(html, 'total-students'), '5')
  assert.equal(stat(html, 'real-students'), '4')
  assert.equal(stat(html, 'self-students'), '1')
  assert.equal(stat(html, 'lessons'), '7')
})

test('/admin lists the paying tutors, each name a link to that person’s page, newest purchase first', async () => {
  db = sample()
  const html = await render(OverviewPage)
  const rows = [...html.matchAll(/data-customer="([^"]+)"[^>]*>.*?href="([^"]+)"[^>]*>([^<]+)</g)].map(m => [m[1], m[2], m[3]])
  assert.deepEqual(rows, [['A', '/super-admin/people/A', 'Ann'], ['C', '/super-admin/people/C', 'Cy'], ['B', '/super-admin/people/B', 'Bo']])
  assert.match(html, /\(đăng ký\)/, 'Cy has no recorded order: her sign-up day stands in, and the row says so')
  assert.match(html, /1 trong các người mới nâng gói chưa có ngày thanh toán/)
})

test('/admin says when the purchase dates could not be read (migration 015 not applied), and still shows the people', async () => {
  db = failing(sample(), 'visitors', 'visitor_events')
  const html = await render(OverviewPage)
  assert.match(html, /data-testid="date-note"[^>]*>Chưa đọc được ngày thanh toán/)
  assert.equal(card(html, 'pro'), '2')
  assert.equal(card(html, 'academy'), '1')
})

test('/admin shows a dash, never a 0, for a number whose table could not be read', async () => {
  db = failing(sample(), 'tutors')
  const html = await render(OverviewPage)
  assert.match(html, /data-testid="overview-error"[^>]*>Could not read the tutors table/)
  for (const id of ['pro', 'academy', 'moved-up', 'free', 'new-paying-7', 'used-7', 'booked-7']) assert.equal(card(html, id), '—', id)
})

test('an empty database shows zeros, no rate, and no error', async () => {
  db = createFakeDb({})
  const html = await render(OverviewPage)
  assert.equal(card(html, 'pro'), '0')
  assert.equal(card(html, 'moved-up'), '—', 'no tutors: no rate')
  assert.match(html, /Chưa có ai trả phí/)
  assert.ok(!html.includes('overview-error'))
})

test('nothing is written: the pages only read', async () => {
  const d = sample()
  db = d
  await render(OverviewPage)
  await render(RevenuePage)
  assert.deepEqual(d.log, [])
})

// ---- the page that was called Revenue ---------------------------------------------------------------------------------

test('Revenue is renamed and says what it is: students paying tutors, not the owner’s income', async () => {
  db = sample()
  const html = await render(RevenuePage)
  assert.match(html, /<h1[^>]*>Tiền học sinh trả cho gia sư<\/h1>/)
  assert.match(html, /data-testid="revenue-subtitle"[^>]*>Thanh toán buổi học của học sinh cho gia sư, không phải thu nhập của bạn</)
  assert.doesNotMatch(html, />Total Revenue<|>Revenue<\/h1>|Platform-wide payment overview/)
  assert.match(html, /Đây là tiền của gia sư, không phải của bạn/)
  const nav = ADMIN_NAV.find(n => n.href === '/admin/revenue')!
  assert.equal(nav.label, 'Tiền học sinh trả')
  assert.equal(ADMIN_NAV.find(n => n.href === '/admin')!.label, 'Khách hàng của tôi')
})

test('Revenue: only the admin gets in', async () => {
  db = sample()
  currentUser = TUTOR
  await assert.rejects(RevenuePage(), /NEXT_REDIRECT:\/dashboard/)
  currentUser = null
  await assert.rejects(RevenuePage(), /NEXT_REDIRECT:\/login/)
  assert.equal(adminClients, 0)
})

test('Revenue: with no Polar key on the server it says "chưa đọc được" and gives no number', async () => {
  db = sample()
  const html = await render(RevenuePage)
  assert.match(html, /data-testid="plan-income-unreadable"[^>]*>chưa đọc được: máy chủ chưa có khoá đọc Polar/)
  assert.doesNotMatch(html, /plan-income-value/)
})

test('Revenue: with a readable Polar it shows the monthly income of the plans, and asks Polar for nothing but a read', async () => {
  db = sample()
  process.env.POLAR_ACCESS_TOKEN = 'polar_test_token_value'
  const calls: { url: string; method: string }[] = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (url: string, init?: { method?: string }) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET' })
    return { ok: true, status: 200, json: async () => ({ items: [{ amount: 1200, currency: 'usd', recurring_interval: 'month' }, { amount: 2400, currency: 'usd', recurring_interval: 'year' }, { amount: 3000, currency: 'usd', recurring_interval: 'month' }] }) }
  }) as unknown as typeof fetch
  try {
    const html = await render(RevenuePage)
    assert.match(html, /data-testid="plan-income-value"[^>]*>\$44\.00</)
    assert.match(html, /Cộng từ 3 gói đang chạy trên Polar/)
    assert.doesNotMatch(html, /plan-income-unreadable|polar_test_token_value/)
    assert.deepEqual(calls.map(c => c.method), ['GET'])
    assert.match(calls[0].url, /^https:\/\/api\.polar\.sh\/v1\/subscriptions\/\?active=true&limit=100&page=1$/)
  } finally {
    globalThis.fetch = realFetch
  }
})

// ---- the Polar reader --------------------------------------------------------------------------------------------------

type Reply = { ok: boolean; status: number; json(): Promise<unknown> }
const reply = (status: number, body: unknown): Reply => ({ ok: status >= 200 && status < 300, status, json: async () => body })

function pretendPolar(handler: (url: string, headers: Record<string, string>, method: string) => Reply | Promise<Reply>) {
  const seen: { url: string; headers: Record<string, string>; method: string }[] = []
  const fetchImpl = (async (url: string, init: { method: 'GET'; headers: Record<string, string> }) => {
    seen.push({ url, headers: init.headers, method: init.method })
    return handler(url, init.headers, init.method)
  }) as unknown as Parameters<typeof polar.readPolarIncome>[1]
  return { fetchImpl, seen }
}
const ENV = { POLAR_ACCESS_TOKEN: 'polar_oat_secret_value_123' }

test('Polar: monthly and yearly prices are added as a monthly amount per currency (a year is one twelfth)', async () => {
  const { fetchImpl, seen } = pretendPolar(() => reply(200, { items: [
    { amount: 1200, currency: 'usd', recurring_interval: 'month' },
    { amount: 12000, currency: 'USD', recurring_interval: 'year' },
    { amount: 5000, currency: 'eur', recurring_interval: 'month' },
  ] }))
  const r = await polar.readPolarIncome(ENV, fetchImpl)
  assert.deepEqual(r, { ok: true, subscriptions: 3, monthly: [{ currency: 'EUR', amount: 50 }, { currency: 'USD', amount: 22 }], truncated: false })
  assert.equal(seen.length, 1)
  assert.equal(seen[0].method, 'GET')
  assert.equal(seen[0].headers.Authorization, 'Bearer polar_oat_secret_value_123')
})

test('Polar: several pages are all read, and a page of 100 asks for the next one', async () => {
  const full = Array.from({ length: 100 }, () => ({ amount: 100, currency: 'usd', recurring_interval: 'month' }))
  const { fetchImpl, seen } = pretendPolar(url => reply(200, { items: url.endsWith('page=1') ? full : url.endsWith('page=2') ? full.slice(0, 5) : [] }))
  const r = await polar.readPolarIncome(ENV, fetchImpl)
  assert.deepEqual(r, { ok: true, subscriptions: 105, monthly: [{ currency: 'USD', amount: 105 }], truncated: false })
  assert.deepEqual(seen.map(s => s.url.match(/page=(\d+)/)![1]), ['1', '2'])
})

test('Polar: a read that never ends stops after twenty pages and says it was cut', async () => {
  const full = Array.from({ length: 100 }, () => ({ amount: 100, currency: 'usd', recurring_interval: 'month' }))
  const { fetchImpl, seen } = pretendPolar(() => reply(200, { items: full }))
  const r = await polar.readPolarIncome(ENV, fetchImpl)
  assert.equal(seen.length, 20)
  assert.equal(r.ok && r.truncated, true)
})

test('Polar: no key means no request at all, and a sentence saying it cannot be read', async () => {
  let asked = 0
  const r = await polar.readPolarIncome({}, (async () => { asked++; return reply(200, { items: [] }) }) as never)
  assert.deepEqual(r, { ok: false, reason: 'no_token', detail: polar.NOT_READABLE.no_token })
  assert.equal(asked, 0)
  assert.equal((await polar.readPolarIncome({ POLAR_ACCESS_TOKEN: '   ' }, (async () => { asked++; return reply(200, {}) }) as never)).ok, false)
  assert.equal(asked, 0)
})

test('Polar: a refused key, a down Polar, a broken answer and a subscription it does not understand are each "not readable", never a made-up number', async () => {
  const cases: [string, Reply | (() => never), string][] = [
    ['401', reply(401, { error: 'no' }), 'refused'], ['403', reply(403, {}), 'refused'],
    ['500', reply(500, {}), 'unreachable'], ['404', reply(404, {}), 'unreachable'],
    ['not a list', reply(200, { items: 'x' }), 'unexpected'], ['no items', reply(200, {}), 'unexpected'], ['null', reply(200, null), 'unexpected'],
    ['unknown interval', reply(200, { items: [{ amount: 100, currency: 'usd', recurring_interval: 'week' }] }), 'unexpected'],
    ['no amount', reply(200, { items: [{ currency: 'usd', recurring_interval: 'month' }] }), 'unexpected'],
    ['negative amount', reply(200, { items: [{ amount: -5, currency: 'usd', recurring_interval: 'month' }] }), 'unexpected'],
    ['odd currency', reply(200, { items: [{ amount: 5, currency: 'dollars', recurring_interval: 'month' }] }), 'unexpected'],
    ['not an object', reply(200, { items: [7] }), 'unexpected'],
  ]
  for (const [name, answer, reason] of cases) {
    const r = await polar.readPolarIncome(ENV, (async () => answer) as never)
    assert.equal(r.ok, false, name)
    assert.equal((r as { reason: string }).reason, reason, name)
  }
  assert.equal((await polar.readPolarIncome(ENV, (async () => { throw new Error('network down') }) as never) as { reason: string }).reason, 'unreachable')
  const broken = { ok: true, status: 200, json: async () => { throw new Error('bad json') } }
  assert.equal((await polar.readPolarIncome(ENV, (async () => broken) as never) as { reason: string }).reason, 'unexpected')
})

test('Polar: what the reader says never holds the key, the address of Polar or anything Polar answered', async () => {
  const secretAnswer = { items: [{ amount: 1, currency: 'usd', recurring_interval: 'month', customer: { email: 'someone@example.com' }, id: 'sub_secret_1' }], detail: 'token polar_oat_secret_value_123 refused' }
  for (const answer of [reply(401, secretAnswer), reply(500, secretAnswer), reply(200, { ...secretAnswer, items: 'x' })]) {
    const text = JSON.stringify(await polar.readPolarIncome({ ...ENV, POLAR_API_BASE: 'https://polar.internal.example/' }, (async () => answer) as never))
    assert.doesNotMatch(text, /polar_oat_secret_value_123|someone@example\.com|sub_secret_1|polar\.internal/)
  }
  const ok = JSON.stringify(await polar.readPolarIncome(ENV, (async () => reply(200, secretAnswer)) as never))
  assert.doesNotMatch(ok, /polar_oat_secret_value_123|someone@example\.com|sub_secret_1/)
})

test('Polar: the address can be moved with the variable the upgrade route already uses, and a trailing slash is ignored', async () => {
  const { fetchImpl, seen } = pretendPolar(() => reply(200, { items: [] }))
  await polar.readPolarIncome({ ...ENV, POLAR_API_BASE: 'https://sandbox-api.polar.sh//' }, fetchImpl)
  assert.match(seen[0].url, /^https:\/\/sandbox-api\.polar\.sh\/v1\/subscriptions\//)
  assert.match(read('lib/polar-income.ts'), /env\.POLAR_API_BASE/)
  assert.doesNotMatch(read('lib/polar-income.ts'), /process\.env\.[A-Z_]*(KEY|SECRET)/, 'no other variable is read')
})

test('Polar: one kind of request only, a GET, and the reader has no way to write', () => {
  const src = read('lib/polar-income.ts')
  assert.deepEqual([...new Set([...src.matchAll(/method: '(\w+)'/g)].map(m => m[1]))], ['GET'])
  assert.doesNotMatch(src, /method: '(POST|PUT|PATCH|DELETE)'|body: (JSON|`|'|{)/)
})

// ---- the menu and the admin check on every page --------------------------------------------------------------------------

function pagesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = path.join(dir, name)
    return statSync(p).isDirectory() ? pagesUnder(p) : name === 'page.tsx' ? [p] : []
  })
}

test('Super admin is in the same menu as the rest of /admin, and every admin page has a menu entry', () => {
  const adminRoot = path.join(SRC, 'app/(admin)')
  const routes = pagesUnder(adminRoot).map(f => path.relative(adminRoot, path.dirname(f)).replace(/\\/g, '/'))
    .map(r => '/' + r.replace(/^admin$/, 'admin').replace(/^$/, ''))
  const HIDDEN = ['/admin/migrate'] // opened by link from Settings, not part of the daily menu
  const hrefs = ADMIN_NAV.map(n => n.href)
  assert.ok(hrefs.includes('/super-admin'), 'Super admin is in the menu')
  for (const r of routes) {
    if (HIDDEN.includes(r) || /\[/.test(r)) continue // a person's page is reached from a list, under its parent
    assert.ok(hrefs.includes(r), `${r} has no entry in the admin menu (src/components/admin/admin-nav.ts)`)
  }
  // both the desktop sidebar and the phone drawer read that one list
  assert.match(read('components/admin/AdminSidebar.tsx'), /ADMIN_NAV\.map/)
  assert.match(read('components/admin/AdminMobileNav.tsx'), /ADMIN_NAV\.map/)
})

test('every page of the admin area, and its layout, runs the admin check before it opens the database client', () => {
  const adminRoot = path.join(SRC, 'app/(admin)')
  const pages = pagesUnder(adminRoot)
  assert.ok(pages.length >= 10, `found ${pages.length} admin pages`)
  for (const file of pages) {
    const src = readFileSync(file, 'utf8')
    const rel = path.relative(SRC, file).replace(/\\/g, '/')
    if (/createAdminClient\(/.test(src)) {
      const gate = src.indexOf('await requireAdminPage()')
      assert.ok(gate > 0 && gate < src.indexOf('createAdminClient('), `${rel}: the admin check must come before the service-role client`)
    } else {
      assert.match(src, /await requireAdminPage\(\)|'use client'/, `${rel}: no admin check`)
    }
  }
  assert.match(read('app/(admin)/layout.tsx'), /await requireAdminPage\(\)/)
})
