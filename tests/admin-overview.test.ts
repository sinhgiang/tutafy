// /admin (Platform Overview, T-0680; since T-0699 the first page is "My customers" and keeps these numbers under "Whole platform"): real students apart from self-added ones, active and activated
// tutors, sign-ups per week, and an error box that names the table. The real page is rendered to HTML
// over an in-memory database; Supabase and next/navigation are faked.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import './support/admin-lang.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(SRC, rel), 'utf8').replace(/\r\n/g, '\n')

let currentUser: { id: string; email: string } | null = null
let db: { from(table: string): unknown } = createFakeDb({})
let adminClients = 0
const redirects: string[] = []

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }),
    createAdminClient: () => { adminClients++; return db },
  },
})
mock.module('next/navigation', {
  exports: { redirect: (to: string) => { redirects.push(to); throw new Error(`NEXT_REDIRECT:${to}`) } },
})

const { ADMIN_EMAIL } = await import('@/lib/admin.ts')
const overview = await import('@/lib/platform-overview.ts')
const { readErrorMessage } = await import('@/lib/read-errors.ts')
const { loadSuperAdmin } = await import('@/lib/super-admin-data.ts')
const { loadPeople } = await import('@/lib/people-data.ts')
const Page = (await import('@/app/(admin)/admin/page.tsx')).default as () => Promise<React.ReactElement>

beforeEach(() => { currentUser = null; redirects.length = 0; adminClients = 0 })

const ADMIN = { id: 'u-0', email: ADMIN_EMAIL }
const TUTOR = { id: 'u-1', email: 'ten@example.com' }

// Five tutors. Ann has a self-added student (her own email, in other letters) and a real one;
// Ben only a self-added one; Cy two real ones (one without an email); Di only a self-added one; Eve none.
const NOW = new Date('2026-10-21T12:00:00.000Z') // a Wednesday; its week starts Monday 2026-10-19
const day = (d: string, time = '10:00:00') => `${d}T${time}.000Z`

function sample() {
  return createFakeDb({
    tutors: [
      { id: 'A', name: 'Ann', email: 'Ann@Example.com', created_at: day('2026-10-20') },
      { id: 'B', name: 'Ben', email: 'ben@example.com', created_at: day('2026-10-19', '00:00:00') },
      { id: 'C', name: 'Cy', email: 'cy@example.com', created_at: day('2026-10-18', '23:59:59') },
      { id: 'D', name: 'Di', email: 'di@example.com', created_at: day('2026-08-03', '00:00:00') },
      { id: 'E', name: 'Eve', email: 'eve@example.com', created_at: day('2026-08-02', '23:59:59') },
    ],
    students: [
      { id: 's1', tutor_id: 'A', email: ' ann@example.com ' },
      { id: 's2', tutor_id: 'A', email: 'kid1@example.com' },
      { id: 's3', tutor_id: 'B', email: 'ben@example.com' },
      { id: 's4', tutor_id: 'C', email: 'kid2@example.com' },
      { id: 's5', tutor_id: 'C', email: null },
      { id: 's6', tutor_id: 'D', email: 'di@example.com' },
    ],
    lessons: [
      { id: 'l1', tutor_id: 'A', student_id: 's1', status: 'completed', starts_at: day('2026-10-10'), tutors: { name: 'Ann' }, students: { name: 'Ann' } },
      { id: 'l2', tutor_id: 'A', student_id: 's2', status: 'scheduled', starts_at: day('2026-10-12'), tutors: { name: 'Ann' }, students: { name: 'Kid One' } },
      { id: 'l3', tutor_id: 'B', student_id: 's3', status: 'completed', starts_at: day('2026-10-11'), tutors: { name: 'Ben' }, students: { name: 'Ben' } },
      { id: 'l4', tutor_id: 'C', student_id: 's4', status: 'completed', starts_at: day('2026-10-13'), tutors: { name: 'Cy' }, students: { name: 'Kid Two' } },
      { id: 'l5', tutor_id: 'C', student_id: 's5', status: 'cancelled', starts_at: day('2026-10-14'), tutors: { name: 'Cy' }, students: { name: 'No Mail' } },
    ],
  })
}

