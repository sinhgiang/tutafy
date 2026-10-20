// T-0617: /super-admin lists EVERY tutor (Free, Pro, Academy) with filters, and each person's
// journey opens as a timeline: first visit (source, country, landing page), every page in order
// with its time, the sign-up, the checkout click and the paid order. Sample data, including
// more than 1000 events and more than 1000 tutors, through a fake database that answers at most
// 1000 rows per request like Supabase.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createFakeDb } from './support/fake-db.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

const people = await import('@/lib/people-data.ts')
const { loadPeople, loadJourney, PEOPLE_PAGE_SIZE, TIMELINE_SHOWN, parsePlanFilter, parseStageFilter, parsePage, isTutorId } = people
const timeline = await import('@/lib/timeline.ts')
const { normalizeTrackedPath } = await import('@/lib/track-path.ts')
const { POSTS } = await import('@/lib/blog.ts')
const format = await import('@/lib/format.ts')

const NO_RANGE = { from: null, to: null }
const ALL = { plan: 'all', stage: 'all', range: NO_RANGE, page: 1 } as const
const at = (s: string) => `${s}.000Z`
let id = 0
const ev = (visitor_id: string, kind: string, path: string | null, created_at: string, plan: string | null = null) =>
  ({ id: ++id, visitor_id, kind, path, plan, created_at })
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

/** n page views one second apart from `startMs`, every path different so none are merged. */
const views = (visitorId: string, n: number, startMs: number, prefix = '/blog/post-') =>
  Array.from({ length: n }, (_, i) => ev(visitorId, 'page_view', `${prefix}${i}`, new Date(startMs + i * 1000).toISOString()))

function sample() {
  return createFakeDb({
    tutors: [
      { id: U(1), name: 'Free Only', email: 'free@example.com', created_at: at('2026-10-02T10:00:00'), subscription_status: 'free' },
      { id: U(2), name: 'Free Checkout', email: 'checkout@example.com', created_at: at('2026-10-03T10:00:00'), subscription_status: 'free' },
      { id: U(3), name: 'Free Untracked', email: 'untracked@example.com', created_at: at('2026-09-01T10:00:00'), subscription_status: 'free' },
      { id: U(4), name: 'Null Plan', email: 'null@example.com', created_at: at('2026-09-02T10:00:00'), subscription_status: null },
      { id: U(5), name: 'Pro Buyer', email: 'pro@example.com', created_at: at('2026-10-05T10:00:00'), subscription_status: 'pro' },
      { id: U(6), name: 'Academy Buyer', email: 'academy@example.com', created_at: at('2026-10-06T10:00:00'), subscription_status: 'academy' },
    ],
    visitors: [
      { id: 'v1', first_seen_at: at('2026-10-02T09:00:00'), country: 'DE', first_source: 'google_search', first_path: '/blog/best-tools', first_referrer_host: 'www.google.com', utm_campaign: null, tutor_id: U(1) },
      { id: 'v2', first_seen_at: at('2026-10-03T08:00:00'), country: 'US', first_source: 'ai_chatgpt', first_path: '/', first_referrer_host: 'chatgpt.com', utm_campaign: null, tutor_id: U(2) },
      { id: 'v5', first_seen_at: at('2026-10-04T09:00:00'), country: 'VN', first_source: 'google_ads', first_path: '/', first_referrer_host: null, utm_campaign: 'spring', tutor_id: U(5) },
      { id: 'v6', first_seen_at: at('2026-10-06T08:00:00'), country: 'ES', first_source: 'ai_claude', first_path: '/blog/guide', first_referrer_host: 'claude.ai', utm_campaign: null, tutor_id: U(6) },
    ],
    visitor_events: [
      ev('v1', 'page_view', '/blog/best-tools', at('2026-10-02T09:00:00')),
      ev('v1', 'page_view', '/', at('2026-10-02T09:02:00')),
      ev('v1', 'page_view', '/register', at('2026-10-02T09:05:00')),
      ev('v2', 'page_view', '/', at('2026-10-03T08:00:00')),
      ev('v2', 'page_view', '/register', at('2026-10-03T09:50:00')),
      ev('v2', 'page_view', '/upgrade', at('2026-10-04T08:00:00')),
      ev('v2', 'checkout_click', '/upgrade', at('2026-10-04T08:01:00'), 'pro'),
      ev('v5', 'page_view', '/', at('2026-10-04T09:00:00')),
      ev('v5', 'page_view', '/blog/scheduling', at('2026-10-04T09:03:00')),
      ev('v5', 'page_view', '/register', at('2026-10-05T09:50:00')),
      ev('v5', 'page_view', '/dashboard', at('2026-10-05T10:05:00')),
      ev('v5', 'page_view', '/upgrade', at('2026-10-07T12:00:00')),
      ev('v5', 'checkout_click', '/upgrade', at('2026-10-07T12:01:00'), 'pro'),
      ev('v5', 'order_paid', null, at('2026-10-07T12:09:00'), 'pro'),
      ev('v6', 'page_view', '/blog/guide', at('2026-10-06T08:00:00')),
      ev('v6', 'checkout_click', '/upgrade', at('2026-10-08T09:00:00'), 'academy'),
      ev('v6', 'order_paid', null, at('2026-10-08T09:07:00'), 'academy'),
    ],
  })
}

