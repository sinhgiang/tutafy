// 017_lesson_card_payments.sql is written but NOT applied to the real database (T-0618). It is run here on a
// throwaway in-memory Postgres (PGlite) together with the migrations before it, to show it applies cleanly,
// can be re-run, touches nothing that exists, is locked to the service role, and that its unique indexes
// give the guarantees the checkout route and the Connect webhook lean on.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyMigrationsBefore, newDb, readMigration, migrationFiles } from './support/local-db.ts'

const FILE = '017_lesson_card_payments.sql'
const TUTOR = '11111111-1111-1111-1111-111111111111'
const STUDENT = '33333333-3333-3333-3333-333333333333'
const LESSON = '44444444-4444-4444-4444-444444444444'

async function dbWithLesson() {
  const db = await newDb()
  await applyMigrationsBefore(db, FILE)
  await db.exec(`
    insert into auth.users (id, email) values ('${TUTOR}', 'ten@example.com');
    insert into public.tutors (id, email, name, slug, subscription_status) values ('${TUTOR}', 'ten@example.com', 'Ten', 'ten', 'pro');
    insert into public.students (id, tutor_id, name, email) values ('${STUDENT}', '${TUTOR}', 'Hoc Sinh', 'hs@example.com');
    insert into public.lessons (id, tutor_id, student_id, starts_at, ends_at, price)
      values ('${LESSON}', '${TUTOR}', '${STUDENT}', now(), now() + interval '1 hour', 40);
  `)
  return db
}
const row = (session: string, status = 'created', lesson: string | null = LESSON) =>
  `insert into public.lesson_card_payments (stripe_session_id, lesson_id, tutor_id, stripe_account_id, amount_minor, currency, status)
   values ('${session}', ${lesson ? `'${lesson}'` : 'null'}, '${TUTOR}', 'acct_one', 4000, 'eur', '${status}')`

test('the migration file exists once (017: 016 is the tutors paid-columns lock on another branch)', () => {
  const files = migrationFiles().filter(f => f.startsWith('017_'))
  assert.deepEqual(files, [FILE])
})

test('it applies on top of the earlier files, and twice in a row (idempotent)', async () => {
  const db = await dbWithLesson()
  await db.exec(readMigration(FILE))
  await db.exec(readMigration(FILE))
  const t = await db.query(`select table_name from information_schema.tables where table_schema = 'public' and table_name = 'lesson_card_payments'`)
  assert.equal(t.rows.length, 1)
})

test('it changes nothing that already existed (no existing table or column is touched)', async () => {
  const db = await dbWithLesson()
  const cols = `select table_name, column_name from information_schema.columns where table_schema = 'public' and table_name <> 'lesson_card_payments' order by 1, 2`
  const lessons = await db.query(`select * from public.lessons`)
  const before = (await db.query(cols)).rows
  await db.exec(readMigration(FILE))
  assert.deepEqual((await db.query(cols)).rows, before)
  assert.deepEqual((await db.query(`select * from public.lessons`)).rows, lessons.rows)
})

test('RLS is on, there is no policy, and anon and authenticated have no grant', async () => {
  const db = await dbWithLesson()
  await db.exec(readMigration(FILE))
  const rls = await db.query<{ relrowsecurity: boolean }>(`select relrowsecurity from pg_class where relname = 'lesson_card_payments'`)
  assert.deepEqual(rls.rows.map(r => r.relrowsecurity), [true])
  assert.equal((await db.query(`select 1 from pg_policies where tablename = 'lesson_card_payments'`)).rows.length, 0)
  const grants = await db.query(`select grantee from information_schema.role_table_grants where table_name = 'lesson_card_payments' and grantee in ('anon', 'authenticated')`)
  assert.deepEqual(grants.rows, [])
})

test('the service role can write and read; anon and a signed-in tutor cannot even read their own payments', async () => {
  const db = await dbWithLesson()
  await db.exec(readMigration(FILE))
  await db.exec(`set role service_role`)
  await db.exec(row('cs_1'))
  assert.equal((await db.query(`select * from public.lesson_card_payments`)).rows.length, 1)
  await db.exec(`reset role`)
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`)
    await assert.rejects(db.query(`select * from public.lesson_card_payments`), /permission denied/, role)
    await assert.rejects(db.exec(`update public.lesson_card_payments set status = 'paid'`), /permission denied/, role)
    await assert.rejects(db.exec(row('cs_2')), /permission denied/, role)
    await db.exec(`reset role`)
  }
})

test('at most one open session per lesson, even if two requests race: the second insert fails with 23505', async () => {
  const db = await dbWithLesson()
  await db.exec(readMigration(FILE))
  await db.exec(row('cs_1'))
  await assert.rejects(db.exec(row('cs_2')), (e: { code?: string }) => e.code === '23505')
  // once the first is expired a new one is allowed
  await db.exec(`update public.lesson_card_payments set status = 'expired' where stripe_session_id = 'cs_1'`)
  await db.exec(row('cs_2'))
  assert.equal((await db.query(`select 1 from public.lesson_card_payments where status = 'created'`)).rows.length, 1)
})

test('at most one paid row per lesson: the second claim fails with 23505 (the webhook then flags a duplicate)', async () => {
  const db = await dbWithLesson()
  await db.exec(readMigration(FILE))
  await db.exec(row('cs_1', 'paid'))
  await db.exec(row('cs_2'))
  await assert.rejects(db.exec(`update public.lesson_card_payments set status = 'paid' where stripe_session_id = 'cs_2'`), (e: { code?: string }) => e.code === '23505')
  await db.exec(`update public.lesson_card_payments set status = 'duplicate' where stripe_session_id = 'cs_2'`)
})

test('the checks reject values the app never writes (status, currency, amount)', async () => {
  const db = await dbWithLesson()
  await db.exec(readMigration(FILE))
  await assert.rejects(db.exec(row('cs_1', 'refunded')))
  await assert.rejects(db.exec(row('cs_1').replace("'eur'", "'EURO'")))
  await assert.rejects(db.exec(row('cs_1').replace('4000', '0')))
})

test('deleting a lesson keeps the payment record (the lesson id becomes null)', async () => {
  const db = await dbWithLesson()
  await db.exec(readMigration(FILE))
  await db.exec(row('cs_1', 'paid'))
  await db.exec(`delete from public.lessons where id = '${LESSON}'`)
  const left = await db.query<{ lesson_id: string | null; status: string }>(`select lesson_id, status from public.lesson_card_payments`)
  assert.deepEqual(left.rows, [{ lesson_id: null, status: 'paid' }])
})
