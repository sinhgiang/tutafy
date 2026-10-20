// T-0613. Can a signed-in tutor give themselves a paid plan? Checked on a throwaway in-memory
// Postgres (PGlite) built from the repo's migrations, never on a real database:
//   1. BEFORE migration 016 the hole is real (evidence below),
//   2. AFTER it, only the owner and the service role can change the paid / money columns.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb, readMigration } from './support/local-db.ts'

const FILE = '016_lock_paid_tutor_columns.sql'
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')
const TUTOR = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const NEWBIE = '33333333-3333-4333-8333-333333333333'

const LOCKED: [column: string, value: string][] = [
  ['subscription_status', `'academy'`],
  ['subscription_expires_at', `'2099-01-01T00:00:00Z'`],
  ['polar_subscription_id', `'sub_fake_123'`],
  ['polar_checkout_id', `'co_fake_123'`],
  ['stripe_account_id', `'acct_fake_123'`],
  ['stripe_onboarding_complete', `true`],
  ['referral_credits', `999`],
]

async function freshDb(applyFix: boolean): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, FILE)
  if (applyFix) await db.exec(readMigration(FILE))
  await db.exec(`
    insert into auth.users (id, email) values
      ('${TUTOR}', 'ten@example.com'), ('${OTHER}', 'other@example.com'), ('${NEWBIE}', 'new@example.com');
    insert into public.tutors (id, email, name, slug) values
      ('${TUTOR}', 'ten@example.com', 'Ten', 'ten'), ('${OTHER}', 'other@example.com', 'Other', 'other');
  `)
  return db
}

/** Run `fn` the way the app's browser client does: role "authenticated", signed in as `userId`. */
async function asUser<T>(db: PGlite, userId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId}', false); set role authenticated`)
  try {
    return await fn()
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`)
  }
}

async function asRole<T>(db: PGlite, role: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${role}`)
  try {
    return await fn()
  } finally {
    await db.exec(`reset role`)
  }
}

const rowOf = async (db: PGlite, id = TUTOR) => (await db.query<Record<string, unknown>>(`select * from public.tutors where id = '${id}'`)).rows[0]

// ---- 1. the hole, before the fix --------------------------------------------------------------

test('BEFORE the fix: nothing but updated_at is guarding the tutors table', async () => {
  const db = await freshDb(false)
  const triggers = await db.query<{ tgname: string }>(
    `select tgname from pg_trigger where tgrelid = 'public.tutors'::regclass and not tgisinternal order by 1`)
  assert.deepEqual(triggers.rows.map(t => t.tgname), ['tutors_updated_at'])
  const policies = await db.query<{ polname: string; cmd: string }>(
    `select polname, polcmd as cmd from pg_policy where polrelid = 'public.tutors'::regclass and polname = 'Tutors can update own profile'`)
  assert.equal(policies.rows.length, 1) // "update ... using (auth.uid() = id)", no column limit (002_rls.sql line 16)
})

test('BEFORE the fix: a signed-in tutor can give themselves any paid column', async () => {
  const db = await freshDb(false)
  for (const [col, value] of LOCKED) {
    const r = await asUser(db, TUTOR, () => db.query(`update public.tutors set ${col} = ${value} where id = '${TUTOR}'`))
    assert.equal(r.affectedRows, 1, `${col} was writable`)
  }
  const row = await rowOf(db)
  assert.deepEqual(
    [row.subscription_status, row.polar_subscription_id, row.polar_checkout_id, row.stripe_account_id, row.stripe_onboarding_complete, row.referral_credits],
    ['academy', 'sub_fake_123', 'co_fake_123', 'acct_fake_123', true, 999],
  )
})

test('BEFORE the fix: the plan limits fall with the plan (11th student allowed after a self-upgrade)', async () => {
  const db = await freshDb(false)
  const addStudents = (n: number) => asUser(db, TUTOR, async () => {
    for (let i = 0; i < n; i++) await db.query(`insert into public.students (tutor_id, name) values ('${TUTOR}', 'S${i}')`)
  })
  await addStudents(10)
  await assert.rejects(asUser(db, TUTOR, () => db.query(`insert into public.students (tutor_id, name) values ('${TUTOR}', 'one too many')`)), /student_limit_reached/)
  await asUser(db, TUTOR, () => db.query(`update public.tutors set subscription_status = 'pro' where id = '${TUTOR}'`)) // the hole
  await asUser(db, TUTOR, () => db.query(`insert into public.students (tutor_id, name) values ('${TUTOR}', 'now allowed')`))
  assert.equal((await db.query(`select 1 from public.students where tutor_id = '${TUTOR}'`)).rows.length, 11)
})

