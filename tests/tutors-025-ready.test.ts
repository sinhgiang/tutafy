// T-0774, and 025 is closed: the fix is the migration supabase/migrations/025_tutors_not_public.sql (the owner ran it on the real database, W-2548),
// with two read-only checks and a way back in docs/tutors-rls.
// Everything runs on a throwaway Postgres (PGlite) made from every migration file; nothing here touches a real database or key.
//   - the two checks (docs/tutors-rls/025_checks_read_only.sql) are select statements only, and say "open" before and "closed" after;
//   - the fix can be run twice; the way back (025_tutors_not_public_rollback.sql) puts the policies and the grants back EXACTLY as the migration files made them;
//   - the fix is a migration now: numbered 025, with its marker, safe to run again. "Before" in these tests is a copy built from the migrations that come BEFORE 025.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, migrationFiles, newDb, readMigration } from './support/local-db.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dir = path.join(ROOT, 'docs', 'tutors-rls')
const sql = (f: string) => readFileSync(path.join(dir, f), 'utf8').split('\r\n').join('\n')
const FIX = readFileSync(path.join(ROOT, 'supabase', 'migrations', '025_tutors_not_public.sql'), 'utf8').split('\r\n').join('\n')
const BACK = sql('025_tutors_not_public_rollback.sql')
const CHECKS = sql('025_checks_read_only.sql')

/** The statements of a SQL file with the comment lines taken out. */
const statements = (text: string) => text.split('\n').filter(l => !l.trim().startsWith('--')).join('\n').split(';').map(s => s.trim()).filter(Boolean)

/** The database as it was BEFORE 025: every migration file that comes before it, so the exposure is still there and the fix can be shown. */
async function freshDb(): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, '025_tutors_not_public.sql')
  return db
}
type Row = Record<string, unknown>
const check = async (db: PGlite, n: 1 | 2): Promise<Row[]> => (await db.query<Row>(statements(CHECKS)[n - 1])).rows

/** Everything the fix changes: the policies of the two tables and what the visitor's role may select. */
async function snapshot(db: PGlite): Promise<{ policies: Row[]; grants: Row[] }> {
  const policies = (await db.query<Row>(`select tablename, policyname, cmd, roles::text as roles, qual, with_check from pg_policies where schemaname = 'public' and tablename in ('tutors', 'availability_exceptions') order by tablename, policyname`)).rows
  const grants = (await db.query<Row>(`select table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name in ('tutors', 'availability_exceptions') and grantee in ('anon', 'authenticated') order by table_name, grantee, privilege_type`)).rows
  return { policies, grants }
}

test('the two checks are two plain select statements: nothing in them can change a thing', () => {
  const list = statements(CHECKS)
  assert.equal(list.length, 2)
  for (const s of list) {
    assert.match(s, /^select\b/i)
    assert.doesNotMatch(s, /\b(insert|update|delete|drop|create|alter|grant|revoke|truncate|set|call|do|copy)\b/i)
  }
  // and running them changes no policy and no grant
  return freshDb().then(async db => {
    const before = await snapshot(db)
    await check(db, 1); await check(db, 2)
    assert.deepEqual(await snapshot(db), before)
  })
})

test('check 1 shows the two public policies before the fix and not after; the tutor\'s own policies stay', async () => {
  const db = await freshDb()
  const names = async () => (await check(db, 1)).map(r => `${r.tablename}: ${r.policyname}`)
  const before = await names()
  assert.ok(before.includes('tutors: Anyone can view tutor for booking'))
  assert.ok(before.includes('availability_exceptions: Public read exceptions'))
  await db.exec(FIX)
  const after = await names()
  assert.ok(!after.includes('tutors: Anyone can view tutor for booking'))
  assert.ok(!after.includes('availability_exceptions: Public read exceptions'))
  for (const own of ['tutors: Tutors can view own profile', 'tutors: Tutors can update own profile', 'tutors: Tutors can insert own profile', 'availability_exceptions: Tutors manage exceptions']) {
    assert.ok(after.includes(own), `${own} stays`)
  }
  // nothing that reads for everybody is left: no condition that is just true, none that is only the page-on flag
  const open = (await check(db, 1)).filter(r => r.cmd === 'SELECT' && /^(true|\(?booking_url_active = true\)?)$/.test(String(r.qual)))
  assert.deepEqual(open, [])
})

