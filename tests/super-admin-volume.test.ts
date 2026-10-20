// Review T-0610 (round 2): the database answers at most 1000 rows per request, and one
// active tutor leaves thousands of page views. /super-admin must still show every buyer's
// journey, order date and filter correctly, and say so when it cannot read everything.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createFakeDb, SERVER_ROW_CAP } from './support/fake-db.ts'

const { loadSuperAdmin, MAX_PAGES, FALLBACK_PAGE_VIEWS, ROWS_PER_REQUEST } = await import('@/lib/super-admin-data.ts')

const NO_RANGE = { from: null, to: null }
const at = (iso: string) => `${iso}.000Z`
let eventId = 0
const ev = (visitor_id: string, kind: string, path: string | null, created_at: string, plan: string | null = null) =>
  ({ id: ++eventId, visitor_id, kind, path, plan, created_at })

/** `n` page views of one visitor, one second apart from `start`, alternating two paths so none are merged. */
function usage(visitorId: string, n: number, startMs: number, paths = ['/dashboard', '/students']) {
  return Array.from({ length: n }, (_, i) =>
    ev(visitorId, 'page_view', paths[i % paths.length], new Date(startMs + i * 1000).toISOString()))
}

test('the fake database answers at most 1000 rows per request, like the real service', async () => {
  const rows = Array.from({ length: 1200 }, (_, i) => ({ id: i + 1 }))
  const db = createFakeDb({ t: rows })
  assert.equal(SERVER_ROW_CAP, 1000)
  assert.equal(ROWS_PER_REQUEST, 1000)
  assert.equal(((await db.from('t').select('*').order('id')) as { data: unknown[] }).data.length, 1000)
  assert.equal(((await db.from('t').select('*').limit(5000)) as { data: unknown[] }).data.length, 1000)
  const second = (await db.from('t').select('*').order('id').range(1000, 1999)) as { data: { id: number }[] }
  assert.deepEqual([second.data.length, second.data[0].id], [200, 1001])
})

function twoBuyers() {
  return createFakeDb({
    tutors: [
      { id: 'OLD', name: 'Old Buyer', email: 'old@example.com', created_at: at('2026-05-01T10:00:00'), subscription_status: 'pro', students: [], lessons: [] },
      { id: 'NEW', name: 'New Buyer', email: 'new@example.com', created_at: at('2026-09-20T10:00:00'), subscription_status: 'pro', students: [], lessons: [] },
    ],
    visitors: [
      { id: 'vOld', first_seen_at: at('2026-05-02T09:00:00'), country: 'US', first_source: 'google_search', first_path: '/', tutor_id: 'OLD' },
      { id: 'vNew', first_seen_at: at('2026-10-01T09:00:00'), country: 'VN', first_source: 'ai_claude', first_path: '/blog/y', tutor_id: 'NEW' },
    ],
    visitor_events: [
      // the old buyer: a short journey, the purchase, then 1200 page views of everyday use (older than the new buyer's rows)
      ev('vOld', 'page_view', '/', at('2026-06-01T09:00:00')),
      ev('vOld', 'page_view', '/blog/x', at('2026-06-01T09:01:00')),
      ev('vOld', 'page_view', '/upgrade', at('2026-06-01T09:02:00')),
      ev('vOld', 'checkout_click', '/upgrade', at('2026-06-01T09:03:00'), 'pro'),
      ev('vOld', 'order_paid', null, at('2026-06-01T09:10:00'), 'pro'),
      ...usage('vOld', 1200, Date.parse('2026-07-01T08:00:00Z')),
      // the new buyer
      ev('vNew', 'page_view', '/blog/y', at('2026-10-01T09:00:00')),
      ev('vNew', 'page_view', '/', at('2026-10-01T09:01:00')),
      ev('vNew', 'page_view', '/register', at('2026-10-01T09:05:00')),
      ev('vNew', 'page_view', '/upgrade', at('2026-10-12T08:00:00')),
      ev('vNew', 'checkout_click', '/upgrade', at('2026-10-12T08:01:00'), 'pro'),
      ev('vNew', 'order_paid', null, at('2026-10-12T08:09:00'), 'pro'),
    ],
  })
}

