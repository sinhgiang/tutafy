// T-0765: the public tutor profile /tutors/<slug>, variant A. The REAL code runs here:
//   - src/lib/tutor-profile.ts: the next free times (in the tutor's zone, then in the visitor's), the tutor's own terms, review helpers,
//   - src/lib/profile-data.ts: the two reads that need lessons, over an in-memory database,
//   - the REAL page rendered to HTML for the three states (full, new tutor, Free plan) and for a tutor whose page is off,
//   - the structured data (Person; Review only when there are real public reviews).
// Nothing here reaches a service. The names, prices and reviews are made up.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(SRC, rel), 'utf8').replace(/\r\n/g, '\n')

let db: FakeDb
let adminFails = false // the lessons cannot be read (the admin client answers for every table but `lessons`)
let noAdminKey = false // no admin key at all: the page cannot even read the tutor (T-0774)
let viewer: string | null = null // the signed-in account that opens the page
const adminReads: { table: string; cols: string }[] = []
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    // the admin client records what it is asked to read, so a test can say "only these columns, nothing else"
    createAdminClient: () => {
      if (noAdminKey) throw new Error('Supabase admin client is not configured')
      return { from: (table: string) => { if (adminFails && table === 'lessons') throw new Error('lessons cannot be read'); const q = db.from(table); return { select: (cols: string, o?: { head?: boolean }) => { adminReads.push({ table, cols }); return q.select(cols, o) } } } }
    },
    createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: viewer ? { id: viewer } : null } }) } }),
  },
})
mock.module('next/navigation', { namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, useRouter: () => ({ push() {}, replace() {} }), useSearchParams: () => new URLSearchParams() } })

const lib = await import('@/lib/tutor-profile.ts')
const { PROFILE_PAGE_COLUMNS } = await import('@/lib/public-tutor-columns.ts')
const data = await import('@/lib/profile-data.ts')
const seo = await import('@/lib/tutor-seo.ts')
const profile = (await import('@/app/tutors/[slug]/page.tsx'))
const page = profile.default as (p: { params: Promise<{ slug: string }> }) => Promise<React.ReactElement>
const { StickyBookBar, NextTimes, FreeTimesSection } = await import('@/components/profile/FreeTimes.tsx')

// Thursday 22 October 2026, 14:00 UTC: 10:00 in Toronto (UTC-4 until 1 November).
const NOW = new Date('2026-10-22T14:00:00Z')
const HOURS = [
  { day_of_week: 4, start_time: '09:00', end_time: '12:00' }, // Thursday
  { day_of_week: 5, start_time: '09:00:00', end_time: '11:00:00' }, // Friday, in the form Postgres gives a time column
]
const iso = (ms: number) => new Date(ms).toISOString()

// ---- time zones --------------------------------------------------------------------------------------------------------------------

test('wallToInstant: a clock reading in a zone becomes the right instant, summer and winter, half-hour zones, and the day the clocks change', () => {
  const at = (d: string, t: string, z: string) => iso(lib.wallToInstant(d, t, z))
  assert.equal(at('2026-10-22', '18:00', 'America/Toronto'), '2026-10-22T22:00:00.000Z', 'EDT is UTC-4')
  assert.equal(at('2026-12-01', '18:00', 'America/Toronto'), '2026-12-01T23:00:00.000Z', 'EST is UTC-5')
  assert.equal(at('2026-11-01', '18:00', 'America/Toronto'), '2026-11-01T23:00:00.000Z', 'the evening of the day the clocks went back')
  assert.equal(at('2026-10-22', '09:00', 'Europe/Berlin'), '2026-10-22T07:00:00.000Z')
  assert.equal(at('2026-10-22', '08:00', 'Asia/Kolkata'), '2026-10-22T02:30:00.000Z', 'UTC+5:30')
  assert.equal(at('2026-10-22', '09:00', 'UTC'), '2026-10-22T09:00:00.000Z')
})

test('safeZone: a zone the runtime knows is kept; blank, junk and non-text become UTC instead of breaking the page', () => {
  assert.equal(lib.safeZone('America/Toronto'), 'America/Toronto')
  for (const bad of ['', '  ', 'Mars/Phobos', 'not a zone', null, undefined, 42, {}]) assert.equal(lib.safeZone(bad), 'UTC', String(bad))
})

// ---- the next free times -----------------------------------------------------------------------------------------------------------

test('nextFreeSlots: the tutor\'s hours from now on, soonest first, in the tutor\'s zone, each with its true instant', () => {
  const s = lib.nextFreeSlots({ availability: HOURS, timezone: 'America/Toronto', durationMinutes: 60, now: NOW })
  // now is 10:00 in Toronto and a slot must start an hour from now: today only 11:00 is left
  assert.deepEqual(s.slice(0, 4).map(x => [x.date, x.time, x.at]), [
    ['2026-10-22', '11:00', '2026-10-22T15:00:00.000Z'],
    ['2026-10-23', '09:00', '2026-10-23T13:00:00.000Z'],
    ['2026-10-23', '10:00', '2026-10-23T14:00:00.000Z'],
    ['2026-10-29', '09:00', '2026-10-29T13:00:00.000Z'],
  ])
  const times = s.map(x => Date.parse(x.at))
  assert.deepEqual([...times].sort((a, b) => a - b), times, 'soonest first')
  assert.equal(new Set(s.map(x => x.at)).size, s.length, 'no time twice')
  assert.ok(times.every(t => t >= NOW.getTime() + 3600000), 'nothing that starts sooner than an hour from now')
})

