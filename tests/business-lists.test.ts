// T-0825 (G6): Packages, Coupons, Subscriptions, Waitlist and Team as lists with a row of figures, and a plan feature shown as a quiet
// "Pro" tag and an upgrade sheet. The pure rules, the REAL pages and the REAL write routes over an in-memory Supabase with two tutors
// (and a Free one): a second tutor can neither read, change nor delete the first tutor's packages, coupons, plans, waitlist or team,
// a Free tutor is refused at the route (the page lock only hides the screen), and what the routes accept is checked.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextRequest } from 'next/server'
import { createElement } from 'react'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import { StatRow } from '@/components/lists/StatRow'
import {
  ago, couponState, couponStats, packageStats, pickPlanUpdates, planStats, validateCoupon, validatePackage, validatePlan, waitlistStats,
} from '@/lib/business-lists'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const NOW = new Date('2026-10-23T12:00:00Z')
const DAY = 86_400_000

// ---- pure rules ------------------------------------------------------------------------------------------------------------

test('a package: a name, 1 to 200 whole lessons, a price above zero; anything else is refused with a sentence', () => {
  const ok = validatePackage({ name: '  Starter 10  ', lessons_count: '10', price: '199.999', description: ' Great ' })
  assert.deepEqual(ok, { ok: true, value: { name: 'Starter 10', description: 'Great', lessons_count: 10, price: 200 } })
  for (const bad of [{}, null, { name: '', lessons_count: 5, price: 5 }, { name: 'x'.repeat(81), lessons_count: 5, price: 5 }, { name: 'a', lessons_count: 0, price: 5 },
    { name: 'a', lessons_count: 2.5, price: 5 }, { name: 'a', lessons_count: 201, price: 5 }, { name: 'a', lessons_count: 5, price: 0 }, { name: 'a', lessons_count: 5, price: -3 },
    { name: 'a', lessons_count: 5, price: 'free' }, { name: 'a', lessons_count: 5, price: 1_000_000 }, { name: ['a'], lessons_count: 5, price: 5 }]) {
    assert.equal(validatePackage(bad).ok, false, JSON.stringify(bad))
  }
  assert.deepEqual(packageStats([{ price: 200, lessons_count: 10 }, { price: 90, lessons_count: 3 }]), { count: 2, lessons: 13, cheapest: 20, dearest: 200 })
  assert.deepEqual(packageStats([]), { count: 0, lessons: 0, cheapest: null, dearest: null })
})

test('a coupon: a code of 3 to 24 safe characters, a percentage from 1 to 100 or a fixed amount, whole max uses, a real date', () => {
  const ok = validateCoupon({ code: ' welcome-10 ', discount_type: 'percent', discount_value: '10', max_uses: '5', expires_at: '2026-12-31' })
  assert.deepEqual(ok, { ok: true, value: { code: 'WELCOME-10', discount_type: 'percent', discount_value: 10, max_uses: 5, expires_at: '2026-12-31' } })
  assert.equal(validateCoupon({ code: 'ABC', discount_type: 'fixed', discount_value: 5 }).ok, true)
  for (const bad of [{}, { code: 'AB', discount_type: 'fixed', discount_value: 5 }, { code: 'HAS SPACE', discount_type: 'fixed', discount_value: 5 }, { code: 'A%B,C', discount_type: 'fixed', discount_value: 5 },
    { code: 'ABC', discount_type: 'bogus', discount_value: 5 }, { code: 'ABC', discount_type: 'percent', discount_value: 101 }, { code: 'ABC', discount_type: 'percent', discount_value: 0 },
    { code: 'ABC', discount_type: 'fixed', discount_value: -1 }, { code: 'ABC', discount_type: 'fixed', discount_value: 5, max_uses: 0 }, { code: 'ABC', discount_type: 'fixed', discount_value: 5, max_uses: 1.5 },
    { code: 'ABC', discount_type: 'fixed', discount_value: 5, expires_at: 'tomorrow' }, { code: 'ABC', discount_type: 'fixed', discount_value: 5, expires_at: '2026-13-45' }]) {
    assert.equal(validateCoupon(bad).ok, false, JSON.stringify(bad))
  }
})

