// T-1052: cancelling a plan keeps it to the end of the paid period. Polar sends `subscription.canceled` as soon as the customer asks to
// cancel at the end of the period; the plan is taken away at `subscription.revoked` or when the paid period is over. The REAL webhook route
// runs over an in-memory Supabase with made-up Polar events (nothing here reaches Polar). The signature rules themselves are in
// tests/polar-webhook.test.ts; the last tests here only prove they hold for cancel events too.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

let db: FakeDb
mock.module('@supabase/supabase-js', { exports: { createClient: () => db } })

const route = await import('@/app/api/webhooks/polar/route.ts')
const { decideCancel, isPaidNow, paidUntil } = await import('@/lib/polar-subscription.ts')
const { NextRequest } = await import('next/server.js')

const SECRET = 'webhook-test-secret-0123456789abcdef'
const TUTOR = '11111111-1111-4111-8111-111111111111'
const DAY = 86_400_000
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString()

let logged: string[] = []
beforeEach(() => {
  process.env.POLAR_WEBHOOK_SECRET = SECRET
  logged = []
  mock.method(console, 'error', (...a: unknown[]) => { logged.push(a.join(' ')) })
  mock.method(console, 'warn', (...a: unknown[]) => { logged.push(a.join(' ')) })
  mock.method(console, 'log', (...a: unknown[]) => { logged.push(a.join(' ')) })
  db = createFakeDb({ tutors: [{ id: TUTOR, name: 'Ten', email: 'ten@example.com', subscription_status: 'free' }] })
})

const tutor = () => db.tables.tutors[0] as Record<string, unknown>
const plan = () => tutor().subscription_status

/** A paid tutor as the created event leaves them: on `sub`, paid up to 20 days ahead. */
function payingTutor(planName = 'pro', sub = 'sub_1') {
  db.tables.tutors[0] = { ...tutor(), subscription_status: planName, polar_subscription_id: sub, subscription_expires_at: inDays(20) }
}

function sign(id: string, ts: string, body: string, secret = SECRET) {
  return 'v1,' + crypto.createHmac('sha256', Buffer.from(secret, 'utf8')).update(`${id}.${ts}.${body}`).digest('base64')
}

function request(body: string, opts: { id?: string; secret?: string; ts?: number; signed?: boolean } = {}) {
  const ts = String(opts.ts ?? Math.floor(Date.now() / 1000))
  const id = opts.id ?? 'evt_1'
  const headers: Record<string, string> = opts.signed === false ? {} : { 'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': sign(id, ts, body, opts.secret) }
  return new NextRequest('https://tutafy.test/api/webhooks/polar', { method: 'POST', headers, body })
}

function eventBody(type: string, over: Record<string, unknown> = {}, product = 'Tutafy Pro') {
  return JSON.stringify({
    type,
    data: { id: 'sub_1', status: 'active', product: { name: product }, customer: { external_id: TUTOR, email: 'ten@example.com' }, current_period_end: inDays(20), ...over },
  })
}

let n = 0
const send = (type: string, over: Record<string, unknown> = {}, product?: string) => route.POST(request(eventBody(type, over, product), { id: `evt_${++n}` }))

test('canceled with paid time left: the tutor KEEPS Pro and the end of the period is recorded', async () => {
  payingTutor('pro')
  const end = inDays(12)
  const res = await send('subscription.canceled', { status: 'active', cancel_at_period_end: true, ends_at: end, current_period_end: end })
  assert.equal(res.status, 200)
  assert.equal(plan(), 'pro', 'a cancel request does not cut the plan')
  assert.equal(Date.parse(tutor().subscription_expires_at as string), Date.parse(end), 'the day the plan ends is kept')
  assert.equal(tutor().polar_subscription_id, 'sub_1')
  assert.ok(logged.some(l => l.includes('keeps the plan until')))
})