test('nextFreeSlots: the lead time, the horizon and the count are limits, and a tutor with no hours has no times', () => {
  const zero = lib.nextFreeSlots({ availability: HOURS, timezone: 'America/Toronto', durationMinutes: 60, now: NOW, leadMinutes: 0 })
  assert.equal(zero[0].time, '10:00', 'with no lead time a slot that starts right now is offered')
  assert.equal(lib.nextFreeSlots({ availability: HOURS, timezone: 'America/Toronto', durationMinutes: 60, now: NOW, days: 1 }).length, 1, 'one day ahead: today only')
  assert.equal(lib.nextFreeSlots({ availability: HOURS, timezone: 'America/Toronto', durationMinutes: 60, now: NOW, maxSlots: 2 }).length, 2)
  assert.deepEqual(lib.nextFreeSlots({ availability: [], timezone: 'UTC', durationMinutes: 60, now: NOW }), [])
  assert.deepEqual(lib.nextFreeSlots({ availability: HOURS, timezone: 'UTC', durationMinutes: 0, now: NOW }), [], 'no length, no slots')
})

test('nextFreeSlots: the length and the buffer step the times the way the booking page does (getSlots)', () => {
  const s = lib.nextFreeSlots({ availability: [{ day_of_week: 5, start_time: '09:00', end_time: '11:00' }], timezone: 'UTC', durationMinutes: 30, bufferMinutes: 15, now: NOW, days: 2 })
  assert.deepEqual(s.map(x => x.time), ['09:00', '09:45', '10:30'], '30 minutes plus a 15 minute buffer: every 45, and the last must end by 11:00')
})

test('nextFreeSlots: days the tutor blocked are skipped', () => {
  const s = lib.nextFreeSlots({ availability: HOURS, timezone: 'America/Toronto', durationMinutes: 60, now: NOW, blockedDates: ['2026-10-23', '2026-10-29'] })
  assert.deepEqual([...new Set(s.map(x => x.date))].slice(0, 3), ['2026-10-22', '2026-10-30'], 'Thursdays and Fridays; the look-ahead is 14 days')
})

test('nextFreeSlots: a saved lesson takes its minutes (read the way the booking route saves it), touching is fine, a longer lesson takes more', () => {
  const lesson = (starts_at: string, rest: Record<string, unknown> = {}) => ({ starts_at, ...rest })
  const times = (busy: ReturnType<typeof lesson>[]) => lib.nextFreeSlots({ availability: HOURS, timezone: 'America/Toronto', durationMinutes: 60, now: NOW, busy, days: 3 }).map(x => `${x.date} ${x.time}`)
  // the booking route writes a lesson on Friday at 09:00 as 2026-10-23T09:00:00.000Z (the tutor's clock reading, as if UTC)
  assert.deepEqual(times([lesson('2026-10-23T09:00:00.000Z', { duration_minutes: 60 })]), ['2026-10-22 11:00', '2026-10-23 10:00'], '09:00 is taken, 10:00 touches it and stays')
  assert.deepEqual(times([lesson('2026-10-23T09:00:00.000Z', { duration_minutes: 75 })]), ['2026-10-22 11:00'], 'a 75 minute lesson also takes 10:00')
  assert.deepEqual(times([lesson('2026-10-23T08:30:00.000Z', { ends_at: '2026-10-23T09:30:00.000Z' })]), ['2026-10-22 11:00', '2026-10-23 10:00'], 'its own end time counts')
  assert.deepEqual(times([lesson('2026-10-23T09:00:00.000Z')]), ['2026-10-22 11:00', '2026-10-23 10:00'], 'no length saved: one hour')
  // the same overlap rule the booking route refuses with (a 409): a slot is hidden exactly when a booking would be refused
  const free = lib.nextFreeSlots({ availability: HOURS, timezone: 'America/Toronto', durationMinutes: 60, now: NOW, days: 2 })
  const busy = [lesson('2026-10-23T09:00:00.000Z', { duration_minutes: 60 })]
  for (const slot of free) {
    const naive = Date.parse(`${slot.date}T${slot.time}:00Z`)
    const refused = busy.some(l => Date.parse(l.starts_at) < naive + 3600000 && Date.parse(l.starts_at) + 3600000 > naive)
    const shown = lib.nextFreeSlots({ availability: HOURS, timezone: 'America/Toronto', durationMinutes: 60, now: NOW, busy, days: 2 }).some(x => x.at === slot.at)
    assert.equal(shown, !refused, `${slot.date} ${slot.time}`)
  }
})

test('nextFreeSlots: "today" is the tutor\'s today (a tutor ahead of UTC is already on the next day), and a bad zone counts as UTC', () => {
  // 14:00 UTC on Thursday is already 03:00 on Friday the 23rd in Auckland (UTC+13 in October)
  const auckland = lib.nextFreeSlots({ availability: [{ day_of_week: 5, start_time: '09:00', end_time: '10:00' }], timezone: 'Pacific/Auckland', durationMinutes: 60, now: NOW, days: 1 })
  assert.deepEqual(auckland.map(x => [x.date, x.time, x.at]), [['2026-10-23', '09:00', '2026-10-22T20:00:00.000Z']])
  const bad = lib.nextFreeSlots({ availability: HOURS, timezone: 'Mars/Phobos', durationMinutes: 60, now: NOW })
  assert.deepEqual(bad.slice(0, 2).map(x => x.at), ['2026-10-23T09:00:00.000Z', '2026-10-23T10:00:00.000Z'], 'UTC: today\'s hours are over, so Friday 09:00 UTC')
})

// ---- the visitor's own zone --------------------------------------------------------------------------------------------------------

const SLOT = { at: '2026-10-22T22:00:00.000Z', date: '2026-10-22', time: '18:00' } // 18:00 in Toronto

test('the same instant reads in each visitor\'s own zone and on their own calendar: Today, Tomorrow, or the weekday', () => {
  const label = (tz: string) => lib.nextLabel(SLOT, tz, NOW)
  assert.equal(label('America/New_York'), 'Today 6:00 PM')
  assert.equal(label('America/Los_Angeles'), 'Today 3:00 PM')
  assert.equal(label('Europe/Berlin'), 'Tomorrow 12:00 AM', 'midnight in Berlin is already tomorrow there')
  assert.equal(label('Asia/Tokyo'), 'Tomorrow 7:00 AM')
  assert.equal(lib.nextLabel({ at: '2026-10-27T13:00:00.000Z', date: '', time: '' }, 'America/New_York', NOW), 'Tue 9:00 AM')
  assert.equal(lib.nextLabel(undefined, 'UTC', NOW), null)
  for (const tz of ['America/New_York', 'Asia/Kolkata', 'Europe/Berlin']) assert.doesNotMatch(label(tz) ?? '', /[  ]/, 'a plain space, so the server and the browser print the same text')
})

