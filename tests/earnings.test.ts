// T-0821 (G2): the Earnings page, Payments and Reports in one. Runs the pure rules (period, trend, chart series, CSV),
// then the REAL page and the REAL export route over a stand-in Supabase: the numbers and their trend, the period switch,
// the empty and the error state, the Reports tab gate, and a second tutor who must see none of the first one's rows.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import {
  attendanceOf, computeEarnings, csvCell, filterHistory, historyCsv, parsePeriod, parseStatus, rangeOf, trendOf, type LessonRow,
} from '@/lib/earnings'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')
const DAY = 86_400_000
const NOW = new Date('2026-10-23T12:00:00Z')
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString()
const L = (id: string, daysAgo: number, price: number, pay: string, status = 'completed', student = 'Ann'): LessonRow =>
  ({ id, starts_at: ago(daysAgo), price, payment_status: pay, status, duration_minutes: 60, students: { id: `s-${student}`, name: student } })

// ---- pure rules --------------------------------------------------------------------------------------------------

test('a period that is not one of the four is the default (the address is typed by the visitor)', () => {
  assert.equal(parsePeriod('30d'), '30d')
  assert.equal(parsePeriod('all'), 'all')
  for (const bad of [null, undefined, '', '7d', '30D', '90d; drop table', '../x']) assert.equal(parsePeriod(bad as string), '90d')
  assert.equal(parseStatus('paid'), 'paid')
  for (const bad of [null, '', 'PAID', 'x']) assert.equal(parseStatus(bad as string), 'all')
})

test('a period ends now; the one before it is the same length; all time has none', () => {
  const r = rangeOf('30d', NOW)
  assert.equal(r.end - r.start, 30 * DAY)
  assert.equal(r.prevEnd, r.start)
  assert.equal(r.prevEnd! - r.prevStart!, 30 * DAY)
  assert.equal(rangeOf('12m', NOW).end - rangeOf('12m', NOW).start, 365 * DAY)
  const all = rangeOf('all', NOW)
  assert.equal(all.prevStart, null)
  assert.equal(all.start, -Infinity)
})

test('trend: a percentage against the earlier period, and "none" instead of an invented number when there is nothing to compare', () => {
  assert.deepEqual(trendOf(150, 100), { pct: 50, dir: 'up' })
  assert.deepEqual(trendOf(50, 100), { pct: -50, dir: 'down' })
  assert.deepEqual(trendOf(100, 100), { pct: 0, dir: 'flat' })
  assert.deepEqual(trendOf(100, 0), { pct: null, dir: 'none' })
  assert.deepEqual(trendOf(100, null), { pct: null, dir: 'none' })
  assert.equal(trendOf(2, 3).pct, -33)
})

const DATA: LessonRow[] = [
  L('a', 5, 40, 'paid'), L('b', 10, 40, 'paid', 'completed', 'Bo'), L('c', 12, 40, 'pending'), L('d', 15, 40, 'paid', 'cancelled'),
  L('e', 40, 30, 'paid'), L('f', 50, 30, 'paid'), L('g', 70, 30, 'paid', 'completed', 'Bo'), L('h', 200, 25, 'paid'),
]

test('earned, owed, lessons and cancellation for a period, each against the period before', () => {
  const e = computeEarnings(DATA, NOW, '30d')
  assert.equal(e.earned.value, 80, 'a cancelled lesson is not earned')
  assert.equal(e.earned.previous, 60)
  assert.deepEqual(e.earned.trend, { pct: 33, dir: 'up' })
  assert.equal(e.pending.value, 40)
  assert.equal(e.lessons.value, 3, 'cancelled lessons are not counted')
  assert.equal(e.cancellation.value, 25)
  assert.equal(e.cancellation.cancelled, 1)
  assert.equal(e.cancellation.total, 4)
  assert.equal(e.empty, false)
})

test('switching the period changes the numbers; all time has no trend', () => {
  assert.equal(computeEarnings(DATA, NOW, '90d').earned.value, 80 + 60 + 30)
  assert.equal(computeEarnings(DATA, NOW, '12m').earned.value, 80 + 60 + 30 + 25)
  const all = computeEarnings(DATA, NOW, 'all')
  assert.equal(all.earned.value, 195)
  assert.deepEqual(all.earned.trend, { pct: null, dir: 'none' })
})

test('the chart has 5 weeks, 13 weeks or 12 months, and its bars add up to what was earned', () => {
  assert.equal(computeEarnings(DATA, NOW, '30d').buckets.length, 5)
  assert.equal(computeEarnings(DATA, NOW, '90d').buckets.length, 13)
  const y = computeEarnings(DATA, NOW, '12m')
  assert.equal(y.buckets.length, 12)
  assert.equal(y.bucketUnit, 'month')
  const q = computeEarnings(DATA, NOW, '90d')
  assert.equal(q.buckets.reduce((s, b) => s + b.revenue, 0), q.earned.value)
})

