// T-0675: a tutor chooses which lesson lengths they take. The REAL code runs here, not a copy of it:
//   - src/lib/lesson-durations.ts (what is shown, what is accepted, what Settings writes),
//   - the REAL POST /api/bookings (a length the tutor did not tick is refused, whatever the browser sends),
//   - the REAL booking pages (/book/<slug>, /book/<slug>/<member>, /embed/<slug>) rendered to HTML with a fake
//     database, counting the length buttons a student would see and which one is selected first.
// The numbers of the migration (018) are tried on a throwaway Postgres in tests/lesson-durations-migration.test.ts.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

let db: FakeDb
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => db,
    createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: null } }) } }),
  },
})
mock.module('next/navigation', {
  namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, useRouter: () => ({ push() {}, replace() {} }), useSearchParams: () => new URLSearchParams() },
})

const lib = await import('@/lib/lesson-durations.ts')
const bookings = await import('@/app/api/bookings/route.ts')
const bookPage = (await import('@/app/book/[slug]/page.tsx')).default
const memberPage = (await import('@/app/book/[slug]/[member]/page.tsx')).default
const embedPage = (await import('@/app/embed/[slug]/page.tsx')).default

// ---- the pure rules ---------------------------------------------------------------------------

test('a tutor who chose nothing keeps all four lengths and 60 first (nothing changes for them)', () => {
  for (const raw of [null, undefined, [], [7, 12, 250], [0, -30, 62.5], ['x', null, true], 'x', {}]) {
    assert.deepEqual(lib.resolveDurationConfig(raw, null), { durations: [30, 45, 60, 90], defaultDuration: 60 }, JSON.stringify(raw))
  }
})

test('the chosen lengths are shown in order, each once, and anything that is not a length (10 to 240, steps of 5) is dropped', () => {
  assert.deepEqual(lib.resolveDurationConfig([90, 30, 30, 15, 45], 30).durations, [15, 30, 45, 90], '15 is a length now (T-0700)')
  assert.deepEqual(lib.resolveDurationConfig([90, 30, 7, 12, 250, 5, 245], 30).durations, [30, 90])
  assert.deepEqual(lib.resolveDurationConfig(['60', 45], null).durations, [45, 60])
})

test('the default is the tutor’s pick when it is a chosen length, else 60, else the first chosen', () => {
  assert.equal(lib.resolveDurationConfig([30, 45, 60], 45).defaultDuration, 45)
  assert.equal(lib.resolveDurationConfig([30, 45, 60], 90).defaultDuration, 60, 'a default that is not chosen is ignored')
  assert.equal(lib.resolveDurationConfig([30, 45, 60], null).defaultDuration, 60)
  assert.equal(lib.resolveDurationConfig([45, 90], null).defaultDuration, 45, 'no 60 among them: the first one')
  assert.equal(lib.resolveDurationConfig([45, 90], 60).defaultDuration, 45)
})

test('the server accepts the four ordinary lengths from a tutor who chose nothing, a custom one from them never, and only the chosen ones from one who did', () => {
  for (const d of [30, 45, 60, 90]) assert.equal(lib.durationAccepted(null, d), true, String(d))
  for (const d of [20, 75, 120, 10, 240, 5, 0]) assert.equal(lib.durationAccepted(null, d), false, 'a custom length is not offered to a tutor who did not choose it: ' + d)
  assert.equal(lib.durationAccepted([], 90), true)
  assert.equal(lib.durationAccepted([], 75), false)
  assert.equal(lib.durationAccepted(undefined, 75), false)
  assert.equal(lib.durationAccepted([30, 60], 60), true)
  assert.equal(lib.durationAccepted([30, 60], '60'), true, 'the browser may send a string')
  assert.equal(lib.durationAccepted([30, 60], 90), false)
  assert.equal(lib.durationAccepted([30, 60], 45), false)
  assert.equal(lib.durationAccepted([30, 60], 0), false)
  assert.equal(lib.durationAccepted([30, 60], undefined), false)
})

test('the sentence beside the booking page lists the real lengths', () => {
  assert.equal(lib.describeDurations([30, 45, 60, 90]), '30, 45, 60 or 90 min sessions', 'the old wording, word for word')
  assert.equal(lib.describeDurations([30, 60]), '30 or 60 min sessions')
  assert.equal(lib.describeDurations([45, 60, 90]), '45, 60 or 90 min sessions')
  assert.equal(lib.describeDurations([60]), '60 min sessions')
})

