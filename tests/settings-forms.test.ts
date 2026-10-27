// T-0824 (G5): Settings (booking page preview beside the form, the unsaved-changes bar), Availability (a weekly grid), Import (a preview
// table before anything is saved) and the one-column forms. The pure rules, the REAL import route over an in-memory Supabase with two
// tutors, the preview drawn from a form, and the database's own row level security for every write these pages make (a throwaway
// Postgres built from every migration, with a second tutor trying each write on the first tutor's rows).
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import type { PGlite } from '@electric-sql/pglite'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import { applyMigrationsBefore, newDb } from './support/local-db.ts'
import { DAYS, checkNewSlot, copyPlan, gridRange, overlapsExisting, slotBlock, toMinutes, weeklyHours, type Slot } from '@/lib/availability-grid'
import { MAX_CSV_CHARS, PREVIEW_ROWS, detectPlatform, parseCSV, parsePreply, previewRow } from '@/lib/csv-import'
import { BookingPreview, type PreviewForm } from '@/components/settings/BookingPreview'
import { settingsSource } from './support/settings-source.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

// ---- availability: pure rules ---------------------------------------------------------------------------------------------

const slot = (id: string, day: number, a: string, b: string): Slot => ({ id, day_of_week: day, start_time: a, end_time: b })

test('times: "09:30" and "09:30:00" are minutes; anything else is not a time', () => {
  assert.equal(toMinutes('09:30'), 570)
  assert.equal(toMinutes('09:30:00'), 570)
  assert.equal(toMinutes('24:00'), 1440)
  for (const bad of ['', '9', '25:00', '12:60', 'ab:cd', '12:5']) assert.equal(toMinutes(bad), null, bad)
})

test('the grid shows 6:00 to 22:00 at least and grows for a slot outside it; a block sits at its time', () => {
  assert.deepEqual(gridRange([]), { from: 6, to: 22 })
  assert.deepEqual(gridRange([slot('a', 1, '04:30', '10:00'), slot('b', 2, '20:00', '23:30')]), { from: 4, to: 24 })
  const b = slotBlock({ start_time: '09:00', end_time: '17:00' }, 6)
  assert.equal(b.top, 3 * 40)
  assert.equal(b.height, 8 * 40)
  assert.ok(slotBlock({ start_time: '09:00', end_time: '09:05' }, 6).height >= 14)
})

test('a new slot: end after start, no overlap with a slot of the same day; touching slots and other days are fine', () => {
  const have = [slot('a', 1, '09:00', '12:00')]
  assert.equal(checkNewSlot(have, { day_of_week: 1, start_time: '12:00', end_time: '14:00' }), null, 'starts when the other ends')
  assert.equal(checkNewSlot(have, { day_of_week: 2, start_time: '09:00', end_time: '12:00' }), null, 'another day')
  assert.match(checkNewSlot(have, { day_of_week: 1, start_time: '11:00', end_time: '13:00' })!, /overlaps a slot you already have on Monday/)
  assert.match(checkNewSlot(have, { day_of_week: 1, start_time: '10:00', end_time: '10:00' })!, /End time must be after/)
  assert.match(checkNewSlot(have, { day_of_week: 1, start_time: '10:00', end_time: '09:00' })!, /End time must be after/)
  assert.match(checkNewSlot(have, { day_of_week: 9, start_time: '10:00', end_time: '11:00' })!, /Choose a day/)
  assert.equal(overlapsExisting(have, { day_of_week: 1, start_time: '08:00', end_time: '09:00' }), false)
  assert.ok(DAYS.length === 7)
})

test('copy a day: the source slots on each chosen day, never onto the source day, never over a slot that is already there', () => {
  const have = [slot('a', 1, '09:00:00', '12:00:00'), slot('b', 1, '14:00', '17:00'), slot('c', 3, '10:00', '11:00')]
  const plan = copyPlan(have, 1, [2, 3, 1, 2, 9])
  assert.deepEqual(plan.filter(p => p.day_of_week === 2), [{ day_of_week: 2, start_time: '09:00', end_time: '12:00' }, { day_of_week: 2, start_time: '14:00', end_time: '17:00' }])
  assert.deepEqual(plan.filter(p => p.day_of_week === 3), [{ day_of_week: 3, start_time: '14:00', end_time: '17:00' }], 'Wednesday keeps its 10:00 slot, so 9:00 to 12:00 would overlap and is left out')
  assert.ok(!plan.some(p => p.day_of_week === 1 || p.day_of_week === 9))
  assert.deepEqual(copyPlan(have, 5, [1, 2]), [], 'an empty source copies nothing')
  assert.equal(weeklyHours(have), 7)
})

