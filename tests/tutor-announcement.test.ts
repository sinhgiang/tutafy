// T-1064: the one-off letter to the tutors, from the admin's own page. These tests run the REAL code (the pure rules, the queue, the three admin
// routes and the page) against a real Postgres built from the migration files (PGlite). The mail service is a recorder, so NOTHING is ever sent and
// no real address is read: every tutor, address and name below is made up. They prove what the owner asked for:
//   - only the platform admin can use any of it, and the check is made on the server (a signed-out visitor, a tutor and a cross-site request are refused);
//   - "send me a test" mails ONE message to the address on the admin's session, whatever the request says;
//   - Start is refused without a recent test, and without the number the admin saw in the confirm box;
//   - each tutor is queued once, however often Start is pressed (even twice at the same moment), and the times are exactly three minutes apart;
//   - Stop takes back every mail that has not gone, and leaves the ones that have; Start after Stop queues only those taken back;
//   - no address and no name is stored, shown or answered.
import { test, mock, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb, readMigration } from './support/local-db.ts'
import { pgliteClient } from './support/pglite-client.ts'
import { ADMIN_EMAIL } from './support/admin-account.ts'
import { assertRateLimitHolds } from './support/rate-limit-check.ts'
import { setAdminLang } from './support/admin-lang.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const MIGRATION = '030_tutor_announcement.sql'

// ---- doubles: the database the routes see, the signed-in session, and the mail service (a recorder) ---------------------------------------
type Sent = { to: string; subject: string; html: string; text: string; headers?: Record<string, string>; scheduledAt?: string; from: string; replyTo: unknown; key?: string }
let currentDb: PGlite
// a small stand-in for the one check that freezes the clock (the limiter check), where a real database is not the point
let dbOverride: unknown = null
let sessionUser: { id: string; email: string } | null = null
const outbox: Sent[] = []
const cancelled: string[] = []
let sendHook: (m: Sent, n: number) => unknown = (_m, n) => ({ data: { id: `mail_${n}` }, error: null })
let cancelHook: (id: string) => unknown = () => ({ data: {}, error: null })
const redirects: string[] = []

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createAdminClient: () => dbOverride ?? pgliteClient(currentDb, { restStyle: true }),
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: sessionUser } }) } }),
  },
})
mock.module('resend', {
  exports: {
    Resend: class {
      emails = {
        send: async (m: Sent, o?: { idempotencyKey?: string }) => { outbox.push({ ...m, key: o?.idempotencyKey }); return sendHook(outbox[outbox.length - 1], outbox.length) },
        cancel: async (id: string) => { cancelled.push(id); return cancelHook(id) },
      }
    },
  },
})
mock.module('next/navigation', {
  exports: { redirect: (to: string) => { redirects.push(to); throw new Error(`NEXT_REDIRECT:${to}`) }, usePathname: () => '/super-admin/announcement', useRouter: () => ({ push() {}, refresh() {} }) },
})

const rules = await import('@/lib/tutor-announcement.ts')
const run = await import('@/lib/tutor-announcement-run.ts')
const tokens = await import('@/lib/unsubscribe-token.ts')
const testRoute = await import('@/app/api/admin/announcement/test/route.ts')
const startRoute = await import('@/app/api/admin/announcement/start/route.ts')
const stopRoute = await import('@/app/api/admin/announcement/stop/route.ts')
const { AdminLangProvider } = await import('@/components/admin/AdminLang.tsx')
const { default: AnnouncementPage } = await import('@/app/(admin)/super-admin/announcement/page.tsx')

// ---- a throwaway Postgres with the new tables, and made-up tutors ------------------------------------------------------------------------
const SECRET = 'a-long-test-secret-that-is-not-real-0123456789'
const ENV = { RESEND_API_KEY: 're_test_0123456789abcdef', UNSUBSCRIBE_SECRET: SECRET, ADMIN_EMAIL }
const NOW = new Date('2026-11-03T10:00:00Z')
const MIN = 60_000

async function newWorld(applyNew = true): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, MIGRATION)
  if (applyNew) await db.exec(readMigration(MIGRATION))
  currentDb = db
  return db
}
const word = (i: number) => { let s = ''; let n = i; do { s = String.fromCharCode(97 + (n % 26)) + s; n = Math.floor(n / 26) - 1 } while (n >= 0); return s }
const BIO = 'I teach English to adults and teenagers, with a lot of speaking practice in every lesson.'
let nth = 0
type Over = { name?: string; bio?: string; email?: string; active?: boolean }
/** One made-up tutor; by default one that qualifies. */
async function tutor(db: PGlite, over: Over = {}) {
  const id = randomUUID()
  const w = word(++nth)
  const email = over.email ?? `${w}@school.example`
  const name = over.name ?? `Ana${w} Rivera`
  await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, `${w}-login@school.example`])
  await db.query(`insert into public.tutors (id, email, name, slug, bio, booking_url_active) values ($1, $2, $3, $4, $5, $6)`, [id, email, name, `tutor-${w}`, over.bio ?? BIO, over.active ?? true])
  return { id, email, name }
}
const many = async (db: PGlite, n: number) => { const out = []; for (let i = 0; i < n; i += 1) out.push(await tutor(db)); return out }
const markTested = (db: PGlite, at: Date = NOW) => db.query(`insert into public.tutor_announcement_control (campaign, test_sent_at) values ($1, $2) on conflict (campaign) do update set test_sent_at = excluded.test_sent_at`, [rules.CAMPAIGN, at.toISOString()])
const sends = async (db: PGlite) => (await db.query<Record<string, unknown>>(`select * from public.tutor_announcement_sends order by scheduled_for, tutor_id`)).rows
const dbOf = (db: PGlite) => pgliteClient(db, { restStyle: true })
const mailerOf = () => run.realMailer(ENV)
const noSleep = async () => {}
const start = (db: PGlite, expected: number, now = NOW, env: Record<string, string | undefined> = ENV) => run.startAnnouncement({ db: dbOf(db), mailer: run.realMailer(env), expected, now, env, sleep: noSleep })
const stop = (db: PGlite, now: Date) => run.stopAnnouncement({ db: dbOf(db), mailer: mailerOf(), now, sleep: noSleep })

