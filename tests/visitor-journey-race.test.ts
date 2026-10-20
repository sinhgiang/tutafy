// Review T-0610: (1) the first requests of a visit must not make two visitors,
// (2) the limit on new visitors counts rows really created, (3) retention wording.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

let db: FakeDb
let sessionUser: { id: string } | null = null

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createAdminClient: () => db,
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: sessionUser } }) } }),
  },
})

const route = await import('@/app/api/track/route.ts')
const { createSerialQueue } = await import('@/lib/serial-queue.ts')
const { createTrackSender, pageViewPayload } = await import('@/lib/track-sender.ts')
const { NextRequest } = await import('next/server.js')

const TUTOR = '11111111-1111-1111-1111-111111111111'

beforeEach(() => {
  db = createFakeDb({ tutors: [{ id: TUTOR, name: 'Ten', subscription_status: 'free' }] })
  sessionUser = null
})

function post(body: unknown, opts: { cookie?: string } = {}) {
  const headers: Record<string, string> = { host: 'www.tutafy.test', origin: 'https://www.tutafy.test', 'x-vercel-ip-country': 'VN' }
  if (opts.cookie) headers.cookie = `tutafy_vid=${opts.cookie}`
  return new NextRequest('https://www.tutafy.test/api/track', { method: 'POST', headers, body: JSON.stringify(body) })
}
const view = (p: string, extra: Record<string, unknown> = {}) => ({ consent: 'accepted', kind: 'page_view', path: p, ...extra })

/** A browser's fetch to /api/track that goes through the REAL route and keeps a cookie jar. */
function browserFetch() {
  const jar = new Map<string, string>()
  const calls: { body: unknown; cookieSent: string | null }[] = []
  const fetchLike = async (_url: string, init: { body: string }) => {
    const cookieSent = jar.get('tutafy_vid') ?? null
    calls.push({ body: JSON.parse(init.body), cookieSent })
    // the answer takes a moment, like a real network, so overlapping requests would really overlap
    await new Promise(r => setTimeout(r, 5))
    const res = await route.POST(post(JSON.parse(init.body), cookieSent ? { cookie: cookieSent } : {}))
    const set = res.headers.get('set-cookie')
    const m = set && /tutafy_vid=([0-9a-f-]{36})/.exec(set)
    if (m) jar.set('tutafy_vid', m[1])
    return res
  }
  return { fetchLike, calls }
}

// ---- (1) no two visitors from the first requests ------------------------------------------

test('the serial queue runs tasks one at a time, in order, and a failure does not block the next', async () => {
  const q = createSerialQueue()
  const order: string[] = []
  const slow = q.run(async () => { order.push('a:start'); await new Promise(r => setTimeout(r, 20)); order.push('a:end') })
  const fails = q.run(async () => { order.push('b'); throw new Error('boom') })
  const last = q.run(async () => { order.push('c'); return 7 })
  await assert.rejects(fails, /boom/)
  assert.equal(await last, 7)
  await slow
  assert.deepEqual(order, ['a:start', 'a:end', 'b', 'c'])
})

test('WITHOUT the queue, two first requests with no cookie make two visitors (why the sender queues)', async () => {
  sessionUser = { id: TUTOR }
  await Promise.all([
    route.POST(post({ ...view('/dashboard', { referrer: 'https://chatgpt.com/' }) })),
    route.POST(post({ consent: 'accepted', kind: 'identify' })),
  ])
  assert.equal(db.tables.visitors.length, 2)
})

test('the sender: a page view that also links the account and a checkout click sent at the same moment make ONE linked visitor with the right first source', async () => {
  sessionUser = { id: TUTOR }
  const { fetchLike, calls } = browserFetch()
  const sender = createTrackSender({ fetch: fetchLike, hasConsent: () => true })

  // a signed-in tutor opens /dashboard straight from an AI answer, with no cookie yet, and presses Go Pro at once
  await Promise.all([
    sender.send(pageViewPayload({
      path: '/dashboard',
      landing: { referrer: 'https://chatgpt.com/', utm: { source: 'chatgpt.com' } },
      linkAccount: true,
    })),
    sender.send({ kind: 'checkout_click', path: '/upgrade', plan: 'pro' }),
  ])

  assert.equal(db.tables.visitors.length, 1)
  const v = db.tables.visitors[0]
  assert.equal(v.first_source, 'ai_chatgpt')
  assert.equal(v.first_path, '/dashboard')
  assert.equal(v.tutor_id, TUTOR)
  assert.deepEqual(db.tables.visitor_events.map(e => e.kind), ['page_view', 'checkout_click'])
  assert.equal(calls[0].cookieSent, null)
  assert.equal(calls[1].cookieSent, v.id, 'the second request carried the cookie from the first answer')
})

