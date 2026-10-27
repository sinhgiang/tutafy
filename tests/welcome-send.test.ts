// T-0737: the welcome series is BUILT but OFF. These tests run the real code (the switches, the signed unsubscribe link, the daily run, the
// unsubscribe route and page, the day-0 mail at sign-up, the register route) against a real Postgres built from the migrations (PGlite), with the
// mail service replaced by a recorder, so NOTHING is ever sent and no real address is read. They prove what the owner asked for:
//   - both switches are off by default, and with them off nothing is read and nothing is sent;
//   - dry-run only counts: no address in the answer, no call to the mail service, nothing written;
//   - the 723 tutors who signed up before the start date are never sent anything, on any day;
//   - a step goes at most once (claimed first), at most 50 mails a run, a refusal frees the claim;
//   - an unsubscribed or made-up address, or a tutor with a lesson, is not mailed; nobody is mailed without a working unsubscribe link;
//   - the unsubscribe link cannot be forged, opening it changes nothing, only the button (POST) does, and it unsubscribes only its own address.
import { test, mock, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import { renderToStaticMarkup } from 'react-dom/server'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb, readMigration } from './support/local-db.ts'
import { pgliteClient } from './support/pglite-client.ts'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const MIGRATION = '023_welcome_emails.sql'

// ---- doubles: the database the routes see, the signed-in session, and the mail service (a recorder) -----------------------------------
type Sent = { to: string; subject: string; html: string; text: string; headers?: Record<string, string>; from: string; replyTo: unknown }
let adminClient: () => unknown = () => { throw new Error('the database was used when it should not have been') }
let sessionUser: { id: string; email: string } | null = null
const mailbox: Sent[] = []
let mailService: (m: Sent) => unknown = () => ({ data: { id: 'x' }, error: null })

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createAdminClient: () => adminClient(),
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: sessionUser } }) } }),
  },
})
mock.module('resend', { exports: { Resend: class { emails = { send: async (m: Sent) => { mailbox.push(m); return mailService(m) } } } } })

const send = await import('@/lib/welcome-send.ts')
const tokens = await import('@/lib/unsubscribe-token.ts')
const { emailFrom, emailReplyTo } = await import('@/lib/email-config.ts')
const { resendSender } = await import('@/lib/welcome-mailer.ts')
const cronRoute = await import('@/app/api/cron/welcome-series/route.ts')
const unsubscribeRoute = await import('@/app/api/unsubscribe/route.ts')
const registerRoute = await import('@/app/api/auth/register/route.ts')
const { default: UnsubscribePage } = await import('@/app/unsubscribe/page.tsx')
const { NextRequest } = await import('next/server.js')

// ---- a throwaway Postgres built from the migration files, with the new tables -------------------------------------------------------------
const DAY = 86_400_000
const START = new Date('2026-11-01T00:00:00Z')
const at = (days: number) => new Date(START.getTime() + days * DAY)
const SECRET = 'a-long-test-secret-that-is-not-real-0123456789'
const LIVE = { WELCOME_EMAILS_START: '2026-11-01', WELCOME_EMAILS_SEND: 'true', UNSUBSCRIBE_SECRET: SECRET }
const DRY = { WELCOME_EMAILS_START: '2026-11-01', UNSUBSCRIBE_SECRET: SECRET }

async function newWorld(applyNewTables = true): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, MIGRATION)
  if (applyNewTables) await db.exec(readMigration(MIGRATION))
  return db
}
let nth = 0
/** One tutor who signed up `days` after the start date. */
async function tutor(db: PGlite, days: number, over: { email?: string; name?: string } = {}) {
  const id = randomUUID()
  const email = over.email ?? `tutor${++nth}@school.example`
  await db.exec(`
    insert into auth.users (id, email) values ('${id}', '${email}');
    insert into public.tutors (id, email, name, slug, created_at) values ('${id}', '${email}', '${over.name ?? 'Maria Santos'}', 'tutor-${id}','${at(days).toISOString()}');
  `)
  return { id, email }
}
async function lesson(db: PGlite, tutorId: string) {
  const student = randomUUID()
  await db.exec(`
    insert into public.students (id, tutor_id, name, email) values ('${student}', '${tutorId}', 'A Student', 'student${++nth}@school.example');
    insert into public.lessons (tutor_id, student_id, starts_at, ends_at) values ('${tutorId}', '${student}', '${at(30).toISOString()}', '${at(30.04).toISOString()}');
  `)
}
const rows = async (db: PGlite, table: string) => (await db.query<Record<string, unknown>>(`select * from public.${table} order by 1, 2`)).rows
const recorder = (): { send: import('@/lib/welcome-send.ts').SendMail; mails: import('@/lib/welcome-send.ts').OutgoingMail[] } => {
  const mails: import('@/lib/welcome-send.ts').OutgoingMail[] = []
  return { mails, send: async m => { mails.push(m); return { ok: true } } }
}
const run = (db: PGlite, s: import('@/lib/welcome-send.ts').SendMail, now: Date, env = LIVE) => send.runWelcomeSeries({ db: pgliteClient(db), send: s, now, env })

