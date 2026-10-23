// T-0810: the redesigned public booking page /book/<slug>. The REAL code runs here: the words in src/lib/booking-page.ts (title,
// description, questions, structured data), the metadata in src/lib/page-meta.ts, and the real page rendered to HTML over an in-memory
// database for a full tutor and for a tutor missing each field the design could use (headline, years and subjects do not exist and are
// never drawn). Nothing here reaches a service.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

let db: FakeDb | { from: (t: string) => unknown }
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => db,
    createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: null } }) } }),
  },
})
mock.module('next/navigation', {
  namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, useRouter: () => ({ push() {}, replace() {} }), useSearchParams: () => new URLSearchParams() },
})

const lib = await import('@/lib/booking-page.ts')
const meta = await import('@/lib/page-meta.ts')
const bookModule = await import('@/app/book/[slug]/page.tsx')
const bookPage = bookModule.default
const { generateMetadata } = bookModule

// ---- the words ---------------------------------------------------------------------------------------------------------------------

const FULL = { name: 'Maya Reyes', languages: ['English', 'Spanish'], timezone: 'America/New_York', default_lesson_price: 22, currency: 'USD', trial_enabled: true, trial_price: 10, cancellation_hours: 24 }

test('title and description: their own words, inside the search-result limits, built from facts the tutor set', () => {
  const t = lib.bookingSeoText(FULL)
  assert.ok(t.title.length >= 20 && t.title.length <= lib.BOOKING_TITLE_MAX, t.title)
  assert.ok(t.description.length >= 70 && t.description.length <= lib.BOOKING_DESCRIPTION_MAX, t.description)
  assert.match(t.title, /Maya Reyes/)
  assert.match(t.description, /\$22 per lesson/)
  assert.match(t.description, /trial lesson \$10/)
  // a long sentence drops the facts at its end rather than being cut in the middle; a short name has room for all three
  assert.match(lib.bookingSeoText({ ...FULL, name: 'Li', languages: ['English'] }).description, /\$22 per lesson, trial lesson \$10, free cancellation up to 24h\./)
  // the profile page has its own words: the two never repeat each other
  assert.notEqual(t.title, meta.tutorMetadata({ slug: 'maya-reyes', ...FULL, booking_url_active: true }).title && (meta.tutorMetadata({ slug: 'maya-reyes', ...FULL, booking_url_active: true }).title as { absolute: string }).absolute)
})

test('title and description: a tutor with nothing set gets honest words with no empty fact, and every length stays inside the limits', () => {
  const bare = lib.bookingSeoText({ name: 'Priya Nair', languages: [], default_lesson_price: null, trial_enabled: false, cancellation_hours: 0 })
  assert.doesNotMatch(bare.description, /per lesson|trial|cancellation|undefined|null|NaN/)
  assert.ok(bare.title.length <= lib.BOOKING_TITLE_MAX && bare.description.length <= lib.BOOKING_DESCRIPTION_MAX)
  for (const name of ['A', 'X'.repeat(200), 'Ünïcödé Ñame', 'Name <script>alert(1)</script>']) {
    const t = lib.bookingSeoText({ ...FULL, name })
    assert.ok(t.title.length <= lib.BOOKING_TITLE_MAX, `title for ${name.slice(0, 20)}: ${t.title.length}`)
    assert.ok(t.description.length <= lib.BOOKING_DESCRIPTION_MAX, `description for ${name.slice(0, 20)}: ${t.description.length}`)
  }
  assert.doesNotMatch(lib.bookingSeoText({ ...FULL, name: 'Sam ten@example.com 0900 000 000' }).description, /example\.com|0900/, 'no address or number of a stranger in the description')
})