/** A client where every read of `broken` fails, like a table that does not exist. */
function failing(ok: FakeDb, ...broken: string[]) {
  return {
    from: (table: string) => (broken.includes(table)
      ? Object.assign(ok.from(table), { then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: { message: 'relation does not exist' }, count: null }) })
      : ok.from(table)),
  }
}

async function render(): Promise<string> {
  currentUser = ADMIN
  return renderToStaticMarkup(await Page())
}

/** The number printed on one stat card, from the real page's HTML. */
function stat(html: string, id: string): string {
  const card = html.split(`data-stat="${id}"`)[1]?.split('data-stat=')[0] ?? ''
  const m = card.match(/data-value[^>]*>([^<]*)</)
  assert.ok(m, `no card ${id}`)
  return m[1]
}

// ---- who may see it -----------------------------------------------------------------

test('the page runs the admin check itself, before it opens the database client', () => {
  const page = read('app/(admin)/admin/page.tsx')
  const gate = page.indexOf('await requireAdminPage()')
  assert.ok(gate > 0 && page.indexOf('createAdminClient()') > gate)
  assert.match(read('app/(admin)/layout.tsx'), /await requireAdminPage\(\)/)
})

test('a tutor and a signed-out visitor are turned away before any read; the admin gets the page', async () => {
  db = sample()
  currentUser = TUTOR
  await assert.rejects(Page(), /NEXT_REDIRECT:\/dashboard/)
  currentUser = null
  await assert.rejects(Page(), /NEXT_REDIRECT:\/login/)
  assert.equal(adminClients, 0, 'the service-role client must not even be created for them')
  assert.ok((await render()).includes('My customers'))
})

// ---- the numbers --------------------------------------------------------------------

test('isSelfAdded: the tutor\'s own email in any case or spacing; no email, or another email, is a real student', () => {
  assert.equal(overview.isSelfAdded('ann@example.com', 'ann@example.com'), true)
  assert.equal(overview.isSelfAdded('  ANN@Example.COM ', 'ann@example.com'), true)
  assert.equal(overview.isSelfAdded('kid@example.com', 'ann@example.com'), false)
  assert.equal(overview.isSelfAdded(null, 'ann@example.com'), false)
  assert.equal(overview.isSelfAdded('', ''), false) // two empty emails are not "the same email"
  assert.equal(overview.isSelfAdded('ann@example.com', null), false)
})

test('real students are told apart from self-added ones, and the two add up to the total', async () => {
  const d = await overview.loadOverview(sample(), NOW)
  assert.equal(d.totalStudents, 6)
  assert.equal(d.selfAddedStudents, 3) // s1 (other letters, spaces), s3, s6
  assert.equal(d.realStudents, 3) // s2, s4, s5 (no email)
  assert.equal(d.realStudents! + d.selfAddedStudents!, d.totalStudents)
})

test('active tutors need a lesson with a REAL student; activated tutors need a completed lesson', async () => {
  const d = await overview.loadOverview(sample(), NOW)
  // Ann: lesson with Kid One. Cy: lesson with Kid Two. Ben's only lesson is with himself, so he is not active.
  assert.equal(d.activeTutors, 2)
  // Ann, Ben and Cy each completed a lesson (Ben's is with himself: still a completed lesson).
  assert.equal(d.activatedTutors, 3)
  assert.equal(d.tutors, 5)
  assert.equal(d.totalLessons, 5)
})

test('new this month counts tutors from the last 30 days', async () => {
  const d = await overview.loadOverview(sample(), NOW)
  assert.equal(d.newTutors, 3) // Ann, Ben, Cy; Di and Eve joined in August
})