test('an older buyer with 1200 events in the same group no longer hides the newer buyer', async () => {
  const d = await loadSuperAdmin(twoBuyers(), NO_RANGE)
  const by = Object.fromEntries(d.buyers.map(b => [b.id, b]))

  // the new buyer: every page, the right last page before checkout, the right order date
  assert.deepEqual(by.NEW.pages, ['/blog/y', '/', '/register', '/upgrade'])
  assert.equal(by.NEW.lastBeforeCheckout, '/upgrade')
  assert.equal(by.NEW.boughtOn, at('2026-10-12T08:09:00'))
  assert.equal(by.NEW.tracked, true)
  assert.equal(by.NEW.firstSource, 'ai_claude')

  // the old buyer: only the journey up to the purchase, not 1200 later page views
  assert.deepEqual(by.OLD.pages, ['/', '/blog/x', '/upgrade'])
  assert.equal(by.OLD.lastBeforeCheckout, '/upgrade')
  assert.equal(by.OLD.boughtOn, at('2026-06-01T09:10:00'))

  assert.equal(d.failed, false)
  assert.equal(d.readTruncated, false)
})

test('the date filter uses the real order dates for both, even with the heavy older buyer', async () => {
  const october = await loadSuperAdmin(twoBuyers(), { from: '2026-10-01', to: '2026-10-31' })
  assert.deepEqual(october.buyers.map(b => b.id), ['NEW']) // would be empty if the order date fell back to the sign-up date (September)
  assert.deepEqual([october.pro, october.total], [1, 1])
  const june = await loadSuperAdmin(twoBuyers(), { from: '2026-06-01', to: '2026-06-30' })
  assert.deepEqual(june.buyers.map(b => b.id), ['OLD'])
})

test('a buyer with no order or checkout event shows only their first page views, not thousands', async () => {
  const db = createFakeDb({
    tutors: [{ id: 'T', name: 'Early', email: 'early@example.com', created_at: at('2026-05-01T10:00:00'), subscription_status: 'pro', students: [], lessons: [] }],
    visitors: [{ id: 'v', first_seen_at: at('2026-08-01T09:00:00'), country: 'DE', first_source: 'direct', first_path: '/dashboard', tutor_id: 'T' }],
    visitor_events: usage('v', 1200, Date.parse('2026-08-01T09:00:00Z')),
  })
  const d = await loadSuperAdmin(db, NO_RANGE)
  assert.equal(d.buyers[0].pages.length, FALLBACK_PAGE_VIEWS)
  assert.equal(d.buyers[0].boughtOn, at('2026-05-01T10:00:00')) // no order seen: the sign-up date
})

test('the funnel counts every checkout and paid order of its visitors, however many events one visitor has', async () => {
  const visitors = ['s1', 's2', 's3'].map((id, i) => ({
    id, first_seen_at: at(`2026-10-0${i + 1}T08:00:00`), country: 'US', first_source: 'google_ads', first_path: '/', tutor_id: null,
  }))
  const db = createFakeDb({
    visitors,
    visitor_events: [
      // s1 clicks checkout 1100 times early on; s2 and s3 come later (older rows would fill the first page)
      ...Array.from({ length: 1100 }, (_, i) => ev('s1', 'checkout_click', '/upgrade', new Date(Date.parse('2026-10-01T09:00:00Z') + i * 1000).toISOString(), 'pro')),
      ev('s2', 'checkout_click', '/upgrade', at('2026-10-05T10:00:00'), 'pro'),
      ev('s2', 'order_paid', null, at('2026-10-05T10:05:00'), 'pro'),
      ev('s3', 'checkout_click', '/upgrade', at('2026-10-06T10:00:00'), 'pro'),
    ],
  })
  const d = await loadSuperAdmin(db, NO_RANGE)
  const row = d.funnel.rows.find(r => r.source === 'google_ads')!
  assert.deepEqual([row.visitors, row.checkout, row.paid], [3, 3, 1])
  // s1 and s3 started checkout without paying
  assert.equal(d.abandoned.length, 2)
})