test('canceled for Academy keeps Academy; `ends_at` wins over the later `current_period_end`', async () => {
  payingTutor('academy')
  const res = await send('subscription.canceled', { ends_at: inDays(5), current_period_end: inDays(30) }, 'Tutafy Academy')
  assert.equal(res.status, 200)
  assert.equal(plan(), 'academy')
  const stored = Date.parse(tutor().subscription_expires_at as string)
  assert.ok(stored < Date.now() + 6 * DAY && stored > Date.now() + 4 * DAY, 'ends_at (5 days), not current_period_end (30 days)')
})

test('when the paid period then ends, `revoked` takes the plan away and clears the date', async () => {
  payingTutor('pro')
  await send('subscription.canceled', { ends_at: inDays(12) })
  assert.equal(plan(), 'pro')
  const res = await send('subscription.revoked', { status: 'canceled', ends_at: inDays(-0.01), current_period_end: inDays(-0.01) })
  assert.equal(res.status, 200)
  assert.equal(plan(), 'free')
  assert.equal(tutor().subscription_expires_at, null)
})

test('`revoked` always drops the plan, even when its dates still look like the future', async () => {
  payingTutor('pro')
  assert.equal((await send('subscription.revoked', { ends_at: inDays(9) })).status, 200)
  assert.equal(plan(), 'free')
  assert.equal(tutor().subscription_expires_at, null)
})

test('canceled when the paid period is already over (a cancel that took effect at once) drops the plan', async () => {
  payingTutor('pro')
  assert.equal((await send('subscription.canceled', { status: 'canceled', ends_at: inDays(-1), current_period_end: inDays(-1) })).status, 200)
  assert.equal(plan(), 'free')
  assert.equal(tutor().subscription_expires_at, null)
})

test('canceled with no end date at all changes nothing and says so in the log (revoked will follow)', async () => {
  payingTutor('pro')
  const before = { ...tutor() }
  assert.equal((await send('subscription.canceled', { current_period_end: null, ends_at: null })).status, 200)
  assert.deepEqual(tutor(), before)
  assert.ok(logged.some(l => l.includes('without an end date')))
})

test('the "updated" events that follow a cancel keep the plan to the end, and drop it once the time is over', async () => {
  payingTutor('pro')
  const end = inDays(12)
  await send('subscription.canceled', { ends_at: end })
  assert.equal((await send('subscription.updated', { status: 'active', cancel_at_period_end: true, ends_at: end, current_period_end: end })).status, 200)
  assert.equal(plan(), 'pro')
  // a status of "canceled" with time left still counts as paid until then
  assert.equal((await send('subscription.updated', { status: 'canceled', ends_at: end, current_period_end: end })).status, 200)
  assert.equal(plan(), 'pro')
  assert.equal(Date.parse(tutor().subscription_expires_at as string), Date.parse(end))
  assert.equal((await send('subscription.updated', { status: 'canceled', ends_at: inDays(-2), current_period_end: inDays(-2) })).status, 200)
  assert.equal(plan(), 'free')
})

test('the same canceled event sent twice (a retry) gives the same result', async () => {
  payingTutor('pro')
  const end = inDays(12)
  for (let i = 0; i < 2; i++) assert.equal((await send('subscription.canceled', { ends_at: end })).status, 200)
  assert.equal(plan(), 'pro')
  assert.equal(Date.parse(tutor().subscription_expires_at as string), Date.parse(end))
})

test('an OLDER subscription of the tutor ending does not take away the plan they are on now (canceled, revoked, updated as canceled)', async () => {
  payingTutor('academy', 'sub_new')
  const before = { ...tutor() }
  assert.equal((await send('subscription.canceled', { id: 'sub_old', ends_at: inDays(-3) })).status, 200)
  assert.equal((await send('subscription.revoked', { id: 'sub_old', ends_at: inDays(-3) })).status, 200)
  assert.equal((await send('subscription.updated', { id: 'sub_old', status: 'canceled', ends_at: inDays(-3) })).status, 200)
  assert.deepEqual(tutor(), before)
  assert.equal(plan(), 'academy')
})