// ---- the process environment: every test starts with NONE of the series' variables set, which is how it ships ----------------------------
const VARS = ['WELCOME_EMAILS_START', 'WELCOME_EMAILS_SEND', 'UNSUBSCRIBE_SECRET', 'CRON_SECRET', 'RESEND_API_KEY', 'STUDENT_AUTH_SECRET']
const saved: Record<string, string | undefined> = {}
beforeEach(() => {
  for (const v of VARS) { saved[v] = process.env[v]; delete process.env[v] }
  mailbox.length = 0
  mailService = () => ({ data: { id: 'x' }, error: null })
  sessionUser = null
  adminClient = () => { throw new Error('the database was used when it should not have been') }
})
afterEach(() => { for (const v of VARS) { if (saved[v] === undefined) delete process.env[v]; else process.env[v] = saved[v] } })

// ---- 1. the switches ----------------------------------------------------------------------------------------------------------------------

test('the switches: nothing set is OFF; a date alone is a dry run; both switches and the unsubscribe key together are live; anything less than exactly "true" is not on', () => {
  const mode = (env: Record<string, string | undefined>) => send.welcomeMode(env)
  assert.deepEqual(mode({}), { kind: 'off' })
  assert.deepEqual(mode({ WELCOME_EMAILS_SEND: 'true', UNSUBSCRIBE_SECRET: SECRET }), { kind: 'off' }, 'SEND with no start date is still off')
  for (const bad of ['', '   ', 'tomorrow', '2026-13-45', '01/11/2026', '2026-11', '20261101', '2026-11-01; drop table', 'null']) {
    assert.deepEqual(mode({ WELCOME_EMAILS_START: bad, WELCOME_EMAILS_SEND: 'true', UNSUBSCRIBE_SECRET: SECRET }), { kind: 'off' }, `start "${bad}"`)
  }
  assert.deepEqual(mode(DRY), { kind: 'dry-run', startsAt: START, why: 'send-switch-off' })
  for (const notTrue of ['TRUE', 'True', '1', 'yes', 'on', 'false', 'true ;', ' ', '']) {
    const m = mode({ ...DRY, WELCOME_EMAILS_SEND: notTrue })
    assert.equal(m.kind, notTrue.trim() === 'true' ? 'live' : 'dry-run', `SEND "${notTrue}"`)
  }
  assert.deepEqual(mode({ ...DRY, WELCOME_EMAILS_SEND: 'true' }), { kind: 'live', startsAt: START })
  assert.deepEqual(mode({ ...DRY, WELCOME_EMAILS_START: '2026-11-01T09:30:00Z', WELCOME_EMAILS_SEND: 'true' }), { kind: 'live', startsAt: new Date('2026-11-01T09:30:00Z') })
})

test('no unsubscribe key means no mail: both switches on but the key missing, blank or too short stays a dry run; the other secrets are not borrowed', () => {
  const both = { WELCOME_EMAILS_START: '2026-11-01', WELCOME_EMAILS_SEND: 'true' }
  for (const env of [{}, { UNSUBSCRIBE_SECRET: '' }, { UNSUBSCRIBE_SECRET: 'short' }, { STUDENT_AUTH_SECRET: SECRET, CRON_SECRET: SECRET }]) {
    assert.deepEqual(send.welcomeMode({ ...both, ...env }), { kind: 'dry-run', startsAt: START, why: 'no-unsubscribe-secret' }, JSON.stringify(Object.keys(env)))
  }
})

