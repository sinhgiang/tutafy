// T-0728: the "free hours" step of the new-tutor onboarding really saves the hours, and says so when it cannot. The REAL code
// (src/lib/onboarding-availability.ts, the one the onboarding page calls) runs here against a throwaway Postgres (PGlite) built from the
// migration files, so the database's own type and constraint checks decide, and against a second copy whose column differs from the
// migrations (the real database may differ: the funnel report could not check it). The page's step logic is read from its source.
// The OLD behaviour (a day word and a column no migration makes, the answer ignored) is kept below as `oldSave`, to show that the same
// check goes red on it: put the fix back out and this file is red.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb } from './support/local-db.ts'
import { pgliteClient } from './support/pglite-client.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const lib = await import('@/lib/onboarding-availability.ts')
const { saveOnboardingAvailability, checkAvailabilityInput, availabilityRows, ONBOARDING_DAYS, DAY_NUMBER, SAVE_FAILED_MESSAGE } = lib

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

async function migrated(): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, '999_after_everything.sql') // every migration file of the repository
  await db.exec(`
    insert into auth.users (id, email) values ('${A}', 'a@example.com'), ('${B}', 'b@example.com');
    insert into public.tutors (id, email, name, slug) values ('${A}', 'a@example.com', 'Tutor A', 'tutor-a-ab12'), ('${B}', 'b@example.com', 'Tutor B', 'tutor-b-cd34');
  `)
  return db
}
const hoursOf = async (db: PGlite, tutor: string) =>
  (await db.query<{ day_of_week: number | string; start_time: string; end_time: string }>(`select day_of_week, start_time::text, end_time::text from public.availability where tutor_id = '${tutor}' order by day_of_week::text`)).rows

// ---- the pure parts ------------------------------------------------------------------------------------------------------

test('the days are written as the numbers the rest of the app reads: 0 = Sunday ... 6 = Saturday', () => {
  assert.deepEqual(DAY_NUMBER, { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 })
  assert.deepEqual([...ONBOARDING_DAYS], ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], 'the screen still shows Monday first')
  // the Availability page and the booking page read the same numbers
  assert.match(read('src/lib/availability-grid.ts'), /export const DAYS = \['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'\]/)
  assert.match(read('src/app/(dashboard)/availability/page.tsx'), /import { DAYS, /)
})

test('the rows hold exactly tutor_id, day_of_week (a number), start_time and end_time: no day word, no is_available', () => {
  const rows = availabilityRows(A, ['friday', 'monday', 'sunday', 'monday', 'someday', ''], '09:00', '17:00')
  assert.deepEqual(rows, [
    { tutor_id: A, day_of_week: 0, start_time: '09:00', end_time: '17:00' },
    { tutor_id: A, day_of_week: 1, start_time: '09:00', end_time: '17:00' },
    { tutor_id: A, day_of_week: 5, start_time: '09:00', end_time: '17:00' },
  ])
  for (const r of rows) assert.deepEqual(Object.keys(r), ['tutor_id', 'day_of_week', 'start_time', 'end_time'])
  assert.deepEqual(lib.AVAILABILITY_COLUMNS, ['tutor_id', 'day_of_week', 'start_time', 'end_time'])
})

test('a choice that cannot be saved is refused in words before anything is written', () => {
  assert.equal(checkAvailabilityInput(WEEKDAYS, '09:00', '17:00'), null)
  assert.equal(checkAvailabilityInput([], '09:00', '17:00'), 'Pick at least one day.')
  assert.equal(checkAvailabilityInput(['someday'], '09:00', '17:00'), 'Pick at least one day.')
  assert.equal(checkAvailabilityInput(WEEKDAYS, '', '17:00'), 'Choose a start time and an end time.')
  assert.equal(checkAvailabilityInput(WEEKDAYS, '09:00', '25:00'), 'Choose a start time and an end time.')
  assert.equal(checkAvailabilityInput(WEEKDAYS, '17:00', '09:00'), 'The end time must be after the start time.')
  assert.equal(checkAvailabilityInput(WEEKDAYS, '09:00', '09:00'), 'The end time must be after the start time.')
})

// ---- the real function on a database built from the migrations -----------------------------------------------------------------

/** The check every version of the save must pass: the hours are really in the table, as numbers 1 to 5, and the answer says ok. */
async function problemsOf(save: (db: PGlite) => Promise<{ ok: boolean }>): Promise<string[]> {
  const db = await migrated()
  const problems: string[] = []
  const result = await save(db)
  const rows = await hoursOf(db, A)
  if (!result.ok) problems.push('the answer is not ok')
  if (rows.length !== 5) problems.push(`${rows.length} rows in the table, expected 5`)
  else if (rows.map(r => Number(r.day_of_week)).join() !== '1,2,3,4,5') problems.push(`days ${rows.map(r => r.day_of_week)} are not 1,2,3,4,5`)
  if (rows.some(r => r.start_time !== '09:00:00' || r.end_time !== '17:00:00')) problems.push('times are not 09:00 and 17:00')
  return problems
}
const realSave = (db: PGlite) => saveOnboardingAvailability(pgliteClient(db), A, WEEKDAYS, '09:00', '17:00')

