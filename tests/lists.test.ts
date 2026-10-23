// T-0822 (G3): the Students and Lessons lists. The pure rules, then the REAL pages, export routes and bulk routes over an
// in-memory Supabase with 120 made-up students: search, level and status filters, sort, 25 rows a page, CSV, bulk status,
// keyboard access, and a second tutor who must reach none of the first tutor's rows by any new route.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import { cleanSearch, hrefWith, isUuid, pageCount, parsePage, pick, rangeOfPage } from '@/lib/list-params'
import { csvCell } from '@/lib/csv'
import { parseStudentFilters, studentsCsv, STUDENT_DEFAULTS } from '@/lib/student-list'
import { parseLessonFilters } from '@/lib/lesson-list'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

// ---- pure rules ----------------------------------------------------------------------------------------------------

test('the address is read through fixed lists: a value that is not one of them is the default', () => {
  assert.equal(pick('A2', ['all', 'A1', 'A2'] as const, 'all'), 'A2')
  for (const bad of [null, undefined, '', 'a2', 'A2; drop table', '../x']) assert.equal(pick(bad as string, ['all', 'A1', 'A2'] as const, 'all'), 'all')
  assert.equal(parsePage('3'), 3)
  for (const bad of ['0', '-1', '1.5', 'abc', '', null, undefined, '1e9']) assert.equal(parsePage(bad as string), 1, String(bad))
  assert.equal(isUuid('00000000-0000-4000-8000-000000000001'), true)
  for (const bad of ['', 'x', '1; drop', null, 5, '00000000-0000-4000-8000-00000000000g']) assert.equal(isUuid(bad), false)
  const f = parseStudentFilters(new URLSearchParams('level=Z9&status=gone&sort=random&page=-4&q=%3Cb%3E'))
  assert.deepEqual([f.level, f.status, f.sort, f.page], ['all', 'all', 'newest', 1])
  const l = parseLessonFilters({ student: 'not-a-uuid', status: 'x', pay: ['paid', 'pending'], when: 'later' })
  assert.deepEqual([l.student, l.status, l.pay, l.when], ['', 'all', 'paid', 'all'])
})

test('search words are made safe for a filter string: no comma, bracket, quote, wildcard or backslash gets through', () => {
  assert.equal(cleanSearch('  ann  '), 'ann')
  assert.equal(cleanSearch('a,b(c)d"e\'f\\g%h_i*j.k:l'), 'a b c d e f g h i j k l')
  assert.equal(cleanSearch('x),email.ilike.%'), 'x email ilike')
  assert.equal(cleanSearch('y'.repeat(100)).length, 60)
  assert.equal(cleanSearch(null), '')
})

test('paging: 25 rows a page, the range of a page, the number of pages, and addresses that keep the filters', () => {
  assert.deepEqual(rangeOfPage(1), [0, 24])
  assert.deepEqual(rangeOfPage(5), [100, 124])
  assert.equal(pageCount(120), 5)
  assert.equal(pageCount(0), 1)
  assert.equal(pageCount(25), 1)
  assert.equal(pageCount(26), 2)
  const cur = { q: 'ann', level: 'B1', status: 'all', sort: 'newest', page: '1' }
  assert.equal(hrefWith('/students', cur, { page: 2 }, STUDENT_DEFAULTS), '/students?q=ann&level=B1&page=2')
  assert.equal(hrefWith('/students', cur, { q: null, level: 'all' }, STUDENT_DEFAULTS), '/students')
})

test('CSV: a name typed by someone else cannot become a spreadsheet formula', () => {
  for (const evil of ['=HYPERLINK("http://x")', '+1', '-1', '@SUM(1)']) assert.ok(csvCell(evil).startsWith(`"'`), evil)
  const csv = studentsCsv([{ id: 'a', name: '=cmd|calc', email: 'a@example.com', level: 'B1', country: 'Peru', goals: 'say "hi"', status: 'active', created_at: '2026-10-01T10:00:00Z' }])
  assert.match(csv.trim().split('\r\n')[1], /^"'=cmd\|calc","a@example\.com","B1","Peru","say ""hi""","active","2026-10-01"$/)
})

