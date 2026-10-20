// 015_visitor_tracking.sql is written but NOT applied to the real database.
// Here it is run on a throwaway in-memory Postgres (PGlite) together with the
// migrations before it, to show it applies cleanly, can be re-run, keeps the
// tables locked to the service role, and does not touch existing data.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyMigrationsBefore, newDb, readMigration, migrationFiles } from './support/local-db.ts'

const FILE = '015_visitor_tracking.sql'
const TUTOR = '11111111-1111-1111-1111-111111111111'
const VISITOR = '22222222-2222-2222-2222-222222222222'

async function dbWithTutor() {
  const db = await newDb()
  await applyMigrationsBefore(db, FILE)
  await db.exec(`
    insert into auth.users (id, email) values ('${TUTOR}', 'ten@example.com');
    insert into public.tutors (id, email, name, slug, subscription_status)
      values ('${TUTOR}', 'ten@example.com', 'Ten', 'ten', 'pro');
  `)
  return db
}

test('the migration file is the only 015 and sorts after 014 (later files may follow it)', () => {
  const files = migrationFiles()
  assert.equal(files.filter(f => f.startsWith('015_')).length, 1)
  assert.ok(files.indexOf(FILE) > files.indexOf('014_team_member_booking.sql'))
})

test('migration 015 applies on top of the earlier files, and twice in a row (idempotent)', async () => {
  const db = await dbWithTutor()
  await db.exec(readMigration(FILE))
  await db.exec(readMigration(FILE))
  const t = await db.query<{ table_name: string }>(
    `select table_name from information_schema.tables where table_schema = 'public' and table_name in ('visitors', 'visitor_events') order by 1`)
  assert.deepEqual(t.rows.map(r => r.table_name), ['visitor_events', 'visitors'])
})

test('migration 015 changes nothing that already existed', async () => {
  const db = await dbWithTutor()
  const before = await db.query(`select * from public.tutors`)
  const cols = await db.query(`select table_name, column_name from information_schema.columns where table_schema = 'public' and table_name <> all (array['visitors','visitor_events']) order by 1, 2`)
  await db.exec(readMigration(FILE))
  assert.deepEqual((await db.query(`select * from public.tutors`)).rows, before.rows)
  const colsAfter = await db.query(`select table_name, column_name from information_schema.columns where table_schema = 'public' and table_name <> all (array['visitors','visitor_events']) order by 1, 2`)
  assert.deepEqual(colsAfter.rows, cols.rows)
})

test('both tables have RLS on, no policy, and no grant to anon or authenticated', async () => {
  const db = await dbWithTutor()
  await db.exec(readMigration(FILE))
  const rls = await db.query<{ relname: string; relrowsecurity: boolean }>(
    `select relname, relrowsecurity from pg_class where relname in ('visitors', 'visitor_events') order by 1`)
  assert.deepEqual(rls.rows.map(r => r.relrowsecurity), [true, true])
  const policies = await db.query(`select 1 from pg_policies where tablename in ('visitors', 'visitor_events')`)
  assert.equal(policies.rows.length, 0)
  const grants = await db.query(
    `select grantee, table_name from information_schema.role_table_grants where table_name in ('visitors', 'visitor_events') and grantee in ('anon', 'authenticated')`)
  assert.deepEqual(grants.rows, [])
})

test('the service role can write and read; anon and a signed-in tutor cannot', async () => {
  const db = await dbWithTutor()
  await db.exec(readMigration(FILE))

  await db.exec(`set role service_role`)
  await db.exec(`insert into public.visitors (id, country, first_source, tutor_id) values ('${VISITOR}', 'VN', 'ai_chatgpt', '${TUTOR}')`)
  await db.exec(`insert into public.visitor_events (visitor_id, kind, path) values ('${VISITOR}', 'page_view', '/blog/x')`)
  assert.equal((await db.query(`select * from public.visitor_events`)).rows.length, 1)
  await db.exec(`reset role`)

  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`)
    await assert.rejects(db.query(`select * from public.visitors`), /permission denied/, role)
    await assert.rejects(db.query(`insert into public.visitor_events (visitor_id, kind) values ('${VISITOR}', 'page_view')`), /permission denied/, role)
    await db.exec(`reset role`)
  }
})

test('the checks reject values the app never sends (source, kind, plan, country)', async () => {
  const db = await dbWithTutor()
  await db.exec(readMigration(FILE))
  await assert.rejects(db.exec(`insert into public.visitors (id, first_source) values ('${VISITOR}', 'facebook_scraper')`), /check/i)
  await assert.rejects(db.exec(`insert into public.visitors (id, country) values ('${VISITOR}', 'Vietnam')`), /check/i)
  await db.exec(`insert into public.visitors (id) values ('${VISITOR}')`)
  assert.equal((await db.query<{ first_source: string }>(`select first_source from public.visitors`)).rows[0].first_source, 'direct')
  await assert.rejects(db.exec(`insert into public.visitor_events (visitor_id, kind) values ('${VISITOR}', 'keystroke')`), /check/i)
  await assert.rejects(db.exec(`insert into public.visitor_events (visitor_id, kind, plan) values ('${VISITOR}', 'order_paid', 'enterprise')`), /check/i)
})

test('no column can hold an IP address, user agent or query string', async () => {
  const db = await dbWithTutor()
  await db.exec(readMigration(FILE))
  const cols = await db.query<{ column_name: string }>(
    `select column_name from information_schema.columns where table_name in ('visitors', 'visitor_events')`)
  const names = cols.rows.map(c => c.column_name)
  for (const banned of [/ip/i, /agent/i, /query/i, /email/i, /^ua$/i]) {
    assert.deepEqual(names.filter(n => banned.test(n) && n !== 'tutor_id' && n !== 'kind'), [], String(banned))
  }
})

test('deleting a visitor deletes its events; deleting the tutor only unlinks the visitor', async () => {
  const db = await dbWithTutor()
  await db.exec(readMigration(FILE))
  await db.exec(`insert into public.visitors (id, tutor_id) values ('${VISITOR}', '${TUTOR}')`)
  await db.exec(`insert into public.visitor_events (visitor_id, kind) values ('${VISITOR}', 'page_view')`)
  await db.exec(`delete from public.tutors where id = '${TUTOR}'`)
  assert.equal((await db.query<{ tutor_id: string | null }>(`select tutor_id from public.visitors`)).rows[0].tutor_id, null)
  await db.exec(`delete from public.visitors where id = '${VISITOR}'`)
  assert.equal((await db.query(`select 1 from public.visitor_events`)).rows.length, 0)
})

test('purge_old_visitor_data removes only visitors older than the cut-off', async () => {
  const db = await dbWithTutor()
  await db.exec(readMigration(FILE))
  await db.exec(`
    insert into public.visitors (id, first_seen_at) values
      ('${VISITOR}', now() - interval '400 days'),
      ('33333333-3333-3333-3333-333333333333', now() - interval '10 days');
    insert into public.visitor_events (visitor_id, kind) values ('${VISITOR}', 'page_view');
  `)
  const gone = await db.query<{ purge_old_visitor_data: number }>(`select public.purge_old_visitor_data(395)`)
  assert.equal(gone.rows[0].purge_old_visitor_data, 1)
  assert.equal((await db.query(`select 1 from public.visitors`)).rows.length, 1)
  assert.equal((await db.query(`select 1 from public.visitor_events`)).rows.length, 0)
  await db.exec(`set role authenticated`)
  await assert.rejects(db.query(`select public.purge_old_visitor_data(1)`), /permission denied/)
})
