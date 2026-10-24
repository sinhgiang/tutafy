// T-0823 (G4): the Calendar (week by default, drag to move with an overlap warning) and Messages (list, thread and student
// card side by side from 1280px, list then thread on a phone, no 760px cap). The pure rules, then the REAL pages and the REAL
// move route over an in-memory Supabase with two tutors: a second tutor must not move, see or read the first tutor's lessons
// or messages by any of the new routes.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import {
  HOUR_PX, GRID_FROM_HOUR, GRID_TO_HOUR, addDays, blockOf, conflictsFor, dayKey, dropTarget, minutesAtOffset, onDay, overlaps, parseDay, parseView, rangeFor, shift, weekDays, weekStart,
} from '@/lib/calendar'
import { filterConversations, loadConversations } from '@/lib/conversations'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

// ---- pure rules ------------------------------------------------------------------------------------------------------

test('the address picks the view and the day: week is the default, a bad date is today', () => {
  assert.equal(parseView(null), 'week')
  assert.equal(parseView('month'), 'month')
  for (const bad of ['', 'year', 'MONTH', 'week; drop']) assert.equal(parseView(bad), 'week')
  const today = new Date(2026, 9, 23, 15)
  assert.equal(dayKey(parseDay('2026-03-05', today)), '2026-03-05')
  for (const bad of ['', 'x', '2026-13-40', '2026-02-30', '26-1-1', null, undefined]) assert.equal(dayKey(parseDay(bad as string, today)), '2026-10-23', String(bad))
})

test('a week starts on Sunday and has seven days; the month view loads six whole weeks', () => {
  const d = new Date(2026, 9, 23, 12) // a Friday
  assert.equal(dayKey(weekStart(d)), '2026-10-18')
  assert.deepEqual(weekDays(d).map(x => x.getDay()), [0, 1, 2, 3, 4, 5, 6])
  const w = rangeFor('week', d)
  assert.equal(w.to.getTime() - w.from.getTime(), 7 * 86_400_000)
  const m = rangeFor('month', d)
  assert.equal(m.from.getDay(), 0)
  assert.ok(m.from <= new Date(2026, 9, 1) && m.to > new Date(2026, 9, 31))
  assert.equal(dayKey(shift('week', d, 1)), '2026-10-30')
  assert.equal(dayKey(shift('week', d, -1)), '2026-10-16')
  assert.equal(shift('month', d, 1).getMonth(), 10)
  assert.equal(dayKey(addDays(new Date(2026, 11, 31, 12), 1)), '2027-01-01')
})

test('a drop snaps to 15 minutes and stays inside the grid; a lesson block sits at its hour', () => {
  assert.equal(minutesAtOffset(0, 60), 0)
  assert.equal(minutesAtOffset(HOUR_PX, 60), 60)
  assert.equal(minutesAtOffset(HOUR_PX * 1.3, 60), 75, '1h18m snaps to 1h15m')
  assert.equal(minutesAtOffset(-50, 60), 0, 'above the grid is the first slot')
  assert.equal(minutesAtOffset(99999, 60), (GRID_TO_HOUR - GRID_FROM_HOUR) * 60 - 60, 'below the grid keeps a one-hour lesson inside it')
  const t = dropTarget(new Date(2026, 9, 21, 12), 150)
  assert.deepEqual([t.getDate(), t.getHours(), t.getMinutes()], [21, GRID_FROM_HOUR + 2, 30])
  const b = blockOf(new Date(2026, 9, 21, 9, 30), 60)
  assert.equal(b.top, (3.5) * HOUR_PX)
  assert.equal(b.height, HOUR_PX)
  assert.ok(blockOf(new Date(2026, 9, 21, 3, 0), 60).top >= 0, 'a lesson before the grid is clamped to its top')
})

test('overlap: touching lessons do not overlap; a lesson inside another, or half over it, does', () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 21, h, m)
  const others = [{ id: 'a', startsAt: at(10), durationMinutes: 60 }, { id: 'b', startsAt: at(12), durationMinutes: 30 }]
  assert.deepEqual(conflictsFor(others, { id: 'x', start: at(11), durationMinutes: 60 }), [], 'ends exactly when the next starts')
  assert.deepEqual(conflictsFor(others, { id: 'x', start: at(9), durationMinutes: 60 }), [], 'ends exactly when a starts')
  assert.deepEqual(conflictsFor(others, { id: 'x', start: at(10, 30), durationMinutes: 60 }).map(c => c.id), ['a'])
  assert.deepEqual(conflictsFor(others, { id: 'x', start: at(9, 30), durationMinutes: 180 }).map(c => c.id), ['a', 'b'])
  assert.deepEqual(conflictsFor(others, { id: 'a', start: at(10), durationMinutes: 60 }), [], 'a lesson never conflicts with itself')
  assert.equal(overlaps({ start: 0, end: 10 }, { start: 10, end: 20 }), false)
  assert.equal(overlaps({ start: 0, end: 11 }, { start: 10, end: 20 }), true)
  assert.deepEqual(onDay([{ starts_at: new Date(2026, 9, 21, 15).toISOString() }, { starts_at: new Date(2026, 9, 21, 9).toISOString() }, { starts_at: new Date(2026, 9, 22, 9).toISOString() }], new Date(2026, 9, 21, 12)).map(l => new Date(l.starts_at).getHours()), [9, 15])
})

