// T-1252: the six ways to narrow the tutor directory, each one alone and all six together, on the REAL /tutors page rendered to HTML over an
// in-memory database (the same stand-in the other directory tests use). The six criteria and the address parameter each one uses:
//   language      ?lang=spanish
//   price range   ?min=25&max=35   (dollars an hour; the four ready-made buckets are ?price=...)
//   free hours    ?tod=morning&tz=UTC   (and ?when=...; the hours are read in the zone of the address)
//   time zone     ?tz=UTC&near=1   (tz sets the zone times are read in; near keeps tutors whose clock is within 3 hours of it)
//   level         ?level=beginner
//   trial lesson  ?trial=1
// What this file adds to tests/directory-filters.test.ts, tests/directory-page.test.ts and tests/directory.test.ts: the price RANGE and every
// criterion through the page, all six at once, a list that ends up empty for each kind of reason (with the way back), made-up values for every
// parameter, and the closed directory (fewer than 6 tutors) which must give nothing away to a filtered address. Nothing here reaches a service.
// All names, prices and times are made up.
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import { filtersToQuery, parseFilters, NO_FILTERS } from '@/lib/directory.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

let db: FakeDb
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => ({ from: (table: string) => { const q = db.from(table); return { select: (cols: string, o?: { head?: boolean }) => q.select(cols, o) } } }),
    createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: null } }) } }),
  },
})
mock.module('next/cache', { namedExports: { unstable_cache: (fn: (...a: unknown[]) => unknown) => fn } })
mock.module('next/navigation', { namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, useRouter: () => ({ push() {}, replace() {} }), useSearchParams: () => new URLSearchParams() } })
const page = (await import('@/app/tutors/(directory)/page.tsx')).default as (p: { searchParams: Promise<Record<string, string | string[] | undefined>> }) => Promise<React.ReactElement>

const BIO = 'I teach one to one, with a plan for every lesson, clear homework and a short note after each class for the student.'
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]

type Made = { slug: string; row: Record<string, unknown>; avail: Record<string, unknown>[] }
/** A made-up tutor with the private fields a real row holds. `hours` are the tutor's own wall-clock hours, every day. */
function tutor(first: string, o: Record<string, unknown>, hours: [string, string] = ['00:00', '23:30']): Made {
  const id = `t-${first.toLowerCase()}`
  const slug = first.toLowerCase()
  const row = {
    id, slug, name: `${first} Testname`, bio: BIO, avatar_url: null, languages: ['English'], timezone: 'UTC', booking_url_active: true,
    average_rating: 0, review_count: 0, default_lesson_price: 20, currency: 'USD', trial_enabled: false, trial_price: null, buffer_minutes: 0, levels_taught: [],
    email: `private.${slug}@example.com`, phone: '0900 000 000', stripe_account_id: `acct_${slug}`, payment_link: `https://pay.example.com/${slug}`, ...o,
  }
  const avail = EVERY_DAY.map(d => ({ id: `a-${slug}-${d}`, tutor_id: id, day_of_week: d, start_time: hours[0], end_time: hours[1] }))
  return { slug, row, avail }
}
function seed(tutors: Made[]) {
  db = createFakeDb({ tutors: tutors.map(t => t.row), availability: tutors.flatMap(t => t.avail), availability_exceptions: [], lessons: [] })
}

