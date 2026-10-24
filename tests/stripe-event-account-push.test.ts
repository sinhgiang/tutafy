// T-0904:
//   1. The Stripe subscription webhook believed the tutor named INSIDE a signed event. The signature only proves Stripe sent it. Now the
//      event must come from the Stripe account that tutor connected (`event.account`), and the plan must be that tutor's; otherwise nothing
//      is written. Real signatures (Stripe's own test-header generator), real route, in-memory Supabase with two tutors.
//   2. A tutor's push address was never saved: the code read `tutors.user_id`, a column no migration creates. A tutor's row is `id`.
//      The pushed address is also checked now (https only, with its two keys), because the push library sends a request to it.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

let db: FakeDb
let signedIn: string | null = null
const pushes: { title: string; body: string }[] = []

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => db,
    createClient: async () => ({
      from: (t: string) => db.from(t),
      auth: { getUser: async () => ({ data: { user: signedIn ? { id: signedIn } : null } }) },
    }),
  },
})
mock.module(pathToFileURL(path.join(SRC, 'lib/push.ts')).href, {
  namedExports: { sendPushNotification: async (_s: unknown, p: { title: string; body: string }) => { pushes.push(p) } },
})

const webhook = await import('@/app/api/webhooks/stripe/route.ts')
const subscribe = await import('@/app/api/push/subscribe/route.ts')
const messages = await import('@/app/api/messages/route.ts')
const { cleanPushSubscription } = await import('@/lib/push-subscription.ts')

const A = '10000000-0000-4000-8000-00000000000a'
const B = '10000000-0000-4000-8000-00000000000b'
const SA = '20000000-0000-4000-8000-00000000000a'
const SB = '20000000-0000-4000-8000-00000000000b'
const PLAN_A = '60000000-0000-4000-8000-00000000000a'
const PLAN_B = '60000000-0000-4000-8000-00000000000b'
const WH_SECRET = 'whsec_test_secret_for_the_account_check_0123456789'

const SUB = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  expirationTime: null,
  keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' },
}

beforeEach(() => {
  signedIn = null
  pushes.length = 0
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = WH_SECRET
  db = createFakeDb({
    tutors: [
      { id: A, name: 'Ana Tutor', stripe_account_id: 'acct_A', push_subscription: null },
      { id: B, name: 'Ben Tutor', stripe_account_id: 'acct_B', push_subscription: null },
      { id: '10000000-0000-4000-8000-00000000000c', name: 'No Stripe', stripe_account_id: null },
    ],
    students: [
      { id: SA, tutor_id: A, name: 'Student A', email: 'student-a@example.com', portal_token: 'token-a', push_subscription: SUB },
      { id: SB, tutor_id: B, name: 'Student B', email: 'student-b@example.com', portal_token: 'token-b', push_subscription: null },
    ],
    subscription_plans: [{ id: PLAN_A, tutor_id: A }, { id: PLAN_B, tutor_id: B }],
  })
})

// ---- 1. the event's account ----------------------------------------------------------------------------------------------------

function event(o: { type?: string; account?: string | null; tutor?: string; plan?: string; subId?: string; email?: string } = {}) {
  const body = JSON.stringify({
    id: 'evt_acct_1', object: 'event', type: o.type ?? 'customer.subscription.created',
    ...(o.account === null ? {} : { account: o.account ?? 'acct_A' }),
    data: { object: { id: o.subId ?? 'sub_1', object: 'subscription', customer: 'cus_1', status: 'active', current_period_start: 1_790_000_000, current_period_end: 1_792_592_000,
      metadata: { plan_id: o.plan ?? PLAN_A, tutor_id: o.tutor ?? A, student_email: o.email ?? 'learner@example.com', student_name: 'Learner' } } },
  })
  const header = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: WH_SECRET })
  return new NextRequest('https://www.tutafy.test/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': header }, body })
}
const subs = () => db.tables.student_subscriptions ?? []
const studentCount = () => db.tables.students.length
const quiet = () => mock.method(console, 'error', () => {})