test('a coupon is active, expired, used up or off; the figures count each', () => {
  const c = (o: Partial<{ active: boolean; max_uses: number | null; uses_count: number; expires_at: string | null }>) => ({ active: true, max_uses: null, uses_count: 0, expires_at: null, ...o })
  assert.equal(couponState(c({}), NOW), 'active')
  assert.equal(couponState(c({ active: false }), NOW), 'off')
  assert.equal(couponState(c({ expires_at: '2026-10-01' }), NOW), 'expired')
  assert.equal(couponState(c({ max_uses: 3, uses_count: 3 }), NOW), 'used up')
  assert.equal(couponState(c({ max_uses: 3, uses_count: 2 }), NOW), 'active')
  const s = couponStats([c({ uses_count: 4, expires_at: '2026-11-10' }), c({ expires_at: '2026-01-01' }), c({ max_uses: 1, uses_count: 1 }), c({ expires_at: '2027-06-01' })], NOW)
  assert.deepEqual(s, { active: 2, redeemed: 5, expiringSoon: 1, total: 4 })
})

test('a plan: validated on create; a change may touch only is_active, name and description (never tutor_id or id)', () => {
  assert.equal(validatePlan({ name: 'Monthly', price: 200, lessons_per_period: 4, period: 'month', duration_minutes: 60 }).ok, true)
  const d = validatePlan({ name: 'W', price: '50', lessons_per_period: '2', period: 'week', currency: 'EUR' })
  assert.equal(d.ok && d.value.duration_minutes, 60)
  assert.equal(d.ok && d.value.currency, 'eur')
  for (const bad of [{ name: '', price: 5, lessons_per_period: 4, period: 'month' }, { name: 'a', price: 0, lessons_per_period: 4, period: 'month' }, { name: 'a', price: 5, lessons_per_period: 0, period: 'month' },
    { name: 'a', price: 5, lessons_per_period: 4, period: 'year' }, { name: 'a', price: 5, lessons_per_period: 4, period: 'month', duration_minutes: 5 }]) assert.equal(validatePlan(bad).ok, false)
  assert.deepEqual(pickPlanUpdates({ id: 'x', is_active: false }), { ok: true, value: { is_active: false } })
  assert.deepEqual(pickPlanUpdates({ id: 'x', is_active: true, tutor_id: 'evil', price: 1, id2: 'z' }), { ok: true, value: { is_active: true } }, 'other fields are dropped')
  for (const bad of [{ id: 'x' }, { id: 'x', is_active: 'yes' }, { id: 'x', name: '' }, { id: 'x', description: 5 }]) assert.equal(pickPlanUpdates(bad).ok, false)
  assert.deepEqual(planStats([{ is_active: true, price: 200, lessons_per_period: 4 }, { is_active: true, price: 90, lessons_per_period: 3 }, { is_active: false, price: 1, lessons_per_period: 1 }]), { total: 3, active: 2, cheapestPerLesson: 30 })
})

test('waitlist figures and the "3 days ago" wording', () => {
  const list = [{ created_at: new Date(NOW.getTime() - DAY).toISOString(), message: 'hi' }, { created_at: new Date(NOW.getTime() - 20 * DAY).toISOString(), message: null }, { created_at: new Date(NOW.getTime() - 2 * DAY).toISOString(), message: '  ' }]
  assert.deepEqual(waitlistStats(list, NOW), { waiting: 3, thisWeek: 2, withMessage: 1 })
  assert.equal(ago(NOW.toISOString(), NOW), 'Today')
  assert.equal(ago(new Date(NOW.getTime() - DAY).toISOString(), NOW), 'Yesterday')
  assert.equal(ago(new Date(NOW.getTime() - 5 * DAY).toISOString(), NOW), '5 days ago')
  assert.match(ago('2026-01-02T00:00:00Z', NOW), /Jan 2, 2026/)
})

// ---- the real routes and pages over an in-memory Supabase ----------------------------------------------------------------------