test('the real page prints those numbers on its cards', async () => {
  db = sample()
  const html = await render()
  const printed = Object.fromEntries(['tutors', 'active-tutors', 'activated-tutors', 'total-students', 'real-students', 'self-students', 'lessons'].map(id => [id, stat(html, id)]))
  assert.deepEqual(printed, { tutors: '5', 'active-tutors': '2', 'activated-tutors': '3', 'total-students': '6', 'real-students': '3', 'self-students': '3', lessons: '5' })
  assert.ok(!html.includes('overview-error'), 'no error box when every read worked')
})

test('nothing is written: the overview only reads', async () => {
  const d = sample()
  await overview.loadOverview(d, NOW)
  assert.deepEqual(d.log, [])
})

test('a database with more than 1000 students and tutors is read in full (paged)', async () => {
  const tutors = Array.from({ length: 1200 }, (_, i) => ({ id: `t${i}`, name: `T${i}`, email: `t${i}@example.com`, created_at: day('2026-10-20') }))
  const students = tutors.map((t, i) => ({ id: `s${i}`, tutor_id: t.id, email: i < 1100 ? t.email : `real${i}@example.com` }))
  const d = await overview.loadOverview(createFakeDb({ tutors, students, lessons: [] }), NOW)
  assert.equal(d.tutors, 1200)
  assert.equal(d.selfAddedStudents, 1100)
  assert.equal(d.realStudents, 100)
})

// ---- sign-ups per week --------------------------------------------------------------

test('weeklySignups: 12 weeks, oldest first, weeks start on Monday (UTC), empty weeks are 0', () => {
  const w = overview.weeklySignups(sample().tables.tutors.map(t => String(t.created_at)), NOW)
  assert.equal(w.length, 12)
  assert.equal(w[0].weekStart, '2026-08-03')
  assert.equal(w[11].weekStart, '2026-10-19')
  const byWeek = Object.fromEntries(w.map(x => [x.weekStart, x.count]))
  assert.equal(byWeek['2026-10-19'], 2) // Ann (Tue) and Ben (Monday 00:00 sharp)
  assert.equal(byWeek['2026-10-12'], 1) // Cy joined Sunday 23:59:59, the end of the previous week
  assert.equal(byWeek['2026-08-03'], 1) // Di, the first second of the oldest week
  assert.equal(w.reduce((n, x) => n + x.count, 0), 4) // Eve, one second before it, is outside the 12 weeks
  assert.equal(w.filter(x => x.count === 0).length, 9)
})

test('weeklySignups ignores a date it cannot read and a tutor from the future', () => {
  const w = overview.weeklySignups(['not a date', '2026-12-31T00:00:00.000Z', day('2026-10-21')], NOW)
  assert.equal(w.reduce((n, x) => n + x.count, 0), 1)
})

test('the real page draws the 12 weeks, newest first', async () => {
  const tutors = Array.from({ length: 3 }, (_, i) => ({ id: `t${i}`, name: `T${i}`, email: `t${i}@example.com`, created_at: new Date(Date.now() - i * 60_000).toISOString() }))
  db = createFakeDb({ tutors, students: [], lessons: [] })
  const html = await render()
  const rows = [...html.matchAll(/data-week="([\d-]+)"[^>]*>.*?data-count[^>]*>(\d+)</g)]
  assert.equal(rows.length, 12)
  const weeks = rows.map(r => r[1])
  assert.deepEqual(weeks, [...weeks].sort().reverse())
  assert.equal(rows.reduce((n, r) => n + Number(r[2]), 0), 3)
  assert.match(html, /This week/)
})

// ---- the error box names the table ---------------------------------------------------