// ---- the real pages and routes over an in-memory Supabase --------------------------------------------------------------

const A = '70000000-0000-4000-8000-00000000000a'
const B = '70000000-0000-4000-8000-00000000000b'
const sid = (n: number, w = 'a') => `71000000-0000-4000-8000-${w}${String(n).padStart(11, '0')}`
const lid = (n: number, w = 'a') => `72000000-0000-4000-8000-${w}${String(n).padStart(11, '0')}`
let db: FakeDb
let session: { id: string } | null
let pathname = '/messages'
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: { createAdminClient: () => db, createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: session } }) } }) },
})
mock.module('next/navigation', {
  namedExports: {
    notFound: () => { throw new Error('NEXT_NOT_FOUND') }, redirect: (to: string) => { throw new Error(`NEXT_REDIRECT ${to}`) },
    useRouter: () => ({ push() {}, replace() {}, refresh() {} }), usePathname: () => pathname,
  },
})
type Sp = Record<string, string>
const calendarPage = (await import('@/app/(dashboard)/calendar/page.tsx')).default as (p: { searchParams: Promise<Sp> }) => Promise<React.ReactElement>
const reschedule = await import('@/app/api/lessons/reschedule/route.ts')
const MessagesLayout = (await import('@/app/(dashboard)/messages/layout.tsx')).default as (p: { children: React.ReactNode }) => Promise<React.ReactElement>
const MessagesIndex = (await import('@/app/(dashboard)/messages/page.tsx')).default as () => React.ReactElement
const threadPage = (await import('@/app/(dashboard)/messages/[studentId]/page.tsx')).default as (p: { params: Promise<{ studentId: string }> }) => Promise<React.ReactElement>

const NOW = Date.now()
const at = (daysFromNow: number, hour: number, minute = 0) => { const d = new Date(NOW + daysFromNow * 86_400_000); d.setHours(hour, minute, 0, 0); return d }
const lesson = (id: string, tutor: string, student: string, start: Date, o: Partial<Record<string, unknown>> = {}) => ({
  id, tutor_id: tutor, student_id: student, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 3_600_000).toISOString(), duration_minutes: 60, price: 40,
  status: 'scheduled', payment_status: 'pending', students: { name: `Student ${student.slice(-3)}` }, ...o,
})

function seed() {
  const students = [
    { id: sid(1), tutor_id: A, name: 'Ann Lee', email: 'ann@example.com', level: 'B1', country: 'Peru', goals: 'Speak', status: 'active', portal_token: 'tok-a1' },
    { id: sid(2), tutor_id: A, name: 'Bo Chen', email: 'bo@example.com', level: 'A2', country: 'China', goals: 'Travel', status: 'active', portal_token: 'tok-a2' },
    { id: sid(3), tutor_id: A, name: 'Old Pal', email: 'old@example.com', level: 'C1', country: 'Italy', goals: 'x', status: 'inactive', portal_token: 'tok-a3' },
    { id: sid(1, 'b'), tutor_id: B, name: 'Secret Sam', email: 'sam@example.com', level: 'C2', country: 'Chile', goals: 'Hidden goal', status: 'active', portal_token: 'tok-b1' },
  ]
  const lessons = [
    lesson(lid(1), A, sid(1), at(0, 10)), lesson(lid(2), A, sid(2), at(0, 14)), lesson(lid(3), A, sid(1), at(1, 9), { status: 'completed' }),
    lesson(lid(4), A, sid(2), at(1, 9, 30), { status: 'cancelled' }), lesson(lid(1, 'b'), B, sid(1, 'b'), at(0, 10)),
  ]
  const messages = [
    { id: 'm1', tutor_id: A, student_id: sid(1), sender_type: 'student', content: 'Hello teacher', created_at: '2026-10-20T10:00:00Z', read_at: null },
    { id: 'm2', tutor_id: A, student_id: sid(1), sender_type: 'tutor', content: 'Hi Ann', created_at: '2026-10-20T11:00:00Z', read_at: null },
    { id: 'm3', tutor_id: A, student_id: sid(2), sender_type: 'student', content: 'Question', created_at: '2026-10-21T10:00:00Z', read_at: null },
    { id: 'm4', tutor_id: B, student_id: sid(1, 'b'), sender_type: 'student', content: 'TOP SECRET', created_at: '2026-10-22T10:00:00Z', read_at: null },
  ]
  db = createFakeDb({ tutors: [{ id: A, currency: 'EUR' }, { id: B, currency: 'USD' }], students, lessons, messages })
  session = { id: A }
}
beforeEach(() => { seed(); pathname = '/messages' })

