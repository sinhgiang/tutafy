// T-0612: a student's card payment goes to the TUTOR's own Stripe account (never the platform's),
// and the amount, currency and lesson come from the database, never from the browser.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import { assertRateLimitHolds } from './support/rate-limit-check.ts'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

let db: FakeDb
type Params = {
  line_items: { price_data: { unit_amount: number; currency: string; product_data: { name: string; description?: string } } }[]
  success_url: string
  metadata: Record<string, string | undefined>
}
type Call = { params: Params; options: { stripeAccount?: string } | undefined }
const sessions: Call[] = []
let stripeKeys: string[] = []

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: { createAdminClient: () => db, createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) },
})
class FakeStripe {
  constructor(key: string) { stripeKeys.push(key) }
  checkout = { sessions: { create: async (params: Call['params'], options?: Call['options']) => { sessions.push({ params, options }); return { url: 'https://checkout.stripe.example/session' } } } }
}
mock.module('stripe', { defaultExport: FakeStripe })

const { POST } = await import('@/app/api/stripe/checkout/route.ts')
const { stripeMinorUnits } = await import('@/lib/stripe/amount.ts')

const T1 = '10000000-0000-4000-8000-000000000001' // a Pro tutor with Stripe connected
const T2 = '10000000-0000-4000-8000-000000000002' // a Pro tutor who has not connected Stripe
const T3 = '10000000-0000-4000-8000-000000000003' // a Free tutor
const T4 = '10000000-0000-4000-8000-000000000004' // Pro, connected but onboarding not finished
const S1 = '20000000-0000-4000-8000-000000000001'
const S2 = '20000000-0000-4000-8000-000000000002'
const S3 = '20000000-0000-4000-8000-000000000003'
const S4 = '20000000-0000-4000-8000-000000000004'
const S5 = '20000000-0000-4000-8000-000000000005' // a second student of the first tutor
const L = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function seed() {
  return createFakeDb({
    tutors: [
      { id: T1, name: 'Tutor One', subscription_status: 'pro', stripe_account_id: 'acct_tutor_one', stripe_onboarding_complete: true },
      { id: T2, name: 'Tutor Two', subscription_status: 'pro', stripe_account_id: null, stripe_onboarding_complete: false },
      { id: T3, name: 'Tutor Three', subscription_status: 'free', stripe_account_id: 'acct_tutor_three', stripe_onboarding_complete: true },
      { id: T4, name: 'Tutor Four', subscription_status: 'academy', stripe_account_id: 'acct_tutor_four', stripe_onboarding_complete: false },
    ],
    students: [
      { id: S1, name: 'Student One', tutor_id: T1, portal_token: 'token-one' },
      { id: S2, name: 'Student Two', tutor_id: T2, portal_token: 'token-two' },
      { id: S3, name: 'Student Three', tutor_id: T3, portal_token: 'token-three' },
      { id: S4, name: 'Student Four', tutor_id: T4, portal_token: 'token-four' },
      { id: S5, name: 'Student Five', tutor_id: T1, portal_token: 'token-five' },
    ],
    lessons: [
      { id: L(1), tutor_id: T1, student_id: S1, price: 25, currency: 'USD', duration_minutes: 45, payment_status: 'pending' },
      { id: L(2), tutor_id: T2, student_id: S2, price: 30, currency: 'USD', duration_minutes: 60, payment_status: 'pending' },
      { id: L(3), tutor_id: T3, student_id: S3, price: 30, currency: 'USD', duration_minutes: 60, payment_status: 'pending' },
      { id: L(4), tutor_id: T4, student_id: S4, price: 30, currency: 'USD', duration_minutes: 60, payment_status: 'pending' },
      { id: L(5), tutor_id: T1, student_id: S1, price: 25, currency: 'USD', duration_minutes: 60, payment_status: 'paid' },
      { id: L(6), tutor_id: T1, student_id: S1, price: null, currency: 'USD', duration_minutes: 60, payment_status: 'pending' },
      { id: L(7), tutor_id: T1, student_id: S1, price: 500000, currency: 'VND', duration_minutes: 60, payment_status: 'pending' },
      { id: L(8), tutor_id: T1, student_id: S5, price: 40, currency: 'USD', duration_minutes: 60, payment_status: 'pending' },
    ],
  })
}