test('groupSlots: grouped by the visitor\'s own day, at most so many days and so many times each', () => {
  const slots = lib.nextFreeSlots({ availability: HOURS, timezone: 'America/Toronto', durationMinutes: 60, now: NOW })
  const ny = lib.groupSlots(slots, 'America/New_York', NOW, 4, 6)
  assert.deepEqual(ny.map(d => [d.label, d.date, d.times.map(t => t.text)]), [
    ['Today', 'Oct 22', ['11:00 AM']], ['Tomorrow', 'Oct 23', ['9:00 AM', '10:00 AM']], ['Thu', 'Oct 29', ['9:00 AM', '10:00 AM', '11:00 AM']], ['Fri', 'Oct 30', ['9:00 AM', '10:00 AM']],
  ])
  assert.equal(lib.groupSlots(slots, 'America/New_York', NOW, 2, 6).length, 2)
  assert.deepEqual(lib.groupSlots(slots, 'America/New_York', NOW, 4, 1).map(d => d.times.length), [1, 1, 1, 1])
  // a visitor far to the east sees Toronto's morning on a different date than a visitor in New York
  const tokyo = lib.groupSlots(slots, 'Asia/Tokyo', NOW, 4, 6)
  assert.equal(tokyo[0].label, 'Tomorrow', 'it is Thursday 23:00 in Tokyo: the 11:00 Toronto slot is already Friday 00:00 there')
})

test('the text of a profile: first name, initials, joined month, bio paragraphs shown as text', () => {
  assert.equal(lib.firstNameOf('  Maya Reyes '), 'Maya')
  assert.equal(lib.firstNameOf(''), 'this tutor')
  assert.equal(lib.firstNameOf(null), 'this tutor')
  assert.equal(lib.initialsOf('maya reyes'), 'MR')
  assert.equal(lib.initialsOf('Priya'), 'P')
  assert.equal(lib.initialsOf('  '), 'T')
  assert.equal(lib.joinedLabel('2026-10-05T10:00:00Z'), 'October 2026')
  assert.equal(lib.joinedLabel('nonsense'), null)
  assert.equal(lib.joinedLabel(null), null)
  assert.deepEqual(lib.bioParagraphs('One.\r\n\r\n  Two\nstill two.\n\n\n'), ['One.', 'Two\nstill two.'])
  assert.deepEqual(lib.bioParagraphs('   '), [])
  assert.deepEqual(lib.bioParagraphs(undefined), [])
  assert.equal(lib.bioParagraphs(Array.from({ length: 30 }, (_, i) => `p${i}`).join('\n\n')).length, 8, 'at most eight paragraphs')
})

test('priceLabel and hasTrial: a price above zero in the tutor\'s currency, whole when whole; nothing for blank, zero or text', () => {
  assert.equal(lib.priceLabel(40, 'USD'), '$40')
  assert.equal(lib.priceLabel('22.5', 'USD'), '$22.50')
  assert.equal(lib.priceLabel(35, 'EUR'), '€35')
  assert.equal(lib.priceLabel(35, null), '$35', 'no currency chosen: USD, like the booking page')
  for (const none of [0, '0', '', null, undefined, 'abc', -5, NaN]) assert.equal(lib.priceLabel(none, 'USD'), null, String(none))
  assert.equal(lib.hasTrial({ trial_enabled: true, trial_price: 10 }), true)
  assert.equal(lib.hasTrial({ trial_enabled: true, trial_price: 0 }), false)
  assert.equal(lib.hasTrial({ trial_enabled: false, trial_price: 10 }), false)
  assert.equal(lib.hasTrial({ trial_enabled: null, trial_price: 10 }), false)
})

test('profileNotes: the tutor\'s OWN terms, not a list every profile shares', () => {
  const t = { name: 'Maya Reyes', cancellation_hours: 24, trial_enabled: true, trial_price: 10, currency: 'USD' }
  const ids = (n: ReturnType<typeof lib.profileNotes>) => n.map(x => x.id)
  const full = lib.profileNotes(t, [30, 60])
  assert.deepEqual(ids(full), ['lessons', 'cancel', 'trial', 'video'])
  assert.equal(full[0].text, '30 or 60 min sessions. You pick one when you book.')
  assert.equal(full[1].text, 'Free up to 24 hours before the lesson.')
  assert.equal(full[2].text, 'Your first lesson with Maya costs $10.')
  assert.equal(lib.profileNotes(t, [45])[0].text, '45 min sessions.')
  assert.equal(lib.profileNotes({ ...t, cancellation_hours: 1 }, [60])[1].text, 'Free up to 1 hour before the lesson.')
  for (const none of [0, null, -3]) {
    const note = lib.profileNotes({ ...t, cancellation_hours: none }, [60]).find(x => x.id === 'cancel')!
    assert.match(note.text, /Maya has not set a free-cancellation window/, `hours ${none}: no invented policy`)
    assert.doesNotMatch(note.text, /Free up to/)
  }
  assert.deepEqual(ids(lib.profileNotes({ ...t, trial_enabled: false }, [60])), ['lessons', 'cancel', 'video'], 'no trial: no trial note')
  const old = ['Personalized 1-on-1', 'Flexible scheduling', 'Jitsi', 'tailored to your level']
  for (const n of full) for (const w of old) assert.doesNotMatch(n.text, new RegExp(w), 'nothing of the old shared box')
})

