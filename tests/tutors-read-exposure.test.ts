// T-0767: can a visitor (the public key, the role "anon") read a tutor's private columns? Answered on a throwaway Postgres (PGlite) built from EVERY
// migration file, with Supabase's own default privileges (the roles anon and authenticated may select on every table of the public schema, so
// row level security is the only barrier), and made-up tutors whose private columns hold made-up values. Nothing here touches a real database or
// uses a real key, and every address in it is example.com. The same file proves the proposed fix (docs/tutors-rls/025_tutors_not_public_proposal.sql).
//
// How the first group reads: it asks "what does the database do TODAY". While the fix is not in supabase/migrations it expects the exposure (that
// is the evidence). The day the proposal is moved there (it carries the marker T-0767-FIX), the same tests expect NO exposure, so they turn into
// the guard that keeps it closed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, migrationFiles, newDb, readMigration } from './support/local-db.ts'

const PROPOSAL = path.resolve(import.meta.dirname, '..', 'docs', 'tutors-rls', '025_tutors_not_public_proposal.sql')
const proposalSql = () => readFileSync(PROPOSAL, 'utf8').replace(/\r\n/g, '\n')
const FIXED_IN_MIGRATIONS = migrationFiles().some(f => readMigration(f).includes('T-0767-FIX'))

const A = '11111111-1111-4111-8111-111111111111' // a tutor whose booking page is on
const B = '22222222-2222-4222-8222-222222222222' // another tutor, page on
const HIDDEN = '33333333-3333-4333-8333-333333333333' // a tutor whose booking page is OFF

/** Every column of `tutors` that is private, with a made-up value that can be told apart. The columns the pages show (name, bio, ...) are not here. */
const PRIVATE: Record<string, string> = {
  email: `a.private@example.com`,
  stripe_account_id: 'acct_example_0001',
  stripe_onboarding_complete: 'true',
  paypal_link: 'https://paypal.example.com/a',
  paddle_checkout_link: 'https://pay.example.com/a',
  subscription_status: 'academy',
  subscription_expires_at: '2030-01-01T00:00:00Z',
  polar_subscription_id: 'sub_example_0001',
  polar_checkout_id: 'chk_example_0001',
  google_calendar_refresh_token: 'refresh-token-example-0001',
  google_calendar_id: 'calendar-example-0001',
  notify_new_booking: 'false',
  notify_new_message: 'false',
  referral_credits: '7',
  custom_domain: 'tutor.example.com',
  push_subscription: '{"endpoint":"https://push.example.com/a","keys":{"auth":"x","p256dh":"y"}}',
  contract_template: 'Private contract text of tutor A',
}

async function freshDb(): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, 'zzz_after_everything.sql')
  // columns the real database has from the admin migrate route (src/app/api/admin/migrate/route.ts) and the migration files do not make
  await db.exec(`
    alter table public.tutors add column if not exists trial_enabled boolean default false;
    alter table public.tutors add column if not exists trial_price decimal(10,2);`)
  const cols = Object.keys(PRIVATE)
  const values = cols.map(c => PRIVATE[c])
  const set = (id: string, slug: string, on: boolean, email: string) =>
    db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, email])
      .then(() => db.query(`insert into public.tutors (id, name, slug, booking_url_active, ${cols.join(', ')}) values ($1, $2, $3, $4, ${cols.map((_, i) => `$${i + 5}`).join(', ')})`,
        [id, `Tutor ${slug}`, slug, on, ...values.map((v, i) => (cols[i] === 'email' ? email : v))]))
  await set(A, 'tutor-a', true, 'a.private@example.com')
  await set(B, 'tutor-b', true, 'b.private@example.com')
  await set(HIDDEN, 'tutor-hidden', false, 'hidden.private@example.com')
  await db.query(`insert into public.students (tutor_id, name, email, phone, notes) values ($1, 'Student One', 'student.one@example.com', '0900 000 000', 'Private note about the student')`, [A])
  await db.query(`insert into public.availability_exceptions (tutor_id, date, reason) values ($1, current_date + 3, 'Private reason: a medical appointment')`, [A])
  return db
}