test('as shipped (no variable set in the process) the series is off', () => {
  assert.deepEqual(send.welcomeMode(), { kind: 'off' })
  const sources = ['src/lib/welcome-send.ts', 'src/app/api/cron/welcome-series/route.ts'].map(f => readFileSync(path.join(ROOT, f), 'utf8')).join('\n')
    .split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')
  assert.doesNotMatch(sources, /WELCOME_EMAILS_(START|SEND)['"]?\s*[:=]\s*['"]/, 'no switch value is written in the code')
  for (const file of ['vercel.json', '.env.example', 'README.md']) {
    try { assert.doesNotMatch(readFileSync(path.join(ROOT, file), 'utf8'), /WELCOME_EMAILS_SEND\s*=\s*true/, `${file} does not switch it on`) } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e }
  }
})

// ---- 2. the unsubscribe link ----------------------------------------------------------------------------------------------------------------

test('a token is the address signed with UNSUBSCRIBE_SECRET: it verifies to that address (lower case), and nothing else verifies', () => {
  const env = { UNSUBSCRIBE_SECRET: SECRET }
  const t = tokens.signUnsubscribeToken('  Maria.Santos@School.Example ', env)!
  assert.ok(t && /^[A-Za-z0-9_-]+$/.test(t), 'url-safe')
  assert.equal(tokens.verifyUnsubscribeToken(t, env), 'maria.santos@school.example')
  // changed address, changed signature, another key, garbage
  const [email, sig] = [Buffer.from(t, 'base64url').toString().replace(/:[0-9a-f]+$/, ''), Buffer.from(t, 'base64url').toString().split(':').pop()!]
  const forge = (s: string) => Buffer.from(s).toString('base64url')
  assert.equal(tokens.verifyUnsubscribeToken(forge(`victim@school.example:${sig}`), env), null, 'the signature of one address does not carry to another')
  assert.equal(tokens.verifyUnsubscribeToken(forge(`${email}:${'0'.repeat(64)}`), env), null)
  assert.equal(tokens.verifyUnsubscribeToken(forge(`${email}:${sig.slice(0, -1)}0`), env), null)
  assert.equal(tokens.verifyUnsubscribeToken(t, { UNSUBSCRIBE_SECRET: 'another-secret-another-secret-123' }), null)
  assert.equal(tokens.verifyUnsubscribeToken(forge(`Maria.Santos@School.Example:${sig}`), env), null, 'an upper-case address was never signed')
  for (const junk of ['', 'abc', '!!!', forge('no colon at all'), forge(':'), forge('@:' + sig), 'x'.repeat(5000)]) assert.equal(tokens.verifyUnsubscribeToken(junk, env), null, junk.slice(0, 20))
})

test('with no key nothing is signed and nothing is accepted; CRON_SECRET and STUDENT_AUTH_SECRET are never used instead', () => {
  assert.equal(tokens.signUnsubscribeToken('a@school.example', {}), null)
  assert.equal(tokens.signUnsubscribeToken('a@school.example', { CRON_SECRET: SECRET, STUDENT_AUTH_SECRET: SECRET }), null)
  const t = tokens.signUnsubscribeToken('a@school.example', { UNSUBSCRIBE_SECRET: SECRET })!
  assert.equal(tokens.verifyUnsubscribeToken(t, {}), null)
  assert.equal(tokens.verifyUnsubscribeToken(t, { STUDENT_AUTH_SECRET: SECRET, CRON_SECRET: SECRET }), null)
  assert.equal(tokens.signUnsubscribeToken('not an address', { UNSUBSCRIBE_SECRET: SECRET }), null)
})

test('every mail carries the signed link in its body and the one-click headers, for the right address', () => {
  const built = send.buildOutgoing('nudge', { email: 'Maria@School.Example', name: 'Maria Santos', slug: 'maria-santos-ab12' }, LIVE)!
  const token = new URL(built.out.headers['List-Unsubscribe'].slice(1, -1)).searchParams.get('t')!
  assert.equal(tokens.verifyUnsubscribeToken(token, LIVE), 'maria@school.example')
  assert.equal(built.out.headers['List-Unsubscribe'], `<https://www.tutafy.com/api/unsubscribe?t=${token}>`)
  assert.equal(built.out.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
  assert.ok(built.out.html.includes(`href="https://www.tutafy.com/unsubscribe?t=${token}"`))
  assert.equal(built.out.to, 'Maria@School.Example')
  assert.equal(send.buildOutgoing('nudge', { email: 'a@school.example', name: null, slug: null }, { WELCOME_EMAILS_START: '2026-11-01' }), null, 'no key, no mail')
})

// ---- 3. the daily run -------------------------------------------------------------------------------------------------------------------------

test('OFF: the run reads nothing and sends nothing (the database is not even asked)', async () => {
  const r = recorder()
  const report = await send.runWelcomeSeries({ db: { from: () => { throw new Error('read while off') } }, send: r.send, now: at(3), env: {} })
  assert.deepEqual(report, { mode: 'off' })
  assert.equal(r.mails.length, 0)
})

test('DRY RUN: it counts what it would send per step, the answer holds no address, the mail service is never called, and nothing is written', async () => {
  const db = await newWorld()
  const a = await tutor(db, 0.2), b = await tutor(db, 0.3); await tutor(db, 0.4)
  const optedOut = await tutor(db, 0.5, { email: 'quiet@school.example' })
  const withLesson = await tutor(db, 0.6); await lesson(db, withLesson.id)
  await tutor(db, 0.7, { email: 'fake@example.com' })
  await db.exec(`insert into public.email_optouts (email) values ('quiet@school.example')`)
  void a; void b; void optedOut
  const r = recorder()
  // day 2.8: the six above are 2.1 to 2.6 days old (all due the nudge, minus the opted-out, the one with a lesson and the made-up address)
  const report = await run(db, r.send, at(2.9), DRY)
  assert.equal(report.mode, 'dry-run')
  assert.deepEqual((report as { byStep: unknown }).byStep, { nudge: 3, checkin: 0 })
  assert.equal((report as { total: number }).total, 3)
  assert.equal(JSON.stringify(report).includes('@'), false, 'no address in the answer')
  assert.equal(r.mails.length, 0, 'the mail service is not called')
  assert.deepEqual(await rows(db, 'welcome_email_sends'), [], 'nothing is claimed in a dry run')
  // and later, day 7.6: the same tutors are due the check-in instead
  const later = await run(db, r.send, at(7.9), DRY)
  assert.deepEqual((later as { byStep: unknown }).byStep, { nudge: 0, checkin: 3 })
})

test('LIVE: it sends the nudge on day 2 and the check-in on day 7 to a tutor with no lesson, once each, with the unsubscribe headers; the welcome is not its job', async () => {
  const db = await newWorld()
  const t = await tutor(db, 0.1, { email: 'maria@school.example', name: 'Maria Santos' })
  const r = recorder()
  assert.equal((await run(db, r.send, at(0.5))).mode, 'live')
  assert.equal(r.mails.length, 0, 'day 0: the welcome goes at sign-up, not from the daily run (and it is under two days old)')
  assert.equal((await run(db, r.send, at(1.5))).total, 0)
  const day2 = await run(db, r.send, at(2.2)) as { byStep: unknown; total: number }
  assert.deepEqual(day2.byStep, { nudge: 1, checkin: 0 })
  assert.equal(r.mails[0].subject, 'Your Tutafy page is ready. Have you sent the link?')
  assert.equal(r.mails[0].to, 'maria@school.example')
  assert.ok(r.mails[0].html.includes('Hi Maria,'))
  assert.equal(r.mails[0].headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
  assert.deepEqual((await rows(db, 'welcome_email_sends')).map(x => [x.tutor_id, x.step]), [[t.id, 'nudge']])
  // the same day again, and the days between: nothing more
  assert.equal((await run(db, r.send, at(2.3))).total, 0)
  assert.equal((await run(db, r.send, at(5))).total, 0)
  const day7 = await run(db, r.send, at(7.2)) as { byStep: unknown }
  assert.deepEqual(day7.byStep, { nudge: 0, checkin: 1 })
  assert.equal(r.mails[1].subject, 'What got in the way?')
  assert.equal((await run(db, r.send, at(8))).total, 0)
  assert.equal((await run(db, r.send, at(30))).total, 0)
  assert.equal(r.mails.length, 2)
})

test('a double run (two servers at the same moment) sends each step once, because the claim is taken before the mail goes', async () => {
  const db = await newWorld()
  for (let i = 0; i < 6; i++) await tutor(db, 0.1)
  const r = recorder()
  const reports = await Promise.all([run(db, r.send, at(2.2)), run(db, r.send, at(2.2)), run(db, r.send, at(2.2))])
  assert.equal(r.mails.length, 6, 'six tutors, six mails, not eighteen')
  assert.equal(new Set(r.mails.map(m => m.to)).size, 6)
  assert.equal(reports.reduce((n, x) => n + (x as { total: number }).total, 0), 6)
  assert.equal((await rows(db, 'welcome_email_sends')).length, 6)
})

test('at most 50 mails in one run; the rest go in the next run while they are still inside their window; nobody gets two', async () => {
  const db = await newWorld()
  for (let i = 0; i < 80; i++) await tutor(db, 0.1)
  const r = recorder()
  const first = await run(db, r.send, at(2.3)) as { total: number; overCap: number }
  assert.deepEqual([first.total, first.overCap, r.mails.length], [50, 30, 50])
  const second = await run(db, r.send, at(2.4)) as { total: number; overCap: number }
  assert.deepEqual([second.total, second.overCap, r.mails.length], [30, 0, 80])
  assert.equal(new Set(r.mails.map(m => m.to)).size, 80)
  assert.equal((await run(db, r.send, at(2.5))).mode, 'live')
  assert.equal(r.mails.length, 80)
  assert.equal(send.MAX_MAILS_PER_RUN, 50)
})

test('a dry run respects the same cap: it reports 50, not 80', async () => {
  const db = await newWorld()
  for (let i = 0; i < 80; i++) await tutor(db, 0.1)
  const report = await run(db, recorder().send, at(2.3), DRY) as { total: number; overCap: number }
  assert.deepEqual([report.total, report.overCap], [50, 30])
})

test('THE 723: tutors who signed up before the start date are never mailed, on any day, even with the switches on; new ones are', async () => {
  const db = await newWorld()
  await db.exec(`
    with n as (select gen_random_uuid() as id, g from generate_series(1, 723) as g),
    u as (insert into auth.users (id, email) select id, 'old' || g || '@school.example' from n returning id)
    insert into public.tutors (id, email, name, slug, created_at)
    select id, 'old' || g || '@school.example', 'Old ' || g, 'old-' || g,
           timestamptz '${START.toISOString()}' - ((1 + (g % 400)) || ' days')::interval - (g || ' seconds')::interval from n
  `)
  assert.equal(Number((await db.query<{ n: string }>('select count(*) as n from public.tutors')).rows[0].n), 723)
  const fresh = await tutor(db, 0.2, { email: 'new@school.example' })
  const r = recorder()
  for (let day = -5; day <= 30; day += 0.5) await run(db, r.send, at(day))
  assert.deepEqual(r.mails.map(m => m.to).sort(), ['new@school.example', 'new@school.example'], 'only the new tutor: the nudge and the check-in, once each')
  assert.deepEqual((await rows(db, 'welcome_email_sends')).map(x => x.tutor_id), [fresh.id, fresh.id])
  assert.equal(r.mails.filter(m => /old\d+@/.test(m.to)).length, 0)
  // the one and only read of tutors has a lower bound that is never before the start date
  const bounds: string[] = []
  const spy = { from: (t: string) => { const q = pgliteClient(db).from(t); if (t !== 'tutors') return q; return new Proxy(q, { get: (o, k, rx) => k === 'gte' ? (c: string, v: string) => { bounds.push(v); return o.gte(c, v) } : Reflect.get(o, k, rx) }) } }
  await send.runWelcomeSeries({ db: spy, send: r.send, now: at(20), env: LIVE })
  assert.ok(bounds.length === 1 && Date.parse(bounds[0]) >= START.getTime(), `lower bound ${bounds[0]}`)
})

test('an address that unsubscribed (in any letter case), a made-up address and a tutor with a lesson are skipped; the others in the same run are not', async () => {
  const db = await newWorld()
  await tutor(db, 0.1, { email: 'Quiet.Person@School.Example' })
  await tutor(db, 0.1, { email: 'x@example.com' }); await tutor(db, 0.1, { email: 'x@mail.test' }); await tutor(db, 0.1, { email: 'broken address' })
  const busy = await tutor(db, 0.1); await lesson(db, busy.id)
  const ok = await tutor(db, 0.1, { email: 'ok@school.example' })
  await db.exec(`insert into public.email_optouts (email) values ('quiet.person@school.example')`)
  const r = recorder()
  await run(db, r.send, at(2.3))
  assert.deepEqual(r.mails.map(m => m.to), ['ok@school.example'])
  assert.deepEqual((await rows(db, 'welcome_email_sends')).map(x => x.tutor_id), [ok.id])
})

test('if the mail service refuses (or throws), the claim is given back, nothing is lost, and the next run tries again inside the window', async () => {
  const db = await newWorld()
  await tutor(db, 0.1, { email: 'a@school.example' }); await tutor(db, 0.1, { email: 'b@school.example' })
  const seen: string[] = []
  const flaky: import('@/lib/welcome-send.ts').SendMail = async m => { seen.push(m.to); if (m.to === 'a@school.example') throw new Error('boom'); return { ok: false } }
  const bad = await run(db, flaky, at(2.2)) as { failed: number; total: number }
  assert.deepEqual([bad.failed, bad.total], [2, 0])
  assert.deepEqual(await rows(db, 'welcome_email_sends'), [], 'both claims were given back')
  const r = recorder()
  assert.equal(((await run(db, r.send, at(3.2))) as { total: number }).total, 2)
  assert.equal(r.mails.length, 2)
  // and through the real mailer path: a refusal from the service is { error }, not a thrown error
  mailService = () => ({ data: null, error: { name: 'validation_error', message: 'no' } })
  process.env.RESEND_API_KEY = 're_test_key_for_tests'
  assert.deepEqual(await resendSender()({ to: 'a@school.example', subject: 's', html: '<p>x</p>', headers: {} }), { ok: false })
  mailService = () => ({ data: { id: '1' }, error: null })
  assert.deepEqual(await resendSender()({ to: 'a@school.example', subject: 's', html: '<p>x</p>', headers: { 'List-Unsubscribe': '<u>' } }), { ok: true })
  assert.equal(mailbox.at(-1)!.headers?.['List-Unsubscribe'], '<u>', 'the headers reach the mail service')
  assert.equal(mailbox.at(-1)!.from, emailFrom('general'))
})

test('it fails closed: when the tables are not there yet (migration not run) or a read fails, it sends nothing and says so', async () => {
  const db = await newWorld(false)
  await tutor(db, 0.1)
  const r = recorder()
  const live = await run(db, r.send, at(2.3)) as { failed: number; total: number }
  assert.deepEqual([live.failed >= 1, live.total, r.mails.length], [true, 0, 0])
  const dry = await run(db, r.send, at(2.3), DRY) as { failed: number; total: number }
  assert.deepEqual([dry.failed >= 1, dry.total], [true, 0], 'a dry run before the migration tells the owner something is missing')
})

// ---- 4. the cron route ----------------------------------------------------------------------------------------------------------------------

const cron = (auth?: string) => cronRoute.GET(new Request('https://www.tutafy.com/api/cron/welcome-series', { headers: auth ? { authorization: auth } : {} }))

test('the cron route is closed without the cron secret; with it and the switches off it answers { mode: "off" } without using the database', async () => {
  assert.equal((await cron()).status, 503, 'no CRON_SECRET on the server')
  process.env.CRON_SECRET = 'cron-secret-of-the-test-0123456789'
  assert.equal((await cron()).status, 401)
  assert.equal((await cron('Bearer wrong-wrong-wrong-wrong')).status, 401)
  const res = await cron('Bearer cron-secret-of-the-test-0123456789')
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { mode: 'off' })
  assert.equal(mailbox.length, 0)
})

test('the cron route in dry-run answers counts and sends nothing; live without a mail key skips; live with one sends', async () => {
  const db = await newWorld()
  // the route reads the real clock: the series started 5 days ago and this tutor signed up 2.4 days ago
  const id = randomUUID()
  await db.exec(`
    insert into auth.users (id, email) values ('${id}', 'maria@school.example');
    insert into public.tutors (id, email, name, slug, created_at) values ('${id}', 'maria@school.example', 'Maria Santos', 'maria-1', '${new Date(Date.now() - 2.4 * DAY).toISOString()}');
  `)
  adminClient = () => pgliteClient(db)
  process.env.CRON_SECRET = 'cron-secret-of-the-test-0123456789'
  Object.assign(process.env, DRY, { WELCOME_EMAILS_START: new Date(Date.now() - 5 * DAY).toISOString() })
  {
    const dry = await cron('Bearer cron-secret-of-the-test-0123456789')
    const body = await dry.text()
    assert.equal(dry.status, 200)
    assert.equal(JSON.parse(body).total, 1)
    assert.equal(body.includes('@'), false)
    assert.equal(mailbox.length, 0)
    process.env.WELCOME_EMAILS_SEND = 'true'
    assert.deepEqual(await (await cron('Bearer cron-secret-of-the-test-0123456789')).json(), { skipped: 'RESEND_API_KEY not configured' })
    assert.equal(mailbox.length, 0)
    process.env.RESEND_API_KEY = 're_test_key_for_tests'
    const live = await (await cron('Bearer cron-secret-of-the-test-0123456789')).json()
    assert.equal(live.total, 1)
    assert.deepEqual(mailbox.map(m => m.to), ['maria@school.example'])
    assert.equal(mailbox[0].replyTo, emailReplyTo())
    assert.ok(mailbox[0].text.includes('Unsubscribe from these tips'), 'the plain-text copy has the line too')
  }
})

test('the cron is scheduled daily in vercel.json, next to the reminders cron', () => {
  const crons = JSON.parse(readFileSync(path.join(ROOT, 'vercel.json'), 'utf8').replace(/^﻿/, '')).crons as { path: string; schedule: string }[]
  assert.deepEqual(crons.find(c => c.path === '/api/cron/welcome-series'), { path: '/api/cron/welcome-series', schedule: '0 9 * * *' })
  assert.ok(crons.some(c => c.path === '/api/cron/reminders'), 'the existing crons are still there')
})

// ---- 5. unsubscribe: the route and the page ---------------------------------------------------------------------------------------------

const post = (query: string, body = '') => unsubscribeRoute.POST(new NextRequest(`https://www.tutafy.com/api/unsubscribe${query}`, { method: 'POST', body, headers: body ? { 'content-type': 'application/x-www-form-urlencoded' } : {} }))
const tokenFor = (email: string) => tokens.signUnsubscribeToken(email, { UNSUBSCRIBE_SECRET: SECRET })!

test('the button: a valid link unsubscribes exactly its own address (lower case, once even if pressed twice) and sends the browser to the "unsubscribed" page', async () => {
  const db = await newWorld(); adminClient = () => pgliteClient(db)
  process.env.UNSUBSCRIBE_SECRET = SECRET
  const res = await post(`?t=${tokenFor('Maria@School.Example')}`)
  assert.equal(res.status, 303)
  assert.equal(new URL(res.headers.get('location')!).pathname + new URL(res.headers.get('location')!).search, '/unsubscribe?done=1')
  assert.equal((await post(`?t=${tokenFor('Maria@School.Example')}`)).status, 303)
  assert.deepEqual((await rows(db, 'email_optouts')).map(x => x.email), ['maria@school.example'])
})

test('a mail program\'s one-click button (POST with List-Unsubscribe=One-Click) unsubscribes and gets a plain 200', async () => {
  const db = await newWorld(); adminClient = () => pgliteClient(db)
  process.env.UNSUBSCRIBE_SECRET = SECRET
  const res = await post(`?t=${tokenFor('one@school.example')}`, 'List-Unsubscribe=One-Click')
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ok: true })
  assert.deepEqual((await rows(db, 'email_optouts')).map(x => x.email), ['one@school.example'])
})