test('reviews: only a whole rating of 1 to 5 is a review; the text has no email, phone or control characters; lessons are counted per student', () => {
  const rows = [{ rating: 5 }, { rating: 0 }, { rating: 6 }, { rating: 3.5 }, { rating: '5' }, { rating: null }, { rating: 1 }]
  assert.deepEqual(lib.usableReviews(rows).map(r => r.rating), [5, 1])
  assert.deepEqual(lib.usableReviews(null), [])
  assert.equal(lib.reviewText('Great!\n\nWrite to ana@example.com or call 0900 000 000 now'), 'Great! Write to or call now')
  assert.equal(lib.reviewText(null), '')
  assert.deepEqual([...lib.lessonsPerStudent(['a', 'b', 'a', null, 'a']).entries()], [['a', 3], ['b', 1]])
})

// ---- the two reads that need lessons -----------------------------------------------------------------------------------------------

const TUTOR = { id: 'T1', timezone: 'UTC', buffer_minutes: 0 }
const EVERYDAY = [0, 1, 2, 3, 4, 5, 6].map(d => ({ id: `a${d}`, tutor_id: 'T1', day_of_week: d, start_time: '09:00', end_time: '11:00' }))
const asClient = (d: FakeDb) => d as unknown as import('@/lib/profile-data.ts').ReadClient
const day = (n: number) => new Date(NOW.getTime() + n * 86400000).toISOString().slice(0, 10)

test('loadFreeTimes: a saved lesson of THIS tutor\'s own calendar hides its time; a cancelled one, another tutor\'s, or a team member\'s does not', async () => {
  const baseDb = createFakeDb({ availability: EVERYDAY })
  const all = await data.loadFreeTimes(asClient(baseDb), () => asClient(baseDb), TUTOR, 60, NOW)
  assert.equal(all.state, 'ok')
  const target = all.slots.find(s => s.date === day(1) && s.time === '09:00')!
  assert.ok(target, 'tomorrow 09:00 is free')
  const start = `${target.date}T${target.time}:00.000Z`
  const times = async (extra: Record<string, unknown>[]) => {
    const d = createFakeDb({ availability: EVERYDAY, lessons: extra })
    return (await data.loadFreeTimes(asClient(d), () => asClient(d), TUTOR, 60, NOW)).slots.some(s => s.at === target.at)
  }
  assert.equal(await times([{ tutor_id: 'T1', starts_at: start, duration_minutes: 60, status: 'scheduled', assigned_to: null }]), false, 'booked: hidden')
  assert.equal(await times([{ tutor_id: 'T1', starts_at: start, duration_minutes: 60, status: 'completed', assigned_to: null }]), false, 'completed lessons still hold the time')
  assert.equal(await times([{ tutor_id: 'T1', starts_at: start, duration_minutes: 60, status: 'cancelled', assigned_to: null }]), true, 'cancelled frees the time')
  assert.equal(await times([{ tutor_id: 'T2', starts_at: start, duration_minutes: 60, status: 'scheduled', assigned_to: null }]), true, 'another tutor\'s lesson is none of this tutor\'s business')
  assert.equal(await times([{ tutor_id: 'T1', starts_at: start, duration_minutes: 60, status: 'scheduled', assigned_to: 'm1' }]), true, 'a team member\'s calendar is separate, as in the booking route')
})

test('loadFreeTimes: blocked days are skipped; no hours is "none", nothing free is "none"; a failed read is "unknown", never a guess', async () => {
  const blocked = createFakeDb({ availability: EVERYDAY, availability_exceptions: [{ tutor_id: 'T1', date: day(1) }, { tutor_id: 'T2', date: day(2) }] })
  const r = await data.loadFreeTimes(asClient(blocked), () => asClient(blocked), TUTOR, 60, NOW)
  assert.ok(!r.slots.some(s => s.date === day(1)), 'its blocked day is gone')
  assert.ok(r.slots.some(s => s.date === day(2)), 'another tutor\'s blocked day is not this tutor\'s')

  const none = createFakeDb({ availability: [] })
  assert.deepEqual(await data.loadFreeTimes(asClient(none), () => asClient(none), TUTOR, 60, NOW), { slots: [], state: 'none' })

  const allBlocked = createFakeDb({ availability: EVERYDAY, availability_exceptions: Array.from({ length: 16 }, (_, i) => ({ tutor_id: 'T1', date: day(i) })) })
  assert.equal((await data.loadFreeTimes(asClient(allBlocked), () => asClient(allBlocked), TUTOR, 60, NOW)).state, 'none')

  const ok = createFakeDb({ availability: EVERYDAY })
  const lessonsBroken = { from: (t: string) => (t === 'lessons' ? { select: () => ({ eq: () => ({ is: () => ({ neq: () => ({ gte: () => ({ lt: () => ({ limit: async () => ({ data: null, error: { message: 'boom' } }) }) }) }) }) }) }) } : ok.from(t)) }
  assert.equal((await data.loadFreeTimes(asClient(ok), () => lessonsBroken as never, TUTOR, 60, NOW)).state, 'unknown', 'lessons unreadable: no times promised')
  assert.equal((await data.loadFreeTimes(asClient(ok), () => { throw new Error('no key') }, TUTOR, 60, NOW)).state, 'unknown', 'no admin key: no times promised')
  const hoursBroken = { from: () => ({ select: () => ({ eq: async () => ({ data: null, error: { message: 'boom' } }) }) }) }
  assert.equal((await data.loadFreeTimes(hoursBroken as never, () => asClient(ok), TUTOR, 60, NOW)).state, 'unknown')
  const throwing = { from: () => { throw new Error('network down') } }
  assert.equal((await data.loadFreeTimes(throwing as never, () => asClient(ok), TUTOR, 60, NOW)).state, 'unknown')
  // a database without the blocked-days table still gives times
  const noTable = { from: (t: string) => (t === 'availability_exceptions' ? { select: () => ({ eq: () => ({ gte: async () => ({ data: null, error: { code: '42P01' } }) }) }) } : ok.from(t)) }
  assert.equal((await data.loadFreeTimes(noTable as never, () => asClient(ok), TUTOR, 60, NOW)).state, 'ok')
})