// Every test starts in its own time window, so the in-memory limits of one test never reach the next.
const realNow = Date.now.bind(Date)
let clockOffset = 0

beforeEach(() => {
  clockOffset += 60 * 60 * 1000
  mock.method(Date, 'now', () => realNow() + clockOffset)
  db = seed()
  sessions.length = 0
  stripeKeys = []
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_tests'
})

const call = (body: unknown, headers: Record<string, string> = { host: 'www.tutafy.test', 'x-forwarded-proto': 'https' }) =>
  POST(new Request('https://www.tutafy.test/api/stripe/checkout', { method: 'POST', headers, body: JSON.stringify(body) }))

test('the session is made on the tutor\'s own Stripe account, never on the platform\'s', async () => {
  const res = await call({ lessonId: L(1), portalToken: 'token-one' })
  assert.equal(res.status, 200)
  assert.equal((await res.json()).url, 'https://checkout.stripe.example/session')
  assert.equal(sessions.length, 1)
  assert.deepEqual(sessions[0].options, { stripeAccount: 'acct_tutor_one' })
  assert.equal(sessions[0].params.metadata.lesson_id, L(1))
  assert.equal(sessions[0].params.metadata.tutor_id, T1)
  assert.equal(sessions[0].params.metadata.portal_token, undefined, 'the student\'s token is not copied into Stripe')
})

test('amount, currency, duration and names come from the database, whatever the browser sends', async () => {
  const res = await call({ lessonId: L(1), portalToken: 'token-one', amount: 0.01, currency: 'JPY', tutorName: '<b>Free lessons</b>', studentName: 'x', duration: 999, origin: 'https://evil.example' })
  assert.equal(res.status, 200)
  const item = sessions[0].params.line_items[0]
  assert.equal(item.price_data.unit_amount, 2500)
  assert.equal(item.price_data.currency, 'usd')
  assert.equal(item.price_data.product_data.name, '45-min lesson with Tutor One')
  assert.equal(item.price_data.product_data.description, 'Student: Student One')
  assert.ok(sessions[0].params.success_url.startsWith('https://www.tutafy.test/portal/token-one'), 'the return address is this site, not the browser-supplied origin')
  assert.ok(!JSON.stringify(sessions[0].params).includes('evil.example'))
})

test('currencies without cents are charged in whole units (dong)', async () => {
  await call({ lessonId: L(7), portalToken: 'token-one' })
  assert.equal(sessions[0].params.line_items[0].price_data.unit_amount, 500000)
  assert.equal(sessions[0].params.line_items[0].price_data.currency, 'vnd')
  assert.equal(stripeMinorUnits(25.5, 'USD'), 2550)
  assert.equal(stripeMinorUnits(1000.4, 'jpy'), 1000)
  assert.equal(stripeMinorUnits(0, 'usd'), null)
  assert.equal(stripeMinorUnits(-5, 'usd'), null)
  assert.equal(stripeMinorUnits(Number.NaN, 'usd'), null)
  assert.equal(stripeMinorUnits(Number.POSITIVE_INFINITY, 'usd'), null)
})

test('second person: another student\'s lesson, even of the same tutor, is "not found" and nothing is charged', async () => {
  assert.equal((await call({ lessonId: L(8), portalToken: 'token-one' })).status, 404) // S5's lesson, S1's token
  assert.equal((await call({ lessonId: L(1), portalToken: 'token-five' })).status, 404) // S1's lesson, S5's token
  assert.equal((await call({ lessonId: L(2), portalToken: 'token-one' })).status, 404) // a lesson of another tutor
  assert.equal(sessions.length, 0)
})

test('a token that does not exist is refused; a missing or malformed field is a 400', async () => {
  assert.equal((await call({ lessonId: L(1), portalToken: 'no-such-token' })).status, 401)
  assert.equal((await call({ lessonId: L(1) })).status, 400)
  assert.equal((await call({ portalToken: 'token-one' })).status, 400)
  assert.equal((await call({ lessonId: 'not-a-uuid', portalToken: 'token-one' })).status, 400)
  assert.equal((await call({ lessonId: L(1), portalToken: { $ne: '' } })).status, 400)
  const bad = await POST(new Request('https://www.tutafy.test/api/stripe/checkout', { method: 'POST', body: 'nope' }))
  assert.equal(bad.status, 400)
  assert.equal(sessions.length, 0)
})

