// The Polar webhook changes who is on a paid plan, so it must be closed unless the signature checks
// out, and closed outright when the signing secret is missing (T-0615).
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

let db: FakeDb
let clientsMade = 0
mock.module('@supabase/supabase-js', { exports: { createClient: () => { clientsMade++; return db } } })

const secrets = await import('@/lib/secrets.ts')
const route = await import('@/app/api/webhooks/polar/route.ts')
const { NextRequest } = await import('next/server.js')

const SECRET = 'webhook-test-secret-0123456789abcdef'
const TUTOR = '11111111-1111-4111-8111-111111111111'

let logged: string[] = []
beforeEach(() => {
  delete process.env.POLAR_WEBHOOK_SECRET
  secrets.resetSecretLog()
  logged = []
  mock.method(console, 'error', (...a: unknown[]) => { logged.push(a.join(' ')) })
  mock.method(console, 'warn', (...a: unknown[]) => { logged.push(a.join(' ')) })
  mock.method(console, 'log', (...a: unknown[]) => { logged.push(a.join(' ')) })
  clientsMade = 0
  db = createFakeDb({
    tutors: [{ id: TUTOR, name: 'Ten', email: 'ten@example.com', subscription_status: 'free' }],
    visitors: [{ id: 'v1', tutor_id: TUTOR, first_seen_at: '2026-10-01T00:00:00Z' }],
  })
})

const eventBody = (product = 'Tutafy Pro') => JSON.stringify({
  type: 'subscription.created',
  data: { id: 'sub_1', status: 'active', product: { name: product }, customer: { external_id: TUTOR, email: 'ten@example.com' }, current_period_end: '2099-01-01T00:00:00Z' },
})

/** The signature Polar's library sends: v1,<base64 HMAC-SHA256 of "id.timestamp.body">. */
function sign(secret: string, id: string, ts: string, body: string) {
  return 'v1,' + crypto.createHmac('sha256', Buffer.from(secret, 'utf8')).update(`${id}.${ts}.${body}`).digest('base64')
}

function request(body: string, opts: { secret?: string; ts?: number; id?: string; signature?: string; headers?: boolean } = {}) {
  const ts = String(opts.ts ?? Math.floor(Date.now() / 1000))
  const id = opts.id ?? 'evt_1'
  const headers: Record<string, string> = {}
  if (opts.headers !== false) {
    headers['webhook-id'] = id
    headers['webhook-timestamp'] = ts
    headers['webhook-signature'] = opts.signature ?? sign(opts.secret ?? SECRET, id, ts, body)
  }
  return new NextRequest('https://tutafy.test/api/webhooks/polar', { method: 'POST', headers, body })
}

const plan = () => db.tables.tutors[0].subscription_status

test('no signing secret on the server: closed with 503, nothing is read, nothing is changed', async () => {
  const body = eventBody()
  // even a request that looks perfectly signed (with any guess) and one with no signature at all
  for (const req of [request(body), request(body, { headers: false }), request(body, { signature: 'v1,AAAA' })]) {
    const res = await route.POST(req)
    assert.equal(res.status, 503)
  }
  assert.equal(plan(), 'free')
  assert.equal(clientsMade, 0, 'the database was not even opened')
  assert.ok(logged.some(l => l.includes('POLAR_WEBHOOK_SECRET is not set')))
  assert.ok(!logged.join('\n').includes(SECRET))
})

test('a blank or too-short secret is the same as none', async () => {
  for (const v of ['', '   ', 'short']) {
    process.env.POLAR_WEBHOOK_SECRET = v
    assert.equal((await route.POST(request(eventBody(), { secret: v || 'x' }))).status, 503, JSON.stringify(v))
  }
  assert.equal(plan(), 'free')
})

test('with the secret: a wrong signature, a missing one, a tampered body and an old timestamp are all refused', async () => {
  process.env.POLAR_WEBHOOK_SECRET = SECRET
  const body = eventBody()
  assert.equal((await route.POST(request(body, { secret: 'another-long-secret-0123456789abcdef' }))).status, 401)
  assert.equal((await route.POST(request(body, { headers: false }))).status, 401)
  assert.equal((await route.POST(request(body, { signature: '' }))).status, 401)
  // signed for one body, sent with another (an upgrade to Academy slipped in)
  const tampered = new NextRequest('https://tutafy.test/api/webhooks/polar', {
    method: 'POST', body: eventBody('Tutafy Academy'),
    headers: { 'webhook-id': 'evt_1', 'webhook-timestamp': String(Math.floor(Date.now() / 1000)), 'webhook-signature': sign(SECRET, 'evt_1', String(Math.floor(Date.now() / 1000)), body) },
  })
  assert.equal((await route.POST(tampered)).status, 401)
  // a correct signature on a request more than 5 minutes old (a replay)
  assert.equal((await route.POST(request(body, { ts: Math.floor(Date.now() / 1000) - 10 * 60 }))).status, 401)
  assert.equal((await route.POST(request(body, { ts: Math.floor(Date.now() / 1000) + 10 * 60 }))).status, 401)
  assert.equal(plan(), 'free')
})

test('with the secret and a correct signature: the plan is set from the product, the order is recorded once', async () => {
  process.env.POLAR_WEBHOOK_SECRET = SECRET
  const res = await route.POST(request(eventBody('Tutafy Academy')))
  assert.equal(res.status, 200)
  assert.equal(plan(), 'academy')
  assert.equal(db.tables.tutors[0].polar_subscription_id, 'sub_1')

  // Polar sends the same event again (a retry): same result, no second order
  assert.equal((await route.POST(request(eventBody('Tutafy Academy'), { id: 'evt_2' }))).status, 200)
  assert.equal(plan(), 'academy')
  assert.equal((db.tables.visitor_events ?? []).filter(e => e.kind === 'order_paid').length, 1)
})

test('with the secret: a body that is not JSON is 400, and logs never hold the secret or a valid signature', async () => {
  process.env.POLAR_WEBHOOK_SECRET = SECRET
  assert.equal((await route.POST(request('not json'))).status, 400)
  const body = eventBody()
  const badSig = await route.POST(request(body, { secret: 'another-long-secret-0123456789abcdef' }))
  assert.equal(badSig.status, 401)
  const log = logged.join('\n')
  assert.ok(log.includes('SIGNATURE MISMATCH'))
  assert.ok(!log.includes(SECRET))
  assert.ok(!log.includes(sign(SECRET, 'evt_1', String(Math.floor(Date.now() / 1000)), body)), 'the expected signature is not logged')
  assert.ok(!/secretHash/.test(log))
})

test('the code has no "skip the check when the secret is missing" path any more', () => {
  const src = readFileSync(path.join(SRC, 'app/api/webhooks/polar/route.ts'), 'utf8')
  assert.ok(!/skip if not configured/i.test(src))
  assert.ok(!/if \(!rawSecret\) return true/.test(src))
  assert.ok(src.includes("if (!readSecret('POLAR_WEBHOOK_SECRET')) return NextResponse.json({ error: 'Unavailable' }, { status: 503 })"))
  assert.ok(src.includes('safeEqual(r, e)')) // signatures are compared in constant time
})