test('Settings: the last ticked length cannot be unticked, and the default follows a removed tick', () => {
  const all = lib.resolveDurationConfig(null, null)
  const noNinety = lib.toggleDuration(all, 90)
  assert.deepEqual(noNinety.durations, [30, 45, 60])
  assert.deepEqual(lib.toggleDuration(noNinety, 90).durations, [30, 45, 60, 90], 'ticking it again puts it back in order')
  let only = lib.toggleDuration(lib.toggleDuration(lib.toggleDuration(all, 30), 45), 90)
  assert.deepEqual(only.durations, [60])
  assert.deepEqual(lib.toggleDuration(only, 60), only, 'the last one stays')
  // default follows
  const picked = lib.chooseDefault(all, 45)
  assert.equal(picked.defaultDuration, 45)
  assert.equal(lib.toggleDuration(picked, 45).defaultDuration, 60, '45 unticked: back to 60')
  const sixtyLess = lib.toggleDuration(lib.toggleDuration(lib.toggleDuration(lib.chooseDefault(all, 90), 30), 45), 60)
  assert.deepEqual(sixtyLess, { durations: [90], defaultDuration: 90 })
  assert.deepEqual(lib.toggleDuration(all, 12), all, 'a length that is not a length is refused')
  assert.deepEqual(lib.toggleDuration(all, 250), all)
  assert.deepEqual(lib.toggleDuration(all, 120).durations, [30, 45, 60, 90, 120], '120 is a length (T-0700): it is added in order')
})

test('Settings: a default that is not ticked is refused', () => {
  const some = lib.resolveDurationConfig([30, 60], 30)
  assert.deepEqual(lib.chooseDefault(some, 90), some)
  assert.equal(lib.chooseDefault(some, 60).defaultDuration, 60)
})

test('Settings writes the two columns only when the tutor changed them, and always in clean form', () => {
  const none = lib.resolveDurationConfig(null, null)
  assert.equal(lib.durationColumnsToSave(none, none), null, 'untouched: a tutor who chose nothing stays that way')
  assert.deepEqual(lib.durationColumnsToSave(none, lib.toggleDuration(none, 90)), { lesson_durations: [30, 45, 60], default_lesson_duration: 60 })
  const saved = lib.resolveDurationConfig([30, 60], 30)
  assert.equal(lib.durationColumnsToSave(saved, { ...saved }), null)
  assert.deepEqual(lib.durationColumnsToSave(saved, lib.chooseDefault(saved, 60)), { lesson_durations: [30, 60], default_lesson_duration: 60 })
  assert.deepEqual(lib.durationColumnsToSave(null, { durations: [90, 30, 7] as number[], defaultDuration: 7 }), { lesson_durations: [30, 90], default_lesson_duration: 30 })
})

// ---- the database may not have the columns yet --------------------------------------------------

test('a database without the columns (migration 018 not applied) means "chose nothing", never an error', async () => {
  const asks: string[] = []
  const missing = { from: () => ({ select: (cols: string) => { asks.push(cols); return { eq: () => ({ single: async () => ({ data: null, error: { message: 'column tutors.lesson_durations does not exist' } }) }) } } }) }
  assert.deepEqual(await lib.loadChosenDurations(missing, 'T'), { lesson_durations: null, default_lesson_duration: null })
  assert.deepEqual(asks, ['lesson_durations, default_lesson_duration'], 'only the two new columns are asked for, apart from the tutor query')
  const throwing = { from: () => { throw new Error('network down') } }
  assert.deepEqual(await lib.loadChosenDurations(throwing, 'T'), { lesson_durations: null, default_lesson_duration: null })
})

// ---- the real booking route ---------------------------------------------------------------------

const T_NONE = '10000000-0000-4000-8000-0000000000a1' // chose nothing
const T_SOME = '10000000-0000-4000-8000-0000000000b2' // 30 and 60, 30 first
const T_ONE = '10000000-0000-4000-8000-0000000000c3' // only 45
const base = { subscription_status: 'free', booking_url_active: true, currency: 'USD', default_lesson_price: 25, timezone: 'UTC', languages: [], cancellation_hours: 24, buffer_minutes: 0 }

