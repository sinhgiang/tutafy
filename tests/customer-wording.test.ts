// T-0609: customers never see operator wording (AI key, cron secret), and
// Stripe's refresh_url (a GET) no longer ends in a 405.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const FAKE_STRIPE_KEY = 'fake-key-for-tests'
const FAKE_GROQ_KEY = 'fake-groq-key-for-tests'
const LINK_URL = 'https://connect.example.com/onboard-again'

// ---- fakes -----------------------------------------------------------------

let session = { userId: null as string | null, plan: 'free', accountId: null as string | null }
let stripeThrows = false
const stripeCalls: string[] = []
const accountLinkArgs: Record<string, unknown>[] = []

function fakeSupabase() {
  return {
    auth: { getUser: async () => ({ data: { user: session.userId ? { id: session.userId } : null } }) },
    from: () => {
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = () => chain
      chain.update = () => chain
      chain.single = async () => ({
        data: { subscription_status: session.plan, stripe_account_id: session.accountId, email: 'ten@example.com', name: 'Tutor' },
      })
      return chain
    },
  }
}

class FakeStripe {
  constructor(key: string) { stripeCalls.push(`new:${key}`) }
  accounts = { create: async () => { stripeCalls.push('accounts.create'); return { id: 'acct_new' } } }
  accountLinks = {
    create: async (args: Record<string, unknown>) => {
      if (stripeThrows) throw new Error('stripe down')
      accountLinkArgs.push(args)
      return { url: LINK_URL }
    },
  }
}

class FakeGroq {
  chat = { completions: { create: async () => ({ choices: [{ message: { content: 'Generated text' } }] }) } }
}

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: { createClient: async () => fakeSupabase(), createAdminClient: () => fakeSupabase() },
})
mock.module('stripe', { exports: { default: FakeStripe } })
mock.module('groq-sdk', { exports: { default: FakeGroq } })

const onboard = await import('@/app/api/stripe/connect/onboard/route.ts')
const { POST: aiGenerate } = await import('@/app/api/ai/generate/route.ts')
const ai = await import('@/lib/ai-unavailable.ts')

const OPERATOR_WORDS = /GROQ|STRIPE_|CRON_SECRET|Vercel|environment variable|not configured/i

let logged: string[] = []
beforeEach(() => {
  session = { userId: null, plan: 'free', accountId: null }
  stripeThrows = false
  stripeCalls.length = 0
  accountLinkArgs.length = 0
  delete process.env.STRIPE_SECRET_KEY
  delete process.env.GROQ_API_KEY
  logged = []
  mock.method(console, 'error', (...a: unknown[]) => { logged.push(a.join(' ')) })
})

const get = () => new Request('https://tutafy.test/api/stripe/connect/onboard', { headers: { host: 'tutafy.test' } })
const where = (res: Response) => {
  const loc = res.headers.get('location')
  return loc ? new URL(loc).pathname + new URL(loc).search : null
}

// ---- (3) Stripe refresh_url: GET works --------------------------------------

test('onboard: the route has a GET handler (Stripe sends the browser back with GET)', () => {
  assert.equal(typeof onboard.GET, 'function')
  assert.equal(typeof onboard.POST, 'function')
})

test('onboard GET: a Pro tutor with a Stripe account is sent on to a fresh Stripe link (no 405)', async () => {
  process.env.STRIPE_SECRET_KEY = FAKE_STRIPE_KEY
  session = { userId: 't1', plan: 'pro', accountId: 'acct_existing' }
  const res = await onboard.GET(get())
  assert.equal(res.status, 307)
  assert.equal(res.headers.get('location'), LINK_URL)
  assert.equal(accountLinkArgs[0].account, 'acct_existing')
  assert.equal(accountLinkArgs[0].type, 'account_onboarding')
  assert.ok(!stripeCalls.includes('accounts.create'))
})

test('onboard: the refresh_url given to Stripe is this very route, the return_url is the return page', async () => {
  process.env.STRIPE_SECRET_KEY = FAKE_STRIPE_KEY
  session = { userId: 't1', plan: 'pro', accountId: 'acct_existing' }
  await onboard.GET(get())
  assert.equal(accountLinkArgs[0].refresh_url, 'https://tutafy.test/api/stripe/connect/onboard')
  assert.equal(accountLinkArgs[0].return_url, 'https://tutafy.test/settings/stripe/return')
  // the same holds when the link is made from the Connect button (POST)
  accountLinkArgs.length = 0
  const res = await onboard.POST(get())
  assert.deepEqual(await res.json(), { url: LINK_URL })
  assert.equal(accountLinkArgs[0].refresh_url, 'https://tutafy.test/api/stripe/connect/onboard')
})

test('onboard GET: with no Stripe account yet it goes back to Settings and creates nothing', async () => {
  process.env.STRIPE_SECRET_KEY = FAKE_STRIPE_KEY
  session = { userId: 't1', plan: 'pro', accountId: null }
  const res = await onboard.GET(get())
  assert.equal(res.status, 307)
  assert.equal(where(res), '/settings?tab=payments')
  assert.deepEqual(stripeCalls, [])
})