test('a forged, changed, missing or foreign link unsubscribes nobody and does not touch the database; with no key on the server it is refused (503)', async () => {
  let touched = 0
  adminClient = () => { touched++; throw new Error('database used') }
  process.env.UNSUBSCRIBE_SECRET = SECRET
  const real = tokenFor('a@school.example')
  const sig = Buffer.from(real, 'base64url').toString().split(':').pop()!
  const swapped = Buffer.from(`victim@school.example:${sig}`).toString('base64url')
  for (const q of ['', '?t=', '?t=garbage', `?t=${swapped}`, `?t=${real.slice(0, -2)}xx`, `?other=${real}`]) {
    const res = await post(q)
    assert.equal(res.status, 400, q.slice(0, 30))
  }
  // the address is read out of the signed token, never from the body or another parameter
  adminClient = () => { throw new Error('should be refused before this') }
  assert.equal((await post(`?t=${swapped}&email=victim@school.example`, 'email=victim@school.example&List-Unsubscribe=One-Click')).status, 400)
  assert.equal(touched, 0)
  delete process.env.UNSUBSCRIBE_SECRET
  assert.equal((await post(`?t=${real}`)).status, 503)
  assert.equal(touched, 0)
})

test('a valid link plus a body naming someone else still unsubscribes only the signed address', async () => {
  const db = await newWorld(); adminClient = () => pgliteClient(db)
  process.env.UNSUBSCRIBE_SECRET = SECRET
  await post(`?t=${tokenFor('mine@school.example')}&email=victim@school.example`, 'email=victim@school.example')
  assert.deepEqual((await rows(db, 'email_optouts')).map(x => x.email), ['mine@school.example'])
})

