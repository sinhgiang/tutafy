// T-1115: the second letter of the tutor email tool - the reminder to add free hours ("Your Tutafy page is live, but students cannot book you yet").
// Like tests/tutor-announcement.test.ts these run the REAL code (the rules, the queue, the three admin routes and the admin page) against a real Postgres built
// from the migration files (PGlite). The mail service is a recorder, so NOTHING is ever sent; every tutor, address and name is made up. They prove:
//   - the letter is the approved draft, word for word, and the campaign id is looked up in a fixed list (nothing else is accepted from a request);
//   - it goes ONLY to listed tutors who have no free hours (one row in `availability` is "has hours"), never to one who has, whoever else's hours exist;
//   - a tutor who got the profile letter still gets this one, once; a tutor who got this one is never queued for it again;
//   - the safety rules of the old letter hold for the new one: its own test mail first (the old letter's test does not unlock it), the confirmed number,
//     exactly three minutes between mails (also against the old letter's mails that still wait), Stop, and no address or name stored or shown;
//   - the profile letter behaves as before (tests/tutor-announcement.test.ts keeps proving that on its own).
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
import { setAdminLang } from './support/admin-lang.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const MIGRATION = '030_tutor_announcement.sql'

let currentDb: PGlite
let sessionUser: { id: string; email: string } | null = null
type Sent = { to: string; subject: string; html: string; text: string; headers?: Record<string, string>; scheduledAt?: string; from: string; key?: string }
const outbox: Sent[] = []
const cancelled: string[] = []
let sendHook: (m: Sent, n: number) => unknown = (_m, n) => ({ data: { id: `mail_${n}` }, error: null })
const redirects: string[] = []

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createAdminClient: () => pgliteClient(currentDb, { restStyle: true }),
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: sessionUser } }) } }),
  },
})
mock.module('resend', {
  exports: {
    Resend: class {
      emails = {
        send: async (m: Sent, o?: { idempotencyKey?: string }) => { outbox.push({ ...m, key: o?.idempotencyKey }); return sendHook(outbox[outbox.length - 1], outbox.length) },
        cancel: async (id: string) => { cancelled.push(id); return { data: {}, error: null } },
      }
    },
  },
})
mock.module('next/navigation', {
  exports: { redirect: (to: string) => { redirects.push(to); throw new Error(`NEXT_REDIRECT:${to}`) }, usePathname: () => '/super-admin/announcement', useRouter: () => ({ push() {}, refresh() {} }) },
})

const rules = await import('@/lib/tutor-announcement.ts')
const run = await import('@/lib/tutor-announcement-run.ts')
const presets = await import('@/lib/hours-presets.ts')
const testRoute = await import('@/app/api/admin/announcement/test/route.ts')
const startRoute = await import('@/app/api/admin/announcement/start/route.ts')
const stopRoute = await import('@/app/api/admin/announcement/stop/route.ts')
const { AdminLangProvider } = await import('@/components/admin/AdminLang.tsx')
const { default: AnnouncementPage } = await import('@/app/(admin)/super-admin/announcement/page.tsx')

const PROFILE = rules.CAMPAIGN
const HOURS = rules.AVAILABILITY_CAMPAIGN
const SECRET = 'a-long-test-secret-that-is-not-real-0123456789'
const ENV = { RESEND_API_KEY: 're_test_0123456789abcdef', UNSUBSCRIBE_SECRET: SECRET, ADMIN_EMAIL }
const NOW = new Date('2026-11-03T10:00:00Z')
const MIN = 60_000
const HOURS_SUBJECT = 'Your Tutafy page is live, but students cannot book you yet'
const PROFILE_SUBJECT = 'Two minutes to get your Tutafy profile ready for students'