test('top students are ranked by money paid and the history is newest first with priced lessons only', () => {
  const e = computeEarnings([...DATA, { ...L('z', 1, 0, 'free'), price: null }], NOW, '90d')
  assert.equal(e.top[0].name, 'Ann')
  assert.equal(e.top[0].revenue, 40 + 30 + 30)
  assert.ok(e.history.every(l => l.price != null))
  assert.deepEqual(e.history.map(l => l.id).slice(0, 2), ['a', 'b'])
  assert.deepEqual(filterHistory(e.history, 'pending').map(l => l.id), ['c'])
})

test('attendance counts held, cancelled and no-show lessons in the period', () => {
  const a = attendanceOf([...DATA, L('n', 3, 40, 'pending', 'no_show')], NOW, '30d')
  assert.deepEqual(a, { completed: 3, cancelled: 1, noShow: 1, rate: 60 })
  assert.equal(attendanceOf([], NOW, '30d').rate, 0)
})

test('CSV: every cell quoted, quotes doubled, and a cell a spreadsheet would run as a formula is defused', () => {
  assert.equal(csvCell('plain'), '"plain"')
  assert.equal(csvCell('say "hi"'), '"say ""hi"""')
  for (const evil of ['=HYPERLINK("http://x")', '+1+1', '-2+3', '@SUM(A1)']) assert.ok(csvCell(evil).startsWith(`"'`), evil)
  const csv = historyCsv([{ ...L('q', 2, 12.5, 'paid', 'completed', '=cmd|calc'), students: { id: 's', name: '=cmd|calc' } }], 'EUR')
  const [head, row] = csv.trim().split('\r\n')
  assert.equal(head, '"Date","Student","Duration (min)","Amount (EUR)","Payment status","Lesson status"')
  assert.match(row, /^"2026-10-21","'=cmd\|calc","60","12.50","paid","completed"$/)
})

// ---- the real page and route over a stand-in Supabase ------------------------------------------------------------

const ME = '30000000-0000-4000-8000-000000000001'
const OTHER = '30000000-0000-4000-8000-000000000002'
let session: { id: string } | null
let tables: Record<string, Record<string, unknown>[]>
let lessonsFail = false
let reads: { table: string; col: string; val: unknown }[]

function chain(table: string) {
  let rows = tables[table] ?? []
  const q: Record<string, unknown> = {
    select: () => q,
    eq: (col: string, val: unknown) => { reads.push({ table, col, val }); rows = rows.filter(r => r[col] === val); return q },
    order: () => q,
    maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
    single: async () => ({ data: rows[0] ?? null, error: null }),
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(table === 'lessons' && lessonsFail ? { data: null, error: { message: 'boom' } } : { data: rows, error: null }).then(res, rej),
  }
  return q
}
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: { createAdminClient: () => ({ from: chain }), createClient: async () => ({ from: chain, auth: { getUser: async () => ({ data: { user: session } }) } }) },
})
mock.module('next/navigation', {
  namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, redirect: (to: string) => { throw new Error(`NEXT_REDIRECT ${to}`) }, useRouter: () => ({ push() {}, replace() {} }), usePathname: () => '/earnings' },
})
const page = (await import('@/app/(dashboard)/earnings/page.tsx')).default as (p: { searchParams: Promise<Record<string, string>> }) => Promise<React.ReactElement>
const exportRoute = await import('@/app/api/earnings/export/route.ts')

const real = (id: string, tutor: string, days: number, price: number, pay: string, status = 'completed', name = 'Ann') =>
  ({ id, tutor_id: tutor, starts_at: new Date(Date.now() - days * DAY).toISOString(), price, payment_status: pay, status, duration_minutes: 60, students: { id: `s-${name}`, name } })

beforeEach(() => {
  session = { id: ME }; lessonsFail = false; reads = []
  tables = {
    tutors: [{ id: ME, subscription_status: 'pro', currency: 'EUR' }, { id: OTHER, subscription_status: 'free', currency: 'USD' }],
    lessons: [
      real('m1', ME, 3, 40, 'paid'), real('m2', ME, 8, 40, 'paid', 'completed', 'Bo'), real('m3', ME, 12, 40, 'pending'),
      real('m4', ME, 45, 20, 'paid'), real('x1', OTHER, 2, 999, 'paid', 'completed', 'Stranger Danger'),
    ],
  }
})
const html = async (sp: Record<string, string> = {}) => renderToStaticMarkup(await page({ searchParams: Promise.resolve(sp) }))

test('the page shows the tutor\'s money in their currency with a trend and the period switch', async () => {
  const h = await html({ period: '30d' })
  assert.match(h, /data-testid="kpi-earned"[\s\S]*?€80\.00/)
  assert.match(h, /data-testid="kpi-pending"[\s\S]*?€40\.00/)
  assert.match(h, /\+300%/, 'earned 80 now against 20 in the 30 days before')
  assert.match(h, /aria-label="Period"/)
  for (const label of ['30 days', '90 days', '12 months', 'All time']) assert.ok(h.includes(label), label)
  assert.match(h, /<a[^>]*aria-current="true"[^>]*>30 days</)
  // the switch changes the numbers
  assert.match(await html({ period: 'all' }), /data-testid="kpi-earned"[\s\S]*?€100\.00/)
  assert.match(await html({ period: 'all' }), /No comparison/)
})

