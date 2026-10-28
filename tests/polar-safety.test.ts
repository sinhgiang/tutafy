// T-1074: cancelling a plan, checked against Polar's documented events without calling Polar. These tests run the REAL webhook route, the REAL daily
// safety check and the REAL cron route over a real Postgres built from the migration files (PGlite), with made-up events shaped the way Polar's
// documentation says they come (https://polar.sh/docs/integrate/webhooks/events.md, checked 2026-10-28):
//   - cancel at the end of the period: `canceled` + `updated` at once, still `active`, `cancel_at_period_end: true`; `revoked` when the period ends,
//     and only then the status is `canceled`;
//   - immediate revocation: `canceled` + `updated` + `revoked` together, status `canceled`;
//   - `uncanceled` is the customer taking it back.
// What they prove: the plan stays to the end of the paid period; it goes at `revoked` (early or late) or at once when ended; an event sent twice,
// late, or in any order never gives the plan back; and if `revoked` never comes the daily check puts the tutor on Free, after the end of the period and
// never before. The mail service is a recorder (NOTHING is sent), every tutor and event is made up, and no real Polar is reached.
// What no test here can show: WHEN Polar really sends `revoked` after the period ends. That needs a real cancel.
import { test, mock, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import crypto, { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb, readMigration } from './support/local-db.ts'
import { pgliteClient } from './support/pglite-client.ts'
import { ADMIN_EMAIL } from './support/admin-account.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const MIGRATION = '031_polar_subscription_state.sql'

let db: PGlite
type Sent = { to: string; subject: string; html: string }
const outbox: Sent[] = []
let sendHook: (m: Sent) => unknown = () => ({ data: { id: 'mail_1' }, error: null })

mock.module('@supabase/supabase-js', { exports: { createClient: () => pgliteClient(db, { restStyle: true, role: 'service_role' }) } })
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: { createAdminClient: () => pgliteClient(db, { restStyle: true, role: 'service_role' }), createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) },
})
mock.module('resend', { exports: { Resend: class { emails = { send: async (m: Sent) => { outbox.push(m); return sendHook(m) } } } } })

const route = await import('@/app/api/webhooks/polar/route.ts')
const expiry = await import('@/lib/polar-expiry.ts')
const rules = await import('@/lib/polar-subscription.ts')
const cron = await import('@/app/api/cron/polar-expiry/route.ts')
const { NextRequest } = await import('next/server.js')

const SECRET = 'webhook-test-secret-0123456789abcdef'
const CRON_SECRET = 'cron-test-secret-0123456789abcdef'
const HOUR = 3_600_000
const DAY = 24 * HOUR
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString()
const iso = (ms: number) => new Date(ms).toISOString()

let logged: string[] = []
const VARS = ['POLAR_WEBHOOK_SECRET', 'RESEND_API_KEY', 'CRON_SECRET']
const saved: Record<string, string | undefined> = {}
beforeEach(() => {
  for (const v of VARS) saved[v] = process.env[v]
  process.env.POLAR_WEBHOOK_SECRET = SECRET
  process.env.RESEND_API_KEY = 're_test_0123456789abcdef'
  process.env.CRON_SECRET = CRON_SECRET
  outbox.length = 0
  sendHook = () => ({ data: { id: 'mail_1' }, error: null })
  logged = []
  mock.method(console, 'error', (...a: unknown[]) => { logged.push(a.join(' ')) })
  mock.method(console, 'warn', (...a: unknown[]) => { logged.push(a.join(' ')) })
  mock.method(console, 'log', (...a: unknown[]) => { logged.push(a.join(' ')) })
})
afterEach(() => {
  mock.restoreAll()
  for (const v of VARS) { if (saved[v] === undefined) delete process.env[v]; else process.env[v] = saved[v] }
})