test('loadReviewLessonCounts: completed lessons of this tutor, per student; a failed read is an empty answer', async () => {
  const d = createFakeDb({ lessons: [
    { tutor_id: 'T1', student_id: 's1', status: 'completed' }, { tutor_id: 'T1', student_id: 's1', status: 'completed' }, { tutor_id: 'T1', student_id: 's1', status: 'scheduled' },
    { tutor_id: 'T1', student_id: 's2', status: 'completed' }, { tutor_id: 'T2', student_id: 's1', status: 'completed' }, { tutor_id: 'T1', student_id: 's9', status: 'completed' },
  ] })
  const counts = await data.loadReviewLessonCounts(() => asClient(d), 'T1', ['s1', 's2', 's3'])
  assert.deepEqual([...counts.entries()].sort(), [['s1', 2], ['s2', 1]], 'only completed, only this tutor, only the students asked about')
  assert.equal((await data.loadReviewLessonCounts(() => asClient(d), 'T1', [])).size, 0)
  assert.equal((await data.loadReviewLessonCounts(() => { throw new Error('no key') }, 'T1', ['s1'])).size, 0)
})

// ---- the real page, three states and a closed one ------------------------------------------------------------------------------------

const ALWAYS = (tutor_id: string) => [1, 2, 3, 4, 5, 6, 0].map(d => ({ id: `${tutor_id}-${d}`, tutor_id, day_of_week: d, start_time: '09:00', end_time: '17:00' }))
const T_FULL = '70000000-0000-4000-8000-000000000001'
const T_NEW = '70000000-0000-4000-8000-000000000002'
const T_FREE = '70000000-0000-4000-8000-000000000003'
const T_OFF = '70000000-0000-4000-8000-000000000004'
const S1 = '80000000-0000-4000-8000-000000000001'
const S2 = '80000000-0000-4000-8000-000000000002'
const S3 = '80000000-0000-4000-8000-000000000003'

const FULL = {
  id: T_FULL, name: 'Maya Reyes', slug: 'maya-reyes', subscription_status: 'pro', hide_branding: true, booking_url_active: true, currency: 'USD',
  default_lesson_price: 40, trial_enabled: true, trial_price: 10, timezone: 'America/Toronto', languages: ['English', 'Spanish'], cancellation_hours: 24, buffer_minutes: 0,
  bio: 'Hi, I coach IELTS and business English.\n\nLessons are practical: we work from your own material.', avatar_url: 'https://images.example.com/maya.jpg',
  average_rating: 4.9, review_count: 3, created_at: '2026-03-01T10:00:00Z', lesson_durations: [30, 60], default_lesson_duration: 60,
}

function world(): FakeDb {
  return createFakeDb({
    tutors: [
      FULL,
      { id: T_NEW, name: 'Priya Nair', slug: 'priya-nair', subscription_status: 'free', booking_url_active: true, currency: 'USD', default_lesson_price: 12, trial_enabled: false, trial_price: null,
        timezone: 'Asia/Kolkata', languages: ['English'], cancellation_hours: 0, buffer_minutes: 0, bio: null, avatar_url: null, average_rating: 0, review_count: 0, created_at: '2026-10-05T10:00:00Z' },
      { id: T_FREE, name: 'Daniel Weiss', slug: 'daniel-weiss', subscription_status: 'free', hide_branding: true, booking_url_active: true, currency: 'EUR', default_lesson_price: 28, trial_enabled: true, trial_price: 8,
        timezone: 'Europe/Berlin', languages: ['German'], cancellation_hours: 12, buffer_minutes: 0, bio: 'German for people moving to Germany.', avatar_url: null, average_rating: 4.8, review_count: 1, created_at: '2026-01-05T10:00:00Z' },
      { id: T_OFF, name: 'Olga Off', slug: 'olga-off', subscription_status: 'free', booking_url_active: false, currency: 'USD', default_lesson_price: 20, timezone: 'UTC', languages: [], cancellation_hours: 0, bio: 'Hello', avatar_url: null, average_rating: 0, review_count: 0, created_at: '2026-01-05T10:00:00Z' },
    ],
    availability: [T_FULL, T_NEW, T_FREE, T_OFF].flatMap(ALWAYS),
    reviews: [
      { id: 'r1', tutor_id: T_FULL, student_id: S1, rating: 5, comment: 'I needed band 7 and got 7.5. Maya marks my essays within a day.', is_public: true, created_at: '2026-09-10T10:00:00Z' },
      { id: 'r2', tutor_id: T_FULL, student_id: S2, rating: 4, comment: 'Helpful trial lesson.', is_public: true, created_at: '2026-08-10T10:00:00Z' },
      { id: 'r3', tutor_id: T_FULL, student_id: S3, rating: 5, comment: 'Private note nobody may see.', is_public: false, created_at: '2026-08-01T10:00:00Z' },
      { id: 'r4', tutor_id: T_FULL, student_id: S3, rating: 5, comment: null, is_public: true, created_at: '2026-07-10T10:00:00Z' },
      { id: 'r5', tutor_id: T_FREE, student_id: S1, rating: 5, comment: 'Passed Goethe B1.', is_public: true, created_at: '2026-09-01T10:00:00Z' },
    ],
    lessons: [
      ...[1, 2, 3].map(i => ({ id: `LESSON-ID-${i}`, tutor_id: T_FULL, student_id: S1, status: 'completed', starts_at: `2026-09-0${i}T10:00:00.000Z` })),
      { id: 'LESSON-ID-4', tutor_id: T_FULL, student_id: S2, status: 'completed', starts_at: '2026-08-02T10:00:00.000Z' },
      { id: 'LESSON-ID-5', tutor_id: T_FULL, student_id: S2, status: 'scheduled', starts_at: '2026-12-02T10:00:00.000Z' },
      { id: 'LESSON-ID-6', tutor_id: T_FREE, student_id: S1, status: 'completed', starts_at: '2026-09-02T10:00:00.000Z' },
    ],
  })
}