test('an event from the connected account of the tutor it names is saved', async () => {
  const res = await webhook.POST(event())
  assert.equal(res.status, 200)
  assert.equal(subs().length, 1)
  assert.equal(subs()[0].tutor_id, A)
  assert.equal(subs()[0].plan_id, PLAN_A)
})

test('a correctly signed event from ANOTHER tutor\'s connected account that names tutor A writes nothing, and is logged', async () => {
  const err = quiet()
  try {
    const before = studentCount()
    const res = await webhook.POST(event({ account: 'acct_B', tutor: A }))
    assert.equal(res.status, 200, 'answered, so Stripe does not send it again; there is nothing to retry')
    assert.deepEqual(await res.json(), { received: true, ignored: 'account_mismatch' })
    assert.equal(subs().length, 0, 'no subscription saved')
    assert.equal(studentCount(), before, 'no student created for tutor A')
    assert.equal(err.mock.calls.length, 1)
    assert.match(String(err.mock.calls[0].arguments.join(' ')), /evt_acct_1/)
  } finally { err.mock.restore() }
})

test('an event with no connected account, or for a tutor with no Stripe account, or for an unknown tutor, writes nothing', async () => {
  const err = quiet()
  try {
    const before = studentCount()
    assert.equal((await (await webhook.POST(event({ account: null }))).json()).ignored, 'account_mismatch')
    assert.equal((await (await webhook.POST(event({ tutor: '10000000-0000-4000-8000-00000000000c' }))).json()).ignored, 'account_mismatch')
    assert.equal((await (await webhook.POST(event({ tutor: '10000000-0000-4000-8000-0000000000ff' }))).json()).ignored, 'account_mismatch')
    assert.equal(subs().length, 0)
    assert.equal(studentCount(), before)
  } finally { err.mock.restore() }
})

test('a plan that belongs to another tutor is never attached, even from the right account', async () => {
  const err = quiet()
  try {
    const before = studentCount()
    const res = await webhook.POST(event({ account: 'acct_A', tutor: A, plan: PLAN_B }))
    assert.equal((await res.json()).ignored, 'account_mismatch')
    assert.equal(subs().length, 0)
    assert.equal(studentCount(), before)
  } finally { err.mock.restore() }
})

test('a cancel from the right account cancels; from another account it does not', async () => {
  const err = quiet()
  try {
    await webhook.POST(event())
    assert.equal(subs()[0].status, 'active')
    const wrong = await webhook.POST(event({ type: 'customer.subscription.deleted', account: 'acct_B' }))
    assert.equal((await wrong.json()).ignored, 'account_mismatch')
    assert.equal(subs()[0].status, 'active', 'another account cannot cancel it')
    const right = await webhook.POST(event({ type: 'customer.subscription.deleted' }))
    assert.equal(right.status, 200)
    assert.equal(subs()[0].status, 'cancelled')
    // a cancel for a subscription we never saved is accepted and does nothing
    assert.equal((await webhook.POST(event({ type: 'customer.subscription.deleted', subId: 'sub_unknown' }))).status, 200)
    assert.equal(subs().length, 1)
  } finally { err.mock.restore() }
})

test('a wrong signature is still refused before anything is read', async () => {
  const body = JSON.stringify({ id: 'evt_x', object: 'event', type: 'customer.subscription.created', account: 'acct_A', data: { object: {} } })
  const header = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_some_other_secret_entirely_0123456789' })
  const res = await webhook.POST(new NextRequest('https://www.tutafy.test/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': header }, body }))
  assert.equal(res.status, 400)
  assert.equal(subs().length, 0)
})

// ---- 2. the tutor's push address -------------------------------------------------------------------------------------------------