// ---- the real pages and routes over an in-memory Supabase ----------------------------------------------------------

const A = '40000000-0000-4000-8000-00000000000a'
const B = '40000000-0000-4000-8000-00000000000b'
const sid = (n: number, who = 'a') => `50000000-0000-4000-8000-${who}${String(n).padStart(11, '0')}`
const lid = (n: number, who = 'a') => `60000000-0000-4000-8000-${who}${String(n).padStart(11, '0')}`
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
let db: FakeDb
let session: { id: string } | null

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: { createAdminClient: () => db, createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: session } }) } }) },
})
const refreshed: string[] = []
mock.module('next/navigation', {
  namedExports: {
    notFound: () => { throw new Error('NEXT_NOT_FOUND') }, redirect: (to: string) => { throw new Error(`NEXT_REDIRECT ${to}`) },
    useRouter: () => ({ push: (to: string) => refreshed.push(`push ${to}`), replace() {}, refresh: () => refreshed.push('refresh') }), usePathname: () => '/students',
  },
})
type Sp = Record<string, string>
const studentsPage = (await import('@/app/(dashboard)/students/page.tsx')).default as (p: { searchParams: Promise<Sp> }) => Promise<React.ReactElement>
const lessonsPage = (await import('@/app/(dashboard)/lessons/page.tsx')).default as (p: { searchParams: Promise<Sp> }) => Promise<React.ReactElement>
const studentExport = await import('@/app/api/students/export/route.ts')
const lessonExport = await import('@/app/api/lessons/export/route.ts')
const studentBulk = await import('@/app/api/students/bulk/route.ts')
const lessonBulk = await import('@/app/api/lessons/bulk/route.ts')
const { StudentsTable } = await import('@/app/(dashboard)/students/StudentsTable.tsx')
const { LessonsClient } = await import('@/app/(dashboard)/lessons/LessonsClient.tsx')

function seed() {
  const students: Record<string, unknown>[] = []
  for (let i = 1; i <= 120; i++) {
    students.push({
      id: sid(i), tutor_id: A, name: `Student ${String(i).padStart(3, '0')}${i === 7 ? ' Annabel' : ''}`, email: `student${i}@example.com`, level: LEVELS[i % 6],
      country: 'Peru', goals: 'Speak', status: i % 10 === 0 ? 'paused' : 'active', created_at: new Date(Date.UTC(2026, 0, 1) + i * 86_400_000).toISOString(),
    })
  }
  for (let i = 1; i <= 30; i++) students.push({ id: sid(i, 'b'), tutor_id: B, name: `Secret ${i}`, email: `secret${i}@example.com`, level: 'C2', country: 'Chile', goals: 'x', status: 'active', created_at: '2026-02-01T00:00:00Z' })
  const lessons: Record<string, unknown>[] = []
  for (let i = 1; i <= 60; i++) {
    lessons.push({
      id: lid(i), tutor_id: A, student_id: sid((i % 120) + 1), starts_at: new Date(Date.now() + (i - 30) * 86_400_000).toISOString(), duration_minutes: 60, price: 40,
      status: i > 30 ? 'scheduled' : 'completed', payment_status: i % 3 === 0 ? 'pending' : 'paid', zoom_link: null, meet_link: null,
      students: { name: `Student ${String((i % 120) + 1).padStart(3, '0')}`, level: 'B1' },
    })
  }
  lessons.push({ id: lid(1, 'b'), tutor_id: B, student_id: sid(1, 'b'), starts_at: new Date().toISOString(), duration_minutes: 30, price: 99, status: 'scheduled', payment_status: 'pending', zoom_link: null, meet_link: null, students: { name: 'Secret 1', level: 'C2' } })
  db = createFakeDb({ tutors: [{ id: A, currency: 'EUR' }, { id: B, currency: 'USD' }], students, lessons })
  session = { id: A }
}
beforeEach(() => { seed(); refreshed.length = 0 })