test('opening the link (GET) changes nothing: the route has no GET, and the page only shows a form whose button posts', async () => {
  assert.equal((unsubscribeRoute as Record<string, unknown>).GET, undefined)
  process.env.UNSUBSCRIBE_SECRET = SECRET
  let touched = 0
  adminClient = () => { touched++; throw new Error('the page must not write') }
  const t = tokenFor('Reader@School.Example')
  const html = renderToStaticMarkup(await UnsubscribePage({ searchParams: Promise.resolve({ t }) }))
  assert.match(html, /Unsubscribe from Tutafy tips\?/)
  assert.ok(html.includes('reader@school.example'), 'it shows which address')
  const form = html.match(/<form[^>]*>/)?.[0] ?? ''
  assert.ok(form.includes('method="post"') && form.includes(`action="/api/unsubscribe?t=${t}"`), `the button is a POST form: ${form}`)
  assert.match(html, /<button type="submit"[^>]*>\s*Unsubscribe\s*<\/button>/)
  assert.doesNotMatch(html, /<a [^>]*href="[^"]*\/api\/unsubscribe/, 'no plain link to the unsubscribing address')
  assert.equal(touched, 0)
})

test('the page: an address with markup is shown as text; a bad link says so; the "done" page names no address', async () => {
  process.env.UNSUBSCRIBE_SECRET = SECRET
  const evil = renderToStaticMarkup(await UnsubscribePage({ searchParams: Promise.resolve({ t: tokenFor('"><img src=x onerror=alert(1)>@school.example') }) }))
  assert.ok(!evil.includes('<img src=x'), 'no markup from an address')
  const bad = renderToStaticMarkup(await UnsubscribePage({ searchParams: Promise.resolve({ t: 'garbage' }) }))
  assert.match(bad, /This link does not work/)
  assert.doesNotMatch(bad, /<form/)
  const none = renderToStaticMarkup(await UnsubscribePage({ searchParams: Promise.resolve({}) }))
  assert.match(none, /This link does not work/)
  const done = renderToStaticMarkup(await UnsubscribePage({ searchParams: Promise.resolve({ done: '1', t: tokenFor('a@school.example') }) }))
  assert.match(done, /You are unsubscribed/)
  assert.doesNotMatch(done, /a@school\.example/)
  delete process.env.UNSUBSCRIBE_SECRET
  const nokey = renderToStaticMarkup(await UnsubscribePage({ searchParams: Promise.resolve({ t: tokenFor('a@school.example') }) }))
  assert.match(nokey, /This link does not work/)
  const { metadata } = await import('@/app/unsubscribe/page.tsx')
  assert.deepEqual(metadata.robots, { index: false, follow: false })
  assert.equal(metadata.referrer, 'no-referrer')
})