// ---- (a) Free appears with Pro and Academy, with filters ---------------------------------------

test('every tutor is listed, Free included, with the right plan; a missing plan counts as Free', async () => {
  const r = await loadPeople(sample(), ALL)
  assert.equal(r.matching, 6)
  assert.deepEqual(r.counts, { all: 6, pro: 1, academy: 1, free: 4 })
  const by = Object.fromEntries(r.rows.map(p => [p.id, p]))
  assert.deepEqual([by[U(1)].plan, by[U(4)].plan, by[U(5)].plan, by[U(6)].plan], ['free', 'free', 'pro', 'academy'])
  assert.deepEqual(r.rows.map(p => p.id), [U(6), U(5), U(2), U(1), U(4), U(3)]) // newest sign-up first
  assert.equal(r.failed, false)
})

test('each row shows source, country, first page, sign-up, checkout and upgrade', async () => {
  const by = Object.fromEntries((await loadPeople(sample(), ALL)).rows.map(p => [p.id, p]))
  assert.deepEqual(
    { c: by[U(1)].country, s: by[U(1)].firstSource, f: by[U(1)].firstPath, signedUp: by[U(1)].signedUp, stage: by[U(1)].stage, checkout: by[U(1)].checkoutAt, up: by[U(1)].upgradedAt },
    { c: 'DE', s: 'google_search', f: '/blog/best-tools', signedUp: at('2026-10-02T10:00:00'), stage: 'registered', checkout: null, up: null },
  )
  assert.deepEqual([by[U(2)].stage, by[U(2)].checkoutAt, by[U(2)].checkoutPlan, by[U(2)].upgradedAt], ['checkout', at('2026-10-04T08:01:00'), 'pro', null])
  assert.deepEqual([by[U(5)].stage, by[U(5)].checkoutAt, by[U(5)].upgradedAt, by[U(5)].upgradedPlan, by[U(5)].firstSource, by[U(5)].country],
    ['upgraded', at('2026-10-07T12:01:00'), at('2026-10-07T12:09:00'), 'pro', 'google_ads', 'VN'])
  assert.deepEqual([by[U(6)].stage, by[U(6)].upgradedPlan, by[U(6)].firstSource], ['upgraded', 'academy', 'ai_claude'])
  // no visitor record: still listed, with only what the tutors table knows
  assert.deepEqual([by[U(3)].tracked, by[U(3)].country, by[U(3)].firstSource, by[U(3)].stage], [false, null, null, 'registered'])
})

