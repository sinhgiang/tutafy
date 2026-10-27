// T-1007: the standard trial lesson (the owner's choice, W-3173 option 1): a trial is always 30 minutes, the tutor sets the price, and it is for a
// first lesson only. The REAL POST /api/bookings runs here over a fake database (the mail service is replaced by a recorder, so nothing is sent),
// and the REAL directory card and Settings section are rendered to HTML. The profile page, the booking page and the Find-me-a-tutor reasons are
// checked in tests/tutor-profile.test.ts, tests/booking-page.test.ts and tests/find-tutor.test.ts. Clicking the switch on the booking card
// (the length buttons lock to 30 min) is client state the test runner cannot click; the report says it was done in a real browser.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

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

const trial = await import('@/lib/trial.ts')
const bookings = await import('@/app/api/bookings/route.ts')
const { TutorCard } = await import('@/components/directory/TutorCard.tsx')
const { default: ExtrasSection } = await import('@/components/settings/sections/ExtrasSection.tsx')

// ---- the rule -------------------------------------------------------------------------------------------------------

test('the rule: 30 minutes, one name and one badge everywhere, a trial only for a student with no earlier lesson', () => {
  assert.equal(trial.TRIAL_MINUTES, 30)
  assert.equal(trial.TRIAL_NAME, '30-minute trial')
  assert.equal(trial.TRIAL_BADGE, '30-min trial')
  assert.match(trial.TRIAL_RULE, /always 30 minutes/)
  assert.equal(trial.trialAllowed(0), true)
  for (const n of [1, 2, 40]) assert.equal(trial.trialAllowed(n), false, `${n} earlier lessons`)
})

// ---- the real booking route -----------------------------------------------------------------------------------------

const T_TRIAL = '10000000-0000-4000-8000-0000000000f1' // regular lessons 60 or 90 only; trial 10
const T_NONE = '10000000-0000-4000-8000-0000000000f2' // never switched the trial on (a price is still stored)
const T_ZERO = '10000000-0000-4000-8000-0000000000f3' // trial switched on with no price
const T_OTHER = '10000000-0000-4000-8000-0000000000f4' // a second tutor, with a trial
const base = { subscription_status: 'free', booking_url_active: true, currency: 'USD', default_lesson_price: 40, timezone: 'UTC', languages: ['English'], bio: 'Hello', cancellation_hours: 24, buffer_minutes: 0 }

beforeEach(() => {
  sent.length = 0
  db = createFakeDb({
    tutors: [
      { id: T_TRIAL, name: 'Tutor Trial', email: 'trial@example.com', slug: 'tutor-trial', ...base, trial_enabled: true, trial_price: 10, lesson_durations: [60, 90], default_lesson_duration: 60 },
      { id: T_NONE, name: 'Tutor None', email: 'none@example.com', slug: 'tutor-none', ...base, trial_enabled: false, trial_price: 5 },
      { id: T_ZERO, name: 'Tutor Zero', email: 'zero@example.com', slug: 'tutor-zero', ...base, trial_enabled: true, trial_price: null },
      { id: T_OTHER, name: 'Tutor Other', email: 'other@example.com', slug: 'tutor-other', ...base, trial_enabled: true, trial_price: 8 },
    ],
    coupons: [{ id: 'c1', tutor_id: T_TRIAL, code: 'HALF', discount_type: 'percent', discount_value: 50, max_uses: null, uses_count: 0, expires_at: null, active: true }],
  }, { students: { portal_token: () => `portal-${randomUUID()}` } })
  process.env.RESEND_API_KEY = 're_test_key_for_tests'
})

let n = 0
function book(tutorId: string, body: Record<string, unknown> = {}, who: { name: string; email: string } | null = null) {
  n++
  const person = who ?? { name: `Student ${n}`, email: `student${n}@example.com` }
  return bookings.POST(new Request('https://www.tutafy.test/api/bookings', {
    method: 'POST', headers: { host: 'www.tutafy.test', 'x-forwarded-proto': 'https' },
    body: JSON.stringify({ tutorId, date: '2030-01-07', time: `${String(8 + (n % 9)).padStart(2, '0')}:00`, duration: 60, termsAgreed: true, ...person, ...body }),
  }))
}
type Lesson = { tutor_id: string; student_id: string; duration_minutes: number; starts_at: string; ends_at: string; is_trial: boolean; price: number | null; status: string }
const lessons = () => (db.tables.lessons ?? []) as Lesson[]
const students = () => (db.tables.students ?? []) as { id: string; tutor_id: string; email: string }[]
const minutes = (l: Lesson) => (new Date(l.ends_at).getTime() - new Date(l.starts_at).getTime()) / 60000

