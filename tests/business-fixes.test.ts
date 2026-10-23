// T-0841: four holes the agent named while building the business lists, closed and tested on the REAL routes and pages over an in-memory
// Supabase with several tutors: (1) the public waitlist form is rate limited, (2) the "Copy link" of a subscription plan is the tutor's own
// booking page with that plan marked, (3) the Team routes answer 404 (not 500) when nothing of the owner matches, (4) Import can say which
// rows it left out and why, as a file.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextRequest } from 'next/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import { clientIp } from '@/lib/client-ip'
import { planCheckoutLink, planToHighlight } from '@/lib/business-lists'
import { MAX_PROBLEMS, parseCSV, parsePreplyWithProblems, problemsCsv } from '@/lib/csv-import'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

const A = '92000000-0000-4000-8000-00000000000a'
const B = '92000000-0000-4000-8000-00000000000b'
const FREE = '92000000-0000-4000-8000-0000000000f1'
const OWNER1 = '92000000-0000-4000-8000-0000000000a1'
const OWNER2 = '92000000-0000-4000-8000-0000000000a2'
const id = (kind: string, n: number) => `93000000-0000-4000-8000-${kind}${String(n).padStart(11, '0')}`

let db: FakeDb | { from: (t: string) => unknown }
let session: { id: string } | null
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => db,
    createClient: async () => ({ from: (t: string) => (db as FakeDb).from(t), auth: { getUser: async () => ({ data: { user: session ? { ...session, email: 'tutor@example.com' } : null } }) } }),
  },
})
mock.module('next/navigation', {
  namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, redirect: (to: string) => { throw new Error(`NEXT_REDIRECT ${to}`) }, useRouter: () => ({ push() {}, replace() {}, refresh() {} }), useSearchParams: () => new URLSearchParams(), usePathname: () => '/book/x' },
})
const waitlistRoute = await import('@/app/api/waitlist/route.ts')
const plansRoute = await import('@/app/api/subscriptions/plans/route.ts')
const importRoute = await import('@/app/api/import/route.ts')
const teamIdRoute = await import('@/app/api/team/[id]/route.ts')
const teamAssign = await import('@/app/api/team/assign/route.ts')
const bookPage = (await import('@/app/book/[slug]/page.tsx')).default as (p: { params: Promise<{ slug: string }>; searchParams?: Promise<{ plan?: string | string[] }> }) => Promise<React.ReactElement>

const now = () => new Date().toISOString()
function fresh(extra: Record<string, unknown[]> = {}) {
  db = createFakeDb({
    tutors: [
      { id: A, subscription_status: 'pro', currency: 'USD', slug: 'tutor-a', name: 'Tutor A', booking_url_active: true, timezone: 'UTC', languages: ['English'], cancellation_hours: 24, buffer_minutes: 0, created_at: '2026-08-01T00:00:00Z' },
      { id: B, subscription_status: 'pro', currency: 'USD', slug: 'tutor-b', name: 'Tutor B', booking_url_active: true, timezone: 'UTC', languages: ['English'], cancellation_hours: 24, buffer_minutes: 0, created_at: '2026-08-01T00:00:00Z' },
      { id: FREE, subscription_status: 'free', currency: 'USD', slug: 'tutor-free' },
      { id: OWNER1, subscription_status: 'academy', currency: 'USD' }, { id: OWNER2, subscription_status: 'academy', currency: 'USD' },
    ],
    waitlist: [],
    subscription_plans: [
      { id: id('a', 1), tutor_id: A, name: 'Plan A', description: null, price: 100, currency: 'usd', lessons_per_period: 4, period: 'month', duration_minutes: 60, is_active: true, created_at: now() },
      { id: id('a', 2), tutor_id: A, name: 'Plan A off', description: null, price: 90, currency: 'usd', lessons_per_period: 4, period: 'month', duration_minutes: 60, is_active: false, created_at: now() },
      { id: id('b', 1), tutor_id: B, name: 'Plan B', description: null, price: 50, currency: 'usd', lessons_per_period: 2, period: 'month', duration_minutes: 30, is_active: true, created_at: now() },
    ],
    team_members: [{ id: id('1', 1), owner_id: OWNER1, name: 'Member One', pay_type: 'per_lesson', pay_rate: 10, active: true }, { id: id('2', 1), owner_id: OWNER2, name: 'Member Two', pay_type: 'per_lesson', pay_rate: 20, active: true }],
    lessons: [{ id: id('1', 5), tutor_id: OWNER1, assigned_to: null }, { id: id('2', 5), tutor_id: OWNER2, assigned_to: null }],
    students: [{ id: 's-a', tutor_id: A, name: 'Bo Chen', email: 'bo@example.com' }],
    availability: [A, B].map((tutor_id, i) => ({ id: `av${i}`, tutor_id, team_member_id: null, day_of_week: 1, start_time: '09:00', end_time: '17:00' })), reviews: [], packages: [],
    ...extra,
  } as never)
}
beforeEach(() => {
  fresh()
  session = { id: A }
})
const rq = (url: string, init?: RequestInit) => new NextRequest(`http://x${url}`, init as never) as never
const status = <T extends { status: number }>(p: Promise<T>) => p.then(r => r.status)

