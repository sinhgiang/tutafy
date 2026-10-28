// The "no free hours yet" banner on the tutor dashboard (T-0739): a tutor with no weekly free-hours row sees it,
// with a button to the page where they pick their hours; a tutor with hours does not; one tutor never sees
// another tutor's state; and it only reads (nothing is written, nothing is sent, no hours are guessed).
// The real dashboard page runs over an in-memory database and is rendered to HTML.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(SRC, rel), 'utf8').replace(/\r\n/g, '\n')
const code = (rel: string) => read(rel).split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')

let db: { from(table: string): unknown } = createFakeDb({})
let currentUser: { id: string; email: string } | null = null

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) }, from: (t: string) => db.from(t) }),
  },
})

const lib = await import('@/lib/no-hours-banner.ts')
const { NoHoursBanner } = await import('@/components/dashboard/NoHoursBanner.tsx')
const { DashboardHome } = await import('@/components/dashboard/DashboardHome.tsx')
type Page = { props: { data: { noHours: ReturnType<typeof lib.buildNoHoursBanner>; tutorId: string } } }
const DashboardPage = (await import('@/app/(dashboard)/dashboard/page.tsx')).default as () => Promise<Page>

beforeEach(() => { currentUser = null })

const ME = 'tutor-me'
const OTHER = 'tutor-other'
const TESTID = 'data-testid="no-hours-banner"'

/** I have no hours; the other tutor has one. */
function world(): FakeDb {
  return createFakeDb({
    tutors: [
      { id: ME, name: 'Mia Test', email: 'me@example.com', slug: 'me-slug', subscription_status: 'free' },
      { id: OTHER, name: 'Omar Test', email: 'other@example.com', slug: 'other-slug', subscription_status: 'free' },
    ],
    availability: [{ id: 'a1', tutor_id: OTHER, day_of_week: 1, start_time: '09:00', end_time: '17:00' }],
  })
}

// ---- who sees it --------------------------------------------------------------------------

test('no hours: the banner; one or more hours: none; an unknown count: none', () => {
  assert.deepEqual(lib.buildNoHoursBanner(0), lib.NO_HOURS_BANNER)
  for (const n of [1, 2, 7, 40]) assert.equal(lib.buildNoHoursBanner(n), null, String(n))
  assert.equal(lib.buildNoHoursBanner(null), null) // a read that did not answer must not tell anyone they have no hours
})

test('the words are English, say students cannot book, and the button opens the page that picks the hours', () => {
  const b = lib.NO_HOURS_BANNER
  assert.match(b.title, /^Your booking page has no hours yet/)
  assert.match(b.text, /Students cannot book you/)
  assert.equal(b.action, 'Add your hours')
  assert.equal(b.href, '/availability')
  assert.ok(existsSync(path.join(SRC, 'app/(dashboard)/availability/page.tsx')), 'the button must lead to a page that exists')
  // that page writes the same four columns the booking page reads (a whole-number day, no day word, no is_available)
  const page = read('app/(dashboard)/availability/page.tsx')
  assert.match(page, /day_of_week: parseInt\(newDay\)/)
  assert.doesNotMatch(page, /is_available/)
})

test('the banner draws its words and one link to the hours page', () => {
  const html = renderToStaticMarkup(createElement(NoHoursBanner, { banner: lib.NO_HOURS_BANNER }))
  assert.ok(html.includes(TESTID))
  assert.match(html, /Your booking page has no hours yet/)
  assert.match(html, /<a [^>]*href="\/availability"[^>]*>Add your hours<\/a>/)
  assert.equal((html.match(/<a /g) ?? []).length, 1)
})

// ---- the data: only this tutor's rows ------------------------------------------------------

/** What the second-person check asks of a loader: my banner depends on MY rows, not the other tutor's. */
async function secondPersonOk(load: (db: FakeDb, id: string) => Promise<unknown>): Promise<boolean> {
  const d = world() // I have none, the other has one
  if ((await load(d, ME)) === null) return false // I must see the banner although someone else has hours
  if ((await load(d, OTHER)) !== null) return false // the other must not see it
  d.tables.availability.push({ id: 'a2', tutor_id: ME, day_of_week: 3 })
  if ((await load(d, ME)) !== null) return false // the banner goes as soon as I add hours
  d.tables.availability.length = 0 // now nobody has hours: both see it, each from their own empty rows
  d.tables.availability.push({ id: 'a3', tutor_id: 'tutor-third', day_of_week: 2 })
  return (await load(d, ME)) !== null && (await load(d, OTHER)) !== null
}

test('loadNoHoursBanner reads this tutor only: another tutor\'s hours neither hide my banner nor show theirs', async () => {
  assert.equal(await secondPersonOk(lib.loadNoHoursBanner), true)
})