beforeEach(() => { db = world(); adminFails = false; noAdminKey = false; viewer = null; adminReads.length = 0 })

const render = async (slug: string) => renderToStaticMarkup(await page({ params: Promise.resolve({ slug }) }))
const ldBlocks = (html: string) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]) as Record<string, unknown>)
const personOf = (html: string) => (ldBlocks(html).find(b => b['@type'] === 'ProfilePage')!.mainEntity as Record<string, unknown>)

test('full profile: photo, name, rating, lessons taught, the tutor\'s own price, trial and cancel terms, reviews with lesson counts, no Made with line (Pro, turned off)', async () => {
  const html = await render('maya-reyes')
  assert.match(html, /<h1[^>]*>Maya Reyes<\/h1>/)
  assert.match(html, /<img src="https:\/\/images\.example\.com\/maya\.jpg" alt="Photo of Maya Reyes"/)
  assert.match(html, /data-testid="profile-rating"[\s\S]*?4\.9[\s\S]*?\(3 reviews\)[\s\S]*?4 lessons taught/)
  assert.match(html, /Teaches English · Spanish/)
  assert.match(html, /Time zone: America\/Toronto/)
  assert.match(html, /Trial lesson \$10/)
  assert.match(html, /Free cancellation up to 24h/)
  assert.match(html, /<h2[^>]*>About Maya<\/h2>[\s\S]*?we work from your own material/)
  assert.match(html, /data-testid="profile-prices"[\s\S]*?\$10[\s\S]*?\$40/)
  // the two public reviews with a rating (r1, r2) and the one with no text (r4): not the private one
  assert.equal((html.match(/data-testid="profile-review"/g) ?? []).length, 3)
  assert.doesNotMatch(html, /Private note nobody may see/)
  assert.match(html, /3 lessons with Maya/)
  assert.match(html, /1 lesson with Maya/)
  assert.equal((html.match(/data-testid="review-lessons"/g) ?? []).length, 2, 'the student with no completed lessons gets no tag')
  assert.equal(html.includes('data-testid="made-with-tutafy"'), false)
  assert.equal(html.includes('data-testid="made-with-strip"'), true, 'the 56 px strip stays, so turning the line off moves nothing')
  assert.match(html, /data-testid="sticky-book-bar"/)
  assert.match(html, /data-testid="booking-card"/)
  assert.match(html, /<a [^>]*href="\/book\/maya-reyes"/)
})

test('the same box for every tutor is gone: no "What to expect", no Jitsi, no "Personalized 1-on-1"', async () => {
  for (const slug of ['maya-reyes', 'priya-nair', 'daniel-weiss']) {
    const html = await render(slug)
    assert.doesNotMatch(html, /What to expect|Personalized 1-on-1|Flexible scheduling|Jitsi|Starting from/, slug)
  }
  const maya = await render('maya-reyes')
  assert.match(maya, /data-testid="note-cancel"[\s\S]*?Free up to 24 hours before the lesson\./)
  assert.match(maya, /data-testid="note-trial"[\s\S]*?Your first lesson with Maya costs \$10\./)
  assert.match(maya, /data-testid="note-lessons"[\s\S]*?30 or 60 min sessions\. You pick one when you book\./)
  const priya = await render('priya-nair')
  assert.doesNotMatch(priya, /data-testid="note-trial"/, 'a tutor with no trial has no trial note')
  assert.match(priya, /Priya has not set a free-cancellation window/)
  assert.match(await render('daniel-weiss'), /data-testid="note-cancel"[\s\S]*?Free up to 12 hours before the lesson\./)
})

test('new tutor: a calm "New on Tutafy" line, the initials, no empty frame for what is not there, and the Made with line (Free plan)', async () => {
  const html = await render('priya-nair')
  assert.match(html, /data-testid="profile-new"[\s\S]*?New on Tutafy · joined October 2026/)
  assert.match(html, /aria-label="Priya Nair has not added a photo yet" data-testid="profile-monogram"[^>]*>PN</)
  assert.doesNotMatch(html, /data-testid="profile-photo"/)
  assert.doesNotMatch(html, /data-testid="profile-about"|About Priya/, 'no bio: the section is not drawn at all')
  assert.doesNotMatch(html, /data-testid="profile-rating"/)
  assert.match(html, /data-testid="profile-no-reviews"[\s\S]*?No reviews yet[\s\S]*?Priya joined Tutafy in October 2026/)
  assert.doesNotMatch(html, /Trial lesson/)
  assert.match(html, /\$12/)
  assert.equal((html.match(/data-testid="made-with-tutafy"/g) ?? []).length, 1)
  const href = new URL(/data-testid="made-with-tutafy"/.test(html) ? /<a href="([^"]*)" target="_blank" rel="noopener" data-testid="made-with-tutafy"/.exec(html)![1].replace(/&amp;/g, '&') : '')
  assert.equal(href.searchParams.get('ref'), 'profile-page')
  assert.equal(href.searchParams.get('utm_medium'), 'profile-page')
  // no review markup at all with no real review, and no tutor of this page left the key behind
  assert.equal('review' in personOf(html), false)
  assert.doesNotMatch(html, /"review"|aggregateRating/)
})

test('Free plan: the line is always shown, even when the column says to hide it (the plan decides, as on the booking page)', async () => {
  const html = await render('daniel-weiss')
  assert.equal((html.match(/data-testid="made-with-tutafy"/g) ?? []).length, 1)
  assert.match(html, /€28/)
  assert.match(html, /Trial lesson €8/)
  assert.match(html, /1 lesson with Daniel/)
})