const html = async (page: typeof studentsPage, sp: Sp = {}) => renderToStaticMarkup(await page({ searchParams: Promise.resolve(sp) }))
const rowsIn = (h: string) => (h.match(/<tr tabindex="0"/g) ?? []).length

test('120 students: 25 rows a page, a pager that says where you are, and the last page holds the rest', async () => {
  const p1 = await html(studentsPage)
  assert.equal(rowsIn(p1), 25)
  assert.match(p1, /Showing 1 to 25 of 120 students/)
  assert.match(p1, /Page 1 of 5/)
  assert.match(p1, /120 total, 108 active/)
  assert.match(p1, /href="\/students\?page=2"/)
  const p5 = await html(studentsPage, { page: '5' })
  assert.equal(rowsIn(p5), 20)
  assert.match(p5, /Showing 101 to 120 of 120 students/)
  const p9 = await html(studentsPage, { page: '9' })
  assert.match(p9, /data-testid="students-nomatch"/)
  assert.match(p9, /That page is empty/)
  assert.equal(rowsIn(await html(studentsPage, { page: 'abc' })), 25, 'a page that is not a number is page 1')
})

test('pages do not overlap and together they list every student once', async () => {
  const seen = new Set<string>()
  for (let p = 1; p <= 5; p++) for (const m of (await html(studentsPage, { page: String(p) })).matchAll(/aria-label="Open (Student \d+[^"]*)"/g)) seen.add(m[1])
  assert.equal(seen.size, 120)
})

test('search finds a name or an email; level, status and sort work, and the pager keeps them', async () => {
  const byName = await html(studentsPage, { q: 'annabel' })
  assert.equal(rowsIn(byName), 1)
  assert.match(byName, /Student 007 Annabel/)
  assert.equal(rowsIn(await html(studentsPage, { q: 'student42@' })), 1, 'an email')
  const level = await html(studentsPage, { level: 'B1' })
  assert.match(level, /Showing 1 to 20 of 20 students/)
  assert.match(await html(studentsPage, { status: 'paused' }), /Showing 1 to 12 of 12 students/)
  const sorted = await html(studentsPage, { sort: 'name_za' })
  assert.ok(sorted.indexOf('Student 120') < sorted.indexOf('Student 119'))
  const old = await html(studentsPage, { sort: 'oldest' })
  assert.ok(old.indexOf('Student 001') < old.indexOf('Student 002'))
  const filtered = await html(studentsPage, { status: 'active', sort: 'name_az' })
  assert.match(filtered, /href="\/students\?status=active&amp;sort=name_az&amp;page=2"/)
  assert.match(filtered, /Clear filters/)
  const none = await html(studentsPage, { q: 'zzzzqq' })
  assert.match(none, /data-testid="students-nomatch"/)
  assert.match(none, /No students match/)
})

test('a search that tries to add its own filter terms is only words (nothing else matches, nothing breaks)', async () => {
  const h = await html(studentsPage, { q: 'x),tutor_id.neq.zzz,name.ilike.%' })
  assert.match(h, /No students match|Showing/)
  assert.ok(!h.includes('Secret'))
  assert.ok(!(await html(studentsPage, { q: 'secret' })).includes('Secret'), 'another tutor\'s student is not found by search')
})

test('a second tutor sees only their own students, in the list, the count and the export', async () => {
  session = { id: B }
  const h = await html(studentsPage)
  assert.equal(rowsIn(h), 25 > 30 ? 25 : 25)
  assert.match(h, /Showing 1 to 25 of 30 students/)
  assert.ok(!h.includes('Student 001'))
  const csv = await (await studentExport.GET(new Request('http://x/api/students/export'))).text()
  assert.equal(csv.trim().split('\r\n').length, 31)
  assert.ok(!csv.includes('student1@example.com') && csv.includes('secret1@example.com'))
})

