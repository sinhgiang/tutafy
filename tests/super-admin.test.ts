// /super-admin: who may open it, and that it shows country, first source, pages in
// order, the last page before checkout and the order result, from sample data.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createFakeDb } from './support/fake-db.ts'
import './support/admin-lang.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

let currentUser: { id: string; email: string } | null = null
const redirects: string[] = []

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }) },
})
mock.module('next/navigation', {
  exports: { redirect: (to: string) => { redirects.push(to); throw new Error(`NEXT_REDIRECT:${to}`) } },
})
mock.module('@supabase/ssr', {
  exports: { createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }) },
})

const { ADMIN_EMAIL } = await import('./support/admin-account.ts')
const { requireAdminPage } = await import('@/lib/admin-guard.ts')
const { proxy } = await import('@/proxy.ts')
const { NextRequest } = await import('next/server.js')
const { loadSuperAdmin } = await import('@/lib/super-admin-data.ts')
const journey = await import('@/lib/journey.ts')
const { loadBuyers } = await import('@/lib/buyers-data.ts')

beforeEach(() => { currentUser = null; redirects.length = 0 })

const TUTOR = { id: 'u-1', email: 'ten@example.com' }
const ADMIN = { id: 'u-0', email: ADMIN_EMAIL }

// ---- (b) who may open it --------------------------------------------------------

async function callProxy(user: typeof currentUser, pathname: string) {
  currentUser = user
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.invalid'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-for-tests'
  const res = await proxy(new NextRequest(`http://localhost:3000${pathname}`, { headers: { host: 'localhost:3000' } }))
  return { status: res.status, location: res.headers.get('location') }
}

test('proxy: a tutor opening /super-admin goes to the dashboard', async () => {
  const r = await callProxy(TUTOR, '/super-admin')
  assert.equal(r.status, 307)
  assert.equal(new URL(r.location!).pathname, '/dashboard')
  const sub = await callProxy(TUTOR, '/super-admin/anything')
  assert.equal(new URL(sub.location!).pathname, '/dashboard')
  // a person's journey page is part of the admin area too (T-0617)
  const person = await callProxy(TUTOR, '/super-admin/people/00000000-0000-4000-8000-000000000001')
  assert.equal(new URL(person.location!).pathname, '/dashboard')
  const anon = await callProxy(null, '/super-admin/people/00000000-0000-4000-8000-000000000001')
  assert.equal(new URL(anon.location!).pathname, '/login')
  const admin = await callProxy(ADMIN, '/super-admin/people/00000000-0000-4000-8000-000000000001')
  assert.equal(admin.location, null)
})

test('proxy: a signed-out visitor opening /super-admin goes to login', async () => {
  const r = await callProxy(null, '/super-admin')
  assert.equal(r.status, 307)
  assert.equal(new URL(r.location!).pathname, '/login')
})

test('proxy: the admin reaches /super-admin; a look-alike path is not an admin page', async () => {
  const ok = await callProxy(ADMIN, '/super-admin')
  assert.equal(ok.location, null)
  assert.equal(ok.status, 200)
  const lookalike = await callProxy(TUTOR, '/super-administrator')
  assert.equal(lookalike.location, null) // not an admin path, so not redirected by the admin rule
})

test('requireAdminPage (used by the layout and the page): tutor to /dashboard, signed out to /login, admin passes', async () => {
  currentUser = TUTOR
  await assert.rejects(requireAdminPage(), /NEXT_REDIRECT:\/dashboard/)
  currentUser = null
  await assert.rejects(requireAdminPage(), /NEXT_REDIRECT:\/login/)
  currentUser = ADMIN
  await requireAdminPage()
})

const read = (rel: string) => readFileSync(path.join(SRC, rel), 'utf8')