// Eight tutors; every column of the table below is something one of the six filters reads.
//   slug  language           USD/h    trial  level                   clock (tz)            free hours (own clock)
//   ana   Spanish            12       yes    beginner                Madrid                all day
//   ben   English            28       no     advanced                New York              all day
//   cara  Spanish, English   EUR 27   yes    beginner, intermediate  Madrid                all day
//   dan   German             60       no     advanced                Berlin                all day
//   eve   English            none     no     (said nothing)          Tokyo                 all day
//   fay   French             90       yes    intermediate            Tokyo                 all day
//   gus   English            20       no     beginner                UTC                   18:00 to 21:00 (evening only)
//   hal   English            18       yes    beginner                UTC                   06:00 to 09:00 (morning only)
const EIGHT = () => [
  tutor('Ana', { languages: ['Spanish'], default_lesson_price: 12, trial_enabled: true, trial_price: 5, levels_taught: ['beginner'], timezone: 'Europe/Madrid' }),
  tutor('Ben', { languages: ['English'], default_lesson_price: 28, levels_taught: ['advanced'], timezone: 'America/New_York' }),
  tutor('Cara', { languages: ['Spanish', 'English'], default_lesson_price: 27, currency: 'EUR', trial_enabled: true, trial_price: 10, levels_taught: ['beginner', 'intermediate'], timezone: 'Europe/Madrid' }),
  tutor('Dan', { languages: ['German'], default_lesson_price: 60, levels_taught: ['advanced'], timezone: 'Europe/Berlin' }),
  tutor('Eve', { languages: ['English'], default_lesson_price: null, timezone: 'Asia/Tokyo' }),
  tutor('Fay', { languages: ['French'], default_lesson_price: 90, trial_enabled: true, trial_price: 8, levels_taught: ['intermediate'], timezone: 'Asia/Tokyo' }),
  tutor('Gus', { languages: ['English'], default_lesson_price: 20, levels_taught: ['beginner'], timezone: 'UTC' }, ['18:00', '21:00']),
  tutor('Hal', { languages: ['English'], default_lesson_price: 18, trial_enabled: true, trial_price: 4, levels_taught: ['beginner'], timezone: 'UTC' }, ['06:00', '09:00']),
]
const ALL = ['ana', 'ben', 'cara', 'dan', 'eve', 'fay', 'gus', 'hal']

type Params = Record<string, string | string[] | undefined>
const html = async (p: Params = {}) => renderToStaticMarkup(await page({ searchParams: Promise.resolve(p) }))
const cardsIn = (h: string) => [...h.matchAll(/data-testid="tutor-card" data-slug="([^"]+)"/g)].map(m => m[1]).sort()
const without = (...slugs: string[]) => ALL.filter(s => !slugs.includes(s))

// ---- each of the six, on its own -------------------------------------------------------------------------------------------------------

test('1 language: ?lang= keeps the tutors who teach it, whatever case it is typed in, and a tutor who teaches two is kept for both', async () => {
  seed(EIGHT())
  assert.deepEqual(cardsIn(await html()), ALL, 'no filter: everybody')
  assert.deepEqual(cardsIn(await html({ lang: 'spanish' })), ['ana', 'cara'])
  assert.deepEqual(cardsIn(await html({ lang: 'SPANISH' })), ['ana', 'cara'])
  assert.deepEqual(cardsIn(await html({ lang: 'english' })), ['ben', 'cara', 'eve', 'gus', 'hal'])
  assert.deepEqual(cardsIn(await html({ lang: 'german' })), ['dan'])
})

test('2 price range: ?min= and ?max= are dollars an hour, either end may be left out, a tutor with no price is in no range, euros are converted', async () => {
  seed(EIGHT())
  assert.deepEqual(cardsIn(await html({ min: '25', max: '35' })), ['ben', 'cara'], 'EUR 27 is about $29')
  assert.deepEqual(cardsIn(await html({ min: '60' })), ['dan', 'fay'], 'only a lowest price')
  assert.deepEqual(cardsIn(await html({ max: '15' })), ['ana'], 'only a highest price')
  assert.deepEqual(cardsIn(await html({ min: '35', max: '25' })), ['ben', 'cara'], 'the two ends swapped in the address are put right')
  assert.ok(!cardsIn(await html({ min: '0' })).includes('eve'), 'a range excludes "Ask for price", even from 0')
  assert.deepEqual(cardsIn(await html({ price: '15-30' })), ['cara', 'gus', 'hal', 'ben'].sort(), 'the ready-made bucket beside the range')
  const h = await html({ min: '25', max: '35' })
  assert.match(h, /Remove filter \$25 to \$35/, 'the range is named on the page')
})