test('empty and error states: a tutor with no students is told what to do; a failed read is an error, never an empty list', async () => {
  session = { id: '40000000-0000-4000-8000-0000000000ff' }
  const empty = await html(studentsPage)
  assert.match(empty, /data-testid="students-empty"/)
  assert.match(empty, /href="\/students\/new"/)
  session = { id: A }
  const real = db.from.bind(db)
  db.from = (t: string) => {
    const q = real(t) as Record<string, unknown>
    if (t === 'students') { q.range = () => ({ then: (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: { message: 'boom' }, count: null }).then(res) }) }
    return q as ReturnType<typeof real>
  }
  const h = await html(studentsPage)
  assert.match(h, /data-testid="students-error"/)
  assert.match(h, /We could not load your students/)
  assert.ok(!h.includes('boom'))
  session = null
  await assert.rejects(html(studentsPage), /NEXT_REDIRECT \/login/)
})

const post = (route: { POST: (r: never) => Promise<Response> }, body: unknown) =>
  route.POST(new Request('http://x/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) }) as never)

test('bulk status: own students change and are counted, someone else\'s do not, and bad input is refused', async () => {
  const ids = [sid(1), sid(2), sid(3)]
  const ok = await post(studentBulk, { ids, status: 'paused' })
  assert.equal(ok.status, 200)
  assert.equal((await ok.json()).updated, 3)
  assert.equal((db.tables.students.find(s => s.id === sid(1)) as { status: string }).status, 'paused')
  // a second tutor sends the first tutor's ids and a mixed list
  session = { id: B }
  const theirs = await post(studentBulk, { ids: [sid(4), sid(5)], status: 'inactive' })
  assert.equal((await theirs.json()).updated, 0, 'nothing of tutor A changed')
  assert.equal((db.tables.students.find(s => s.id === sid(4)) as { status: string }).status, 'active')
  const mixed = await post(studentBulk, { ids: [sid(4), sid(1, 'b')], status: 'inactive' })
  assert.equal((await mixed.json()).updated, 1, 'only their own one')
  session = { id: A }
  for (const bad of [{ ids: [], status: 'active' }, { ids: ['x'], status: 'active' }, { ids: Array.from({ length: 101 }, (_, i) => sid(i + 1)), status: 'active' }, { ids, status: 'deleted' }, { ids: 'all', status: 'active' }, { status: 'active' }]) {
    assert.equal((await post(studentBulk, bad)).status, 400, JSON.stringify(bad).slice(0, 50))
  }
  assert.equal((await post(studentBulk, 'not json')).status, 400)
  session = null
  assert.equal((await post(studentBulk, { ids, status: 'active' })).status, 401)
})

test('export: every matching student (not only one page), the filters of the screen, own rows only, formulas defused', async () => {
  const all = await (await studentExport.GET(new Request('http://x/api/students/export'))).text()
  assert.equal(all.trim().split('\r\n').length, 121, 'a header and all 120')
  const filtered = await (await studentExport.GET(new Request('http://x/api/students/export?level=B1&status=active'))).text()
  assert.equal(filtered.trim().split('\r\n').length, 1 + 20 - 4 + 0 * 1, 'B1, active only')
  assert.ok(!all.includes('Secret'))
  ;(db.tables.students[0] as { name: string }).name = '=1+1'
  assert.match(await (await studentExport.GET(new Request('http://x/api/students/export'))).text(), /"'=1\+1"/)
  session = null
  assert.equal((await studentExport.GET(new Request('http://x/api/students/export'))).status, 401)
})

// ---- lessons -------------------------------------------------------------------------------------------------------

test('lessons: 25 a page, filters for status, payment and when, a student filter, search by student name', async () => {
  const p1 = await html(lessonsPage)
  assert.equal(rowsIn(p1), 25)
  assert.match(p1, /Showing 1 to 25 of 60 lessons/)
  assert.match(await html(lessonsPage, { when: 'upcoming' }), /of 30 lessons/)
  assert.match(await html(lessonsPage, { when: 'past' }), /of 30 lessons/)
  assert.match(await html(lessonsPage, { pay: 'pending' }), /of 20 lessons/)
  assert.match(await html(lessonsPage, { status: 'completed' }), /of 30 lessons/)
  assert.match(await html(lessonsPage, { student: sid(2) }), /Showing 1 to 1 of 1 lessons/)
  assert.match(await html(lessonsPage, { student: 'not-a-uuid' }), /of 60 lessons/, 'a bad student value is ignored')
  assert.match(await html(lessonsPage, { q: 'Student 005' }), /Showing 1 to 1 of 1 lessons/)
  assert.match(await html(lessonsPage, { q: 'nobody-by-this-name' }), /data-testid="lessons-nomatch"/)
  assert.match(p1, /€40\.00/, 'prices are in the tutor\'s currency')
})

test('lessons: a second tutor sees only their own lessons and cannot search into the first tutor\'s', async () => {
  session = { id: B }
  const h = await html(lessonsPage)
  assert.match(h, /Showing 1 to 1 of 1 lessons/)
  assert.ok(!h.includes('Student 0'))
  assert.match(await html(lessonsPage, { q: 'Student' }), /data-testid="lessons-nomatch"/)
  assert.match(await html(lessonsPage, { student: sid(2) }), /data-testid="lessons-nomatch"/)
  const csv = await (await lessonExport.GET(new Request('http://x/api/lessons/export?q=Student'))).text()
  assert.equal(csv.trim().split('\r\n').length, 1, 'only the header')
  const own = await (await lessonExport.GET(new Request('http://x/api/lessons/export'))).text()
  assert.equal(own.trim().split('\r\n').length, 2)
  assert.ok(own.includes('Price (USD)') && own.includes('99.00'))
})

test('lessons export: all pages, the filters of the screen; bulk: own lessons only, counted for real, ids checked', async () => {
  const all = await (await lessonExport.GET(new Request('http://x/api/lessons/export'))).text()
  assert.equal(all.trim().split('\r\n').length, 61)
  assert.equal((await (await lessonExport.GET(new Request('http://x/api/lessons/export?pay=pending'))).text()).trim().split('\r\n').length, 21)
  assert.ok(!all.includes('Secret'))
  const ok = await post(lessonBulk, { lesson_ids: [lid(1), lid(2)], action: 'mark_paid' })
  assert.equal((await ok.json()).updated, 2)
  session = { id: B }
  const cross = await post(lessonBulk, { lesson_ids: [lid(3), lid(1, 'b')], action: 'mark_completed' })
  assert.equal((await cross.json()).updated, 1, 'only their own')
  assert.equal((db.tables.lessons.find(l => l.id === lid(3)) as { status: string }).status, 'completed', 'lesson 3 was already completed: not touched by B')
  assert.equal((db.tables.lessons.find(l => l.id === lid(40)) as { status: string }).status, 'scheduled')
  for (const bad of [{ lesson_ids: [], action: 'mark_paid' }, { lesson_ids: ['x'], action: 'mark_paid' }, { lesson_ids: [lid(1, 'b')], action: 'delete_all' }, { lesson_ids: 'x', action: 'mark_paid' }]) {
    assert.equal((await post(lessonBulk, bad)).status, 400)
  }
  session = null
  assert.equal((await post(lessonBulk, { lesson_ids: [lid(1)], action: 'mark_paid' })).status, 401)
  assert.equal((await lessonExport.GET(new Request('http://x/api/lessons/export'))).status, 401)
})

// ---- keyboard, selection, phone ------------------------------------------------------------------------------------

test('the rows can be reached and opened from the keyboard, and every control has a name', () => {
  const rows = [{ id: sid(1), name: 'Ann Lee', email: 'ann@example.com', level: 'B1', country: 'Peru', goals: 'x', status: 'active', created_at: '2026-01-01T00:00:00Z' }]
  const h = renderToStaticMarkup(createElement(StudentsTable, { rows }))
  assert.match(h, /<tr tabindex="0"[^>]*aria-label="Open Ann Lee"/)
  assert.match(h, /aria-label="Select Ann Lee"/)
  assert.match(h, /aria-label="Select all students on this page"/)
  assert.match(h, /<a href="\/students\/50000000[^"]*">Ann Lee<\/a>/, 'the name is a real link, so Tab reaches it')
  const src = read('src/app/(dashboard)/students/StudentsTable.tsx')
  assert.match(src, /e\.key === 'Enter' && e\.target === e\.currentTarget\) router\.push\(`\/students\/\$\{s\.id\}`\)/)
  const lessons = read('src/app/(dashboard)/lessons/LessonsClient.tsx')
  assert.match(lessons, /e\.key === 'Enter' && e\.target === e\.currentTarget\) router\.push\(`\/lessons\/\$\{l\.id\}`\)/)
  const lh = renderToStaticMarkup(createElement(LessonsClient, { rows: [{ id: lid(1), starts_at: '2026-10-01T10:00:00Z', duration_minutes: 60, status: 'scheduled', payment_status: 'paid', price: 40, zoom_link: null, meet_link: null, students: { name: 'Ann Lee', level: null } }], currency: 'EUR' }))
  assert.match(lh, /<tr tabindex="0"/)
  assert.match(lh, /€40\.00/)
})