test('a failing students table is named; the numbers that need it show a dash, the rest keep their value', async () => {
  const d = await overview.loadOverview(failing(sample(), 'students'), NOW)
  assert.deepEqual(d.failedTables, ['students'])
  assert.equal(d.totalStudents, null)
  assert.equal(d.realStudents, null)
  assert.equal(d.selfAddedStudents, null)
  assert.equal(d.activeTutors, null)
  assert.equal(d.tutors, 5)
  assert.equal(d.totalLessons, 5)
  assert.equal(d.activatedTutors, 3)

  db = failing(sample(), 'students')
  const html = await render()
  const box = html.match(/data-testid="overview-error"[^>]*>([^<]*)</)?.[1] ?? ''
  assert.match(box, /the students table/)
  assert.doesNotMatch(box, /lessons table|tutors table|visitors/)
  assert.equal(stat(html, 'real-students'), '—')
  assert.equal(stat(html, 'tutors'), '5')
})

test('a failing lessons table, and a failing tutors table, each name only themselves', async () => {
  db = failing(sample(), 'lessons')
  const lessonsBox = (await render()).match(/data-testid="overview-error"[^>]*>([^<]*)</)?.[1] ?? ''
  assert.match(lessonsBox, /the lessons table/)
  assert.doesNotMatch(lessonsBox, /students table|tutors table/)

  db = failing(sample(), 'tutors')
  const html = await render()
  const tutorsBox = html.match(/data-testid="overview-error"[^>]*>([^<]*)</)?.[1] ?? ''
  assert.match(tutorsBox, /the tutors table/)
  assert.doesNotMatch(tutorsBox, /students table|lessons table/)
  assert.equal(stat(html, 'tutors'), '—')
  assert.match(html, /Could not read the tutors table/) // the chart says so too, not an empty chart
})

test('two failing tables are both named', async () => {
  db = failing(sample(), 'students', 'lessons')
  const box = (await render()).match(/data-testid="overview-error"[^>]*>([^<]*)</)?.[1] ?? ''
  assert.match(box, /the students table and the lessons table/)
})

test('readErrorMessage: names every table, points at migration 015 only when only the visitor tables failed', () => {
  assert.match(readErrorMessage(['visitors', 'visitor_events']), /visitors table.*visitor_events table/)
  assert.match(readErrorMessage(['visitors', 'visitor_events']), /migration 015/)
  assert.match(readErrorMessage(['visitors']), /migration 015/)
  assert.doesNotMatch(readErrorMessage(['tutors']), /migration 015/)
  assert.doesNotMatch(readErrorMessage(['tutors', 'visitors']), /migration 015/)
  assert.match(readErrorMessage(['tutors', 'tutors']), /^Could not read the tutors table, so the numbers that depend on it/)
  assert.match(readErrorMessage([]), /Could not read some of the data/)
})

test('/super-admin: the data layer reports WHICH tables failed (visitors vs tutors)', async () => {
  const noVisitors = await loadSuperAdmin(failing(createFakeDb({ tutors: [] }), 'visitors', 'visitor_events'), { from: null, to: null })
  assert.equal(noVisitors.failed, true)
  assert.deepEqual([...noVisitors.failedTables].sort(), ['visitors'].sort())
  const people = await loadPeople(failing(createFakeDb({ tutors: [{ id: 'A', name: 'Ann', email: 'a@example.com', created_at: day('2026-10-20'), subscription_status: 'free' }] }), 'visitors'), { plan: 'all', stage: 'all', range: { from: null, to: null }, page: 1 })
  assert.deepEqual(people.failedTables, ['visitors'])
  const noTutors = await loadPeople(failing(createFakeDb({}), 'tutors'), { plan: 'all', stage: 'all', range: { from: null, to: null }, page: 1 })
  assert.deepEqual(noTutors.failedTables, ['tutors'])
  assert.equal(await loadPeople(createFakeDb({}), { plan: 'all', stage: 'all', range: { from: null, to: null }, page: 1 }).then(p => p.failedTables.length), 0)
})

test('/super-admin page prints that message instead of its old general sentence', () => {
  const page = read('app/(admin)/super-admin/page.tsx')
  assert.match(page, /readErrorText\(t, failedTables\)/)
  assert.doesNotMatch(page, /the tutors table or the visitor tables/)
})