test('the page sits under the admin layout and runs the admin check itself before any query', () => {
  assert.match(read('app/(admin)/layout.tsx'), /await requireAdminPage\(\)/)
  const page = read('app/(admin)/super-admin/page.tsx')
  const gate = page.indexOf('await requireAdminPage()')
  const query = page.indexOf('createAdminClient()')
  assert.ok(gate > 0 && query > gate)
  // the menu list moved to admin-nav.ts (T-0629) so the desktop sidebar and the phone drawer share it
  assert.match(read('components/admin/admin-nav.ts'), /href: '\/super-admin', labelKey: 'nav\.superAdmin'/)
  assert.match(read('components/admin/AdminSidebar.tsx'), /ADMIN_NAV\.map/)
  assert.match(read('proxy.ts'), /path === '\/super-admin' \|\| path\.startsWith\('\/super-admin\/'\)/)
})

// ---- (c) the numbers, from sample data ------------------------------------------------

const t = (day: string, time = '10:00:00') => `2026-${day}T${time}.000Z`

function sample() {
  return createFakeDb({
    tutors: [
      { id: 'A', name: 'Ann Pro', email: 'ann@example.com', created_at: t('10-02'), subscription_status: 'pro', students: [{ count: 3 }], lessons: [{ count: 8 }] },
      { id: 'B', name: 'Ben Academy', email: 'ben@example.com', created_at: t('10-10'), subscription_status: 'academy', students: [{ count: 1 }], lessons: [{ count: 2 }] },
      { id: 'C', name: 'Cy Old', email: 'cy@example.com', created_at: t('08-01'), subscription_status: 'pro', students: [], lessons: [] },
      { id: 'D', name: 'Di Free', email: 'di@example.com', created_at: t('10-12'), subscription_status: 'free', students: [], lessons: [] },
    ],
    visitors: [
      { id: 'vA', first_seen_at: t('10-01'), country: 'VN', first_source: 'google_ads', first_path: '/', tutor_id: 'A' },
      { id: 'vB', first_seen_at: t('10-09'), country: 'US', first_source: 'ai_claude', first_path: '/blog/tools', tutor_id: 'B' },
      { id: 'vD', first_seen_at: t('10-11'), country: 'DE', first_source: 'social', first_path: '/', tutor_id: 'D' },
      { id: 'vX', first_seen_at: t('10-13'), country: 'JP', first_source: 'direct', first_path: '/', tutor_id: null },
      { id: 'vY', first_seen_at: t('08-15'), country: 'VN', first_source: 'google_search', first_path: '/blog/a', tutor_id: null },
    ],
    visitor_events: [
      { visitor_id: 'vA', kind: 'page_view', path: '/', plan: null, created_at: t('10-01', '09:00:00') },
      { visitor_id: 'vA', kind: 'page_view', path: '/blog/scheduling', plan: null, created_at: t('10-01', '09:02:00') },
      { visitor_id: 'vA', kind: 'page_view', path: '/register', plan: null, created_at: t('10-02', '08:00:00') },
      { visitor_id: 'vA', kind: 'page_view', path: '/upgrade', plan: null, created_at: t('10-05', '12:00:00') },
      { visitor_id: 'vA', kind: 'checkout_click', path: '/upgrade', plan: 'pro', created_at: t('10-05', '12:01:00') },
      { visitor_id: 'vA', kind: 'order_paid', path: null, plan: 'pro', created_at: t('10-05', '12:09:00') },
      { visitor_id: 'vB', kind: 'page_view', path: '/blog/tools', plan: null, created_at: t('10-09', '09:00:00') },
      { visitor_id: 'vB', kind: 'page_view', path: '/ai', plan: null, created_at: t('10-10', '09:00:00') },
      { visitor_id: 'vB', kind: 'page_view', path: '/ai', plan: null, created_at: t('10-10', '09:00:30') },
      { visitor_id: 'vB', kind: 'page_view', path: '/dashboard', plan: null, created_at: t('10-10', '09:05:00') },
      { visitor_id: 'vB', kind: 'checkout_click', path: '/ai', plan: 'academy', created_at: t('10-10', '09:06:00') },
      { visitor_id: 'vB', kind: 'order_paid', path: null, plan: 'academy', created_at: t('10-10', '09:15:00') },
      { visitor_id: 'vD', kind: 'page_view', path: '/', plan: null, created_at: t('10-11', '10:00:00') },
      { visitor_id: 'vD', kind: 'page_view', path: '/upgrade', plan: null, created_at: t('10-12', '10:00:00') },
      { visitor_id: 'vD', kind: 'checkout_click', path: '/upgrade', plan: 'pro', created_at: t('10-12', '10:01:00') },
      { visitor_id: 'vX', kind: 'page_view', path: '/', plan: null, created_at: t('10-13', '10:00:00') },
      { visitor_id: 'vY', kind: 'page_view', path: '/blog/a', plan: null, created_at: t('08-15', '10:00:00') },
    ],
  })
}