const VARS = ['RESEND_API_KEY', 'UNSUBSCRIBE_SECRET', 'CRON_SECRET']
const saved: Record<string, string | undefined> = {}
beforeEach(() => {
  for (const v of VARS) { saved[v] = process.env[v] }
  process.env.RESEND_API_KEY = ENV.RESEND_API_KEY
  process.env.UNSUBSCRIBE_SECRET = SECRET
  outbox.length = 0
  cancelled.length = 0
  redirects.length = 0
  sendHook = (_m, n) => ({ data: { id: `mail_${n}` }, error: null })
  cancelHook = () => ({ data: {}, error: null })
  sessionUser = null
  setAdminLang(null)
})
afterEach(() => { for (const v of VARS) { if (saved[v] === undefined) delete process.env[v]; else process.env[v] = saved[v] } })

const ADMIN = { id: randomUUID(), email: ADMIN_EMAIL }
const TUTOR_USER = { id: randomUUID(), email: 'someone@school.example' }
const post = (url: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${url}`, { method: 'POST', headers: { host: 'localhost', origin: 'http://localhost', ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) })

// ---- 1. the rules (pure) ----------------------------------------------------------------------------------------------------------------------

test('who gets it: tutors the sitemap lists, with a plain address, once per address, in a fixed order; nobody else', () => {
  const row = (slug: string, over: Record<string, unknown> = {}) => ({ id: slug, slug, name: `Ana${slug} Rivera`, email: `${slug}@school.example`, bio: BIO, avatar_url: null, created_at: '2026-10-01T00:00:00Z', ...over })
  const rows = [
    row('zed'), row('abe'), row('mid'),
    row('short', { bio: 'Too short.' }),
    row('nobio', { bio: null }),
    row('tester', { name: 'Test Person' }),
    row('noaddr', { email: '' }),
    row('badaddr', { email: 'not an address' }),
    row('dupe-a', { email: 'same@school.example' }), row('dupe-b', { email: 'SAME@school.example' }),
    row('copy1', { name: 'Maria Lopez' }), row('copy2', { name: 'maria  lopez', bio: `${BIO} And a little more about me.` }),
  ]
  const got = rules.pickRecipients(rows)
  assert.deepEqual(got.map(r => r.id), ['abe', 'copy2', 'dupe-a', 'mid', 'zed'])
  assert.deepEqual(rules.pickRecipients(rows.slice().reverse()).map(r => r.id), got.map(r => r.id), 'the order does not depend on the order they were read')
})

test('when it goes: the first mail 90 seconds after Start, then exactly three minutes apart; never closer than three minutes to a mail already waiting', () => {
  assert.equal(rules.SPACING_MS, 3 * MIN)
  const first = rules.firstSlotAt(NOW.getTime(), null)
  assert.equal(first, NOW.getTime() + 90_000)
  const slots = rules.slotTimes(first, 24).map(d => d.getTime())
  assert.equal(slots.length, 24)
  for (let i = 1; i < slots.length; i += 1) assert.equal(slots[i] - slots[i - 1], 3 * MIN, `gap ${i}`)
  assert.equal(rules.firstSlotAt(NOW.getTime(), NOW.getTime() + 20 * MIN), NOW.getTime() + 23 * MIN, 'after a mail that waits 20 minutes, three minutes later')
  assert.equal(rules.firstSlotAt(NOW.getTime(), NOW.getTime() - MIN), NOW.getTime() + 2 * MIN, 'a mail that went a minute ago: three minutes after it')
  assert.equal(rules.firstSlotAt(NOW.getTime(), NOW.getTime() - 10 * MIN), NOW.getTime() + 90_000, 'an old waiting time does not matter')
})

test('the letter: the approved subject and words, the tutor\'s first name, no placeholder left, the unsubscribe line only when there is a link; a name cannot inject markup', () => {
  const m = rules.renderAnnouncement({ name: 'Dr. Maria Santos', unsubscribeUrl: 'https://www.tutafy.com/unsubscribe?t=abc' })
  assert.equal(m.subject, 'Two minutes to get your Tutafy profile ready for students')
  assert.match(m.html, /Hi Maria,/)
  assert.doesNotMatch(m.html, /NAME/)
  for (const phrase of ['New this month', 'Languages you teach.', 'Students you like to teach.', 'Free hours on a week grid.', 'One 30-minute trial lesson.', 'Dashboard card.', 'Three things to add', 'Upload photo', 'Default lesson price', 'Trial lesson and contract', 'Intro video link', 'Reply if anything is unclear.', 'The Tutafy team']) assert.ok(m.html.includes(phrase), phrase)
  assert.ok(m.html.includes('href="https://www.tutafy.com/unsubscribe?t=abc"'))
  assert.equal(rules.renderAnnouncement({ name: 'Maria' }).html.includes('Unsubscribe'), false)
  assert.match(rules.renderAnnouncement({ name: null }).html, /Hi there,/)
  assert.match(rules.renderAnnouncement({ name: '<img src=x onerror=alert(1)> Evil' }).html, /Hi &lt;img/)
  assert.doesNotMatch(rules.renderAnnouncement({ name: '"><script>alert(1)</script>' }).html, /<script>/)
  assert.equal(rules.renderAnnouncement({ name: 'Maria', test: true }).subject, '[Test] Two minutes to get your Tutafy profile ready for students')
  assert.equal(rules.greetingName('Prof. Lee'), 'Lee')
  assert.equal(rules.greetingName('Dr.'), 'Dr.')
  assert.equal(rules.greetingName('   '), 'there')
  assert.ok(rules.renderAnnouncement({ name: 'Maria' }).html.split(/\s+/).length < 400, 'short enough to read in a minute')
})

// ---- 2. the migration -------------------------------------------------------------------------------------------------------------------------

test('migration 030: applies on top of the earlier files and twice, adds exactly two tables, and the browser (a signed-in tutor included) can read and write nothing in them', async () => {
  const db = await newWorld(false)
  const before = (await db.query<{ n: string }>(`select count(*) as n from information_schema.tables where table_schema = 'public'`)).rows[0].n
  await db.exec(readMigration(MIGRATION))
  await db.exec(readMigration(MIGRATION))
  const after = (await db.query<{ n: string }>(`select count(*) as n from information_schema.tables where table_schema = 'public'`)).rows[0].n
  assert.equal(Number(after) - Number(before), 2)
  const rls = await db.query<{ relname: string; relrowsecurity: boolean }>(`select relname, relrowsecurity from pg_class where relname in ('tutor_announcement_sends', 'tutor_announcement_control') order by 1`)
  assert.deepEqual(rls.rows.map(r => r.relrowsecurity), [true, true])
  const t = await tutor(db)
  await db.query(`insert into public.tutor_announcement_sends (campaign, tutor_id, state, scheduled_for) values ('c', $1, 'queued', now())`, [t.id])
  // the second-person test: another tutor, a visitor, and the tutor the row is about all see and change nothing
  for (const [role, uid] of [['authenticated', t.id], ['authenticated', randomUUID()], ['anon', '']] as const) {
    const as = pgliteClient(db, { role, userId: uid || undefined })
    for (const table of ['tutor_announcement_sends', 'tutor_announcement_control']) {
      const read = await as.from(table).select('*')
      assert.ok(read.error, `${role} reads ${table}`)
      const write = await as.from(table).insert(table === 'tutor_announcement_sends' ? { campaign: 'x', tutor_id: t.id, state: 'queued', scheduled_for: NOW.toISOString() } : { campaign: 'x' })
      assert.ok(write.error, `${role} writes ${table}`)
    }
  }
  const server = await pgliteClient(db, { role: 'service_role' }).from('tutor_announcement_sends').select('tutor_id')
  assert.equal(server.error, null)
  assert.equal(server.data?.length, 1, 'the server key can read')
})

test('migration 030: one row per tutor and campaign, a state from the list only, no long text; deleting a tutor removes their row', async () => {
  const db = await newWorld()
  const t = await tutor(db)
  const ins = (extra = '') => db.query(`insert into public.tutor_announcement_sends (campaign, tutor_id, state, scheduled_for${extra ? ', ' + extra.split('|')[0] : ''}) values ('c', $1, 'queued', now()${extra ? ', ' + extra.split('|')[1] : ''})`, [t.id])
  await ins()
  await assert.rejects(ins(), (e: unknown) => (e as { code?: string }).code === '23505', 'a second row for the same tutor')
  await assert.rejects(db.query(`insert into public.tutor_announcement_sends (campaign, tutor_id, state, scheduled_for) values ('d', $1, 'sent', now())`, [t.id]), (e: unknown) => (e as { code?: string }).code === '23514')
  await assert.rejects(db.query(`insert into public.tutor_announcement_sends (campaign, tutor_id, state, scheduled_for, error) values ('e', $1, 'failed', now(), $2)`, [t.id, 'x'.repeat(101)]), (e: unknown) => (e as { code?: string }).code === '23514')
  await db.query(`delete from public.tutors where id = $1`, [t.id])
  assert.equal((await db.query(`select 1 from public.tutor_announcement_sends`)).rows.length, 0)
})

// ---- 3. who may use it (the routes, on the server) ---------------------------------------------------------------------------------------

const ROUTES: [string, (r: Request) => Promise<Response>, unknown][] = [
  ['/api/admin/announcement/test', testRoute.POST, undefined],
  ['/api/admin/announcement/start', startRoute.POST, { expected: 1 }],
  ['/api/admin/announcement/stop', stopRoute.POST, undefined],
]

test('a visitor who is not signed in gets 401 and a tutor gets 403, from every route; nothing is read, written or sent', async () => {
  const db = await newWorld()
  await many(db, 3)
  await markTested(db)
  const snapshot = JSON.stringify(await sends(db))
  for (const [url, handler, body] of ROUTES) {
    sessionUser = null
    const anon = await handler(post(url, body))
    assert.equal(anon.status, 401, `${url} signed out`)
    sessionUser = TUTOR_USER
    const tutorRes = await handler(post(url, body))
    assert.equal(tutorRes.status, 403, `${url} tutor`)
    assert.deepEqual(await tutorRes.json(), { error: 'Forbidden' })
  }
  assert.equal(outbox.length, 0)
  assert.equal(cancelled.length, 0)
  assert.equal(JSON.stringify(await sends(db)), snapshot)
})

test('even the admin is refused when the request comes from another site (the Origin is not ours)', async () => {
  const db = await newWorld()
  await many(db, 2)
  sessionUser = ADMIN
  for (const [url, handler, body] of ROUTES) {
    const res = await handler(post(url, body, { origin: 'https://evil.example' }))
    assert.equal(res.status, 403, url)
  }
  assert.equal(outbox.length, 0)
})

test('the admin address is read from ADMIN_EMAIL: with it unset nobody is the admin, not even the usual account', async () => {
  const db = await newWorld()
  await many(db, 2)
  const was = process.env.ADMIN_EMAIL
  delete process.env.ADMIN_EMAIL
  try {
    sessionUser = ADMIN
    for (const [url, handler, body] of ROUTES) assert.equal((await handler(post(url, body))).status, 403, url)
  } finally { process.env.ADMIN_EMAIL = was }
  assert.equal(outbox.length, 0)
})

// ---- 4. the test mail --------------------------------------------------------------------------------------------------------------------------

test('"Send me a test" mails ONE message to the address on the admin\'s session, whatever the request says, marked [Test], sent at once', async () => {
  const db = await newWorld()
  const tutors = await many(db, 4)
  sessionUser = ADMIN
  const res = await testRoute.POST(post('/api/admin/announcement/test', { to: tutors[0].email, email: tutors[1].email, recipients: tutors.map(t => t.email) }))
  assert.equal(res.status, 200)
  assert.equal(outbox.length, 1)
  assert.equal(outbox[0].to, ADMIN_EMAIL)
  assert.equal(outbox[0].subject, '[Test] Two minutes to get your Tutafy profile ready for students')
  assert.equal(outbox[0].scheduledAt, undefined, 'a test goes now, not later')
  assert.match(outbox[0].html, /Hi there,/)
  assert.equal(outbox[0].from.endsWith('@tutafy.com>'), true, 'from the site\'s own domain')
  assert.equal(String(outbox[0].replyTo).endsWith('@tutafy.com'), true, 'with a reply address')
  assert.ok(outbox[0].text.includes('New this month'), 'a plain-text copy')
  assert.equal(outbox.some(m => tutors.some(t => m.to === t.email)), false)
  const control = (await db.query<{ test_sent_at: Date | null }>(`select test_sent_at from public.tutor_announcement_control`)).rows
  assert.equal(control.length, 1)
  assert.ok(control[0].test_sent_at)
  assert.equal(JSON.stringify(await res.json()).includes('@'), false)
  assert.deepEqual(await sends(db), [], 'a test queues nobody')
})

test('a test mail is limited to three a minute, and a refused one says so and is not counted as a test', async () => {
  const db = await newWorld()
  sessionUser = { id: randomUUID(), email: ADMIN_EMAIL }
  const codes: number[] = []
  for (let i = 0; i < 4; i += 1) codes.push((await testRoute.POST(post('/api/admin/announcement/test'))).status)
  assert.deepEqual(codes, [200, 200, 200, 429])
  assert.equal(outbox.length, 3)
  await db.exec(`delete from public.tutor_announcement_control`)
  sessionUser = { id: randomUUID(), email: ADMIN_EMAIL }
  sendHook = () => ({ data: null, error: { name: 'validation_error', message: `bad address ${ADMIN_EMAIL}` } })
  const refused = await testRoute.POST(post('/api/admin/announcement/test'))
  assert.equal(refused.status, 502)
  assert.equal(JSON.stringify(await refused.json()).includes('@'), false)
  assert.equal((await db.query(`select 1 from public.tutor_announcement_control`)).rows.length, 0, 'a refused test does not unlock Start')
})

test('/api/admin/announcement/test: at most 3 a minute for one admin session, whatever else the request changes', async () => {
  dbOverride = { from: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }), upsert: async () => ({ error: null }) }) }
  sessionUser = { id: randomUUID(), email: ADMIN_EMAIL }
  const r = await assertRateLimitHolds({
    routeFile: 'app/api/admin/announcement/test/route.ts',
    limiter: 'limiter',
    fixed: [
      { kind: 'header', name: 'origin', reason: 'it must be our own host or the route answers 403 before the limit counts' },
      { kind: 'header', name: 'host', reason: 'the Origin is compared with it' },
    ],
    call: v => testRoute.POST(v.request({ url: 'http://localhost/api/admin/announcement/test', headers: { origin: 'http://localhost', host: 'localhost' } })),
  })
  dbOverride = null
  assert.equal(r.limit, 3)
})

test('the test is not sent when its answer could not be written down (the tables are missing)', async () => {
  await newWorld(false)
  sessionUser = ADMIN
  const res = await testRoute.POST(post('/api/admin/announcement/test'))
  assert.equal(res.status, 503)
  assert.equal(outbox.length, 0)
})

// ---- 5. Start ----------------------------------------------------------------------------------------------------------------------------------

test('Start is refused without a test mail, with an old one, and with the server short of a mail key or an unsubscribe key; nothing is queued or sent', async () => {
  const db = await newWorld()
  await many(db, 3)
  assert.deepEqual(await start(db, 3), { ok: false, why: 'test-first' })
  await markTested(db, new Date(NOW.getTime() - 8 * 24 * 60 * MIN))
  assert.deepEqual(await start(db, 3), { ok: false, why: 'test-first' }, 'a test from 8 days ago is too old')
  await markTested(db)
  assert.deepEqual(await start(db, 3, NOW, { ...ENV, RESEND_API_KEY: '' }), { ok: false, why: 'no-mail-key' })
  assert.deepEqual(await start(db, 3, NOW, { ...ENV, UNSUBSCRIBE_SECRET: '' }), { ok: false, why: 'no-unsubscribe-secret' })
  assert.deepEqual(await start(db, 3, NOW, { ...ENV, UNSUBSCRIBE_SECRET: 'short' }), { ok: false, why: 'no-unsubscribe-secret' })
  assert.equal(outbox.length, 0)
  assert.deepEqual(await sends(db), [])
})

test('Start with the tables missing says so and sends nothing', async () => {
  const db = await newWorld(false)
  await many(db, 2)
  assert.deepEqual(await start(db, 2), { ok: false, why: 'tables-missing' })
  assert.equal(outbox.length, 0)
})

test('Start must be given the number the admin saw: any other number is refused with the real one, and nothing is queued', async () => {
  const db = await newWorld()
  await many(db, 5)
  await markTested(db)
  assert.deepEqual(await start(db, 4), { ok: false, why: 'count-changed', actual: 5 })
  assert.deepEqual(await start(db, 6), { ok: false, why: 'count-changed', actual: 5 })
  assert.equal(outbox.length, 0)
  assert.deepEqual(await sends(db), [])
  // and through the route (which uses the real clock): a number that is not a whole number from 1 to the limit is a 400
  await markTested(db, new Date())
  sessionUser = ADMIN
  for (const bad of [undefined, 0, -1, 2.5, '5', null, rules.MAX_RECIPIENTS + 1]) {
    assert.equal((await startRoute.POST(post('/api/admin/announcement/start', { expected: bad }))).status, 400, String(bad))
  }
  assert.equal((await startRoute.POST(post('/api/admin/announcement/start', { expected: 4 }))).status, 409)
  assert.equal(outbox.length, 0)
})

test('24 eligible tutors among others who are not: exactly the 24 are mailed, once each, at exact three-minute steps, each with an unsubscribe link, and no state holds an address or a name', async () => {
  const db = await newWorld()
  const good = await many(db, 24)
  // who must not be mailed
  await tutor(db, { bio: 'Short.' })
  await tutor(db, { name: 'Test Account' })
  await tutor(db, { active: false })
  await tutor(db, { email: 'not an address' })
  await tutor(db, { name: good[0].name })
  const quiet = await tutor(db)
  await db.query(`insert into public.email_optouts (email) values ($1)`, [quiet.email.toLowerCase()])
  await markTested(db)

  const result = await start(db, 24)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual([result.queued, result.scheduled, result.failed], [24, 24, 0])

  assert.deepEqual(outbox.map(m => m.to).sort(), good.map(t => t.email).sort(), 'exactly the 24, nobody else')
  assert.equal(new Set(outbox.map(m => m.to)).size, 24, 'each address once')
  const times = outbox.map(m => Date.parse(m.scheduledAt!))
  assert.equal(times[0], NOW.getTime() + 90_000)
  for (let i = 1; i < times.length; i += 1) assert.equal(times[i] - times[i - 1], 3 * MIN, `gap ${i}`)
  assert.equal(result.firstAt, new Date(times[0]).toISOString())
  assert.equal(result.lastAt, new Date(times[23]).toISOString())
  for (const m of outbox) {
    assert.equal(m.subject, 'Two minutes to get your Tutafy profile ready for students')
    assert.equal(tokens.verifyUnsubscribeToken(new URL(m.headers!['List-Unsubscribe'].slice(1, -1)).searchParams.get('t')!, ENV), m.to.toLowerCase(), 'the link is for that very address')
    assert.equal(m.headers!['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
    assert.match(m.html, /Hi Ana[a-z]+,/)
    assert.equal(m.from.endsWith('@tutafy.com>'), true)
  }
  assert.equal(new Set(outbox.map(m => m.key)).size, 24, 'one key per tutor for the mail service to recognise a repeat')

  const rows = await sends(db)
  assert.equal(rows.length, 24)
  assert.ok(rows.every(r => r.state === 'scheduled' && typeof r.mail_id === 'string' && r.attempt === 1))
  const stored = JSON.stringify(rows) + JSON.stringify(await db.query(`select * from public.tutor_announcement_control`))
  for (const t of [...good, quiet]) { assert.equal(stored.includes(t.email), false); assert.equal(stored.includes(t.name), false) }
  assert.equal(stored.includes('@'), false, 'no address anywhere in what is stored')
})

test('pressing Start again changes nothing: nobody is queued or mailed twice', async () => {
  const db = await newWorld()
  await many(db, 6)
  await markTested(db)
  assert.equal((await start(db, 6)).ok, true)
  const first = outbox.length
  assert.equal(first, 6)
  assert.deepEqual(await start(db, 6), { ok: false, why: 'nothing' })
  assert.deepEqual(await start(db, 0), { ok: false, why: 'nothing' })
  assert.deepEqual(await start(db, 6, new Date(NOW.getTime() + 10 * MIN)), { ok: false, why: 'nothing' })
  // a tutor who qualifies LATER is a new person: only that one is queued, and three minutes after the last waiting mail
  const late = await tutor(db)
  const r = await start(db, 1, new Date(NOW.getTime() + MIN))
  assert.equal(r.ok, true)
  assert.equal(outbox.length, 7)
  assert.equal(outbox[6].to, late.email)
  assert.equal(Date.parse(outbox[6].scheduledAt!) - Date.parse(outbox[5].scheduledAt!), 3 * MIN, 'still three minutes after the one before')
  assert.equal(new Set(outbox.map(m => m.to)).size, 7)
})

test('two Starts at the very same moment: every tutor is queued once and mailed once', async () => {
  const db = await newWorld()
  await many(db, 8)
  await markTested(db)
  const [a, b, c] = await Promise.all([start(db, 8), start(db, 8), start(db, 8)])
  assert.equal([a, b, c].filter(r => r.ok).length, 1, 'one of them won')
  for (const r of [a, b, c]) if (!r.ok) assert.ok(r.why === 'already-started' || r.why === 'nothing', r.why)
  assert.equal(outbox.length, 8)
  assert.equal(new Set(outbox.map(m => m.to)).size, 8)
  assert.equal((await sends(db)).length, 8)
  const times = outbox.map(m => Date.parse(m.scheduledAt!)).sort((x, y) => x - y)
  for (let i = 1; i < times.length; i += 1) assert.equal(times[i] - times[i - 1], 3 * MIN)
})

test('more tutors than the safety limit: Start refuses and sends nothing', async () => {
  const db = await newWorld()
  await many(db, rules.MAX_RECIPIENTS + 1)
  await markTested(db)
  assert.deepEqual(await start(db, rules.MAX_RECIPIENTS + 1), { ok: false, why: 'too-many', actual: rules.MAX_RECIPIENTS + 1 })
  assert.equal(outbox.length, 0)
})

test('a read that fails stops everything: no list, no mail (the tutor list, the unsubscribed list and the queue are each checked)', async () => {
  const db = await newWorld()
  await many(db, 2)
  await markTested(db)
  for (const broken of ['tutors', 'email_optouts', 'tutor_announcement_sends']) {
    const real = dbOf(db)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const failing: any = new Proxy({}, { get: (_t, prop) => (prop === 'then' ? (done: (v: unknown) => void) => done({ data: null, error: { code: 'XX000', message: 'boom' } }) : () => failing) })
    const faulty = { from: (table: string) => (table === broken ? failing : real.from(table)) }
    const out = await run.startAnnouncement({ db: faulty, mailer: mailerOf(), expected: 2, now: NOW, env: ENV, sleep: noSleep })
    assert.equal(out.ok, false, broken)
  }
  assert.equal(outbox.length, 0)
})

test('a mail the service refuses is a failed row with only the error NAME; the others still go; the next Start retries only the failed one, with a new key', async () => {
  const db = await newWorld()
  const t = await many(db, 4)
  await markTested(db)
  sendHook = (m, n) => (m.to === t[1].email ? { data: null, error: { name: 'rate_limit_exceeded', message: `cannot send to ${m.to}` } } : { data: { id: `mail_${n}` }, error: null })
  const r = await start(db, 4)
  assert.deepEqual(r.ok && [r.queued, r.scheduled, r.failed], [4, 3, 1])
  const rows = await sends(db)
  const failed = rows.filter(x => x.state === 'failed')
  assert.equal(failed.length, 1)
  assert.equal(failed[0].error, 'rate_limit_exceeded')
  assert.equal(failed[0].tutor_id, t[1].id)
  assert.equal(JSON.stringify(rows).includes('@'), false, 'the service\'s message (it holds an address) is never kept')

  sendHook = (_m, n) => ({ data: { id: `again_${n}` }, error: null })
  const keyBefore = outbox.find(m => m.to === t[1].email)!.key
  const retry = await start(db, 1, new Date(NOW.getTime() + 5 * MIN))
  assert.deepEqual(retry.ok && [retry.queued, retry.scheduled, retry.failed], [1, 1, 0])
  // the mails already waiting go at +7.5 and +10.5 minutes, so the retry goes three minutes after the last of them, not sooner
  assert.equal(retry.ok && retry.firstAt, new Date(NOW.getTime() + 13.5 * MIN).toISOString())
  assert.equal(outbox.filter(m => m.to === t[1].email).length, 2, 'the failed one was tried again')
  assert.equal(outbox.filter(m => m.to !== t[1].email).length, 3, 'the others were not touched')
  assert.notEqual(outbox[outbox.length - 1].key, keyBefore)
  const after = await sends(db)
  assert.ok(after.every(x => x.state === 'scheduled'))
  assert.equal(after.find(x => x.tutor_id === t[1].id)!.attempt, 2)
})

test('the mail service throwing (not answering) is a failed row too, not a crash', async () => {
  const db = await newWorld()
  await many(db, 2)
  await markTested(db)
  sendHook = () => { throw new Error('network down') }
  const r = await start(db, 2)
  assert.deepEqual(r.ok && [r.queued, r.scheduled, r.failed], [2, 0, 2])
  assert.deepEqual((await sends(db)).map(x => x.error), ['mail_service_unreachable', 'mail_service_unreachable'])
})

// ---- 6. Stop -----------------------------------------------------------------------------------------------------------------------------------

test('Stop takes back every mail that has not gone, leaves the ones whose time has passed, and Start after Stop queues only the ones taken back', async () => {
  const db = await newWorld()
  const t = await many(db, 6)
  await markTested(db)
  assert.equal((await start(db, 6)).ok, true)
  // 7 minutes after Start: mails 0, 1 and 2 (at 1.5, 4.5 and 7.5 min) -> only 0 and 1 have gone
  const stopAt = new Date(NOW.getTime() + 7 * MIN)
  const out = await stop(db, stopAt)
  assert.deepEqual(out, { ok: true, cancelled: 4, alreadyGone: 2, notCancelled: 0 })
  assert.equal(cancelled.length, 4, 'the service was asked to take back four mails, not six')
  const ids = new Set(cancelled)
  const rows = await sends(db)
  assert.deepEqual(rows.map(r => r.state), ['scheduled', 'scheduled', 'cancelled', 'cancelled', 'cancelled', 'cancelled'])
  assert.deepEqual(rows.filter(r => r.state === 'cancelled').map(r => ids.has(r.mail_id as string)), [true, true, true, true])
  const status = await run.loadAnnouncementStatus(dbOf(db), ENV, stopAt)
  assert.deepEqual(status.counts, { queued: 0, waiting: 0, gone: 2, cancelled: 4, failed: 0 })
  assert.equal(Date.parse(status.stoppedAt!), stopAt.getTime())
  assert.equal(status.toQueue, 4)

  // Start again: the two that have gone are not mailed again; the four taken back are queued with a new attempt
  const before = outbox.length
  assert.equal((await start(db, 4, new Date(NOW.getTime() + 20 * MIN))).ok, true)
  assert.equal(outbox.length - before, 4)
  assert.deepEqual(outbox.slice(before).map(m => m.to).sort(), [t[2], t[3], t[4], t[5]].map(x => x.email).sort())
  assert.equal(new Set(outbox.map(m => m.to)).size, 6)
  assert.ok(outbox.slice(before).every((m, i, a) => i === 0 || Date.parse(m.scheduledAt!) - Date.parse(a[i - 1].scheduledAt!) === 3 * MIN))
})

test('Stop when the service cannot take a mail back: that mail stays "waiting" and is counted, so Stop can be pressed again', async () => {
  const db = await newWorld()
  await many(db, 4)
  await markTested(db)
  await start(db, 4)
  let calls = 0
  cancelHook = () => (++calls === 2 ? { data: null, error: { name: 'invalid_access', message: 'no' } } : { data: {}, error: null })
  assert.deepEqual(await stop(db, NOW), { ok: true, cancelled: 3, alreadyGone: 0, notCancelled: 1 })
  assert.deepEqual((await sends(db)).map(r => r.state).sort(), ['cancelled', 'cancelled', 'cancelled', 'scheduled'])
  cancelHook = () => ({ data: {}, error: null })
  assert.deepEqual(await stop(db, NOW), { ok: true, cancelled: 1, alreadyGone: 0, notCancelled: 0 })
  assert.ok((await sends(db)).every(r => r.state === 'cancelled'))
})

test('Stop pressed while Start is still handing mails over: the rest are not handed over, and a mail handed over at that very moment is taken back', async () => {
  const db = await newWorld()
  await many(db, 6)
  await markTested(db)
  let stopped = false
  sendHook = (_m, n) => {
    if (n === 3 && !stopped) {
      stopped = true
      // Stop arrives (its own call, in the middle of the third hand-over)
      void stop(db, new Date(NOW.getTime() + 1))
    }
    return { data: { id: `mail_${n}` }, error: null }
  }
  const real = run.startAnnouncement({ db: dbOf(db), mailer: mailerOf(), expected: 6, now: NOW, env: ENV, sleep: async () => { await new Promise(r => setTimeout(r, 20)) } })
  await real
  await new Promise(r => setTimeout(r, 100))
  assert.equal(outbox.length, 3, 'the third mail was the last one handed over')
  const rows = await sends(db)
  assert.equal(rows.length, 6)
  assert.ok(rows.every(r => r.state === 'cancelled'), 'nothing is left queued or waiting: ' + rows.map(r => r.state).join(','))
  assert.deepEqual([...new Set(cancelled)].sort(), ['mail_1', 'mail_2', 'mail_3'], 'every mail that was handed over was taken back')
  assert.equal(new Set(outbox.map(m => m.to)).size, 3, 'nobody twice')
})

// ---- 7. the routes, end to end -----------------------------------------------------------------------------------------------------------

test('the admin\'s three buttons through the real routes: test, Start with the right number, Stop; the answers hold numbers and times only', async () => {
  const db = await newWorld()
  const t = await many(db, 3)
  sessionUser = ADMIN
  assert.equal((await testRoute.POST(post('/api/admin/announcement/test'))).status, 200)
  assert.equal((await startRoute.POST(post('/api/admin/announcement/start', { expected: 2 }))).status, 409)
  const go = await startRoute.POST(post('/api/admin/announcement/start', { expected: 3 }))
  assert.equal(go.status, 200)
  const goBody = await go.json() as Record<string, unknown>
  assert.equal(goBody.queued, 3)
  assert.equal(outbox.filter(m => t.some(x => x.email === m.to)).length, 3)
  const again = await startRoute.POST(post('/api/admin/announcement/start', { expected: 3 }))
  assert.equal(again.status, 409)
  assert.equal(outbox.filter(m => t.some(x => x.email === m.to)).length, 3, 'pressing again sent nothing')
  const halt = await stopRoute.POST(post('/api/admin/announcement/stop'))
  assert.equal(halt.status, 200)
  const haltBody = await halt.json() as Record<string, unknown>
  assert.equal((haltBody.cancelled as number) + (haltBody.alreadyGone as number), 3)
  for (const body of [goBody, haltBody, await again.json()]) assert.equal(JSON.stringify(body).includes('@'), false)
})

// ---- 8. the page ---------------------------------------------------------------------------------------------------------------------------

test('the page: a tutor and a visitor are sent away before anything is read; the admin sees the setup, the buttons and the numbers, and NO name or address', async () => {
  const db = await newWorld()
  const good = await many(db, 3)
  await markTested(db)
  sessionUser = TUTOR_USER
  await assert.rejects(AnnouncementPage(), /NEXT_REDIRECT:\/dashboard/)
  sessionUser = null
  await assert.rejects(AnnouncementPage(), /NEXT_REDIRECT:\/login/)

  sessionUser = ADMIN
  process.env.ADMIN_EMAIL = ADMIN_EMAIL
  const before = renderToStaticMarkup(await AnnouncementPage())
  assert.match(before, /data-testid="send-test"/)
  assert.match(before, /data-testid="start"/)
  assert.match(before, /data-testid="stop"/)
  assert.match(before, /3 tutors are waiting for this letter/)
  assert.match(before, /Nothing queued yet/)

  await start(db, 3)
  const after = renderToStaticMarkup(await AnnouncementPage())
  assert.match(after, /data-testid="count-waiting"[^>]*>3</)
  assert.match(after, /data-row="3"/)
  assert.match(after, /Nobody is waiting for this letter/)
  for (const html of [before, after]) {
    for (const t of good) { assert.equal(html.includes(t.email), false); assert.equal(html.includes(t.name), false) }
    assert.equal(html.includes(ADMIN_EMAIL), false)
  }
  setAdminLang('vi')
  assert.match(renderToStaticMarkup(createElement(AdminLangProvider, { lang: 'vi' }, await AnnouncementPage())), /Thư thử cho tôi/)
  assert.deepEqual(redirects, ['/dashboard', '/login'])
})

test('the page says what is missing instead of failing: no tables, no mail key, no unsubscribe key', async () => {
  await newWorld(false)
  delete process.env.RESEND_API_KEY
  delete process.env.UNSUBSCRIBE_SECRET
  sessionUser = ADMIN
  const html = renderToStaticMarkup(await AnnouncementPage())
  assert.equal((html.match(/>Missing</g) ?? []).length, 3)
  assert.match(html, /data-testid="send-test"[^>]*disabled/)
})

// ---- 9. the code itself --------------------------------------------------------------------------------------------------------------------

test('every route checks the admin first, on the server, before it reads the request or the database; none of the new files logs or holds an address', () => {
  for (const name of ['test', 'start', 'stop']) {
    const src = readFileSync(path.join(SRC, `app/api/admin/announcement/${name}/route.ts`), 'utf8')
    const gate = src.indexOf('adminApiGate()')
    assert.ok(gate > 0, `${name} calls the admin gate`)
    for (const later of ['request.json', 'createAdminClient()', 'realMailer()', 'await sendTestMail(', 'await startAnnouncement(', 'await stopAnnouncement(', 'sameOriginGate(request)']) {
      const at = src.indexOf(later)
      if (at >= 0) assert.ok(at > gate, `${name}: ${later} comes after the gate`)
    }
    assert.match(src, /sameOriginGate\(request\)/, `${name} checks the Origin`)
  }
  const page = readFileSync(path.join(SRC, 'app/(admin)/super-admin/announcement/page.tsx'), 'utf8')
  assert.ok(page.indexOf('await requireAdminPage()') < page.indexOf('createAdminClient()'), 'the page checks the admin before it reads')
  const files = ['lib/tutor-announcement.ts', 'lib/tutor-announcement-run.ts', 'app/(admin)/super-admin/announcement/page.tsx', 'app/(admin)/super-admin/announcement/AnnouncementControls.tsx', ...['test', 'start', 'stop'].map(n => `app/api/admin/announcement/${n}/route.ts`), '../supabase/migrations/030_tutor_announcement.sql']
  for (const f of files) {
    const src = readFileSync(path.join(SRC, f), 'utf8')
    assert.doesNotMatch(src, /console\.(log|info|warn|error|debug)/, `${f} logs nothing`)
    assert.doesNotMatch(src, /[A-Za-z0-9._%+-]+@(?!tutafy\.com)[A-Za-z0-9-]+\.[A-Za-z]{2,}/, `${f} holds no email address`)
    assert.doesNotMatch(src, /\bdebugger\b|\bTODO\b/, `${f} has no leftovers`)
  }
})

test('the schedule is the mail service\'s, not a cron: vercel.json gains no job for this (the project\'s hosting runs jobs once a day)', () => {
  const cfg = JSON.parse(readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')) as { crons: { path: string; schedule: string }[] }
  assert.equal(cfg.crons.some(c => /announcement/.test(c.path)), false)
  assert.equal(cfg.crons.every(c => /^\d+ \d+ [\d*]+ \* [\d*]+$/.test(c.schedule)), true, 'every existing job still runs at most once a day')
})