// ---- a throwaway Postgres, one paying tutor, and Polar-shaped events -------------------------------------------------------------------------
let TUTOR = ''
const TUTOR_EMAIL = 'ten@example.com'
async function world(applyNew = true, plan = 'pro'): Promise<void> {
  db = await newDb()
  await applyMigrationsBefore(db, MIGRATION)
  if (applyNew) await db.exec(readMigration(MIGRATION))
  TUTOR = randomUUID()
  await db.query(`insert into auth.users (id, email) values ($1, $2)`, [TUTOR, 'login-ten@school.example'])
  await db.query(`insert into public.tutors (id, email, name, slug) values ($1, $2, 'Ten', 'ten')`, [TUTOR, TUTOR_EMAIL])
  await db.query(`update public.tutors set subscription_status = $2, polar_subscription_id = 'sub_1', subscription_expires_at = $3 where id = $1`, [TUTOR, plan, inDays(20)])
}
const tutorRow = async () => (await db.query<{ subscription_status: string; subscription_expires_at: string | null; polar_subscription_id: string | null }>(`select subscription_status, subscription_expires_at, polar_subscription_id from public.tutors where id = $1`, [TUTOR])).rows[0]
const plan = async () => (await tutorRow()).subscription_status
const stateRow = async (sub = 'sub_1') => (await db.query<Record<string, unknown>>(`select * from public.polar_subscription_state where subscription_id = $1`, [sub])).rows[0]

function sign(id: string, ts: string, body: string, secret = SECRET) {
  return 'v1,' + crypto.createHmac('sha256', Buffer.from(secret, 'utf8')).update(`${id}.${ts}.${body}`).digest('base64')
}
let n = 0
function request(body: string, signed = true) {
  const ts = String(Math.floor(Date.now() / 1000))
  const id = `evt_${++n}`
  const headers: Record<string, string> = signed ? { 'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': sign(id, ts, body) } : {}
  return new NextRequest('https://tutafy.test/api/webhooks/polar', { method: 'POST', headers, body })
}

type Over = Record<string, unknown>
/** One subscription as Polar shapes it in a webhook: an active Pro subscription renewing in 20 days. */
const subscription = (over: Over = {}) => ({
  id: 'sub_1', status: 'active', product: { name: 'Tutafy Pro' }, customer: { external_id: TUTOR, email: TUTOR_EMAIL },
  cancel_at_period_end: false, canceled_at: null, ends_at: null, ended_at: null, current_period_end: inDays(20), modified_at: inDays(0), ...over,
})
const send = (type: string, over: Over = {}) => route.POST(request(JSON.stringify({ type, data: subscription(over) })))

/** Cancel at the end of the period, as documented: still active, the flag set, the end of the period known. */
const scheduled = (end: string, modified = inDays(0)) => ({ status: 'active', cancel_at_period_end: true, canceled_at: modified, ends_at: end, current_period_end: end, modified_at: modified })
/** The period has ended and Polar revoked: status canceled, `ended_at` set. */
const revokedAtEnd = (end: string, modified = inDays(0)) => ({ status: 'canceled', cancel_at_period_end: true, ends_at: end, ended_at: end, current_period_end: end, modified_at: modified })

const mailTo = () => outbox.filter(m => m.to === ADMIN_EMAIL)

// ---- 1. a cancel at the end of the period -----------------------------------------------------------------------------------------------------

test('cancel at the end of the period (documented shape): the tutor keeps Pro to the last day, the end is remembered, the owner is told ONCE', async () => {
  await world()
  const end = inDays(12)
  const data = scheduled(end)
  for (const type of ['subscription.canceled', 'subscription.updated']) assert.equal((await send(type, data)).status, 200)
  assert.equal(await plan(), 'pro')
  assert.ok(Math.abs(Date.parse((await tutorRow()).subscription_expires_at!) - Date.parse(end)) < 1000, 'the day the plan ends is kept')
  const row = await stateRow()
  assert.equal(row.state, 'canceling')
  assert.ok(Math.abs(Date.parse(row.ends_at as string) - Date.parse(end)) < 1000)
  assert.ok(row.cancel_noticed_at, 'the notice is remembered')
  assert.equal(mailTo().length, 1, 'one mail to the admin for the whole cancel')
  assert.match(mailTo()[0].subject, /cancel/i)
  assert.ok(mailTo()[0].html.includes(TUTOR), 'it names the tutor by id')
  assert.ok(!mailTo()[0].html.includes(TUTOR_EMAIL) && !mailTo()[0].html.includes('Ten'), 'it never holds the tutor address or name')
  assert.ok(!logged.some(l => l.includes(TUTOR_EMAIL)), 'no address in the logs')
})

