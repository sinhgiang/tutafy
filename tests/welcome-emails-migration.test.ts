// 023_welcome_emails.sql is written but NOT applied to the real database (T-0737). It is run here on a throwaway in-memory Postgres (PGlite) on
// top of the migrations before it, to show that it applies cleanly and can be re-run, adds exactly two tables and touches nothing else,
// keeps only what the series needs, shuts the browser out of both tables (the second-person test: a signed-in tutor reads and writes nothing,
// their own rows included), lets only one run claim a step for a tutor, and refuses what the series refuses.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb, readMigration, migrationFiles } from './support/local-db.ts'

const FILE = '023_welcome_emails.sql'
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

async function freshDb(applyIt = true): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, FILE)
  await db.exec(`
    insert into auth.users (id, email) values ('${A}', 'a@school.example'), ('${B}', 'b@school.example');
    insert into public.tutors (id, email, name, slug) values
      ('${A}', 'a@school.example', 'Tutor A', 'tutor-a'), ('${B}', 'b@school.example', 'Tutor B', 'tutor-b');
  `)
  if (applyIt) await db.exec(readMigration(FILE))
  return db
}
async function as<T>(db: PGlite, role: 'authenticated' | 'anon' | 'service_role', userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId ?? ''}', false); set role ${role}`)
  try { return await fn() } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`) }
}
const code = (c: string) => (e: unknown) => (e as { code?: string }).code === c
const claim = (tutor = A, step = 'welcome') => `insert into public.welcome_email_sends (tutor_id, step) values ('${tutor}', '${step}')`
const optout = (email = 'a@school.example') => `insert into public.email_optouts (email) values ('${email}')`
const count = async (db: PGlite, table: string) => Number((await db.query<{ n: string }>(`select count(*) as n from public.${table}`)).rows[0].n)

test('the migration file exists once, as number 023, and none of the earlier files was changed to make room for it', () => {
  assert.deepEqual(migrationFiles().filter(f => f.startsWith('023_')), [FILE])
})

test('it applies on top of the earlier files, and twice in a row (idempotent), keeping the rows already there', async () => {
  const db = await freshDb(false)
  await db.exec(readMigration(FILE))
  await db.exec(claim()); await db.exec(optout())
  await db.exec(readMigration(FILE))
  await db.exec(readMigration(FILE))
  assert.equal(await count(db, 'welcome_email_sends'), 1, 'a re-run neither drops nor duplicates the table')
  assert.equal(await count(db, 'email_optouts'), 1)
})

test('it adds exactly two tables, welcome_email_sends and email_optouts, and changes no other table', async () => {
  const db = await freshDb(false)
  const all = `select table_name, column_name from information_schema.columns where table_schema = 'public' order by 1, 2`
  const before = (await db.query<{ table_name: string; column_name: string }>(all)).rows
  const tutorsBefore = (await db.query(`select * from public.tutors order by id`)).rows
  await db.exec(readMigration(FILE))
  const after = (await db.query<{ table_name: string; column_name: string }>(all)).rows
  const added = after.filter(a => !before.some(b => b.table_name === a.table_name && b.column_name === a.column_name))
  assert.deepEqual([...new Set(added.map(a => a.table_name))].sort(), ['email_optouts', 'welcome_email_sends'])
  assert.equal(after.length, before.length + added.length, 'no column was removed')
  assert.deepEqual((await db.query(`select * from public.tutors order by id`)).rows, tutorsBefore)
})

test('it keeps only what the series needs: who got which step and when; an address and when it unsubscribed', async () => {
  const db = await freshDb()
  const cols = async (t: string) => (await db.query<{ column_name: string }>(`select column_name from information_schema.columns where table_name = '${t}' order by 1`)).rows.map(c => c.column_name)
  assert.deepEqual(await cols('welcome_email_sends'), ['sent_at', 'step', 'tutor_id'])
  assert.deepEqual(await cols('email_optouts'), ['created_at', 'email'])
})

test('the second-person test: a signed-in tutor, even the one a row is about, and the anonymous key can neither read nor write either table; the server (service role) can', async () => {
  const db = await freshDb()
  await as(db, 'service_role', null, async () => { await db.exec(claim()); await db.exec(optout()) })
  for (const [role, id] of [['authenticated', A], ['authenticated', B], ['anon', null]] as const) {
    for (const [table, insert] of [['welcome_email_sends', claim()], ['email_optouts', optout('x@school.example')]] as const) {
      const who = `${role} ${id ?? ''} on ${table}`
      await assert.rejects(as(db, role, id, () => db.query(`select * from public.${table}`)), code('42501'), `${who} cannot read`)
      await assert.rejects(as(db, role, id, () => db.exec(insert)), code('42501'), `${who} cannot insert`)
      const timeColumn = table === 'welcome_email_sends' ? 'sent_at' : 'created_at'
      await assert.rejects(as(db, role, id, () => db.exec(`update public.${table} set ${timeColumn} = now()`)), code('42501'), `${who} cannot update`)
      await assert.rejects(as(db, role, id, () => db.exec(`delete from public.${table}`)), code('42501'), `${who} cannot delete`)
    }
  }
  assert.deepEqual((await as(db, 'service_role', null, () => db.query('select tutor_id, step from public.welcome_email_sends'))).rows, [{ tutor_id: A, step: 'welcome' }], 'the row is intact and the server reads it')
  assert.deepEqual((await as(db, 'service_role', null, () => db.query('select email from public.email_optouts'))).rows, [{ email: 'a@school.example' }])
  // with the table rights given back, row level security with no policy still shows the signed-in tutor nothing
  await db.exec('grant select, insert, update, delete on public.welcome_email_sends, public.email_optouts to authenticated')
  assert.equal((await as(db, 'authenticated', A, () => db.query('select * from public.welcome_email_sends'))).rows.length, 0)
  assert.equal((await as(db, 'authenticated', A, () => db.query('select * from public.email_optouts'))).rows.length, 0)
  await assert.rejects(as(db, 'authenticated', A, () => db.exec(claim())), code('42501'))
  await assert.rejects(as(db, 'authenticated', A, () => db.exec(optout('y@school.example'))), code('42501'))
})

test('row level security is on for both tables, with no policy at all', async () => {
  const db = await freshDb()
  for (const table of ['welcome_email_sends', 'email_optouts']) {
    const rls = await db.query<{ relrowsecurity: boolean }>(`select relrowsecurity from pg_class where oid = 'public.${table}'::regclass`)
    assert.equal(rls.rows[0].relrowsecurity, true, table)
    assert.deepEqual((await db.query(`select policyname from pg_policies where tablename = '${table}'`)).rows, [], table)
  }
})

test('one claim per tutor and step: a second run that tries the same step is refused (23505), a different step or tutor is not', async () => {
  const db = await freshDb()
  const ok = (sql: string) => as(db, 'service_role', null, () => db.exec(sql))
  await ok(claim(A, 'nudge'))
  await assert.rejects(ok(claim(A, 'nudge')), code('23505'), 'the same step twice')
  await Promise.all([ok(claim(B, 'nudge')), ok(claim(A, 'checkin'))])
  assert.equal(await count(db, 'welcome_email_sends'), 3)
  // two runs at the same moment for the same step: exactly one wins
  const race = await Promise.allSettled([ok(claim(B, 'checkin')), ok(claim(B, 'checkin')), ok(claim(B, 'checkin'))])
  assert.equal(race.filter(r => r.status === 'fulfilled').length, 1)
  // a released claim (the mail service refused) can be claimed again
  await ok(`delete from public.welcome_email_sends where tutor_id = '${A}' and step = 'nudge'`)
  await ok(claim(A, 'nudge'))
})

test('it refuses what the series refuses: an unknown step, an account that does not exist, an upper-case, empty or over-long address', async () => {
  const db = await freshDb()
  const ok = (sql: string) => as(db, 'service_role', null, () => db.exec(sql))
  await assert.rejects(ok(claim(A, 'day3')), code('23514'), 'a step that is not welcome, nudge or checkin')
  await assert.rejects(ok(claim('33333333-3333-4333-8333-333333333333', 'welcome')), code('23503'), 'a tutor that does not exist')
  await assert.rejects(ok(optout('Maria@School.example')), code('23514'), 'an upper-case address')
  await assert.rejects(ok(optout('')), code('23514'), 'an empty address')
  await assert.rejects(ok(optout(`${'a'.repeat(250)}@b.example`)), code('23514'), 'an address over 254 characters')
  await assert.rejects(ok(optout()).then(() => ok(optout())), code('23505'), 'the same address twice is one row')
  assert.equal(await count(db, 'welcome_email_sends'), 0)
  assert.equal(await count(db, 'email_optouts'), 1)
})

test('deleting a tutor takes their claims with them, and an opt-out outlives the account (it is kept by address)', async () => {
  const db = await freshDb()
  await db.exec(claim(A, 'welcome')); await db.exec(claim(A, 'nudge')); await db.exec(claim(B, 'welcome')); await db.exec(optout())
  await db.exec(`delete from public.tutors where id = '${A}'`)
  assert.deepEqual((await db.query(`select tutor_id from public.welcome_email_sends`)).rows, [{ tutor_id: B }])
  assert.equal(await count(db, 'email_optouts'), 1, 'the unsubscribe holds even if the account is deleted and made again')
})
