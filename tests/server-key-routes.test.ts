// T-0903: routes that use the server's key (row level security does not apply to it) must prove ownership themselves.
//   1. group-students: tutor B could change or remove a group student of tutor A's lesson by sending the entry id (found by T-0895);
//   2. the Google Calendar return took the tutor id from the address, so anyone could connect their own calendar to another tutor;
//   3. the "Mark no-show" card never showed (a condition that is always false), and the route marked any lesson;
//   4. sync-gcal did not read the stored event id, so every sync made one more calendar event;
//   5. the Stripe subscription webhook read the period dates from a place a newer Stripe API no longer fills (it threw, Stripe retried).
// Plus a hand-written register of EVERY file under src/app that uses the server's key, with the reason each is safe.
// The routes are the real ones, run over an in-memory Supabase with two tutors; Stripe's own header generator signs the webhook events.
import { test, mock, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import { SERVER_KEY_FILES } from './support/server-key-registry.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

// ---- the doubles --------------------------------------------------------------------------------------------------------------

let db: FakeDb
let signedIn: string | null = null
const calendar = { created: [] as string[], updated: [] as string[], deleted: [] as string[] }
const mails: { to: string }[] = []

/** The fake database ignores the column list of a select; the real one returns only the columns asked for. This keeps the same promise:
 *  a select returns just the listed top-level columns (an embedded relation such as `students(name)` keeps its key if the row has it). */
function columnAware(real: FakeDb) {
  const names = (list: string) => {
    const out: string[] = []
    let depth = 0, cur = ''
    for (const ch of list) {
      if (ch === '(') depth++
      if (ch === ')') depth--
      if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue }
      cur += ch
    }
    out.push(cur)
    return out.map(c => c.trim().replace(/\(.*$/s, '').trim()).filter(Boolean)
  }
  const pick = (row: Record<string, unknown>, cols: string[]) => Object.fromEntries(cols.filter(c => c in row).map(c => [c, row[c]]))
  return {
    tables: real.tables,
    log: real.log,
    from(table: string) {
      const q = real.from(table) as unknown as Record<string, (...a: unknown[]) => unknown>
      let cols: string[] | null = null
      const select = q.select.bind(q)
      q.select = (c?: unknown, o?: unknown) => { if (typeof c === 'string' && c.trim() !== '*') cols = names(c); return select(c, o) }
      const then = q.then.bind(q)
      q.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => then((v: { data: unknown }) => {
        if (cols && v && v.data) {
          const keep = cols
          v = { ...v, data: Array.isArray(v.data) ? v.data.map(r => pick(r, keep)) : pick(v.data as Record<string, unknown>, keep) }
        }
        return resolve(v)
      }, reject)
      return q
    },
  } as unknown as FakeDb
}

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => db,
    createClient: async () => ({
      from: (t: string) => db.from(t),
      auth: { getUser: async () => ({ data: { user: signedIn ? { id: signedIn, email: 'tutor@example.com' } : null } }) },
    }),
  },
})
mock.module(pathToFileURL(path.join(SRC, 'lib/google-calendar.ts')).href, {
  namedExports: {
    createCalendarEvent: async () => { calendar.created.push('x'); return { gcalEventId: `evt_${calendar.created.length}`, meetLink: null } },
    updateCalendarEvent: async (_t: string, _c: string, id: string) => { calendar.updated.push(id) },
    deleteCalendarEvent: async (_t: string, _c: string, id: string) => { calendar.deleted.push(id) },
  },
})
mock.module(pathToFileURL(path.join(SRC, 'lib/email.ts')).href, {
  namedExports: { createMailer: () => ({ emails: { send: async (m: { to: string }) => { mails.push(m) } } }) },
})

const group = await import('@/app/api/lessons/[id]/group-students/route.ts')
const syncGcal = await import('@/app/api/lessons/[id]/sync-gcal/route.ts')
const noShowRoute = await import('@/app/api/lessons/[id]/no-show/route.ts')
const gcalStart = await import('@/app/api/auth/google-calendar/route.ts')
const gcalCallback = await import('@/app/api/auth/google-calendar/callback/route.ts')
const stripeWebhook = await import('@/app/api/webhooks/stripe/route.ts')
const { noShowOffered } = await import('@/lib/no-show.ts')
const { subscriptionPeriod } = await import('@/lib/stripe/subscription-period.ts')
const { gcalStateMatches, newGcalState } = await import('@/lib/gcal-state.ts')
const { LessonActions } = await import('@/app/(dashboard)/lessons/[id]/LessonActions.tsx')

