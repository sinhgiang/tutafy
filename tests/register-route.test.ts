// /api/auth/register must not trust the userId (or email) the browser sends (T-0615).
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

type Account = { id: string; email: string; created_at: string; user_metadata?: { name?: string } }
let db: FakeDb
let accounts: Record<string, Account> = {}
let sessionUser: { id: string; email: string } | null = null
const emails: { to: string; html: string }[] = []

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createAdminClient: () => ({
      from: (t: string) => db.from(t),
      auth: { admin: { getUserById: async (id: string) => ({ data: { user: accounts[id] ?? null }, error: null }) } },
    }),
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: sessionUser } }) } }),
  },
})
mock.module('resend', { exports: { Resend: class { emails = { send: async (m: { to: string; html: string }) => { emails.push(m) } } } } })

const route = await import('@/app/api/auth/register/route.ts')
const { NextRequest } = await import('next/server.js')

const A = '11111111-1111-4111-8111-111111111111' // a brand-new account
const B = '22222222-2222-4222-8222-222222222222' // another brand-new account
const OLD = '33333333-3333-4333-8333-333333333333' // an account made a day ago (for example a student who signed in with Google)
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()

// Every test starts in its own time window, so the in-memory limits of one test never reach the next.
const realNow = Date.now.bind(Date)
let clockOffset = 0

beforeEach(() => {
  clockOffset += 60 * 60 * 1000
  mock.method(Date, 'now', () => realNow() + clockOffset)
  db = createFakeDb({ tutors: [] })
  accounts = {
    [A]: { id: A, email: 'a@example.com', created_at: minutesAgo(1), user_metadata: { name: 'Ann Account' } },
    [B]: { id: B, email: 'b@example.com', created_at: minutesAgo(2), user_metadata: { name: 'Ben Account' } },
    [OLD]: { id: OLD, email: 'old@example.com', created_at: minutesAgo(24 * 60), user_metadata: { name: 'Old Student' } },
  }
  sessionUser = null
  emails.length = 0
  process.env.RESEND_API_KEY = 're_test_key_for_tests'
})

const call = (body: unknown) => route.POST(new NextRequest('https://tutafy.test/api/auth/register', { method: 'POST', body: JSON.stringify(body) }))
const tutors = () => db.tables.tutors ?? []

// ---- signed out (email confirmation pending): the account must be real, new, and match the email ----------

test('signed out: a brand-new account with its own email gets its profile, with the account\'s email and name', async () => {
  const res = await call({ userId: A, email: 'A@Example.com', name: 'Whatever the form said' })
  assert.equal(res.status, 200)
  assert.equal(tutors().length, 1)
  assert.deepEqual([tutors()[0].id, tutors()[0].email, tutors()[0].name], [A, 'a@example.com', 'Ann Account'])
  assert.deepEqual(emails.map(e => e.to), ['a@example.com'])
})

test('signed out: someone else\'s old account id is refused, so nobody can be turned into a tutor by naming their id', async () => {
  const res = await call({ userId: OLD, email: 'old@example.com', name: 'x' })
  assert.equal(res.status, 403)
  assert.equal(tutors().length, 0)
  assert.equal(emails.length, 0)
})

test('signed out: a new account id with someone else\'s email is refused, and so is an id that does not exist', async () => {
  assert.equal((await call({ userId: A, email: 'b@example.com', name: 'x' })).status, 403)
  assert.equal((await call({ userId: '99999999-9999-4999-8999-999999999999', email: 'a@example.com', name: 'x' })).status, 403)
  assert.equal((await call({ userId: 'not-a-uuid', email: 'a@example.com', name: 'x' })).status, 403)
  assert.equal((await call({ email: 'a@example.com', name: 'x' })).status, 403)
  assert.equal(tutors().length, 0)
  assert.equal(emails.length, 0)
})

test('signed out: every refusal looks the same (no hint whether an id exists or what its email is)', async () => {
  const bodies = await Promise.all([
    call({ userId: OLD, email: 'old@example.com', name: 'x' }),
    call({ userId: A, email: 'b@example.com', name: 'x' }),
    call({ userId: '99999999-9999-4999-8999-999999999999', email: 'a@example.com', name: 'x' }),
  ].map(async p => { const r = await p; return [r.status, await r.text()] }))
  assert.deepEqual(new Set(bodies.map(b => JSON.stringify(b))).size, 1)
})