test('BEFORE the fix: a new tutor can also create their own row already on Academy', async () => {
  const db = await freshDb(false)
  await asUser(db, NEWBIE, () => db.query(
    `insert into public.tutors (id, email, name, slug, subscription_status) values ('${NEWBIE}', 'new@example.com', 'New', 'new', 'academy')`))
  assert.equal((await rowOf(db, NEWBIE)).subscription_status, 'academy')
})

test('BEFORE the fix: another tutor\'s row is already safe (RLS), so the hole is only the own row', async () => {
  const db = await freshDb(false)
  const r = await asUser(db, TUTOR, () => db.query(`update public.tutors set subscription_status = 'academy' where id = '${OTHER}'`))
  assert.equal(r.affectedRows, 0)
})

// ---- 2. after the fix -----------------------------------------------------------------------------

test('AFTER the fix: every paid / money column is refused for a signed-in tutor, and nothing changes', async () => {
  const db = await freshDb(true)
  const before = await rowOf(db)
  for (const [col, value] of LOCKED) {
    await assert.rejects(
      asUser(db, TUTOR, () => db.query(`update public.tutors set ${col} = ${value} where id = '${TUTOR}'`)),
      (e: Error & { code?: string; detail?: string }) => /paid_columns_locked/.test(e.message) && e.code === '42501' && (e.detail ?? '').includes(col),
      col,
    )
  }
  assert.deepEqual(await rowOf(db), before)
})

test('AFTER the fix: setting a column back to NULL or to another plan name is refused too', async () => {
  const db = await freshDb(true)
  await db.exec(`update public.tutors set subscription_status = 'pro', polar_subscription_id = 'sub_real' where id = '${TUTOR}'`) // the server did this
  for (const sql of [
    `update public.tutors set subscription_status = 'academy' where id = '${TUTOR}'`,
    `update public.tutors set subscription_status = 'free' where id = '${TUTOR}'`, // a downgrade by hand is still not theirs to do
    `update public.tutors set subscription_status = null where id = '${TUTOR}'`,
    `update public.tutors set polar_subscription_id = null where id = '${TUTOR}'`,
    `update public.tutors set name = 'x', subscription_status = 'academy' where id = '${TUTOR}'`, // mixed with an allowed column
  ]) {
    await assert.rejects(asUser(db, TUTOR, () => db.query(sql)), /paid_columns_locked/, sql)
  }
  assert.deepEqual([(await rowOf(db)).subscription_status, (await rowOf(db)).polar_subscription_id, (await rowOf(db)).name], ['pro', 'sub_real', 'Ten'])
})

test('AFTER the fix: ordinary profile columns still save, and an unchanged locked value is not a change', async () => {
  const db = await freshDb(true)
  await db.exec(`update public.tutors set subscription_status = 'pro' where id = '${TUTOR}'`)
  await asUser(db, TUTOR, () => db.query(
    `update public.tutors set name = 'Ten Two', bio = 'hi', paypal_link = 'https://paypal.me/ten', paddle_checkout_link = 'https://buy.stripe.com/x',
       currency = 'EUR', timezone = 'Asia/Ho_Chi_Minh', default_lesson_price = 25, buffer_minutes = 5, booking_url_active = true,
       subscription_status = 'pro', referral_credits = 0, stripe_onboarding_complete = false
     where id = '${TUTOR}'`))
  const row = await rowOf(db)
  assert.deepEqual([row.name, row.paypal_link, row.currency, row.subscription_status], ['Ten Two', 'https://paypal.me/ten', 'EUR', 'pro'])
  assert.ok(row.updated_at) // the existing updated_at trigger still runs
})