test('the same events delivered again (Polar retries) change nothing and tell the owner nothing more', async () => {
  await world()
  const data = scheduled(inDays(12))
  for (let i = 0; i < 3; i += 1) { await send('subscription.canceled', data); await send('subscription.updated', data) }
  assert.equal(await plan(), 'pro')
  assert.equal((await db.query(`select 1 from public.polar_subscription_state`)).rows.length, 1)
  assert.equal(mailTo().length, 1)
})

test('then the period ends and Polar sends `revoked`: back to Free, the date cleared, the row closed', async () => {
  await world()
  const end = inDays(12)
  await send('subscription.canceled', scheduled(end))
  assert.equal(await plan(), 'pro')
  const res = await send('subscription.revoked', revokedAtEnd(iso(Date.now() - 1000), inDays(0.001)))
  assert.equal(res.status, 200)
  assert.equal(await plan(), 'free')
  assert.equal((await tutorRow()).subscription_expires_at, null)
  const row = await stateRow()
  assert.equal(row.state, 'ended')
  assert.equal(row.ended_by, 'revoked')
  assert.equal(mailTo().length, 1, 'already told at the cancel')
})

// ---- 2. an immediate cancel, in every order ---------------------------------------------------------------------------------------------------

const PERMUTATIONS = (() => {
  const t = ['subscription.canceled', 'subscription.updated', 'subscription.revoked']
  const out: string[][] = []
  for (const a of t) for (const b of t) for (const c of t) if (new Set([a, b, c]).size === 3) out.push([a, b, c])
  return out
})()

test('an immediate revocation sends three events together: in ALL six orders the tutor ends on Free and stays there', async () => {
  assert.equal(PERMUTATIONS.length, 6)
  // Two shapes: with `ended_at` (what the documentation's "ended" field says) and without it, where only the order rule can keep the plan away.
  for (const withEndedAt of [true, false]) {
    for (const order of PERMUTATIONS) {
      await world()
      const data = { status: 'canceled', cancel_at_period_end: false, canceled_at: inDays(0), ends_at: null, ended_at: withEndedAt ? iso(Date.now() - 1000) : null, current_period_end: inDays(10), modified_at: inDays(0) }
      for (const type of order) assert.equal((await send(type, data)).status, 200)
      assert.equal(await plan(), 'free', `${order.join(' > ')} (ended_at ${withEndedAt})`)
      assert.equal((await stateRow()).state, 'ended')
    }
  }
})

test('`revoked` arriving EARLY (the paid period still has days left) is Polar saying the benefits are over: Free at once', async () => {
  await world()
  assert.equal((await send('subscription.revoked', { status: 'canceled', ends_at: inDays(9), current_period_end: inDays(9) })).status, 200)
  assert.equal(await plan(), 'free')
  assert.equal((await tutorRow()).subscription_expires_at, null)
})

test('events that arrive AFTER `revoked` cannot give the plan back (a late `updated` as active, a late `canceled` with time left)', async () => {
  await world()
  const end = inDays(12)
  await send('subscription.canceled', scheduled(end, inDays(-1)))
  await send('subscription.revoked', revokedAtEnd(iso(Date.now() - 1000), inDays(0)))
  assert.equal(await plan(), 'free')
  const afterRevoke = { ...(await tutorRow()) }
  for (const [type, data] of [
    ['subscription.updated', scheduled(end, inDays(-1))],
    ['subscription.updated', { status: 'active', modified_at: inDays(1) }],
    ['subscription.canceled', scheduled(end, inDays(-1))],
    ['subscription.uncanceled', { status: 'active', modified_at: inDays(1) }],
  ] as const) {
    assert.equal((await send(type, data)).status, 200)
    assert.deepEqual(await tutorRow(), afterRevoke, type)
  }
  assert.ok(logged.some(l => l.includes('the subscription already ended')))
})

