// Stripe is switched on or off per deployment. These tests run the real route
// handlers (only Supabase and the Stripe SDK are faked) for both cases, and
// check customers never get operator wording or a hint about anyone's plan.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import './support/admin-lang.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const FAKE_KEY = 'fake-key-for-tests'

// ---- fakes -----------------------------------------------------------------

type Session = { userId: string | null; plan: string }
let session: Session = { userId: null, plan: 'free' }
const stripeCalls: string[] = []

function fakeSupabase() {
  return {
    auth: { getUser: async () => ({ data: { user: session.userId ? { id: session.userId } : null } }) },
    from: () => {
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = () => chain
      chain.update = () => chain
      chain.single = async () => ({
        data: { subscription_status: session.plan, stripe_account_id: 'acct_fake', email: 'ten@example.com', name: 'Tutor' },
      })
      return chain
    },
  }
}

class FakeStripe {
  constructor(key: string) { stripeCalls.push(`new:${key}`) }
  accounts = { create: async () => ({ id: 'acct_fake' }) }
  accountLinks = { create: async () => ({ url: 'https://connect.example.com/onboard' }) }
}

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: { createClient: async () => fakeSupabase(), createAdminClient: () => fakeSupabase() },
})
mock.module('stripe', { defaultExport: FakeStripe })

const { POST: onboard } = await import('@/app/api/stripe/connect/onboard/route.ts')
const { GET: status } = await import('@/app/api/stripe/connect/status/route.ts')
const { POST: studentCheckout } = await import('@/app/api/stripe/checkout/route.ts')
const { POST: subscriptionCheckout } = await import('@/app/api/subscriptions/checkout/route.ts')
const avail = await import('@/lib/stripe/availability.ts')

const OPERATOR_WORDS = /STRIPE_SECRET_KEY|Vercel|environment variable|not configured/i

beforeEach(() => {
  stripeCalls.length = 0
  session = { userId: null, plan: 'free' }
  delete process.env.STRIPE_SECRET_KEY
})

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body) })
}

// ---- Stripe switched OFF ---------------------------------------------------

test('off: a Pro tutor gets a plain "not available" answer with no operator wording', async () => {
  session = { userId: 'tutor-1', plan: 'pro' }
  const res = await onboard()
  const text = await res.clone().text()
  assert.equal(res.status, 503)
  const body = JSON.parse(text)
  assert.equal(body.error, 'stripe_unavailable')
  assert.equal(body.message, avail.STRIPE_UNAVAILABLE_TUTOR_MESSAGE)
  assert.match(body.message, /PayPal/)
  assert.doesNotMatch(text, OPERATOR_WORDS)
  assert.deepEqual(stripeCalls, [], 'the Stripe SDK must not be touched')
})

test('off: a signed-out caller learns nothing about the deployment (401, not 503)', async () => {
  const res = await onboard()
  assert.equal(res.status, 401)
  assert.doesNotMatch(await res.text(), /stripe/i)
})

test('off: the plan gate still answers first, so a Free tutor sees the plan message', async () => {
  session = { userId: 'tutor-2', plan: 'free' }
  const res = await onboard()
  assert.equal(res.status, 403)
  assert.deepEqual(await res.json(), { error: 'upgrade_required' })
})

test('off: status says disabled and never echoes the key', async () => {
  session = { userId: 'tutor-1', plan: 'free' }
  const res = await status()
  assert.deepEqual(await res.json(), { enabled: false })
})

test('off: student checkout and subscription checkout use the same neutral answer', async () => {
  for (const handler of [studentCheckout, subscriptionCheckout]) {
    const res = await handler(jsonRequest({ portalToken: 'x' }) as never)
    const text = await res.text()
    assert.equal(res.status, 503)
    assert.equal(JSON.parse(text).error, 'stripe_unavailable')
    assert.doesNotMatch(text, OPERATOR_WORDS)
  }
})

test('off: a blank key counts as off', async () => {
  process.env.STRIPE_SECRET_KEY = '   '
  session = { userId: 'tutor-1', plan: 'pro' }
  assert.equal((await onboard()).status, 503)
})

// ---- Stripe switched ON ----------------------------------------------------

test('on: a Pro tutor still gets the Stripe onboarding link, as before', async () => {
  process.env.STRIPE_SECRET_KEY = FAKE_KEY
  session = { userId: 'tutor-1', plan: 'pro' }
  const res = await onboard()
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { url: 'https://connect.example.com/onboard' })
  assert.deepEqual(stripeCalls, [`new:${FAKE_KEY}`])
})

test('on: a Free tutor is still stopped by the plan gate', async () => {
  process.env.STRIPE_SECRET_KEY = FAKE_KEY
  session = { userId: 'tutor-2', plan: 'free' }
  const res = await onboard()
  assert.equal(res.status, 403)
  assert.deepEqual(stripeCalls, [])
})