beforeEach(() => {
  db = createFakeDb({
    tutors: [
      { id: T_NONE, name: 'Tutor None', slug: 'tutor-none', ...base },
      { id: T_SOME, name: 'Tutor Some', slug: 'tutor-some', ...base, lesson_durations: [30, 60], default_lesson_duration: 30 },
      { id: T_ONE, name: 'Tutor One', slug: 'tutor-one', ...base, lesson_durations: [45], default_lesson_duration: 45 },
    ],
    team_members: [
      { id: 'm1', owner_id: T_SOME, name: 'Member Mia', slug: 'mia', bio: null, avatar_url: null, timezone: 'UTC', active: true, booking_url_active: true },
    ],
    // a tutor with no open hours shows a waiting list instead of the length buttons, so every tutor has some
    availability: [T_NONE, T_SOME, T_ONE].map((tutor_id, i) => ({ id: 'a' + i, tutor_id, team_member_id: null, day_of_week: 1, start_time: '09:00', end_time: '17:00' }))
      .concat([{ id: 'am', tutor_id: T_SOME, team_member_id: 'm1', day_of_week: 2, start_time: '09:00', end_time: '17:00' }]),
  }, { students: { portal_token: () => `portal-${randomUUID()}` } })
  delete process.env.RESEND_API_KEY
})

let n = 0
function book(tutorId: string, duration: unknown, extra: Record<string, unknown> = {}) {
  n++
  return bookings.POST(new Request('https://www.tutafy.test/api/bookings', {
    method: 'POST', headers: { host: 'www.tutafy.test', 'x-forwarded-proto': 'https' },
    body: JSON.stringify({ tutorId, date: '2030-01-07', time: `${String(7 + (n % 12)).padStart(2, '0')}:00`, duration, name: `Student ${n}`, email: `student${n}@example.com`, ...extra }),
  }))
}
const lessons = () => db.tables.lessons ?? []

test('POST /api/bookings: a length the tutor ticked books a lesson of that length', async () => {
  const res = await book(T_SOME, 30)
  assert.equal(res.status, 200)
  assert.equal(lessons().length, 1)
  assert.equal(lessons()[0].duration_minutes, 30)
})

test('POST /api/bookings: a length the tutor did not tick is refused (400) and nothing is saved, even if the browser sends it', async () => {
  for (const bad of [90, 45, '90', 5]) {
    const res = await book(T_SOME, bad)
    assert.equal(res.status, 400, String(bad))
    assert.match((await res.json()).error, /does not offer lessons of that length/)
  }
  assert.equal(lessons().length, 0, 'no lesson, no student')
  assert.equal((db.tables.students ?? []).length, 0)
  assert.equal((await book(T_ONE, 60)).status, 400)
  assert.equal((await book(T_ONE, 45)).status, 200)
})

test('POST /api/bookings: a tutor who chose nothing still takes every length (unchanged behaviour)', async () => {
  for (const d of [30, 45, 60, 90]) assert.equal((await book(T_NONE, d)).status, 200, String(d))
  assert.equal(lessons().length, 4)
})

test('POST /api/bookings: the check applies to a team member’s booking too, and is on the tutor whose id is sent', async () => {
  assert.equal((await book(T_SOME, 90, { teamMemberId: 'm1' })).status, 400)
  assert.equal((await book(T_SOME, 60, { teamMemberId: 'm1' })).status, 200)
  // asking with another tutor's id does not borrow that tutor's list
  assert.equal((await book(T_NONE, 90)).status, 200)
})

// ---- the real booking pages ---------------------------------------------------------------------

/** The length buttons a student sees: [{ minutes, selected }] in page order. */
function lengthButtons(html: string) {
  const start = html.indexOf('Session length')
  assert.ok(start >= 0, 'the page has the "Session length" block')
  const block = html.slice(start, html.indexOf('</div></div>', start))
  return [...block.matchAll(/<button type="button" class="([^"]*)">(\d+) min<\/button>/g)]
    .map(m => ({ minutes: Number(m[2]), selected: m[1].includes('bg-indigo-500') }))
}
type Page = (props: { params: Promise<Record<string, string>> }) => Promise<React.ReactElement>
const render = async (page: unknown, params: Record<string, string>) =>
  renderToStaticMarkup(await (page as Page)({ params: Promise.resolve(params) }))

