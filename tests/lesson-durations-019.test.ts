// 019_custom_lesson_durations.sql is written but NOT applied to the real database (T-0700). Migration 018 IS applied there, so 018
// is not touched: it must stay exactly the file that was applied (checked by its fingerprint), and 019 widens its two checks.
// Everything runs on a throwaway in-memory Postgres (PGlite) that stands in for Supabase: 018 as it was applied, then 019, then 019
// again. It shows that custom lengths are accepted after 019 and refused before it, that nothing outside the limits gets in,
// that rows saved under 018 stay valid and are not touched, and that what the Settings page says before 019 is a plain sentence.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb, readMigration, migrationFiles } from './support/local-db.ts'
import { LENGTHS_NEED_UPDATE, isLengthCheckRefusal, lengthSaveErrorMessage } from '@/lib/lesson-durations.ts'

const OLD = '018_lesson_durations.sql'
const NEW = '019_custom_lesson_durations.sql'
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const fingerprint = (sql: string) => createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex')
// the fingerprint of 018 as it was applied to the real database (commit of T-0675)
const APPLIED_018 = '1d418069c48d35b89dd6eebb4647bef87fabadcf1ead2a98db81276479947bd7'

/** The database as it is now: every file up to 018 applied (018 included), tutors A and B present; 019 only when asked. */
async function freshDb(apply019 = true): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, OLD)
  await db.exec(`
    insert into auth.users (id, email) values ('${A}', 'a@example.com'), ('${B}', 'b@example.com');
    insert into public.tutors (id, email, name, slug, booking_url_active) values
      ('${A}', 'a@example.com', 'Tutor A', 'tutor-a', true), ('${B}', 'b@example.com', 'Tutor B', 'tutor-b', true);
  `)
  await db.exec(readMigration(OLD))
  if (apply019) await db.exec(readMigration(NEW))
  return db
}
const row = async (db: PGlite, id: string) =>
  (await db.query<{ lesson_durations: number[] | null; default_lesson_duration: number | null }>(
    `select lesson_durations, default_lesson_duration from public.tutors where id = '${id}'`)).rows[0]
