// T-0618: the Stripe Connect webhook marks a lesson paid, exactly once, only through a session this app
// opened. The signatures here are real (stripe's own test-header generator) and the Stripe library is not
// mocked, so a wrong signature is rejected by the same code that rejects it in production.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import Stripe from 'stripe'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

let db: FakeDb | { from: (t: string) => unknown; tables: FakeDb['tables']; log: FakeDb['log'] }
let touched = 0
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: { createAdminClient: () => { touched++; return db } },
})
const { POST } = await import('@/app/api/webhooks/stripe-connect/route.ts')

const SECRET = 'whsec_test_secret_for_the_connect_webhook_0123'
const T1 = '10000000-0000-4000-8000-000000000001'
const T2 = '10000000-0000-4000-8000-000000000002'
const S1 = '20000000-0000-4000-8000-000000000001'
const S2 = '20000000-0000-4000-8000-000000000002'
const L1 = '30000000-0000-4000-8000-000000000001' // T1, session cs_one, 25 USD
const L2 = '30000000-0000-4000-8000-000000000002' // T2, session cs_two
const L3 = '30000000-0000-4000-8000-000000000003' // T1, already paid by hand
const L4 = '30000000-0000-4000-8000-000000000004' // T1, a lesson the body's metadata will try to name

function seed() {
  return createFakeDb({
    tutors: [{ id: T1, stripe_account_id: 'acct_one' }, { id: T2, stripe_account_id: 'acct_two' }],
    students: [{ id: S1, tutor_id: T1 }, { id: S2, tutor_id: T2 }],
    lessons: [
      { id: L1, tutor_id: T1, student_id: S1, price: 25, payment_status: 'pending' },
      { id: L2, tutor_id: T2, student_id: S2, price: 30, payment_status: 'pending' },
      { id: L3, tutor_id: T1, student_id: S1, price: 25, payment_status: 'paid' },
      { id: L4, tutor_id: T1, student_id: S1, price: 25, payment_status: 'pending' },
    ],
    lesson_card_payments: [
      { stripe_session_id: 'cs_one', lesson_id: L1, tutor_id: T1, stripe_account_id: 'acct_one', amount_minor: 2500, currency: 'usd', status: 'created' },
      { stripe_session_id: 'cs_two', lesson_id: L2, tutor_id: T2, stripe_account_id: 'acct_two', amount_minor: 3000, currency: 'usd', status: 'created' },
      { stripe_session_id: 'cs_three', lesson_id: L3, tutor_id: T1, stripe_account_id: 'acct_one', amount_minor: 2500, currency: 'usd', status: 'created' },
    ],
  })
}

beforeEach(() => {
  db = seed()
  touched = 0
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET = SECRET
})

type Opts = { type?: string; account?: string | null; session?: Record<string, unknown>; id?: string; secret?: string; timestamp?: number }
function eventBody(o: Opts = {}) {
  return JSON.stringify({
    id: o.id ?? 'evt_1',
    object: 'event',
    type: o.type ?? 'checkout.session.completed',
    ...(o.account === null ? {} : { account: o.account ?? 'acct_one' }),
    data: { object: { id: 'cs_one', object: 'checkout.session', payment_status: 'paid', amount_total: 2500, currency: 'usd', ...o.session } },
  })
}
function signed(body: string, o: Opts = {}) {
  const header = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: o.secret ?? SECRET, timestamp: o.timestamp })
  return new Request('https://www.tutafy.test/api/webhooks/stripe-connect', { method: 'POST', headers: { 'stripe-signature': header }, body })
}
const deliver = (o: Opts = {}) => POST(signed(eventBody(o), o))
const lesson = (id: string) => db.tables.lessons.find(l => l.id === id)!
const payment = (id: string) => db.tables.lesson_card_payments.find(p => p.stripe_session_id === id)!
const lessonUpdates = () => db.log.filter(e => e.table === 'lessons' && e.op === 'update').length

test('a paid session of ours marks its lesson paid, and the row records the event', async () => {
  const res = await deliver()
  assert.equal(res.status, 200)
  assert.equal(lesson(L1).payment_status, 'paid')
  assert.equal(payment('cs_one').status, 'paid')
  assert.equal(payment('cs_one').stripe_event_id, 'evt_1')
  assert.ok(payment('cs_one').paid_at)
  assert.equal(lesson(L2).payment_status, 'pending', 'no other lesson is touched')
})