const A = '90000000-0000-4000-8000-00000000000a'
const B = '90000000-0000-4000-8000-00000000000b'
const FREE = '90000000-0000-4000-8000-0000000000f1'
const ACAD = '90000000-0000-4000-8000-0000000000ac'
const id = (kind: string, n: number) => `91000000-0000-4000-8000-${kind}${String(n).padStart(11, '0')}`
let db: FakeDb
let session: { id: string } | null
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: { createAdminClient: () => db, createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: session ? { ...session, email: 'tutor@example.com' } : null } }) } }) },
})
mock.module('next/navigation', {
  namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, redirect: (to: string) => { throw new Error(`NEXT_REDIRECT ${to}`) }, useRouter: () => ({ push() {}, replace() {}, refresh() {} }), usePathname: () => '/packages' },
})
const packagesRoute = await import('@/app/api/packages/route.ts')
const couponsRoute = await import('@/app/api/coupons/route.ts')
const plansRoute = await import('@/app/api/subscriptions/plans/route.ts')
const waitlistRoute = await import('@/app/api/waitlist/route.ts')
const teamIdRoute = await import('@/app/api/team/[id]/route.ts')
const teamAssign = await import('@/app/api/team/assign/route.ts')
const teamPayout = await import('@/app/api/team/payout/route.ts')
const packagesPage = (await import('@/app/(dashboard)/packages/page.tsx')).default as () => Promise<React.ReactElement>
const waitlistPage = (await import('@/app/(dashboard)/waitlist/page.tsx')).default as () => Promise<React.ReactElement>
const couponsPage = (await import('@/app/(dashboard)/coupons/page.tsx')).default as () => Promise<React.ReactElement>

beforeEach(() => {
  db = createFakeDb({
    tutors: [{ id: A, subscription_status: 'pro', currency: 'EUR' }, { id: B, subscription_status: 'pro', currency: 'USD' }, { id: FREE, subscription_status: 'free', currency: 'USD' }, { id: ACAD, subscription_status: 'academy', currency: 'USD' }],
    packages: [{ id: id('a', 1), tutor_id: A, name: 'Pack A', lessons_count: 10, price: 200, description: null, active: true, created_at: '2026-10-01T00:00:00Z' }, { id: id('b', 1), tutor_id: B, name: 'Secret B pack', lessons_count: 5, price: 77, active: true, created_at: '2026-10-02T00:00:00Z' }],
    coupons: [{ id: id('a', 1), tutor_id: A, code: 'AAA', discount_type: 'percent', discount_value: 10, max_uses: null, uses_count: 0, expires_at: null, active: true, created_at: '2026-10-01T00:00:00Z' }, { id: id('b', 1), tutor_id: B, code: 'BBB-SECRET', discount_type: 'fixed', discount_value: 5, max_uses: null, uses_count: 0, expires_at: null, active: true, created_at: '2026-10-01T00:00:00Z' }],
    subscription_plans: [{ id: id('a', 1), tutor_id: A, name: 'Plan A', price: 100, currency: 'usd', lessons_per_period: 4, period: 'month', duration_minutes: 60, is_active: true, created_at: '2026-10-01T00:00:00Z' }, { id: id('b', 1), tutor_id: B, name: 'Plan B', price: 100, currency: 'usd', lessons_per_period: 4, period: 'month', duration_minutes: 60, is_active: true, created_at: '2026-10-01T00:00:00Z' }],
    waitlist: [{ id: id('a', 1), tutor_id: A, name: 'Waiting Ann', email: 'ann@example.com', message: 'Please', created_at: new Date().toISOString() }, { id: id('b', 1), tutor_id: B, name: 'Waiting Bo', email: 'bo@example.com', message: null, created_at: new Date().toISOString() }],
    team_members: [{ id: id('a', 1), owner_id: ACAD, name: 'Member One', pay_type: 'per_lesson', pay_rate: 10, active: true }],
    lessons: [{ id: id('a', 1), tutor_id: ACAD, assigned_to: null }],
    payroll_payouts: [],
  })
  session = { id: A }
})
const json = (body: unknown) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const rq = (url: string, init?: RequestInit) => new NextRequest(`http://x${url}`, init as never) as never
const get = <T extends { status: number }>(p: Promise<T>) => p.then(r => r.status)