test('AFTER the fix: the service role and the database owner can still change them (webhook, upgrade route, Stripe onboarding)', async () => {
  const db = await freshDb(true)
  for (const [col, value] of LOCKED) {
    const r = await asRole(db, 'service_role', () => db.query(`update public.tutors set ${col} = ${value} where id = '${TUTOR}'`))
    assert.equal(r.affectedRows, 1, `service_role ${col}`)
  }
  await db.exec(`update public.tutors set subscription_status = 'free', referral_credits = 0 where id = '${TUTOR}'`) // postgres
  assert.equal((await rowOf(db)).subscription_status, 'free')
  // the webhook's exact write
  await asRole(db, 'service_role', () => db.query(
    `update public.tutors set subscription_status = 'pro', polar_subscription_id = 'sub_1', subscription_expires_at = now() where id = '${TUTOR}'`))
  assert.equal((await rowOf(db)).subscription_status, 'pro')
})

test('AFTER the fix: a new tutor can create their row with the starting values, not with a paid plan', async () => {
  const db = await freshDb(true)
  const insert = (extra: string, vals: string) => asUser(db, NEWBIE, () => db.query(
    `insert into public.tutors (id, email, name, slug${extra}) values ('${NEWBIE}', 'new@example.com', 'New', 'new'${vals})`))
  for (const [extra, vals] of [[', subscription_status', `, 'academy'`], [', polar_subscription_id', `, 'sub_x'`], [', referral_credits', `, 5`], [', stripe_account_id', `, 'acct_x'`], [', stripe_onboarding_complete', `, true`]]) {
    await assert.rejects(insert(extra, vals), /paid_columns_locked/, extra)
  }
  assert.equal((await db.query(`select 1 from public.tutors where id = '${NEWBIE}'`)).rows.length, 0)
  await insert(', subscription_status, referral_credits, stripe_onboarding_complete', `, 'free', 0, false`) // the starting values
  assert.equal((await rowOf(db, NEWBIE)).subscription_status, 'free')
})

test('AFTER the fix: a plain insert without those columns works (the register route and Google sign-in insert like this)', async () => {
  const db = await freshDb(true)
  await asRole(db, 'service_role', () => db.query(`insert into public.tutors (id, email, name, slug) values ('${NEWBIE}', 'new@example.com', 'New', 'new')`))
  assert.equal((await rowOf(db, NEWBIE)).subscription_status, 'free')
})

test('AFTER the fix: the plan limits hold again (a self-upgrade is refused, so the 11th student is refused)', async () => {
  const db = await freshDb(true)
  await asUser(db, TUTOR, async () => {
    for (let i = 0; i < 10; i++) await db.query(`insert into public.students (tutor_id, name) values ('${TUTOR}', 'S${i}')`)
  })
  await assert.rejects(asUser(db, TUTOR, () => db.query(`update public.tutors set subscription_status = 'pro' where id = '${TUTOR}'`)), /paid_columns_locked/)
  await assert.rejects(asUser(db, TUTOR, () => db.query(`insert into public.students (tutor_id, name) values ('${TUTOR}', 'one too many')`)), /student_limit_reached/)
})

test('AFTER the fix: other tutors and signed-out visitors still cannot touch the row (RLS is unchanged)', async () => {
  const db = await freshDb(true)
  const other = await asUser(db, OTHER, () => db.query(`update public.tutors set name = 'hacked' where id = '${TUTOR}'`))
  assert.equal(other.affectedRows, 0)
  const anon = await asRole(db, 'anon', () => db.query(`update public.tutors set name = 'hacked' where id = '${TUTOR}'`))
  assert.equal(anon.affectedRows, 0)
  assert.equal((await rowOf(db)).name, 'Ten')
})

test('the migration applies twice, adds exactly one trigger, and changes no existing data', async () => {
  const db = await freshDb(false)
  const before = await db.query(`select * from public.tutors order by id`)
  await db.exec(readMigration(FILE))
  await db.exec(readMigration(FILE))
  assert.deepEqual((await db.query(`select * from public.tutors order by id`)).rows, before.rows)
  const triggers = await db.query<{ tgname: string }>(
    `select tgname from pg_trigger where tgrelid = 'public.tutors'::regclass and not tgisinternal order by 1`)
  assert.deepEqual(triggers.rows.map(t => t.tgname), ['trg_lock_paid_tutor_columns', 'tutors_updated_at'])
})