test('3 free hours: ?tod= is read on the clock of the zone in the address, so a morning-only tutor and an evening-only tutor are told apart', async () => {
  seed(EIGHT())
  assert.deepEqual(cardsIn(await html({ tz: 'UTC', tod: 'morning' })), without('gus'), 'Gus is free from 18:00')
  assert.deepEqual(cardsIn(await html({ tz: 'UTC', tod: 'evening' })), without('hal'), 'Hal is free until 09:00')
  assert.deepEqual(cardsIn(await html({ tz: 'UTC', tod: 'afternoon' })), without('gus', 'hal'), 'neither limited tutor has an afternoon hour')
  assert.deepEqual(cardsIn(await html({ tz: 'UTC', when: '3days', tod: 'morning' })), without('gus'), 'the day and the time of day together')
  // a morning in Tokyo (UTC+9) is the evening before in UTC: the same free time, read on another clock, lands in another part of the day
  assert.ok(cardsIn(await html({ tz: 'Asia/Tokyo', tod: 'evening' })).includes('hal'), 'Hal 06:00-09:00 UTC is 15:00-18:00 in Tokyo, so it reaches the evening there')
  assert.ok(!cardsIn(await html({ tz: 'Asia/Tokyo', tod: 'morning' })).includes('hal'), 'and no longer the morning')
})

test('4 time zone: ?tz= is a setting (it keeps everybody and sets the clock), ?near=1 keeps the tutors whose clock is within 3 hours of it', async () => {
  seed(EIGHT())
  const tokyo = await html({ tz: 'Asia/Tokyo' })
  assert.deepEqual(cardsIn(tokyo), ALL, 'the zone alone filters nobody')
  assert.match(tokyo, /data-testid="tz-line"[^>]*>.*?Times shown in: Tokyo/s)
  assert.deepEqual(cardsIn(await html({ tz: 'UTC', near: '1' })), without('ben', 'eve', 'fay'), 'New York is 4 or 5 hours behind, Tokyo 9 ahead')
  assert.deepEqual(cardsIn(await html({ tz: 'America/Chicago', near: '1' })), ['ben'], 'from Chicago only New York is within 3 hours')
  assert.deepEqual(cardsIn(await html({ tz: 'Asia/Tokyo', near: '1' })), ['eve', 'fay'])
  assert.match(await html({ tz: 'UTC', near: '1' }), /Remove filter Within 3 hours of you/)
})

test('5 level: ?level= keeps tutors who said they teach it; a tutor who said nothing is not matched', async () => {
  seed(EIGHT())
  assert.deepEqual(cardsIn(await html({ level: 'beginner' })), ['ana', 'cara', 'gus', 'hal'])
  assert.deepEqual(cardsIn(await html({ level: 'intermediate' })), ['cara', 'fay'])
  assert.deepEqual(cardsIn(await html({ level: 'advanced' })), ['ben', 'dan'])
  assert.ok(!cardsIn(await html({ level: 'beginner' })).includes('eve'))
})

test('6 trial lesson: ?trial=1 keeps the tutors who offer one at a price; only 1 turns it on', async () => {
  seed(EIGHT())
  assert.deepEqual(cardsIn(await html({ trial: '1' })), ['ana', 'cara', 'fay', 'hal'])
  for (const off of ['0', 'true', 'yes', '']) assert.deepEqual(cardsIn(await html({ trial: off })), ALL, `trial=${off} is not "on"`)
})

// ---- all six together ------------------------------------------------------------------------------------------------------------------

const SIX: Params = { lang: 'english', min: '15', max: '25', tod: 'morning', tz: 'UTC', near: '1', level: 'beginner', trial: '1' }

