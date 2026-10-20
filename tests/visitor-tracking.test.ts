// Recording the journey: only with consent, no IP address, no secrets in paths,
// linked to the tutor only from a real session, and the Polar order added once.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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
const tracking = await import('@/lib/visitor-tracking.ts')
const { createLimiter } = await import('@/lib/rate-limit-memory.ts')
const { NextRequest } = await import('next/server.js')

const VID = '5b0f2a52-2f3a-4d65-9c1f-0a2b3c4d5e6f'
const TUTOR = '11111111-1111-1111-1111-111111111111'
const IP = '203.0.113.77' // documentation address; must never reach the database

beforeEach(() => {
  db = createFakeDb({ tutors: [{ id: TUTOR, name: 'Ten', subscription_status: 'free' }] })
  sessionUser = null
})

function post(body: unknown, opts: { cookie?: string; origin?: string | null; country?: string } = {}) {
  const headers: Record<string, string> = {
    host: 'www.tutafy.test',
    'x-forwarded-for': IP,
    'x-vercel-ip-country': opts.country ?? 'vn',
    'user-agent': 'Mozilla/5.0 (secret browser details)',
  }
  if (opts.origin !== null) headers.origin = opts.origin ?? 'https://www.tutafy.test'
  if (opts.cookie) headers.cookie = `tutafy_vid=${opts.cookie}`
  return new NextRequest('https://www.tutafy.test/api/track', { method: 'POST', headers, body: JSON.stringify(body) })
}

const view = (p: string, extra: Record<string, unknown> = {}) => ({ consent: 'accepted', kind: 'page_view', path: p, ...extra })
const dbDump = () => JSON.stringify(db.tables)

// ---- consent -----------------------------------------------------------------

test('without "accepted" nothing is read, written or set (no cookie, no rows)', async () => {
  for (const body of [
    { kind: 'page_view', path: '/' },
    { consent: 'declined', kind: 'page_view', path: '/' },
    { consent: true, kind: 'page_view', path: '/' },
    { consent: null, kind: 'page_view', path: '/' },
    {},
  ]) {
    const res = await route.POST(post(body))
    assert.equal(res.status, 400, JSON.stringify(body))
    assert.equal(res.headers.get('set-cookie'), null)
  }
  assert.equal((db.tables.visitors ?? []).length, 0)
  assert.equal((db.tables.visitor_events ?? []).length, 0)
})