// ---- import: the reading side and the real route ---------------------------------------------------------------------------

const CSV = ['Student,Email,Date,Duration,Amount', 'Ann Lee,ann@example.com,2026-01-05,60,$30', 'Ann Lee,ann@example.com,2026-01-12,60,$30', 'Bo Chen,bo@example.com,2026-01-06,30,$20', 'No Email,,2026-02-01,60,$25', ',,,,'].join('\n')

test('the file is read into students with their lessons, and each preview row says what will happen', () => {
  const { headers, rows } = parseCSV(CSV)
  assert.equal(detectPlatform(headers), 'generic')
  const students = parsePreply(headers, rows)
  assert.deepEqual(students.map(s => [s.name, s.lessons.length]), [['Ann Lee', 2], ['Bo Chen', 1], ['No Email', 1]])
  const known = new Set(['bo@example.com'])
  const [ann, bo, noEmail] = students.map(s => previewRow(s, known))
  assert.deepEqual([ann.lessons, ann.existing, ann.notes], [2, false, []])
  assert.equal(ann.firstLesson!.slice(0, 10) <= ann.lastLesson!.slice(0, 10), true)
  assert.equal(bo.existing, true)
  assert.match(bo.notes[0], /Already your student/)
  assert.match(noEmail.notes.join(' '), /No email/)
  assert.deepEqual(parseCSV('only one line'), { headers: [], rows: [] })
})