// ---- 1. the public waitlist is rate limited ---------------------------------------------------------------------------------------------

// The limits live in the route's own memory (checked by tests/rate-limits.test.ts), so each test here uses its own tutors and addresses.
const W = (n: number) => `94000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`
const join = (tutor: string, n: number, ip?: string) => waitlistRoute.POST(rq('/api/waitlist', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(ip ? { 'x-real-ip': ip } : {}) },
  body: JSON.stringify({ tutor_id: tutor, name: `Student ${n}`, email: `s${n}@example.com`, message: 'hi' }),
}))
// the fake database does not know a two-column conflict key, so the sign-ups are counted from the writes it was asked to make
const rowsOf = (tutor: string) => (db as FakeDb).log.filter(l => l.table === 'waitlist' && l.op === 'upsert' && (l.payload as { tutor_id: string }).tutor_id === tutor).length

test('the address of a request: x-real-ip first, else the first of x-forwarded-for, else nothing', () => {
  const h = (o: Record<string, string>) => new Headers(o)
  assert.equal(clientIp(h({ 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '198.51.100.1' })), '203.0.113.7')
  assert.equal(clientIp(h({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' })), '198.51.100.1')
  assert.equal(clientIp(h({})), '')
  assert.equal(clientIp(h({ 'x-real-ip': 'x'.repeat(500) })).length, 64, 'a long value is cut')
})

test('waitlist: the sixth sign-up from one address in ten minutes is refused with 429 and writes nothing', async () => {
  for (let i = 1; i <= 5; i++) assert.equal((await join(W(1), i, '203.0.113.7')).status, 200, `sign-up ${i}`)
  const res = await join(W(1), 6, '203.0.113.7')
  assert.equal(res.status, 429)
  assert.equal(res.headers.get('Retry-After'), '600')
  assert.match((await res.json()).error, /Too many sign-ups/)
  assert.equal(rowsOf(W(1)), 5, 'the refused one was not written')
  assert.equal((await join(W(2), 7, '203.0.113.7')).status, 429, 'the limit is on the address, for every tutor')
  assert.equal(rowsOf(W(2)), 0)
  assert.equal((await join(W(1), 8, '203.0.113.8')).status, 200, 'another address is not affected')
})

test('waitlist: one tutor takes 30 sign-ups an hour whatever address a caller claims; another tutor is not affected', async () => {
  for (let i = 1; i <= 30; i++) assert.equal((await join(W(3), i, `198.51.100.${i}`)).status, 200, `sign-up ${i}`)
  assert.equal((await join(W(3), 31, '198.51.100.200')).status, 429, 'a new address (even a made-up one) does not get past the tutor\'s cap')
  assert.equal(rowsOf(W(3)), 30)
  assert.equal((await join(W(4), 1, '198.51.100.201')).status, 200, 'the second tutor\'s waitlist still takes sign-ups')
  assert.equal(rowsOf(W(4)), 1)
})

test('waitlist: a request with no address header is still counted per tutor, and a refused address does not use up the tutor\'s cap', async () => {
  for (let i = 1; i <= 30; i++) assert.equal((await join(W(5), i)).status, 200)
  assert.equal((await join(W(5), 31)).status, 429, 'no header: the tutor cap still holds')
  for (let i = 1; i <= 5; i++) await join(W(6), i, '192.0.2.9')
  for (let i = 6; i <= 20; i++) assert.equal((await join(W(6), i, '192.0.2.9')).status, 429)
  for (let i = 100; i < 125; i++) assert.equal((await join(W(6), i, `192.0.2.${i}`)).status, 200, 'the 15 refused tries did not count against the tutor')
})

test('waitlist: a bad body is a 400 and does not use up a limit', async () => {
  for (let i = 0; i < 20; i++) {
    const bad = await waitlistRoute.POST(rq('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-real-ip': '192.0.2.250' }, body: JSON.stringify({ tutor_id: W(7), name: '', email: 'nope' }) }))
    assert.equal(bad.status, 400)
  }
  assert.equal((await join(W(7), 1, '192.0.2.250')).status, 200, 'twenty bad bodies did not use up the five')
  assert.equal(rowsOf(W(7)), 1)
})

test('the booking page shows the sign-up refusal in words', () => {
  assert.match(read('src/app/book/[slug]/BookingForm.tsx'), /res\.status === 429\) toast\.error\('Too many sign-ups right now/)
})

// ---- 2. the plan link ------------------------------------------------------------------------------------------------------------------

test('a plan link is the tutor\'s own booking page address with the plan id and #subscribe; the highlight takes only a plan of that tutor', () => {
  assert.equal(planCheckoutLink('https://www.tutafy.com', 'maya-reyes', id('a', 1)), `https://www.tutafy.com/book/maya-reyes?plan=${id('a', 1)}#subscribe`)
  assert.equal(planCheckoutLink('https://www.tutafy.com/', 'a b', 'x&y'), 'https://www.tutafy.com/book/a%20b?plan=x%26y#subscribe', 'a trailing slash is dropped and each part is escaped')
  const plans = [{ id: id('a', 1) }]
  assert.equal(planToHighlight(id('a', 1), plans), id('a', 1))
  assert.equal(planToHighlight([id('a', 1), 'other'], plans), id('a', 1))
  for (const bad of [undefined, '', 'nope', id('b', 1), '<script>']) assert.equal(planToHighlight(bad, plans), null, String(bad))
})

test('GET /api/subscriptions/plans answers the session tutor\'s own slug, never another tutor\'s; a Free tutor is refused', async () => {
  assert.equal((await (await plansRoute.GET()).json()).slug, 'tutor-a')
  session = { id: B }
  const b = await (await plansRoute.GET()).json()
  assert.equal(b.slug, 'tutor-b')
  assert.deepEqual(b.plans.map((p: { name: string }) => p.name), ['Plan B'], 'only their plans')
  session = { id: FREE }
  assert.equal((await plansRoute.GET()).status, 403)
  session = null
  assert.equal((await plansRoute.GET()).status, 401)
})

const bookingHtml = async (slug: string, plan?: string | string[]) => renderToStaticMarkup(await bookPage({ params: Promise.resolve({ slug }), searchParams: Promise.resolve(plan === undefined ? {} : { plan }) }))

test('the booking page marks the plan named in the address, and only a plan of THIS tutor', async () => {
  const on = await bookingHtml('tutor-a', id('a', 1))
  assert.match(on, /id="subscribe"/)
  assert.equal((on.match(/data-highlighted="true"/g) ?? []).length, 1, 'exactly one plan is marked')
  assert.match(on, /data-highlighted="true"[^>]*>[\s\S]{0,400}Plan A/, 'and it is Plan A')
  assert.doesNotMatch(await bookingHtml('tutor-a'), /data-highlighted/, 'no plan in the address, none marked')
  assert.doesNotMatch(await bookingHtml('tutor-a', id('b', 1)), /data-highlighted/, 'another tutor\'s plan id marks nothing')
  assert.doesNotMatch(await bookingHtml('tutor-a', id('a', 2)), /data-highlighted/, 'a plan that is switched off is not on the page, so not marked')
  assert.doesNotMatch(await bookingHtml('tutor-a', 'x"><script>alert(1)</script>'), /data-highlighted|<script>alert/)
  assert.match(await bookingHtml('tutor-b', id('b', 1)), /data-highlighted="true"/)
})

test('the Copy link button uses the tutor\'s own address from the plans route, only for a plan that is on', () => {
  const src = read('src/app/(dashboard)/subscriptions/SubscriptionsClient.tsx')
  assert.match(src, /planCheckoutLink\(window\.location\.origin, slug, plan\.id\)/)
  assert.doesNotMatch(src, /api\/referral/, 'the link no longer borrows the referral code')
  assert.match(src, /\{slug && p\.is_active && <button/)
})

// ---- 3. the Team routes answer 404 -----------------------------------------------------------------------------------------------

const patch = (member: string, body: unknown) => teamIdRoute.PATCH(rq('/api/team/x', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), { params: Promise.resolve({ id: member }) })
const del = (member: string) => teamIdRoute.DELETE(rq('/api/team/x', { method: 'DELETE' }), { params: Promise.resolve({ id: member }) })
const assign = (lesson: string, member: string | null) => teamAssign.POST(rq('/api/team/assign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId: lesson, memberId: member }) }))

test('Team: a member or lesson that is not the owner\'s (or does not exist) is a 404, not a 500, and nothing changes', async () => {
  session = { id: OWNER1 }
  assert.equal(await status(patch(id('9', 9), { name: 'Nobody' })), 404, 'no such member')
  assert.equal(await status(patch(id('2', 1), { name: 'Hijack', pay_rate: 999 })), 404, 'the other owner\'s member')
  assert.equal(await status(del(id('9', 9))), 404, 'deleting nothing')
  assert.equal(await status(del(id('2', 1))), 404, 'deleting the other owner\'s member')
  assert.equal(await status(assign(id('9', 9), null)), 404, 'no such lesson')
  assert.equal(await status(assign(id('2', 5), null)), 404, 'the other owner\'s lesson')
  assert.equal(await status(assign(id('2', 5), id('1', 1))), 404, 'the other owner\'s lesson, even with an own member')
  const t = (db as FakeDb).tables
  assert.deepEqual(t.team_members.map(m => [m.name, m.pay_rate]), [['Member One', 10], ['Member Two', 20]], 'both members untouched')
  assert.deepEqual(t.lessons.map(l => (l as { assigned_to: unknown }).assigned_to), [null, null])
})

test('Team: the owner\'s own member and lesson still work (200), and a deleted member is gone', async () => {
  session = { id: OWNER1 }
  assert.equal(await status(patch(id('1', 1), { pay_rate: 12 })), 200)
  assert.equal((db as FakeDb).tables.team_members.find(m => m.id === id('1', 1))!.pay_rate, 12)
  assert.equal(await status(assign(id('1', 5), id('1', 1))), 200)
  assert.equal(await status(del(id('1', 1))), 200)
  assert.equal(await status(del(id('1', 1))), 404, 'a second delete finds nothing')
  assert.equal((db as FakeDb).tables.team_members.length, 1, 'the other owner\'s member is still there')
  session = null
  assert.equal(await status(del(id('1', 1))), 401)
})

test('the Team routes never send the database\'s own words to the browser', () => {
  for (const f of ['src/app/api/team/route.ts', 'src/app/api/team/[id]/route.ts', 'src/app/api/team/assign/route.ts', 'src/app/api/team/payout/route.ts']) {
    assert.doesNotMatch(read(f), /error: (?:error|e)\.message/, f)
  }
})

// ---- 4. Import: the problems file ------------------------------------------------------------------------------------------------

const FILE = [
  'Student,Email,Date,Duration,Amount',
  'Ann Lee,ann@example.com,2026-03-01,60,$20',
  'Bo Chen,bo@example.com,not a date,60,$20',
  ',,,,',
  'Cy Dee,,2026-03-02,45,$15',
  'Dee Fox,dee@example.com,,30,$10',
  'Solo',
  '=HYPERLINK("http://x"),evil@example.com,2026-03-03,60,$5',
].join('\n')

test('reading a file also says which rows were left out and why, counting rows under the header from 1', () => {
  const { headers, rows } = parseCSV(FILE)
  const { students, problems } = parsePreplyWithProblems(headers, rows)
  assert.deepEqual(problems.map(p => [p.row, p.problem.replace(/^The date .* is not one we can read$/, 'bad date'), p.result]), [
    [2, 'bad date', 'Lesson skipped, student added'],
    [3, 'No student name and no email', 'Row skipped'],
    [5, 'No lesson date', 'Lesson skipped, student added'],
    [6, 'The row has fewer than two columns', 'Row skipped'],
  ])
  assert.equal(problems[0].student, 'Bo Chen')
  assert.deepEqual(students.map(s => [s.name, s.firstRow]), [['Ann Lee', 1], ['Bo Chen', 2], ['Cy Dee', 4], ['Dee Fox', 5], ['=HYPERLINK(http://x)', 7]])
  assert.equal(students.find(s => s.name === 'Dee Fox')!.lessons.length, 0)
})

test('the dry run answers the problems (for the page and the file) and still saves nothing; a clean file has none', async () => {
  const dry = await (await importRoute.POST(rq('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csvText: FILE, dryRun: true }) }))).json()
  assert.equal(dry.problemsTotal, 4)
  assert.equal(dry.problems.length, 4)
  assert.equal((db as FakeDb).tables.students.length, 1, 'nothing was saved')
  const clean = await (await importRoute.POST(rq('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csvText: 'Student,Email,Date\nAnn Lee,ann@example.com,2026-03-01', dryRun: true }) }))).json()
  assert.deepEqual([clean.problemsTotal, clean.problems], [0, []])
})

test('a lesson or student the database refuses is listed as a problem in words the tutor can read, without the database\'s own message', async () => {
  const real = db as FakeDb
  db = {
    from: (t: string) => {
      if (t === 'lessons') return { insert: async () => ({ error: { message: 'duplicate key value violates unique constraint "lessons_secret_idx"' } }) }
      if (t === 'students') {
        const q = real.from(t) as Record<string, unknown>
        return { ...q, select: (...a: unknown[]) => (q.select as (...x: unknown[]) => unknown)(...a), insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'relation "students_secret" is read-only' } }) }) }) }
      }
      return real.from(t)
    },
  }
  const res = await importRoute.POST(rq('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csvText: 'Student,Email,Date\nBo Chen,bo@example.com,2026-03-01\nNew Person,new@example.com,2026-03-02' }) }))
  const data = await res.json()
  assert.equal(res.status, 200)
  const all = JSON.stringify(data)
  assert.doesNotMatch(all, /secret|violates|read-only|relation/, 'what the database said stays on the server')
  assert.deepEqual(data.problems.map((p: { student: string; problem: string; result: string }) => [p.student, p.problem, p.result]), [
    ['Bo Chen', 'The lesson on 2026-03-01 could not be saved', 'Lesson not saved'],
    ['New Person', 'The student could not be saved', 'Student and lessons not saved'],
  ])
  assert.equal(data.problemsTotal, 2)
  assert.deepEqual(data.problems.map((p: { row: number }) => p.row), [1, 2])
})

test('the problems file: a header and a line per problem, every cell quoted, and a formula in a name is defused', () => {
  const csv = problemsCsv([
    { row: 2, student: 'Bo "the" Chen', email: 'bo@example.com', problem: 'The date "x" is not one we can read', result: 'Lesson skipped, student added' },
    { row: 7, student: '=HYPERLINK("http://x")', email: '@evil@example.com', problem: 'p', result: 'r' },
  ])
  const lines = csv.split('\r\n')
  assert.equal(lines[0], '"Row","Student","Email","Problem","What happened"')
  assert.equal(lines[1], '"2","Bo ""the"" Chen","bo@example.com","The date ""x"" is not one we can read","Lesson skipped, student added"')
  assert.match(lines[2], /^"7","'=HYPERLINK\(""http:\/\/x""\)","'@evil@example\.com"/, 'a leading = or @ gets an apostrophe')
  assert.equal(lines[3], '', 'the file ends with a line end')
  assert.equal(problemsCsv([]).split('\r\n')[0], '"Row","Student","Email","Problem","What happened"', 'no problems is still a valid file')
})

test('second tutor: the problems come only from their own file, never from another tutor\'s students', async () => {
  session = { id: B }
  const data = await (await importRoute.POST(rq('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csvText: 'Student,Email,Date\nZed,zed@example.com,oops', dryRun: true }) }))).json()
  assert.deepEqual(data.problems.map((p: { student: string }) => p.student), ['Zed'])
  assert.doesNotMatch(JSON.stringify(data), /Bo Chen|bo@example/, 'tutor A\'s student is nowhere in it')
  assert.ok(MAX_PROBLEMS >= 100)
})

test('the page offers the file in both steps, built in the browser from what the route sent', () => {
  const src = read('src/app/(dashboard)/import/ImportTool.tsx')
  assert.match(src, /problemsCsv\(problems\)/)
  assert.match(src, /download = 'import-problems\.csv'/)
  assert.equal((src.match(/<ProblemsCard /g) ?? []).length, 2, 'once before saving, once after')
  assert.match(src, /Download the problems as a CSV file/)
})