const A = '10000000-0000-4000-8000-00000000000a' // tutor A
const B = '10000000-0000-4000-8000-00000000000b' // tutor B
const SA = '20000000-0000-4000-8000-00000000000a' // A's student
const SB = '20000000-0000-4000-8000-00000000000b'
const LA = '30000000-0000-4000-8000-00000000000a' // A's group lesson
const LB = '30000000-0000-4000-8000-00000000000b'
const EA = '40000000-0000-4000-8000-00000000000a' // A's group entry
const EB = '40000000-0000-4000-8000-00000000000b'
const HOUR = 3_600_000

function seed() {
  return createFakeDb({
    tutors: [
      { id: A, google_calendar_refresh_token: 'rt_A', google_calendar_id: 'a@example.com', stripe_account_id: 'acct_A' },
      { id: B, google_calendar_refresh_token: 'rt_B', google_calendar_id: 'b@example.com' },
    ],
    students: [{ id: SA, tutor_id: A, name: 'Student A' }, { id: SB, tutor_id: B, name: 'Student B' }],
    lessons: [
      { id: LA, tutor_id: A, student_id: SA, status: 'scheduled', starts_at: '2026-10-30T10:00:00Z', ends_at: '2026-10-30T11:00:00Z', duration_minutes: 60, notes: null, zoom_link: null, google_event_id: null },
      { id: LB, tutor_id: B, student_id: SB, status: 'scheduled', starts_at: '2026-10-30T12:00:00Z', ends_at: '2026-10-30T13:00:00Z', duration_minutes: 60, notes: null, zoom_link: null, google_event_id: null },
    ],
    subscription_plans: [{ id: '60000000-0000-4000-8000-00000000000a', tutor_id: A }],
    lesson_students: [
      { id: EA, lesson_id: LA, student_id: SA, price: 20, payment_status: 'pending' },
      { id: EB, lesson_id: LB, student_id: SB, price: 20, payment_status: 'pending' },
    ],
  })
}

const realFetch = globalThis.fetch
beforeEach(() => {
  db = columnAware(seed())
  signedIn = null
  calendar.created.length = 0; calendar.updated.length = 0; calendar.deleted.length = 0
  mails.length = 0
  process.env.RESEND_API_KEY = 're_test_key_for_the_no_show_mail'
  process.env.GOOGLE_CLIENT_ID = 'client-id-for-tests'
  process.env.GOOGLE_CLIENT_SECRET = 'client-secret-for-tests'
})
afterEach(() => { globalThis.fetch = realFetch })

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const row = (table: string, id: string) => db.tables[table].find(r => r.id === id)
const json = (body: unknown) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const call = (url: string, init?: RequestInit) => new NextRequest(`https://www.tutafy.test${url}`, init as ConstructorParameters<typeof NextRequest>[1])

// ---- 1. group-students: the second tutor ----------------------------------------------------------------------------------------

test('group-students: nobody signed in is refused on all four calls', async () => {
  assert.equal((await group.GET(call(`/api/lessons/${LA}/group-students`), ctx(LA))).status, 401)
  assert.equal((await group.POST(call(`/api/lessons/${LA}/group-students`, json({ student_id: SA })), ctx(LA))).status, 401)
  assert.equal((await group.DELETE(call(`/api/lessons/${LA}/group-students?entry_id=${EA}`, { method: 'DELETE' }), ctx(LA))).status, 401)
  assert.equal((await group.PATCH(call(`/api/lessons/${LA}/group-students`, { ...json({ entry_id: EA, payment_status: 'paid' }), method: 'PATCH' }), ctx(LA))).status, 401)
  assert.equal(db.tables.lesson_students.length, 2)
  assert.equal(row('lesson_students', EA)!.payment_status, 'pending')
})