test('packages route: own packages only, validated, Pro only, a second tutor cannot remove the first tutor\'s', async () => {
  const mine = await (await packagesRoute.GET()).json()
  assert.deepEqual(mine.packages.map((p: { name: string }) => p.name), ['Pack A'])
  const made = await packagesRoute.POST(rq('/api/packages', json({ name: 'New', lessons_count: 4, price: 80 })))
  assert.equal(made.status, 200)
  assert.equal(db.tables.packages.find(p => p.name === 'New')!.tutor_id, A, 'saved for the session\'s tutor')
  assert.equal(await get(packagesRoute.POST(rq('/api/packages', json({ name: 'Bad', lessons_count: -1, price: 80 })))), 400)
  assert.equal(await get(packagesRoute.POST(rq('/api/packages', json({ name: 'Bad', lessons_count: 4, price: 80, tutor_id: B })))), 200, 'a tutor_id in the body is ignored')
  assert.ok(db.tables.packages.filter(p => p.name === 'Bad').every(p => p.tutor_id === A))
  session = { id: B }
  assert.equal(await get(packagesRoute.DELETE(rq(`/api/packages?id=${id('a', 1)}`, { method: 'DELETE' }))), 404)
  assert.equal((db.tables.packages.find(p => p.id === id('a', 1)) as { active: boolean }).active, true, 'A\'s package is still on sale')
  assert.equal(await get(packagesRoute.DELETE(rq('/api/packages?id=not-an-id', { method: 'DELETE' }))), 400)
  assert.equal(await get(packagesRoute.DELETE(rq(`/api/packages?id=${id('b', 1)}`, { method: 'DELETE' }))), 200, 'their own works')
  session = { id: FREE }
  assert.equal(await get(packagesRoute.GET()), 403)
  assert.equal(await get(packagesRoute.POST(rq('/api/packages', json({ name: 'x', lessons_count: 1, price: 1 })))), 403)
  session = null
  assert.equal(await get(packagesRoute.GET()), 401)
})

test('coupons route: own coupons only, validated, Pro only; a second tutor cannot delete the first tutor\'s code', async () => {
  assert.deepEqual((await (await couponsRoute.GET()).json()).coupons.map((c: { code: string }) => c.code), ['AAA'])
  const made = await couponsRoute.POST(rq('/api/coupons', json({ code: 'spring10', discount_type: 'percent', discount_value: 10 })))
  assert.equal(made.status, 200)
  assert.equal(db.tables.coupons.find(c => c.code === 'SPRING10')!.tutor_id, A)
  assert.equal(await get(couponsRoute.POST(rq('/api/coupons', json({ code: 'bad code', discount_type: 'percent', discount_value: 10 })))), 400)
  assert.equal(await get(couponsRoute.POST(rq('/api/coupons', json({ code: 'big', discount_type: 'percent', discount_value: 500 })))), 400)
  session = { id: B }
  assert.equal(await get(couponsRoute.DELETE(rq('/api/coupons', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id('a', 1) }) }))), 404)
  assert.ok(db.tables.coupons.some(c => c.id === id('a', 1)), 'A\'s coupon is still there')
  assert.equal(await get(couponsRoute.DELETE(rq('/api/coupons', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'x' }) }))), 400)
  session = { id: FREE }
  assert.equal(await get(couponsRoute.GET()), 403)
  assert.equal(await get(couponsRoute.POST(rq('/api/coupons', json({ code: 'free10', discount_type: 'percent', discount_value: 10 })))), 403)
})

test('plans route: own plans only; a change cannot rewrite tutor_id; a second tutor can neither change nor delete the first tutor\'s plan', async () => {
  const patch = (body: unknown) => plansRoute.PATCH(rq('/api/subscriptions/plans', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }))
  const del = (body: unknown) => plansRoute.DELETE(rq('/api/subscriptions/plans', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }))
  assert.deepEqual((await (await plansRoute.GET()).json()).plans.map((p: { name: string }) => p.name), ['Plan A'])
  assert.equal(await get(patch({ id: id('a', 1), is_active: false, tutor_id: B, price: 1 })), 200)
  const row = db.tables.subscription_plans.find(p => p.id === id('a', 1)) as Record<string, unknown>
  assert.deepEqual([row.is_active, row.tutor_id, row.price], [false, A, 100], 'only is_active changed; tutor_id and price were not written')
  assert.equal(await get(patch({ id: id('a', 1), tutor_id: B })), 400, 'a body with nothing allowed is refused')
  assert.equal(await get(plansRoute.POST(rq('/api/subscriptions/plans', json({ name: 'Bad', price: -1, lessons_per_period: 4, period: 'month' })))), 400)
  assert.equal(await get(plansRoute.POST(rq('/api/subscriptions/plans', json({ name: 'Good', price: 50, lessons_per_period: 2, period: 'week' })))), 200)
  session = { id: B }
  assert.equal(await get(patch({ id: id('a', 1), is_active: true })), 404)
  assert.equal(await get(del({ id: id('a', 1) })), 404)
  assert.equal((db.tables.subscription_plans.find(p => p.id === id('a', 1)) as { is_active: boolean }).is_active, false, 'B changed nothing of A\'s')
  assert.ok(db.tables.subscription_plans.some(p => p.id === id('a', 1)))
  session = { id: FREE }
  assert.equal(await get(plansRoute.GET()), 403)
})