test('plan filter', async () => {
  const ids = async (plan: string) => (await loadPeople(sample(), { ...ALL, plan: plan as 'free' })).rows.map(p => p.id).sort()
  assert.deepEqual(await ids('free'), [U(1), U(2), U(3), U(4)].sort())
  assert.deepEqual(await ids('pro'), [U(5)])
  assert.deepEqual(await ids('academy'), [U(6)])
})

test('stage filter: only signed up, checkout not upgraded, upgraded', async () => {
  const ids = async (stage: string, plan = 'all') => (await loadPeople(sample(), { ...ALL, plan: plan as 'all', stage: stage as 'all' })).rows.map(p => p.id).sort()
  assert.deepEqual(await ids('registered'), [U(1), U(3), U(4)].sort())
  assert.deepEqual(await ids('checkout'), [U(2)])
  assert.deepEqual(await ids('upgraded'), [U(5), U(6)].sort())
  assert.deepEqual(await ids('registered', 'pro'), []) // plan and stage combine
  assert.deepEqual(await ids('upgraded', 'academy'), [U(6)])
})

test('a Free tutor who paid once and went back to Free still counts as upgraded', async () => {
  const db = createFakeDb({
    tutors: [{ id: U(9), name: 'Back To Free', email: 'back@example.com', created_at: at('2026-10-01T10:00:00'), subscription_status: 'free' }],
    visitors: [{ id: 'vb', first_seen_at: at('2026-10-01T09:00:00'), country: 'FR', first_source: 'direct', first_path: '/', tutor_id: U(9) }],
    visitor_events: [ev('vb', 'order_paid', null, at('2026-10-02T09:00:00'), 'pro')],
  })
  const p = (await loadPeople(db, ALL)).rows[0]
  assert.deepEqual([p.plan, p.stage], ['free', 'upgraded'])
})

test('date filter is the sign-up date, and the plan counts follow it', async () => {
  const r = await loadPeople(sample(), { ...ALL, range: { from: '2026-10-01', to: '2026-10-04' } })
  assert.deepEqual(r.rows.map(p => p.id).sort(), [U(1), U(2)].sort())
  assert.deepEqual(r.counts, { all: 2, pro: 0, academy: 0, free: 2 })
})

test('filter values from the address are cleaned: unknown plan, stage or page fall back', () => {
  assert.deepEqual([parsePlanFilter('free'), parsePlanFilter('enterprise'), parsePlanFilter(undefined)], ['free', 'all', 'all'])
  assert.deepEqual([parseStageFilter('upgraded'), parseStageFilter("x' or 1=1"), parseStageFilter(null)], ['upgraded', 'all', 'all'])
  assert.deepEqual([parsePage('3'), parsePage('0'), parsePage('-4'), parsePage('abc'), parsePage('999999999'), parsePage(undefined)], [3, 1, 1, 1, 1, 1])
  assert.equal(isTutorId(U(5)), true)
  assert.equal(isTutorId("x'; drop table tutors"), false)
  assert.equal(isTutorId('../etc'), false)
})

test('more than 1000 tutors: all counted and paged (the database answers 1000 rows per request)', async () => {
  const tutors = Array.from({ length: 1120 }, (_, i) => ({
    id: U(1000 + i), name: `T${i}`, email: `t${i}@example.com`, created_at: new Date(Date.parse('2026-01-01T00:00:00Z') + i * 60000).toISOString(),
    subscription_status: i % 10 === 0 ? 'pro' : 'free',
  }))
  const db = createFakeDb({ tutors })
  const first = await loadPeople(db, ALL)
  assert.equal(first.matching, 1120)
  assert.equal(first.pages, Math.ceil(1120 / PEOPLE_PAGE_SIZE))
  assert.deepEqual(first.counts, { all: 1120, pro: 112, academy: 0, free: 1008 })
  assert.equal(first.rows.length, PEOPLE_PAGE_SIZE)
  assert.equal(first.rows[0].name, 'T1119') // newest first, past the 1000-row cut

  const last = await loadPeople(db, { ...ALL, page: first.pages })
  assert.equal(last.rows.length, 1120 - (first.pages - 1) * PEOPLE_PAGE_SIZE)
  assert.equal(last.rows[last.rows.length - 1].name, 'T0') // the oldest one is there too

  // a stage filter has to look at everyone: all 1120 are "signed up only" except the 0 with a journey
  const registered = await loadPeople(db, { ...ALL, stage: 'registered', plan: 'free' })
  assert.equal(registered.matching, 1008)
  const upgraded = await loadPeople(db, { ...ALL, stage: 'upgraded' })
  assert.equal(upgraded.matching, 112) // paid plan = upgraded, even with no order recorded
})

