// The "Get your first student" card on the tutor dashboard (T-0681): five steps whose ticks come from the
// tutor's own data, each button leading to a page that exists, a card that goes away when done or hidden,
// and nothing read from another tutor. The real dashboard page runs over an in-memory database.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import { settingsSource } from './support/settings-source.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(SRC, rel), 'utf8').replace(/\r\n/g, '\n')

let db: { from(table: string): unknown } = createFakeDb({})
let currentUser: { id: string; email: string } | null = null

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) }, from: (t: string) => db.from(t) }),
  },
})

const lib = await import('@/lib/first-student.ts')
const { FirstStudentView } = await import('@/components/dashboard/FirstStudentCard.tsx')
const DashboardPage = (await import('@/app/(dashboard)/dashboard/page.tsx')).default as () => Promise<{ props: { data: { firstStudent: ReturnType<typeof lib.buildFirstStudent>; tutorId: string } } }>

beforeEach(() => { currentUser = null })

const ME = 'tutor-me'
const OTHER = 'tutor-other'

// A tutor who has done nothing yet, and what each step needs to turn green.
const NOTHING: Parameters<typeof lib.buildFirstStudent>[0] = {
  tutorEmail: 'Me@Example.com', plan: 'free', slug: 'sarah-test',
  studentEmails: [], availabilityRows: 0, lessonDurations: null, cardLink: null, lessons: 0,
}
const tick = (f: typeof NOTHING, id: string) => lib.buildFirstStudent(f)?.steps.find(s => s.id === id)?.done
const stepOf = (f: typeof NOTHING, id: string) => lib.buildFirstStudent(f)!.steps.find(s => s.id === id)!

// ---- the five ticks -------------------------------------------------------------------

test('a new tutor sees five open steps in the order of the ticket', () => {
  const card = lib.buildFirstStudent(NOTHING)!
  assert.deepEqual(card.steps.map(s => s.id), ['student', 'availability', 'lengths', 'payment', 'share'])
  assert.deepEqual(card.steps.map(s => s.done), [false, false, false, false, false])
  assert.equal(card.required, 4) // Free plan: card payments are Pro, so that step is shown but not required
  assert.equal(card.done, 0)
})

test('step 1: only a REAL student counts, not the tutor under their own email', () => {
  assert.equal(tick({ ...NOTHING, studentEmails: ['me@example.com'] }, 'student'), false)
  assert.equal(tick({ ...NOTHING, studentEmails: ['  ME@EXAMPLE.COM '] }, 'student'), false) // letter case and spaces
  assert.equal(tick({ ...NOTHING, studentEmails: ['me@example.com', 'kid@example.com'] }, 'student'), true)
  assert.equal(tick({ ...NOTHING, studentEmails: [null] }, 'student'), true) // a student with no email is a real one
  assert.equal(tick({ ...NOTHING, studentEmails: [] }, 'student'), false)
})

test('step 2: free hours are set when there is at least one availability row', () => {
  assert.equal(tick(NOTHING, 'availability'), false)
  assert.equal(tick({ ...NOTHING, availabilityRows: 1 }, 'availability'), true)
})

test('step 3: lesson lengths are chosen only when the tutor saved a valid list', () => {
  for (const nothing of [null, undefined, [], 'x', [7], [0], [12, 250], {}]) assert.equal(tick({ ...NOTHING, lessonDurations: nothing }, 'lengths'), false, JSON.stringify(nothing))
  assert.equal(tick({ ...NOTHING, lessonDurations: [60] }, 'lengths'), true)
  assert.equal(tick({ ...NOTHING, lessonDurations: [75] }, 'lengths'), true, 'a custom length alone counts (T-0700)')
  assert.equal(tick({ ...NOTHING, lessonDurations: [30, 45, 60, 90] }, 'lengths'), true)
})

