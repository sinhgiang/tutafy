// T-0700: a tutor types lesson lengths of their own (20, 75, 120 ...) next to 30, 45, 60 and 90, and they work everywhere.
// The REAL code runs here: src/lib/lesson-durations.ts and src/lib/booking-slots.ts, the REAL POST /api/bookings (with the mail
// service replaced by a recorder, so nothing is sent), and the REAL pages /book/<slug>, /book/<slug>/<member>, /embed/<slug> and
// /tutors/<slug> rendered to HTML with a fake database. The database check of migration 018 is tried on a throwaway Postgres in
// tests/lesson-durations-migration.test.ts. Settings and the lesson forms are client pages the test runner cannot click, so those
// parts run their real helpers and the components that can be rendered; the clicks were done in a real browser (the report says so).
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

type Sent = { to: string; subject: string; html: string }
const sent: Sent[] = []
mock.module('resend', { exports: { Resend: class { emails = { send: async (m: Sent) => { sent.push(m); return { data: { id: 'x' }, error: null } } } } } })

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
const slots = await import('@/lib/booking-slots.ts')
const bookings = await import('@/app/api/bookings/route.ts')
const bookPage = (await import('@/app/book/[slug]/page.tsx')).default
const memberPage = (await import('@/app/book/[slug]/[member]/page.tsx')).default
const embedPage = (await import('@/app/embed/[slug]/page.tsx')).default
const profilePage = (await import('@/app/tutors/[slug]/page.tsx')).default
const { DurationPicker } = await import('@/components/lessons/DurationPicker.tsx')
const { buildFirstStudent } = await import('@/lib/first-student.ts')

// ---- what a length is -----------------------------------------------------------------------------------------------

test('a length is a whole number of minutes from 10 to 240, a multiple of 5', () => {
  for (const ok of [10, 15, 20, 30, 45, 60, 75, 90, 120, 235, 240]) assert.equal(lib.isValidLength(ok), true, String(ok))
  for (const bad of [0, 5, 9, 12, 77, 241, 245, 250, 1440, -30, 62.5, NaN, Infinity, '75', null, undefined, true, [75], {}]) assert.equal(lib.isValidLength(bad), false, String(bad))
  assert.deepEqual([lib.MIN_DURATION, lib.MAX_DURATION, lib.DURATION_STEP, lib.MAX_DURATIONS], [10, 240, 5, 6])
})

test('the server refuses a list with a length out of range, off the step, repeated, too many, empty or not a number', () => {
  assert.deepEqual(lib.checkDurations([20, 75, 120]), { ok: true, value: [20, 75, 120] })
  assert.deepEqual(lib.checkDurations([120, 20, 75]), { ok: true, value: [20, 75, 120] }, 'saved in order')
  assert.deepEqual(lib.checkDurations([10, 20, 30, 40, 50, 240]), { ok: true, value: [10, 20, 30, 40, 50, 240] }, 'six is the most, and both ends of the range')
  const refused: [string, unknown, RegExp][] = [
    ['too short', [5], /from 10 to 240/], ['too short next to a good one', [30, 9], /from 10 to 240/], ['too long', [245], /from 10 to 240/],
    ['a day', [1440], /from 10 to 240/], ['zero', [0], /from 10 to 240/], ['negative', [-30], /from 10 to 240/],
    ['off the step', [12], /steps of 5/], ['a fraction', [62.5], /whole number/], ['text', ['75'], /whole number/], ['null inside', [30, null], /whole number/],
    ['the same twice', [75, 75], /twice/], ['the same twice, apart', [30, 75, 60, 75], /twice/],
    ['seven', [10, 20, 30, 40, 50, 60, 70], /up to 6/], ['none', [], /at least one/], ['not a list', 75, /at least one/], ['nothing', null, /at least one/],
  ]
  for (const [why, raw, message] of refused) {
    const r = lib.checkDurations(raw)
    assert.equal(r.ok, false, why)
    assert.match((r as { error: string }).error, message, why)
  }
})