const NO_RANGE = { from: null, to: null }

test('the totals and the buyer list come from the same function as /admin/buyers', async () => {
  const d = await loadSuperAdmin(sample(), NO_RANGE)
  const shared = await loadBuyers(sample())
  assert.deepEqual([d.pro, d.academy, d.total], [shared.pro, shared.academy, shared.total])
  assert.deepEqual([d.pro, d.academy, d.total], [2, 1, 3])
  assert.deepEqual(d.buyers.map(b => b.id), shared.buyers.map(b => b.id))
  assert.equal(d.failed, false)
})

test('each buyer shows country, first source, pages in order, last page before checkout and the order result', async () => {
  const d = await loadSuperAdmin(sample(), NO_RANGE)
  const by = Object.fromEntries(d.buyers.map(b => [b.id, b]))

  assert.equal(by.A.country, 'VN')
  assert.equal(by.A.firstSource, 'google_ads')
  assert.equal(by.A.firstPath, '/')
  assert.deepEqual(by.A.pages, ['/', '/blog/scheduling', '/register', '/upgrade'])
  assert.equal(by.A.lastBeforeCheckout, '/upgrade')
  assert.equal(by.A.result, 'paid')
  assert.equal(by.A.plan, 'pro')
  assert.equal(by.A.boughtOn, t('10-05', '12:09:00')) // the order date, not the sign-up date
  assert.equal(by.A.students, 3)

  assert.equal(by.B.country, 'US')
  assert.equal(by.B.firstSource, 'ai_claude')
  assert.deepEqual(by.B.pages, ['/blog/tools', '/ai', '/dashboard']) // the repeated /ai counts once
  assert.equal(by.B.lastBeforeCheckout, '/dashboard')
  assert.equal(by.B.plan, 'academy')

  // bought before tracking: no journey, still listed as a paying buyer
  assert.equal(by.C.tracked, false)
  assert.equal(by.C.country, null)
  assert.deepEqual(by.C.pages, [])
  assert.equal(by.C.result, 'paid')
  assert.equal(by.C.boughtOn, t('08-01'))
})

test('the funnel goes from source to visitors, sign-ups, checkout and paid orders', async () => {
  const d = await loadSuperAdmin(sample(), NO_RANGE)
  const row = (s: string) => d.funnel.rows.find(r => r.source === s)!
  assert.deepEqual([row('google_ads').visitors, row('google_ads').signedUp, row('google_ads').checkout, row('google_ads').paid], [1, 1, 1, 1])
  assert.deepEqual([row('ai_claude').visitors, row('ai_claude').signedUp, row('ai_claude').checkout, row('ai_claude').paid], [1, 1, 1, 1])
  assert.deepEqual([row('social').visitors, row('social').signedUp, row('social').checkout, row('social').paid], [1, 1, 1, 0])
  assert.deepEqual([row('direct').visitors, row('direct').signedUp, row('direct').checkout, row('direct').paid], [1, 0, 0, 0])
  assert.deepEqual([row('google_search').visitors, row('google_search').paid], [1, 0])
  assert.equal(row('ai_chatgpt').visitors, 0) // sources with no visitors are still listed
  assert.equal(d.funnel.rows.length, 10)
  assert.deepEqual(d.funnel.total, { source: 'other', visitors: 5, signedUp: 3, checkout: 3, paid: 2 })
})