test('step 4: only a safe https card link ticks; the Free plan shows it with a Pro tag and does not need it', () => {
  const pro = { ...NOTHING, plan: 'pro' }
  for (const bad of [null, '', '   ', 'http://buy.stripe.com/x', 'javascript:alert(1)', 'buy.stripe.com/x', 'https://a b.com', `https://user:pw${'@'}buy.stripe.com/x`]) {
    assert.equal(tick({ ...pro, cardLink: bad }, 'payment'), false, String(bad))
  }
  assert.equal(tick({ ...pro, cardLink: 'https://buy.stripe.com/test_abc' }, 'payment'), true)
  assert.equal(stepOf(NOTHING, 'payment').proOnly, true)
  assert.equal(stepOf(pro, 'payment').proOnly, false)
  assert.equal(stepOf(NOTHING, 'payment').action, 'See Pro')
  assert.equal(stepOf(pro, 'payment').action, 'Add link')
})

test('step 5: shared and tested when a lesson exists', () => {
  assert.equal(tick(NOTHING, 'share'), false)
  assert.equal(tick({ ...NOTHING, lessons: 1 }, 'share'), true)
})

test('the card goes away when every required step is done', () => {
  const done = { ...NOTHING, studentEmails: ['kid@example.com'], availabilityRows: 3, lessonDurations: [60], lessons: 2 }
  assert.equal(lib.buildFirstStudent(done), null) // Free plan: four steps are enough
  const pro = { ...done, plan: 'pro' }
  const card = lib.buildFirstStudent(pro)! // Pro plan: the card link is required too
  assert.equal(card.done, 4)
  assert.equal(card.required, 5)
  assert.equal(lib.buildFirstStudent({ ...pro, cardLink: 'https://buy.stripe.com/x' }), null)
})

test('a tutor with one step missing still sees the card, with the right count', () => {
  const card = lib.buildFirstStudent({ ...NOTHING, studentEmails: ['kid@example.com'], availabilityRows: 1, lessonDurations: [60] })!
  assert.equal(card.done, 3)
  assert.equal(card.required, 4)
  assert.deepEqual(card.steps.filter(s => !s.done && !s.proOnly).map(s => s.id), ['share'])
})

// ---- each button leads to the right page ----------------------------------------------

test('every button opens a page that exists, and the settings links name a real tab', () => {
  const card = lib.buildFirstStudent(NOTHING)!
  const hrefs = Object.fromEntries(card.steps.map(s => [s.id, s.href]))
  assert.deepEqual(hrefs, {
    student: '/students/new', availability: '/availability', lengths: '/settings?tab=booking',
    payment: '/settings?tab=payments', share: '/book/sarah-test',
  })
  const pageFile: Record<string, string> = {
    '/students/new': 'app/(dashboard)/students/new/page.tsx',
    '/availability': 'app/(dashboard)/availability/page.tsx',
    '/settings': 'app/(dashboard)/settings/page.tsx',
    '/book/sarah-test': 'app/book/[slug]/page.tsx',
  }
  const settings = settingsSource()
  for (const href of Object.values(hrefs)) {
    const url = new URL(href, 'https://example.test')
    assert.ok(existsSync(path.join(SRC, pageFile[url.pathname] ?? 'missing')), `no page for ${href}`)
    const tabId = url.searchParams.get('tab')
    if (tabId) assert.ok(settings.includes(`id: '${tabId}'`), `Settings has no tab "${tabId}"`)
  }
  // and the field each settings link points at is in that tab
  assert.match(settings, /Lesson lengths/)
  assert.match(settings, /Card payment link \(Stripe Payment Link\)/)
})

test('the share step falls back to Settings when the tutor has no booking address yet', () => {
  const card = lib.buildFirstStudent({ ...NOTHING, slug: null })!
  assert.equal(card.bookingUrl, null)
  assert.equal(card.steps.find(s => s.id === 'share')!.href, '/settings?tab=booking')
})

// ---- what the card looks like -----------------------------------------------------------