const html = async (sp: Sp = {}) => renderToStaticMarkup(await calendarPage({ searchParams: Promise.resolve(sp) }))

test('the calendar opens on the week: a time grid with seven days, this week\'s lessons as blocks, the scheduled ones draggable', async () => {
  const h = await html()
  assert.match(h, /data-testid="week-grid"/)
  assert.equal((h.match(/role="columnheader"/g) ?? []).length, 7)
  assert.equal((h.match(/class="cal-col"/g) ?? []).length, 7)
  assert.ok(!h.includes('data-testid="month-grid"'))
  assert.match(h, /aria-label="Student 001, 10:00 AM, 60 minutes, scheduled"/)
  assert.equal((h.match(/draggable="true"/g) ?? []).length >= 2, true, 'scheduled lessons can be dragged')
  assert.ok(!h.includes('draggable="true"') || !/aria-label="Student 001, 9:00 AM[^"]*completed"[^>]*draggable="true"/.test(h), 'a completed lesson is not draggable')
  assert.match(h, /data-testid="day-list"/, 'the phone list is in the page too')
  assert.match(h, /Drag a scheduled lesson to move it/)
  assert.match(h, /aria-label="Previous week"/)
  assert.ok(!h.includes('Secret') && !h.includes('Student b'), 'the other tutor\'s lesson is not there')
})

