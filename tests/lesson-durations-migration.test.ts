// 018_lesson_durations.sql is written but NOT applied to the real database (T-0675). It is run here on a
// throwaway in-memory Postgres (PGlite) on top of the migrations before it, to show that it applies cleanly and
// can be re-run, changes nothing for an existing tutor, refuses values the booking page cannot show, and that a
// tutor can write the two columns of their own row and of nobody else's (the second-person test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb, readMigration, migrationFiles } from './support/local-db.ts'

const FILE = '018_lesson_durations.sql'
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

async function freshDb(applyIt = true): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, FILE)
  await db.exec(`
    insert into auth.users (id, email) values ('${A}', 'a@example.com'), ('${B}', 'b@example.com');
    insert into public.tutors (id, email, name, slug, booking_url_active) values
      ('${A}', 'a@example.com', 'Tutor A', 'tutor-a', true), ('${B}', 'b@example.com', 'Tutor B', 'tutor-b', true);
  `)
  if (applyIt) await db.exec(readMigration(FILE))
  return db
}
async function asUser<T>(db: PGlite, userId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId}', false); set role authenticated`)
  try { return await fn() } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`) }
}
const row = async (db: PGlite, id: string) =>
  (await db.query<{ lesson_durations: number[] | null; default_lesson_duration: number | null }>(
    `select lesson_durations, default_lesson_duration from public.tutors where id = '${id}'`)).rows[0]

test('the migration file exists once, as number 018', () => {
  assert.deepEqual(migrationFiles().filter(f => f.startsWith('018_')), [FILE])
})

test('it applies on top of the earlier files, and twice in a row (idempotent)', async () => {
  const db = await freshDb(false)
  await db.exec(readMigration(FILE))
  await db.exec(readMigration(FILE))
  const cols = await db.query<{ column_name: string }>(`select column_name from information_schema.columns where table_name = 'tutors' and column_name in ('lesson_durations', 'default_lesson_duration') order by 1`)
  assert.deepEqual(cols.rows.map(c => c.column_name), ['default_lesson_duration', 'lesson_durations'])
})

test('it adds exactly two columns to tutors and changes nothing else; every existing tutor stays "chose nothing" (null)', async () => {
  const db = await freshDb(false)
  const all = `select table_name, column_name from information_schema.columns where table_schema = 'public' order by 1, 2`
  const before = (await db.query<{ table_name: string; column_name: string }>(all)).rows
  const tutorsBefore = (await db.query(`select * from public.tutors order by id`)).rows
  await db.exec(readMigration(FILE))
  const after = (await db.query<{ table_name: string; column_name: string }>(all)).rows
  const added = after.filter(a => !before.some(b => b.table_name === a.table_name && b.column_name === a.column_name))
  assert.deepEqual(added, [{ table_name: 'tutors', column_name: 'default_lesson_duration' }, { table_name: 'tutors', column_name: 'lesson_durations' }])
  assert.equal(after.length, before.length + 2)
  const tutorsAfter = (await db.query<Record<string, unknown>>(`select * from public.tutors order by id`)).rows
  for (const [i, t] of tutorsAfter.entries()) {
    const { lesson_durations, default_lesson_duration, ...rest } = t
    assert.equal(lesson_durations, null)
    assert.equal(default_lesson_duration, null)
    assert.deepEqual(rest, tutorsBefore[i])
  }
})

test('it adds no policy and no trigger: the existing row policies are what limit the two columns', async () => {
  const db = await freshDb(false)
  const snapshot = async () => ({
    policies: (await db.query(`select policyname, cmd from pg_policies where tablename = 'tutors' order by 1`)).rows,
    triggers: (await db.query(`select tgname from pg_trigger where tgrelid = 'public.tutors'::regclass and not tgisinternal order by 1`)).rows,
  })
  const before = await snapshot()
  await db.exec(readMigration(FILE))
  assert.deepEqual(await snapshot(), before)
})

test('lengths 10 to 240 in steps of 5 are accepted (custom ones too), at least one, no repeat, and the default must be one of the chosen', async () => {
  const db = await freshDb()
  const set = (set: string) => db.exec(`update public.tutors set ${set} where id = '${A}'`)
  await set(`lesson_durations = array[30, 90], default_lesson_duration = 90`)
  assert.deepEqual(await row(db, A), { lesson_durations: [30, 90], default_lesson_duration: 90 })
  await set(`lesson_durations = array[30, 45, 60, 90], default_lesson_duration = null`)
  await set(`lesson_durations = null, default_lesson_duration = 60`)
  for (const bad of [
    `lesson_durations = array[7], default_lesson_duration = null`, `lesson_durations = array[30, 250], default_lesson_duration = null`,
    `lesson_durations = '{}', default_lesson_duration = null`, `lesson_durations = array[30, null]::int[], default_lesson_duration = null`,
    `lesson_durations = array[30, 45, 60, 90, 30], default_lesson_duration = null`, `lesson_durations = array[30, 60], default_lesson_duration = 90`,
    `lesson_durations = array[30, 60], default_lesson_duration = 45`, `default_lesson_duration = 12`, `default_lesson_duration = 0`,
  ]) {
    await assert.rejects(set(bad), /violates check constraint/, bad)
  }
  assert.deepEqual(await row(db, A), { lesson_durations: null, default_lesson_duration: 60 }, 'the refused updates left the row alone')
})

test('SECOND PERSON: a signed-in tutor changes their own two columns, and not another tutor’s', async () => {
  const db = await freshDb()
  // A on A: allowed (and the paid-columns trigger of 016 does not stand in the way)
  await asUser(db, A, () => db.exec(`update public.tutors set lesson_durations = array[30, 60], default_lesson_duration = 30 where id = '${A}'`))
  assert.deepEqual(await row(db, A), { lesson_durations: [30, 60], default_lesson_duration: 30 })
  // A on B: the policy hides B's row from the update, so nothing changes (0 rows)
  const res = await asUser(db, A, () => db.query(`update public.tutors set lesson_durations = array[90], default_lesson_duration = 90 where id = '${B}' returning id`))
  assert.equal(res.rows.length, 0)
  assert.deepEqual(await row(db, B), { lesson_durations: null, default_lesson_duration: null })
  // A cannot move B's row onto themselves either
  await assert.rejects(asUser(db, A, () => db.exec(`update public.tutors set id = '${B}' where id = '${A}'`)))
})

test('SIGNED OUT: anon cannot change the columns of anyone, and can read them only on a tutor whose booking page is on', async () => {
  const db = await freshDb()
  await db.exec(`update public.tutors set lesson_durations = array[45], default_lesson_duration = 45 where id = '${A}'`)
  await db.exec(`update public.tutors set booking_url_active = false, lesson_durations = array[90] where id = '${B}'`)
  await db.exec(`set role anon`)
  try {
    const upd = await db.query(`update public.tutors set lesson_durations = array[30] where id = '${A}' returning id`)
    assert.equal(upd.rows.length, 0, 'anon updates nothing')
    const visible = await db.query<{ id: string; lesson_durations: number[] }>(`select id, lesson_durations from public.tutors order by id`)
    assert.deepEqual(visible.rows, [{ id: A, lesson_durations: [45] }], 'the page that is off shows nothing, even to the one who asks for it')
  } finally {
    await db.exec(`reset role`)
  }
  assert.deepEqual((await row(db, A)).lesson_durations, [45])
})

test('custom lengths (T-0700): 20, 75 and 120 are taken, up to six, and the default can be a custom one', async () => {
  const db = await freshDb()
  const set = (set: string) => db.exec(`update public.tutors set ${set} where id = '${A}'`)
  await set(`lesson_durations = array[20, 75, 120], default_lesson_duration = 75`)
  assert.deepEqual(await row(db, A), { lesson_durations: [20, 75, 120], default_lesson_duration: 75 })
  await set(`lesson_durations = array[10, 20, 75, 120, 200, 240], default_lesson_duration = 10`)
  assert.deepEqual((await row(db, A)).lesson_durations, [10, 20, 75, 120, 200, 240], 'six lengths, both ends of the range')
  await set(`lesson_durations = array[75], default_lesson_duration = 75`)
  assert.deepEqual(await row(db, A), { lesson_durations: [75], default_lesson_duration: 75 }, 'one custom length alone')
  await set(`lesson_durations = array[30, 75], default_lesson_duration = 75`)
  await set(`lesson_durations = array[30, 75], default_lesson_duration = 30`)
})

test('custom lengths (T-0700): the database refuses a length out of range, not a multiple of 5, a repeat, none, a seventh, a null, and a default that is none of them', async () => {
  const db = await freshDb()
  await db.exec(`update public.tutors set lesson_durations = array[30, 75], default_lesson_duration = 75 where id = '${A}'`)
  const refused = [
    ['out of range, short', `lesson_durations = array[5]`], ['out of range, short, next to a good one', `lesson_durations = array[30, 9]`],
    ['out of range, long', `lesson_durations = array[245]`], ['far too long', `lesson_durations = array[250]`], ['a day', `lesson_durations = array[1440]`],
    ['zero', `lesson_durations = array[0]`], ['negative', `lesson_durations = array[-30]`],
    ['not a multiple of 5', `lesson_durations = array[12]`], ['not a multiple of 5, with others', `lesson_durations = array[30, 77]`],
    ['the same twice', `lesson_durations = array[75, 75]`], ['the same twice, apart', `lesson_durations = array[30, 75, 60, 75]`],
    ['seven lengths', `lesson_durations = array[10, 20, 30, 40, 50, 60, 70]`], ['none', `lesson_durations = '{}'`],
    ['a null inside', `lesson_durations = array[30, null]::int[]`],
    ['a default that is not offered', `default_lesson_duration = 60`], ['a default out of range', `lesson_durations = array[30], default_lesson_duration = 250`],
    ['a default not a multiple of 5', `lesson_durations = null, default_lesson_duration = 12`],
  ] as const
  for (const [why, set] of refused) {
    await assert.rejects(db.exec(`update public.tutors set ${set} where id = '${A}'`), /violates check constraint/, why)
  }
  assert.deepEqual(await row(db, A), { lesson_durations: [30, 75], default_lesson_duration: 75 }, 'every refused update left the row alone')
})

test('the rule is one function the migration creates, and it only looks at the array it is given', async () => {
  const db = await freshDb()
  const check = async (sql: string) => (await db.query<{ ok: boolean }>(`select ${sql} as ok`)).rows[0].ok
  assert.equal(await check(`public.lesson_durations_valid(array[20, 75, 120])`), true)
  assert.equal(await check(`public.lesson_durations_valid(null)`), true, 'null is "chose nothing"')
  assert.equal(await check(`public.lesson_durations_valid(array[75, 75])`), false)
  assert.equal(await check(`public.lesson_durations_valid(array[]::int[])`), false)
  const meta = (await db.query<{ provolatile: string; proconfig: string[] | null }>(`select provolatile, proconfig from pg_proc where proname = 'lesson_durations_valid'`)).rows
  assert.equal(meta.length, 1)
  assert.equal(meta[0].provolatile, 'i', 'immutable, as a CHECK needs')
  assert.ok(meta[0].proconfig?.some(c => c.startsWith('search_path=')), 'a fixed search path')
})

// ---- the owner re-runs 018: the first version is already on the real database (21 Oct 2026) ----------------------------------

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const AS_APPLIED = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'support', '018-as-applied.sql'), 'utf8')

/** The real database's state: every earlier file, then 018 as it was first applied (30, 45, 60, 90, at most four). */
async function dbWithFirstVersion(): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, FILE)
  await db.exec(`
    insert into auth.users (id, email) values ('${A}', 'a@example.com'), ('${B}', 'b@example.com');
    insert into public.tutors (id, email, name, slug, booking_url_active) values
      ('${A}', 'a@example.com', 'Tutor A', 'tutor-a', true), ('${B}', 'b@example.com', 'Tutor B', 'tutor-b', true);
  `)
  await db.exec(AS_APPLIED)
  return db
}

test('the first version, as applied, refuses a length of the tutor’s own; the file in the repository, run again on top of it, accepts it', async () => {
  const db = await dbWithFirstVersion()
  await assert.rejects(db.exec(`update public.tutors set lesson_durations = array[75], default_lesson_duration = null where id = '${A}'`), /violates check constraint "tutors_lesson_durations_valid"/)
  await db.exec(readMigration(FILE)) // the owner runs 018 again
  await db.exec(`update public.tutors set lesson_durations = array[20, 75, 120], default_lesson_duration = 75 where id = '${A}'`)
  assert.deepEqual(await row(db, A), { lesson_durations: [20, 75, 120], default_lesson_duration: 75 })
  for (const bad of [`lesson_durations = array[7], default_lesson_duration = null`, `lesson_durations = array[30, 250], default_lesson_duration = null`, `lesson_durations = array[12], default_lesson_duration = null`, `lesson_durations = array[10, 20, 30, 40, 50, 60, 70], default_lesson_duration = null`]) {
    await assert.rejects(db.exec(`update public.tutors set ${bad} where id = '${A}'`), /violates check constraint/, bad)
  }
})

test('running 018 again changes no data: the rows saved under the first version are exactly as they were, and still valid', async () => {
  const db = await dbWithFirstVersion()
  await db.exec(`update public.tutors set lesson_durations = array[30, 45, 60, 90], default_lesson_duration = 60 where id = '${A}'`)
  await db.exec(`update public.tutors set lesson_durations = array[45], default_lesson_duration = 45 where id = '${B}'`)
  const before = (await db.query(`select * from public.tutors order by id`)).rows
  await db.exec(readMigration(FILE))
  await db.exec(readMigration(FILE)) // and a third time: the owner may press the button twice
  assert.deepEqual((await db.query(`select * from public.tutors order by id`)).rows, before)
  await db.exec(`update public.tutors set name = name || ' (renamed)'`) // re-checks every row
  assert.equal((await db.query(`select count(*)::int as n from public.tutors where name like '%(renamed)'`)).rows[0]!.n, 2)
  const cols = await db.query<{ column_name: string }>(`select column_name from information_schema.columns where table_name = 'tutors' and column_name in ('lesson_durations', 'default_lesson_duration') order by 1`)
  assert.equal(cols.rows.length, 2, 'the two columns are there once, not added again')
})

test('every list the first version accepted (1 to 4 of 30, 45, 60, 90, each with every default) is still accepted after 018 is run again', async () => {
  const db = await dbWithFirstVersion()
  await db.exec(readMigration(FILE))
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

test('KNOWN LIMIT, measured: a row saved under the first version with the SAME length twice ([30, 30]) is refused by the new check when 018 is run again', async () => {
  // The first version never forbade a repeat, and the app never writes one (cleanDurations keeps each length once). If such a row
  // exists on the real database, running 018 again stops at the new check with an error and the owner is told which row to fix.
  const db = await dbWithFirstVersion()
  await db.exec(`update public.tutors set lesson_durations = array[30, 30], default_lesson_duration = 30 where id = '${A}'`)
  await assert.rejects(db.exec(readMigration(FILE)), /violates check constraint "tutors_lesson_durations_valid"|is violated by some row/)
  // the run is one batch, so it stops as a whole: the first version's checks are still in place, there is no gap without a check
  await assert.rejects(db.exec(`update public.tutors set lesson_durations = array[7], default_lesson_duration = null where id = '${B}'`), /violates check constraint/)
  await assert.rejects(db.exec(`update public.tutors set lesson_durations = array[75], default_lesson_duration = null where id = '${B}'`), /violates check constraint/, 'still the first version: 75 is refused')
  // the fix the owner is given: make the repeated list a normal one, then run again
  await db.exec(`update public.tutors set lesson_durations = array[30], default_lesson_duration = 30 where id = '${A}'`)
  await db.exec(readMigration(FILE))
  await db.exec(`update public.tutors set lesson_durations = array[75], default_lesson_duration = null where id = '${B}'`)
})