// ---- 3. the customer changes their mind ---------------------------------------------------------------------------------------------------------

test('`uncanceled`: the plan carries on, the row goes back to "active", and an OLDER cancel arriving late is ignored', async () => {
  await world()
  const end = inDays(12)
  const asked = inDays(-0.5)
  await send('subscription.canceled', scheduled(end, asked))
  assert.equal((await stateRow()).state, 'canceling')
  const renew = inDays(12)
  const back = { status: 'active', cancel_at_period_end: false, canceled_at: null, ends_at: null, current_period_end: renew, modified_at: inDays(-0.25) }
  assert.equal((await send('subscription.uncanceled', back)).status, 200)
  assert.equal((await send('subscription.updated', back)).status, 200)
  assert.equal(await plan(), 'pro')
  assert.equal((await stateRow()).state, 'active')
  assert.equal((await stateRow()).ends_at, null)
  // the first cancel, delivered a second time after the uncancel
  assert.equal((await send('subscription.canceled', scheduled(end, asked))).status, 200)
  assert.equal(await plan(), 'pro')
  assert.equal((await stateRow()).state, 'active', 'the old cancel did not win')
  assert.ok(logged.some(l => l.includes('older than one already applied')))
  // and the safety net leaves a taken-back subscription alone, however late it runs
  const r = await expiry.runPolarExpiry(pgliteClient(db, { restStyle: true, role: 'service_role' }), new Date(Date.now() + 60 * DAY), async () => true)
  assert.deepEqual(r.downgraded, [])
  assert.equal(await plan(), 'pro')
})

// ---- 4. the safety net: `revoked` is late, or never comes -----------------------------------------------------------------------------------------

async function cancelingUntil(end: string) {
  await send('subscription.canceled', scheduled(end))
  assert.equal(await plan(), 'pro')
}
const check = (now: Date, notify: (s: string, l: string[]) => Promise<boolean> = async () => true) => expiry.runPolarExpiry(pgliteClient(db, { restStyle: true, role: 'service_role' }), now, notify)

test('safety net: BEFORE the end of the paid period (and the 12 hours of grace) the tutor keeps Pro; after it they go to Free, with a log line and one mail', async () => {
  await world()
  const end = Date.now() + 3 * DAY
  await cancelingUntil(iso(end))
  outbox.length = 0
  const told: { subject: string; lines: string[] }[] = []
  const notify = async (subject: string, lines: string[]) => { told.push({ subject, lines }); return true }

  for (const [label, at] of [['a day before the end', end - DAY], ['the moment it ends', end], ['11 hours after the end', end + 11 * HOUR]] as const) {
    const r = await check(new Date(at), notify)
    assert.deepEqual(r.downgraded, [], label)
    assert.equal(await plan(), 'pro', label)
  }
  assert.equal(told.length, 0)

  const r = await check(new Date(end + 13 * HOUR), notify)
  assert.deepEqual(r.downgraded, [TUTOR])
  assert.equal(await plan(), 'free')
  assert.equal((await tutorRow()).subscription_expires_at, null)
  const row = await stateRow()
  assert.equal(row.state, 'ended')
  assert.equal(row.ended_by, 'safety_net')
  assert.ok(row.safety_downgraded_at)
  assert.ok(logged.some(l => l.includes('SAFETY DOWNGRADE') && l.includes(TUTOR)), 'a log line names the tutor id')
  assert.equal(told.length, 1)
  assert.ok(told[0].lines.join(' ').includes(TUTOR))
  assert.ok(!JSON.stringify(told).includes(TUTOR_EMAIL), 'no address in the notice')
  assert.ok(r.notified)
  assert.ok((await stateRow()).safety_noticed_at, 'the owner notice is written down')

  // a second run the same day, and a week later: nothing more, nobody told again
  assert.deepEqual((await check(new Date(end + 14 * HOUR), notify)).downgraded, [])
  assert.deepEqual((await check(new Date(end + 7 * DAY), notify)).downgraded, [])
  assert.equal(told.length, 1)
})

