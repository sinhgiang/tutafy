// T-0617 review fix: the journey page must not hide the moments the owner came for. A Free tutor who
// used the app for weeks (well over 1000 steps) and then clicked checkout without paying has the
// checkout at the END of the timeline; the page used to draw only the first 500 steps. These tests run
// the function the page draws from (src/lib/journey-view.ts) on the data the page loads.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createFakeDb } from './support/fake-db.ts'
import './support/admin-lang.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

const { loadJourney } = await import('@/lib/people-data.ts')
const { buildJourneyView, groupAppRuns, lastPageBeforeFirstCheckout, parseStepsPage, VIEW_PAGE_SIZE } = await import('@/lib/journey-view.ts')

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
let id = 0
const ev = (visitor_id: string, kind: string, path: string | null, created_at: string, plan: string | null = null) =>
  ({ id: ++id, visitor_id, kind, path, plan, created_at })

const SECTIONS = ['students', 'lessons', 'calendar']
/** The review's case: signs up, then weeks of use (`appViews` page views: three app sections in turn, then a public blog page, over and over), then the pricing page and a checkout click, unpaid. */
function threeWeeks(appViews: number) {
  const start = Date.parse('2026-09-01T09:00:00Z')
  const events = [ev('v1', 'page_view', '/register', new Date(start - 60_000).toISOString())]
  for (let i = 0; i < appViews; i++) {
    const t = new Date(start + (i + 1) * 1000).toISOString()
    // every 4th view is a public page, which ends a run of in-app views (and no page repeats straight after itself)
    events.push(i % 4 === 3 ? ev('v1', 'page_view', `/blog/post-${i}`, t) : ev('v1', 'page_view', `/${SECTIONS[i % 4]}`, t))
  }
  const end = start + (appViews + 10) * 1000
  events.push(ev('v1', 'page_view', '/upgrade', new Date(end).toISOString()))
  events.push(ev('v1', 'checkout_click', '/upgrade', new Date(end + 5000).toISOString(), 'pro'))
  return createFakeDb({
    tutors: [{ id: U(1), name: 'Busy Free', email: 'busy@example.com', created_at: new Date(start).toISOString(), subscription_status: 'free' }],
    visitors: [{ id: 'v1', first_seen_at: new Date(start - 120_000).toISOString(), country: 'BR', first_source: 'social', first_path: '/blog/post-x', tutor_id: U(1) }],
    visitor_events: events,
  })
}

test('1400 steps ending in an unpaid checkout: the checkout and the page before it are on the page the owner sees', async () => {
  const j = (await loadJourney(threeWeeks(1400), U(1), false))!
  assert.ok(j.timeline.length > 1000)
  assert.equal(j.timeline[j.timeline.length - 1].kind, 'checkout_click')

  const view = buildJourneyView(j.timeline, 1)
  // the key moments are listed whatever page is open, checkout included, with a page to open it
  const kinds = view.keyMoments.map(m => m.row.kind)
  assert.deepEqual(kinds, ['first_visit', 'signup', 'checkout_click'])
  const checkout = view.keyMoments.find(m => m.row.kind === 'checkout_click')!
  assert.equal(checkout.row.title, 'Clicked checkout (Pro)')
  assert.ok(checkout.page >= 1 && checkout.page <= view.pages)

  // the header facts: when they first clicked checkout, and the last page they saw before it
  assert.ok(j.person.checkoutAt)
  assert.equal(j.person.stage, 'checkout')
  assert.equal(view.lastPageBeforeCheckout?.path, '/upgrade')
})

test('the rest of the journey can be reached: pages together hold every line exactly once, in order', async () => {
  const j = (await loadJourney(threeWeeks(1400), U(1), false))!
  const first = buildJourneyView(j.timeline, 1)
  assert.ok(first.pages > 1, 'a journey this long is split into pages')
  assert.equal(first.rows.length, Math.min(VIEW_PAGE_SIZE, first.lines))
  assert.ok(first.lines < first.steps, 'runs of in-app page views are folded into single lines')

  const seen: number[] = []
  for (let p = 1; p <= first.pages; p++) {
    const v = buildJourneyView(j.timeline, p)
    assert.equal(v.page, p)
    assert.deepEqual(v.keyMoments, first.keyMoments, 'the key moments are the same on every page')
    for (const r of v.rows) seen.push(r.index)
  }
  assert.deepEqual(seen, Array.from({ length: first.lines }, (_, i) => i))

  // the checkout sits on the last page, and that page really draws it
  const last = buildJourneyView(j.timeline, first.pages)
  const checkout = last.keyMoments.find(m => m.row.kind === 'checkout_click')!
  assert.equal(checkout.page, first.pages)
  assert.ok(last.rows.some(r => r.index === checkout.index && r.row.kind === 'checkout_click'))

  // a page number outside the range lands on a real page, never an empty one
  assert.equal(buildJourneyView(j.timeline, 999).page, first.pages)
  assert.equal(buildJourneyView(j.timeline, -4).page, 1)
  assert.equal(parseStepsPage('abc'), 1)
  assert.equal(parseStepsPage('3'), 3)
})