test('a tutor whose page is off: only that tutor, signed in, sees it (a preview): no booking card button, no bar, no free times, no structured data, and the old sentence', async () => {
  // a visitor, and another signed-in account, are told the page does not exist (the rule the database policy used to keep, now kept in code)
  await assert.rejects(() => render('olga-off'), /NEXT_NOT_FOUND/, 'a visitor')
  viewer = T_FULL
  await assert.rejects(() => render('olga-off'), /NEXT_NOT_FOUND/, 'another tutor')
  viewer = T_OFF
  const html = await render('olga-off')
  assert.match(html, /data-testid="booking-closed"[\s\S]*?Booking currently unavailable/)
  assert.doesNotMatch(html, /href="\/book\/olga-off"/)
  assert.doesNotMatch(html, /data-testid="sticky-book-bar"|data-testid="free-times"|application\/ld\+json/)
})

test('the free times: shown on the page in the tutor\'s zone first (named), as links to the booking page', async () => {
  const html = await render('maya-reyes')
  const next = (html.match(/data-testid="next-time"/g) ?? []).length
  assert.ok(next >= 1 && next <= 3, `up to three next times in the card, got ${next}`)
  assert.match(html, /Times shown in Toronto time/)
  assert.match(html, /data-testid="free-times"[\s\S]*?When Maya is free/)
  assert.match(html, /Next free time: (Today|Tomorrow|[A-Z][a-z]{2}) \d{1,2}:\d{2} (AM|PM) \(Toronto\)/, 'the bar names the zone until the browser says its own')
})