test('"checkout started, not paid" sees the last page before the click even after 1500 page views', async () => {
  const views = Array.from({ length: 1500 }, (_, i) =>
    ev('c', 'page_view', `/blog/p${i}`, new Date(Date.parse('2026-10-01T08:00:00Z') + i * 1000).toISOString()))
  const db = createFakeDb({
    tutors: [{ id: 'T', name: 'Stuck Tutor', email: 'stuck@example.com', created_at: at('2026-09-01T10:00:00'), subscription_status: 'free', students: [], lessons: [] }],
    visitors: [{ id: 'c', first_seen_at: at('2026-10-01T08:00:00'), country: 'FR', first_source: 'social', first_path: '/blog/p0', tutor_id: 'T' }],
    visitor_events: [
      ...views,
      ev('c', 'checkout_click', '/upgrade', at('2026-10-02T08:00:00'), 'academy'),
      ...usage('c', 50, Date.parse('2026-10-03T08:00:00Z'), ['/after-a', '/after-b']), // later use is not "before checkout"
    ],
  })
  const d = await loadSuperAdmin(db, NO_RANGE)
  assert.equal(d.abandoned.length, 1)
  assert.deepEqual(
    { name: d.abandoned[0].tutorName, last: d.abandoned[0].lastBeforeCheckout, plan: d.abandoned[0].plan },
    { name: 'Stuck Tutor', last: '/blog/p1499', plan: 'academy' },
  )
})

test('a read too long to finish says so instead of looping or silently cutting', async () => {
  const db = twoBuyers()
  let eventRequests = 0
  const endless = {
    from(table: string) {
      if (table !== 'visitor_events') return db.from(table)
      const rows = Array.from({ length: ROWS_PER_REQUEST }, (_, i) => ({ id: i, visitor_id: 'vNew', kind: 'checkout_click', path: '/upgrade', plan: 'pro', created_at: at('2026-10-12T08:01:00') }))
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'in', 'lte', 'order', 'limit']) q[m] = () => q
      // the first read never ends (full pages for ever); once it has been stopped, later reads are short
      q.range = () => { eventRequests++; return q }
      q.then = (resolve: (v: unknown) => unknown) => resolve({ data: eventRequests <= MAX_PAGES ? rows : [], error: null })
      return q
    },
  }
  const d = await loadSuperAdmin(endless, NO_RANGE)
  assert.equal(d.readTruncated, true)
  assert.ok(eventRequests >= MAX_PAGES && eventRequests < MAX_PAGES + 20, String(eventRequests))
})

test('an error in the middle of a long read is reported as a failed read', async () => {
  const db = twoBuyers()
  let calls = 0
  const flaky = {
    from(table: string) {
      const q = db.from(table) as unknown as Record<string, unknown> & { then: (r: (v: unknown) => unknown) => unknown }
      if (table !== 'visitor_events') return q
      const realThen = q.then.bind(q)
      q.then = (resolve: (v: unknown) => unknown) => (++calls === 3 ? resolve({ data: null, error: { message: 'boom' }, count: null }) : realThen(resolve))
      return q
    },
  }
  const d = await loadSuperAdmin(flaky, NO_RANGE)
  assert.equal(d.failed, true)
})

test('the page shows a notice when a read was cut, and the comment about the cap is honest', async () => {
  const { readFileSync } = await import('node:fs')
  const page = readFileSync(new URL('../src/app/(admin)/super-admin/page.tsx', import.meta.url), 'utf8')
  assert.ok(page.includes('data-testid="super-admin-truncated"'))
  assert.ok(page.includes('{d.readTruncated && ('))
  const data = readFileSync(new URL('../src/lib/super-admin-data.ts', import.meta.url), 'utf8')
  assert.ok(!data.includes('nothing is cut off however many there are'))
  assert.ok(data.includes('range()'))
})