test('the button reader itself: it finds buttons, tells the selected one, and is not fooled by an empty block', () => {
  const html = '<p>Session length</p><div><button type="button" class="a bg-indigo-500 text-white">30 min</button><button type="button" class="a bg-gray-100">60 min</button></div></div>'
  assert.deepEqual(lengthButtons(html), [{ minutes: 30, selected: true }, { minutes: 60, selected: false }])
  assert.deepEqual(lengthButtons('<p>Session length</p><div></div></div>'), [])
})

test('/book/<slug>: a tutor who ticked 30 and 60 shows exactly those two, 30 selected first, and says so beside the page', async () => {
  const html = await render(bookPage, { slug: 'tutor-some' })
  assert.deepEqual(lengthButtons(html), [{ minutes: 30, selected: true }, { minutes: 60, selected: false }])
  assert.match(html, /30 or 60 min sessions/)
  assert.doesNotMatch(html, /30, 45, 60 or 90 min sessions/)
})

test('/book/<slug>: a tutor who chose nothing still shows all four, 60 selected (same as before)', async () => {
  const html = await render(bookPage, { slug: 'tutor-none' })
  assert.deepEqual(lengthButtons(html), [{ minutes: 30, selected: false }, { minutes: 45, selected: false }, { minutes: 60, selected: true }, { minutes: 90, selected: false }])
  assert.match(html, /30, 45, 60 or 90 min sessions/)
})

test('/book/<slug>: a tutor with one length shows that one', async () => {
  assert.deepEqual(lengthButtons(await render(bookPage, { slug: 'tutor-one' })), [{ minutes: 45, selected: true }])
})

test('the embedded widget /embed/<slug> follows the same choice', async () => {
  assert.deepEqual(lengthButtons(await render(embedPage, { slug: 'tutor-some' })), [{ minutes: 30, selected: true }, { minutes: 60, selected: false }])
  assert.equal(lengthButtons(await render(embedPage, { slug: 'tutor-none' })).length, 4)
})

test('a team member’s page /book/<slug>/<member> follows the owning tutor’s choice', async () => {
  const html = await render(memberPage, { slug: 'tutor-some', member: 'mia' })
  assert.deepEqual(lengthButtons(html), [{ minutes: 30, selected: true }, { minutes: 60, selected: false }])
  assert.match(html, /30 or 60 min sessions/)
})

test('the pages still open when the database has no such columns (the tutor query is not touched)', async () => {
  // the fake database answers every column; the real one answers an error when the two new columns are asked for
  const real = db
  db = {
    ...real,
    from: (t: string) => {
      const q = real.from(t) as ReturnType<FakeDb['from']>
      if (t !== 'tutors') return q
      return { ...q, select: (cols?: string, opts?: unknown) => /lesson_durations/.test(cols ?? '')
        ? { eq: () => ({ single: async () => ({ data: null, error: { message: 'column tutors.lesson_durations does not exist' } }) }) }
        : q.select(cols, opts) }
    },
  } as FakeDb
  const html = await render(bookPage, { slug: 'tutor-some' })
  assert.equal(lengthButtons(html).length, 4, 'chose-nothing view, no crash, not a 404')
  assert.equal((await book(T_SOME, 90)).status, 200, 'and the booking route does not refuse for a column it cannot read')
})

// ---- Settings (a client page the test runner cannot run, so this part reads its text; the clicks are checked in a real browser) ----


const settings = readFileSync(path.join(SRC, 'app/(dashboard)/settings/page.tsx'), 'utf8').split('\r\n').join('\n')

test('Settings source: the lengths stay out of the main update (their columns may not exist yet) and go through the clean-up and the changed-only rule', () => {
  assert.match(settings, /const \{ currency, lesson_durations, default_lesson_duration, hide_branding, \.\.\.rest \} = form/)
  assert.match(settings, /durationColumnsToSave\(/)
  assert.match(settings, /supabase\.from\('tutors'\)\.update\(lengthColumns\)\.eq\('id', user\.id\)/, 'the update names the signed-in tutor’s own row')
  assert.match(settings, /ALL_DURATIONS\.map\(d =>/, 'one tick for each of the four lengths')
  assert.match(settings, /toggleDuration\(/)
  assert.match(settings, /chooseDefault\(/)
})