test('group-students: tutor B cannot remove tutor A\'s group student, through A\'s lesson or through B\'s own lesson', async () => {
  signedIn = B
  // the hole: B's own lesson id in the address, A's entry id in the query
  const viaOwn = await group.DELETE(call(`/api/lessons/${LB}/group-students?entry_id=${EA}`, { method: 'DELETE' }), ctx(LB))
  assert.equal(viaOwn.status, 404)
  const viaTheirs = await group.DELETE(call(`/api/lessons/${LA}/group-students?entry_id=${EA}`, { method: 'DELETE' }), ctx(LA))
  assert.equal(viaTheirs.status, 404)
  assert.ok(row('lesson_students', EA), 'A\'s entry is still there')
  assert.equal(db.tables.lesson_students.length, 2)
  // the answer for an entry that is not B's is the same as for one that does not exist
  const missing = await group.DELETE(call(`/api/lessons/${LB}/group-students?entry_id=50000000-0000-4000-8000-000000000000`, { method: 'DELETE' }), ctx(LB))
  assert.equal(missing.status, 404)
  assert.deepEqual(await missing.json(), await viaOwn.json())
})

test('group-students: tutor B cannot change A\'s group student payment status', async () => {
  signedIn = B
  const patch = (lesson: string, entry: string, status = 'paid') =>
    group.PATCH(call(`/api/lessons/${lesson}/group-students`, { ...json({ entry_id: entry, payment_status: status }), method: 'PATCH' }), ctx(lesson))
  assert.equal((await patch(LB, EA)).status, 404)
  assert.equal((await patch(LA, EA)).status, 404)
  assert.equal(row('lesson_students', EA)!.payment_status, 'pending')
  assert.equal(row('lesson_students', EB)!.payment_status, 'pending', 'B\'s own entry was not touched by a call that named it wrongly')
})

test('group-students: tutor B cannot read A\'s group, or add students to it, or add A\'s student to their own', async () => {
  signedIn = B
  assert.equal((await group.GET(call(`/api/lessons/${LA}/group-students`), ctx(LA))).status, 404)
  assert.equal((await group.POST(call(`/api/lessons/${LA}/group-students`, json({ student_id: SB })), ctx(LA))).status, 404)
  assert.equal((await group.POST(call(`/api/lessons/${LB}/group-students`, json({ student_id: SA })), ctx(LB))).status, 404)
  assert.equal(db.tables.lesson_students.length, 2)
})

test('group-students: tutor A can list, add, mark paid and remove on their own lesson', async () => {
  signedIn = A
  const list = await group.GET(call(`/api/lessons/${LA}/group-students`), ctx(LA))
  assert.equal(list.status, 200)
  assert.deepEqual(((await list.json()).students as { id: string }[]).map(s => s.id), [EA])

  const added = await group.POST(call(`/api/lessons/${LA}/group-students`, json({ student_id: SA, price: 15 })), ctx(LA))
  assert.equal(added.status, 200)
  assert.equal(db.tables.lesson_students.filter(e => e.lesson_id === LA).length, 2)

  const paid = await group.PATCH(call(`/api/lessons/${LA}/group-students`, { ...json({ entry_id: EA, payment_status: 'paid' }), method: 'PATCH' }), ctx(LA))
  assert.equal(paid.status, 200)
  assert.equal(row('lesson_students', EA)!.payment_status, 'paid')

  const gone = await group.DELETE(call(`/api/lessons/${LA}/group-students?entry_id=${EA}`, { method: 'DELETE' }), ctx(LA))
  assert.equal(gone.status, 200)
  assert.equal(row('lesson_students', EA), undefined)
  assert.ok(row('lesson_students', EB), 'B\'s entry is untouched')
})

test('group-students: what is sent is checked (status, price, ids)', async () => {
  signedIn = A
  const patch = (body: unknown) => group.PATCH(call(`/api/lessons/${LA}/group-students`, { ...json(body), method: 'PATCH' }), ctx(LA))
  assert.equal((await patch({ entry_id: EA, payment_status: 'free' })).status, 400, 'not a status the table accepts')
  assert.equal((await patch({ entry_id: EA, payment_status: { $ne: 'x' } })).status, 400)
  assert.equal((await patch({ entry_id: 'not-an-id', payment_status: 'paid' })).status, 404)
  assert.equal((await patch({ payment_status: 'paid' })).status, 400)
  assert.equal(row('lesson_students', EA)!.payment_status, 'pending')
  const add = (body: unknown) => group.POST(call(`/api/lessons/${LA}/group-students`, json(body)), ctx(LA))
  assert.equal((await add({ student_id: SA, price: -5 })).status, 400)
  assert.equal((await add({ student_id: SA, price: '10' })).status, 400)
  assert.equal((await add({ student_id: 'x' })).status, 404)
  assert.equal((await group.DELETE(call(`/api/lessons/${LA}/group-students?entry_id=nope`, { method: 'DELETE' }), ctx(LA))).status, 404)
  assert.equal((await group.GET(call('/api/lessons/not-a-lesson/group-students'), ctx('not-a-lesson'))).status, 404)
})