test('a trial is saved as 30 minutes at the trial price, even when the browser asks for 90 and the tutor only offers 60 and 90', async () => {
  const res = await book(T_TRIAL, { isTrial: true, duration: 90 })
  assert.equal(res.status, 200)
  const body = await res.json() as { price: number }
  assert.equal(lessons().length, 1)
  assert.equal(lessons()[0].is_trial, true)
  assert.equal(lessons()[0].duration_minutes, 30)
  assert.equal(minutes(lessons()[0]), 30, 'the end time in the calendar is 30 minutes after the start')
  assert.equal(lessons()[0].price, 10)
  assert.equal(body.price, 10, 'the page is told the trial price')
  assert.equal(sent.length, 2)
  for (const m of sent) {
    assert.match(m.html, />30 minutes</, m.to)
    assert.doesNotMatch(m.html, />(60|90) minutes</)
  }
})

test('a trial needs no length from the browser, and the length it sends is never trusted', async () => {
  for (const duration of [undefined, 0, 7, 1000, 'abc']) {
    const res = await book(T_TRIAL, { isTrial: true, duration })
    assert.equal(res.status, 200, String(duration))
  }
  assert.deepEqual([...new Set(lessons().map(l => l.duration_minutes))], [30])
})

test('a trial the tutor does not offer is refused, and nothing is saved: no lesson, no student, no mail', async () => {
  for (const tutor of [T_NONE, T_ZERO]) {
    const res = await book(tutor, { isTrial: true })
    assert.equal(res.status, 400, tutor)
    assert.match((await res.json() as { error: string }).error, /does not offer a trial/)
  }
  assert.equal(lessons().length, 0)
  assert.equal(students().length, 0)
  assert.equal(sent.length, 0)
})

test('a trial is for a first lesson only: a student with an earlier lesson with this tutor is refused, a cancelled one does not count', async () => {
  const marta = { name: 'Marta', email: 'marta@example.com' }
  assert.equal((await book(T_TRIAL, { isTrial: true }, marta)).status, 200, 'the first trial')
  const again = await book(T_TRIAL, { isTrial: true }, marta)
  assert.equal(again.status, 400)
  assert.match((await again.json() as { error: string }).error, /first lesson only/)
  assert.equal(lessons().length, 1, 'the second trial was not saved')

  // the same student can still book a regular lesson, at the regular price and a length the tutor offers
  const regular = await book(T_TRIAL, { duration: 60 }, marta)
  assert.equal(regular.status, 200)
  assert.deepEqual(lessons().map(l => [l.is_trial, l.duration_minutes, l.price]), [[true, 30, 10], [false, 60, 40]])

  // a lesson that was cancelled is not a first lesson that happened
  const ivan = { name: 'Ivan', email: 'ivan@example.com' }
  assert.equal((await book(T_TRIAL, { isTrial: true }, ivan)).status, 200)
  for (const l of lessons()) if (students().find(s => s.id === l.student_id)?.email === ivan.email) l.status = 'cancelled'
  assert.equal((await book(T_TRIAL, { isTrial: true }, ivan)).status, 200, 'after a cancelled trial, a new trial is fine')
})

test('a lesson with ANOTHER tutor is not an earlier lesson: each tutor has their own first lesson', async () => {
  const sam = { name: 'Sam', email: 'sam@example.com' }
  assert.equal((await book(T_OTHER, { duration: 60 }, sam)).status, 200, 'a regular lesson with the second tutor')
  const res = await book(T_TRIAL, { isTrial: true }, sam)
  assert.equal(res.status, 200, 'still a first lesson with this tutor')
  assert.deepEqual(lessons().filter(l => l.tutor_id === T_TRIAL).map(l => [l.is_trial, l.duration_minutes]), [[true, 30]])
})