const post = (body: unknown) => new Request('https://www.tutafy.test/api/push/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const tutor = (id: string) => db.tables.tutors.find(t => t.id === id)!
const student = (id: string) => db.tables.students.find(s => s.id === id)!

test('push address: a signed-in tutor\'s own row is saved, and only theirs', async () => {
  signedIn = A
  const res = await subscribe.POST(post({ subscription: SUB }))
  assert.equal(res.status, 200)
  assert.deepEqual(tutor(A).push_subscription, SUB)
  assert.equal(tutor(B).push_subscription, null, 'the other tutor is untouched')
  assert.equal(student(SA).push_subscription, SUB, 'and so are the students')
})

test('push address: the row is the session\'s whatever the body says; a visitor is refused; an account with no tutor row is not found', async () => {
  signedIn = B
  await subscribe.POST(post({ subscription: SUB, tutor_id: A, id: A, user_id: A }))
  assert.equal(tutor(A).push_subscription, null)
  assert.deepEqual(tutor(B).push_subscription, SUB)
  signedIn = null
  assert.equal((await subscribe.POST(post({ subscription: SUB }))).status, 401)
  signedIn = '10000000-0000-4000-8000-0000000000ee'
  assert.equal((await subscribe.POST(post({ subscription: SUB }))).status, 404)
})

test('push address: a student link saves that student\'s own address and nobody else\'s', async () => {
  const res = await subscribe.POST(post({ subscription: SUB, portalToken: 'token-b' }))
  assert.equal(res.status, 200)
  assert.deepEqual(student(SB).push_subscription, SUB)
  assert.equal(tutor(A).push_subscription, null)
  assert.equal(tutor(B).push_subscription, null)
  await subscribe.POST(post({ subscription: { ...SUB, endpoint: 'https://push.example.com/x' }, portalToken: 'no-such-token' }))
  assert.equal(student(SA).push_subscription, SUB, 'an unknown link changes nothing')
})

test('push address: only a well-formed https address with its keys is kept', async () => {
  signedIn = A
  for (const bad of [
    null, 'text', {}, { endpoint: 'https://push.example.com/x' },
    { ...SUB, endpoint: 'http://push.example.com/x' }, { ...SUB, endpoint: 'file:///etc/passwd' }, { ...SUB, endpoint: 'javascript:alert(1)' },
    { ...SUB, endpoint: 'https://user:secret@push.example.com/x' }, { ...SUB, endpoint: `https://push.example.com/${'a'.repeat(2000)}` },
    { ...SUB, endpoint: 'not a url' }, { ...SUB, keys: { p256dh: SUB.keys.p256dh } }, { ...SUB, keys: { p256dh: 'short', auth: SUB.keys.auth } },
    { ...SUB, keys: { p256dh: { $ne: 1 }, auth: SUB.keys.auth } }, { ...SUB, keys: null },
  ]) {
    const res = await subscribe.POST(post({ subscription: bad }))
    assert.equal(res.status, 400, JSON.stringify(bad)?.slice(0, 80))
  }
  assert.equal(tutor(A).push_subscription, null)
  assert.equal((await subscribe.POST(new Request('https://www.tutafy.test/api/push/subscribe', { method: 'POST', body: 'not json' }))).status, 400)
})

test('push address: only the fields the library needs are kept (no extra data is stored)', () => {
  const kept = cleanPushSubscription({ ...SUB, expirationTime: 1_800_000_000_000, extra: 'x', keys: { ...SUB.keys, other: 'y' } })
  assert.deepEqual(kept, { endpoint: SUB.endpoint, expirationTime: 1_800_000_000_000, keys: SUB.keys })
  assert.equal(cleanPushSubscription({ ...SUB, expirationTime: 'soon' })!.expirationTime, null)
})

test('a message to a student names the tutor (the name was looked up by the same missing column)', async () => {
  signedIn = A
  const res = await messages.POST(new NextRequest('https://www.tutafy.test/api/messages', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ student_id: SA, content: 'See you Thursday' }),
  }))
  assert.equal(res.status, 200)
  assert.equal(pushes.length, 1)
  assert.equal(pushes[0].title, 'New message from Ana Tutor')
})
