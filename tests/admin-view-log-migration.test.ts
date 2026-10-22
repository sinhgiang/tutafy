// 022_admin_view_log.sql is written but NOT applied to the real database (T-0708). It is run here on a throwaway in-memory Postgres (PGlite) on
// top of the migrations before it, to show that it applies cleanly and can be re-run, adds one table and changes nothing else, that nobody
// but the server (service role) can read or write it (the second-person test), and that the real session functions of src/lib/view-session.ts
// work on the real table: open, find, expire, close, another admin's session, and "no table, no view".
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb, readMigration, migrationFiles } from './support/local-db.ts'
import { pgliteClient } from './support/pglite-client.ts'
import { openViewSession, findViewSession, closeViewSession } from '@/lib/view-session.ts'
import { VIEW_TTL_MS } from '@/lib/view-as.ts'

const FILE = '022_admin_view_log.sql'
const ADMIN = '11111111-1111-4111-8111-111111111111'
const OTHER_ADMIN = '33333333-3333-4333-8333-333333333333'
const TUTOR = '22222222-2222-4222-8222-222222222222'
const NOBODY = '44444444-4444-4444-8444-444444444444'

async function freshDb(applyIt = true): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, FILE)
  await db.exec(`
    insert into auth.users (id, email) values ('${ADMIN}', 'admin@example.com'), ('${TUTOR}', 'tutor@example.com');
    insert into public.tutors (id, email, name, slug, subscription_status) values ('${TUTOR}', 'tutor@example.com', 'Tutor T', 'tutor-t', 'free');
  `)
  if (applyIt) await db.exec(readMigration(FILE))
  return db
}
async function asRole<T>(db: PGlite, userId: string | null, role: 'authenticated' | 'anon' | 'service_role', fn: () => Promise<T>): Promise<T> {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId ?? ''}', false); set role ${role}`)
  try { return await fn() } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`) }
}
const client = (db: PGlite) => pgliteClient(db) as never

test('the migration file exists once, as number 022', () => {
  assert.deepEqual(migrationFiles().filter(f => f.startsWith('022_')), [FILE])
})

test('it applies on top of the earlier files, and twice in a row (idempotent), keeping the rows already logged', async () => {
  const db = await freshDb(false)
  await db.exec(readMigration(FILE))
  const opened = await openViewSession(client(db), ADMIN, TUTOR)
  assert.equal(opened.ok, true)
  await db.exec(readMigration(FILE))
  await db.exec(readMigration(FILE))
  assert.equal((await db.query(`select 1 from public.admin_view_log`)).rows.length, 1, 'a re-run does not empty the log')
})

test('it adds exactly one table and no other change to any table', async () => {
  const db = await freshDb(false)
  const all = `select table_name, column_name from information_schema.columns where table_schema = 'public' order by 1, 2`
  const before = (await db.query<{ table_name: string; column_name: string }>(all)).rows
  await db.exec(readMigration(FILE))
  const after = (await db.query<{ table_name: string; column_name: string }>(all)).rows
  const added = after.filter(a => !before.some(b => b.table_name === a.table_name && b.column_name === a.column_name))
  assert.deepEqual([...new Set(added.map(a => a.table_name))], ['admin_view_log'])
  assert.deepEqual(added.map(a => a.column_name).sort(), ['admin_id', 'closed_at', 'expires_at', 'id', 'opened_at', 'tutor_id'])
  assert.equal(after.length, before.length + added.length)
})

test('nobody but the server can read or write the log: a tutor, a signed-out visitor and even the admin\'s own browser session are refused', async () => {
  const db = await freshDb()
  await db.exec(`insert into public.admin_view_log (admin_id, tutor_id) values ('${ADMIN}', '${TUTOR}')`)
  for (const [who, role] of [[TUTOR, 'authenticated'], [ADMIN, 'authenticated'], [null, 'anon']] as const) {
    await assert.rejects(asRole(db, who, role, () => db.query(`select * from public.admin_view_log`)), /permission denied/, `${role} ${who} may not read`)
    await assert.rejects(asRole(db, who, role, () => db.query(`insert into public.admin_view_log (admin_id, tutor_id) values ('${ADMIN}', '${TUTOR}')`)), /permission denied/)
    await assert.rejects(asRole(db, who, role, () => db.query(`update public.admin_view_log set closed_at = now()`)), /permission denied/)
    await assert.rejects(asRole(db, who, role, () => db.query(`delete from public.admin_view_log`)), /permission denied/)
  }
  const rls = await db.query<{ relrowsecurity: boolean }>(`select relrowsecurity from pg_class where oid = 'public.admin_view_log'::regclass`)
  assert.equal(rls.rows[0].relrowsecurity, true)
  assert.equal((await db.query(`select 1 from pg_policies where tablename = 'admin_view_log'`)).rows.length, 0, 'no policy at all')
  assert.equal((await asRole(db, null, 'service_role', () => db.query(`select 1 from public.admin_view_log`))).rows.length, 1, 'the server key still reads')
})

test('the table refuses a view that ends before it begins and a close before the open', async () => {
  const db = await freshDb()
  await assert.rejects(db.exec(`insert into public.admin_view_log (admin_id, tutor_id, opened_at, expires_at) values ('${ADMIN}', '${TUTOR}', now(), now() - interval '1 minute')`), /expires_after_open/)
  await assert.rejects(db.exec(`insert into public.admin_view_log (admin_id, tutor_id, opened_at, expires_at, closed_at) values ('${ADMIN}', '${TUTOR}', now(), now() + interval '30 minutes', now() - interval '1 hour')`), /closed_after_open/)
})

// ---- the real functions on the real table --------------------------------------------------------------------------------------------

test('open: a row is written with who, whom and the 30 minutes; the id is a fresh UUID that opens exactly that session', async () => {
  const db = await freshDb()
  const now = new Date('2026-10-22T10:00:00.000Z')
  const r = await openViewSession(client(db), ADMIN, TUTOR, now)
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.match(r.session.id, /^[0-9a-f-]{36}$/)
  assert.equal(VIEW_TTL_MS, 30 * 60 * 1000)
  const row = (await db.query<{ admin_id: string; tutor_id: string; opened_at: Date; expires_at: Date; closed_at: Date | null }>(`select * from public.admin_view_log where id = '${r.session.id}'`)).rows[0]
  assert.deepEqual([row.admin_id, row.tutor_id, row.opened_at.toISOString(), row.expires_at.toISOString(), row.closed_at], [ADMIN, TUTOR, '2026-10-22T10:00:00.000Z', '2026-10-22T10:30:00.000Z', null])
  const again = await openViewSession(client(db), ADMIN, TUTOR, now)
  assert.equal(again.ok && again.session.id !== r.session.id, true, 'every view has its own id')
})

test('find: valid for the admin who opened it until the 30 minutes are over, never after, never for another admin, never when closed', async () => {
  const db = await freshDb()
  const t0 = new Date('2026-10-22T10:00:00.000Z')
  const r = await openViewSession(client(db), ADMIN, TUTOR, t0)
  assert.equal(r.ok, true)
  if (!r.ok) return
  const at = (ms: number) => new Date(t0.getTime() + ms)
  assert.equal((await findViewSession(client(db), r.session.id, ADMIN, at(0)))?.tutorId, TUTOR)
  assert.equal((await findViewSession(client(db), r.session.id, ADMIN, at(29 * 60_000 + 59_000)))?.tutorId, TUTOR, 'one second before the end it still works')
  assert.equal(await findViewSession(client(db), r.session.id, ADMIN, at(30 * 60_000)), null, 'at 30 minutes it has run out')
  assert.equal(await findViewSession(client(db), r.session.id, ADMIN, at(31 * 60_000)), null)
  assert.equal(await findViewSession(client(db), r.session.id, OTHER_ADMIN, at(1000)), null, 'another admin cannot use this id')
  for (const junk of [null, undefined, '', 'not-a-uuid', NOBODY, "' or true --", '../x']) assert.equal(await findViewSession(client(db), junk, ADMIN, at(1000)), null, String(junk))
  assert.equal(await findViewSession(client(db), r.session.id, 'not-a-uuid', at(1000)), null)
})

test('close: writes the closing time once, only for the admin\'s own session, and then the id stops working', async () => {
  const db = await freshDb()
  const t0 = new Date('2026-10-22T10:00:00.000Z')
  const r = await openViewSession(client(db), ADMIN, TUTOR, t0)
  if (!r.ok) throw new Error('open failed')
  await closeViewSession(client(db), r.session.id, OTHER_ADMIN, new Date(t0.getTime() + 60_000))
  assert.equal((await findViewSession(client(db), r.session.id, ADMIN, new Date(t0.getTime() + 61_000)))?.tutorId, TUTOR, 'another admin cannot close it')
  await closeViewSession(client(db), r.session.id, ADMIN, new Date(t0.getTime() + 120_000))
  const closed = (await db.query<{ closed_at: Date }>(`select closed_at from public.admin_view_log where id = '${r.session.id}'`)).rows[0].closed_at
  assert.equal(closed.toISOString(), '2026-10-22T10:02:00.000Z')
  assert.equal(await findViewSession(client(db), r.session.id, ADMIN, new Date(t0.getTime() + 130_000)), null, 'closed means closed')
  await closeViewSession(client(db), r.session.id, ADMIN, new Date(t0.getTime() + 600_000))
  const again = (await db.query<{ closed_at: Date }>(`select closed_at from public.admin_view_log where id = '${r.session.id}'`)).rows[0].closed_at
  assert.equal(again.toISOString(), '2026-10-22T10:02:00.000Z', 'pressing Exit twice does not move the closing time')
})

test('open: no such tutor, a bad id, and a database without the log table all open NOTHING', async () => {
  const db = await freshDb()
  assert.deepEqual(await openViewSession(client(db), ADMIN, NOBODY), { ok: false, reason: 'no_such_tutor' })
  assert.deepEqual(await openViewSession(client(db), ADMIN, 'nope'), { ok: false, reason: 'bad_id' })
  assert.deepEqual(await openViewSession(client(db), 'nope', TUTOR), { ok: false, reason: 'bad_id' })
  assert.equal((await db.query(`select 1 from public.admin_view_log`)).rows.length, 0)
  const without = await freshDb(false)
  assert.deepEqual(await openViewSession(client(without), ADMIN, TUTOR), { ok: false, reason: 'unavailable' }, 'migration not applied: no log line, so no view')
})