test('on: status says enabled and does not contain the key', async () => {
  process.env.STRIPE_SECRET_KEY = FAKE_KEY
  session = { userId: 'tutor-2', plan: 'free' }
  const res = await status()
  const text = await res.text()
  assert.deepEqual(JSON.parse(text), { enabled: true })
  assert.ok(!text.includes(FAKE_KEY))
})

test('status: signed-out caller gets 401', async () => {
  assert.equal((await status()).status, 401)
})

// ---- wording helper --------------------------------------------------------

test('stripeErrorMessage: off and plan errors become customer wording', () => {
  const { stripeErrorMessage: msg } = avail
  assert.equal(msg({ error: 'stripe_unavailable' }, 'tutor', 'x'), avail.STRIPE_UNAVAILABLE_TUTOR_MESSAGE)
  assert.equal(msg({ error: 'Stripe not configured' }, 'tutor', 'x'), avail.STRIPE_UNAVAILABLE_TUTOR_MESSAGE)
  assert.equal(msg({ error: 'upgrade_required' }, 'tutor', 'x'), avail.TUTOR_PLAN_MESSAGE)
  // a student must not be able to tell the tutor's plan from the message
  assert.equal(msg({ error: 'upgrade_required' }, 'student', 'x'), avail.STRIPE_UNAVAILABLE_STUDENT_MESSAGE)
  assert.equal(msg({ error: 'stripe_unavailable' }, 'student', 'x'), avail.STRIPE_UNAVAILABLE_STUDENT_MESSAGE)
  assert.doesNotMatch(avail.STRIPE_UNAVAILABLE_STUDENT_MESSAGE, /pro|plan|upgrade/i)
})

test('stripeErrorMessage: a student never sees a raw code for a paid lesson, a payment on its way or a failed link', () => {
  const { stripeErrorMessage: msg } = avail
  assert.equal(msg({ error: 'already_settled' }, 'student', 'x'), avail.STUDENT_ALREADY_PAID_MESSAGE)
  assert.equal(msg({ error: 'payment_in_progress' }, 'student', 'x'), avail.STUDENT_PAYMENT_IN_PROGRESS_MESSAGE)
  assert.equal(msg({ error: 'payment_unavailable' }, 'student', 'x'), avail.STRIPE_UNAVAILABLE_STUDENT_MESSAGE)
  for (const text of [avail.STUDENT_ALREADY_PAID_MESSAGE, avail.STUDENT_PAYMENT_IN_PROGRESS_MESSAGE]) {
    assert.doesNotMatch(text, /pro plan|upgrade|stripe|webhook|_/i)
  }
})

test('stripeErrorMessage: ordinary errors and bad bodies are left alone', () => {
  const { stripeErrorMessage: msg } = avail
  assert.equal(msg({ error: 'Tutor not found' }, 'tutor', 'fallback'), 'Tutor not found')
  assert.equal(msg({ error: 'Invalid token' }, 'student', 'fallback'), 'Invalid token')
  assert.equal(msg({}, 'tutor', 'fallback'), 'fallback')
  assert.equal(msg(null, 'student', 'fallback'), 'fallback')
  assert.equal(msg({ error: 42 }, 'tutor', 'fallback'), 'fallback')
})

test('isStripeEnabled reads only a non-blank key', () => {
  assert.equal(avail.isStripeEnabled({}), false)
  assert.equal(avail.isStripeEnabled({ STRIPE_SECRET_KEY: '' }), false)
  assert.equal(avail.isStripeEnabled({ STRIPE_SECRET_KEY: ' ' }), false)
  assert.equal(avail.isStripeEnabled({ STRIPE_SECRET_KEY: FAKE_KEY }), true)
})

// ---- regression guard: no operator wording in customer-facing code ---------

// Customer-facing source: the tutor dashboard, the public booking pages and
// shared components. The (admin) area is for the operator and may name env vars.
// Scope is Stripe wording only.
export function operatorWordingIn(source: string): string[] {
  return source.split('\n').filter(l => /STRIPE_(SECRET_KEY|WEBHOOK_SECRET)|stripe.*environment variable|stripe not configured/i.test(l))
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(name) ? [full] : []
  })
}

test('guard self-check: the scanner flags the old sentence and ignores normal text', () => {
  assert.equal(operatorWordingIn("toast.error('Add STRIPE_SECRET_KEY to Vercel environment variables first.')").length, 1)
  assert.equal(operatorWordingIn("toast.error('Card payments are not available yet.')").length, 0)
  assert.equal(operatorWordingIn('// Stripe secrets live on the server only').length, 0)
})

test('customer-facing code never names the Stripe setting', () => {
  const dirs = ['app/(dashboard)', 'app/book', 'app/student', 'components'].map(d => path.join(SRC, d))
  const hits: string[] = []
  for (const dir of dirs) {
    for (const file of sourceFiles(dir)) {
      for (const line of operatorWordingIn(readFileSync(file, 'utf8'))) {
        hits.push(`${path.relative(ROOT, file)}: ${line.trim()}`)
      }
    }
  }
  assert.deepEqual(hits, [])
})