test('what is read from the database is cleaned the same way: only real lengths, each once, in order, at most six', () => {
  assert.deepEqual(lib.cleanDurations([120, 20, 75, 75, 7, 12, 250, '45', null, true, '']), [20, 45, 75, 120])
  assert.equal(lib.cleanDurations([10, 20, 30, 40, 50, 60, 70, 80]).length, 6)
  assert.equal(lib.chosenDurations([7, 12]), null, 'nothing valid is "chose nothing"')
  assert.deepEqual(lib.resolveDurationConfig([20, 75, 120], 75), { durations: [20, 75, 120], defaultDuration: 75 }, '"Length selected first" can be a custom one')
  assert.deepEqual(lib.resolveDurationConfig([20, 75, 120], 60), { durations: [20, 75, 120], defaultDuration: 20 }, 'not among them: the first')
})

test('the Custom box: 75 is added in order; text, out of range, off the step, repeats and a seventh are each refused with a sentence', () => {
  const start = lib.resolveDurationConfig(null, null)
  const added = lib.addCustomDuration(start, '75')
  assert.deepEqual(added, { config: { durations: [30, 45, 60, 75, 90], defaultDuration: 60 }, error: null })
  assert.deepEqual(lib.addCustomDuration(added.config, ' 20 ').config.durations, [20, 30, 45, 60, 75, 90], 'spaces are fine')
  for (const [text, message] of [
    ['', /whole number/], ['abc', /whole number/], ['7.5', /whole number/], ['-30', /whole number/], ['1e2', /whole number/], ['7 5', /whole number/],
    ['5', /10 to 240/], ['245', /10 to 240/], ['1000', /10 to 240/], ['12', /multiple of 5/], ['77', /multiple of 5/], ['60', /already in your list/],
  ] as const) {
    const r = lib.addCustomDuration(start, text)
    assert.match(r.error ?? '', message, `"${text}"`)
    assert.deepEqual(r.config, start, `"${text}" changed nothing`)
  }
  const six = lib.resolveDurationConfig([10, 20, 30, 40, 50, 60], 60)
  assert.match(lib.addCustomDuration(six, '75').error ?? '', /up to 6/)
  assert.deepEqual(lib.toggleDuration(six, 15), six, 'a seventh cannot be ticked either (15 would sort before 60 and push it out if it were let in)')
})

test('a custom length is removed with the x, the last one stays, and the default follows a removed one', () => {
  const some = lib.resolveDurationConfig([30, 75], 75)
  assert.deepEqual(lib.toggleDuration(some, 75), { durations: [30], defaultDuration: 30 })
  assert.deepEqual(lib.toggleDuration(lib.resolveDurationConfig([75], 75), 75), { durations: [75], defaultDuration: 75 }, 'the only one stays')
  assert.deepEqual(lib.chooseDefault(some, 75).defaultDuration, 75)
  assert.deepEqual(lib.chooseDefault(some, 60), some, 'a default that is not in the list is refused')
})

test('Settings saves a custom length: the two columns carry it, only when it changed', () => {
  const none = lib.resolveDurationConfig(null, null)
  const withSeventyFive = lib.addCustomDuration(none, '75').config
  assert.deepEqual(lib.durationColumnsToSave(none, withSeventyFive), { lesson_durations: [30, 45, 60, 75, 90], default_lesson_duration: 60 })
  assert.equal(lib.durationColumnsToSave(withSeventyFive, { ...withSeventyFive }), null)
  assert.deepEqual(lib.durationColumnsToSave(withSeventyFive, lib.chooseDefault(withSeventyFive, 75)), { lesson_durations: [30, 45, 60, 75, 90], default_lesson_duration: 75 })
})

test('the sentence beside the booking page and the profile lists custom lengths too', () => {
  assert.equal(lib.describeDurations([20, 75, 120]), '20, 75 or 120 min sessions')
  assert.equal(lib.describeDurations([75]), '75 min sessions')
  assert.equal(lib.describeDurations([30, 45, 60, 90]), '30, 45, 60 or 90 min sessions', 'the old wording, word for word')
})

test('a booking asks for a real length whatever the tutor chose: 75 is one, 12, 250, 0, text and a fraction are not', () => {
  assert.equal(lib.requestedLength(75), 75)
  assert.equal(lib.requestedLength('75'), 75, 'a browser may send text')
  for (const bad of [12, 250, 5, 0, -75, 75.5, '75abc', '7 5', '', null, undefined, true, [75], {}, '1e2', '0x4B']) assert.equal(lib.requestedLength(bad), null, JSON.stringify(bad))
})