test('an address that unsubscribed through the link is never mailed again by the daily run (the whole path, in one test)', async () => {
  const db = await newWorld(); adminClient = () => pgliteClient(db)
  process.env.UNSUBSCRIBE_SECRET = SECRET
  await tutor(db, 0.1, { email: 'leaving@school.example' }); await tutor(db, 0.1, { email: 'staying@school.example' })
  const first = recorder()
  const built = send.buildOutgoing('nudge', { email: 'leaving@school.example', name: 'L', slug: null }, LIVE)!
  const token = new URL(built.out.headers['List-Unsubscribe'].slice(1, -1)).searchParams.get('t')!
  assert.equal((await post(`?t=${token}`, 'List-Unsubscribe=One-Click')).status, 200)
  await run(db, first.send, at(2.3))
  assert.deepEqual(first.mails.map(m => m.to), ['staying@school.example'])
})

// ---- 6. the day-0 mail at sign-up, replacing the two old welcome mails ------------------------------------------------------------------

const who = (over: Partial<{ id: string; email: string }> = {}) => ({ id: randomUUID(), email: 'new.tutor@school.example', name: 'Ana Lopez', slug: 'ana-lopez-q1w2', ...over })

test('switches OFF or dry-run, or the start date still ahead: the old welcome goes as it always did, and the new series reads and writes nothing', async () => {
  for (const [env, now] of [[{}, at(1)], [DRY, at(1)], [LIVE, at(-3)]] as const) {
    let legacy = 0
    const r = recorder()
    const out = await send.sendWelcomeAtSignup({ db: { from: () => { throw new Error('the new series touched the database') } }, tutor: who(), send: r.send, legacy: async () => { legacy++ }, now, env })
    assert.deepEqual([out, legacy, r.mails.length], ['legacy', 1, 0], JSON.stringify(env))
  }
})