test('safety net, then Polar\'s `revoked` finally arrives: nothing breaks, the tutor stays on Free and the row says revoked', async () => {
  await world()
  const end = Date.now() + DAY
  await cancelingUntil(iso(end))
  assert.deepEqual((await check(new Date(end + 20 * HOUR))).downgraded, [TUTOR])
  assert.equal((await send('subscription.revoked', revokedAtEnd(iso(end), inDays(2)))).status, 200)
  assert.equal(await plan(), 'free')
  assert.equal((await stateRow()).state, 'ended')
})

test('safety net: `revoked` arrived on time, so there is nothing for it to do (and nobody is mailed)', async () => {
  await world()
  const end = Date.now() + DAY
  await cancelingUntil(iso(end))
  await send('subscription.revoked', revokedAtEnd(iso(end), inDays(1.1)))
  let told = 0
  const r = await check(new Date(end + 2 * DAY), async () => { told++; return true })
  assert.deepEqual(r.downgraded, [])
  assert.equal(told, 0)
})

test('safety net: a tutor who has since bought ANOTHER subscription is not put on Free for the old one; the old row is just closed', async () => {
  await world()
  const end = Date.now() + DAY
  await cancelingUntil(iso(end))
  await db.query(`update public.tutors set polar_subscription_id = 'sub_2' where id = $1`, [TUTOR])
  const r = await check(new Date(end + 2 * DAY))
  assert.deepEqual(r.downgraded, [])
  assert.equal(r.skipped, 1)
  assert.equal(await plan(), 'pro')
  assert.equal((await stateRow()).state, 'ended')
})

test('safety net: two runs at the same moment put the tutor back once and mail once', async () => {
  await world()
  const end = Date.now() + DAY
  await cancelingUntil(iso(end))
  let told = 0
  const notify = async () => { told++; return true }
  const [a, b] = await Promise.all([check(new Date(end + 2 * DAY), notify), check(new Date(end + 2 * DAY), notify)])
  assert.equal(a.downgraded.length + b.downgraded.length, 1)
  assert.equal(told, 1)
  assert.equal(await plan(), 'free')
})

test('safety net: the plan is only touched for the row\'s own tutor (a second tutor on Pro is left alone)', async () => {
  await world()
  const other = randomUUID()
  await db.query(`insert into auth.users (id, email) values ($1, 'other-login@school.example')`, [other])
  await db.query(`insert into public.tutors (id, email, name, slug, subscription_status, polar_subscription_id) values ($1, 'other@example.com', 'Other', 'other', 'pro', 'sub_other')`, [other])
  const end = Date.now() + DAY
  await cancelingUntil(iso(end))
  await check(new Date(end + 2 * DAY))
  assert.equal(await plan(), 'free')
  assert.equal((await db.query<{ subscription_status: string }>(`select subscription_status from public.tutors where id = $1`, [other])).rows[0].subscription_status, 'pro')
})

test('safety net: a failing mail service does not stop the downgrade, and the owner notice is not marked as sent', async () => {
  await world()
  const end = Date.now() + DAY
  await cancelingUntil(iso(end))
  const r = await check(new Date(end + 2 * DAY), async () => false)
  assert.deepEqual(r.downgraded, [TUTOR])
  assert.equal(r.notified, false)
  assert.equal(await plan(), 'free')
  assert.equal((await stateRow()).safety_noticed_at, null)
})

// ---- 5. telling the owner of the first real cancel ---------------------------------------------------------------------------------------------

test('the owner is told when a tutor really cancels; a failing mail service never fails the webhook, and the notice is retried on the next delivery', async () => {
  await world()
  sendHook = () => { throw new Error('mail service down') }
  const data = scheduled(inDays(12))
  assert.equal((await send('subscription.canceled', data)).status, 200)
  assert.equal(await plan(), 'pro')
  assert.equal((await stateRow()).cancel_noticed_at, null, 'not marked as told')
  sendHook = () => ({ data: { id: 'mail_2' }, error: null })
  assert.equal((await send('subscription.canceled', data)).status, 200)
  assert.equal(mailTo().length, 2, 'one failed try, one that went')
  assert.ok((await stateRow()).cancel_noticed_at)
  await send('subscription.canceled', data)
  assert.equal(mailTo().length, 2, 'told once')
})