test('the forms are plain GET forms with labelled fields (they work without scripts and Tab reaches every one)', async () => {
  const h = await html(studentsPage)
  assert.match(h, /<form role="search" action="\/students" method="get">/)
  for (const name of ['Search students', 'Level', 'Status', 'Sort by']) assert.ok(h.includes(`aria-label="${name}"`), name)
  const l = await html(lessonsPage)
  for (const name of ['Search lessons by student', 'When', 'Lesson status', 'Payment status', 'Sort by']) assert.ok(l.includes(`aria-label="${name}"`), name)
  assert.match(h, /href="\/api\/students\/export"/)
})

test('under 768px the table becomes cards that do not scroll sideways (the stylesheet), and the bulk bar is in the page flow', () => {
  const css = read('src/styles/dashboard-shell.css')
  const phone = css.slice(css.indexOf('/* ---------- list pages (T-0822)'))
  assert.match(phone, /@media \(max-width: 767px\) \{[\s\S]*\.dash-table\.is-cards, \.dash-table\.is-cards tbody, \.dash-table\.is-cards tr, \.dash-table\.is-cards td \{ display: block; width: 100%; \}/)
  assert.match(phone, /\.dash-table\.is-cards thead \{ display: none; \}/)
  assert.doesNotMatch(phone.slice(phone.indexOf('.dash-bulk {'), phone.indexOf('.dash-pager {')), /position:\s*(fixed|absolute|sticky)/)
  assert.doesNotMatch(read('src/app/(dashboard)/lessons/LessonsClient.tsx'), /\bfixed\b/, 'the old bulk bar floated over the page')
})

test('source: no page sets its own width, and every list read is the tutor\'s own', () => {
  for (const f of ['src/app/(dashboard)/students/page.tsx', 'src/app/(dashboard)/lessons/page.tsx']) assert.doesNotMatch(read(f), /max-w-\[/)
  for (const f of ['src/app/(dashboard)/students/page.tsx', 'src/app/api/students/export/route.ts']) assert.match(read(f), /\.eq\('tutor_id', user\.id\)/)
  assert.match(read('src/app/api/students/bulk/route.ts'), /\.in\('id', ids\)\.eq\('tutor_id', user\.id\)/)
  assert.match(read('src/app/api/lessons/bulk/route.ts'), /\.in\('id', ids\)\.eq\('tutor_id', user\.id\)/)
  assert.match(read('src/lib/lesson-list.ts'), /\.eq\('tutor_id', tutorId\)\.or\(/, 'the name search is limited to the tutor\'s own students')
})
