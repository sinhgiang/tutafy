// T-0618: a lesson has at most one open card session, every session is recorded before the student gets
// its link, and once the Connect webhook has marked the lesson paid no new session can be made.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import RealStripe from 'stripe'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

let db: FakeDb | { from: (t: string) => unknown; tables: FakeDb['tables']; log: FakeDb['log'] }
type SessionState = { status: 'open' | 'complete' | 'expired'; account?: string }
const states = new Map<string, SessionState>()
const created: { id: string; options: { stripeAccount?: string } | undefined }[] = []
const expired: string[] = []
let failRetrieve = false

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: { createAdminClient: () => db, createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) },
})
class FakeStripe {
  // the webhook route verifies signatures with the real library
  static webhooks = RealStripe.webhooks
  checkout = { sessions: {
    create: async (_params: unknown, options?: { stripeAccount?: string }) => {
      const id = `cs_test_${created.length + 1}`
      created.push({ id, options })
      states.set(id, { status: 'open', account: options?.stripeAccount })
      return { id, url: `https://checkout.stripe.example/${id}` }
    },
    retrieve: async (id: string, _p: unknown, options?: { stripeAccount?: string }) => {
      if (failRetrieve) throw new Error('network')
      assert.ok(options?.stripeAccount, 'an earlier session is read on the tutor\'s connected account')
      return { id, status: states.get(id)?.status }
    },
    expire: async (id: string, _p: unknown, options?: { stripeAccount?: string }) => {
      assert.ok(options?.stripeAccount, 'a session is closed on the tutor\'s connected account')
      expired.push(id)
      states.set(id, { status: 'expired' })
      return {}
    },
  } }
}
mock.module('stripe', { defaultExport: FakeStripe })

const checkout = await import('@/app/api/stripe/checkout/route.ts')
const webhook = await import('@/app/api/webhooks/stripe-connect/route.ts')

const T1 = '10000000-0000-4000-8000-000000000001'
const S1 = '20000000-0000-4000-8000-000000000001'
const L1 = '30000000-0000-4000-8000-000000000001'
const L2 = '30000000-0000-4000-8000-000000000002'
const WEBHOOK_SECRET = 'whsec_test_secret_for_the_connect_webhook_0123'

function seed() {
  return createFakeDb({
    tutors: [{ id: T1, name: 'Tutor One', currency: 'EUR', subscription_status: 'pro', stripe_account_id: 'acct_one', stripe_onboarding_complete: true }],
    students: [{ id: S1, name: 'Student One', tutor_id: T1, portal_token: 'token-one' }],
    lessons: [
      { id: L1, tutor_id: T1, student_id: S1, price: 40, duration_minutes: 60, payment_status: 'pending' },
      { id: L2, tutor_id: T1, student_id: S1, price: 40, duration_minutes: 60, payment_status: 'paid' },
    ],
  })
}

const realNow = Date.now.bind(Date)
let clockOffset = 0
beforeEach(() => {
  clockOffset += 60 * 60 * 1000 // its own time window: the in-memory request limits of one test never reach the next
  mock.method(Date, 'now', () => realNow() + clockOffset)
  db = seed()
  states.clear(); created.length = 0; expired.length = 0
  failRetrieve = false
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_tests'
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET = WEBHOOK_SECRET
})

const pay = (lessonId = L1) => checkout.POST(new Request('https://www.tutafy.test/api/stripe/checkout', {
  method: 'POST', headers: { host: 'www.tutafy.test', 'x-forwarded-proto': 'https' }, body: JSON.stringify({ lessonId, portalToken: 'token-one' }),
}))
const rows = () => db.tables.lesson_card_payments ?? []
const lesson = (id: string) => db.tables.lessons.find(l => l.id === id)!

function webhookCall(sessionId: string, extra: Record<string, unknown> = {}) {
  const body = JSON.stringify({
    id: 'evt_pay', object: 'event', type: 'checkout.session.completed', account: 'acct_one',
    data: { object: { id: sessionId, object: 'checkout.session', payment_status: 'paid', amount_total: 4000, currency: 'eur', ...extra } },
  })
  const header = RealStripe.webhooks.generateTestHeaderString({ payload: body, secret: WEBHOOK_SECRET })
  return webhook.POST(new Request('https://www.tutafy.test/api/webhooks/stripe-connect', { method: 'POST', headers: { 'stripe-signature': header }, body }))
}