test('check 2 shows the visitor\'s right to select on both tables before the fix and nothing after', async () => {
  const db = await freshDb()
  assert.deepEqual((await check(db, 2)).map(r => `${r.table_name}: ${r.grantee} ${r.privilege_type}`), ['availability_exceptions: anon SELECT', 'tutors: anon SELECT'])
  await db.exec(FIX)
  assert.deepEqual(await check(db, 2), [])
})

test('the fix can be run twice and the second run changes nothing', async () => {
  const db = await freshDb()
  await db.exec(FIX)
  const once = await snapshot(db)
  await db.exec(FIX)
  assert.deepEqual(await snapshot(db), once)
})

test('the way back: after the fix and then the rollback the policies and the grants are exactly what the migration files made; it can be run twice', async () => {
  const db = await freshDb()
  const original = await snapshot(db)
  await db.exec(FIX)
  assert.notDeepEqual(await snapshot(db), original, 'the fix did change something')
  await db.exec(BACK)
  const restored = await snapshot(db)
  assert.deepEqual(restored.policies, original.policies, 'the policies: same names, commands, roles and conditions')
  // the visitor's right to select is back on both tables (the other rights of the visitor were never touched by the fix)
  const selects = (g: Row[]) => g.filter(r => r.privilege_type === 'SELECT').map(r => `${r.table_name}: ${r.grantee}`)
  assert.deepEqual(selects(restored.grants), selects(original.grants))
  assert.deepEqual(restored.grants, original.grants)
  await db.exec(BACK)
  assert.deepEqual(await snapshot(db), restored)
  // and the exposure is exactly the one the README describes: the way back is a stop-gap
  await db.exec(`insert into auth.users (id, email) values ('11111111-1111-4111-8111-111111111111', 'a@example.com'); insert into public.tutors (id, name, slug, email, booking_url_active) values ('11111111-1111-4111-8111-111111111111', 'A', 'a', 'a@example.com', true)`)
  await db.exec('set role anon')
  const seen = (await db.query<Row>(`select slug from public.tutors`)).rows
  await db.exec('reset role')
  assert.deepEqual(seen, [{ slug: 'a' }])
})

test('the fix and the way back touch only the two tables, and change no row and no column', () => {
  for (const text of [FIX, BACK]) {
    const code = statements(text).join(';\n')
    assert.doesNotMatch(code, /\b(insert|update|delete|alter table|drop table|drop column|truncate)\b/i)
    for (const m of code.matchAll(/\bon\s+public\.(\w+)/gi)) assert.ok(['tutors', 'availability_exceptions'].includes(m[1]), `touches ${m[1]}`)
    for (const m of code.matchAll(/\b(?:from|to)\s+(\w+)\s*$/gim)) assert.equal(m[1], 'anon', `grants to ${m[1]}`)
  }
})

test('the fix is a migration: exactly one file numbered 025 holds it, with its marker, and it says it was run and when it must not be', () => {
  assert.deepEqual(migrationFiles().filter(f => f.startsWith('025')), ['025_tutors_not_public.sql'])
  assert.ok(FIX.includes('T-0767-FIX'))
  assert.equal(migrationFiles().filter(f => readMigration(f).includes('T-0767-FIX')).length, 1, 'the marker is in one migration only')
  assert.match(FIX, /ALREADY RUN on the real Supabase project/)
  assert.match(FIX, /Do NOT run it before the code of T-0774 is live/)
  assert.doesNotMatch(FIX, /READY, NOT RUN/)
  assert.ok(!existsSync(path.join(dir, '025_tutors_not_public_proposal.sql')), 'the file was moved, not copied: a second copy could drift')
})

test('a database built from EVERY migration is closed from its first day: no public policy and no select for the visitor on the two tables', async () => {
  const db = await newDb()
  await applyMigrationsBefore(db, 'zzz_after_everything.sql')
  assert.deepEqual(await check(db, 2), [], 'check 2: no select for anon')
  const open = (await check(db, 1)).filter(r => /Anyone can view tutor for booking|Public read exceptions/.test(String(r.policyname)))
  assert.deepEqual(open, [], 'check 1: neither public policy')
})