test('"checkout started, not paid" lists the tutor who clicked and did not pay, with the page they were on', async () => {
  const d = await loadSuperAdmin(sample(), NO_RANGE)
  assert.equal(d.abandoned.length, 1)
  assert.deepEqual(
    { name: d.abandoned[0].tutorName, country: d.abandoned[0].country, source: d.abandoned[0].firstSource, last: d.abandoned[0].lastBeforeCheckout, plan: d.abandoned[0].plan },
    { name: 'Di Free', country: 'DE', source: 'social', last: '/upgrade', plan: 'pro' },
  )
})

test('the date filter narrows buyers (by purchase date) and the funnel (by first visit)', async () => {
  const d = await loadSuperAdmin(sample(), { from: '2026-10-08', to: '2026-10-10' })
  assert.deepEqual(d.buyers.map(b => b.id), ['B'])
  assert.deepEqual([d.pro, d.academy, d.total], [0, 1, 1])
  assert.equal(d.funnel.total.visitors, 1) // only vB was first seen in 8 to 10 October
  assert.equal(d.funnel.total.paid, 1)

  const late = await loadSuperAdmin(sample(), { from: '2026-10-11', to: null })
  assert.deepEqual(late.buyers, [])
  assert.deepEqual([late.pro, late.academy, late.total], [0, 0, 0])
  assert.equal(late.funnel.total.visitors, 2) // vD and vX
  assert.equal(late.abandoned.length, 1)

  const old = await loadSuperAdmin(sample(), { from: null, to: '2026-08-31' })
  assert.deepEqual(old.buyers.map(b => b.id), ['C'])
  assert.equal(old.funnel.total.visitors, 1)
})

test('an empty database shows zeros and no error', async () => {
  const d = await loadSuperAdmin(createFakeDb({}), NO_RANGE)
  assert.deepEqual([d.pro, d.academy, d.total, d.buyers.length, d.abandoned.length, d.funnel.total.visitors], [0, 0, 0, 0, 0, 0])
  assert.equal(d.failed, false)
})

test('a failing read is reported, not shown as zero buyers', async () => {
  const ok = sample()
  const failing = { from: (table: string) => (table === 'visitors' ? Object.assign(ok.from(table), {
    then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: { message: 'boom' }, count: null }),
  }) : ok.from(table)) }
  const d = await loadSuperAdmin(failing, NO_RANGE)
  assert.equal(d.failed, true)
  const page = read('app/(admin)/super-admin/page.tsx')
  assert.match(page, /data-testid="super-admin-error"/)
  assert.match(page, /\{failed \? '—' : n\}/) // counts show a dash, not zero, when a read failed
})