test('the new-lesson and edit-lesson buttons: the five they always had, the tutor’s own lengths, and a lesson’s own odd length', () => {
  assert.deepEqual(lib.lessonLengthOptions(null, '60'), [30, 45, 60, 90, 120])
  assert.deepEqual(lib.lessonLengthOptions([20, 75], '60'), [20, 30, 45, 60, 75, 90, 120])
  assert.deepEqual(lib.lessonLengthOptions(null, '50'), [30, 45, 50, 60, 90, 120], 'a lesson imported with 50 keeps its 50 when opened')
  assert.deepEqual(lib.lessonLengthOptions(null, 'abc'), [30, 45, 60, 90, 120])
})

// ---- free times and the buffer --------------------------------------------------------------------------------------

test('free times: a 75-minute lesson steps by 75 plus the buffer, and the whole lesson must fit before the hours end', () => {
  const monday = [{ day_of_week: 1, start_time: '09:00:00', end_time: '12:00:00' }]
  const day = '2030-01-07' // a Monday
  assert.deepEqual(slots.getSlots(monday, day, 75, 0), ['09:00', '10:15'], '11:30 + 75 = 12:45: too late')
  assert.deepEqual(slots.getSlots(monday, day, 75, 10), ['09:00', '10:25'], 'with a 10-minute buffer the step is 85')
  assert.deepEqual(slots.getSlots(monday, day, 20, 10), ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'], '20 min lessons, 30-minute step; the last ends at 11:50')
  assert.deepEqual(slots.getSlots(monday, day, 60, 0), ['09:00', '10:00', '11:00'], 'the old lengths are unchanged')
  assert.deepEqual(slots.getSlots(monday, day, 240, 0), [], 'longer than the free hours: nothing')
  assert.deepEqual(slots.getSlots(monday, '2030-01-08', 75), [], 'another weekday')
  assert.deepEqual(slots.getSlots(monday, '', 75), [])
})

test('the booking form uses that function and the chosen length for the free times', () => {
  const form = read('src/app/book/[slug]/BookingForm.tsx')
  assert.match(form, /import \{ getSlots \} from '@\/lib\/booking-slots'/)
  assert.match(form, /const slots = getSlots\(availability, date, duration, bufferMinutes\)/)
  assert.doesNotMatch(form, /function getSlots\(/, 'no second copy')
})

// ---- the real booking route -----------------------------------------------------------------------------------------

const T_CUSTOM = '10000000-0000-4000-8000-0000000000d1' // 20, 75 and 120; 75 first
const T_NONE = '10000000-0000-4000-8000-0000000000d2' // chose nothing
const T_TEAM = '10000000-0000-4000-8000-0000000000d3' // 75 only, with a team member
const base = { subscription_status: 'free', booking_url_active: true, currency: 'USD', default_lesson_price: 25, timezone: 'UTC', languages: ['English'], bio: 'Hello', cancellation_hours: 24, buffer_minutes: 10 }

beforeEach(() => {
  sent.length = 0
  db = createFakeDb({
    tutors: [
      { id: T_CUSTOM, name: 'Tutor Custom', email: 'custom@example.com', slug: 'tutor-custom', ...base, lesson_durations: [20, 75, 120], default_lesson_duration: 75 },
      { id: T_NONE, name: 'Tutor None', email: 'none@example.com', slug: 'tutor-none', ...base },
      { id: T_TEAM, name: 'Tutor Team', email: 'team@example.com', slug: 'tutor-team', ...base, lesson_durations: [75], default_lesson_duration: 75 },
    ],
    team_members: [{ id: 'm1', owner_id: T_TEAM, name: 'Member Mia', slug: 'mia', bio: null, avatar_url: null, timezone: 'UTC', active: true, booking_url_active: true }],
    availability: [T_CUSTOM, T_NONE, T_TEAM].map((tutor_id, i) => ({ id: 'a' + i, tutor_id, team_member_id: null, day_of_week: 1, start_time: '09:00', end_time: '17:00' }))
      .concat([{ id: 'am', tutor_id: T_TEAM, team_member_id: 'm1', day_of_week: 1, start_time: '09:00', end_time: '17:00' }]),
  }, { students: { portal_token: () => `portal-${randomUUID()}` } })
  process.env.RESEND_API_KEY = 're_test_key_for_tests'
})

let n = 0
function book(tutorId: string, duration: unknown, time = '10:00', extra: Record<string, unknown> = {}) {
  n++
  return bookings.POST(new Request('https://www.tutafy.test/api/bookings', {
    method: 'POST', headers: { host: 'www.tutafy.test', 'x-forwarded-proto': 'https' },
    body: JSON.stringify({ tutorId, date: '2030-01-07', time, duration, name: `Student ${n}`, email: `student${n}@example.com`, termsAgreed: true, ...extra }),
  }))
}
const lessons = () => (db.tables.lessons ?? []) as { starts_at: string; ends_at: string; duration_minutes: number; status: string; assigned_to: string | null }[]
const minutesBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 60000

test('POST /api/bookings: a 75-minute lesson is saved as 75 minutes, ends 75 minutes after it starts, and both mails say 75 minutes', async () => {
  const res = await book(T_CUSTOM, 75)
  assert.equal(res.status, 200)
  assert.equal(lessons().length, 1)
  assert.equal(lessons()[0].duration_minutes, 75)
  assert.equal(minutesBetween(lessons()[0].starts_at, lessons()[0].ends_at), 75, 'the end time in the calendar')
  assert.equal(sent.length, 2, 'a mail for the student and one for the tutor')
  for (const m of sent) {
    assert.match(m.html, />75 minutes</, m.to)
    assert.doesNotMatch(m.html, />(60|90|30) minutes</)
  }
})

test('POST /api/bookings: every custom length of the tutor is taken and saved exactly (20 and 120 too)', async () => {
  for (const [i, minutes] of [20, 120, 75].entries()) {
    const res = await book(T_CUSTOM, minutes, ['09:00', '12:00', '15:00'][i])
    assert.equal(res.status, 200, String(minutes))
  }
  assert.deepEqual(lessons().map(l => l.duration_minutes), [20, 120, 75])
  assert.deepEqual(lessons().map(l => minutesBetween(l.starts_at, l.ends_at)), [20, 120, 75])
})

test('POST /api/bookings: the length may arrive as text, and is saved as a number', async () => {
  assert.equal((await book(T_CUSTOM, '75')).status, 200)
  assert.equal(lessons()[0].duration_minutes, 75)
  assert.equal(typeof lessons()[0].duration_minutes, 'number')
})

test('POST /api/bookings: a length the tutor did not offer is refused, 60 included, and nothing is saved', async () => {
  for (const bad of [60, 30, 90, 45, 80, '60']) assert.equal((await book(T_CUSTOM, bad)).status, 400, String(bad))
  assert.equal(lessons().length, 0)
  assert.equal((db.tables.students ?? []).length, 0)
})

test('POST /api/bookings: whatever the tutor chose, a length that is not a length is refused', async () => {
  for (const tutor of [T_CUSTOM, T_NONE]) {
    for (const bad of [12, 250, 5, -75, 75.5, '75abc', 'x', true, [75], {}, 100000]) {
      const res = await book(tutor, bad)
      assert.equal(res.status, 400, `${tutor === T_NONE ? 'chose nothing' : 'custom'}: ${JSON.stringify(bad)}`)
    }
  }
  assert.equal(lessons().length, 0, 'no lesson ended before it started or ran for days')
  // a tutor who chose nothing takes the four ordinary lengths (unchanged) and refuses a custom one: their page does not offer it,
  // and, while the database still has the first version of 018, they cannot have chosen one
  for (const [d, time] of [[30, '09:00'], [45, '10:00'], [60, '11:00'], [90, '15:00']] as const) assert.equal((await book(T_NONE, d, time)).status, 200, String(d))
  for (const custom of [75, 20, 120, '75']) assert.equal((await book(T_NONE, custom, '13:00')).status, 400, 'custom length from a tutor who did not choose it: ' + custom)
  assert.equal(lessons().length, 4, 'only the four ordinary lessons were saved')
})

test('POST /api/bookings: a lesson that overlaps another is refused (409), one that only touches is taken', async () => {
  assert.equal((await book(T_CUSTOM, 75, '10:00')).status, 200) // 10:00 to 11:15
  assert.equal((await book(T_CUSTOM, 20, '10:45')).status, 409, 'starts inside the 75-minute lesson')
  assert.equal((await book(T_CUSTOM, 20, '10:00')).status, 409, 'same start (as before)')
  assert.equal((await book(T_CUSTOM, 120, '09:00')).status, 409, 'a 120-minute lesson that runs into it from before')
  assert.equal((await book(T_CUSTOM, 20, '09:40')).status, 200, '09:40 to 10:00 only touches')
  assert.equal((await book(T_CUSTOM, 20, '11:15')).status, 200, 'starts when the 75-minute lesson ends')
  assert.equal(lessons().length, 3)
})

test('POST /api/bookings: a cancelled lesson does not block, and a team member has their own calendar', async () => {
  assert.equal((await book(T_TEAM, 75, '10:00', { teamMemberId: 'm1' })).status, 200)
  assert.equal((await book(T_TEAM, 75, '10:30')).status, 200, 'the owner’s own calendar is free')
  assert.equal((await book(T_TEAM, 75, '10:30', { teamMemberId: 'm1' })).status, 409)
  lessons()[0].status = 'cancelled'
  assert.equal((await book(T_TEAM, 75, '10:30', { teamMemberId: 'm1' })).status, 200, 'the cancelled one no longer blocks')
})

// ---- what a student sees --------------------------------------------------------------------------------------------

/** The length buttons a student sees: [{ minutes, selected }] in page order. */
function lengthButtons(html: string) {
  const start = html.indexOf('aria-label="Lesson length"')
  assert.ok(start >= 0, 'the page has the "Lesson length" group')
  const block = html.slice(start, html.indexOf('</div>', start))
  return [...block.matchAll(/<button type="button" aria-pressed="(true|false)" class="[^"]*">(\d+) min<\/button>/g)]
    .map(m => ({ minutes: Number(m[2]), selected: m[1] === 'true' }))
}
type Page = (props: { params: Promise<Record<string, string>> }) => Promise<React.ReactElement>
const render = async (page: unknown, params: Record<string, string>) => renderToStaticMarkup(await (page as Page)({ params: Promise.resolve(params) }))
const SEVENTY_FIVE_FIRST = [{ minutes: 20, selected: false }, { minutes: 75, selected: true }, { minutes: 120, selected: false }]

test('/book/<slug>: the student sees 20, 75 and 120 only, 75 selected first, and the sentence beside it says so', async () => {
  const html = await render(bookPage, { slug: 'tutor-custom' })
  assert.deepEqual(lengthButtons(html), SEVENTY_FIVE_FIRST)
  assert.match(html, /20, 75 or 120 min sessions/)
  assert.doesNotMatch(html, /30, 45, 60 or 90/)
})

test('the embedded widget /embed/<slug> shows the same three, 75 first', async () => {
  assert.deepEqual(lengthButtons(await render(embedPage, { slug: 'tutor-custom' })), SEVENTY_FIVE_FIRST)
})

test('a team member’s page /book/<slug>/<member> shows the owner’s custom length', async () => {
  const html = await render(memberPage, { slug: 'tutor-team', member: 'mia' })
  assert.deepEqual(lengthButtons(html), [{ minutes: 75, selected: true }])
  assert.match(html, /75 min sessions/)
})

test('the public profile /tutors/<slug> lists the custom lengths in the same words', async () => {
  const html = await render(profilePage, { slug: 'tutor-custom' })
  assert.match(html, />20, 75 or 120 min sessions</)
  assert.doesNotMatch(html, /30, 45, 60 or 90/)
  assert.match(await render(profilePage, { slug: 'tutor-none' }), />30, 45, 60 or 90 min sessions</, 'a tutor who chose nothing keeps the old sentence')
})

test('/book/<slug> of a tutor who chose nothing is unchanged: four buttons, 60 first', async () => {
  assert.deepEqual(lengthButtons(await render(bookPage, { slug: 'tutor-none' })), [
    { minutes: 30, selected: false }, { minutes: 45, selected: false }, { minutes: 60, selected: true }, { minutes: 90, selected: false },
  ])
})

// ---- the tutor's own forms and the first-student card ---------------------------------------------------------------

test('the Duration row of the lesson forms: buttons for every offered length, the selected one marked, a Custom box with its rule', () => {
  const html = renderToStaticMarkup(createElement(DurationPicker, { value: '75', offered: [20, 75] }))
  const buttons = [...html.matchAll(/<button type="button" aria-pressed="(true|false)"[^>]*>(\d+) min<\/button>/g)].map(m => [Number(m[2]), m[1] === 'true'])
  assert.deepEqual(buttons, [[20, false], [30, false], [45, false], [60, false], [75, true], [90, false], [120, false]])
  assert.match(html, /placeholder="Custom, e\.g\. 75"/)
  assert.match(html, /10 to 240 minutes, in steps of 5\./)
  // a lesson already saved with an odd length keeps it
  assert.match(renderToStaticMarkup(createElement(DurationPicker, { value: '50', offered: null })), /aria-pressed="true"[^>]*>50 min</)
})

test('both lesson pages use that row and work the end time from the minutes', () => {
  for (const rel of ['src/app/(dashboard)/lessons/new/page.tsx', 'src/app/(dashboard)/lessons/[id]/edit/page.tsx']) {
    const src = read(rel)
    assert.match(src, /<DurationPicker value=\{form\.duration_minutes\} offered=\{offered\}/, rel)
    assert.doesNotMatch(src, /const DURATIONS = \[30, 45, 60, 90, 120\]/, `${rel}: no fixed list of five`)
    assert.match(src, /const endsAt|const end = new Date\(start\.getTime\(\) \+ dur \* 60 \* 1000\)/, rel)
    assert.match(src, /ends_at: (endsAt|end)\.toISOString\(\)/, rel)
    assert.match(src, /duration_minutes: dur/, rel)
    assert.match(src, /loadChosenDurations\(supabase, /, `${rel}: the tutor’s own lengths are asked for`)
  }
})

test('the first-student card counts a custom-only list as "lengths chosen"', () => {
  const facts = { tutorEmail: 't@example.com', plan: 'free', slug: 'tutor-x', studentEmails: [], availabilityRows: 0, lessonDurations: [75], cardLink: null, lessons: 0 }
  const lengths = buildFirstStudent(facts)?.steps.find(s => s.id === 'lengths')
  assert.equal(lengths?.done, true)
  assert.match(lengths?.hint ?? '', /your own/i, 'the hint tells the tutor they can type their own')
})

// ---- Settings (a client page: its real helpers run above; this part reads its text) --------------------------------------

const settings = read('src/app/(dashboard)/settings/page.tsx')

test('Settings source: the Custom box, the chips with an x, the rule shown, the check before saving', () => {
  assert.match(settings, /label htmlFor="custom-length"[^>]*>Custom length \(minutes\)</)
  assert.match(settings, /addCustomDuration\(\{ durations: form\.lesson_durations, defaultDuration: form\.default_lesson_duration \}, customLength\)/)
  assert.match(settings, /aria-label=\{`Remove \$\{d\} minutes`\}/, 'each custom length can be removed')
  assert.match(settings, /\{MIN_DURATION\} to \{MAX_DURATION\} minutes, in steps of \{DURATION_STEP\}\. Up to \{MAX_DURATIONS\} lengths in all\./)
  assert.match(settings, /role="alert"/, 'the sentence for a refused value is announced')
  const save = settings.slice(settings.indexOf('async function handleSave()'))
  assert.ok(save.indexOf('checkDurations(form.lesson_durations)') > 0 && save.indexOf('checkDurations(form.lesson_durations)') < save.indexOf('saveTutorSettings('), 'the list is checked before anything is written')
  assert.match(settings, /\{form\.lesson_durations\.map\(d => <SelectItem key=\{d\}/, '"Length selected first" offers every length, custom ones too')
})

// ---- every place, and no ICS ----------------------------------------------------------------------------------------

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = path.join(dir, name)
    return statSync(p).isDirectory() ? sourceFiles(p) : /\.(ts|tsx)$/.test(name) ? [p] : []
  })
}

test('no place keeps a fixed list of lengths any more, and the app has no calendar-file (ICS) feature to keep in step', () => {
  const offenders: string[] = []
  for (const f of sourceFiles(SRC)) {
    const text = readFileSync(f, 'utf8')
    if (/\[30, 45, 60, 90(, 120)?\]/.test(text) && !f.endsWith('lesson-durations.ts')) offenders.push(path.relative(ROOT, f))
    assert.doesNotMatch(text, /BEGIN:VCALENDAR|text\/calendar/, `${path.relative(ROOT, f)} writes a calendar file: it must use the lesson's minutes (add it to the table)`)
  }
  assert.deepEqual(offenders, [], 'a fixed list of lengths is written outside src/lib/lesson-durations.ts')
})

// ---- one run from start to finish -----------------------------------------------------------------------------------

test('END TO END: a tutor saves 75 minutes, the student sees it on all three pages, books it, and the lesson, the calendar time and the mails say 75', async () => {
  // 1. the tutor types 75 in Settings and saves: the real helpers decide what is written, and the write goes to the tutor's own row
  const fresh = '10000000-0000-4000-8000-0000000000e1'
  db.tables.tutors.push({ id: fresh, name: 'Tutor Fresh', email: 'fresh@example.com', slug: 'tutor-fresh', ...base })
  db.tables.availability.push({ id: 'af', tutor_id: fresh, team_member_id: null, day_of_week: 1, start_time: '09:00', end_time: '17:00' })
  const before = lib.resolveDurationConfig(null, null)
  const typed = lib.addCustomDuration(before, '75')
  assert.equal(typed.error, null)
  const picked = lib.chooseDefault(typed.config, 75)
  assert.equal(lib.checkDurations(picked.durations).ok, true)
  const columns = lib.durationColumnsToSave(before, picked)
  assert.deepEqual(columns, { lesson_durations: [30, 45, 60, 75, 90], default_lesson_duration: 75 })
  await db.from('tutors').update(columns!).eq('id', fresh)
  // 2. the student opens the three pages
  for (const page of [bookPage, embedPage]) {
    assert.deepEqual(lengthButtons(await render(page, { slug: 'tutor-fresh' })), [
      { minutes: 30, selected: false }, { minutes: 45, selected: false }, { minutes: 60, selected: false }, { minutes: 75, selected: true }, { minutes: 90, selected: false },
    ])
  }
  db.tables.team_members.push({ id: 'mf', owner_id: fresh, name: 'Member Fay', slug: 'fay', bio: null, avatar_url: null, timezone: 'UTC', active: true, booking_url_active: true })
  db.tables.availability.push({ id: 'amf', tutor_id: fresh, team_member_id: 'mf', day_of_week: 1, start_time: '09:00', end_time: '17:00' })
  assert.ok(lengthButtons(await render(memberPage, { slug: 'tutor-fresh', member: 'fay' })).some(b => b.minutes === 75 && b.selected))
  // 3. the free times for 75 minutes with the 10-minute buffer, on the booking date
  const hours = (db.tables.availability as { tutor_id: string; day_of_week: number; start_time: string; end_time: string }[]).filter(a => a.tutor_id === fresh)
  assert.deepEqual(slots.getSlots(hours, '2030-01-07', 75, 10).slice(0, 3), ['09:00', '10:25', '11:50'])
  // 4. the student books 75 minutes at the second free time
  const res = await book(fresh, 75, '10:25')
  assert.equal(res.status, 200)
  const lesson = lessons().find(l => l.duration_minutes === 75)!
  assert.ok(lesson, 'a lesson of 75 minutes')
  // 5. the calendar (Google Calendar and the lessons list read starts_at and ends_at), the emails and the API payload
  assert.equal(minutesBetween(lesson.starts_at, lesson.ends_at), 75)
  const start = new Date(lesson.starts_at)
  assert.equal(new Date(lesson.ends_at).getTime(), start.getTime() + 75 * 60000, 'ends exactly 75 minutes after it starts')
  assert.ok(sent.length === 2 && sent.every(m => />75 minutes</.test(m.html)))
  // 6. the next student cannot take a time inside it, and can take the time right after it
  assert.equal((await book(fresh, 30, '11:00')).status, 409)
  assert.equal((await book(fresh, 30, '11:40')).status, 200)
})