// ---- 2. Google Calendar connection ------------------------------------------------------------------------------------------------

function googleStub() {
  const fetched: string[] = []
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input)
    fetched.push(url)
    return url.includes('oauth2.googleapis.com') ? Response.json({ refresh_token: 'rt_new', access_token: 'at_new' }) : Response.json({ id: 'new@example.com' })
  }) as typeof fetch
  return fetched
}
/** Start the connection as `tutor` and return what Google would send back: the state in the address and the cookie the browser keeps. */
async function startConnection(tutor: string) {
  signedIn = tutor
  const res = await gcalStart.GET(call('/api/auth/google-calendar'))
  const location = new URL(res.headers.get('location')!)
  return { state: location.searchParams.get('state')!, cookie: res.cookies.get('tutafy_gcal_state')!.value, res }
}
const comeBack = (state: string | null, cookie?: string) =>
  gcalCallback.GET(call(`/api/auth/google-calendar/callback?code=abc${state ? `&state=${encodeURIComponent(state)}` : ''}`, cookie ? { headers: { cookie: `tutafy_gcal_state=${encodeURIComponent(cookie)}` } } : undefined))
const tokenOf = (id: string) => row('tutors', id)!.google_calendar_refresh_token

test('google calendar: starting makes a random state, keeps it in an http-only cookie of that browser, and it is not the tutor id', async () => {
  const { state, cookie, res } = await startConnection(A)
  assert.notEqual(state, A)
  assert.ok(!state.includes(A))
  assert.equal(cookie, `${A}.${state}`)
  const set = res.headers.get('set-cookie') ?? ''
  assert.match(set, /HttpOnly/i)
  assert.match(set, /Secure/i)
  assert.match(set, /SameSite=lax/i)
  const second = await startConnection(A)
  assert.notEqual(second.state, state, 'a new value each time')
})

test('google calendar: the old attack no longer works (the victim\'s id in the address, signed in as someone else, or not signed in at all)', async () => {
  const fetched = googleStub()
  signedIn = B
  const attack = await comeBack(A)
  assert.match(attack.headers.get('location') ?? '', /\/settings\?gcal=error/)
  signedIn = null
  const anonymous = await comeBack(A)
  assert.match(anonymous.headers.get('location') ?? '', /\/login/)
  assert.equal(fetched.length, 0, 'Google was never asked for tokens')
  assert.equal(tokenOf(A), 'rt_A')
  assert.equal(tokenOf(B), 'rt_B')
})

test('google calendar: a state started by one tutor is no use to another, and a wrong or missing cookie is refused', async () => {
  const fetched = googleStub()
  const a = await startConnection(A)
  signedIn = B
  assert.match((await comeBack(a.state, a.cookie)).headers.get('location') ?? '', /gcal=error/, 'B holding A\'s cookie and state')
  signedIn = A
  assert.match((await comeBack(a.state)).headers.get('location') ?? '', /gcal=error/, 'no cookie (a link someone else made you open)')
  assert.match((await comeBack('another-state', a.cookie)).headers.get('location') ?? '', /gcal=error/, 'state does not match the cookie')
  assert.equal(fetched.length, 0)
  assert.equal(tokenOf(A), 'rt_A')
  assert.equal(tokenOf(B), 'rt_B')
})

test('google calendar: the tutor who started it connects their own calendar, and only theirs; the cookie is cleared', async () => {
  const fetched = googleStub()
  const a = await startConnection(A)
  const back = await comeBack(a.state, a.cookie)
  assert.match(back.headers.get('location') ?? '', /gcal=connected/)
  assert.equal(tokenOf(A), 'rt_new')
  assert.equal(row('tutors', A)!.google_calendar_id, 'new@example.com')
  assert.equal(tokenOf(B), 'rt_B', 'the other tutor is untouched')
  assert.equal(fetched.length, 2)
  assert.match(back.headers.get('set-cookie') ?? '', /tutafy_gcal_state=;/)
})

