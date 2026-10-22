// T-0698: the public profile /tutors/<slug> says which lesson lengths THIS tutor takes (the ones they ticked in Settings, T-0675),
// not a fixed "30, 45, 60 or 90 min sessions" for everybody. The REAL profile page is rendered to HTML with a fake database.
// Only the words change: the Book button still goes to /book/<slug>, where the lengths are offered (tests/lesson-durations.test.ts).
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

let db: FakeDb
let viewer: string | null = null // the signed-in account that opens the page (T-0774: a page that is off is shown to that tutor only)
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => db,
    createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: viewer ? { id: viewer } : null } }) } }),
  },
})
mock.module('next/navigation', { namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') } } })

const profile = (await import('@/app/tutors/[slug]/page.tsx')).default
type Page = (props: { params: Promise<{ slug: string }> }) => Promise<React.ReactElement>
const render = async (slug: string) => renderToStaticMarkup(await (profile as Page)({ params: Promise.resolve({ slug }) }))
/** The line beside the clock icon in the booking card: the text that ends in "min sessions". */
const sessionLine = (html: string) => {
  const found = [...html.matchAll(/>([^<>]*min sessions)</g)].map(m => m[1].trim())
  assert.equal(found.length, 1, `the profile has exactly one session-length line, found ${found.length}`)
  return found[0]
}

const base = { subscription_status: 'free', booking_url_active: true, currency: 'USD', default_lesson_price: 25, timezone: 'UTC', languages: ['English'], bio: 'Hello', cancellation_hours: 24 }
const T = (n: number) => `10000000-0000-4000-8000-00000000f${String(n).padStart(3, '0')}`

beforeEach(() => {
  viewer = null
  db = createFakeDb({
    tutors: [
      { id: T(1), name: 'Tutor Nothing', slug: 'tutor-nothing', ...base },
      { id: T(2), name: 'Tutor Two', slug: 'tutor-two', ...base, lesson_durations: [30, 60], default_lesson_duration: 30 },
      { id: T(3), name: 'Tutor One', slug: 'tutor-one', ...base, lesson_durations: [45], default_lesson_duration: 45 },
      { id: T(4), name: 'Tutor Three', slug: 'tutor-three', ...base, lesson_durations: [90, 45, 60], default_lesson_duration: 60 },
      { id: T(5), name: 'Tutor Invalid', slug: 'tutor-invalid', ...base, lesson_durations: [7, 12, 250], default_lesson_duration: 7 },
      { id: T(6), name: 'Tutor Off', slug: 'tutor-off', ...base, booking_url_active: false, lesson_durations: [30], default_lesson_duration: 30 },
    ],
  })
})

test('a tutor who ticked 30 and 60 min: the profile says "30 or 60 min sessions", not the fixed sentence', async () => {
  const html = await render('tutor-two')
  assert.equal(sessionLine(html), '30 or 60 min sessions')
  assert.doesNotMatch(html, /30, 45, 60 or 90/)
})

test('a tutor with one length: "45 min sessions"; three lengths: listed in order, the last after "or"', async () => {
  assert.equal(sessionLine(await render('tutor-one')), '45 min sessions')
  assert.equal(sessionLine(await render('tutor-three')), '45, 60 or 90 min sessions')
})

test('a tutor who chose nothing (or only invalid values) keeps the old sentence, word for word', async () => {
  assert.equal(sessionLine(await render('tutor-nothing')), '30, 45, 60 or 90 min sessions')
  assert.equal(sessionLine(await render('tutor-invalid')), '30, 45, 60 or 90 min sessions')
})

test('the sentence follows the data: changing the tutor’s choice changes the page', async () => {
  assert.equal(sessionLine(await render('tutor-two')), '30 or 60 min sessions')
  db = createFakeDb({ tutors: [{ id: T(2), name: 'Tutor Two', slug: 'tutor-two', ...base, lesson_durations: [90], default_lesson_duration: 90 }] })
  assert.equal(sessionLine(await render('tutor-two')), '90 min sessions')
})

test('the same sentence as the booking page, from the same code', async () => {
  const lib = await import('@/lib/lesson-durations.ts')
  for (const [slug, chosen] of [['tutor-two', [30, 60]], ['tutor-one', [45]], ['tutor-three', [45, 60, 90]]] as const) {
    assert.equal(sessionLine(await render(slug)), lib.describeDurations([...chosen]))
  }
})

test('the page still opens when the database has no such columns (migration 018 not applied): the old sentence, no crash, not a 404', async () => {
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
  assert.equal(sessionLine(await render('tutor-two')), '30, 45, 60 or 90 min sessions')
})

test('only the words change: the Book button still goes to /book/<slug>, and an unavailable tutor still shows no button', async () => {
  assert.match(await render('tutor-two'), /href="\/book\/tutor-two"/)
  await assert.rejects(() => render('tutor-off'), /NEXT_NOT_FOUND/, 'a visitor is told a page that is off does not exist')
  viewer = T(6) // the tutor, signed in, previews their own page
  const off = await render('tutor-off')
  assert.doesNotMatch(off, /href="\/book\/tutor-off"/)
  assert.match(off, /Booking currently unavailable/)
  assert.equal(sessionLine(off), '30 min sessions')
})

test('the profile page no longer writes the fixed sentence itself', () => {
  const source = readFileSync(path.join(SRC, 'app/tutors/[slug]/page.tsx'), 'utf8')
  assert.doesNotMatch(source, /30, 45, 60 or 90/)
  assert.match(source, /\{describeDurations\(lengths\.durations\)\}/)
})