test('page view and account link in ONE request: the visitor has its first source and the link', async () => {
  sessionUser = { id: TUTOR }
  const res = await route.POST(post({ ...view('/dashboard', { referrer: 'https://claude.ai/' }), identify: true }))
  assert.equal(res.status, 204)
  assert.equal(db.tables.visitors.length, 1)
  assert.deepEqual([db.tables.visitors[0].first_source, db.tables.visitors[0].tutor_id], ['ai_claude', TUTOR])
})

test('the link in a page view comes from the session, not the body; without a session nothing is linked', async () => {
  await route.POST(post({ ...view('/dashboard'), identify: true })) // no session
  assert.equal(db.tables.visitors[0].tutor_id ?? null, null)
  assert.equal((await route.POST(post({ ...view('/dashboard'), identify: true, tutor_id: TUTOR }))).status, 400)
  assert.equal((await route.POST(post({ ...view('/dashboard'), identify: 'yes' }))).status, 400)
})

test('the sender sends nothing without consent', async () => {
  const { fetchLike, calls } = browserFetch()
  await createTrackSender({ fetch: fetchLike, hasConsent: () => false }).send(pageViewPayload({ path: '/', landing: null, linkAccount: false }))
  assert.equal(calls.length, 0)
})

test('the tracker sends one page view (with the link flag) through the shared sender, and never a separate identify', () => {
  const tracker = readFileSync(path.join(SRC, 'components/VisitorTracker.tsx'), 'utf8')
  assert.ok(tracker.includes('pageViewPayload({ path, landing: takeLanding()'))
  assert.ok(tracker.includes('linkAccount }))'))
  assert.ok(!tracker.includes("kind: 'identify'"))
  const client = readFileSync(path.join(SRC, 'lib/track-client.ts'), 'utf8')
  assert.ok(client.includes('createTrackSender({'))
})

// ---- (2) the limit counts rows really created ---------------------------------------------

test('made-up cookie ids get no free pass: at most 60 new visitors a minute, however the cookie is chosen', async () => {
  const base = Date.now() + 2 * 60 * 60 * 1000 // a fresh window, whatever the earlier tests used
  mock.method(Date, 'now', () => base)
  const statuses: number[] = []
  for (let i = 0; i < 75; i++) {
    const res = await route.POST(post(view('/'), { cookie: randomUUID() }))
    statuses.push(res.status)
  }
  assert.equal(statuses.filter(s => s === 204).length, 60)
  assert.equal(statuses.filter(s => s === 429).length, 15)
  assert.equal(db.tables.visitors.length, 60)

  // an existing visitor is not a new visitor: still recorded after the limit is hit
  const known = db.tables.visitors[0].id as string
  const before = db.tables.visitor_events.length
  assert.equal((await route.POST(post(view('/upgrade'), { cookie: known }))).status, 204)
  assert.equal(db.tables.visitor_events.length, before + 1)

  // a refused request sets no cookie and writes nothing
  const refused = await route.POST(post(view('/')))
  assert.equal(refused.status, 429)
  assert.equal(refused.headers.get('set-cookie'), null)
  assert.equal(db.tables.visitors.length, 60)

  // a minute later the limit has recovered
  mock.method(Date, 'now', () => base + 61_000)
  assert.equal((await route.POST(post(view('/')))).status, 204)
})

// ---- (3) retention wording ------------------------------------------------------------------

test('the migration says what to do about the 13 months promise, and the purge function exists', () => {
  const sql = readFileSync(path.join(ROOT, 'supabase/migrations/015_visitor_tracking.sql'), 'utf8')
  assert.ok(sql.includes('the "13 months" sentence on /privacy first'))
  assert.ok(sql.includes('create or replace function public.purge_old_visitor_data'))
})