test('waitlist route: a visitor may join (checked), the tutor removes only their own entries', async () => {
  const join = (body: unknown) => waitlistRoute.POST(rq('/api/waitlist', json(body)))
  assert.equal(await get(join({ tutor_id: A, name: 'New Person', email: 'New@Example.com', message: 'hello' })), 200)
  assert.equal(db.tables.waitlist.find(w => w.email === 'new@example.com')!.tutor_id, A, 'email lower-cased')
  for (const bad of [{}, { tutor_id: 'x', name: 'a', email: 'a@example.com' }, { tutor_id: A, name: '', email: 'a@example.com' }, { tutor_id: A, name: 'x'.repeat(81), email: 'a@example.com' },
    { tutor_id: A, name: 'a', email: 'not-an-email' }, { tutor_id: A, name: 'a', email: 'a b@example.com' }]) assert.equal(await get(join(bad)), 400, JSON.stringify(bad).slice(0, 60))
  await join({ tutor_id: A, name: 'Long', email: 'long@example.com', message: 'm'.repeat(900) })
  assert.equal((db.tables.waitlist.find(w => w.email === 'long@example.com') as { message: string }).message.length, 500)
  const del = (body: unknown) => waitlistRoute.DELETE(rq('/api/waitlist', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }))
  session = { id: B }
  assert.equal(await get(del({ id: id('a', 1) })), 404)
  assert.ok(db.tables.waitlist.some(w => w.id === id('a', 1)), 'A\'s entry is still there')
  assert.equal(await get(del({ id: 'x' })), 400)
  assert.equal(await get(del({ id: id('b', 1) })), 200)
  session = null
  assert.equal(await get(del({ id: id('a', 1) })), 401)
})

test('team routes: a second academy owner cannot change, delete, assign to or pay the first owner\'s members and lessons', async () => {
  const OTHER = '90000000-0000-4000-8000-0000000000ad'
  db.tables.tutors.push({ id: OTHER, subscription_status: 'academy', currency: 'USD' })
  session = { id: OTHER }
  const patch = await teamIdRoute.PATCH(rq('/api/team/x', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pay_rate: 999, name: 'Hijack' }) }), { params: Promise.resolve({ id: id('a', 1) }) })
  assert.notEqual(patch.status, 200)
  await teamIdRoute.DELETE(rq('/api/team/x', { method: 'DELETE' }), { params: Promise.resolve({ id: id('a', 1) }) })
  assert.deepEqual(db.tables.team_members.map(m => [m.name, m.pay_rate]), [['Member One', 10]], 'the member is untouched and not deleted')
  assert.equal(await get(teamAssign.POST(rq('/api/team/assign', json({ lessonId: id('a', 1), memberId: id('a', 1) })))), 404, 'not their member')
  assert.equal((db.tables.lessons[0] as { assigned_to: string | null }).assigned_to, null)
  assert.equal(await get(teamPayout.POST(rq('/api/team/payout', json({ memberId: id('a', 1), amount: 50 })))), 404)
  assert.equal(db.tables.payroll_payouts.length, 0, 'no payout was written for someone else\'s member')
  session = { id: A }
  assert.equal(await get(teamAssign.POST(rq('/api/team/assign', json({ lessonId: id('a', 1), memberId: null })))), 403, 'a Pro tutor is refused: Team is an Academy feature')
  session = { id: ACAD }
  assert.equal(await get(teamPayout.POST(rq('/api/team/payout', json({ memberId: id('a', 1), amount: 50 })))), 201)
  assert.equal(db.tables.payroll_payouts.length, 1)
})