const set = (db: PGlite, sql: string, id = A) => db.exec(`update public.tutors set ${sql} where id = '${id}'`)
async function asUser<T>(db: PGlite, userId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId}', false); set role authenticated`)
  try { return await fn() } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`) }
}

// ---- 018 is left as it was applied --------------------------------------------------------------------------------

test('018 is exactly the file that was applied to the real database, and 019 is the one new file', () => {
  assert.equal(fingerprint(readMigration(OLD)), APPLIED_018, '018 was changed: it is already applied, so a change would have no effect on the real database')
  assert.match(readMigration(OLD), /array\[30, 45, 60, 90\]/)
  assert.deepEqual(migrationFiles().filter(f => f.startsWith('019_')), [NEW])
  assert.deepEqual(migrationFiles().filter(f => f.startsWith('018_')), [OLD])
})

// ---- what 019 is ----------------------------------------------------------------------------------------------------

test('019 applies on top of 018, and twice in a row (it drops and adds its two checks)', async () => {
  const db = await freshDb(false)
  await db.exec(readMigration(NEW))
  await db.exec(readMigration(NEW))
  await db.exec(readMigration(NEW))
  const checks = await db.query<{ conname: string; convalidated: boolean }>(
    `select conname, convalidated from pg_constraint where conrelid = 'public.tutors'::regclass and conname like 'tutors_%lesson_duration%' order by 1`)
  assert.deepEqual(checks.rows, [
    { conname: 'tutors_default_lesson_duration_valid', convalidated: true },
    { conname: 'tutors_lesson_durations_valid', convalidated: true },
  ], 'two checks, added already checked (no NOT VALID step to finish later)')
})

test('019 changes only those two checks: no column, no row, no policy, no trigger, no function', async () => {
  const db = await freshDb(false)
  await set(db, `lesson_durations = array[30, 60], default_lesson_duration = 30`)
  const snapshot = async () => ({
    columns: (await db.query(`select table_name, column_name, data_type from information_schema.columns where table_schema = 'public' order by 1, 2`)).rows,
    rows: (await db.query(`select * from public.tutors order by id`)).rows,
    policies: (await db.query(`select tablename, policyname, cmd from pg_policies order by 1, 2`)).rows,
    triggers: (await db.query(`select tgrelid::regclass::text as t, tgname from pg_trigger where not tgisinternal order by 1, 2`)).rows,
    functions: (await db.query(`select proname from pg_proc where pronamespace = 'public'::regnamespace order by 1`)).rows,
    constraints: (await db.query(`select conname from pg_constraint where connamespace = 'public'::regnamespace order by 1`)).rows,
  })
  const before = await snapshot()
  await db.exec(readMigration(NEW))
  const after = await snapshot()
  assert.deepEqual(after.columns, before.columns)
  assert.deepEqual(after.rows, before.rows, 'not one row changed')
  assert.deepEqual(after.policies, before.policies)
  assert.deepEqual(after.triggers, before.triggers)
  assert.deepEqual(after.functions, before.functions)
  assert.deepEqual(after.constraints, before.constraints, 'the same two constraints, by the same names')
})

// ---- custom lengths: refused before, accepted after -------------------------------------------------------------------

test('BEFORE 019 (only 018): a length of the tutor’s own is refused by the database', async () => {
  const db = await freshDb(false)
  for (const bad of [`lesson_durations = array[75]`, `lesson_durations = array[20, 60]`, `lesson_durations = array[30, 45, 60, 90, 120]`, `lesson_durations = array[10]`, `lesson_durations = array[240]`]) {
    await assert.rejects(set(db, bad), /violates check constraint "tutors_lesson_durations_valid"/, bad)
  }
  assert.deepEqual(await row(db, A), { lesson_durations: null, default_lesson_duration: null })
})

test('AFTER 019: 20, 75 and 120 are taken, up to six lengths, the default may be a custom one', async () => {
  const db = await freshDb()
  await set(db, `lesson_durations = array[20, 75, 120], default_lesson_duration = 75`)
  assert.deepEqual(await row(db, A), { lesson_durations: [20, 75, 120], default_lesson_duration: 75 })
  await set(db, `lesson_durations = array[10, 20, 75, 120, 200, 240], default_lesson_duration = 10`)
  assert.deepEqual((await row(db, A)).lesson_durations, [10, 20, 75, 120, 200, 240], 'six lengths, both ends of the range')
  await set(db, `lesson_durations = array[240], default_lesson_duration = 240`)
  await set(db, `lesson_durations = array[75], default_lesson_duration = 75`)
  assert.deepEqual(await row(db, A), { lesson_durations: [75], default_lesson_duration: 75 }, 'one custom length alone')
  await set(db, `lesson_durations = array[30, 75], default_lesson_duration = 30`)
  await set(db, `lesson_durations = null, default_lesson_duration = null`)
  assert.deepEqual(await row(db, A), { lesson_durations: null, default_lesson_duration: null }, 'back to "chose nothing"')
  for (let m = 10; m <= 240; m += 5) await set(db, `lesson_durations = array[${m}], default_lesson_duration = ${m}`) // every step of the range
})

test('AFTER 019: out of range, not a multiple of 5, seven lengths, none, a null inside and a default that is not offered are refused', async () => {
  const db = await freshDb()
  await set(db, `lesson_durations = array[30, 75], default_lesson_duration = 75`)
  // a list is tried with the default cleared, so the default's own check cannot be the one that refuses it
  const list = (sql: string) => `lesson_durations = ${sql}, default_lesson_duration = null`
  const refused: [string, string][] = [
    ['5 minutes', list('array[5]')], ['9 minutes beside a good one', list('array[30, 9]')],
    ['245 minutes', list('array[245]')], ['250 minutes', list('array[250]')], ['a day', list('array[1440]')],
    ['zero', list('array[0]')], ['negative', list('array[-30]')],
    ['12 (not a multiple of 5)', list('array[12]')], ['77 beside a good one', list('array[30, 77]')],
    ['seven lengths', list('array[10, 20, 30, 40, 50, 60, 70]')], ['none at all', list("'{}'")],
    ['a null inside', list('array[30, null]::int[]')], ['only a null', list('array[null]::int[]')],
    ['a default that is not offered', `default_lesson_duration = 60`], ['a default out of range', `lesson_durations = array[30], default_lesson_duration = 250`],
    ['a default of 5', `lesson_durations = null, default_lesson_duration = 5`], ['a default that is not a multiple of 5', `lesson_durations = null, default_lesson_duration = 12`],
    ['a default of 0', `lesson_durations = null, default_lesson_duration = 0`],
  ]
  for (const [why, sql] of refused) await assert.rejects(set(db, sql), /violates check constraint "tutors_(lesson_durations|default_lesson_duration)_valid"/, why)
  assert.deepEqual(await row(db, A), { lesson_durations: [30, 75], default_lesson_duration: 75 }, 'every refused update left the row alone')
})

// ---- what 018 already allowed stays allowed -----------------------------------------------------------------------------

test('rows saved under 018 stay valid and untouched; every value 018 accepted, 019 accepts', async () => {
  const db = await newDb()
  await applyMigrationsBefore(db, OLD)
  await db.exec(`
    insert into auth.users (id, email) values ('${A}', 'a@example.com'), ('${B}', 'b@example.com'), ('33333333-3333-4333-8333-333333333333', 'c@example.com');
    insert into public.tutors (id, email, name, slug) values
      ('${A}', 'a@example.com', 'Tutor A', 'a'), ('${B}', 'b@example.com', 'Tutor B', 'b'), ('33333333-3333-4333-8333-333333333333', 'c@example.com', 'Tutor C', 'c');
  `)
  await db.exec(readMigration(OLD))
  // data that exists the way 018 let it exist, including a repeat (018 never forbade one)
  await db.exec(`update public.tutors set lesson_durations = array[30, 45, 60, 90], default_lesson_duration = 60 where id = '${A}'`)
  await db.exec(`update public.tutors set lesson_durations = array[30, 30], default_lesson_duration = 30 where id = '${B}'`)
  const before = (await db.query(`select * from public.tutors order by id`)).rows
  await db.exec(readMigration(NEW))
  assert.deepEqual((await db.query(`select * from public.tutors order by id`)).rows, before, 'rows are exactly as they were')
  await db.exec(`update public.tutors set name = name || ' (renamed)'`) // an update that re-checks every row: none is refused
  assert.equal((await db.query(`select count(*)::int as n from public.tutors where name like '%(renamed)'`)).rows[0]!.n === 3, true)
  // every list 018 accepts: 1 to 4 of 30, 45, 60, 90, and a default among them (or none)
  const four = [30, 45, 60, 90]
  let tried = 0
  for (let mask = 1; mask < 16; mask++) {
    const list = four.filter((_, i) => mask & (1 << i))
    for (const def of [null, ...list]) {
      await db.exec(`update public.tutors set lesson_durations = array[${list.join(', ')}], default_lesson_duration = ${def ?? 'null'} where id = '${A}'`)
      tried++
    }
  }
  assert.ok(tried >= 30, `tried ${tried} combinations`)
})

test('SECOND PERSON: a signed-in tutor saves a custom length on their own row and not on another tutor’s; signed out saves nothing', async () => {
  const db = await freshDb()
  await asUser(db, A, () => db.exec(`update public.tutors set lesson_durations = array[20, 75], default_lesson_duration = 75 where id = '${A}'`))
  assert.deepEqual(await row(db, A), { lesson_durations: [20, 75], default_lesson_duration: 75 })
  const res = await asUser(db, A, () => db.query(`update public.tutors set lesson_durations = array[75] where id = '${B}' returning id`))
  assert.equal(res.rows.length, 0)
  assert.deepEqual(await row(db, B), { lesson_durations: null, default_lesson_duration: null })
  await db.exec(`update public.tutors set lesson_durations = array[45], default_lesson_duration = 45 where id = '${A}'`)
  await db.exec(`set role anon`)
  try {
    assert.equal((await db.query(`update public.tutors set lesson_durations = array[75] where id = '${A}' returning id`)).rows.length, 0)
  } finally { await db.exec(`reset role`) }
  assert.deepEqual((await row(db, A)).lesson_durations, [45])
})

// ---- the code before 019 is run ----------------------------------------------------------------------------------------

test('BEFORE 019 the Settings page says plainly that the lengths cannot be saved yet; the database’s own words never reach the tutor', async () => {
  const db = await freshDb(false)
  let refusal: unknown
  try { await set(db, `lesson_durations = array[20, 75], default_lesson_duration = 75`) } catch (e) { refusal = e }
  assert.ok(refusal, 'the database refused')
  assert.equal(isLengthCheckRefusal(refusal), true)
  const attempted = { durations: [20, 75], defaultDuration: 75 }
  const said = lengthSaveErrorMessage(refusal, attempted)
  assert.equal(said, LENGTHS_NEED_UPDATE)
  assert.match(said, /cannot be saved yet/)
  assert.match(said, /migration 019/)
  assert.match(said, /Your other settings are saved/)
  assert.doesNotMatch(said, /violates|constraint|tutors_lesson/)
  assert.deepEqual(await row(db, A), { lesson_durations: null, default_lesson_duration: null }, 'the refused save left the row alone')
  // the same save of the four ordinary lengths still works on this database
  await set(db, `lesson_durations = array[30, 45, 60, 90], default_lesson_duration = 60`)
  assert.deepEqual((await row(db, A)).lesson_durations, [30, 45, 60, 90])
})

test('any other refusal keeps the database’s message, with the note that the rest is saved; a Supabase-shaped error is read too', () => {
  const custom = { durations: [75], defaultDuration: 75 }
  assert.equal(lengthSaveErrorMessage({ code: '23514', message: 'new row for relation "tutors" violates check constraint "tutors_default_lesson_duration_valid"' }, custom), LENGTHS_NEED_UPDATE)
  assert.equal(lengthSaveErrorMessage({ code: '23514', message: 'violates check constraint "tutors_lesson_durations_valid"' }, custom), LENGTHS_NEED_UPDATE)
  assert.equal(lengthSaveErrorMessage({ message: 'network down' }, custom), 'Your other settings are saved, but your lesson lengths were not: network down')
  assert.equal(lengthSaveErrorMessage({ code: '23514', message: 'violates check constraint "some_other_check"' }, custom), 'Your other settings are saved, but your lesson lengths were not: violates check constraint "some_other_check"')
  // four ordinary lengths and a refusal: not the 019 sentence (019 would not help)
  assert.match(lengthSaveErrorMessage({ code: '23514', message: 'violates check constraint "tutors_lesson_durations_valid"' }, { durations: [30, 60], defaultDuration: 60 }), /^Your other settings are saved, but your lesson lengths were not:/)
  assert.equal(lengthSaveErrorMessage(null, custom), 'Your other settings are saved, but your lesson lengths were not: unknown error')
  assert.equal(isLengthCheckRefusal(null), false)
})

test('Settings uses that sentence, keeps the save bar, and the booking pages never need the new rule to open', async () => {
  const { readFileSync } = await import('node:fs')
  const settings = readFileSync(new URL('../src/app/(dashboard)/settings/page.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  assert.match(settings, /toast\.error\(lengthSaveErrorMessage\(lengthError, \{ durations: lesson_durations, defaultDuration: default_lesson_duration \}\)\)/)
  const afterError = settings.slice(settings.indexOf('if (lengthError) {'))
  assert.ok(afterError.indexOf('setSavedSnapshot(') < afterError.indexOf('setSaving(false)') && afterError.indexOf('return') < afterError.indexOf('setSavedSnapshot(JSON.stringify(form))'), 'the bar stays: the snapshot keeps the old lengths and the save stops there')
  // the pages read the two columns apart from the rest and treat a failed read as "chose nothing" (tests/lesson-durations.test.ts)
  assert.match(readFileSync(new URL('../src/lib/lesson-durations.ts', import.meta.url), 'utf8'), /if \(error \|\| !data\) return \{ lesson_durations: null, default_lesson_duration: null \}/)
})