test('with over 1000 steps even page 1 shows the checkout in the key moments (it is not on the page itself)', async () => {
  const j = (await loadJourney(threeWeeks(1400), U(1), false))!
  const view = buildJourneyView(j.timeline, 1)
  assert.ok(!view.rows.some(r => r.row.kind === 'checkout_click'), 'sanity: the checkout is not among the first lines')
  assert.ok(view.keyMoments.some(m => m.row.kind === 'checkout_click' && m.page > 1))
})

test('a run of in-app page views is one line that says how many and where', () => {
  const t = (n: number, path: string) => ({ at: new Date(Date.UTC(2026, 8, 1, 9, 0, n)).toISOString(), kind: 'page_view' as const, title: path, path })
  const rows = groupAppRuns([
    t(0, '/blog/a'), t(1, '/students'), t(2, '/students'), t(3, '/lessons'), t(4, '/students'), t(5, '/blog/b'), t(6, '/calendar'), t(7, '/upgrade'),
  ])
  // /calendar alone stays as it was; the pricing page /upgrade is never folded into a run
  assert.deepEqual(rows.map(r => r.title), ['/blog/a', 'In the app: 4 page views', '/blog/b', '/calendar', '/upgrade'])
  assert.equal(rows[1].count, 4)
  assert.equal(rows[1].breakdown, 'students ×3, lessons ×1')
  assert.equal(rows[1].until, t(4, '').at)
})

test('the last page before the first checkout click', () => {
  const at = (n: number) => new Date(Date.UTC(2026, 8, 1, 9, 0, n)).toISOString()
  const base = [
    { at: at(0), kind: 'first_visit' as const, title: 'First visit' },
    { at: at(1), kind: 'page_view' as const, title: 'Blog', path: '/blog/a' },
    { at: at(2), kind: 'signup' as const, title: 'Signed up' },
    { at: at(3), kind: 'page_view' as const, title: 'In the app: lessons', path: '/lessons' },
    { at: at(4), kind: 'checkout_click' as const, title: 'Clicked checkout' },
    { at: at(5), kind: 'page_view' as const, title: 'later', path: '/students' },
  ]
  assert.equal(lastPageBeforeFirstCheckout(base)?.path, '/lessons')
  assert.equal(lastPageBeforeFirstCheckout(base.filter(e => e.kind !== 'checkout_click')), null)
  assert.equal(lastPageBeforeFirstCheckout(base.filter(e => e.kind !== 'page_view' || e.path === '/students')), null)
})

test('the page draws from the view: key moments block, page links, header facts, and no fixed cut of the steps', () => {
  const page = readFileSync(path.join(SRC, 'app/(admin)/super-admin/people/[id]/page.tsx'), 'utf8')
  assert.ok(page.includes('buildJourneyView(j.timeline'))
  assert.ok(page.includes('view.keyMoments.map'))
  assert.ok(page.includes('data-testid="key-moments"'))
  assert.ok(page.includes('data-testid="timeline-pages"') && page.includes('steps-next') && page.includes('steps-prev'))
  assert.ok(page.includes('data-testid="person-checkout"') && page.includes("t('journey.lastBeforeCheckout')"))
  assert.ok(!/\.slice\(0,/.test(page) && !/first \{?\d+/i.test(page) && !page.includes('TIMELINE_SHOWN'), 'no hard cut of the first N steps on the page')
  const data = readFileSync(path.join(SRC, 'lib/people-data.ts'), 'utf8')
  assert.ok(!data.includes('TIMELINE_SHOWN') && !/shown:/.test(data))
})