test('the card shows five steps with their ticks, a Pro tag on the Free plan, a copy button and a Hide button', () => {
  const card = lib.buildFirstStudent({ ...NOTHING, studentEmails: ['kid@example.com'] })!
  const html = renderToStaticMarkup(FirstStudentView({ card }))
  assert.match(html, /Get your first student/)
  assert.match(html, /1 of 4 done/)
  assert.equal([...html.matchAll(/data-step="/g)].length, 5)
  assert.match(html, /data-step="student" data-done="true"/)
  assert.match(html, /data-step="availability" data-done="false"/)
  assert.match(html, />Pro</)
  assert.match(html, /data-testid="copy-booking-link"/)
  assert.match(html, /aria-label="Hide the Get your first student card"/)
  for (const h of ['/students/new', '/availability', '/settings?tab=booking', '/settings?tab=payments', '/book/sarah-test']) assert.ok(html.includes(`href="${h.replace('&', '&amp;')}"`), h)
  assert.match(html, /Done: <\/span>Add your first real student/) // a screen reader hears which steps are done
  assert.match(html, /To do: <\/span>Set your free hours/)
})

test('it sends nothing: no email, no message, no fetch to any service', () => {
  for (const f of ['lib/first-student.ts', 'components/dashboard/FirstStudentCard.tsx']) {
    const code = read(f).split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
    assert.doesNotMatch(code, /resend|sendMail|nodemailer|\bfetch\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/i, f)
  }
})

// ---- hiding the card ---------------------------------------------------------------------

function memoryStorage() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, m }
}

test('Hide is remembered for that tutor only, in the browser', () => {
  const s = memoryStorage()
  assert.equal(lib.readHidden(s, ME), false)
  lib.writeHidden(s, ME)
  assert.equal(lib.readHidden(s, ME), true)
  assert.equal(lib.readHidden(s, OTHER), false) // another tutor on the same browser still sees theirs
  assert.deepEqual([...s.m.keys()], [`tutafy:first-student-hidden:${ME}`])
})

test('blocked or missing browser storage never breaks the card: it just stays', () => {
  const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') } }
  assert.equal(lib.readHidden(broken, ME), false)
  assert.doesNotThrow(() => lib.writeHidden(broken, ME))
  assert.equal(lib.readHidden(null, ME), false)
  assert.doesNotThrow(() => lib.writeHidden(null, ME))
})

test('the card component hides itself from that flag and writes it when Hide is pressed', () => {
  const src = read('components/dashboard/FirstStudentCard.tsx')
  assert.match(src, /if \(hidden\) return null/)
  assert.match(src, /readHidden\(browserStorage\(\), tutorId\)/)
  assert.match(src, /onHide=\{\(\) => \{\s*writeHidden\(browserStorage\(\), tutorId\)/)
  assert.match(src, /\(\) => true,\s*\)/) // on the server the card starts hidden, so a hidden card never flashes
  assert.match(read('components/dashboard/DashboardHome.tsx'), /data\.firstStudent && <FirstStudentCard card=\{data\.firstStudent\} tutorId=\{data\.tutorId\} \/>/)
})

// ---- the data: only this tutor's rows ----------------------------------------------------

function world(): FakeDb {
  return createFakeDb({
    tutors: [
      { id: ME, email: 'me@example.com', slug: 'me-slug', subscription_status: 'free', paddle_checkout_link: null, lesson_durations: null },
      { id: OTHER, email: 'other@example.com', slug: 'other-slug', subscription_status: 'pro', paddle_checkout_link: 'https://buy.stripe.com/other', lesson_durations: [30, 60] },
    ],
    // I have only myself as a "student"; the other tutor has a real one, hours, a lesson and a payment link
    students: [
      { id: 's-me', tutor_id: ME, email: 'ME@example.com', status: 'active' },
      { id: 's-other', tutor_id: OTHER, email: 'kid@example.com', status: 'active' },
    ],
    availability: [{ id: 'a1', tutor_id: OTHER, day_of_week: 1 }],
    lessons: [{ id: 'l1', tutor_id: OTHER, student_id: 's-other', status: 'scheduled', starts_at: '2099-01-01T10:00:00.000Z' }],
  })
}

test('loadFirstStudent reads this tutor only: another tutor\'s student, hours, lesson, link and lengths tick nothing', async () => {
  const card = await lib.loadFirstStudent(world(), ME)
  assert.ok(card)
  assert.deepEqual(card.steps.map(s => s.done), [false, false, false, false, false])
  assert.equal(card.bookingUrl, 'https://www.tutafy.com/book/me-slug')
  // the other tutor has done all five of theirs, so they get no card (and mine did not borrow any of it)
  assert.equal(await lib.loadFirstStudent(world(), OTHER), null)
})

test('a tutor who has done four of five steps sees one left; who has done them all sees no card', async () => {
  const d = world()
  d.tables.students.push({ id: 's2', tutor_id: ME, email: 'real@example.com', status: 'active' })
  d.tables.availability.push({ id: 'a2', tutor_id: ME, day_of_week: 2 })
  d.tables.tutors[0].lesson_durations = [60]
  const card = (await lib.loadFirstStudent(d, ME))!
  assert.equal(card.done, 3)
  d.tables.lessons.push({ id: 'l2', tutor_id: ME, student_id: 's2', status: 'scheduled', starts_at: '2099-01-02T10:00:00.000Z' })
  assert.equal(await lib.loadFirstStudent(d, ME), null)
})

test('a failing read shows no card at all, never a wrong list; a missing lengths column only leaves that step open', async () => {
  const ok = world()
  const broken = (table: string) => ({
    from: (t: string) => {
      const b = ok.from(t)
      if (t !== table) return b
      return Object.assign(b, { then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: { message: 'boom' }, count: null }) })
    },
  })
  assert.equal(await lib.loadFirstStudent(broken('students'), ME), null)
  assert.equal(await lib.loadFirstStudent(broken('availability'), ME), null)
  assert.equal(await lib.loadFirstStudent(broken('lessons'), ME), null)

  // the column of migration 018 does not exist yet: that query alone errors
  let selects = 0
  const noColumn = {
    from: (t: string) => {
      const b = ok.from(t) as { select: (c?: string, o?: unknown) => unknown }
      if (t !== 'tutors') return b
      const original = b.select.bind(b)
      b.select = (cols?: string, o?: unknown) => {
        selects++
        const q = original(cols, o) as object
        return cols === 'lesson_durations' ? Object.assign(q, { then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: { message: 'column does not exist' } }) }) : q
      }
      return b
    },
  }
  const d = ok
  d.tables.tutors[0].lesson_durations = [60] // even though the tutor chose, the unreadable column leaves the step open
  const card = await lib.loadFirstStudent(noColumn, ME)
  assert.ok(card)
  assert.equal(card.steps.find(s => s.id === 'lengths')!.done, false)
  assert.ok(selects >= 2)
})

// ---- the real dashboard page -------------------------------------------------------------

test('the real dashboard page hands the card to the dashboard: a new tutor gets it, a finished one does not', async () => {
  const d = world()
  db = d
  currentUser = { id: ME, email: 'me@example.com' }
  const page = await DashboardPage()
  assert.equal(page.props.data.tutorId, ME)
  assert.deepEqual(page.props.data.firstStudent!.steps.map(s => s.done), [false, false, false, false, false])

  currentUser = { id: OTHER, email: 'other@example.com' }
  assert.equal((await DashboardPage()).props.data.firstStudent, null) // the other tutor has done all five
})

test('the dashboard page asks for the card with the signed-in tutor\'s id, never an id from the request', () => {
  const src = read('app/(dashboard)/dashboard/page.tsx')
  assert.match(src, /loadFirstStudent\(supabase, user!\.id\)/)
  const lib = read('lib/first-student.ts')
  const queries = lib.match(/db\.from\([^)]*\)[^\n]*/g) ?? []
  assert.equal(queries.length, 5)
  for (const q of queries) assert.match(q, /\.eq\('(id|tutor_id)', tutorId\)/, q)
})