const draw = async (p: () => Promise<React.ReactElement>) => renderToStaticMarkup(await p())

test('packages page: figures in the tutor\'s currency, the list, and its own empty state; the other tutor\'s packages are not there', async () => {
  const h = await draw(packagesPage)
  assert.match(h, /data-testid="stat-count"[\s\S]*?>1</)
  assert.match(h, /€20\.00/, 'lowest price per lesson, in euros')
  assert.match(h, /Pack A/)
  assert.ok(!h.includes('Secret B pack'))
  assert.match(h, />Pro</)
  assert.match(h, /<td class="c-main"><b[^>]*>Pack A/)
  db.tables.packages = []
  assert.match(await draw(packagesPage), /data-testid="packages-empty"/)
  session = null
  await assert.rejects(draw(packagesPage), /NEXT_REDIRECT \/login/)
})

test('waitlist page: figures, the list with a remove button, empty and error states; nobody else\'s entries', async () => {
  const h = await draw(waitlistPage)
  assert.match(h, /data-testid="stat-waiting"[\s\S]*?>1</)
  assert.match(h, /Waiting Ann/)
  assert.match(h, /aria-label="Remove Waiting Ann from the waitlist"/)
  assert.ok(!h.includes('Waiting Bo'))
  db.tables.waitlist = []
  assert.match(await draw(waitlistPage), /data-testid="waitlist-empty"/)
  const real = db.from.bind(db)
  db.from = (t: string) => { const q = real(t) as Record<string, unknown>; if (t === 'waitlist') q.order = () => ({ then: (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: { message: 'boom' } }).then(res) }); return q as ReturnType<typeof real> }
  const e = await draw(waitlistPage)
  assert.match(e, /data-testid="waitlist-error"/)
  assert.ok(!e.includes('boom'))
})

test('a Free tutor sees a quiet "Pro" tag and an upgrade sheet, not a blurred page with a padlock', async () => {
  session = { id: FREE }
  for (const page of [packagesPage, waitlistPage, couponsPage]) {
    const h = await draw(page)
    assert.match(h, /data-testid="upgrade-sheet"/)
    assert.match(h, /data-testid="plan-tag"[^>]*>Pro</)
    assert.match(h, /Upgrade to Pro/)
    assert.ok(!/blur-\[|backdrop-blur|lucide-lock/.test(h), 'no blurred preview, no padlock')
  }
  assert.ok(!(await draw(packagesPage)).includes('Pack A'), 'the page content is not sent to a Free tutor')
})

test('the lists are in the shared pattern: a row of figures, a table that becomes cards under 768px, no width of their own', () => {
  for (const f of ['src/app/(dashboard)/packages/PackageManager.tsx', 'src/app/(dashboard)/coupons/CouponsClient.tsx', 'src/app/(dashboard)/subscriptions/SubscriptionsClient.tsx', 'src/app/(dashboard)/waitlist/page.tsx', 'src/app/(dashboard)/team/TeamClient.tsx']) {
    const src = read(f)
    assert.match(src, /<StatRow stats=\{\[/, f)
    assert.doesNotMatch(src, /<PageColumn/, f)
    if (!f.includes('TeamClient')) assert.doesNotMatch(src, /max-w-\[/, f)
  }
  for (const f of ['src/app/(dashboard)/packages/PackageManager.tsx', 'src/app/(dashboard)/coupons/CouponsClient.tsx', 'src/app/(dashboard)/subscriptions/SubscriptionsClient.tsx', 'src/app/(dashboard)/waitlist/page.tsx']) {
    assert.match(read(f), /<table className="dash-table is-cards no-sel">/, f)
  }
  assert.match(read('src/components/lists/StatRow.tsx'), /dash-card dash-kpi dash-c3/)
})

test('the stat row is drawn from the figures it is given', () => {
  const stat = { id: 'a', label: 'Alpha', value: '7', foot: 'seven' }
  const html = renderToStaticMarkup(createElement(StatRow, { stats: [stat, { id: 'b', label: 'Beta', value: '-' }] }))
  assert.match(html, /data-testid="stat-a"[\s\S]*?Alpha[\s\S]*?>7<[\s\S]*?seven/)
  assert.match(html, /data-testid="stat-b"/)
})