async function newWorld(): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, MIGRATION)
  await db.exec(readMigration(MIGRATION))
  currentDb = db
  return db
}
const word = (i: number) => { let s = ''; let n = i; do { s = String.fromCharCode(97 + (n % 26)) + s; n = Math.floor(n / 26) - 1 } while (n >= 0); return s }
const BIO = 'I teach English to adults and teenagers, with a lot of speaking practice in every lesson.'
let nth = 0
type Over = { name?: string; bio?: string; email?: string; active?: boolean; hours?: number }
/** One made-up tutor that qualifies for the listing; `hours` rows of weekly free hours (none by default). */
async function tutor(db: PGlite, over: Over = {}) {
  const id = randomUUID()
  const w = word(++nth)
  const email = over.email ?? `${w}@school.example`
  const name = over.name ?? `Ana${w} Rivera`
  await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, `${w}-login@school.example`])
  await db.query(`insert into public.tutors (id, email, name, slug, bio, booking_url_active) values ($1, $2, $3, $4, $5, $6)`, [id, email, name, `tutor-${w}`, over.bio ?? BIO, over.active ?? true])
  for (let i = 0; i < (over.hours ?? 0); i += 1) {
    await db.query(`insert into public.availability (tutor_id, day_of_week, start_time, end_time) values ($1, $2, $3, $4)`, [id, i % 7, `${String(8 + Math.floor(i / 7)).padStart(2, '0')}:00`, `${String(9 + Math.floor(i / 7)).padStart(2, '0')}:00`])
  }
  return { id, email, name }
}
const many = async (db: PGlite, n: number, over: Over = {}) => { const out = []; for (let i = 0; i < n; i += 1) out.push(await tutor(db, over)); return out }
const markTested = (db: PGlite, campaign: string, at: Date = NOW) => db.query(`insert into public.tutor_announcement_control (campaign, test_sent_at) values ($1, $2) on conflict (campaign) do update set test_sent_at = excluded.test_sent_at`, [campaign, at.toISOString()])
const sends = async (db: PGlite, campaign?: string) => (await db.query<Record<string, unknown>>(`select * from public.tutor_announcement_sends ${campaign ? `where campaign = '${campaign}'` : ''} order by scheduled_for, tutor_id`)).rows
const dbOf = (db: PGlite) => pgliteClient(db, { restStyle: true })
const noSleep = async () => {}
const start = (db: PGlite, expected: number, campaign: rules.CampaignId, now = NOW) => run.startAnnouncement({ db: dbOf(db), mailer: run.realMailer(ENV), expected, now, env: ENV, sleep: noSleep, campaign })
const stop = (db: PGlite, campaign: rules.CampaignId, now: Date) => run.stopAnnouncement({ db: dbOf(db), mailer: run.realMailer(ENV), now, sleep: noSleep, campaign })

const VARS = ['RESEND_API_KEY', 'UNSUBSCRIBE_SECRET', 'CRON_SECRET']
const saved: Record<string, string | undefined> = {}
beforeEach(() => {
  for (const v of VARS) { saved[v] = process.env[v] }
  process.env.RESEND_API_KEY = ENV.RESEND_API_KEY
  process.env.UNSUBSCRIBE_SECRET = SECRET
  process.env.ADMIN_EMAIL = ADMIN_EMAIL
  outbox.length = 0
  cancelled.length = 0
  redirects.length = 0
  sendHook = (_m, n) => ({ data: { id: `mail_${n}` }, error: null })
  sessionUser = null
  setAdminLang(null)
})
afterEach(() => { for (const v of VARS) { if (saved[v] === undefined) delete process.env[v]; else process.env[v] = saved[v] } })