test('no mail key on the server: the cancel still works, the owner cannot be mailed, and a warning says so', async () => {
  await world()
  delete process.env.RESEND_API_KEY
  assert.equal((await send('subscription.canceled', scheduled(inDays(12)))).status, 200)
  assert.equal(await plan(), 'pro')
  assert.equal(outbox.length, 0)
  assert.ok(logged.some(l => l.includes('owner not told')))
})

// ---- 6. before migration 031 is applied, and who may do what ------------------------------------------------------------------------------------

test('without migration 031 the webhook behaves as before (keep to the end, revoked drops) and the safety check says it cannot read, without failing', async () => {
  await world(false)
  assert.equal((await send('subscription.canceled', scheduled(inDays(12)))).status, 200)
  assert.equal(await plan(), 'pro')
  assert.equal((await send('subscription.revoked', revokedAtEnd(inDays(-0.01)))).status, 200)
  assert.equal(await plan(), 'free')
  assert.ok(logged.some(l => l.includes('could not read the subscription state')))
  const r = await check(new Date())
  assert.equal(r.error, 'read-failed')
  assert.deepEqual(r.downgraded, [])
})

test('a cancel without a valid signature changes nothing and mails nobody', async () => {
  await world()
  const body = JSON.stringify({ type: 'subscription.revoked', data: subscription({ status: 'canceled', ended_at: inDays(-1) }) })
  assert.equal((await route.POST(request(body, false))).status, 401)
  const forged = new NextRequest('https://tutafy.test/api/webhooks/polar', { method: 'POST', headers: { 'webhook-id': 'e', 'webhook-timestamp': String(Math.floor(Date.now() / 1000)), 'webhook-signature': sign('e', String(Math.floor(Date.now() / 1000)), body, 'another-long-secret-0123456789abcdef') }, body })
  assert.equal((await route.POST(forged)).status, 401)
  assert.equal(await plan(), 'pro')
  assert.equal((await db.query(`select 1 from public.polar_subscription_state`)).rows.length, 0)
  assert.equal(outbox.length, 0)
})

test('one tutor\'s event cannot touch another tutor: an event for a subscription that is not theirs changes nothing and leaves no row', async () => {
  await world()
  const other = randomUUID()
  await db.query(`insert into auth.users (id, email) values ($1, 'other-login@school.example')`, [other])
  await db.query(`insert into public.tutors (id, email, name, slug, subscription_status, polar_subscription_id) values ($1, 'other@example.com', 'Other', 'other', 'academy', 'sub_other')`, [other])
  // tutor 1 (on sub_1) is named by the event, but the subscription is another one
  assert.equal((await send('subscription.revoked', { id: 'sub_other', status: 'canceled' })).status, 200)
  assert.equal(await plan(), 'pro')
  assert.equal((await db.query(`select 1 from public.polar_subscription_state`)).rows.length, 0)
  assert.equal((await db.query<{ subscription_status: string }>(`select subscription_status from public.tutors where id = $1`, [other])).rows[0].subscription_status, 'academy')
})