// ---- (b) the journey of one person ------------------------------------------------------------

test('a paid tutor: first visit, pages with blog and pricing, sign-up, checkout and upgrade, in time order', async () => {
  const j = (await loadJourney(sample(), U(5), false))!
  assert.deepEqual(j.timeline.map(e => e.kind), ['first_visit', 'page_view', 'page_view', 'signup', 'page_view', 'page_view', 'checkout_click', 'order_paid'])
  assert.deepEqual(j.timeline.map(e => e.title), [
    'First visit, from Google Ads',
    'Blog post: scheduling',
    'Sign-up page',
    'Signed up (Free account created)',
    'Dashboard (signed in)',
    'Pricing and upgrade page',
    'Clicked checkout (Pro)',
    'Upgraded to Pro',
  ])
  const first = j.timeline[0]
  assert.deepEqual([first.country, first.source, first.path, first.campaign, first.referrerHost], ['VN', 'google_ads', '/', 'spring', null])
  // every step has its own time, and they run in order
  const times = j.timeline.map(e => Date.parse(e.at))
  assert.deepEqual(times, [...times].sort((a, b) => a - b))
  assert.equal(j.timeline[3].at, at('2026-10-05T10:00:00')) // the sign-up is the tutor's created date
  assert.equal(j.person.stage, 'upgraded')
  assert.equal(j.upgradeCutsOff, true)
})

test('a free tutor who clicked checkout: every step up to the click, no upgrade step', async () => {
  const j = (await loadJourney(sample(), U(2), false))!
  assert.deepEqual(j.timeline.map(e => e.title), [
    'First visit, from ChatGPT',
    'Sign-up page',
    'Signed up (Free account created)',
    'Pricing and upgrade page',
    'Clicked checkout (Pro)',
  ])
  assert.equal(j.timeline.some(e => e.kind === 'order_paid'), false)
  assert.equal(j.person.stage, 'checkout')
  assert.equal(j.upgradeCutsOff, false)
})

test('a tutor with no recorded visit still shows the sign-up', async () => {
  const j = (await loadJourney(sample(), U(3), false))!
  assert.deepEqual(j.timeline.map(e => e.kind), ['signup'])
  assert.equal(j.person.tracked, false)
  assert.equal(await loadJourney(sample(), U(99), false), null)
})

test('the register page is placed before the sign-up by its time; the sign-up sits between pages', async () => {
  const j = (await loadJourney(sample(), U(1), false))!
  assert.deepEqual(j.timeline.map(e => `${e.kind}:${e.path ?? ''}`), [
    'first_visit:/blog/best-tools',
    'page_view:/',
    'page_view:/register',
    'signup:',
  ])
})