test('a regular lesson is unchanged: only the lengths the tutor offers, the regular price, and "true" in a string is not a trial', async () => {
  const thirty = await book(T_TRIAL, { duration: 30 })
  assert.equal(thirty.status, 400, '30 minutes is not one of this tutor\'s regular lengths')
  assert.match((await thirty.json() as { error: string }).error, /does not offer lessons of that length/)
  assert.equal((await book(T_TRIAL, { duration: 90 })).status, 200)
  assert.equal((await book(T_TRIAL, { duration: 60, isTrial: 'true' })).status, 200, 'a string is not a switch')
  assert.deepEqual(lessons().map(l => [l.is_trial, l.duration_minutes, l.price]), [[false, 90, 40], [false, 60, 40]])
  const missing = await book(T_TRIAL, { duration: undefined })
  assert.equal(missing.status, 400, 'a regular lesson still needs a length')
})

test('a coupon still comes off the trial price', async () => {
  assert.equal((await book(T_TRIAL, { isTrial: true, couponCode: 'HALF' })).status, 200)
  assert.deepEqual(lessons().map(l => [l.is_trial, l.duration_minutes, l.price]), [[true, 30, 5]])
})

// ---- what a visitor and a tutor read --------------------------------------------------------------------------------

const card = (o: Record<string, unknown> = {}) => ({
  slug: 'ana-torres', name: 'Ana Torres', photo: null, languages: ['Spanish'], headline: 'Spanish for travel', rating: null, reviews: 0, price: 20, currency: 'USD',
  trialPrice: 10, tz: 'UTC', levels: [], complete: 2, slots: [Math.floor(Date.parse('2026-10-27T12:00:00Z') / 60000) + 600], established: false, video: false, ...o,
})
const draw = (c: ReturnType<typeof card>) => renderToStaticMarkup(createElement(TutorCard, { card: c as never, zone: 'UTC', viewerZone: null, now: new Date('2026-10-27T12:00:00Z') }))

test('the directory card says "30-min trial $10" on the photo, and says nothing for a tutor with no trial', () => {
  assert.match(draw(card()), /data-testid="card-trial"[^>]*>[\s\S]*?30-min trial \$10/)
  assert.doesNotMatch(draw(card({ trialPrice: null })), /card-trial|trial/i)
  assert.match(draw(card({ trialPrice: 7.5 })), /30-min trial \$7\.50/, 'a price with cents keeps them')
})

test('Settings tells the tutor the rule next to the price: always 30 minutes, first lesson only, they set the price', () => {
  const form = { trial_enabled: true, trial_price: '10', contract_template: '' }
  const on = renderToStaticMarkup(createElement(ExtrasSection, { ctx: { form, setForm() {} } as never }))
  assert.match(on, /data-testid="trial-rule"[^>]*>A trial lesson is always 30 minutes and is for a first lesson only\. You set the price/)
  assert.match(on, /30-minute trial option for first-time students/)
  const off = renderToStaticMarkup(createElement(ExtrasSection, { ctx: { form: { ...form, trial_enabled: false }, setForm() {} } as never }))
  assert.doesNotMatch(off, /trial-rule/, 'the price box, and its rule, are shown only while the trial is on')
})

test('nobody still says the old thing: no "cheaper first lesson" and no length-less "Trial $" badge in the code the visitor sees', () => {
  const files = ['src/components/directory/TutorCard.tsx', 'src/components/directory/DirectoryView.tsx', 'src/components/find/FindTutorView.tsx', 'src/lib/site-content.ts', 'src/app/book/[slug]/BookingForm.tsx']
  for (const f of files) {
    const text = readFileSync(path.join(ROOT, f), 'utf8')
    assert.doesNotMatch(text, /cheaper first lesson|Trial \{trial\}/, f)
  }
})

test('the booking card reads every length from one place, so the free times, the button and the request all say 30 for a trial', () => {
  const form = readFileSync(path.join(ROOT, 'src/app/book/[slug]/BookingForm.tsx'), 'utf8')
  assert.match(form, /const duration = isTrial \? TRIAL_MINUTES : chosenDuration/)
  assert.doesNotMatch(form, /setDuration\(/, 'nothing sets the length behind that line')
  assert.match(form, /getSlots\(availability, date, duration, bufferMinutes\)/, 'the free times follow it')
  assert.match(form, /tutorId: tutor\.id, date, time, duration,/, 'and so does the request')
})