/** Run `fn` as a database role the way the REST service does: the role, and for a signed-in user the id that auth.uid() answers. */
async function as<T>(db: PGlite, role: 'anon' | 'authenticated' | 'service_role', userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${role}`)
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? ''])
  try {
    return await fn()
  } finally {
    await db.exec('reset role')
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`)
  }
}

const readColumn = async (db: PGlite, col: string, slug: string): Promise<string | null | 'denied'> => {
  try {
    const r = await db.query<Record<string, unknown>>(`select ${col}::text as v from public.tutors where slug = $1`, [slug])
    return r.rows.length === 0 ? null : String(r.rows[0].v)
  } catch (e) {
    if (/permission denied/i.test((e as Error).message)) return 'denied'
    throw e
  }
}

// ---- the evidence: what a visitor can read, column by column -----------------------------------------------------------------------

test('the public key reads each private column of a tutor whose page is on, one by one (until the fix is in the migrations)', async () => {
  const db = await freshDb()
  const matrix: Record<string, string> = {}
  for (const [col, value] of Object.entries(PRIVATE)) {
    const got = await as(db, 'anon', null, () => readColumn(db, col, 'tutor-a'))
    matrix[col] = got === value || (col === 'subscription_expires_at' && typeof got === 'string' && got.startsWith('2030')) || (col === 'push_subscription' && typeof got === 'string' && got.includes('push.example.com')) ? 'READABLE' : got === null ? 'no row' : got === 'denied' ? 'denied' : `other:${got}`
  }
  const readable = Object.entries(matrix).filter(([, v]) => v === 'READABLE').map(([c]) => c)
  if (FIXED_IN_MIGRATIONS) {
    assert.deepEqual(readable, [], 'the fix is in the migrations: a visitor reads none of them')
  } else {
    assert.deepEqual(readable.sort(), Object.keys(PRIVATE).sort(), `TODAY the public key reads all of these: ${JSON.stringify(matrix)}`)
  }
})

test('the whole row comes with it: select * as the public key, and a column added tomorrow, are read the same way', async () => {
  const db = await freshDb()
  await db.exec(`alter table public.tutors add column zz_added_later text; update public.tutors set zz_added_later = 'added later' where slug = 'tutor-a'`)
  const star = await as(db, 'anon', null, async () => {
    try { return (await db.query<Record<string, unknown>>(`select * from public.tutors where slug = 'tutor-a'`)).rows } catch { return 'denied' as const }
  })
  const later = await as(db, 'anon', null, () => readColumn(db, 'zz_added_later', 'tutor-a'))
  if (FIXED_IN_MIGRATIONS) {
    assert.deepEqual([star, later], ['denied', 'denied'])
  } else {
    assert.ok(Array.isArray(star) && star.length === 1 && star[0].email === 'a.private@example.com' && star[0].google_calendar_refresh_token === 'refresh-token-example-0001')
    assert.equal(later, 'added later', 'a column made later is open to the visitor from its first day: the row policy, not a column list, is what lets the read through')
  }
})

test('the visitor reads ALL the tutors whose page is on in one call, and none of the tutors whose page is off', async () => {
  const db = await freshDb()
  const rows = await as(db, 'anon', null, async () => {
    try { return (await db.query<{ slug: string; email: string }>(`select slug, email from public.tutors order by slug`)).rows } catch { return 'denied' as const }
  })
  if (FIXED_IN_MIGRATIONS) {
    assert.equal(rows, 'denied')
  } else {
    assert.ok(Array.isArray(rows))
    assert.deepEqual(rows.map(r => [r.slug, r.email]), [['tutor-a', 'a.private@example.com'], ['tutor-b', 'b.private@example.com']], 'both page-on emails in one list; the page-off tutor is not in it')
  }
  const hidden = await as(db, 'anon', null, () => readColumn(db, 'email', 'tutor-hidden'))
  assert.ok(hidden === null || hidden === 'denied', 'a tutor whose booking page is off is never readable by a visitor')
})