test('the funnel reads events for exactly the visitors it counts, in groups: nothing is cut off with many visitors', async () => {
  // 450 visitors (more than one group of 100), every one clicked checkout and every third one paid
  const visitors = Array.from({ length: 450 }, (_, i) => ({
    id: `m${i}`, first_seen_at: t('10-20', '08:00:00'), country: 'VN', first_source: 'google_search', first_path: '/', tutor_id: null,
  }))
  const visitor_events = visitors.flatMap((v, i) => [
    { visitor_id: v.id, kind: 'checkout_click', path: '/upgrade', plan: 'pro', created_at: t('10-20', '09:00:00') },
    ...(i % 3 === 0 ? [{ visitor_id: v.id, kind: 'order_paid', path: null, plan: 'pro', created_at: t('10-20', '09:05:00') }] : []),
  ])
  const d = await loadSuperAdmin(createFakeDb({ tutors: [], visitors, visitor_events }), NO_RANGE)
  const row = d.funnel.rows.find(r => r.source === 'google_search')!
  assert.deepEqual([row.visitors, row.checkout, row.paid], [450, 450, 150])
  assert.equal(d.funnelTruncated, false)

  // the page text and the cap come from one constant, and the cap is what the database answers per request
  const { FUNNEL_VISITOR_LIMIT } = await import('@/lib/super-admin-data.ts')
  assert.equal(FUNNEL_VISITOR_LIMIT, 1000)
  assert.ok(readFileSync(path.join(SRC, 'app/(admin)/super-admin/page.tsx'), 'utf8').includes('n: FUNNEL_VISITOR_LIMIT'))
})

test('the newest visitors are never the ones cut: with more visitors than the cap, a notice says so', async () => {
  const visitors = Array.from({ length: 1005 }, (_, i) => ({
    id: `n${i}`, first_seen_at: `2026-10-20T08:${String(Math.floor(i / 60) % 60).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}.000Z`,
    country: 'US', first_source: 'direct', first_path: '/', tutor_id: null,
  }))
  const d = await loadSuperAdmin(createFakeDb({ tutors: [], visitors, visitor_events: [] }), NO_RANGE)
  assert.equal(d.funnel.total.visitors, 1000)
  assert.equal(d.funnelTruncated, true)
})

// ---- pure helpers -----------------------------------------------------------------------

test('parseRange and rangeBounds: real dates only, swapped if reversed, end day included', () => {
  assert.deepEqual(journey.parseRange('2026-10-01', '2026-10-31'), { from: '2026-10-01', to: '2026-10-31' })
  assert.deepEqual(journey.parseRange('2026-10-31', '2026-10-01'), { from: '2026-10-01', to: '2026-10-31' })
  assert.deepEqual(journey.parseRange('2026-02-30', 'tomorrow'), { from: null, to: null })
  assert.deepEqual(journey.parseRange("2026-10-01' or 1=1 --", undefined), { from: null, to: null })
  assert.deepEqual(journey.rangeBounds({ from: '2026-10-01', to: '2026-10-31' }), { gte: '2026-10-01T00:00:00.000Z', lt: '2026-11-01T00:00:00.000Z' })
  assert.equal(journey.inRange('2026-10-31T23:59:59.000Z', { from: null, to: '2026-10-31' }), true)
  assert.equal(journey.inRange('2026-11-01T00:00:00.000Z', { from: null, to: '2026-10-31' }), false)
})

test('buildJourney: no checkout, checkout without payment, and a payment with no click seen', () => {
  const ev = (kind: 'page_view' | 'checkout_click' | 'order_paid', p: string | null, at: string) =>
    ({ visitor_id: 'v', kind, path: p, plan: kind === 'page_view' ? null : 'pro', created_at: `2026-10-01T${at}.000Z` })
  assert.equal(journey.buildJourney([ev('page_view', '/', '09:00:00')]).result, 'no_checkout')
  const stuck = journey.buildJourney([ev('checkout_click', '/upgrade', '09:05:00'), ev('page_view', '/', '09:00:00'), ev('page_view', '/ai', '09:04:00'), ev('page_view', '/late', '09:09:00')])
  assert.equal(stuck.result, 'checkout_not_paid')
  assert.deepEqual(stuck.pages, ['/', '/ai', '/late']) // sorted by time, whatever the input order
  assert.equal(stuck.lastBeforeCheckout, '/ai') // /late came after the click
  assert.equal(journey.buildJourney([ev('order_paid', null, '09:10:00')]).result, 'paid')
  assert.equal(journey.buildJourney([ev('checkout_click', '/upgrade', '09:05:00')]).lastBeforeCheckout, '/upgrade') // no page view before: the click's own page
})