/** What the page did before this fix, kept word for word in shape: days as words, a column no migration makes, the answer never read. */
async function oldSave(db: PGlite): Promise<{ ok: boolean }> {
  const client = pgliteClient(db)
  await client.from('availability').delete().eq('tutor_id', A)
  await client.from('availability').insert(WEEKDAYS.map(day => ({ tutor_id: A, day_of_week: day, start_time: '09:00', end_time: '17:00', is_available: true })))
  return { ok: true } // it went on to the next screen whatever the answer was
}

test('on the schema the migrations make, the hours are saved: five rows, days 1 to 5, 09:00 to 17:00', async () => {
  assert.deepEqual(await problemsOf(realSave), [])
})

test('THE OLD BEHAVIOUR is red on the same check: the two writes fail on this schema (42703, 22P02) and the old code said "go on" anyway', async () => {
  const db = await migrated()
  const client = pgliteClient(db)
  const asWord = await client.from('availability').insert([{ tutor_id: A, day_of_week: 'monday', start_time: '09:00', end_time: '17:00', is_available: true }]).select('id')
  assert.equal(asWord.error?.code, '42703', 'is_available is a column no migration makes')
  const withoutIt = await client.from('availability').insert([{ tutor_id: A, day_of_week: 'monday', start_time: '09:00', end_time: '17:00' }]).select('id')
  assert.equal(withoutIt.error?.code, '22P02', 'a day word does not go into a whole-number column')
  const asNumber = await client.from('availability').insert([{ tutor_id: A, day_of_week: 1, start_time: '09:00', end_time: '17:00' }]).select('id')
  assert.equal(asNumber.error, null, 'a number does')
  const problems = await problemsOf(oldSave)
  assert.ok(problems.length >= 1, `the check reports the old code: ${problems.join('; ')}`)
  assert.ok(!problems.includes('the answer is not ok'), 'the old code said ok, which is exactly the lie')
  assert.ok(problems.some(p => p.includes('0 rows in the table')), 'and the table is empty')
})

test('new hours replace the earlier ones; the old rows are gone and nobody else\'s hours are touched (the second-person test)', async () => {
  const db = await migrated()
  await db.exec(`insert into public.availability (tutor_id, day_of_week, start_time, end_time) values ('${A}', 0, '10:00', '11:00'), ('${B}', 0, '08:00', '09:00'), ('${B}', 6, '08:00', '09:00')`)
  const before = await hoursOf(db, B)
  const res = await realSave(db)
  assert.deepEqual(res, { ok: true, saved: 5 })
  assert.deepEqual((await hoursOf(db, A)).map(r => Number(r.day_of_week)), [1, 2, 3, 4, 5], 'A\'s Sunday row is gone')
  assert.deepEqual(await hoursOf(db, B), before, 'B\'s hours are exactly as they were')
})

test('a real database refusal (a tutor that does not exist: foreign key 23503) is an answer of not ok with the message, and nothing is left', async () => {
  const db = await migrated()
  const res = await saveOnboardingAvailability(pgliteClient(db), '33333333-3333-4333-8333-333333333333', WEEKDAYS, '09:00', '17:00')
  assert.deepEqual(res, { ok: false, message: SAVE_FAILED_MESSAGE })
  assert.equal((await db.query('select count(*)::int n from public.availability')).rows[0].n, 0)
})

test('when the write fails, the earlier hours stay exactly as they were (new rows go in first, old ones come out after)', async () => {
  const db = await migrated()
  await db.exec(`insert into public.availability (tutor_id, day_of_week, start_time, end_time) values ('${A}', 6, '10:00', '11:00')`)
  const real = pgliteClient(db)
  // the insert is refused (as the old shape would be)
  const refusing = { from: (t: string) => { const q = real.from(t); return new Proxy(q, { get: (target, p) => (p === 'insert' ? () => ({ select: () => Promise.resolve({ data: null, error: { code: '22P02', message: 'invalid input syntax' } }) }) : (target as never)[p as never] && typeof (target as never)[p as never] === 'function' ? ((target as never)[p as never] as (...a: unknown[]) => unknown).bind(target) : (target as never)[p as never]) }) } }
  const res = await saveOnboardingAvailability(refusing, A, WEEKDAYS, '09:00', '17:00')
  assert.equal(res.ok, false)
  assert.deepEqual((await hoursOf(db, A)).map(r => Number(r.day_of_week)), [6], 'Saturday is still there')
  // the removal of the old rows is refused: the new rows are taken back, so the tutor does not end up with both
  const noRemoval = { from: (t: string) => ({ select: (c: string) => real.from(t).select(c), insert: (r: never) => real.from(t).insert(r), delete: () => ({ in: (col: string, vs: unknown[]) => (vs.length === 1 && vs[0] === (oldIdHolder.id) ? Promise.resolve({ data: null, error: { message: 'refused' } }) : real.from(t).delete().in(col, vs)) }) }) }
  const oldIdHolder = { id: (await db.query<{ id: string }>(`select id from public.availability where tutor_id = '${A}'`)).rows[0].id }
  const res2 = await saveOnboardingAvailability(noRemoval, A, WEEKDAYS, '09:00', '17:00')
  assert.equal(res2.ok, false)
  assert.deepEqual((await hoursOf(db, A)).map(r => Number(r.day_of_week)), [6], 'the new rows were taken back; only the earlier Saturday is left')
})