test('all six at once keep only the tutor who fits every one, and each one still narrows when the others are on', async () => {
  seed(EIGHT())
  const h = await html(SIX)
  assert.deepEqual(cardsIn(h), ['hal'])
  assert.match(h, /data-testid="directory-count"[^>]*>.*?<b[^>]*>1 tutor<\/b>.* of 8/s, 'the list says how many of how many')
  for (const label of ['English', 'Beginner', 'Morning', 'Trial lesson', '\\$15 to \\$25', 'Within 3 hours of you']) assert.match(h, new RegExp(`Remove filter ${label}`), label)
  // the combined list is exactly what the six give one by one, taken together
  const single: Params[] = [{ lang: 'english' }, { min: '15', max: '25' }, { tod: 'morning', tz: 'UTC' }, { near: '1', tz: 'UTC' }, { level: 'beginner' }, { trial: '1' }]
  let intersection = ALL
  for (const p of single) {
    const one = await cardsIn(await html(p))
    intersection = intersection.filter(s => one.includes(s))
    assert.ok(one.length < ALL.length, `${JSON.stringify(p)} narrows the list on its own`)
  }
  assert.deepEqual(intersection, cardsIn(h), 'the six together are the overlap of the six alone')
  assert.deepEqual(cardsIn(await html({ ...SIX, tod: 'evening' })), [], 'Hal is a morning tutor: the same six with "evening" is empty')
})

test('the address is the filters: the six round-trip through parse and write, and the list on the page is the list in the address', async () => {
  const f = parseFilters(SIX)
  assert.deepEqual({ lang: f.lang, min: f.min, max: f.max, tod: f.tod, tz: f.tz, near: f.near, level: f.level, trial: f.trial }, {
    lang: 'English', min: 15, max: 25, tod: 'morning', tz: 'UTC', near: true, level: 'beginner', trial: true,
  })
  const query = filtersToQuery(f)
  assert.deepEqual(parseFilters(Object.fromEntries(new URLSearchParams(query))), f, 'what is written is read back as the same filters')
  assert.equal(filtersToQuery(NO_FILTERS), '', 'no filter, no query')
  seed(EIGHT())
  assert.deepEqual(cardsIn(await html(Object.fromEntries(new URLSearchParams(query)))), ['hal'], 'opening the written address gives the same list')
})

// ---- a list that ends up empty ---------------------------------------------------------------------------------------------------------

function assertEmptyWithWayBack(h: string, why: RegExp) {
  assert.deepEqual(cardsIn(h), [])
  assert.match(h, /data-testid="directory-nomatch"/)
  assert.match(h, /No tutors match these filters/)
  assert.match(h, /Nobody with open times fits /, 'it says what was asked for')
  assert.match(h, why, 'it names the filter to remove and how many tutors that brings back')
  assert.match(h, /Clear all filters/)
  assert.match(h, /data-testid="applied-filters"/, 'the chips stay so each filter can be taken off one by one')
  assert.match(h, /data-testid="directory-count"[^>]*>.*?<b[^>]*>0 tutors<\/b>.* of 8/s)
  assert.match(h, /Find a language tutor you can book today/, 'the page is not blank: the title stays')
  assert.match(h, /aria-label="Search tutors"/, 'and so does the search box')
}