test('onboard GET: Stripe off, Free plan and Stripe errors all go back to Settings; signed out goes to login', async () => {
  session = { userId: 't1', plan: 'pro', accountId: 'acct_existing' }
  assert.equal(where(await onboard.GET(get())), '/settings?tab=payments') // Stripe off

  process.env.STRIPE_SECRET_KEY = FAKE_STRIPE_KEY
  session = { userId: 't2', plan: 'free', accountId: 'acct_existing' }
  assert.equal(where(await onboard.GET(get())), '/settings?tab=payments') // Free

  session = { userId: 't1', plan: 'pro', accountId: 'acct_existing' }
  stripeThrows = true
  assert.equal(where(await onboard.GET(get())), '/settings?tab=payments') // Stripe fails

  session = { userId: null, plan: 'free', accountId: null }
  assert.equal(where(await onboard.GET(get())), '/login') // signed out
})

// ---- (1) AI: a plain sentence for customers, the cause only in the server log ----

test('AI off: the customer gets a plain sentence, the server log gets the cause', async () => {
  session = { userId: 't1', plan: 'pro', accountId: null }
  const res = await aiGenerate(new Request('https://tutafy.test/api/ai/generate', {
    method: 'POST', body: JSON.stringify({ prompt: 'hello' }),
  }) as never)
  const text = await res.text()
  assert.equal(res.status, 503)
  assert.deepEqual(JSON.parse(text), { error: ai.AI_UNAVAILABLE_MESSAGE, code: 'ai_unavailable' })
  assert.doesNotMatch(text, OPERATOR_WORDS)
  assert.equal(logged.length, 1)
  assert.match(logged[0], /\[ai\] generate/)
  assert.doesNotMatch(logged[0], new RegExp(FAKE_GROQ_KEY))
})

test('AI on: the answer is unchanged', async () => {
  process.env.GROQ_API_KEY = FAKE_GROQ_KEY
  session = { userId: 't1', plan: 'pro', accountId: null }
  const res = await aiGenerate(new Request('https://tutafy.test/api/ai/generate', {
    method: 'POST', body: JSON.stringify({ prompt: 'hello' }),
  }) as never)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { text: 'Generated text' })
  assert.deepEqual(logged, [])
})

test('AI: the Free plan and signed-out callers are still stopped before anything else', async () => {
  const req = () => new Request('https://tutafy.test/api/ai/generate', { method: 'POST', body: JSON.stringify({ prompt: 'x' }) }) as never
  assert.equal((await aiGenerate(req())).status, 401)
  session = { userId: 't2', plan: 'free', accountId: null }
  assert.equal((await aiGenerate(req())).status, 403)
  assert.deepEqual(logged, [])
})

test('aiUnavailableResponse: same neutral answer for every AI route', async () => {
  for (const route of ['generate', 'homework-check', 'lesson-summary']) {
    const res = ai.aiUnavailableResponse(route)
    assert.equal(res.status, 503)
    assert.equal((await res.json()).error, ai.AI_UNAVAILABLE_MESSAGE)
  }
  assert.equal(logged.length, 3)
})

// ---- (1)(2) scan: no operator wording in customer-facing code ----------------

export function operatorWordingIn(source: string): string[] {
  return source.split('\n').filter(l => /YOUR_CRON_SECRET|add your GROQ_API_KEY|GROQ_API_KEY to|Vercel environment|environment variables? first/i.test(l))
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(name) ? [full] : []
  })
}

test('scanner self-check: flags the old sentences, ignores normal text', () => {
  assert.equal(operatorWordingIn("setOutput('Please add your GROQ_API_KEY to Vercel environment variables.')").length, 1)
  assert.equal(operatorWordingIn('Add CRON_SECRET=YOUR_CRON_SECRET to your Vercel environment variables').length, 1)
  assert.equal(operatorWordingIn("setOutput('AI is not available right now.')").length, 0)
  assert.equal(operatorWordingIn('// the cron job runs every hour').length, 0)
})

test('customer-facing code (dashboard, booking, portal, student, shared components) never shows operator setup wording', () => {
  const dirs = ['app/(dashboard)', 'app/book', 'app/portal', 'app/student', 'components'].map(d => path.join(SRC, d))
  const hits: string[] = []
  for (const dir of dirs) {
    for (const file of sourceFiles(dir)) {
      for (const line of operatorWordingIn(readFileSync(file, 'utf8'))) hits.push(`${path.relative(ROOT, file)}: ${line.trim()}`)
    }
  }
  assert.deepEqual(hits, [])
})

test('no AI route answers with the raw setting name any more', () => {
  const hits = sourceFiles(path.join(SRC, 'app/api/ai')).filter(f => /GROQ_API_KEY not configured/.test(readFileSync(f, 'utf8')))
  assert.deepEqual(hits.map(f => path.relative(ROOT, f)), [])
})