test('a signed-in tutor B reads tutor A\'s private columns too: the row policy is for every role, not only anon', async () => {
  const db = await freshDb()
  const got = await as(db, 'authenticated', B, () => readColumn(db, 'google_calendar_refresh_token', 'tutor-a'))
  if (FIXED_IN_MIGRATIONS) assert.ok(got === null || got === 'denied')
  else assert.equal(got, 'refresh-token-example-0001')
})

test('NO phone number and NO private note live in `tutors`: the columns are listed; the student phone and notes, and the lesson notes, are closed to a visitor', async () => {
  const db = await freshDb()
  const cols = (await db.query<{ column_name: string }>(`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'tutors'`)).rows.map(r => r.column_name)
  assert.ok(!cols.some(c => /phone|mobile|tel\b|note/i.test(c)), `tutors columns: ${cols.join(', ')}`)
  for (const sql of [`select phone from public.students`, `select notes from public.students`, `select email from public.students`, `select notes from public.lessons`, `select content from public.messages`]) {
    const rows = await as(db, 'anon', null, async () => { try { return (await db.query(sql)).rows } catch { return [] } })
    assert.equal(rows.length, 0, `a visitor reads nothing from: ${sql}`)
  }
  // the owner of the student still reads them, to show the row is there
  const own = await as(db, 'authenticated', A, async () => (await db.query<{ phone: string; notes: string }>(`select phone, notes from public.students`)).rows)
  assert.deepEqual(own, [{ phone: '0900 000 000', notes: 'Private note about the student' }])
})

test('the private REASON of a blocked day is read by anyone (until the fix is in the migrations); the date itself is meant to be public', async () => {
  const db = await freshDb()
  const reason = await as(db, 'anon', null, async () => {
    try { return (await db.query<{ reason: string }>(`select reason from public.availability_exceptions`)).rows.map(r => r.reason) } catch { return 'denied' as const }
  })
  if (FIXED_IN_MIGRATIONS) assert.ok(reason === 'denied' || (Array.isArray(reason) && reason.length === 0))
  else assert.deepEqual(reason, ['Private reason: a medical appointment'])
})

// ---- every policy that lets the public read ------------------------------------------------------------------------------------------

test('the list of tables a visitor can read by policy is fixed: a new public read policy fails here until it is looked at', async () => {
  const db = await freshDb()
  const rows = (await db.query<{ tablename: string; policyname: string; cmd: string; roles: string; qual: string }>(
    `select tablename, policyname, cmd, roles::text as roles, qual from pg_policies where schemaname = 'public' and cmd in ('SELECT', 'ALL') and roles::text ~ '(public|anon)' and coalesce(qual, '') !~ 'auth\.uid' order by tablename, policyname`)).rows
  // a policy with no role named applies to everybody, so the ones that name the signed-in user (auth.uid()) are left out: what is left lets a visitor in.
  // every one of these is readable by a visitor whatever the row; "private column" says what in the table must not be, and what is done about it
  const ALLOWED: Record<string, string> = {
    availability: 'weekly free hours: shown on the booking page by design; no private column',
    packages: 'active lesson packages: shown on the booking page by design; no private column',
    reviews: 'public reviews (is_public): a rating, a comment, a student id (a uuid, no name or email); no private column',
    subscription_plans: 'active plans: shown to students by design; the Stripe price id is not a secret',
    tutors: 'FINDING (T-0767): the policy lets the visitor read every column, private ones included. Fixed by the proposal',
    availability_exceptions: 'FINDING (T-0767): the date is meant to be public but `reason` is a private note. Fixed by the proposal',
  }
  const found = [...new Set(rows.map(r => r.tablename))].sort()
  const expected = Object.keys(ALLOWED).filter(t => !(FIXED_IN_MIGRATIONS && (t === 'tutors' || t === 'availability_exceptions'))).sort()
  assert.deepEqual(found, expected, `public read policies: ${JSON.stringify(rows.map(r => `${r.tablename}: ${r.policyname}`))}`)
  assert.equal(await db.query(`select 1 from pg_policies where schemaname = 'public' and cmd in ('INSERT', 'UPDATE', 'DELETE') and roles::text ~ '(public|anon)' and coalesce(qual, '') !~ 'auth\\.uid|exists' and coalesce(with_check, '') !~ 'auth\\.uid|exists'`).then(r => r.rows.length), 0, 'no policy lets a visitor write')
  assert.equal(await db.query(`select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`).then(r => r.rows.length), 0, 'every table of the public schema has row level security on')
})

