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

test('only 30, 45, 60 and 90 are accepted, at least one, and the default must be one of the chosen', async () => {
  const db = await freshDb()
  const set = (set: string) => db.exec(`update public.tutors set ${set} where id = '${A}'`)
  await set(`lesson_durations = array[30, 90], default_lesson_duration = 90`)
  assert.deepEqual(await row(db, A), { lesson_durations: [30, 90], default_lesson_duration: 90 })
  await set(`lesson_durations = array[30, 45, 60, 90], default_lesson_duration = null`)
  await set(`lesson_durations = null, default_lesson_duration = 60`)
  for (const bad of [
    `lesson_durations = array[20], default_lesson_duration = null`, `lesson_durations = array[30, 120], default_lesson_duration = null`,
    `lesson_durations = '{}', default_lesson_duration = null`, `lesson_durations = array[30, null]::int[], default_lesson_duration = null`,
    `lesson_durations = array[30, 45, 60, 90, 30], default_lesson_duration = null`, `lesson_durations = array[30, 60], default_lesson_duration = 90`,
    `lesson_durations = array[30, 60], default_lesson_duration = 45`, `default_lesson_duration = 20`, `default_lesson_duration = 0`,
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