test('a tutor with no subscription id recorded yet (older rows) is still cancelled by an event that names them', async () => {
  db.tables.tutors[0] = { ...tutor(), subscription_status: 'pro', polar_subscription_id: null, subscription_expires_at: inDays(20) }
  assert.equal((await send('subscription.revoked', { ends_at: inDays(-1) })).status, 200)
  assert.equal(plan(), 'free')
})

test('a cancel event nobody can be matched to changes nothing and still answers 200', async () => {
  payingTutor('pro')
  const before = { ...tutor() }
  const body = JSON.stringify({ type: 'subscription.revoked', data: { id: 'sub_1', customer: { external_id: 'no-such-tutor', email: 'nobody@example.com' } } })
  assert.equal((await route.POST(request(body))).status, 200)
  assert.deepEqual(tutor(), before)
})

test('cancel events are as closed as any other: no signature, a wrong one or an old timestamp changes nothing', async () => {
  payingTutor('pro')
  const before = { ...tutor() }
  const body = eventBody('subscription.revoked', { ends_at: inDays(-1) })
  assert.equal((await route.POST(request(body, { signed: false }))).status, 401)
  assert.equal((await route.POST(request(body, { secret: 'another-long-secret-0123456789abcdef' }))).status, 401)
  assert.equal((await route.POST(request(body, { ts: Math.floor(Date.now() / 1000) - 10 * 60 }))).status, 401)
  assert.deepEqual(tutor(), before, 'a forged revoke cannot take a plan away')
  delete process.env.POLAR_WEBHOOK_SECRET
  assert.equal((await route.POST(request(body))).status, 503, 'no signing secret: closed')
  assert.deepEqual(tutor(), before)
})

test('the cancel decision on its own: keep while time is left, drop when over, wait with no date', () => {
  const NOW = Date.parse('2026-10-28T12:00:00Z')
  assert.deepEqual(decideCancel({ ends_at: '2026-11-10T00:00:00Z' }, NOW), { action: 'keep_until', until: '2026-11-10T00:00:00.000Z' })
  assert.deepEqual(decideCancel({ current_period_end: '2026-11-10T00:00:00Z' }, NOW), { action: 'keep_until', until: '2026-11-10T00:00:00.000Z' })
  assert.deepEqual(decideCancel({ ends_at: '2026-10-28T12:00:00Z' }, NOW), { action: 'drop' }, 'ending exactly now is over')
  assert.deepEqual(decideCancel({ ends_at: '2026-10-01T00:00:00Z' }, NOW), { action: 'drop' })
  for (const none of [{}, { ends_at: null, current_period_end: null }, { ends_at: 'soon' }, { ends_at: 5 as unknown as string }]) {
    assert.deepEqual(decideCancel(none, NOW), { action: 'wait' }, JSON.stringify(none))
  }
  assert.equal(paidUntil({ ends_at: 'garbage', current_period_end: '2026-11-10T00:00:00Z' }), Date.parse('2026-11-10T00:00:00Z'), 'an unreadable ends_at falls back to the period end')
})

test('paid now: active or trialing, or canceled with time left; nothing else', () => {
  const NOW = Date.parse('2026-10-28T12:00:00Z')
  assert.equal(isPaidNow({ status: 'active' }, NOW), true)
  assert.equal(isPaidNow({ status: 'trialing' }, NOW), true)
  assert.equal(isPaidNow({ status: 'canceled', ends_at: '2026-11-10T00:00:00Z' }, NOW), true)
  assert.equal(isPaidNow({ status: 'canceled', ends_at: '2026-10-01T00:00:00Z' }, NOW), false)
  assert.equal(isPaidNow({ status: 'canceled' }, NOW), false)
  for (const status of ['past_due', 'incomplete', 'unpaid', 'revoked', '', undefined]) {
    assert.equal(isPaidNow({ status, ends_at: '2026-11-10T00:00:00Z' }, NOW), false, String(status))
  }
})