test('an upgraded tutor with 1500 page views after buying: the journey stops at the upgrade unless asked', async () => {
  const db = createFakeDb({
    tutors: [{ id: U(7), name: 'Heavy Pro', email: 'heavy@example.com', created_at: at('2026-06-01T10:00:00'), subscription_status: 'pro' }],
    visitors: [{ id: 'vh', first_seen_at: at('2026-06-01T08:00:00'), country: 'JP', first_source: 'ai_gemini', first_path: '/', tutor_id: U(7) }],
    visitor_events: [
      ev('vh', 'page_view', '/blog/a', at('2026-06-01T08:01:00')),
      ev('vh', 'page_view', '/upgrade', at('2026-06-02T08:00:00')),
      ev('vh', 'checkout_click', '/upgrade', at('2026-06-02T08:01:00'), 'pro'),
      ev('vh', 'order_paid', null, at('2026-06-02T08:05:00'), 'pro'),
      ...views('vh', 1500, Date.parse('2026-07-01T08:00:00Z'), '/students-'),
    ],
  })
  const stop = (await loadJourney(db, U(7), false))!
  assert.deepEqual(stop.timeline.map(e => e.kind), ['first_visit', 'page_view', 'signup', 'page_view', 'checkout_click', 'order_paid'])
  assert.equal(stop.upgradeCutsOff, true)

  const all = (await loadJourney(db, U(7), true))!
  assert.equal(all.timeline.length, 6 + 1500)
  assert.equal(all.timeline[all.timeline.length - 1].path, '/students-1499') // the last event, past the 1000-row cut
  assert.equal(all.shown.length, TIMELINE_SHOWN)
  assert.equal(all.upgradeCutsOff, false)
  assert.equal(all.readTruncated, false)
})

test('a free tutor with 1200 events: every step is there, in order, including the last', async () => {
  const db = createFakeDb({
    tutors: [{ id: U(8), name: 'Busy Free', email: 'busy@example.com', created_at: at('2026-08-01T09:00:00'), subscription_status: 'free' }],
    visitors: [{ id: 'vf', first_seen_at: at('2026-08-01T08:00:00'), country: 'BR', first_source: 'social', first_path: '/blog/post-0', tutor_id: U(8) }],
    visitor_events: views('vf', 1200, Date.parse('2026-08-01T08:00:00Z')),
  })
  const j = (await loadJourney(db, U(8), false))!
  // 1200 page views (the first is the landing page, shown on the first-visit line) + first visit + sign-up
  assert.equal(j.timeline.length, 1199 + 1 + 1)
  const pages = j.timeline.filter(e => e.kind === 'page_view')
  assert.equal(pages.length, 1199)
  assert.equal(pages[pages.length - 1].path, '/blog/post-1199') // the last event, past the 1000-row cut
  assert.equal(j.timeline[j.timeline.length - 1].kind, 'signup') // the tutor signed up (09:00) after the last page view (08:20)
  const times = j.timeline.map(e => Date.parse(e.at))
  assert.deepEqual(times, [...times].sort((a, b) => a - b))
  assert.equal(j.shown.length, TIMELINE_SHOWN)
})

test('two browsers of one tutor are merged by time', async () => {
  const db = createFakeDb({
    tutors: [{ id: U(10), name: 'Two Devices', email: 'two@example.com', created_at: at('2026-10-01T12:00:00'), subscription_status: 'free' }],
    visitors: [
      { id: 'va', first_seen_at: at('2026-10-01T09:00:00'), country: 'DE', first_source: 'google_search', first_path: '/', tutor_id: U(10) },
      { id: 'vb', first_seen_at: at('2026-10-01T11:00:00'), country: 'DE', first_source: 'direct', first_path: '/login', tutor_id: U(10) },
    ],
    visitor_events: [ev('va', 'page_view', '/blog/x', at('2026-10-01T09:05:00')), ev('vb', 'page_view', '/dashboard', at('2026-10-01T12:30:00'))],
  })
  const j = (await loadJourney(db, U(10), false))!
  assert.deepEqual(j.timeline.map(e => e.title), [
    'First visit, from Google Search', 'Blog post: x', 'Another browser: first visit, from Direct', 'Signed up (Free account created)', 'Dashboard (signed in)',
  ])
})

test('a failed read shows as failed, not as an empty journey', async () => {
  const ok = sample()
  const failing = { from: (t: string) => (t === 'visitors' ? Object.assign(ok.from(t), { then: (r: (v: unknown) => unknown) => r({ data: null, error: { message: 'boom' }, count: null }) }) : ok.from(t)) }
  const j = (await loadJourney(failing, U(5), false))!
  assert.equal(j.failed, true)
  const l = await loadPeople(failing, ALL)
  assert.equal(l.failed, true)
})