test('google calendar: the state comparison itself', () => {
  const { state, cookie } = newGcalState(A)
  assert.equal(gcalStateMatches(cookie, state, A), true)
  assert.equal(gcalStateMatches(cookie, state, B), false)
  assert.equal(gcalStateMatches(cookie, `${state}x`, A), false)
  assert.equal(gcalStateMatches(undefined, state, A), false)
  assert.equal(gcalStateMatches(cookie, null, A), false)
  assert.equal(gcalStateMatches('', '', A), false)
})

// ---- 3. no-show --------------------------------------------------------------------------------------------------------------

test('no-show rule: a scheduled lesson that has started, and nothing else', () => {
  const now = Date.parse('2026-10-30T12:00:00Z')
  assert.equal(noShowOffered('scheduled', '2026-10-30T11:00:00Z', now), true)
  assert.equal(noShowOffered('scheduled', '2026-10-30T12:00:00Z', now), true, 'the moment it starts')
  assert.equal(noShowOffered('scheduled', '2026-10-30T12:00:01Z', now), false, 'not started yet')
  assert.equal(noShowOffered('completed', '2026-10-30T11:00:00Z', now), false)
  assert.equal(noShowOffered('cancelled', '2026-10-30T11:00:00Z', now), false)
  assert.equal(noShowOffered('no_show', '2026-10-30T11:00:00Z', now), false)
  assert.equal(noShowOffered('scheduled', undefined, now), false)
  assert.equal(noShowOffered('scheduled', 'not a date', now), false)
  assert.equal(noShowOffered(undefined, '2026-10-30T11:00:00Z', now), false)
})

test('no-show card: shown for a started scheduled lesson, not for a future, completed or already marked one', () => {
  const card = (props: { lessonStatus?: string; startsAt?: string }) =>
    renderToStaticMarkup(createElement(LessonActions, { lessonId: LA, hasPrice: true, studentEmail: null, isCompleted: false, ...props }))
  const past = new Date(Date.now() - 2 * HOUR).toISOString()
  const future = new Date(Date.now() + 2 * HOUR).toISOString()
  assert.match(card({ lessonStatus: 'scheduled', startsAt: past }), /Mark no-show/)
  assert.doesNotMatch(card({ lessonStatus: 'scheduled', startsAt: future }), /Mark no-show/)
  assert.doesNotMatch(card({ lessonStatus: 'completed', startsAt: past }), /Mark no-show/)
  assert.doesNotMatch(card({ lessonStatus: 'no_show', startsAt: past }), /Mark no-show/)
  assert.doesNotMatch(card({ lessonStatus: 'scheduled' }), /Mark no-show/)
})

test('no-show route: marks a started lesson of the signed-in tutor and mails the student once', async () => {
  const lesson = row('lessons', LA)!
  lesson.starts_at = new Date(Date.now() - 2 * HOUR).toISOString()
  lesson.students = { name: 'Student A', email: 'student-a@example.com' }
  signedIn = A
  const res = await noShowRoute.POST(call(`/api/lessons/${LA}/no-show`, { method: 'POST' }), ctx(LA))
  assert.equal(res.status, 200)
  assert.equal(row('lessons', LA)!.status, 'no_show')
  assert.deepEqual(mails.map(m => m.to), ['student-a@example.com'])
  // pressing it again does nothing and mails nobody
  const again = await noShowRoute.POST(call(`/api/lessons/${LA}/no-show`, { method: 'POST' }), ctx(LA))
  assert.equal(again.status, 409)
  assert.equal(mails.length, 1)
})

test('no-show route: refuses a lesson that has not started, one that is not scheduled, another tutor\'s, and a visitor', async () => {
  const future = row('lessons', LA)!
  future.students = { name: 'Student A', email: 'student-a@example.com' }
  signedIn = A
  assert.equal((await noShowRoute.POST(call(`/api/lessons/${LA}/no-show`, { method: 'POST' }), ctx(LA))).status, 409)
  assert.equal(future.status, 'scheduled')

  future.starts_at = new Date(Date.now() - 2 * HOUR).toISOString()
  future.status = 'completed'
  assert.equal((await noShowRoute.POST(call(`/api/lessons/${LA}/no-show`, { method: 'POST' }), ctx(LA))).status, 409)
  assert.equal(future.status, 'completed')

  future.status = 'scheduled'
  signedIn = B
  assert.equal((await noShowRoute.POST(call(`/api/lessons/${LA}/no-show`, { method: 'POST' }), ctx(LA))).status, 404)
  signedIn = null
  assert.equal((await noShowRoute.POST(call(`/api/lessons/${LA}/no-show`, { method: 'POST' }), ctx(LA))).status, 401)
  assert.equal(future.status, 'scheduled')
  assert.equal(mails.length, 0)
})