test('a database that lacks one of the listed columns is not broken by the trigger', async () => {
  const db = await freshDb(false)
  await db.exec(`alter table public.tutors drop column polar_checkout_id; alter table public.tutors drop column referral_credits`)
  await db.exec(readMigration(FILE))
  await asUser(db, TUTOR, () => db.query(`update public.tutors set name = 'still works' where id = '${TUTOR}'`))
  await assert.rejects(asUser(db, TUTOR, () => db.query(`update public.tutors set subscription_status = 'pro' where id = '${TUTOR}'`)), /paid_columns_locked/)
  assert.equal((await rowOf(db)).name, 'still works')
})

// ---- 3. the app code that writes these columns must use the service role ------------------------------------

const LOCKED_NAMES = LOCKED.map(([c]) => c)

/** Every `<client>.from('tutors').update/insert({...})` in the code that writes a locked column, with the client's text. */
export function lockedWrites(source: string): { client: string; column: string }[] {
  const out: { client: string; column: string }[] = []
  for (const m of source.matchAll(/([\w.()!]*)\.from\('tutors'\)\s*\.(?:update|insert|upsert)\(\{([^}]*)\}/g)) {
    for (const column of LOCKED_NAMES) if (new RegExp(`\\b${column}\\b`).test(m[2])) out.push({ client: m[1], column })
  }
  return out
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(e.name) ? [full] : []
  })
}

test('scanner self-check: it finds a locked write and the client used', () => {
  const found = lockedWrites(`await supabase.from('tutors').update({ name: 'x', subscription_status: 'pro' }).eq('id', 1)`)
  assert.deepEqual(found, [{ client: 'supabase', column: 'subscription_status' }])
  assert.deepEqual(lockedWrites(`await createAdminClient().from('tutors').update({ stripe_account_id: a }).eq('id', u)`), [{ client: 'createAdminClient()', column: 'stripe_account_id' }])
  assert.deepEqual(lockedWrites(`await supabase.from('tutors').update({ name: 'x' }).eq('id', 1)`), [])
})

test('in the app code, a locked column is only ever written by the server (service-role client)', () => {
  const offenders: string[] = []
  const serverClients = /admin/i // createAdminClient(), admin(), admin
  // the Polar webhook builds its own service-role client and calls it `supabase`
  const webhook = path.join(SRC, 'app', 'api', 'webhooks', 'polar', 'route.ts')
  let seen = 0
  for (const file of sourceFiles(SRC)) {
    for (const w of lockedWrites(readFileSync(file, 'utf8'))) {
      seen++
      const ok = serverClients.test(w.client) || (file === webhook && /createClient\(\s*\n?\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL/.test(readFileSync(file, 'utf8')))
      if (!ok) offenders.push(`${path.relative(SRC, file)}: ${w.client}.from('tutors') writes ${w.column}`)
    }
  }
  assert.ok(seen >= 5, `expected the known writers, saw ${seen}`) // webhook (2 writes), upgrade route, onboard route, return page
  assert.deepEqual(offenders, [])
})

test('the Stripe onboarding route and the return page use the service-role client for their writes', () => {
  const route = readFileSync(path.join(SRC, 'app/api/stripe/connect/onboard/route.ts'), 'utf8')
  assert.ok(route.includes(`createAdminClient().from('tutors').update({ stripe_account_id: accountId })`))
  const page = readFileSync(path.join(SRC, 'app/settings/stripe/return/page.tsx'), 'utf8')
  assert.ok(page.includes(`createAdminClient().from('tutors').update({ stripe_onboarding_complete: complete })`))
})

test('the list of locked columns in the SQL matches the list in this test', () => {
  const sql = readMigration(FILE)
  for (const name of LOCKED_NAMES) assert.ok(sql.includes(`'${name}'`), name)
  assert.equal((sql.match(/'(?:subscription_status|subscription_expires_at|polar_subscription_id|polar_checkout_id|stripe_account_id|stripe_onboarding_complete|referral_credits)',?/g) ?? []).length >= LOCKED_NAMES.length, true)
})