test('with "accepted": 204, a visitor row, an event, and an httpOnly cookie of at most 13 months', async () => {
  const res = await route.POST(post(view('/blog/how-to-schedule', {
    referrer: 'https://chatgpt.com/', utm: { source: 'chatgpt.com' },
  })))
  assert.equal(res.status, 204)
  const cookie = res.headers.get('set-cookie') ?? ''
  assert.match(cookie, /^tutafy_vid=[0-9a-f-]{36};/)
  assert.match(cookie, /HttpOnly/i)
  assert.match(cookie, /SameSite=lax/i)
  assert.match(cookie, /Path=\//i)
  const maxAge = Number(/Max-Age=(\d+)/i.exec(cookie)?.[1])
  assert.ok(maxAge > 0 && maxAge <= 395 * 24 * 60 * 60, String(maxAge))

  const [v] = db.tables.visitors
  assert.equal(v.country, 'VN')
  assert.equal(v.first_source, 'ai_chatgpt')
  assert.equal(v.first_path, '/blog/how-to-schedule')
  assert.equal(db.tables.visitor_events.length, 1)
  assert.deepEqual(db.tables.visitor_events[0], { id: 1, visitor_id: v.id, kind: 'page_view', path: '/blog/how-to-schedule', plan: null })
})

test('an existing visitor cookie is kept: no new cookie, first source is not overwritten', async () => {
  await route.POST(post(view('/', { referrer: 'https://www.google.com/' })))
  const id = db.tables.visitors[0].id as string
  const res = await route.POST(post(view('/upgrade', { referrer: 'https://claude.ai/' }), { cookie: id }))
  assert.equal(res.status, 204)
  assert.equal(res.headers.get('set-cookie'), null)
  assert.equal(db.tables.visitors.length, 1)
  assert.equal(db.tables.visitors[0].first_source, 'google_search')
  assert.deepEqual(db.tables.visitor_events.map(e => e.path), ['/', '/upgrade'])
})

test('declining: DELETE removes the visitor, their events and the cookie', async () => {
  await route.POST(post(view('/')))
  const id = db.tables.visitors[0].id as string
  const del = new NextRequest('https://www.tutafy.test/api/track', {
    method: 'DELETE', headers: { host: 'www.tutafy.test', origin: 'https://www.tutafy.test', cookie: `tutafy_vid=${id}` },
  })
  const res = await route.DELETE(del)
  assert.equal(res.status, 204)
  assert.match(res.headers.get('set-cookie') ?? '', /tutafy_vid=;.*Max-Age=0/i)
  assert.equal(db.tables.visitors.length, 0)
})

// ---- no IP, no browser details, no query strings, no private paths ----------------

test('no IP address, user agent, query string or token ever reaches the database', async () => {
  await route.POST(post(view('/upgrade?token=SECRET123&email=ten@example.com#x', {
    referrer: 'https://www.google.com/search?q=private+search',
  })))
  await route.POST(post(view('/portal/PORTALTOKEN999')))
  await route.POST(post(view('/students/9f1c2c3e-aaaa-bbbb-cccc-1234567890ab'), { cookie: db.tables.visitors[0].id as string }))
  const dump = dbDump()
  for (const secret of [IP, 'Mozilla', 'SECRET123', 'ten@example.com', 'private+search', 'q=', 'PORTALTOKEN999', '9f1c2c3e']) {
    assert.ok(!dump.includes(secret), `${secret} must not be stored`)
  }
  assert.deepEqual(db.tables.visitor_events.map(e => e.path), ['/upgrade', '/students'])
})

test('a bad country header is stored as null, never as the raw header', async () => {
  await route.POST(post(view('/'), { country: 'Vietnam; DROP TABLE' }))
  assert.equal(db.tables.visitors[0].country, null)
  assert.equal(tracking.countryFromHeader('us'), 'US')
  assert.equal(tracking.countryFromHeader('USA'), null)
  assert.equal(tracking.countryFromHeader(undefined), null)
})

test('pages that are not on the list (portal, booking, admin) write nothing', async () => {
  for (const p of ['/portal/abc', '/book/demo-tutor', '/admin/buyers', '/super-admin', '/api/x']) {
    const res = await route.POST(post(view(p)))
    assert.equal(res.status, 204, p)
  }
  assert.equal((db.tables.visitor_events ?? []).length, 0)
})

// ---- who may call it ------------------------------------------------------------

test('a call from another site (or with no Origin) is refused', async () => {
  assert.equal((await route.POST(post(view('/'), { origin: 'https://evil.example' }))).status, 403)
  assert.equal((await route.POST(post(view('/'), { origin: null }))).status, 403)
  assert.equal((db.tables.visitors ?? []).length, 0)
})

test('unknown fields and over-long values are refused, not stored', async () => {
  assert.equal((await route.POST(post({ ...view('/'), ip: IP }))).status, 400)
  assert.equal((await route.POST(post(view('/', { referrer: 'https://a.example/' + 'x'.repeat(600) })))).status, 400)
  assert.equal((await route.POST(post({ consent: 'accepted', kind: 'keylog', path: '/' }))).status, 400)
  assert.equal((db.tables.visitors ?? []).length, 0)
})

test('the limiter allows max hits per window, then refuses, then recovers', () => {
  let t = 0
  const lim = createLimiter({ max: 3, windowMs: 1000, now: () => t })
  assert.deepEqual([lim.hit('a'), lim.hit('a'), lim.hit('a'), lim.hit('a')], [true, true, true, false])
  assert.equal(lim.hit('b'), true) // another key is separate
  t = 1500
  assert.equal(lim.hit('a'), true)
})

// ---- linking to the tutor account -----------------------------------------------------

test('identify links the visitor to the tutor from the SESSION, never from the body', async () => {
  await route.POST(post(view('/')))
  const id = db.tables.visitors[0].id as string

  // no session: nothing is linked, even if the body claims a tutor
  await route.POST(post({ consent: 'accepted', kind: 'identify' }, { cookie: id }))
  assert.equal(db.tables.visitors[0].tutor_id ?? null, null)
  assert.equal((await route.POST(post({ consent: 'accepted', kind: 'identify', tutor_id: TUTOR }, { cookie: id }))).status, 400)

  sessionUser = { id: TUTOR }
  await route.POST(post({ consent: 'accepted', kind: 'identify' }, { cookie: id }))
  assert.equal(db.tables.visitors[0].tutor_id, TUTOR)

  // an earlier link is never overwritten
  sessionUser = { id: '99999999-9999-9999-9999-999999999999' }
  await route.POST(post({ consent: 'accepted', kind: 'identify' }, { cookie: id }))
  assert.equal(db.tables.visitors[0].tutor_id, TUTOR)
})

test('a plain page view never asks who is signed in', async () => {
  sessionUser = { id: TUTOR }
  await route.POST(post(view('/')))
  assert.equal(db.tables.visitors[0].tutor_id ?? null, null)
})

test('checkout_click records the plan and links the signed-in tutor', async () => {
  sessionUser = { id: TUTOR }
  await route.POST(post(view('/upgrade')))
  const id = db.tables.visitors[0].id as string
  await route.POST(post({ consent: 'accepted', kind: 'checkout_click', path: '/upgrade', plan: 'pro' }, { cookie: id }))
  const click = db.tables.visitor_events.find(e => e.kind === 'checkout_click')
  assert.deepEqual([click?.path, click?.plan], ['/upgrade', 'pro'])
  assert.equal(db.tables.visitors[0].tutor_id, TUTOR)
})

// ---- Polar order ---------------------------------------------------------------------

test('order_paid is added once for the visitor linked to the tutor; none without a link', async () => {
  // a tutor who never accepted cookies has no visitor: nothing to add
  assert.deepEqual(await tracking.recordOrderPaid(db, TUTOR, 'pro'), { wrote: false })

  db.tables.visitors = [{ id: VID, tutor_id: TUTOR, first_seen_at: '2026-10-01T00:00:00Z' }]
  assert.deepEqual(await tracking.recordOrderPaid(db, TUTOR, 'pro'), { wrote: true })
  assert.deepEqual(await tracking.recordOrderPaid(db, TUTOR, 'pro'), { wrote: false }) // Polar repeats updates
  assert.equal(db.tables.visitor_events.filter(e => e.kind === 'order_paid').length, 1)
  assert.deepEqual(await tracking.recordOrderPaid(db, TUTOR, 'academy'), { wrote: true }) // an upgrade is a new order
  assert.deepEqual(await tracking.recordOrderPaid(db, TUTOR, 'free'), { wrote: false })
})

test('the Polar webhook records the order after the plan update, and a tracking failure cannot change its answer', () => {
  const src = readFileSync(path.join(SRC, 'app/api/webhooks/polar/route.ts'), 'utf8')
  const update = src.indexOf("subscription_status: plan,")
  const record = src.indexOf('await recordOrderPaid(supabase, tutorId, plan)')
  assert.ok(update > 0 && record > update)
  assert.match(src.slice(record - 60, record + 140), /try \{[\s\S]*recordOrderPaid[\s\S]*\} catch/)
  // the signature check is untouched and still runs first
  assert.ok(src.indexOf('verifyPolarSignature(req, body)') < update)
})

// ---- the browser side only sends after consent --------------------------------------------

test('the browser code sends nothing unless cookies were accepted, and deletes on decline', () => {
  const client = readFileSync(path.join(SRC, 'lib/track-client.ts'), 'utf8')
  assert.ok(client.includes("hasConsent: () => getConsent() === 'accepted'"))
  const sender = readFileSync(path.join(SRC, 'lib/track-sender.ts'), 'utf8')
  assert.ok(sender.includes('if (!deps.hasConsent()) return Promise.resolve()'))
  assert.ok(sender.includes("consent: 'accepted'"))
  const tracker = readFileSync(path.join(SRC, 'components/VisitorTracker.tsx'), 'utf8')
  assert.match(tracker, /if \(!consented\) return/)
  assert.match(tracker, /detail === 'declined'\) forgetMe\(\)/)
  const layout = readFileSync(path.join(SRC, 'app/layout.tsx'), 'utf8')
  assert.match(layout, /<VisitorTracker \/>/)
})

test('the Privacy page says what is stored, that consent is needed, that no IP is kept, and how long', () => {
  const p = readFileSync(path.join(SRC, 'app/privacy/page.tsx'), 'utf8')
  assert.match(p, /Only if you accept cookies/)
  assert.match(p, /do <b>not<\/b> store your IP address/)
  assert.match(p, /tutafy_vid/)
  assert.match(p, /13 months/)
  assert.match(p, /ChatGPT, Gemini, Claude, Perplexity or Copilot/)
  assert.match(p, /link between the visitor ID and your account/)
})