// ---- the proposed fix ---------------------------------------------------------------------------------------------------------------------

async function fixedDb(): Promise<PGlite> {
  const db = await freshDb()
  await db.exec(proposalSql())
  return db
}

test('FIX: after the proposal a visitor reads nothing from tutors, in any column, in any form, and nothing from the blocked days', async () => {
  const db = await fixedDb()
  for (const col of [...Object.keys(PRIVATE), 'name', 'slug', 'bio', 'id', '*']) {
    const r = await as(db, 'anon', null, async () => {
      try { return (await db.query(`select ${col === '*' ? '*' : `${col}::text`} from public.tutors`)).rows.length } catch (e) { return /permission denied/i.test((e as Error).message) ? 'denied' : String(e) }
    })
    assert.equal(r, 'denied', `anon, column ${col}`)
  }
  const ex = await as(db, 'anon', null, async () => { try { return (await db.query(`select reason from public.availability_exceptions`)).rows.length } catch (e) { return /permission denied/i.test((e as Error).message) ? 'denied' : String(e) } })
  assert.equal(ex, 'denied')
  const count = await as(db, 'anon', null, async () => { try { return (await db.query(`select count(*) from public.tutors`)).rows.length } catch { return 'denied' } })
  assert.equal(count, 'denied')
})

test('FIX: a signed-in tutor still reads and updates their OWN row, every column, and still reads and writes their own blocked days', async () => {
  const db = await fixedDb()
  const own = await as(db, 'authenticated', A, async () => (await db.query<Record<string, unknown>>(`select * from public.tutors`)).rows)
  assert.equal(own.length, 1, 'only their own row')
  assert.equal(own[0].email, 'a.private@example.com')
  assert.equal(own[0].google_calendar_refresh_token, 'refresh-token-example-0001')
  const upd = await as(db, 'authenticated', A, async () => (await db.query(`update public.tutors set bio = 'new bio' where id = '${A}'`)).affectedRows)
  assert.equal(upd, 1)
  const exOwn = await as(db, 'authenticated', A, async () => (await db.query<{ reason: string }>(`select reason from public.availability_exceptions`)).rows)
  assert.deepEqual(exOwn.map(r => r.reason), ['Private reason: a medical appointment'])
  await as(db, 'authenticated', A, () => db.query(`insert into public.availability_exceptions (tutor_id, date, reason) values ('${A}', current_date + 9, 'another')`))
  const cnt = await as(db, 'authenticated', A, async () => (await db.query<{ n: string }>(`select count(*) as n from public.availability_exceptions`)).rows[0].n)
  assert.equal(Number(cnt), 2)
})

test('FIX: SECOND TUTOR: tutor B reads and changes nothing of tutor A\'s row or blocked days, and cannot read a page-off tutor either', async () => {
  const db = await fixedDb()
  await as(db, 'authenticated', B, async () => {
    assert.equal((await db.query(`select email, google_calendar_refresh_token from public.tutors where id = '${A}'`)).rows.length, 0)
    assert.equal((await db.query(`select * from public.tutors where slug = 'tutor-a'`)).rows.length, 0)
    assert.equal((await db.query(`select * from public.tutors where id = '${HIDDEN}'`)).rows.length, 0)
    assert.equal((await db.query(`update public.tutors set bio = 'hijacked' where id = '${A}'`)).affectedRows, 0)
    assert.equal((await db.query(`select reason from public.availability_exceptions where tutor_id = '${A}'`)).rows.length, 0)
    assert.equal((await db.query(`select * from public.tutors`)).rows.length, 1, 'only B\'s own row')
  })
  const bio = (await db.query<{ bio: string | null }>(`select bio from public.tutors where id = '${A}'`)).rows[0].bio
  assert.notEqual(bio, 'hijacked')
})