test('month view, a given day, and a failed read', async () => {
  const m = await html({ view: 'month' })
  assert.match(m, /data-testid="month-grid"/)
  assert.equal((m.match(/class="cal-cell/g) ?? []).length, 42)
  const far = await html({ view: 'week', date: '2031-01-15' })
  assert.match(far, /Jan 12 to Jan 18, 2031/)
  assert.ok(!far.includes('aria-label="Student 001'), 'no lessons that week')
  const real = db.from.bind(db)
  db.from = (t: string) => {
    const q = real(t) as Record<string, unknown>
    if (t === 'lessons') q.order = () => ({ then: (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: { message: 'boom' } }).then(res) })
    return q as ReturnType<typeof real>
  }
  const e = await html()
  assert.match(e, /data-testid="calendar-error"/)
  assert.match(e, /We could not load your calendar/)
  assert.ok(!e.includes('boom'))
  session = null
  await assert.rejects(html(), /NEXT_REDIRECT \/login/)
})

test('a second tutor sees only their own lessons on the calendar', async () => {
  session = { id: B }
  const h = await html()
  assert.match(h, /Student 001/, 'their own lesson (named for their student)')
  assert.equal((h.match(/class="cal-block/g) ?? []).length, 1)
  assert.ok(!h.includes('10:00 AM, 60 minutes, scheduled') || (h.match(/class="cal-block/g) ?? []).length === 1)
})

const post = (body: unknown) => reschedule.POST(new Request('http://x/api/lessons/reschedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) }) as never)
const row = (id: string) => db.tables.lessons.find(l => l.id === id) as { starts_at: string; ends_at: string; status: string }

test('moving a lesson to a free time changes its start and its end', async () => {
  const to = at(2, 16)
  const res = await post({ lesson_id: lid(1), starts_at: to.toISOString() })
  assert.equal(res.status, 200)
  assert.equal(row(lid(1)).starts_at, to.toISOString())
  assert.equal(row(lid(1)).ends_at, new Date(to.getTime() + 3_600_000).toISOString(), 'the end follows the start')
})

test('a move onto another lesson is refused with the lesson it overlaps, and nothing changes until the tutor says "anyway"', async () => {
  const before = row(lid(1)).starts_at
  const res = await post({ lesson_id: lid(1), starts_at: at(0, 14, 30).toISOString() })
  assert.equal(res.status, 409)
  const body = await res.json()
  assert.equal(body.error, 'overlap')
  assert.equal(body.conflicts.length, 1)
  assert.equal(body.conflicts[0].id, lid(2))
  assert.equal(body.conflicts[0].student, 'Student 002')
  assert.equal(row(lid(1)).starts_at, before, 'refused: not moved')
  const forced = await post({ lesson_id: lid(1), starts_at: at(0, 14, 30).toISOString(), force: true })
  assert.equal(forced.status, 200)
  assert.equal(row(lid(1)).starts_at, at(0, 14, 30).toISOString())
  const touching = await post({ lesson_id: lid(2), starts_at: at(0, 15, 30).toISOString() })
  assert.equal(touching.status, 200, 'a lesson that starts when the other ends is not an overlap')
})

test('a cancelled lesson takes no time, so moving onto it is fine; only a scheduled lesson can be moved', async () => {
  assert.equal((await post({ lesson_id: lid(1), starts_at: at(1, 10).toISOString() })).status, 200, 'the cancelled lesson at 9:30 does not block')
  assert.equal((await post({ lesson_id: lid(3), starts_at: at(3, 9).toISOString() })).status, 409, 'a completed lesson')
  assert.equal(row(lid(3)).status, 'completed')
})

test('second tutor: moving the first tutor\'s lesson finds nothing and changes nothing; overlaps are only against their own lessons', async () => {
  const before = row(lid(1)).starts_at
  session = { id: B }
  const res = await post({ lesson_id: lid(1), starts_at: at(4, 9).toISOString(), force: true })
  assert.equal(res.status, 404)
  assert.equal(row(lid(1)).starts_at, before)
  // tutor B has a lesson at today 10:00; tutor A's lessons at 14:00 must not make a conflict for B
  const free = await post({ lesson_id: lid(1, 'b'), starts_at: at(0, 14).toISOString() })
  assert.equal(free.status, 200, 'A\'s 14:00 lesson is not B\'s business')
  // and A learns nothing about B\'s schedule
  session = { id: A }
  const fine = await post({ lesson_id: lid(1), starts_at: at(0, 10).toISOString() })
  assert.equal(fine.status, 200, 'B\'s lesson at 10:00 does not conflict with A')
})

test('the move route refuses bad input and a missing session', async () => {
  for (const bad of [{ starts_at: at(1, 9).toISOString() }, { lesson_id: 'x', starts_at: at(1, 9).toISOString() }, { lesson_id: lid(1) }, { lesson_id: lid(1), starts_at: 'tomorrow' },
    { lesson_id: lid(1), starts_at: '1999-01-01T00:00:00Z' }, { lesson_id: [lid(1)], starts_at: at(1, 9).toISOString() }]) {
    assert.equal((await post(bad)).status, 400, JSON.stringify(bad).slice(0, 60))
  }
  assert.equal((await post('not json')).status, 400)
  assert.equal((await post({ lesson_id: lid(99), starts_at: at(1, 9).toISOString() })).status, 404)
  session = null
  assert.equal((await post({ lesson_id: lid(1), starts_at: at(1, 9).toISOString() })).status, 401)
})

test('the calendar view moves lessons through the route, warns on 409, and has a form for keyboards and phones', () => {
  const src = read('src/app/(dashboard)/calendar/CalendarView.tsx')
  assert.match(src, /fetch\('\/api\/lessons\/reschedule'/)
  assert.match(src, /res\.status === 409 && data\.error === 'overlap'/)
  assert.match(src, /data-testid="overlap-warning"/)
  assert.match(src, /Move anyway/)
  assert.match(src, /force/)
  assert.match(src, /draggable=\{movable\}/)
  assert.match(src, /onDrop=\{e => onDrop\(e, d\)\}/)
  assert.match(src, /<label htmlFor="move-to"/)
  assert.match(src, /type="datetime-local"/)
  const css = read('src/styles/dashboard-shell.css')
  assert.match(css, /@media \(max-width: 767px\) \{\s*\.cal-week \{ display: none; \}\s*\.cal-agenda \{ display: block; \}/, 'under 768px the week grid is replaced by the day list')
})

// ---- messages --------------------------------------------------------------------------------------------------------

test('conversations: active students only, newest conversation first, unread counted, filter by name or email', async () => {
  const { conversations, totalUnread, failed } = await loadConversations({ from: (t: string) => db.from(t) }, db, A)
  assert.equal(failed, false)
  assert.deepEqual(conversations.map(c => c.name), ['Bo Chen', 'Ann Lee'], 'Bo wrote last; the inactive student is not listed')
  assert.equal(conversations[1].unread, 1, 'only the student\'s unread message counts, not the tutor\'s own')
  assert.equal(totalUnread, 2)
  assert.equal(conversations[1].latest?.fromTutor, true)
  assert.deepEqual(filterConversations(conversations, 'ANN').map(c => c.name), ['Ann Lee'])
  assert.deepEqual(filterConversations(conversations, 'bo@').map(c => c.name), ['Bo Chen'])
  assert.equal(filterConversations(conversations, '  ').length, 2)
  const none = await loadConversations({ from: (t: string) => db.from(t) }, db, '70000000-0000-4000-8000-0000000000ff')
  assert.deepEqual([none.conversations.length, none.failed], [0, false])
})

test('the Messages page: a list of the tutor\'s conversations beside the open page, and the other tutor\'s are not in it', async () => {
  const h = renderToStaticMarkup(await MessagesLayout({ children: createElement(MessagesIndex) }))
  assert.match(h, /data-testid="messages-shell"/)
  assert.match(h, /data-open="false"/)
  assert.match(h, /Ann Lee/)
  assert.match(h, /Bo Chen/)
  assert.match(h, /2 new/)
  assert.match(h, /data-testid="messages-pick"/)
  assert.ok(!h.includes('Secret Sam') && !h.includes('TOP SECRET') && !h.includes('Old Pal'))
  session = { id: B }
  const theirs = renderToStaticMarkup(await MessagesLayout({ children: createElement(MessagesIndex) }))
  assert.match(theirs, /Secret Sam/)
  assert.ok(!theirs.includes('Ann Lee') && !theirs.includes('Hello teacher'))
  session = { id: '70000000-0000-4000-8000-0000000000ff' }
  assert.match(renderToStaticMarkup(await MessagesLayout({ children: createElement(MessagesIndex) })), /data-testid="messages-empty"/)
  session = null
  await assert.rejects(MessagesLayout({ children: null }), /NEXT_REDIRECT \/login/)
})

test('a conversation: the thread and the student card, with the list still on the left; a conversation opens the thread on a phone', async () => {
  pathname = `/messages/${sid(1)}`
  const thread = await threadPage({ params: Promise.resolve({ studentId: sid(1) }) })
  const h = renderToStaticMarkup(await MessagesLayout({ children: thread }))
  assert.match(h, /data-open="true"/)
  assert.match(h, /data-testid="thread-grid"/)
  assert.match(h, /data-testid="student-card"/)
  assert.match(h, /Peru/)
  assert.match(h, /aria-current="page"/, 'the open conversation is marked in the list')
  assert.match(h, /aria-label="Back to conversations"/)
  assert.match(h, /Hello teacher/)
  assert.match(h, /href="\/lessons\/new\?student=/)
})

test('second tutor: another tutor\'s conversation is not found, and nothing of it is read into the page', async () => {
  session = { id: B }
  await assert.rejects(threadPage({ params: Promise.resolve({ studentId: sid(1) }) }), /NEXT_NOT_FOUND/)
  session = { id: A }
  await assert.rejects(threadPage({ params: Promise.resolve({ studentId: sid(1, 'b') }) }), /NEXT_NOT_FOUND/)
  // the messages of tutor B's student were not marked read by tutor A's attempt
  assert.equal((db.tables.messages.find(m => m.id === 'm4') as { read_at: string | null }).read_at, null)
})

test('the layout of Messages: three columns from 1280px, list then thread below it, and no 760px cap anywhere', () => {
  const css = read('src/styles/dashboard-shell.css')
  assert.match(css, /@media \(min-width: 1280px\) \{\s*\.msg-shell \{ grid-template-columns: 320px minmax\(0, 1fr\); gap: 16px; \}/)
  assert.match(css, /@media \(min-width: 1280px\) \{ \.msg-thread-grid \{ grid-template-columns: minmax\(0, 1fr\) 280px; \} \}/, 'thread and student card')
  assert.match(css, /\.msg-shell\[data-open="true"\] \.msg-list \{ display: none; \}/, 'a conversation replaces the list on a phone')
  assert.match(css, /\.msg-shell\[data-open="false"\] \.msg-main \{ display: none; \}/, 'the list alone on a phone')
  const files: string[] = []
  const walk = (dir: string) => { for (const n of readdirSync(path.join(ROOT, dir))) { const rel = `${dir}/${n}`; if (statSync(path.join(ROOT, rel)).isDirectory()) walk(rel); else if (/\.tsx$/.test(n)) files.push(rel) } }
  walk('src/app/(dashboard)/messages')
  walk('src/app/(dashboard)/calendar')
  for (const f of files) assert.doesNotMatch(read(f), /max-w-\[(760|680)px\]/, f)
  assert.ok(files.some(f => f.endsWith('messages/layout.tsx')))
})