test('a tutor whose read-back shows fewer rows than written (something dropped them) is told it failed, not ok', async () => {
  const db = await migrated()
  const real = pgliteClient(db)
  let selects = 0
  const lossy = { from: (t: string) => ({ select: (c: string) => { selects++; return selects >= 2 ? real.from(t).select(c).eq('tutor_id', '00000000-0000-4000-8000-000000000000') : real.from(t).select(c) }, insert: (r: never) => real.from(t).insert(r), delete: () => real.from(t).delete() }) }
  const res = await saveOnboardingAvailability(lossy as never, A, WEEKDAYS, '09:00', '17:00')
  assert.equal(res.ok, false)
})

test('a check that fails before any write writes nothing: no days, a bad time, the end before the start', async () => {
  const db = await migrated()
  const client = pgliteClient(db)
  for (const [days, s, e] of [[[], '09:00', '17:00'], [WEEKDAYS, '', '17:00'], [WEEKDAYS, '17:00', '09:00']] as const) {
    const res = await saveOnboardingAvailability(client, A, days, s, e)
    assert.equal(res.ok, false)
  }
  assert.equal((await db.query('select count(*)::int n from public.availability')).rows[0].n, 0)
})

// ---- a database that differs from the migrations (the real one may) -----------------------------------------------------------------

test('on a copy where day_of_week is text and a column is_available exists, the same save still works (a number goes into a text column)', async () => {
  const db = await migrated()
  await db.exec(`alter table public.availability drop constraint if exists availability_day_of_week_check;
    alter table public.availability alter column day_of_week type text using day_of_week::text;
    alter table public.availability add column is_available boolean not null default true;`)
  const res = await realSave(db)
  assert.deepEqual(res, { ok: true, saved: 5 })
  assert.deepEqual((await hoursOf(db, A)).map(r => String(r.day_of_week)), ['1', '2', '3', '4', '5'])
  assert.equal((await db.query('select bool_and(is_available) as a from public.availability')).rows[0].a, true, 'the extra column keeps its own default')
})

// ---- the page ------------------------------------------------------------------------------------------------------------------------

test('the onboarding page uses the helper, opens the next screen only after an ok answer, shows the error and writes no hours itself', () => {
  const page = read('src/app/onboarding/page.tsx')
  assert.match(page, /import \{ saveOnboardingAvailability, checkAvailabilityInput, ONBOARDING_DAYS \} from '@\/lib\/onboarding-availability'/)
  assert.ok(!/is_available/.test(page), 'the column no migration makes is gone')
  assert.ok(!/day_of_week/.test(page), 'the page no longer writes the table itself')
  assert.ok(!/from\('availability'\)\.(insert|delete)/.test(page))
  // step 3 (share your link) is reached from exactly one place, and only after the answer was ok
  const fn = page.slice(page.indexOf('async function saveAvailability()'), page.indexOf('function copyLink()'))
  assert.equal([...page.matchAll(/setStep\(3\)/g)].length, 1, 'one way into step 3')
  assert.match(fn, /if \(!result\.ok\) \{[\s\S]*?return\s*\}\s*setStep\(3\)/, 'a failed save returns before step 3')
  assert.match(fn, /setAvailError\(result\.message\)/)
  assert.match(fn, /toast\.error\(result\.message\)/)
  assert.match(fn, /if \(!user\) \{[\s\S]*?setSaving\(false\)[\s\S]*?return/, 'a missing session no longer leaves the button stuck on "Saving..."')
  assert.match(page, /role="alert" data-testid="availability-error"/)
  assert.match(page, /disabled=\{saving \|\| availDays\.length === 0\}/, 'no days: the Next button stays off')
})

test('the words are English and no address is typed in the new file', () => {
  const src = read('src/lib/onboarding-availability.ts')
  assert.doesNotMatch(src, /[ạảãàáâậầấẩẫăắằặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i)
  assert.doesNotMatch(src, /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/)
})