// ---- signed in: the session decides ---------------------------------------------------------------------------

test('signed in: the profile is for the session\'s account; a body userId naming another account is refused', async () => {
  sessionUser = { id: A, email: 'a@example.com' }
  const other = await call({ userId: B, email: 'b@example.com', name: 'x' })
  assert.equal(other.status, 403)
  assert.equal(tutors().length, 0)
  const own = await call({ email: 'attacker-chosen@example.com', name: 'Ann' }) // no userId, and a different email in the body
  assert.equal(own.status, 200)
  assert.deepEqual([tutors()[0].id, tutors()[0].email], [A, 'a@example.com']) // the session's email, not the body's
  assert.ok(!tutors().some(t => t.id === B))
})

test('an existing profile is never overwritten or re-welcomed', async () => {
  db.tables.tutors.push({ id: A, email: 'a@example.com', name: 'Already Here', slug: 'already-here', subscription_status: 'pro' })
  const res = await call({ userId: A, email: 'a@example.com', name: 'Overwrite Attempt' })
  assert.equal(res.status, 200)
  assert.equal(tutors().length, 1)
  assert.deepEqual([tutors()[0].name, tutors()[0].subscription_status], ['Already Here', 'pro'])
  assert.equal(emails.length, 0)
})

// ---- what is saved ----------------------------------------------------------------------------------------------

test('only the starting profile is written: no plan, no Polar or Stripe columns, no credits', async () => {
  await call({ userId: A, email: 'a@example.com', name: 'x', subscription_status: 'academy', referral_credits: 99, polar_subscription_id: 'sub_x' })
  assert.deepEqual(Object.keys(tutors()[0]).sort(), ['email', 'id', 'name', 'slug'])
})

test('a referral code names the referrer; an unknown code is ignored', async () => {
  db.tables.tutors.push({ id: B, email: 'b@example.com', name: 'Ben', slug: 'ben-1' })
  await call({ userId: A, email: 'a@example.com', name: 'x', refCode: 'ben-1' })
  assert.equal(tutors().find(t => t.id === A)?.referred_by, B)
  db.tables.tutors = []
  await call({ userId: A, email: 'a@example.com', name: 'x', refCode: 'nobody' })
  assert.equal(tutors()[0].referred_by, undefined)
})

test('the name in the welcome email is escaped (no HTML or script from a name)', async () => {
  accounts[A].user_metadata = { name: '<img src=x onerror=alert(1)>Ann' }
  await call({ userId: A, email: 'a@example.com', name: 'x' })
  assert.equal(emails.length, 1)
  assert.ok(!emails[0].html.includes('<img src=x'))
  assert.ok(emails[0].html.includes('&lt;img src=x onerror=alert(1)&gt;Ann'))
})

test('missing fields and a body that is not JSON are 400', async () => {
  assert.equal((await call({})).status, 400)
  assert.equal((await call({ userId: A, email: 'a@example.com' })).status, 400)
  const bad = await route.POST(new NextRequest('https://tutafy.test/api/auth/register', { method: 'POST', body: 'nope' }))
  assert.equal(bad.status, 400)
})

// ---- limits ---------------------------------------------------------------------------------------------------------

test('one account can ask only a few times; changing the email, name or code in the body does not give more', async () => {
  sessionUser = { id: B, email: 'b@example.com' }
  const statuses: number[] = []
  for (let i = 0; i < 8; i++) {
    statuses.push((await call({ email: `x${i}@example.com`, name: `Name ${i}`, refCode: `code-${i}` })).status)
  }
  assert.equal(statuses.filter(s => s === 429).length, 3) // 5 allowed, then refused whatever the body says
  assert.equal(statuses.filter(s => s === 200).length, 5)
})

test('the page that calls the route still sends what the route needs (no userId is required when signed in)', () => {
  const page = readFileSync(path.join(SRC, 'app/(auth)/register/page.tsx'), 'utf8')
  assert.ok(page.includes("fetch('/api/auth/register'"))
  const src = readFileSync(path.join(SRC, 'app/api/auth/register/route.ts'), 'utf8')
  assert.ok(!/insert\(\{\s*id: userId/.test(src), 'the id must not come straight from the body')
  assert.ok(src.includes('getUserById(bodyUserId)'))
})