test('LIVE: the new tutor gets the day-0 welcome once, with the three jobs and the unsubscribe link, claimed first, and the old welcome does NOT go', async () => {
  const db = await newWorld()
  const t = await tutor(db, 0, { email: 'new.tutor@school.example', name: 'Ana Lopez' })
  let legacy = 0
  const r = recorder()
  const go = () => send.sendWelcomeAtSignup({ db: pgliteClient(db), tutor: { id: t.id, email: t.email, name: 'Ana Lopez', slug: 'ana-lopez-q1w2' }, send: r.send, legacy: async () => { legacy++ }, now: at(0.01), env: LIVE })
  assert.equal(await go(), 'sent')
  assert.equal(await go(), 'skipped', 'a second try for the same tutor sends nothing (claimed)')
  assert.deepEqual([legacy, r.mails.length], [0, 1])
  assert.equal(r.mails[0].subject, 'Welcome to Tutafy, Ana: three things to do first')
  assert.ok(r.mails[0].html.includes('https://www.tutafy.com/book/ana-lopez-q1w2'))
  assert.ok(r.mails[0].html.includes('Choose your free hours'))
  assert.equal(r.mails[0].headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
  assert.deepEqual((await rows(db, 'welcome_email_sends')).map(x => [x.tutor_id, x.step]), [[t.id, 'welcome']])
})

test('LIVE: an address that unsubscribed before, a made-up address, a refusal by the mail service or an unreadable database send nothing, and not the old mail either', async () => {
  const db = await newWorld()
  await db.exec(`insert into public.email_optouts (email) values ('back.again@school.example')`)
  const go = async (email: string, s: import('@/lib/welcome-send.ts').SendMail, d: PGlite | null = db) => {
    const t = await tutor(db, 0, { email }); let legacy = 0
    const out = await send.sendWelcomeAtSignup({ db: d ? pgliteClient(d) : { from: () => { throw new Error('unreadable') } }, tutor: { id: t.id, email, name: 'X', slug: 'x-1' }, send: s, legacy: async () => { legacy++ }, now: at(0.01), env: LIVE })
    return [out, legacy] as const
  }
  const r = recorder()
  assert.deepEqual(await go('Back.Again@School.Example', r.send), ['skipped', 0])
  assert.deepEqual(await go('someone@example.com', r.send), ['skipped', 0])
  assert.deepEqual(await go('not-an-address', r.send), ['skipped', 0])
  assert.equal(r.mails.length, 0)
  assert.deepEqual(await go('refused@school.example', async () => ({ ok: false })), ['skipped', 0])
  assert.deepEqual((await rows(db, 'welcome_email_sends')).length, 0, 'the refused claim was given back')
  await assert.rejects(go('unreadable@school.example', r.send, null), /unreadable/, 'a database that throws is the caller\'s catch (the route swallows it, the tutor still signs up)')
})

test('the register route, switches off (as shipped): the old welcome is sent exactly as before and the new tables are not touched', async () => {
  const fake: FakeDb = createFakeDb({ tutors: [] })
  adminClient = () => ({ from: (t: string) => { if (t !== 'tutors') throw new Error(`the new series read ${t} while off`); return fake.from(t) }, auth: { admin: { getUserById: async () => ({ data: { user: null } }) } } })
  sessionUser = { id: randomUUID(), email: 'ann@school.example' }
  process.env.RESEND_API_KEY = 're_test_key_for_tests'
  const res = await registerRoute.POST(new NextRequest('https://www.tutafy.com/api/auth/register', { method: 'POST', body: JSON.stringify({ email: 'ann@school.example', name: 'Ann Account' }) }))
  assert.equal(res.status, 200)
  assert.deepEqual(mailbox.map(m => m.subject), ['Welcome to Tutafy: your tutoring business starts here'])
})

test('the register route, series live: one new welcome (not two mails), with the tutor\'s own link, and the old subject is gone', async () => {
  const fake: FakeDb = createFakeDb({ tutors: [], email_optouts: [], welcome_email_sends: [] })
  adminClient = () => ({ from: (t: string) => fake.from(t), auth: { admin: { getUserById: async () => ({ data: { user: null } }) } } })
  const id = randomUUID()
  sessionUser = { id, email: 'ann@school.example' }
  Object.assign(process.env, { ...LIVE, WELCOME_EMAILS_START: '2020-01-01', RESEND_API_KEY: 're_test_key_for_tests' })
  const res = await registerRoute.POST(new NextRequest('https://www.tutafy.com/api/auth/register', { method: 'POST', body: JSON.stringify({ email: 'ann@school.example', name: 'Ann Account' }) }))
  assert.equal(res.status, 200)
  assert.equal(mailbox.length, 1)
  assert.equal(mailbox[0].subject, 'Welcome to Tutafy, Ann: three things to do first')
  assert.match(mailbox[0].html, /https:\/\/www\.tutafy\.com\/book\/ann-account-[a-z0-9]{0,4}/)
  assert.ok(mailbox[0].headers?.['List-Unsubscribe'])
  assert.deepEqual((fake.tables.welcome_email_sends ?? []).map(r => [r.tutor_id, r.step]), [[id, 'welcome']])
})

test('both sign-up places use the same function, and the old mail words live only inside their `legacy` callback', () => {
  for (const file of ['src/app/api/auth/register/route.ts', 'src/app/auth/callback/route.ts']) {
    const src = readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n')
    assert.match(src, /sendWelcomeAtSignup\(\{[\s\S]*?legacy: sendLegacyWelcome/, `${file} sends through sendWelcomeAtSignup`)
    const callers = [...src.matchAll(/emails\.send\(/g)].length
    assert.equal(callers, 1, `${file}: one send call, inside the legacy callback`)
    const legacyStart = src.indexOf('const sendLegacyWelcome')
    const sendAt = src.indexOf('emails.send(')
    const tryAt = src.indexOf('sendWelcomeAtSignup(')
    assert.ok(legacyStart >= 0 && legacyStart < sendAt && sendAt < tryAt, `${file}: the only send is in sendLegacyWelcome, before the call`)
  }
})

// ---- 7. nothing else can reach the mail: no "send to everyone" path -------------------------------------------------------------------------

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${name}`
    if (statSync(path.join(ROOT, rel)).isDirectory()) sourceFiles(rel, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel)
  }
  return out
}

test('only the cron route and the two sign-up routes call the series; nothing else imports it, and the series has no "everyone" path', () => {
  const importers = (needle: RegExp) => sourceFiles('src').filter(f => needle.test(readFileSync(path.join(ROOT, f), 'utf8'))).sort()
  assert.deepEqual(importers(/@\/lib\/welcome-send['"]/).filter(f => f !== 'src/lib/welcome-send.ts'), [
    'src/app/api/auth/register/route.ts', 'src/app/api/cron/welcome-series/route.ts', 'src/app/auth/callback/route.ts', 'src/lib/welcome-mailer.ts',
  ])
  assert.deepEqual(importers(/@\/lib\/welcome-series['"]/), ['src/lib/welcome-send.ts'])
  const code = readFileSync(path.join(SRC, 'lib/welcome-send.ts'), 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n')
  assert.equal([...code.matchAll(/from\('tutors'\)/g)].length, 1, 'one read of tutors')
  assert.match(code, /\.gte\('created_at', since\.toISOString\(\)\)/)
  assert.match(code, /Math\.max\(mode\.startsAt\.getTime\(\)/, 'the lower bound is never before the start date')
})

test('the series never reads the mail key itself or a real address: the key comes in through the sender, the addresses from the database', () => {
  const read = (files: string[]) => files.map(f => readFileSync(path.join(ROOT, f), 'utf8')).join('\n')
  const all = read(['src/lib/welcome-send.ts', 'src/lib/unsubscribe-token.ts', 'src/lib/welcome-mailer.ts', 'src/app/api/unsubscribe/route.ts', 'src/app/unsubscribe/page.tsx', 'src/app/api/cron/welcome-series/route.ts'])
  assert.doesNotMatch(all, /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/, 'no address is typed in the new code')
  assert.doesNotMatch(read(['src/lib/welcome-send.ts', 'src/lib/unsubscribe-token.ts', 'src/app/api/unsubscribe/route.ts']), /new Resend\(|RESEND_API_KEY/, 'the key is handled in the routes and the mailer, not in the sending logic')
})