test('when the lessons cannot be read the page still opens: no times promised, no lesson counts, everything else there', async () => {
  adminFails = true
  const html = await render('maya-reyes')
  assert.match(html, /<h1[^>]*>Maya Reyes<\/h1>/)
  assert.doesNotMatch(html, /data-testid="next-time"/)
  assert.match(html, /Open the booking page to see Maya&#x27;s free times\./)
  assert.doesNotMatch(html, /data-testid="review-lessons"/)
  assert.equal((html.match(/data-testid="profile-review"/g) ?? []).length, 3, 'the reviews themselves are public and stay')
  assert.match(html, /Next free time|See free times/)
  assert.match(html, /See free times/, 'the bar falls back to a plain call')
})

test('the page answers 404 for a slug that does not exist', async () => {
  await assert.rejects(() => render('nobody-here'), /NEXT_NOT_FOUND/)
})

// ---- the structured data ---------------------------------------------------------------------------------------------------------

test('structured data: the Person carries Review items for real public reviews only, no aggregate rating, no student, no email or phone', async () => {
  const person = personOf(await render('maya-reyes'))
  assert.equal(person['@type'], 'Person')
  const reviews = person.review as { reviewRating: unknown; datePublished: string; reviewBody: string; author: unknown }[]
  assert.equal(reviews.length, 3, 'r1, r2 and r4: public with a rating; the private one is not there')
  assert.deepEqual(reviews[0].reviewRating, { '@type': 'Rating', ratingValue: 5, bestRating: 5, worstRating: 1 })
  assert.equal(reviews[0].datePublished, '2026-09-10')
  assert.match(reviews[0].reviewBody, /band 7/)
  assert.equal('reviewBody' in reviews[2], false, 'a rating with no comment has no body')
  assert.deepEqual(reviews[0].author, { '@type': 'Person', name: 'Tutafy student' })
  assert.doesNotMatch(JSON.stringify(personOf(await render('maya-reyes'))), /Private note|aggregateRating|email|telephone|80000000/)
  assert.equal('aggregateRating' in person, false)
})

test('structured data: a rating that is not a whole 1-5, or more than ten reviews, never reach the markup', () => {
  const rows = [{ rating: 7 }, { rating: 0 }, { rating: 2.5 }, { rating: '5' }, ...Array.from({ length: 14 }, () => ({ rating: 5, comment: 'ok', created_at: '2026-01-01T00:00:00Z' }))]
  const [profilePage] = seo.tutorJsonLd({ slug: 'x', name: 'X', reviews: rows as never })
  const person = profilePage.mainEntity as { review: unknown[] }
  assert.equal(person.review.length, 10)
  const none = seo.tutorJsonLd({ slug: 'x', name: 'X', reviews: [{ rating: 9 }] })[0].mainEntity as Record<string, unknown>
  assert.equal('review' in none, false, 'only bad ratings: no review key at all')
  assert.equal('review' in (seo.tutorJsonLd({ slug: 'x', name: 'X' })[0].mainEntity as object), false, 'no reviews given: none in the markup')
})

test('the title and the description of a profile are the ones the tutor already had', async () => {
  const meta = await profile.generateMetadata({ params: Promise.resolve({ slug: 'maya-reyes' }) })
  const expected = seo.tutorSeoText({ name: 'Maya Reyes', languages: ['English', 'Spanish'] })
  assert.equal((meta.title as { absolute: string }).absolute, expected.title)
  assert.equal(meta.description, expected.description)
  assert.equal(expected.title, 'Maya Reyes: English & Spanish Tutor | Tutafy', 'the exact title of before this change')
})

// ---- trying to break it ------------------------------------------------------------------------------------------------------------

test('text a tutor or a student wrote is shown as text: markup in a bio or a review is escaped, never run, and cannot close the structured-data script', async () => {
  const evil = '<script>alert(1)</script><img src=x onerror=alert(2)>'
  db.tables.tutors[0].bio = `${evil}\n\nSecond paragraph </script><script>alert(3)</script>`
  db.tables.tutors[0].name = 'Maya <b>Reyes</b>'
  db.tables.reviews[0].comment = `</script><script>alert(4)</script> ${evil}`
  const html = await render('maya-reyes')
  // the page itself (the JSON blocks are checked below: there the text sits inside a JSON string, with every "<" written as "<")
  const body = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
  const leak = /<script|<img src=x|<b>Reyes/.exec(body) // a real tag; the same words after &lt; are only text
  assert.equal(leak && body.slice(Math.max(0, leak.index - 100), leak.index + 100), null, 'raw markup from a text field reached the page')
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  // every structured-data block is still valid JSON and holds no raw closing tag from the text
  const raw = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  assert.ok(raw.length >= 2)
  for (const m of raw) { assert.doesNotMatch(m[1], /<\/script|<script/i); JSON.parse(m[1]) }
})

test('a photo address that is not plain https (http, javascript:, data:, one with a password, huge) is not drawn: the initials are', async () => {
  for (const bad of ['http://images.example.com/m.jpg', 'javascript:alert(1)', 'data:image/svg+xml;base64,AAAA', 'https://user:pw@images.example.com/m.jpg', 'https://images.example.com/' + 'a'.repeat(600), '//images.example.com/m.jpg', 'ftp://x/y']) {
    db.tables.tutors[0].avatar_url = bad
    const html = await render('maya-reyes')
    assert.doesNotMatch(html, /data-testid="profile-photo"/, bad.slice(0, 40))
    assert.match(html, /data-testid="profile-monogram"[^>]*>MR</, bad.slice(0, 40))
  }
})

test('a stranger cannot change what the page reads: it uses the slug\'s own tutor id, and the admin client reads only the public columns of the tutor, the dates of blocked days, lesson times and student ids, nothing else (T-0774)', async () => {
  await render('maya-reyes')
  assert.ok(adminReads.length >= 2, 'the page used the admin client')
  const columns = new Set(adminReads.map(r => `${r.table}: ${r.cols}`))
  assert.deepEqual([...columns].sort(), [
    'availability_exceptions: date',
    'lessons: starts_at, ends_at, duration_minutes',
    'lessons: student_id',
    'tutors: hide_branding',
    `tutors: ${PROFILE_PAGE_COLUMNS}`,
    'tutors: lesson_durations, default_lesson_duration',
    'tutors: subscription_status',
  ].sort(), 'the tutor row is read with the profile list of public columns, never with *')
  // neither the student ids nor a lesson's own id, link, price or note reach the page
  const html = await render('maya-reyes')
  for (const secret of [S1, S2, S3, 'LESSON-ID', 'meet_link', 'zoom_link']) assert.equal(html.includes(secret), false, secret)
})

test('a bad rating row or a broken time zone on a tutor never breaks the page', async () => {
  db.tables.reviews[1].rating = 99
  db.tables.tutors[0].timezone = 'Not/AZone'
  const html = await render('maya-reyes')
  assert.equal((html.match(/data-testid="profile-review"/g) ?? []).length, 2, 'the row with rating 99 is dropped')
  assert.match(html, /Time zone: UTC/)
  assert.match(html, /Times shown in UTC time/)
})

test('a long name, a long unbroken bio and many languages do not break the layout rules the page sets (wrapping classes are there)', async () => {
  db.tables.tutors[0].name = 'Maximiliana ' + 'Wolfeschlegelsteinhausenbergerdorff'.repeat(3)
  db.tables.tutors[0].bio = 'x'.repeat(5000)
  db.tables.tutors[0].languages = Array.from({ length: 12 }, (_, i) => `Language${i}`)
  const html = await render('maya-reyes')
  assert.match(html, /<h1 class="[^"]*break-words/)
  assert.match(html, /grid-cols-1 lg:grid-cols-\[1fr_340px\][^"]*"/)
  assert.match(html, /class="space-y-5 min-w-0"/, 'the main column may shrink, so a long word cannot push the page sideways')
})

// ---- the pieces ------------------------------------------------------------------------------------------------------------------

test('the bar, the card and the section render on the server in the tutor\'s zone, and say so plainly when there is nothing to show', () => {
  const slots = lib.nextFreeSlots({ availability: HOURS, timezone: 'America/Toronto', durationMinutes: 60, now: NOW })
  const props = { slots, state: 'ok' as const, tutorTz: 'America/Toronto', bookHref: '/book/x', first: 'Maya' }
  const bar = renderToStaticMarkup(createElement(StickyBookBar, { ...props, priceText: '$40 / lesson', buttonText: 'Book a lesson' }))
  assert.match(bar, /lg:hidden fixed bottom-0/, 'a phone-only bar, fixed to the bottom')
  assert.match(bar, /\$40 \/ lesson/)
  assert.match(bar, /Next free time: [A-Za-z]+ \d{1,2}:\d{2} (AM|PM) \(Toronto\)/)
  assert.match(bar, /<a [^>]*href="\/book\/x"[^>]*>Book a lesson/)
  const none = renderToStaticMarkup(createElement(StickyBookBar, { ...props, slots: [], state: 'none', priceText: null, buttonText: 'Book a lesson' }))
  assert.match(none, /See free times/)
  assert.doesNotMatch(none, /Next free time/)
  assert.match(renderToStaticMarkup(createElement(NextTimes, { ...props, slots: [], state: 'none' })), /Maya has no free times in the next 14 days/)
  assert.match(renderToStaticMarkup(createElement(FreeTimesSection, { ...props, slots: [], state: 'none' })), /No free times in the next 14 days/)
  assert.match(renderToStaticMarkup(createElement(FreeTimesSection, { ...props, slots: [], state: 'unknown' })), /See all times/)
})

test('the page sets no title, canonical or contact detail of its own, and reads no email or phone column', () => {
  const src = read('app/tutors/[slug]/page.tsx').replace(/^\s*\/\/.*$/gm, '')
  const selects = [...src.matchAll(/\.select\('([^']+)'/g)].map(m => m[1])
  for (const s of selects) assert.doesNotMatch(s, /\bemail\b|phone|\btel\b|stripe|paypal|paddle|token/i, s)
  assert.doesNotMatch(src, /\bcanonical\b|\balternates\b|title:\s*['"`]/)
  assert.match(read('lib/profile-data.ts'), /select\('starts_at, ends_at, duration_minutes'\)/)
})