test('FIX: the server\'s own key still reads everything (the pages that move to the server keep working), and the public tables stay public', async () => {
  const db = await fixedDb()
  const all = await as(db, 'service_role', null, async () => (await db.query<{ slug: string; email: string }>(`select slug, email from public.tutors order by slug`)).rows)
  assert.deepEqual(all.map(r => r.slug), ['tutor-a', 'tutor-b', 'tutor-hidden'])
  const hours = await db.query(`insert into public.availability (tutor_id, day_of_week, start_time, end_time) values ('${A}', 1, '09:00', '10:00')`)
  assert.ok(hours)
  const visitorHours = await as(db, 'anon', null, async () => (await db.query(`select day_of_week from public.availability`)).rows.length)
  assert.equal(visitorHours, 1, 'availability is unchanged: public by design')
})

test('FIX: the proposal changes no row and no column, can be run twice, touches only these two tables, and keeps the other policies', async () => {
  // once the file is a migration the database is already fixed when it is built, so "before" and "after" cannot be told apart here; the guards above hold the result
  if (FIXED_IN_MIGRATIONS) return
  const db = await freshDb()
  const before = {
    tutors: (await db.query(`select * from public.tutors order by id`)).rows,
    ex: (await db.query(`select * from public.availability_exceptions order by id`)).rows,
    policies: (await db.query<{ tablename: string; policyname: string }>(`select tablename, policyname from pg_policies where schemaname = 'public' order by 1, 2`)).rows,
  }
  await db.exec(proposalSql())
  await db.exec(proposalSql())
  assert.deepEqual((await db.query(`select * from public.tutors order by id`)).rows, before.tutors)
  assert.deepEqual((await db.query(`select * from public.availability_exceptions order by id`)).rows, before.ex)
  const after = (await db.query<{ tablename: string; policyname: string }>(`select tablename, policyname from pg_policies where schemaname = 'public' order by 1, 2`)).rows
  const removed = before.policies.filter(p => !after.some(a => a.tablename === p.tablename && a.policyname === p.policyname))
  assert.deepEqual(removed, [{ tablename: 'availability_exceptions', policyname: 'Public read exceptions' }, { tablename: 'tutors', policyname: 'Anyone can view tutor for booking' }])
  assert.equal(after.length, before.policies.length - 2, 'nothing was added')
  const code = proposalSql().split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
  assert.ok(!/\b(create|alter\s+table|insert|update|delete|truncate|grant)\b/i.test(code), 'the file only drops two policies and revokes two privileges')
  assert.deepEqual([...code.matchAll(/(?:on|from)\s+(public\.\w+)/gi)].map(m => m[1]).sort(), ['public.availability_exceptions', 'public.availability_exceptions', 'public.tutors', 'public.tutors'])
  assert.match(proposalSql(), /NOT APPLIED/)
  assert.match(proposalSql(), /T-0767-FIX/, 'the marker the tests look for once the file is in supabase/migrations')
})

test('the proposal is not in supabase/migrations yet: nothing can apply it by accident', () => {
  if (FIXED_IN_MIGRATIONS) return // moved on purpose, with the owner\'s approval: the tests above now guard it
  assert.ok(!migrationFiles().some(f => /tutors.*public|not_public/i.test(f)))
  assert.ok(!migrationFiles().some(f => readMigration(f).includes('drop policy if exists "Anyone can view tutor for booking"')))
})