test('no tutor matches: the page says so, names what was asked for, offers the filter whose removal brings tutors back, and a way to clear', async () => {
  seed(EIGHT())
  assertEmptyWithWayBack(await html({ lang: 'japanese' }), /removing Japanese \(8 tutors\)/)
  assertEmptyWithWayBack(await html({ min: '200' }), /removing From \$200 \(8 tutors\)/)
  assertEmptyWithWayBack(await html({ tz: 'Pacific/Honolulu', near: '1' }), /removing Within 3 hours of you \(8 tutors\)/)
  assertEmptyWithWayBack(await html({ lang: 'german', trial: '1', level: 'beginner' }), /removing German \(3 tutors\)/)
  assertEmptyWithWayBack(await html({ ...SIX, tod: 'evening' }), /removing [^(<]+\(\d+ tutors?\)/)
  // two ways back are offered at most, best first, so the sentence stays short
  const h = await html({ lang: 'english', level: 'advanced', trial: '1' })
  assert.deepEqual(cardsIn(h), [])
  assert.ok((h.match(/>removing /g) ?? []).length <= 2)
})

test('an empty result keeps what the visitor chose to read the page in: the zone and the sort survive "Clear all"', async () => {
  seed(EIGHT())
  const h = await html({ lang: 'japanese', tz: 'Asia/Tokyo', sort: 'price-low' })
  assert.match(h, /Times shown in: Tokyo/)
  assert.match(h, /<option value="price-low" selected="">Price: low to high<\/option>/)
})

// ---- made-up values and privacy --------------------------------------------------------------------------------------------------------

test('a made-up value in any of the parameters is dropped; the page is the plain list and nothing from the address comes back as markup', async () => {
  seed(EIGHT())
  const evil = '<script>alert(1)</script>'
  const hostile: Params[] = [
    { lang: evil }, { min: 'abc' }, { max: '-5' }, { min: '1e3', max: '2.5' }, { min: '99999' }, { tod: 'midnight' }, { when: 'never' }, { tz: '../../etc/passwd' },
    { tz: 'Mars/Olympus_Mons', near: '1' }, { near: 'yes' }, { level: 'expert' }, { level: evil }, { trial: 'on' }, { price: 'free' }, { sort: 'cheapest' }, { q: evil },
  ]
  for (const p of hostile) {
    const h = await html(p)
    assert.ok(!h.includes('<script>alert'), `no raw script from ${JSON.stringify(p)}`)
    assert.ok(!h.includes('etc/passwd'), `no path echoed from ${JSON.stringify(p)}`)
    if (!('lang' in p) && !('q' in p)) assert.ok(cardsIn(h).length > 0, `${JSON.stringify(p)} still lists tutors`)
  }
  assert.deepEqual(cardsIn(await html({ min: 'abc', max: '-5', level: 'expert', tod: 'midnight', tz: '../../etc/passwd', near: 'yes', trial: 'on' })), ALL, 'all made-up: the plain list')
  assert.deepEqual(cardsIn(await html({ min: '9999' })), [], 'a number above the cap is cut to the cap ($500): nobody costs that much')
  assert.deepEqual(cardsIn(await html({ min: '99999' })), ALL, 'five digits are not a price in the address: dropped')
  assert.deepEqual(cardsIn(await html({ lang: ['spanish', 'german'] })), ['ana', 'cara'], 'a repeated key counts the first value only')
})

test('a filtered page draws nothing private about any tutor: no email, phone, payment field, id or column name', async () => {
  seed(EIGHT())
  for (const p of [SIX, { lang: 'spanish' }, { min: '10', max: '100' }, { tz: 'UTC', near: '1', tod: 'evening' }, { level: 'advanced' }, { trial: '1' }, { lang: 'japanese' }]) {
    const h = await html(p)
    for (const leak of ['private.', '@example.com', '0900 000 000', 'acct_', 'pay.example.com', 'levels_taught', 'booking_url_active', 'stripe_account_id', '"t-ana"', 't-hal']) {
      assert.ok(!h.includes(leak), `${JSON.stringify(p)} must not carry "${leak}"`)
    }
  }
})

// ---- the closed directory --------------------------------------------------------------------------------------------------------------

test('while fewer than 6 tutors can be booked the directory is closed: a filtered address shows the "opens soon" state, no card and no tutor', async () => {
  seed(EIGHT().slice(0, 5))
  for (const p of [{}, { lang: 'spanish' }, SIX, { level: 'beginner', trial: '1' }, { min: '1', max: '500' }]) {
    const h = await html(p)
    assert.deepEqual(cardsIn(h), [], `${JSON.stringify(p)}: no card while closed`)
    assert.match(h, /data-testid="directory-empty"/)
    assert.match(h, /The tutor directory opens soon/)
    assert.match(h, /href="\/register"/, 'and a way for tutors to join')
    assert.ok(!h.includes('data-testid="directory-nomatch"'), 'a closed directory is not a "no match" page: there is nothing to match yet')
    for (const name of ['Ana Testname', 'Cara Testname', 'Ben Testname', 'private.', 'acct_']) assert.ok(!h.includes(name), `${JSON.stringify(p)} must not reveal "${name}"`)
  }
  seed(EIGHT().slice(0, 6))
  assert.deepEqual(cardsIn(await html({ lang: 'spanish' })), ['ana', 'cara'], 'the sixth tutor opens it: the same address now filters')
})