test('the same event delivered again does nothing more: once paid, a later change is not undone', async () => {
  await deliver()
  assert.equal(lessonUpdates(), 1)
  lesson(L1).payment_status = 'refunded' // the tutor refunds it afterwards
  const again = await deliver()
  assert.equal(again.status, 200)
  assert.equal(lesson(L1).payment_status, 'refunded', 'a repeat delivery must not mark it paid again')
  assert.equal(payment('cs_one').stripe_event_id, 'evt_1')
  // and a second, different event for the same session (Stripe sends completed and async_payment_succeeded for some methods)
  await deliver({ type: 'checkout.session.async_payment_succeeded', id: 'evt_2' })
  assert.equal(lesson(L1).payment_status, 'refunded')
  assert.equal(payment('cs_one').stripe_event_id, 'evt_1')
})

test('two deliveries at the same moment: only one claims the payment', async () => {
  const [a, b] = await Promise.all([deliver(), deliver()])
  assert.equal(a.status, 200)
  assert.equal(b.status, 200)
  assert.equal(lessonUpdates(), 1, 'the lesson was written once')
  assert.equal(lesson(L1).payment_status, 'paid')
  assert.equal(db.tables.lesson_card_payments.filter(p => p.status === 'paid').length, 1)
})

test('no secret, or a short one: 503, and the database is not even opened', async () => {
  for (const value of [undefined, '', '   ', 'whsec_short']) {
    if (value === undefined) delete process.env.STRIPE_CONNECT_WEBHOOK_SECRET
    else process.env.STRIPE_CONNECT_WEBHOOK_SECRET = value
    const res = await POST(signed(eventBody())) // signed with the real secret, which the server does not have
    assert.equal(res.status, 503)
    assert.equal((await res.json()).error, 'webhook_not_configured')
  }
  assert.equal(touched, 0)
  assert.equal(lesson(L1).payment_status, 'pending')
  // 15 characters is too short, 16 is accepted
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET = 'a'.repeat(15)
  assert.equal((await POST(signed(eventBody(), { secret: 'a'.repeat(15) }))).status, 503)
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET = 'a'.repeat(16)
  assert.equal((await POST(signed(eventBody(), { secret: 'a'.repeat(16) }))).status, 200)
})

test('a wrong, missing, altered or stale signature is refused and nothing changes', async () => {
  const body = eventBody()
  const noHeader = new Request('https://www.tutafy.test/x', { method: 'POST', body })
  assert.equal((await POST(noHeader)).status, 400)
  assert.equal((await POST(signed(body, { secret: 'whsec_some_other_endpoint_secret_0123456789' }))).status, 400)
  // signed for one amount, sent with another
  const forged = new Request('https://www.tutafy.test/x', { method: 'POST', headers: { 'stripe-signature': Stripe.webhooks.generateTestHeaderString({ payload: body, secret: SECRET }) }, body: body.replace('2500', '1') })
  assert.equal((await POST(forged)).status, 400)
  // older than the 5 minute window: a recorded request cannot be replayed later
  assert.equal((await POST(signed(body, { timestamp: Math.floor(Date.now() / 1000) - 3600 }))).status, 400)
  assert.equal((await POST(new Request('https://www.tutafy.test/x', { method: 'POST', headers: { 'stripe-signature': 'garbage' }, body }))).status, 400)
  assert.equal(touched, 0, 'the database is not opened for an unsigned request')
  assert.equal(lesson(L1).payment_status, 'pending')
  assert.equal(db.log.length, 0)
})

test('a lesson of another tutor: a session of tutor one reported by tutor two\'s account marks nothing', async () => {
  const res = await deliver({ account: 'acct_two' }) // cs_one belongs to acct_one
  assert.equal(res.status, 200)
  assert.equal(lesson(L1).payment_status, 'pending')
  assert.equal(payment('cs_one').status, 'created')
  assert.equal(lesson(L2).payment_status, 'pending')
  // and the account of the real owner still works afterwards
  await deliver({ account: 'acct_one' })
  assert.equal(lesson(L1).payment_status, 'paid')
})

test('the body\'s own metadata cannot name another lesson or tutor: the row decides', async () => {
  await deliver({ session: { metadata: { lesson_id: L4, tutor_id: T2 }, client_reference_id: L4 } })
  assert.equal(lesson(L1).payment_status, 'paid')
  assert.equal(lesson(L4).payment_status, 'pending')
  assert.equal(lesson(L2).payment_status, 'pending')
})

test('a session we never opened, an event without a connected account, and unpaid or other events are ignored', async () => {
  for (const o of [
    { session: { id: 'cs_unknown' } },
    { account: null },
    { session: { payment_status: 'unpaid' } },
    { type: 'checkout.session.expired' },
    { type: 'payment_intent.succeeded' },
  ] as Opts[]) {
    const res = await deliver(o)
    assert.equal(res.status, 200)
    assert.ok((await res.json()).ignored, JSON.stringify(o))
  }
  assert.equal(lesson(L1).payment_status, 'pending')
  assert.equal(db.log.filter(e => e.op !== 'select').length, 0)
})

