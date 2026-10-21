// 021_hide_branding.sql is written but NOT applied to the real database (T-0717). It is run here on a throwaway in-memory Postgres (PGlite)
// on top of the migrations before it, to show that it applies cleanly and can be re-run, adds one column and changes nothing else, leaves
// every tutor at "keep the line" (false), and that a tutor can write the column on their own row and on nobody else's (the second-person test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb, readMigration, migrationFiles } from './support/local-db.ts'

const FILE = '021_hide_branding.sql'
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

async function freshDb(applyIt = true): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, FILE)
  await db.exec(`
    insert into auth.users (id, email) values ('${A}', 'a@example.com'), ('${B}', 'b@example.com');
    insert into public.tutors (id, email, name, slug, subscription_status) values
      ('${A}', 'a@example.com', 'Tutor A', 'tutor-a', 'pro'), ('${B}', 'b@example.com', 'Tutor B', 'tutor-b', 'free');
  `)
  if (applyIt) await db.exec(readMigration(FILE))
  return db
}
async function asUser<T>(db: PGlite, userId: string | null, role: 'authenticated' | 'anon', fn: () => Promise<T>): Promise<T> {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId ?? ''}', false); set role ${role}`)
  try { return await fn() } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`) }
}
const flag = async (db: PGlite, id: string) => (await db.query<{ hide_branding: boolean }>(`select hide_branding from public.tutors where id = '${id}'`)).rows[0].hide_branding

test('the migration file exists once, as number 021', () => {
  assert.deepEqual(migrationFiles().filter(f => f.startsWith('021_')), [FILE])
})

test('it applies on top of the earlier files, and twice in a row (idempotent), keeping what a tutor already chose', async () => {
  const db = await freshDb(false)
  await db.exec(readMigration(FILE))
  await db.exec(`update public.tutors set hide_branding = true where id = '${A}'`)
  await db.exec(readMigration(FILE))
  await db.exec(readMigration(FILE))
  assert.equal(await flag(db, A), true, 'a re-run does not reset the choice')
  const cols = await db.query(`select column_name, data_type, is_nullable, column_default from information_schema.columns where table_name = 'tutors' and column_name = 'hide_branding'`)
  assert.deepEqual(cols.rows, [{ column_name: 'hide_branding', data_type: 'boolean', is_nullable: 'NO', column_default: 'false' }])
})

test('it adds exactly one column to tutors and changes nothing else; every tutor stays at false (the line stays)', async () => {
  const db = await freshDb(false)
  const all = `select table_name, column_name from information_schema.columns where table_schema = 'public' order by 1, 2`
  const before = (await db.query<{ table_name: string; column_name: string }>(all)).rows
  const tutorsBefore = (await db.query(`select * from public.tutors order by id`)).rows
  await db.exec(readMigration(FILE))
  const after = (await db.query<{ table_name: string; column_name: string }>(all)).rows
  const added = after.filter(a => !before.some(b => b.table_name === a.table_name && b.column_name === a.column_name))
  assert.deepEqual(added, [{ table_name: 'tutors', column_name: 'hide_branding' }])
  assert.equal(after.length, before.length + 1)
  const tutorsAfter = (await db.query<Record<string, unknown>>(`select * from public.tutors order by id`)).rows
  for (const [i, t] of tutorsAfter.entries()) {
    const { hide_branding, ...rest } = t
    assert.equal(hide_branding, false)
    assert.deepEqual(rest, tutorsBefore[i])
  }
})

test('it adds no policy and no trigger: the policies that already limit a tutor to their own row are what limit this column too', async () => {
  const db = await freshDb(false)
  const snapshot = async () => ({
    policies: (await db.query(`select policyname, cmd from pg_policies where tablename = 'tutors' order by 1`)).rows,
    triggers: (await db.query(`select tgname from pg_trigger where tgrelid = 'public.tutors'::regclass and not tgisinternal order by 1`)).rows,
  })
  const before = await snapshot()
  await db.exec(readMigration(FILE))
  assert.deepEqual(await snapshot(), before)
})

test('the second-person test: a tutor writes the column on their own row, never on another tutor\'s; a signed-out caller writes nothing', async () => {
  const db = await freshDb()
  await asUser(db, A, 'authenticated', () => db.exec(`update public.tutors set hide_branding = true where id = '${A}'`))
  assert.equal(await flag(db, A), true, 'A switched their own line off')
  // B's row, written as A: the policy hides it, so no row changes (no error, nothing happens)
  await asUser(db, A, 'authenticated', () => db.exec(`update public.tutors set hide_branding = true where id = '${B}'`))
  assert.equal(await flag(db, B), false, 'A could not touch B\'s row')
  await asUser(db, B, 'authenticated', () => db.exec(`update public.tutors set hide_branding = true where id = '${A}'`))
  assert.equal(await flag(db, A), true, 'and B cannot switch it back or forth for A either')
  await asUser(db, B, 'authenticated', () => db.exec(`update public.tutors set hide_branding = false where id = '${A}'`))
  assert.equal(await flag(db, A), true, 'B\'s write on A\'s row changed nothing')
  // signed out: the policy gives the anonymous role no row to change, so nothing is written
  await asUser(db, null, 'anon', () => db.exec(`update public.tutors set hide_branding = true where id = '${B}'`))
  assert.equal(await flag(db, B), false, 'a signed-out caller changed nothing')
})

test('the column is NOT locked like the plan columns: a Free tutor can write it (the pages decide by the plan, not by the column), but the plan column stays locked', async () => {
  const db = await freshDb()
  await asUser(db, B, 'authenticated', () => db.exec(`update public.tutors set hide_branding = true where id = '${B}'`))
  assert.equal(await flag(db, B), true, 'written by a Free tutor: allowed, and harmless because src/lib/branding.ts reads the plan first')
  await assert.rejects(asUser(db, B, 'authenticated', () => db.exec(`update public.tutors set subscription_status = 'academy' where id = '${B}'`)), (e: unknown) => (e as { code?: string }).code === '42501', 'the plan itself is still locked by 016')
})
