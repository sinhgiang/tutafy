// 020_feedback.sql is written but NOT applied to the real database (T-0723). It is run here on a throwaway in-memory Postgres (PGlite) on
// top of the migrations before it, to show that it applies cleanly and can be re-run, adds one table and touches nothing else, keeps only
// what the Feedback box promises to keep, shuts the browser out of the table (the second-person test: a signed-in tutor reads and writes
// nothing, their own rows included), refuses what the box refuses, and stops an author's 11th feedback within an hour.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb, readMigration, migrationFiles } from './support/local-db.ts'

const FILE = '020_feedback.sql'
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

async function freshDb(applyIt = true): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, FILE)
  await db.exec(`
    insert into auth.users (id, email) values ('${A}', 'a@example.com'), ('${B}', 'b@example.com');
    insert into public.tutors (id, email, name, slug) values
      ('${A}', 'a@example.com', 'Tutor A', 'tutor-a'), ('${B}', 'b@example.com', 'Tutor B', 'tutor-b');
  `)
  if (applyIt) await db.exec(readMigration(FILE))
  return db
}
async function as<T>(db: PGlite, role: 'authenticated' | 'anon' | 'service_role', userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId ?? ''}', false); set role ${role}`)
  try { return await fn() } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`) }
}
const code = (c: string) => (e: unknown) => (e as { code?: string }).code === c
const insertTutor = (email = 'a@example.com', kind = 'bug', message = 'It crashed') =>
  `insert into public.feedback (author_role, tutor_id, author_email, kind, message) values ('tutor', '${A}', '${email}', '${kind}', '${message}')`
const insertStudent = (email = 's@example.com', kind = 'idea', message = 'Please add dark mode') =>
  `insert into public.feedback (author_role, author_email, kind, message) values ('student', '${email}', '${kind}', '${message}')`
const count = async (db: PGlite) => Number((await db.query<{ n: string }>('select count(*) as n from public.feedback')).rows[0].n)

test('the migration file exists once, as number 020, and none of the earlier files was changed to make room for it', () => {
  assert.deepEqual(migrationFiles().filter(f => f.startsWith('020_')), [FILE])
})

test('it applies on top of the earlier files, and twice in a row (idempotent), keeping the rows already there', async () => {
  const db = await freshDb(false)
  await db.exec(readMigration(FILE))
  await db.exec(insertTutor())
  await db.exec(readMigration(FILE))
  await db.exec(readMigration(FILE))
  assert.equal(await count(db), 1, 'a re-run neither drops nor duplicates the table')
  const triggers = await db.query(`select tgname from pg_trigger where tgrelid = 'public.feedback'::regclass and not tgisinternal`)
  assert.equal(triggers.rows.length, 1, 'one trigger, not one per run')
})

test('it adds exactly one table, public.feedback, and changes no other table', async () => {
  const db = await freshDb(false)
  const all = `select table_name, column_name from information_schema.columns where table_schema = 'public' order by 1, 2`
  const before = (await db.query<{ table_name: string; column_name: string }>(all)).rows
  const tutorsBefore = (await db.query(`select * from public.tutors order by id`)).rows
  await db.exec(readMigration(FILE))
  const after = (await db.query<{ table_name: string; column_name: string }>(all)).rows
  const added = after.filter(a => !before.some(b => b.table_name === a.table_name && b.column_name === a.column_name))
  assert.ok(added.every(a => a.table_name === 'feedback'), 'every new column belongs to feedback')
  assert.equal(after.length, before.length + added.length, 'no column was removed')
  assert.deepEqual((await db.query(`select * from public.tutors order by id`)).rows, tutorsBefore)
})

test('it keeps only what the Feedback box promises: time, role, the sender\'s account, kind and text; no address, browser or page', async () => {
  const db = await freshDb()
  const cols = await db.query<{ column_name: string }>(`select column_name from information_schema.columns where table_name = 'feedback' order by 1`)
  assert.deepEqual(cols.rows.map(c => c.column_name), ['author_email', 'author_role', 'created_at', 'id', 'kind', 'message', 'tutor_id'])
})

test('the second-person test: a signed-in tutor, even the author, and the anonymous key can neither read nor write the table; the server (service role) can', async () => {
  const db = await freshDb()
  await as(db, 'service_role', null, () => db.exec(insertTutor()))
  for (const [role, id] of [['authenticated', A], ['authenticated', B], ['anon', null]] as const) {
    await assert.rejects(as(db, role, id, () => db.query('select * from public.feedback')), code('42501'), `${role} ${id ?? ''} cannot read`)
    await assert.rejects(as(db, role, id, () => db.exec(insertTutor())), code('42501'), `${role} ${id ?? ''} cannot insert`)
    await assert.rejects(as(db, role, id, () => db.exec(`update public.feedback set message = 'changed'`)), code('42501'), `${role} cannot update`)
    await assert.rejects(as(db, role, id, () => db.exec(`delete from public.feedback`)), code('42501'), `${role} cannot delete`)
  }
  const rows = await as(db, 'service_role', null, () => db.query('select message from public.feedback'))
  assert.deepEqual(rows.rows, [{ message: 'It crashed' }], 'the row is intact and the server reads it')
  // with the table rights given back, row level security with no policy still shows the signed-in tutor nothing
  await db.exec('grant select, insert, update, delete on public.feedback to authenticated')
  assert.equal((await as(db, 'authenticated', A, () => db.query('select * from public.feedback'))).rows.length, 0)
  await assert.rejects(as(db, 'authenticated', A, () => db.exec(insertTutor())), code('42501'))
})

test('row level security is on, with no policy at all', async () => {
  const db = await freshDb()
  const rls = await db.query<{ relrowsecurity: boolean }>(`select relrowsecurity from pg_class where oid = 'public.feedback'::regclass`)
  assert.equal(rls.rows[0].relrowsecurity, true)
  const policies = await db.query(`select policyname from pg_policies where tablename = 'feedback'`)
  assert.deepEqual(policies.rows, [])
})

test('it refuses what the box refuses: an unknown kind, an empty or over-long text, an upper-case address, a role that does not fit the account', async () => {
  const db = await freshDb()
  const ok = (sql: string) => as(db, 'service_role', null, () => db.exec(sql))
  const bad = (sql: string, why: string) => assert.rejects(ok(sql), code('23514'), why)
  await ok(insertTutor('a@example.com', 'bug', 'x'.repeat(2000)))
  await ok(insertStudent('s@example.com', 'question', 'Where is my homework?'))
  await ok(insertTutor('a@example.com', 'idea', 'Line one\nLine two'))
  await bad(insertTutor('a@example.com', 'complaint'), 'a kind that is not bug, idea or question')
  await bad(insertTutor('a@example.com', 'bug', ''), 'an empty text')
  await bad(insertTutor('a@example.com', 'bug', '   \n  '), 'a text of spaces')
  await bad(insertTutor('a@example.com', 'bug', 'x'.repeat(2001)), 'a text over 2000 characters')
  await bad(insertTutor('A@Example.com'), 'an upper-case address')
  await bad(insertTutor('a'), 'an address that is too short')
  await bad(`insert into public.feedback (author_role, author_email, kind, message) values ('tutor', 'a@example.com', 'bug', 'no account')`, 'a tutor with no account id')
  await bad(`insert into public.feedback (author_role, tutor_id, author_email, kind, message) values ('student', '${A}', 'a@example.com', 'bug', 'a student with an account id')`, 'a student that carries an account id')
  await bad(`insert into public.feedback (author_role, author_email, kind, message) values ('admin', 'a@example.com', 'bug', 'x')`, 'a role that is neither tutor nor student')
  await assert.rejects(ok(`insert into public.feedback (author_role, tutor_id, author_email, kind, message) values ('tutor', '33333333-3333-4333-8333-333333333333', 'a@example.com', 'bug', 'x')`), code('23503'), 'an account id that does not exist')
  assert.equal(await count(db), 3)
})

test('an author\'s 11th feedback within an hour is refused (TF429), other authors are not slowed, and old ones stop counting', async () => {
  const db = await freshDb()
  const ok = (sql: string) => as(db, 'service_role', null, () => db.exec(sql))
  for (let i = 0; i < 10; i++) await ok(insertTutor('a@example.com', 'bug', `report ${i}`))
  await assert.rejects(ok(insertTutor('a@example.com', 'bug', 'the eleventh')), (e: unknown) => code('TF429')(e) && /feedback_rate_limited/.test((e as Error).message))
  assert.equal(await count(db), 10, 'the refused one was not kept')
  await ok(insertStudent('s@example.com'))                    // a different author
  await ok(insertTutor('b@example.com', 'idea', 'someone else').replace(`'${A}'`, `'${B}'`))
  // ten rows from two hours ago do not count against a new one
  await db.exec(`update public.feedback set created_at = now() - interval '2 hours' where author_email = 'a@example.com'`)
  await ok(insertTutor('a@example.com', 'bug', 'fresh start'))
  assert.equal(await count(db), 13)
})

test('deleting a tutor removes their feedback with them; a student\'s feedback stays', async () => {
  const db = await freshDb()
  const ok = (sql: string) => as(db, 'service_role', null, () => db.exec(sql))
  await ok(insertTutor())
  await ok(insertStudent())
  await db.exec(`delete from public.tutors where id = '${A}'`)
  assert.deepEqual((await db.query(`select author_role from public.feedback`)).rows, [{ author_role: 'student' }])
})