test('a lesson that is already paid (by hand, or by another session): the payment is flagged for a refund, the lesson is left alone', async () => {
  const res = await deliver({ session: { id: 'cs_three' }, id: 'evt_dup' })
  assert.equal(res.status, 200)
  assert.equal((await res.json()).duplicate, true)
  assert.equal(payment('cs_three').status, 'duplicate')
  assert.equal(lesson(L3).payment_status, 'paid')
  // a second delivery does not flag it again or change anything
  const before = JSON.stringify(payment('cs_three'))
  await deliver({ session: { id: 'cs_three' }, id: 'evt_dup' })
  assert.equal(JSON.stringify(payment('cs_three')), before)
})

test('another paid session of the same lesson loses the race at the database (unique index): flagged, not marked', async () => {
  const real = db
  db = {
    tables: real.tables, log: real.log,
    from: (t: string) => {
      const b = (real as FakeDb).from(t) as Record<string, (...a: unknown[]) => unknown>
      if (t !== 'lesson_card_payments') return b
      return new Proxy(b, { get(target, prop) {
        if (prop === 'update') return (patch: { status?: string }) => patch.status === 'paid'
          ? { eq: () => ({ eq: () => ({ select: async () => ({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }) }) }) }
          : target.update(patch)
        return target[prop as string]
      } })
    },
  }
  const res = await deliver()
  assert.equal(res.status, 200)
  assert.equal(payment('cs_one').status, 'duplicate')
  assert.equal(lesson(L1).payment_status, 'pending')
})

test('the paid amount or currency differs from what we asked for: nothing is marked and the row says so', async () => {
  assert.equal((await deliver({ session: { amount_total: 100 } })).status, 200)
  assert.equal(lesson(L1).payment_status, 'pending')
  assert.equal(payment('cs_one').status, 'mismatch')
  db = seed()
  await deliver({ session: { currency: 'eur' } })
  assert.equal(lesson(L1).payment_status, 'pending')
  assert.equal(payment('cs_one').status, 'mismatch')
})

test('a database error is answered 500 so Stripe tries again; a failed lesson update gives the claim back', async () => {
  const real = db
  let failLessons = true
  db = {
    tables: real.tables, log: real.log,
    from: (t: string) => {
      const b = (real as FakeDb).from(t) as Record<string, (...a: unknown[]) => unknown>
      if (t !== 'lessons') return b
      return new Proxy(b, { get(target, prop) {
        if (prop === 'update' && failLessons) {
          const failing: Record<string, unknown> = {}
          failing.eq = () => failing
          failing.select = () => failing
          failing.then = (resolve: (v: unknown) => unknown) => resolve({ data: null, error: { message: 'boom' } })
          return () => failing
        }
        return target[prop as string]
      } })
    },
  }
  assert.equal((await deliver()).status, 500)
  assert.equal(payment('cs_one').status, 'created', 'the claim was given back')
  assert.equal(lesson(L1).payment_status, 'pending')
  failLessons = false
  assert.equal((await deliver()).status, 200) // Stripe's retry
  assert.equal(lesson(L1).payment_status, 'paid')
  assert.equal(payment('cs_one').status, 'paid')
})

test('a delivery that stopped after the claim is finished by the retry', async () => {
  payment('cs_one').status = 'paid' // claimed, but the lesson update never happened
  assert.equal((await deliver()).status, 200)
  assert.equal(lesson(L1).payment_status, 'paid')
})

test('the route reads nothing from the body but the session id, the account and the amount to compare', () => {
  const src = readFileSync(path.join(SRC, 'app/api/webhooks/stripe-connect/route.ts'), 'utf8')
  assert.ok(!/\.metadata\b|client_reference_id|\.customer_email\b/.test(src.replace(/\/\/.*$/gm, '')), 'metadata is never read')
  assert.ok(/Stripe\.webhooks\.constructEvent\(body, signature, secret\)/.test(src))
  assert.ok(/readSecret\('STRIPE_CONNECT_WEBHOOK_SECRET'\)/.test(src))
  // the secret check comes before the body is read and before the database is opened
  assert.ok(src.indexOf("readSecret('STRIPE_CONNECT_WEBHOOK_SECRET')") < src.indexOf('request.text()'))
  assert.ok(src.indexOf('constructEvent') < src.indexOf('createAdminClient()'))
  // lessons are only ever written here as pending -> paid
  assert.equal((src.match(/from\('lessons'\)/g) ?? []).length, 1)
  assert.ok(/\.eq\('payment_status', 'pending'\)/.test(src))
})