test('a second tutor\'s rows are never read or shown (the tutor id is the session\'s)', async () => {
  const h = await html({ period: 'all' })
  assert.ok(!h.includes('Stranger Danger') && !h.includes('999'))
  assert.ok(reads.filter(r => r.table === 'lessons').every(r => r.col === 'tutor_id' && r.val === ME))
  session = { id: OTHER }
  const theirs = await html({ period: 'all' })
  assert.ok(!theirs.includes('Bo<') && !theirs.includes('€'), 'the first tutor\'s lessons must not appear for the other tutor')
  assert.match(theirs, /\$999\.00/)
  session = null
  await assert.rejects(html(), /NEXT_REDIRECT \/login/)
})

test('payments tab: the history, a status filter, an export link that carries the period and status', async () => {
  const h = await html({ tab: 'payments', period: '90d', status: 'pending' })
  assert.match(h, /Payment history/)
  assert.match(h, /href="\/api\/earnings\/export\?period=90d&amp;status=pending"/)
  assert.match(h, /1 record/)
  assert.ok(!h.includes('>Bo<'), 'only pending rows are listed')
  assert.match(await html({ tab: 'payments', period: '90d', status: 'refunded' }), /data-testid="history-empty"/)
})

test('empty state: a tutor with no lessons is told what this page is for and gets a next step', async () => {
  tables.lessons = []
  const h = await html()
  assert.match(h, /data-testid="earnings-empty"/)
  assert.match(h, /No earnings yet/)
  assert.match(h, /href="\/lessons\/new"/)
  assert.ok(!h.includes('kpi-earned'))
})

test('error state: a failed read says what failed, that nothing changed, and offers a retry (never a page of zeros)', async () => {
  lessonsFail = true
  const h = await html({ tab: 'payments', period: '30d' })
  assert.match(h, /data-testid="earnings-error"/)
  assert.match(h, /We could not load your earnings/)
  assert.match(h, /Nothing was changed/)
  assert.match(h, /href="\/earnings\?tab=payments&amp;period=30d"[^>]*>[\s\S]*?Try again/)
  assert.ok(!h.includes('kpi-earned') && !h.includes('€0.00'))
  assert.ok(!h.includes('boom'), 'the error text is not shown')
})

test('reports tab: shown to Pro, locked on the server for Free (the report is never read)', async () => {
  const pro = await html({ tab: 'reports', period: '90d' })
  assert.match(pro, /data-testid="attendance-rate"/)
  assert.match(pro, /Accounting export/)
  tables.tutors = [{ id: ME, subscription_status: 'free', currency: 'EUR' }]
  reads = []
  const free = await html({ tab: 'reports' })
  assert.ok(!free.includes('attendance-rate') && !free.includes('Accounting export'))
  assert.ok(!reads.some(r => r.table === 'lessons'), 'a locked report reads no lessons')
})

test('an address that is not a tab, a period or a status falls back to the overview, 90 days, all', async () => {
  const h = await html({ tab: 'x', period: 'drop', status: 'y' })
  assert.match(h, /data-testid="kpi-earned"/)
  assert.match(h, /href="\/api\/earnings\/export\?period=90d&amp;status=all"/)
})

const call = (qs = '') => exportRoute.GET(new Request(`http://localhost/api/earnings/export${qs}`))

test('export: needs a session, exports only the tutor\'s own lessons, honours period and status, defuses formulas', async () => {
  session = null
  assert.equal((await call()).status, 401)
  session = { id: ME }
  const res = await call('?period=all&status=all')
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type')!, /text\/csv/)
  assert.match(res.headers.get('content-disposition')!, /tutafy-earnings-all-all\.csv/)
  const csv = await res.text()
  assert.match(csv, /"Amount \(EUR\)"/)
  assert.equal(csv.trim().split('\r\n').length, 1 + 4, 'a header and my four lessons')
  assert.ok(!csv.includes('Stranger Danger') && !csv.includes('999'))
  const pending = (await (await call('?period=all&status=pending')).text()).trim().split('\r\n')
  assert.equal(pending.length, 2)
  tables.lessons.push(real('ev', ME, 1, 10, 'paid', 'completed', '=1+1'))
  assert.match(await (await call('?period=all')).text(), /"'=1\+1"/)
  lessonsFail = true
  assert.equal((await call()).status, 500)
})

test('source: the page sits in the shared frame (no root width), and Payments and Reports redirect to it', () => {
  const read = (rel: string) => readFileSync(path.join(SRC, '..', rel), 'utf8')
  assert.doesNotMatch(read('src/app/(dashboard)/earnings/page.tsx'), /max-w-\[/)
  assert.match(read('src/app/(dashboard)/payments/page.tsx'), /redirect\('\/earnings\?tab=payments'\)/)
  assert.match(read('src/app/(dashboard)/reports/page.tsx'), /redirect\('\/earnings\?tab=reports'\)/)
  assert.match(read('src/proxy.ts'), /startsWith\('\/earnings'\)/)
})