const A = '80000000-0000-4000-8000-00000000000a'
const B = '80000000-0000-4000-8000-00000000000b'
let db: FakeDb
let session: { id: string } | null
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: { createAdminClient: () => db, createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: session } }) } }) },
})
const importRoute = await import('@/app/api/import/route.ts')
beforeEach(() => {
  db = createFakeDb({
    tutors: [{ id: A, subscription_status: 'pro' }, { id: B, subscription_status: 'pro' }, { id: '80000000-0000-4000-8000-0000000000f1', subscription_status: 'free' }],
    students: [{ id: 's-a', tutor_id: A, name: 'Bo Chen', email: 'bo@example.com' }, { id: 's-b', tutor_id: B, name: 'Zed', email: 'ann@example.com' }],
    lessons: [],
  })
  session = { id: A }
})
const post = (body: unknown) => importRoute.POST(new Request('http://x/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) }) as never)

test('the preview (a dry run) lists what would happen and saves NOTHING', async () => {
  const res = await post({ csvText: CSV, dryRun: true })
  assert.equal(res.status, 200)
  const data = await res.json()
  assert.deepEqual([data.totalStudents, data.totalLessons, data.rowsInFile, data.shown], [3, 4, 5, 3])
  assert.equal(data.rows.find((r: { name: string }) => r.name === 'Bo Chen').existing, true)
  assert.equal(data.rows.find((r: { name: string }) => r.name === 'Ann Lee').existing, false, 'Ann is another tutor\'s student, not mine')
  assert.equal(db.tables.students.length, 2, 'no student was added')
  assert.equal(db.tables.lessons.length, 0, 'no lesson was added')
  assert.ok(!db.log.some(l => l.op === 'insert' || l.op === 'update' || l.op === 'delete'))
})

test('a long file previews its first 25 students and says how many there are in all', async () => {
  const many = ['Student,Email,Date', ...Array.from({ length: 60 }, (_, i) => `Person ${i},p${i}@example.com,2026-03-01`)].join('\n')
  const data = await (await post({ csvText: many, dryRun: true })).json()
  assert.equal(data.rows.length, PREVIEW_ROWS)
  assert.deepEqual([data.shown, data.totalStudents], [25, 60])
})

test('importing creates the students and lessons for THIS tutor only, and reuses a student who is already theirs', async () => {
  const res = await post({ csvText: CSV })
  const data = await res.json()
  assert.deepEqual([data.importedStudents, data.importedLessons], [2, 4], 'Bo already existed for this tutor')
  assert.ok(db.tables.students.filter(s => s.name === 'Ann Lee').every(s => s.tutor_id === A), 'the new student belongs to the session\'s tutor')
  assert.ok(db.tables.lessons.every(l => l.tutor_id === A))
  assert.equal((db.tables.students.find(s => s.id === 's-b') as { tutor_id: string }).tutor_id, B, 'the other tutor\'s student is untouched')
  assert.ok(db.tables.lessons.every(l => l.student_id !== 's-b'), 'nothing was added to the other tutor\'s student, even with the same email')
})

test('second tutor: the same file lands in their own list; an email that belongs to the first tutor is not "already your student" for them', async () => {
  session = { id: B }
  const data = await (await post({ csvText: CSV, dryRun: true })).json()
  assert.equal(data.rows.find((r: { name: string }) => r.name === 'Ann Lee').existing, true, 'ann@ is THEIR student (Zed)')
  assert.equal(data.rows.find((r: { name: string }) => r.name === 'Bo Chen').existing, false, 'bo@ belongs to the first tutor')
})

test('the import route needs a Pro tutor, a CSV text, a sensible size, and a body that is JSON', async () => {
  session = null
  assert.equal((await post({ csvText: CSV })).status, 401)
  session = { id: '80000000-0000-4000-8000-0000000000f1' }
  assert.equal((await post({ csvText: CSV })).status, 403, 'a Free tutor')
  session = { id: A }
  assert.equal((await post('not json')).status, 400)
  assert.equal((await post({})).status, 400)
  assert.equal((await post({ csvText: 5 })).status, 400)
  assert.equal((await post({ csvText: 'x'.repeat(MAX_CSV_CHARS + 1) })).status, 413)
  assert.equal((await post({ csvText: 'one line only', dryRun: true })).status, 400)
  assert.equal(db.tables.students.length, 2)
})

// ---- the preview of the booking page --------------------------------------------------------------------------------------

const FORM: PreviewForm = {
  name: 'Sarah Johnson', bio: 'I teach conversation.\n\n  Friendly lessons.', timezone: 'America/New_York', cancellation_hours: 24, buffer_minutes: 15,
  default_lesson_price: '40', trial_enabled: true, trial_price: '', currency: 'EUR', lesson_durations: [90, 30, 60], default_lesson_duration: 60, booking_url_active: true,
}
const draw = (f: Partial<PreviewForm>, slug = 'sarah', avatar: string | null = null) => renderToStaticMarkup(createElement(BookingPreview, { form: { ...FORM, ...f }, slug, avatarUrl: avatar }))

test('the preview shows the form as it is now: name, introduction, price in the tutor\'s currency, trial, lengths, cancellation', () => {
  const h = draw({})
  assert.match(h, /data-testid="preview-name">Sarah Johnson</)
  assert.match(h, /I teach conversation\. Friendly lessons\./, 'blank lines collapse to one')
  assert.match(h, /€40\.00 per lesson/)
  assert.match(h, /Free trial lesson/)
  assert.ok(h.indexOf('30 min') < h.indexOf('60 min') && h.indexOf('60 min') < h.indexOf('90 min'), 'lengths in order')
  assert.match(h, /Free up to 24 hours before/)
  assert.match(h, /15 minutes/)
  assert.match(h, /href="\/book\/sarah"/)
  assert.match(h, /Page is on/)
})

test('the preview follows each field: a paid trial, no price, no trial, no cancellation, a page that is off, a long introduction, a name nobody typed yet', () => {
  assert.match(draw({ trial_price: '12.5' }), /30-minute trial €12\.50/)
  assert.match(draw({ default_lesson_price: '' }), /No price set/)
  assert.ok(!draw({ trial_enabled: false }).includes('Free trial'))
  assert.match(draw({ cancellation_hours: 0, buffer_minutes: 0 }), /No notice needed/)
  const off = draw({ booking_url_active: false })
  assert.match(off, /Page is off/)
  assert.ok(!off.includes('href="/book/'), 'no link to a page that is off')
  assert.match(draw({ bio: 'x'.repeat(400) }), /x{180}\.\.\./)
  const blank = draw({ name: '  ', bio: '' }, '')
  assert.match(blank, />Your name</)
  assert.match(blank, /Your introduction will show here/)
  assert.match(blank, /appears once your page has an address/)
  assert.match(draw({}, 'sarah', 'https://img.example.com/p.jpg'), /<img src="https:\/\/img\.example\.com\/p\.jpg"/)
})

test('text a tutor types into the form is drawn as text in the preview (never as markup)', () => {
  const h = draw({ name: '<script>alert(1)</script>', bio: '<img src=x onerror=alert(1)>' })
  assert.ok(!h.includes('<script>') && !h.includes('<img src=x'))
  assert.match(h, /&lt;script&gt;/)
})

// ---- the pages -------------------------------------------------------------------------------------------------------------

test('settings: the booking preview sits beside the form from 1440px, the form column is 720px, and unsaved changes have one bar and a leave-page warning', () => {
  const src = settingsSource()
  assert.match(src, /<BookingPreview form=\{form\} slug=\{slug\} avatarUrl=\{avatarUrl\} \/>/)
  assert.match(src, /data-testid="unsaved-bar"/)
  assert.match(src, /\{hasChanges && \(\s*<div className="dash-unsaved"/)
  assert.match(src, /addEventListener\('beforeunload', warn\)/)
  assert.match(src, /Discard/)
  assert.match(src, /Save changes/)
  assert.doesNotMatch(src, /max-w-\[/)
  const css = read('src/styles/dashboard-shell.css')
  assert.match(css, /@media \(min-width: 1440px\) \{ \.set-shell \{ grid-template-columns: 190px minmax\(0, 720px\) 340px; justify-content: center; \} \}/)
  assert.match(css, /@media \(min-width: 1440px\) \{ \.set-preview \{ display: block;/)
  assert.match(css, /\.set-preview \{ display: none; \}/, 'under 1440px the preview is not drawn')
  assert.match(css, /@media \(max-width: 767px\) \{ \.dash-unsaved \{ bottom: 72px;/, 'on a phone the bar sits above the bottom menu')
})

test('availability: the week is a grid with a form and a copy tool, every write carries the session\'s tutor id', () => {
  const src = read('src/app/(dashboard)/availability/page.tsx')
  assert.match(src, /data-testid="week-availability"/)
  assert.match(src, /checkNewSlot\(slots, add\)/)
  assert.match(src, /copyPlan\(slots, parseInt\(copyFrom\), copyTo\)/)
  assert.match(src, /insert\(\{ tutor_id: user\.id, \.\.\.add \}\)/)
  assert.match(src, /plan\.map\(p => \(\{ tutor_id: user\.id, \.\.\.p \}\)\)/)
  assert.match(src, /upsert\(\{ tutor_id: user\.id, date: newExDate/)
  assert.doesNotMatch(src, /max-w-\[/)
})

test('every form is one centred column of 720px: new and edit lesson, new and edit student, Import', () => {
  for (const f of ['src/app/(dashboard)/lessons/new/page.tsx', 'src/app/(dashboard)/lessons/[id]/edit/page.tsx', 'src/app/(dashboard)/students/new/StudentForm.tsx', 'src/app/(dashboard)/students/[id]/edit/page.tsx', 'src/app/(dashboard)/import/ImportTool.tsx']) {
    const src = read(f)
    assert.match(src, /<PageColumn size="form"/, f)
    assert.doesNotMatch(src, /max-w-\[\d+px\]/, f)
  }
  assert.match(read('src/styles/dashboard-shell.css'), /\.dash-column-form \{ max-width: 720px; \}/)
})

test('import: the preview is a table, nothing is saved before the button, and a failed read says so in the page (no alert box)', () => {
  const src = read('src/app/(dashboard)/import/ImportTool.tsx')
  assert.match(src, /<table className="dash-table" aria-label="What will be imported">/)
  assert.match(src, /dryRun: true/)
  assert.match(src, /Nothing is saved until you press Import/)
  assert.match(src, /data-testid="import-problem"/)
  assert.doesNotMatch(src, /\balert\(/)
})

// ---- row level security: a second tutor's every write on the first tutor's rows ------------------------------------------------

async function as<T>(pg: PGlite, userId: string, fn: () => Promise<T>): Promise<T> {
  await pg.exec('set role authenticated')
  await pg.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId])
  try { return await fn() } finally { await pg.exec('reset role'); await pg.query(`select set_config('request.jwt.claim.sub', '', false)`) }
}
const denied = async (fn: () => Promise<unknown>) => { try { await fn(); return false } catch (e) { return /row-level security|permission denied/i.test((e as Error).message) } }

test('RLS: tutor B cannot add, change or remove tutor A\'s availability, blocked dates, profile, students or lessons; tutor B can do the same on their own rows', async () => {
  const pg = await newDb()
  await applyMigrationsBefore(pg, 'zzz_after_everything.sql')
  for (const [id, slug] of [[A, 'tutor-a'], [B, 'tutor-b']]) {
    await pg.query(`insert into auth.users (id, email) values ($1, $2)`, [id, `${slug}@example.com`])
    await pg.query(`insert into public.tutors (id, name, email, slug) values ($1, $2, $3, $4)`, [id, `Tutor ${slug}`, `${slug}@example.com`, slug])
  }
  await pg.query(`insert into public.availability (tutor_id, day_of_week, start_time, end_time) values ($1, 1, '09:00', '12:00')`, [A])
  await pg.query(`insert into public.availability_exceptions (tutor_id, date, reason) values ($1, current_date + 5, 'A only')`, [A])
  const st = await pg.query<{ id: string }>(`insert into public.students (tutor_id, name, email) values ($1, 'A Student', 'as@example.com') returning id`, [A])
  await pg.query(`insert into public.lessons (tutor_id, student_id, starts_at, ends_at, duration_minutes) values ($1, $2, now() + interval '1 day', now() + interval '1 day 1 hour', 60)`, [A, st.rows[0].id])
  const count = async (table: string, where: string, params: unknown[]) => Number((await pg.query<{ n: string }>(`select count(*)::int as n from public.${table} where ${where}`, params)).rows[0].n)

  // B writing A's rows: every insert is refused, every update and delete finds nothing
  assert.equal(await as(pg, B, () => denied(() => pg.query(`insert into public.availability (tutor_id, day_of_week, start_time, end_time) values ($1, 2, '10:00', '11:00')`, [A]))), true, 'insert availability for A')
  assert.equal(await as(pg, B, () => pg.query(`update public.availability set end_time = '23:00' where tutor_id = $1`, [A])).then(r => r.affectedRows), 0, 'update A availability')
  assert.equal(await as(pg, B, () => pg.query(`delete from public.availability where tutor_id = $1`, [A])).then(r => r.affectedRows), 0, 'delete A availability')
  assert.equal(await as(pg, B, () => denied(() => pg.query(`insert into public.availability_exceptions (tutor_id, date) values ($1, current_date + 9)`, [A]))), true, 'block a date for A')
  assert.equal(await as(pg, B, () => pg.query(`delete from public.availability_exceptions where tutor_id = $1`, [A])).then(r => r.affectedRows), 0, 'unblock A date')
  assert.equal(await as(pg, B, () => pg.query(`update public.tutors set name = 'Hijacked', booking_url_active = false where id = $1`, [A])).then(r => r.affectedRows), 0, 'edit A profile (Settings save)')
  assert.equal(await as(pg, B, () => denied(() => pg.query(`insert into public.students (tutor_id, name) values ($1, 'Planted')`, [A]))), true, 'add a student to A (import, new student form)')
  assert.equal(await as(pg, B, () => pg.query(`update public.students set name = 'Hijacked' where tutor_id = $1`, [A])).then(r => r.affectedRows), 0, 'edit A student')
  assert.equal(await as(pg, B, () => denied(() => pg.query(`insert into public.lessons (tutor_id, student_id, starts_at, ends_at, duration_minutes) values ($1, $2, now(), now(), 30)`, [A, st.rows[0].id]))), true, 'add a lesson to A (new lesson form)')
  assert.equal(await as(pg, B, () => pg.query(`update public.lessons set status = 'cancelled' where tutor_id = $1`, [A])).then(r => r.affectedRows), 0, 'edit A lesson')

  // nothing of A's changed
  assert.equal(await count('availability', `tutor_id = $1 and end_time = '12:00'`, [A]), 1)
  assert.equal(await count('availability', `tutor_id = $1`, [A]), 1)
  assert.equal(await count('availability_exceptions', `tutor_id = $1`, [A]), 1)
  assert.equal(await count('tutors', `id = $1 and name = 'Tutor tutor-a'`, [A]), 1)
  assert.equal(await count('students', `tutor_id = $1 and name = 'A Student'`, [A]), 1)
  assert.equal(await count('lessons', `tutor_id = $1 and status <> 'cancelled'`, [A]), 1)

  // the same writes on B's own rows work (so the refusals above are the policy, not a broken test)
  await as(pg, B, async () => {
    await pg.query(`insert into public.availability (tutor_id, day_of_week, start_time, end_time) values ($1, 2, '10:00', '11:00')`, [B])
    await pg.query(`insert into public.availability_exceptions (tutor_id, date) values ($1, current_date + 9)`, [B])
    await pg.query(`update public.tutors set name = 'Renamed' where id = $1`, [B])
    await pg.query(`insert into public.students (tutor_id, name) values ($1, 'B Student')`, [B])
  })
  assert.equal(await count('availability', `tutor_id = $1`, [B]), 1)
  assert.equal(await count('tutors', `id = $1 and name = 'Renamed'`, [B]), 1)
})