test('migration 031: applies twice, adds one table, and neither a visitor nor a signed-in tutor (the tutor the row is about included) can read or write it', async () => {
  await world(false)
  const before = (await db.query<{ n: string }>(`select count(*) as n from information_schema.tables where table_schema = 'public'`)).rows[0].n
  await db.exec(readMigration(MIGRATION))
  await db.exec(readMigration(MIGRATION))
  const after = (await db.query<{ n: string }>(`select count(*) as n from information_schema.tables where table_schema = 'public'`)).rows[0].n
  assert.equal(Number(after) - Number(before), 1)
  const rls = await db.query<{ relrowsecurity: boolean }>(`select relrowsecurity from pg_class where relname = 'polar_subscription_state'`)
  assert.equal(rls.rows[0].relrowsecurity, true)
  await db.query(`insert into public.polar_subscription_state (subscription_id, tutor_id, state, ends_at) values ('sub_1', $1, 'canceling', now())`, [TUTOR])
  for (const [role, uid] of [['authenticated', TUTOR], ['authenticated', randomUUID()], ['anon', '']] as const) {
    const as = pgliteClient(db, { role, userId: uid || undefined })
    assert.ok((await as.from('polar_subscription_state').select('*')).error, `${role} reads`)
    assert.ok((await as.from('polar_subscription_state').update({ state: 'active', ends_at: null }).eq('subscription_id', 'sub_1')).error, `${role} moves the end date`)
    assert.ok((await as.from('polar_subscription_state').insert({ subscription_id: 'sub_x', tutor_id: TUTOR, state: 'active' })).error, `${role} inserts`)
  }
  assert.equal((await pgliteClient(db, { role: 'service_role' }).from('polar_subscription_state').select('state')).data?.length, 1, 'the server can read')
  await assert.rejects(db.query(`insert into public.polar_subscription_state (subscription_id, tutor_id, state) values ('sub_y', $1, 'paused')`, [TUTOR]), (e: unknown) => (e as { code?: string }).code === '23514')
  await db.query(`delete from public.tutors where id = $1`, [TUTOR])
  assert.equal((await db.query(`select 1 from public.polar_subscription_state`)).rows.length, 0, 'deleting a tutor removes their row')
})

// ---- 7. the daily cron route -----------------------------------------------------------------------------------------------------------------------

test('cron route: closed without CRON_SECRET (503) and without the right bearer (401); with it, answers counts and never an id or an address', async () => {
  await world()
  const get = (auth?: string) => cron.GET(new Request('https://tutafy.test/api/cron/polar-expiry', { headers: auth ? { authorization: auth } : {} }))
  delete process.env.CRON_SECRET
  assert.equal((await get()).status, 503)
  process.env.CRON_SECRET = CRON_SECRET
  assert.equal((await get()).status, 401)
  assert.equal((await get('Bearer wrong-secret-0123456789abcdef')).status, 401)
  const end = Date.now() - 2 * DAY
  await db.query(`insert into public.polar_subscription_state (subscription_id, tutor_id, state, ends_at) values ('sub_1', $1, 'canceling', $2)`, [TUTOR, iso(end)])
  const res = await get(`Bearer ${CRON_SECRET}`)
  assert.equal(res.status, 200)
  const text = await res.text()
  assert.deepEqual(JSON.parse(text).downgraded, 1)
  assert.ok(!text.includes(TUTOR) && !text.includes(TUTOR_EMAIL))
  assert.equal(await plan(), 'free', 'the real route, the real clock')
  assert.equal(mailTo().length, 1)
  assert.ok(mailTo()[0].html.includes(TUTOR))
})

test('vercel.json runs the safety check once a day, and the existing jobs are still there', () => {
  const cfg = JSON.parse(readFileSync(path.join(ROOT, 'vercel.json'), 'utf8').replace(/^﻿/, '')) as { crons: { path: string; schedule: string }[] }
  const job = cfg.crons.find(c => c.path === '/api/cron/polar-expiry')
  assert.ok(job, 'the job is listed')
  assert.match(job!.schedule, /^\d+ \d+ \* \* \*$/, 'once a day')
  for (const p of ['/api/cron/reminders', '/api/cron/welcome-series', '/api/cron/review-invites']) assert.ok(cfg.crons.some(c => c.path === p), p)
})

// ---- 8. the rules on their own ---------------------------------------------------------------------------------------------------------------------