// ---- 4. sync-gcal ------------------------------------------------------------------------------------------------------------------

test('sync-gcal: the first sync makes one calendar event and keeps its id; the next syncs update that event and make no more', async () => {
  signedIn = A
  const sync = () => syncGcal.POST(call(`/api/lessons/${LA}/sync-gcal`, { method: 'POST' }), ctx(LA))
  const first = await sync()
  assert.equal(first.status, 200)
  assert.equal(calendar.created.length, 1)
  assert.equal(row('lessons', LA)!.google_event_id, 'evt_1')

  await sync()
  await sync()
  assert.equal(calendar.created.length, 1, 'still one event in the calendar')
  assert.deepEqual(calendar.updated, ['evt_1', 'evt_1'])
})

test('sync-gcal: a lesson that already has an event is only updated, and the answer names that event', async () => {
  row('lessons', LA)!.google_event_id = 'evt_old'
  signedIn = A
  const res = await syncGcal.POST(call(`/api/lessons/${LA}/sync-gcal`, { method: 'POST' }), ctx(LA))
  assert.equal(res.status, 200)
  assert.equal((await res.json()).gcalEventId, 'evt_old')
  assert.equal(calendar.created.length, 0)
  assert.deepEqual(calendar.updated, ['evt_old'])
})

test('sync-gcal: another tutor cannot sync, or delete the event of, this tutor\'s lesson', async () => {
  row('lessons', LA)!.google_event_id = 'evt_old'
  signedIn = B
  assert.equal((await syncGcal.POST(call(`/api/lessons/${LA}/sync-gcal`, { method: 'POST' }), ctx(LA))).status, 404)
  await syncGcal.DELETE(call(`/api/lessons/${LA}/sync-gcal`, { method: 'DELETE' }), ctx(LA))
  assert.equal(calendar.created.length + calendar.updated.length + calendar.deleted.length, 0)
  assert.equal(row('lessons', LA)!.google_event_id, 'evt_old')
  signedIn = null
  assert.equal((await syncGcal.POST(call(`/api/lessons/${LA}/sync-gcal`, { method: 'POST' }), ctx(LA))).status, 401)
})

// ---- 5. Stripe subscription webhook --------------------------------------------------------------------------------------------------

const WH_SECRET = 'whsec_test_secret_for_the_subscription_webhook_0123'
const START = 1_790_000_000 // 2026-09-21
const END = START + 30 * 86_400
const iso = (s: number) => new Date(s * 1000).toISOString()
const PLAN = '60000000-0000-4000-8000-00000000000a'

function subscriptionEvent(sub: Record<string, unknown>, type = 'customer.subscription.created') {
  const body = JSON.stringify({
    id: 'evt_sub_1', object: 'event', type, account: 'acct_A',
    data: { object: { id: 'sub_1', object: 'subscription', customer: 'cus_1', status: 'active', metadata: { plan_id: PLAN, tutor_id: A, student_email: 'learner@example.com', student_name: 'Learner' }, ...sub } },
  })
  const header = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: WH_SECRET })
  return new NextRequest('https://www.tutafy.test/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': header }, body })
}
const savedSub = () => db.tables.student_subscriptions.find(s => s.stripe_subscription_id === 'sub_1')

test('subscription period: from the subscription, from its first item, and never a bad date', () => {
  assert.deepEqual(subscriptionPeriod({ current_period_start: START, current_period_end: END }), { start: iso(START), end: iso(END) })
  assert.deepEqual(subscriptionPeriod({ items: { data: [{ current_period_start: START, current_period_end: END }] } }), { start: iso(START), end: iso(END) })
  assert.deepEqual(subscriptionPeriod({ current_period_start: START, items: { data: [{ current_period_end: END }] } }), { start: iso(START), end: iso(END) }, 'each date from where it is')
  for (const nothing of [{}, null, undefined, { items: {} }, { items: { data: [] } }, { current_period_start: 'soon', current_period_end: NaN }, { current_period_start: 0 }, { items: { data: [null] } }]) {
    assert.deepEqual(subscriptionPeriod(nothing), { start: null, end: null }, JSON.stringify(nothing))
  }
})