// ---- the list of recorded pages covers the public site ----------------------------------------------

test('blog, home, customers, tutors, about and the pricing page are all recorded (every public page and every blog post)', () => {
  const sitemap = readFileSync(path.join(SRC, 'app/sitemap.ts'), 'utf8')
  const paths = [...sitemap.matchAll(/\{ path: '([^']*)'/g)].map(m => m[1] || '/')
  assert.ok(paths.length >= 10, String(paths.length))
  for (const p of paths) {
    if (p === '/student/login') continue // the student area is deliberately not recorded
    assert.equal(normalizeTrackedPath(p), p, p)
  }
  assert.ok(POSTS.length >= 20)
  for (const post of POSTS) assert.equal(normalizeTrackedPath(`/blog/${post.slug}`), `/blog/${post.slug}`, post.slug)
  assert.equal(normalizeTrackedPath('/upgrade'), '/upgrade') // the pricing page
  assert.equal(normalizeTrackedPath('/student/login'), null)
})

test('page names read well: home, blog, pricing, sign-up, the app', () => {
  assert.deepEqual(
    ['/', '/blog', '/blog/best-tools', '/upgrade', '/register', '/dashboard', '/students', '/customers', '/weird'].map(timeline.pageLabel),
    ['Home page', 'Blog (all posts)', 'Blog post: best tools', 'Pricing and upgrade page', 'Sign-up page', 'Dashboard (signed in)', 'In the app: students', 'Customers page', '/weird'],
  )
  assert.equal(timeline.pageLabel(null), 'Unknown page')
})

test('stageOf and planOf', () => {
  assert.equal(timeline.stageOf({ plan: 'pro', checkoutClicked: false, paid: false }), 'upgraded')
  assert.equal(timeline.stageOf({ plan: 'free', checkoutClicked: true, paid: false }), 'checkout')
  assert.equal(timeline.stageOf({ plan: null, checkoutClicked: false, paid: false }), 'registered')
  assert.equal(timeline.stageOf({ plan: 'free', checkoutClicked: false, paid: true }), 'upgraded')
  assert.deepEqual([timeline.planOf(null), timeline.planOf('weird'), timeline.planOf('academy')], ['free', 'free', 'academy'])
})

test('times and countries are shown plainly', () => {
  assert.equal(format.formatWhen('2026-10-12T08:01:00+00:00'), '2026-10-12 08:01')
  assert.equal(format.formatWhen('2026-10-12T08:01:00.000Z'), '2026-10-12 08:01')
  assert.equal(format.formatWhen(null), '—')
  assert.equal(format.formatWhen('nonsense'), '—')
  assert.equal(format.countryName('DE'), 'Germany (DE)')
  assert.equal(format.countryName(null), '—')
})

// ---- the pages -----------------------------------------------------------------------------------

test('both pages check the admin themselves before any query, and the journey page rejects a bad id', () => {
  for (const file of ['app/(admin)/super-admin/page.tsx', 'app/(admin)/super-admin/people/[id]/page.tsx']) {
    const src = readFileSync(path.join(SRC, file), 'utf8')
    const gate = src.indexOf('await requireAdminPage()')
    const query = src.indexOf('createAdminClient()')
    assert.ok(gate > 0 && query > gate, file)
  }
  const detail = readFileSync(path.join(SRC, 'app/(admin)/super-admin/people/[id]/page.tsx'), 'utf8')
  assert.ok(detail.indexOf('isTutorId(id)') > 0 && detail.indexOf('isTutorId(id)') < detail.indexOf('loadJourney('))
  const list = readFileSync(path.join(SRC, 'app/(admin)/super-admin/page.tsx'), 'utf8')
  assert.ok(list.includes('/super-admin/people/${p.id}'))
  assert.ok(list.includes('name="plan"') && list.includes('name="stage"'))
})