const ADMIN = { id: randomUUID(), email: ADMIN_EMAIL }
const TUTOR_USER = { id: randomUUID(), email: 'someone@school.example' }
const post = (url: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${url}`, { method: 'POST', headers: { host: 'localhost', origin: 'http://localhost', ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) })
const textOf = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

// ---- 1. the letter and the campaign list -------------------------------------------------------------------------------------------------------

test('the campaign id comes from a fixed list: two ids, nothing else is accepted, and no id at all is the profile letter', () => {
  assert.deepEqual([...rules.CAMPAIGN_IDS], [PROFILE, HOURS])
  assert.notEqual(PROFILE, HOURS)
  assert.ok(HOURS.length >= 1 && HOURS.length <= 60, 'fits the 60 characters the table allows')
  for (const bad of [undefined, null, '', ' ', 'tutor-availability-2026-1', `${HOURS} `, HOURS.toUpperCase(), '__proto__', 'toString', 'constructor', 'x'.repeat(61), 7, {}, [HOURS], ["'; drop table tutors; --"]]) {
    assert.equal(rules.parseCampaign(bad), null, JSON.stringify(bad))
  }
  assert.equal(rules.parseCampaign(PROFILE), PROFILE)
  assert.equal(rules.parseCampaign(HOURS), HOURS)
  assert.equal(rules.campaignOf(null), PROFILE, 'no body: the profile letter, as before')
  assert.equal(rules.campaignOf({}), PROFILE)
  assert.equal(rules.campaignOf({ expected: 3 }), PROFILE)
  assert.equal(rules.campaignOf({ campaign: HOURS }), HOURS)
  assert.equal(rules.campaignOf({ campaign: 'nope' }), null, 'one named that is not in the list is refused, not turned into the default')
  assert.equal(rules.campaignOf({ campaign: null }), null)
  assert.equal(rules.campaignOf('text'), PROFILE)
  assert.equal(rules.needsNoHours(HOURS), true)
  assert.equal(rules.needsNoHours(PROFILE), false)
})

test('the hours letter is the approved draft word for word: subject, greeting, steps, no placeholder, short, in the brand voice', () => {
  const m = rules.renderAvailabilityReminder({ name: 'Dr. Maria Santos', unsubscribeUrl: 'https://www.tutafy.com/unsubscribe?t=abc' })
  assert.equal(m.subject, HOURS_SUBJECT)
  assert.equal(rules.AVAILABILITY_SUBJECT, HOURS_SUBJECT)
  const body = textOf(m.html)
  assert.match(body, /^Hi Maria, /)
  assert.doesNotMatch(body, /NAME/)
  for (const phrase of [
    'You set up your Tutafy booking page, and the introduction you wrote is a good one. One thing is missing: free hours. Until you add some, a student who opens your link has no time to pick, so nobody can book you.',
    'It now takes one tap:',
    'Sign in at tutafy.com and open your dashboard.',
    'In the box at the top, press one of four ready-made weeks: weekday evenings, weekday mornings, weekdays 9 to 5, or weekends.',
    'Check the time zone named in that box. If it is not yours, change it in Settings first.',
    'You can change the hours any time under Availability. Free hours are also one of the three things your profile needs before your card can show in the tutor directory, which opens once six tutors are ready.',
    'Reply to this mail if anything is unclear.',
    'The Tutafy team',
  ]) assert.ok(body.includes(phrase), phrase)
  assert.equal((m.html.match(/<li /g) ?? []).length, 3)
  assert.ok(m.html.includes('href="https://www.tutafy.com/unsubscribe?t=abc"'))
  assert.equal(rules.renderAvailabilityReminder({ name: 'Maria' }).html.includes('Unsubscribe'), false, 'the unsubscribe line only when there is a link')
  assert.match(textOf(rules.renderAvailabilityReminder({ name: null }).html), /^Hi there, /)
  assert.match(rules.renderAvailabilityReminder({ name: '<img src=x onerror=alert(1)> Evil' }).html, /Hi &lt;img/)
  assert.doesNotMatch(rules.renderAvailabilityReminder({ name: '"><script>alert(1)</script>' }).html, /<script>/)
  assert.equal(rules.renderAvailabilityReminder({ name: 'Maria', test: true }).subject, `[Test] ${HOURS_SUBJECT}`)
  // under 150 words (the owner's limit for this letter), without the unsubscribe footer
  const letter = textOf(rules.renderAvailabilityReminder({ name: 'Maria' }).html)
  assert.ok(letter.split(' ').length < 150, `${letter.split(' ').length} words`)
  // the brand voice (docs/brand-voice.md): no exclamation mark, none of the words it forbids
  assert.equal(letter.includes('!'), false)
  const voice = readFileSync(path.join(ROOT, 'docs/brand-voice.md'), 'utf8')
  const never = voice.split('## Words never to use')[1].split(/\r?\n\r?\n/)[1].split(',').map(w => w.trim().replace(/["“”]/g, '').replace(/ \(.*\)$/, '')).filter(Boolean)
  assert.ok(never.length > 10 && never.includes('seamless'), 'the list was read from the file')
  for (const w of never) assert.equal(new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(letter), false, w)
  // no address or number of a real person
  assert.doesNotMatch(m.html, /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/)
  assert.doesNotMatch(letter, /\d{3}[ -]\d{3}/)
})

test('the letter names the four weeks of the box on the dashboard, in the box\'s own words, and the box is in this build (so the letter and the box ship together)', () => {
  const letter = textOf(rules.renderAvailabilityReminder({ name: 'Maria' }).html).toLowerCase()
  for (const p of presets.HOURS_PRESETS) assert.ok(letter.includes(p.label.toLowerCase().replace(', 9 to 5', ' 9 to 5')), p.label)
  assert.equal(presets.HOURS_PRESETS.length, 4, 'the letter says "four ready-made weeks"')
  const box = readFileSync(path.join(SRC, 'components/availability/QuickHours.tsx'), 'utf8')
  assert.match(box, /Pick a week in one tap/)
  const card = readFileSync(path.join(SRC, 'components/dashboard/DirectorySetupCard.tsx'), 'utf8')
  assert.match(card, /QuickHours/, 'the dashboard card shows the box')
  const route = readFileSync(path.join(SRC, 'app/api/availability/preset/route.ts'), 'utf8')
  assert.match(route, /export async function POST/, 'and the press has a route behind it')
})

test('the profile letter is untouched: same subject, same words, and renderCampaign gives each campaign its own letter', () => {
  assert.equal(rules.SUBJECT, PROFILE_SUBJECT)
  assert.equal(rules.renderCampaign(PROFILE, { name: 'Maria' }).html, rules.renderAnnouncement({ name: 'Maria' }).html)
  assert.equal(rules.renderCampaign(PROFILE, { name: 'Maria' }).subject, PROFILE_SUBJECT)
  assert.equal(rules.renderCampaign(HOURS, { name: 'Maria' }).html, rules.renderAvailabilityReminder({ name: 'Maria' }).html)
  assert.equal(rules.renderCampaign(HOURS, { name: 'Maria', test: true }).subject, `[Test] ${HOURS_SUBJECT}`)
  assert.equal(rules.withoutHours([{ id: 'a', email: 'a@x.example', name: null }, { id: 'b', email: 'b@x.example', name: null }], new Set(['b'])).map(r => r.id).join(), 'a')
})

// ---- 2. who gets it ----------------------------------------------------------------------------------------------------------------------------

test('who gets the hours letter: listed tutors with NO free hours only; a tutor with any hours, a tutor not listed and an unsubscribed one are left out; the profile letter still counts all of them', async () => {
  const db = await newWorld()
  const none = await many(db, 4)
  const some = await many(db, 3, { hours: 1 })
  const lots = await tutor(db, { hours: 30 }) // a long week is still "has hours": the answer is never cut short
  const quiet = await tutor(db)
  await db.query(`insert into public.email_optouts (email) values ($1)`, [quiet.email.toLowerCase()])
  await tutor(db, { bio: 'Short.' })
  await tutor(db, { active: false })
  await tutor(db, { name: 'Test Account' })

  const hours = await run.loadAnnouncementRecipients(dbOf(db), HOURS)
  assert.equal(hours.ok, true)
  assert.deepEqual(hours.ok && hours.recipients.map(r => r.id).sort(), none.map(t => t.id).sort(), 'exactly the four without hours')
  const profile = await run.loadAnnouncementRecipients(dbOf(db))
  assert.deepEqual(profile.ok && profile.recipients.map(r => r.id).sort(), [...none, ...some, lots].map(t => t.id).sort(), 'the profile letter: everyone listed, as before')
  const named = await run.loadAnnouncementRecipients(dbOf(db), PROFILE)
  assert.deepEqual(named.ok && named.recipients.length, 8)
})

test('hours belong to their tutor: another tutor\'s hours do not hide a tutor who has none, and a tutor who presses a one-tap week with the real code leaves the list', async () => {
  const db = await newWorld()
  const [a, b, c] = await many(db, 3)
  await db.query(`insert into public.availability (tutor_id, day_of_week, start_time, end_time) values ($1, 1, '09:00', '17:00')`, [b.id])
  const ids = async () => { const r = await run.loadAnnouncementRecipients(dbOf(db), HOURS); return r.ok ? r.recipients.map(x => x.id).sort() : null }
  assert.deepEqual(await ids(), [a.id, c.id].sort())
  const pressed = await presets.applyHoursPreset(pgliteClient(db, { role: 'authenticated', userId: a.id, restStyle: true }), a.id, 'weekends')
  assert.equal(pressed.ok, true, JSON.stringify(pressed))
  assert.deepEqual(await ids(), [c.id], 'a tutor who set hours with the box is no longer asked to')
})

test('a read of the hours that fails stops the hours letter - no list, no mail - while the profile letter, which does not read hours, is not affected', async () => {
  const db = await newWorld()
  await many(db, 3)
  await markTested(db, HOURS)
  await markTested(db, PROFILE)
  const real = dbOf(db)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const failing: any = new Proxy({}, { get: (_t, prop) => (prop === 'then' ? (done: (v: unknown) => void) => done({ data: null, error: { code: 'XX000', message: 'boom' } }) : () => failing) })
  const faulty = { from: (table: string) => (table === 'availability' ? failing : real.from(table)) }
  assert.deepEqual(await run.loadAnnouncementRecipients(faulty, HOURS), { ok: false, why: 'read-failed' })
  const out = await run.startAnnouncement({ db: faulty, mailer: run.realMailer(ENV), expected: 3, now: NOW, env: ENV, sleep: noSleep, campaign: HOURS })
  assert.deepEqual(out, { ok: false, why: 'read-failed' })
  assert.equal(outbox.length, 0)
  assert.deepEqual(await sends(db), [])
  const status = await run.loadAnnouncementStatus(faulty, ENV, NOW, HOURS)
  assert.equal(status.readFailed, true)
  assert.equal(status.toQueue, null)
  const profile = await run.startAnnouncement({ db: faulty, mailer: run.realMailer(ENV), expected: 3, now: NOW, env: ENV, sleep: noSleep, campaign: PROFILE })
  assert.equal(profile.ok, true, 'the profile letter never reads hours')
})

// ---- 3. each letter keeps its own record ---------------------------------------------------------------------------------------------------

test('a tutor who got the profile letter still gets the hours letter, once; one who got the hours letter is never queued for it again; each letter keeps its own rows and its own spacing', async () => {
  const db = await newWorld()
  const t = await many(db, 6)
  await markTested(db, PROFILE)
  assert.equal((await start(db, 6, PROFILE)).ok, true)
  assert.equal(outbox.length, 6)
  assert.ok(outbox.every(m => m.subject === PROFILE_SUBJECT))
  const lastProfile = Date.parse(outbox[5].scheduledAt!)

  // the hours letter needs its OWN test: the profile letter's test does not unlock it
  assert.deepEqual(await start(db, 6, HOURS, new Date(NOW.getTime() + MIN)), { ok: false, why: 'test-first' })
  assert.equal(outbox.length, 6)
  await markTested(db, HOURS)
  assert.deepEqual(await start(db, 5, HOURS, new Date(NOW.getTime() + MIN)), { ok: false, why: 'count-changed', actual: 6 }, 'the profile letter\'s rows do not hide anyone from the hours letter')
  const go = await start(db, 6, HOURS, new Date(NOW.getTime() + MIN))
  assert.equal(go.ok, true)
  assert.equal(outbox.length, 12)
  const second = outbox.slice(6)
  assert.ok(second.every(m => m.subject === HOURS_SUBJECT))
  assert.deepEqual(second.map(m => m.to).sort(), t.map(x => x.email).sort(), 'the same six people, the other letter')
  // three minutes after the LAST mail of the profile letter that still waited, then three minutes apart
  assert.equal(Date.parse(second[0].scheduledAt!), lastProfile + 3 * MIN, 'the two letters never go closer than three minutes to each other')
  for (let i = 1; i < second.length; i += 1) assert.equal(Date.parse(second[i].scheduledAt!) - Date.parse(second[i - 1].scheduledAt!), 3 * MIN, `gap ${i}`)
  assert.equal(new Set(second.map(m => m.key)).size, 6)
  assert.ok(second.every(m => m.key!.startsWith(`${HOURS}-`)) && outbox.slice(0, 6).every(m => m.key!.startsWith(`${PROFILE}-`)), 'the mail service\'s key names the campaign')
  assert.ok(second.every(m => m.key !== outbox[0].key))

  // never twice for the same letter
  assert.deepEqual(await start(db, 6, HOURS, new Date(NOW.getTime() + 2 * MIN)), { ok: false, why: 'nothing' })
  assert.deepEqual(await start(db, 6, PROFILE, new Date(NOW.getTime() + 2 * MIN)), { ok: false, why: 'nothing' })
  assert.equal(outbox.length, 12)
  assert.equal((await sends(db, PROFILE)).length, 6)
  assert.equal((await sends(db, HOURS)).length, 6)
  assert.equal((await sends(db)).length, 12)
  const stored = JSON.stringify(await sends(db)) + JSON.stringify((await db.query(`select * from public.tutor_announcement_control`)).rows)
  assert.equal(stored.includes('@'), false, 'no address anywhere in what is stored')
  for (const x of t) assert.equal(stored.includes(x.name), false)
})

test('the hours letter: the number shown is the number of tutors without hours; Start needs that number, one exact mail each, three minutes apart, each with its own unsubscribe link', async () => {
  const db = await newWorld()
  const none = await many(db, 21)
  await many(db, 3, { hours: 2 })
  await markTested(db, HOURS)
  const status = await run.loadAnnouncementStatus(dbOf(db), ENV, NOW, HOURS)
  assert.equal(status.eligible, 21)
  assert.equal(status.toQueue, 21)
  assert.deepEqual(await start(db, 24, HOURS), { ok: false, why: 'count-changed', actual: 21 }, 'the three with hours are not in the count')
  assert.equal(outbox.length, 0)
  const r = await start(db, 21, HOURS)
  assert.equal(r.ok, true)
  assert.deepEqual(outbox.map(m => m.to).sort(), none.map(t => t.email).sort())
  assert.equal(new Set(outbox.map(m => m.to)).size, 21)
  const times = outbox.map(m => Date.parse(m.scheduledAt!))
  assert.equal(times[0], NOW.getTime() + 90_000)
  for (let i = 1; i < times.length; i += 1) assert.equal(times[i] - times[i - 1], 180_000, `gap ${i}`)
  for (const m of outbox) {
    assert.equal(m.subject, HOURS_SUBJECT)
    assert.match(m.html, /Hi Ana[a-z]+,/)
    assert.ok(m.headers!['List-Unsubscribe'].includes('unsubscribe'))
    assert.equal(m.headers!['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
    assert.ok(m.html.includes('Unsubscribe from these emails'))
    assert.equal(m.from.endsWith('@tutafy.com>'), true)
  }
  const after = await run.loadAnnouncementStatus(dbOf(db), ENV, NOW, HOURS)
  assert.equal(after.toQueue, 0)
  assert.equal(after.counts.waiting, 21)
  const profile = await run.loadAnnouncementStatus(dbOf(db), ENV, NOW, PROFILE)
  assert.equal(profile.counts.waiting, 0, 'the other letter shows none of these')
  assert.equal(profile.toQueue, 24)
})

test('the "Send me a test" mail of the hours letter goes to the admin only, marked [Test], and unlocks only the hours letter', async () => {
  const db = await newWorld()
  const tutors = await many(db, 3)
  sessionUser = ADMIN
  const res = await testRoute.POST(post('/api/admin/announcement/test', { campaign: HOURS, to: tutors[0].email }))
  assert.equal(res.status, 200)
  assert.equal(outbox.length, 1)
  assert.equal(outbox[0].to, ADMIN_EMAIL)
  assert.equal(outbox[0].subject, `[Test] ${HOURS_SUBJECT}`)
  assert.equal(outbox[0].scheduledAt, undefined)
  assert.match(outbox[0].html, /Hi there,/)
  const control = (await db.query<{ campaign: string; test_sent_at: Date | null }>(`select campaign, test_sent_at from public.tutor_announcement_control`)).rows
  assert.deepEqual(control.map(c => c.campaign), [HOURS])
  assert.deepEqual(await sends(db), [], 'a test queues nobody')
  // the profile letter is still locked
  const { status, data } = await (async () => { const r = await startRoute.POST(post('/api/admin/announcement/start', { expected: 3 })); return { status: r.status, data: await r.json() as Record<string, unknown> } })()
  assert.equal(status, 409)
  assert.equal(data.reason, 'test-first')
  assert.equal(outbox.length, 1)
})

test('Stop of the hours letter takes back only the hours letter\'s mails; the profile letter\'s mails keep waiting', async () => {
  const db = await newWorld()
  await many(db, 4)
  await markTested(db, PROFILE)
  await markTested(db, HOURS)
  assert.equal((await start(db, 4, PROFILE)).ok, true)
  assert.equal((await start(db, 4, HOURS)).ok, true)
  const out = await stop(db, HOURS, NOW)
  assert.deepEqual(out, { ok: true, cancelled: 4, alreadyGone: 0, notCancelled: 0 })
  assert.equal(cancelled.length, 4)
  assert.deepEqual((await sends(db, HOURS)).map(r => r.state), ['cancelled', 'cancelled', 'cancelled', 'cancelled'])
  assert.deepEqual((await sends(db, PROFILE)).map(r => r.state), ['scheduled', 'scheduled', 'scheduled', 'scheduled'])
  const hoursStatus = await run.loadAnnouncementStatus(dbOf(db), ENV, NOW, HOURS)
  assert.ok(hoursStatus.stoppedAt)
  const profileStatus = await run.loadAnnouncementStatus(dbOf(db), ENV, NOW, PROFILE)
  assert.equal(profileStatus.stoppedAt, null)
  assert.equal(profileStatus.counts.waiting, 4)
})

// ---- 4. the routes and the page ------------------------------------------------------------------------------------------------------------

test('the routes take a campaign: a visitor and a tutor are refused with it too, an unknown one is a 400 and changes nothing, no campaign is the profile letter as before', async () => {
  const db = await newWorld()
  await many(db, 3)
  await markTested(db, HOURS, new Date())
  const routes: [string, (r: Request) => Promise<Response>, Record<string, unknown>][] = [
    ['/api/admin/announcement/test', testRoute.POST, {}],
    ['/api/admin/announcement/start', startRoute.POST, { expected: 3 }],
    ['/api/admin/announcement/stop', stopRoute.POST, {}],
  ]
  for (const [url, handler, body] of routes) {
    sessionUser = null
    assert.equal((await handler(post(url, { ...body, campaign: HOURS }))).status, 401, `${url} signed out`)
    sessionUser = TUTOR_USER
    assert.equal((await handler(post(url, { ...body, campaign: HOURS }))).status, 403, `${url} tutor`)
    sessionUser = ADMIN
    assert.equal((await handler(post(url, { ...body, campaign: HOURS }, { origin: 'https://evil.example' }))).status, 403, `${url} cross-site`)
    for (const bad of ['nope', '', null, 7, [HOURS], '__proto__']) {
      sessionUser = { id: randomUUID(), email: ADMIN_EMAIL } // the test mail is limited per session (3 a minute): a fresh session for each try
      assert.equal((await handler(post(url, { ...body, campaign: bad }))).status, 400, `${url} ${JSON.stringify(bad)}`)
    }
  }
  assert.equal(outbox.length, 0)
  assert.deepEqual(await sends(db), [])
  // the hours letter through the real route: the right number is 3, a wrong one is refused with the real one
  sessionUser = ADMIN
  assert.equal((await startRoute.POST(post('/api/admin/announcement/start', { expected: 2, campaign: HOURS }))).status, 409)
  const go = await startRoute.POST(post('/api/admin/announcement/start', { expected: 3, campaign: HOURS }))
  assert.equal(go.status, 200)
  assert.equal(outbox.length, 3)
  assert.ok(outbox.every(m => m.subject === HOURS_SUBJECT))
  assert.equal(JSON.stringify(await go.json()).includes('@'), false)
  // no campaign named: the profile letter, which was never tested here
  const old = await startRoute.POST(post('/api/admin/announcement/start', { expected: 3 }))
  assert.equal(old.status, 409)
  assert.equal(((await old.json()) as { reason: string }).reason, 'test-first')
  assert.equal(outbox.length, 3)
})

test('the page: the profile letter is the default, ?campaign= picks the hours letter, anything else falls back to the default; numbers only, no name or address; the words exist in both languages', async () => {
  const db = await newWorld()
  const none = await many(db, 5)
  const has = await many(db, 2, { hours: 3 })
  await markTested(db, PROFILE)
  sessionUser = ADMIN
  const render = async (campaign?: string | string[]) => renderToStaticMarkup(await AnnouncementPage(campaign === undefined ? {} : { searchParams: Promise.resolve({ campaign }) }))

  const first = await render()
  assert.match(first, /aria-current="page"[^>]*data-letter="tutor-profile-2026-10"/)
  assert.match(first, /data-testid="letter-subject"[^>]*>Subject: <span[^>]*>Two minutes to get your Tutafy profile ready for students</)
  assert.match(first, /7 tutors are waiting for this letter/)
  assert.match(first, /data-letter="tutor-availability-2026-10"/, 'a link to the other letter')

  const hours = await render(HOURS)
  assert.match(hours, /aria-current="page"[^>]*data-letter="tutor-availability-2026-10"/)
  assert.match(hours, /<span[^>]*>Your Tutafy page is live, but students cannot book you yet</)
  assert.match(hours, /5 tutors are waiting for this letter/, 'the two tutors with hours are not counted')
  assert.match(hours, /who have no free hours yet/)
  assert.match(hours, /data-testid="test-last"[^>]*>No test sent yet\./, 'the profile letter\'s test does not show here')
  assert.match(hours, /data-testid="start"[^>]*disabled/, 'Start is locked until this letter\'s own test')
  assert.match(first, /data-testid="test-last"[^>]*>Last test:/)

  for (const junk of ['nope', '__proto__', '', ['x', HOURS]]) assert.match(await render(junk), /aria-current="page"[^>]*data-letter="tutor-profile-2026-10"/, JSON.stringify(junk))
  assert.match(await render([HOURS, 'x']), /aria-current="page"[^>]*data-letter="tutor-availability-2026-10"/)

  for (const html of [first, hours]) {
    for (const t of [...none, ...has]) { assert.equal(html.includes(t.email), false); assert.equal(html.includes(t.name), false) }
    assert.equal(html.includes(ADMIN_EMAIL), false)
  }
  setAdminLang('vi')
  const vi = renderToStaticMarkup(createElement(AdminLangProvider, { lang: 'vi' }, await AnnouncementPage({ searchParams: Promise.resolve({ campaign: HOURS }) })))
  assert.match(vi, /Thư nhắc điền giờ rảnh/)
  assert.match(vi, /CHƯA có giờ rảnh/)
  assert.match(vi, /Thư thử cho tôi/)
  assert.doesNotMatch(vi, /ann\./, 'every key has a Vietnamese text')
})

// ---- 5. the code itself ----------------------------------------------------------------------------------------------------------------------

test('the buttons send the letter on screen to the server; the new code logs nothing, holds no address, and no job is added to the hosting', () => {
  const controls = readFileSync(path.join(SRC, 'app/(admin)/super-admin/announcement/AnnouncementControls.tsx'), 'utf8')
  for (const route of ['test', 'start', 'stop']) assert.match(controls, new RegExp(`post\\('/api/admin/announcement/${route}', \\{[^}]*campaign`), `${route} sends the campaign`)
  const files = ['lib/tutor-announcement.ts', 'lib/tutor-announcement-run.ts', 'app/(admin)/super-admin/announcement/page.tsx', 'app/(admin)/super-admin/announcement/AnnouncementControls.tsx', ...['test', 'start', 'stop'].map(n => `app/api/admin/announcement/${n}/route.ts`)]
  for (const f of files) {
    const src = readFileSync(path.join(SRC, f), 'utf8')
    assert.doesNotMatch(src, /console\.(log|info|warn|error|debug)/, `${f} logs nothing`)
    assert.doesNotMatch(src, /[A-Za-z0-9._%+-]+@(?!tutafy\.com)[A-Za-z0-9-]+\.[A-Za-z]{2,}/, `${f} holds no email address`)
    assert.doesNotMatch(src, /\bdebugger\b|\bTODO\b/, `${f} has no leftovers`)
  }
  for (const name of ['test', 'start', 'stop']) {
    const src = readFileSync(path.join(SRC, `app/api/admin/announcement/${name}/route.ts`), 'utf8')
    const gate = src.indexOf('adminApiGate()')
    assert.ok(gate > 0)
    for (const later of ['request.json', 'campaignOf(', 'createAdminClient()', 'realMailer()']) { const at = src.indexOf(later); if (at >= 0) assert.ok(at > gate, `${name}: ${later} after the gate`) }
  }
  const cfg = JSON.parse(readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')) as { crons: { path: string }[] }
  assert.equal(cfg.crons.some(c => /announcement/.test(c.path)), false)
})

test('no new migration: the tables of migration 030 already keep everything per campaign (a campaign id is the first column of both keys)', () => {
  const sql = readFileSync(path.join(ROOT, 'supabase/migrations', MIGRATION), 'utf8')
  assert.match(sql, /primary key \(campaign, tutor_id\)/)
  assert.match(sql, /campaign text primary key/)
  assert.match(sql, /char_length\(campaign\) between 1 and 60/)
})