test('stripe webhook: a subscription with the dates on the subscription (older API) is saved with its dates', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'; process.env.STRIPE_WEBHOOK_SECRET = WH_SECRET
  const res = await stripeWebhook.POST(subscriptionEvent({ current_period_start: START, current_period_end: END }))
  assert.equal(res.status, 200)
  assert.equal(savedSub()!.current_period_start, iso(START))
  assert.equal(savedSub()!.current_period_end, iso(END))
  assert.equal(savedSub()!.tutor_id, A)
})

test('stripe webhook: the dates on the subscription items (newer API) are read from there', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'; process.env.STRIPE_WEBHOOK_SECRET = WH_SECRET
  const res = await stripeWebhook.POST(subscriptionEvent({ items: { data: [{ current_period_start: START, current_period_end: END }] } }))
  assert.equal(res.status, 200)
  assert.equal(savedSub()!.current_period_start, iso(START))
  assert.equal(savedSub()!.current_period_end, iso(END))
})

test('stripe webhook: an event with no dates does not crash; it is saved, logged, and keeps the dates it already has', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'; process.env.STRIPE_WEBHOOK_SECRET = WH_SECRET
  const warn = mock.method(console, 'warn', () => {})
  try {
    const first = await stripeWebhook.POST(subscriptionEvent({}))
    assert.equal(first.status, 200, 'not a 500 that Stripe would send again')
    assert.ok(savedSub(), 'the subscription is saved')
    assert.equal(savedSub()!.current_period_end, undefined)
    assert.equal(warn.mock.calls.length, 1)
    assert.match(String(warn.mock.calls[0].arguments.join(' ')), /evt_sub_1.*sub_1/)

    await stripeWebhook.POST(subscriptionEvent({ current_period_start: START, current_period_end: END }, 'customer.subscription.updated'))
    const later = await stripeWebhook.POST(subscriptionEvent({ status: 'past_due' }, 'customer.subscription.updated'))
    assert.equal(later.status, 200)
    assert.equal(savedSub()!.status, 'past_due')
    assert.equal(savedSub()!.current_period_end, iso(END), 'an update without dates does not wipe the dates')
    assert.equal(db.tables.student_subscriptions.length, 1)
  } finally {
    warn.mock.restore()
  }
})

test('stripe webhook: a wrong signature is still refused', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'; process.env.STRIPE_WEBHOOK_SECRET = WH_SECRET
  const body = JSON.stringify({ id: 'evt_x', object: 'event', type: 'customer.subscription.created', data: { object: {} } })
  const header = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_another_secret_entirely_0123456789' })
  const res = await stripeWebhook.POST(new NextRequest('https://www.tutafy.test/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': header }, body }))
  assert.equal(res.status, 400)
  assert.equal((db.tables.student_subscriptions ?? []).length, 0, 'nothing was saved')
})

// ---- 6. the register of every file that uses the server's key ------------------------------------------------------------------------

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = path.join(dir, name)
    return statSync(full).isDirectory() ? filesUnder(full) : [full]
  })
}
const usingTheKey = filesUnder(path.join(SRC, 'app'))
  .filter(f => /\.(ts|tsx)$/.test(f))
  .filter(f => /createAdminClient/.test(readFileSync(f, 'utf8')))
  .map(f => path.relative(ROOT, f).split(path.sep).join('/'))
  .sort()

test('every file under src/app that uses the server\'s key has an entry in tests/support/server-key-registry.ts saying why it is safe', () => {
  const missing = usingTheKey.filter(f => !(f in SERVER_KEY_FILES))
  assert.deepEqual(missing, [], 'read each of these files, check it proves the caller owns what it touches, then add it to the register with the reason')
})

test('the register names no file that has stopped using the server\'s key, and every reason says who may call and what stops them', () => {
  const stale = Object.keys(SERVER_KEY_FILES).filter(f => !usingTheKey.includes(f))
  assert.deepEqual(stale, [], 'remove these from the register')
  for (const [file, reason] of Object.entries(SERVER_KEY_FILES)) {
    assert.ok(reason.length >= 30, `${file}: a real reason, not a word`)
    assert.doesNotMatch(reason, /\b(todo|tbd|fixme)\b/i, file)
  }
})

test('the file that opens the client is not in the register by mistake, and the register is not empty', () => {
  assert.ok(usingTheKey.length >= 60, `found ${usingTheKey.length} files; the register covers the whole of src/app`)
  assert.ok(!('src/lib/supabase/server.ts' in SERVER_KEY_FILES))
})