test('the questions: only what the tutor set, and the structured data says exactly the same', () => {
  const full = lib.bookingFaq({ ...FULL, durations: [30, 60] })
  assert.deepEqual(full.map(i => i.q), [
    'How do I book a lesson with Maya Reyes?', 'What time zone are the times in?', 'How much does a lesson with Maya cost?',
    'How does the trial lesson work?', 'What if I need to cancel?', 'How do I pay?',
  ])
  assert.match(full[2].a, /\$22/)
  assert.match(full[3].a, /\$10/)
  assert.match(full[4].a, /up to 24 hours/)
  const bare = lib.bookingFaq({ name: 'Priya Nair', durations: [60], timezone: null, default_lesson_price: null, trial_enabled: false, cancellation_hours: 0 })
  assert.deepEqual(bare.map(i => i.q), ['How do I book a lesson with Priya Nair?', 'What time zone are the times in?', 'What if I need to cancel?', 'How do I pay?'], 'no price question without a price, no trial question without a trial')
  assert.match(bare[2].a, /has not set a free-cancellation window/)
  const ld = lib.faqJsonLd(full, 'maya-reyes') as { '@type': string; mainEntity: { name: string; acceptedAnswer: { text: string } }[] }
  assert.equal(ld['@type'], 'FAQPage')
  assert.deepEqual(ld.mainEntity.map(e => [e.name, e.acceptedAnswer.text]), full.map(i => [i.q, i.a]))
})

test('the package link: PayPal with the amount, else the tutor\'s own https card link, else nothing', () => {
  assert.equal(lib.packageBuyUrl({ paypal_link: 'maya', paddle_checkout_link: null }, 180), 'https://www.paypal.com/paypalme/maya/180.00')
  assert.equal(lib.packageBuyUrl({ paypal_link: null, paddle_checkout_link: 'https://buy.stripe.com/abc' }, 180), 'https://buy.stripe.com/abc')
  assert.equal(lib.packageBuyUrl({ paypal_link: null, paddle_checkout_link: 'javascript:alert(1)' }, 180), null)
  assert.equal(lib.packageBuyUrl({}, 180), null)
})

// ---- the real page -----------------------------------------------------------------------------------------------------------------

const T = '50000000-0000-4000-8000-0000000000a1'
const FULL_ROW = {
  id: T, name: 'Maya Reyes', slug: 'maya-reyes', email: 'private-owner@example.com', subscription_status: 'free', booking_url_active: true,
  bio: 'I teach English to adults.\n\nEvery lesson has one goal.', avatar_url: 'https://cdn.example.com/maya.jpg', languages: ['English', 'Spanish'], timezone: 'America/New_York',
  default_lesson_price: 22, currency: 'USD', trial_enabled: true, trial_price: 10, cancellation_hours: 24, buffer_minutes: 0, average_rating: 4.9, review_count: 2,
  created_at: '2026-08-01T00:00:00Z',
}
const HOURS = { id: 'a1', tutor_id: T, team_member_id: null, day_of_week: 1, start_time: '09:00', end_time: '17:00' }
const REVIEWS = [
  { id: 'r1', tutor_id: T, student_id: 'S1', rating: 5, comment: 'Clear and kind.', is_public: true, created_at: '2026-09-01T00:00:00Z' },
  { id: 'r2', tutor_id: T, student_id: 'S2', rating: 4, comment: null, is_public: true, created_at: '2026-09-02T00:00:00Z' },
]
let tutorRow: Record<string, unknown> = FULL_ROW
let extra: Record<string, unknown[]> = {}
beforeEach(() => {
  tutorRow = { ...FULL_ROW }
  extra = {}
  buildDb()
})
function buildDb() {
  db = createFakeDb({
    tutors: [tutorRow],
    availability: [HOURS],
    reviews: REVIEWS,
    lessons: [{ id: 'l1', tutor_id: T, student_id: 'S1', status: 'completed', starts_at: '2026-09-01T10:00:00Z', ends_at: '2026-09-01T11:00:00Z', duration_minutes: 60, assigned_to: null }],
    packages: [{ id: 'p1', tutor_id: T, name: '5 lesson pack', description: 'Five lessons.', lessons_count: 5, price: 100, active: true }],
    ...extra,
  } as never)
}
type Page = (props: { params: Promise<Record<string, string>> }) => Promise<React.ReactElement>
const render = async (slug = 'maya-reyes') => renderToStaticMarkup(await (bookPage as Page)({ params: Promise.resolve({ slug }) }))
const without = (...keys: string[]) => { tutorRow = Object.fromEntries(Object.entries(FULL_ROW).filter(([k]) => !keys.includes(k))); buildDb() }
const ldOf = (html: string) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1].replace(/\\u003c/g, '<')))