test('a tutor who has not connected Stripe, or not finished, cannot be paid: refused, never the platform account', async () => {
  for (const [lesson, token] of [[L(2), 'token-two'], [L(4), 'token-four']] as const) {
    const res = await call({ lessonId: lesson, portalToken: token })
    assert.equal(res.status, 503)
    assert.equal((await res.json()).error, 'stripe_unavailable')
  }
  assert.equal(sessions.length, 0)
  assert.deepEqual(stripeKeys, [], 'the Stripe SDK was not even opened')
})

test('a Free tutor: card payments are a Pro feature (same answer as before)', async () => {
  const res = await call({ lessonId: L(3), portalToken: 'token-three' })
  assert.equal(res.status, 403)
  assert.equal((await res.json()).error, 'upgrade_required')
  assert.equal(sessions.length, 0)
})

test('a lesson already paid, or without a price, is not charged', async () => {
  assert.equal((await call({ lessonId: L(5), portalToken: 'token-one' })).status, 409)
  assert.equal((await call({ lessonId: L(6), portalToken: 'token-one' })).status, 400)
  assert.equal(sessions.length, 0)
})

test('Stripe off (no key, or a blank one): 503 with the neutral answer, nothing read', async () => {
  for (const key of [undefined, '', '   ']) {
    if (key === undefined) delete process.env.STRIPE_SECRET_KEY
    else process.env.STRIPE_SECRET_KEY = key
    const res = await call({ lessonId: L(1), portalToken: 'token-one' })
    assert.equal(res.status, 503)
    assert.equal((await res.json()).error, 'stripe_unavailable')
  }
  assert.equal(sessions.length, 0)
})

test('every session in this route is made with a connected account, and the browser cannot set the amount', () => {
  const src = readFileSync(path.join(SRC, 'app/api/stripe/checkout/route.ts'), 'utf8')
  assert.equal((src.match(/sessions\.create\(/g) ?? []).length, 1)
  assert.ok(/\{ stripeAccount: tutor\.stripe_account_id \}/.test(src))
  assert.ok(!/\b(amount|currency|origin|tutorName|studentName|duration)\b\s*[,}]\s*=\s*(await )?request\.json/.test(src))
  assert.ok(!/body\.(amount|currency|origin|tutorName|studentName|duration)\b/.test(src))
  const form = readFileSync(path.join(SRC, 'app/book/[slug]/BookingForm.tsx'), 'utf8')
  assert.ok(form.includes('body: JSON.stringify({ lessonId, portalToken })'))
})

// ---- limits, with the shared check (tests/support/rate-limit-check.ts) -------------------------------------------

test('/api/stripe/checkout: at most 20 tries in 10 minutes for one real portal token, whatever lesson id the body carries', async () => {
  const r = await assertRateLimitHolds({
    routeFile: 'app/api/stripe/checkout/route.ts',
    limiter: 'perToken',
    fixed: [{ kind: 'body', name: 'portalToken', reason: 'the existing student token this limit counts; a made-up token is refused before the limit counts' }],
    call: v => POST(v.request({ url: 'https://www.tutafy.test/api/stripe/checkout', body: { lessonId: v.uuid(), portalToken: 'token-one' } }) as unknown as Request),
  })
  assert.equal(r.limit, 20)
})

test('/api/stripe/checkout: at most 120 calls a minute overall, whatever token or lesson an unknown caller makes up', async () => {
  const r = await assertRateLimitHolds({
    routeFile: 'app/api/stripe/checkout/route.ts',
    limiter: 'overall',
    call: v => POST(v.request({ url: 'https://www.tutafy.test/api/stripe/checkout', body: { lessonId: v.uuid(), portalToken: v.text() } }) as unknown as Request),
  })
  assert.equal(r.limit, 120)
})