test('mutation: a loader that counts everybody\'s hours (no tutor filter) fails the second-person check', async () => {
  const leaky = async (d: FakeDb) => {
    const { count, error } = await d.from('availability').select('id', { count: 'exact', head: true })
    return error || count == null ? null : lib.buildNoHoursBanner(count)
  }
  assert.equal(await secondPersonOk(leaky), false)
  // and one that asks for the wrong tutor (the first row's) fails it too
  const wrongTutor = async (d: FakeDb) => {
    const first = (d.tables.availability[0]?.tutor_id as string | undefined) ?? 'none'
    return lib.loadNoHoursBanner(d, first)
  }
  assert.equal(await secondPersonOk(wrongTutor), false)
})

test('a failing read shows no banner, never a wrong one', async () => {
  const ok = world()
  const broken = {
    from: (t: string) => {
      const b = ok.from(t)
      return t === 'availability' ? Object.assign(b, { then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: { message: 'boom' }, count: null }) }) : b
    },
  }
  assert.equal(await lib.loadNoHoursBanner(broken, ME), null)
})

// ---- the real dashboard page ---------------------------------------------------------------

async function renderFor(id: string, d: FakeDb): Promise<{ html: string; page: Page }> {
  db = d
  currentUser = { id, email: `${id}@example.com` }
  const page = await DashboardPage()
  return { html: renderToStaticMarkup(createElement(DashboardHome, { data: page.props.data as never })), page }
}

test('the real dashboard: a tutor with no hours sees the hours prompt above the greeting; a tutor with hours does not', async () => {
  const d = world()
  const mine = await renderFor(ME, d)
  assert.equal(mine.page.props.data.tutorId, ME)
  // T-1043: the "Get ready for the tutor directory" card carries the same prompt as its first step, so the banner gives way to it
  assert.ok(mine.html.includes('data-testid="directory-setup"'), 'I have no hours: the setup card')
  assert.equal(mine.html.includes(TESTID), false, 'the banner is not drawn twice beside the setup card')
  assert.match(mine.html, /<a [^>]*href="\/availability"[^>]*>Choose free hours/)
  assert.ok(mine.html.indexOf('data-testid="directory-setup"') < mine.html.indexOf('Hello,'), 'the prompt is the first thing on the page')
  assert.notEqual(mine.page.props.data.noHours, null, 'the banner data is still read, for the fallback when the setup read fails')

  const theirs = await renderFor(OTHER, d)
  assert.equal(theirs.html.includes(TESTID), false, 'the other tutor has hours: no banner, and mine is not shown to them')
  assert.equal(theirs.page.props.data.noHours, null)

  // after I add my first hour the banner is gone on the next load
  d.tables.availability.push({ id: 'a2', tutor_id: ME, day_of_week: 2, start_time: '10:00', end_time: '12:00' })
  assert.equal((await renderFor(ME, d)).html.includes(TESTID), false)
})

test('loading the dashboard writes nothing for the tutor: only reads reach the database', async () => {
  const d = world()
  const rows = () => JSON.stringify(Object.entries(d.tables).filter(([, r]) => r.length > 0)) // a read may make an empty table; it adds no row
  const before = rows()
  await renderFor(ME, d)
  assert.equal(rows(), before, 'no row was added, changed or removed')
  assert.deepEqual([...new Set(d.log.map(l => l.op))].filter(op => op !== 'select'), [])
})

test('it sends nothing and guesses nothing: no mail, no fetch, no insert, update, upsert, delete or rpc', () => {
  for (const f of ['lib/no-hours-banner.ts', 'components/dashboard/NoHoursBanner.tsx']) {
    assert.doesNotMatch(code(f), /resend|sendMail|nodemailer|\bfetch\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/i, f)
  }
})

test('the page asks with the signed-in tutor\'s id, never an id from the request, and every query names the tutor', () => {
  const page = read('app/(dashboard)/dashboard/page.tsx')
  assert.match(page, /loadNoHoursBanner\(supabase, user!\.id\)/)
  const queries = read('lib/no-hours-banner.ts').match(/db\.from\([^)]*\)[^\n]*/g) ?? []
  assert.equal(queries.length, 1)
  for (const q of queries) assert.match(q, /\.eq\('tutor_id', tutorId\)/, q)
  // drawn from the one place the dashboard data comes in, and nowhere on a request-controlled value
  assert.match(read('components/dashboard/DashboardHome.tsx'), /data\.noHours && !data\.setup && <NoHoursBanner banner=\{data\.noHours\} \/>/)
})

test('when the setup read fails (no setup card) the banner still shows, so a tutor with no hours is never left without a prompt', () => {
  const html = renderToStaticMarkup(createElement(DashboardHome, { data: {
    firstName: 'Mia', dateLabel: 'Today', nextLessonHref: null, lessons: { upcoming: [], past: [], cancelled: [] }, atRisk: [], reminders: [],
    week: { labels: [], lessons: [], revenue: [] }, weekTotalLessons: 0, currencySymbol: '$', tutorId: ME, firstStudent: null,
    noHours: lib.NO_HOURS_BANNER, setup: null,
  } as never }))
  assert.ok(html.includes(TESTID))
  assert.equal(html.includes('data-testid="directory-setup"'), false)
})