test('a full tutor: one h1 with the name, the facts, About, packages, reviews, booking and cancellation, questions, and the booking card', async () => {
  const html = await render()
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1)
  assert.match(html, /<h1[^>]*>Maya Reyes<\/h1>/)
  assert.match(html, /data-testid="booking-photo"/)
  assert.match(html, /Teaches English, Spanish/)
  assert.match(html, /America\/New_York/)
  assert.match(html, />\$22<span[^>]*>\/ lesson/)
  assert.match(html, /Trial lesson \$10/)
  assert.match(html, /Free<span[^>]*>up to 24h before/)
  assert.match(html, /I teach English to adults\./)
  assert.match(html, /data-testid="booking-packages"/)
  assert.match(html, /data-testid="booking-reviews"/)
  assert.match(html, /1 lesson with Maya/, 'a reviewer who had a lesson shows it, from a count made on the server')
  assert.match(html, /id="book"/)
  assert.match(html, /aria-label="Lesson length"/)
  assert.match(html, /Choose a day and time/)
  for (const q of lib.bookingFaq({ ...(FULL_ROW as never), durations: [30, 45, 60, 90] })) assert.ok(html.includes(q.q.replace(/'/g, '&#x27;')) || html.includes(q.q), q.q)
})

test('what the design drew but the tutor has no field for is never drawn: no headline, no years of experience, no subject chips, no invented words', async () => {
  const html = await render()
  assert.doesNotMatch(html, /years teaching|Teaching since|CELTA|IELTS prep|Business English|certified/i)
  assert.doesNotMatch(html, /undefined|\bNaN\b|\bnull\b/)
})

test('the structured data is a FAQPage with the same questions as the page, and holds no address or number', async () => {
  const html = await render()
  const ld = ldOf(html)
  assert.equal(ld.length, 1)
  assert.equal(ld[0]['@type'], 'FAQPage')
  const asked = ld[0].mainEntity.map((e: { name: string }) => e.name)
  const shown = [...html.matchAll(/<summary[^>]*>([\s\S]*?)<svg/g)].map(m => m[1].replace(/&#x27;/g, "'"))
  assert.deepEqual(asked, shown, 'the markup says exactly what the page says')
  assert.doesNotMatch(JSON.stringify(ld), /[\w.-]+@[\w-]+\.\w+|private-owner|\d{4} \d{3} \d{3}/)
})

test('the metadata: its own title and description, the canonical is the tutor\'s profile, a page that is off or missing is noindex', async () => {
  const m = await generateMetadata({ params: Promise.resolve({ slug: 'maya-reyes' }) })
  const seo = lib.bookingSeoText(FULL_ROW as never)
  assert.deepEqual(m.title, { absolute: seo.title })
  assert.equal(m.description, seo.description)
  assert.match(String(m.alternates?.canonical), /\/tutors\/maya-reyes$/, 'search engines list the profile, which has the structured data and the sitemap entry')
  assert.equal(m.robots, undefined, 'a page that is on can be indexed (its canonical points to the profile)')
  const missing = await generateMetadata({ params: Promise.resolve({ slug: 'nobody' }) })
  assert.deepEqual(missing.robots, { index: false, follow: false })
  tutorRow = { ...FULL_ROW, booking_url_active: false }; buildDb()
  assert.deepEqual((await generateMetadata({ params: Promise.resolve({ slug: 'maya-reyes' }) })).robots, { index: false, follow: false })
  await assert.rejects(render(), /NEXT_NOT_FOUND/, 'a tutor whose page is off is a 404, as before')
})

// ---- a tutor missing each field ----------------------------------------------------------------------------------------------------

const MISSING: [string, string[], RegExp[]][] = [
  ['no bio', ['bio'], [/has not written an introduction yet/]],
  ['no photo', ['avatar_url'], [/data-testid="booking-monogram"/]],
  ['no languages', ['languages'], []],
  ['no price', ['default_lesson_price'], [/Ask the tutor/, /Price: ask the tutor/]],
  ['no trial', ['trial_enabled', 'trial_price'], [/Not offered/]],
  ['no cancellation window', ['cancellation_hours'], [/No free cancellation/, /has not set a free-cancellation window/]],
  ['no time zone', ['timezone'], [/ UTC<\/li>/]],
  ['no joined date', ['created_at'], []],
  ['no rating', ['average_rating', 'review_count'], [/data-testid="booking-no-reviews"/]],
]
for (const [label, keys, expected] of MISSING) {
  test(`a tutor with ${label}: the page still draws, says so plainly where it needs to, and invents nothing`, async () => {
    without(...keys)
    const html = await render()
    assert.match(html, /<h1[^>]*>Maya Reyes<\/h1>/)
    assert.match(html, /aria-label="Lesson length"/)
    for (const re of expected) assert.match(html, re, `${label}: ${re}`)
    assert.doesNotMatch(html, /undefined|\bNaN\b|\bnull\b/, label)
    assert.equal(ldOf(html).length, 1)
  })
}

test('a tutor with nothing but a name: every optional part is quiet, a new tutor is called new, and booking still works', async () => {
  tutorRow = { id: T, name: 'Priya Nair', slug: 'maya-reyes', booking_url_active: true, timezone: 'Asia/Kolkata', currency: 'USD', cancellation_hours: 0, buffer_minutes: 0, languages: [], created_at: '2026-10-20T00:00:00Z' }
  extra = { reviews: [], lessons: [], packages: [] }
  buildDb()
  const html = await render()
  assert.match(html, /data-testid="booking-new"/)
  assert.match(html, /New on Tutafy · joined October 2026/)
  assert.match(html, /data-testid="booking-monogram"/)
  assert.doesNotMatch(html, /data-testid="booking-packages"|data-testid="booking-rating"|data-testid="soonest-times"[^>]*><p[^>]*>[^<]*Trial/)
  assert.doesNotMatch(html, /role="switch"/, 'no trial switch when the tutor offers no trial')
  assert.match(html, /No reviews yet\. Priya is new on Tutafy/)
  assert.match(html, /Choose a day and time/)
  assert.doesNotMatch(html, /undefined|\bNaN\b|\bnull\b/)
})

test('a tutor with no hours gets the waitlist, not an empty calendar', async () => {
  extra = { availability: [] }
  buildDb()
  const html = await render()
  assert.match(html, /No times open right now/)
  assert.match(html, /Tell me when a time opens|Join waitlist/)
})

test('a photo address that is not plain https is not drawn: the initials stand in', async () => {
  for (const url of ['http://cdn.example.com/a.jpg', 'javascript:alert(1)', 'https://user:pass@cdn.example.com/a.jpg']) {
    tutorRow = { ...FULL_ROW, avatar_url: url }; buildDb()
    const html = await render()
    assert.doesNotMatch(html, /data-testid="booking-photo"/, url)
    assert.match(html, /data-testid="booking-monogram"/, url)
  }
})

test('text a stranger typed is drawn as text: markup in a bio, a name or a review does not become markup', async () => {
  tutorRow = { ...FULL_ROW, name: 'Maya <img src=x onerror=alert(1)>', bio: '<script>alert(1)</script>Hello' }
  buildDb()
  const html = await render()
  assert.doesNotMatch(html, /<img src=x|<script>alert/)
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;Hello/)
})

test('nothing private reaches the page: not the email, not the plan', async () => {
  const html = await render()
  assert.doesNotMatch(html, /private-owner@example\.com|subscription_status|stripe_account_id|google_calendar|push_subscription/)
})