test('the order rules: `revoked` always applies; an ended subscription ignores everything else; an older event is ignored, an equal one is applied', () => {
  const T = '2026-11-03T10:00:00Z'
  const row = (state: 'active' | 'canceling' | 'ended') => ({ state, ends_at: null, last_event_at: T })
  const t = Date.parse(T)
  assert.equal(rules.ignoreReason('subscription.updated', null, t), null, 'nothing remembered')
  assert.equal(rules.ignoreReason('subscription.revoked', row('ended'), t - 1), null, 'revoked is final and always applies')
  for (const type of ['subscription.created', 'subscription.updated', 'subscription.canceled', 'subscription.uncanceled']) {
    assert.equal(rules.ignoreReason(type, row('ended'), t + 1), 'ended', type)
    assert.equal(rules.ignoreReason(type, row('canceling'), t - 1), 'older', type)
    assert.equal(rules.ignoreReason(type, row('canceling'), t), null, `${type}: the same time is applied again`)
    assert.equal(rules.ignoreReason(type, row('active'), null), null, `${type}: no time on the event`)
  }
})

test('the safety rule on its own: only a "canceling" row, only once the end plus 12 hours has passed', () => {
  const end = '2026-11-03T10:00:00Z'
  const t = Date.parse(end)
  assert.equal(rules.SAFETY_GRACE_MS, 12 * HOUR)
  assert.equal(rules.safetyDue({ state: 'canceling', ends_at: end }, t + 12 * HOUR), false, 'exactly at the grace time is not yet')
  assert.equal(rules.safetyDue({ state: 'canceling', ends_at: end }, t + 12 * HOUR + 1), true)
  assert.equal(rules.safetyDue({ state: 'canceling', ends_at: end }, t - DAY), false)
  assert.equal(rules.safetyDue({ state: 'active', ends_at: end }, t + 9 * DAY), false)
  assert.equal(rules.safetyDue({ state: 'ended', ends_at: end }, t + 9 * DAY), false)
  assert.equal(rules.safetyDue({ state: 'canceling', ends_at: null }, t + 9 * DAY), false, 'no end date: the safety net cannot act')
})

test('"ended" from Polar wins over a future date, and the cancel-in-progress test follows the documented shape', () => {
  const NOW = Date.parse('2026-11-03T10:00:00Z')
  const future = '2026-11-20T00:00:00Z'
  assert.equal(rules.isPaidNow({ status: 'canceled', current_period_end: future, ended_at: '2026-11-03T09:00:00Z' }, NOW), false)
  assert.equal(rules.isPaidNow({ status: 'canceled', current_period_end: future, ended_at: null }, NOW), true, 'no ended_at: the paid time still counts')
  assert.deepEqual(rules.decideCancel({ current_period_end: future, ended_at: '2026-11-03T09:00:00Z' }, NOW), { action: 'drop' })
  assert.equal(rules.isCanceling({ status: 'active', cancel_at_period_end: true, ends_at: future }, NOW), true)
  assert.equal(rules.isCanceling({ status: 'active', cancel_at_period_end: false, current_period_end: future }, NOW), false)
  assert.equal(rules.isCanceling({ status: 'active', cancel_at_period_end: true }, NOW), false, 'a flag with no date has nothing to remember')
  assert.equal(rules.isCanceling({ status: 'canceled', ends_at: future }, NOW), true)
  assert.equal(rules.isCanceling({ status: 'canceled', ends_at: future, ended_at: '2026-11-03T09:00:00Z' }, NOW), false)
  assert.equal(rules.eventTime({ modified_at: '2026-11-03T10:00:00Z' }), NOW)
  assert.equal(rules.eventTime({ modified_at: 'soon' }), null)
})

test('the new code writes no address or name to a log: no console call holds a customer field or an address', () => {
  for (const f of ['lib/polar-state.ts', 'lib/polar-expiry.ts', 'app/api/cron/polar-expiry/route.ts', 'app/api/webhooks/polar/route.ts']) {
    const src = readFileSync(path.join(SRC, f), 'utf8')
    // every console call as a whole statement (a call may run over two lines); "!!x" only says a field was there, not what it held
    const statements = src.match(/console\.(?:log|warn|error)\((?:[^;]|\n)*?\)\r?\n/g) ?? []
    if (!f.includes('cron/')) assert.ok(statements.length > 0, `${f}: the scan found the console calls`)
    for (const stmt of statements) {
      assert.ok(!/\.email|\.name\b|\bcustomer\b/i.test(stmt.replace(/!!\S+/g, '')), `${f}: ${stmt.trim()}`)
    }
  }
})