test('every session is recorded before the link is given: lesson, tutor, account, amount and currency are ours', async () => {
  const res = await pay()
  assert.equal(res.status, 200)
  assert.equal((await res.json()).url, 'https://checkout.stripe.example/cs_test_1')
  assert.deepEqual(rows().map(r => ({ ...r })), [{
    stripe_session_id: 'cs_test_1', lesson_id: L1, tutor_id: T1, stripe_account_id: 'acct_one', amount_minor: 4000, currency: 'eur', status: 'created', id: rows()[0].id,
  }])
})

test('a second click (another tab) closes the first session and opens one new one: only one is ever open', async () => {
  await pay()
  const res = await pay()
  assert.equal(res.status, 200)
  assert.deepEqual(expired, ['cs_test_1'])
  assert.deepEqual(rows().map(r => [r.stripe_session_id, r.status]), [['cs_test_1', 'expired'], ['cs_test_2', 'created']])
  assert.equal(rows().filter(r => r.status === 'created').length, 1)
})

test('an earlier session that Stripe says is already complete: the payment is on its way, no new session', async () => {
  await pay()
  states.set('cs_test_1', { status: 'complete' })
  const res = await pay()
  assert.equal(res.status, 409)
  assert.equal((await res.json()).error, 'payment_in_progress')
  assert.equal(created.length, 1)
  assert.deepEqual(expired, [])
  assert.equal(rows()[0].status, 'created', 'the webhook will settle it')
})

test('an earlier session that is already closed is just recorded as expired', async () => {
  await pay()
  states.set('cs_test_1', { status: 'expired' })
  assert.equal((await pay()).status, 200)
  assert.deepEqual(expired, [])
  assert.deepEqual(rows().map(r => r.status), ['expired', 'created'])
})

test('when Stripe cannot be asked about the earlier session, no second session is opened', async () => {
  await pay()
  failRetrieve = true
  const res = await pay()
  assert.equal(res.status, 503)
  assert.equal((await res.json()).error, 'payment_unavailable')
  assert.equal(created.length, 1)
})

test('if the session cannot be recorded it is closed and the student gets no link', async () => {
  const real = db
  db = {
    tables: real.tables, log: real.log,
    from: (t: string) => {
      const b = (real as FakeDb).from(t) as Record<string, unknown>
      if (t !== 'lesson_card_payments') return b
      return new Proxy(b, { get(target, prop) {
        if (prop === 'insert') return () => ({ then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: { message: 'relation does not exist' } }) })
        return (target as Record<string, unknown>)[prop as string]
      } })
    },
  }
  const res = await pay()
  assert.equal(res.status, 503)
  const body = await res.json()
  assert.equal(body.error, 'payment_unavailable')
  assert.equal(body.url, undefined)
  assert.deepEqual(expired, ['cs_test_1'])
})

test('if another request just opened a session for the lesson (unique index), this one is closed: payment_in_progress', async () => {
  const real = db
  db = {
    tables: real.tables, log: real.log,
    from: (t: string) => {
      const b = (real as FakeDb).from(t) as Record<string, unknown>
      if (t !== 'lesson_card_payments') return b
      return new Proxy(b, { get(target, prop) {
        if (prop === 'insert') return () => ({ then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: { code: '23505', message: 'duplicate key' } }) })
        return (target as Record<string, unknown>)[prop as string]
      } })
    },
  }
  const res = await pay()
  assert.equal(res.status, 409)
  assert.equal((await res.json()).error, 'payment_in_progress')
  assert.deepEqual(expired, ['cs_test_1'])
})

test('a lesson already paid never gets a session', async () => {
  const res = await pay(L2)
  assert.equal(res.status, 409)
  assert.equal((await res.json()).error, 'already_settled')
  assert.equal(created.length, 0)
  assert.equal(rows().length, 0)
})

test('end to end: pay, the webhook marks the lesson paid, and then a second tab cannot open a new session', async () => {
  const first = await pay()
  assert.equal(first.status, 200)
  const secondTabOpen = await pay() // another tab, opened before the webhook arrived: replaces the first
  assert.equal(secondTabOpen.status, 200)
  assert.equal((await webhookCall('cs_test_2')).status, 200)
  assert.equal(lesson(L1).payment_status, 'paid')
  const late = await pay()
  assert.equal(late.status, 409)
  assert.equal((await late.json()).error, 'already_settled')
  assert.equal(created.length, 2, 'no third session')
  // the closed first session can never mark anything, even if Stripe somehow reported it paid
  assert.equal((await webhookCall('cs_test_1')).status, 200)
  assert.deepEqual(rows().map(r => [r.stripe_session_id, r.status]), [['cs_test_1', 'expired'], ['cs_test_2', 'paid']])
})
