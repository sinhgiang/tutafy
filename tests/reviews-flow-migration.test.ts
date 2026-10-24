// 027_reviews_flow.sql is written but NOT applied to the real database (T-0898). It is run here on a throwaway in-memory Postgres (PGlite) on top of the
// migrations before it, to show: it applies cleanly and can be re-run; the old reviews are untouched and keep their old behaviour; the rules of the
// owner's answer W-2747 hold IN THE DATABASE (one review per student per tutor, at most three known tags, 500 characters, the tutor answers once and cannot
// edit or hide a review, the student edits for 7 days), including for the server's own key; and the second-person tests: a browser key (anon or a tutor)
// can read but never write, a tutor reads only their own reviews, and nobody with a browser key can read the invitations.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb, readMigration, migrationFiles } from './support/local-db.ts'

const FILE = '027_reviews_flow.sql'
const TA = '11111111-1111-4111-8111-111111111111'
const TB = '22222222-2222-4222-8222-222222222222'
const S1 = '33333333-3333-4333-8333-333333333331'
const S2 = '33333333-3333-4333-8333-333333333332'
const L1 = '44444444-4444-4444-8444-444444444441'
const L2 = '44444444-4444-4444-8444-444444444442'
const L3 = '44444444-4444-4444-8444-444444444443'
const OLD = '55555555-5555-4555-8555-555555555551'

async function freshDb(applyIt = true): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, FILE)
  await db.exec(`
    insert into auth.users (id, email) values ('${TA}', 'a@example.com'), ('${TB}', 'b@example.com');
    insert into public.tutors (id, email, name, slug) values ('${TA}', 'a@example.com', 'Tutor A', 'tutor-a'), ('${TB}', 'b@example.com', 'Tutor B', 'tutor-b');
    insert into public.students (id, tutor_id, name, email) values ('${S1}', '${TA}', 'Maria Kowalski', 's1@example.com'), ('${S2}', '${TA}', 'James Tan', 's2@example.com');
    insert into public.lessons (id, tutor_id, student_id, starts_at, ends_at, duration_minutes, status) values
      ('${L1}', '${TA}', '${S1}', now() - interval '3 days', now() - interval '3 days' + interval '1 hour', 60, 'completed'),
      ('${L2}', '${TA}', '${S1}', now() - interval '2 days', now() - interval '2 days' + interval '1 hour', 60, 'completed'),
      ('${L3}', '${TA}', '${S2}', now() - interval '2 days', now() - interval '2 days' + interval '1 hour', 60, 'completed');
    insert into public.reviews (id, lesson_id, student_id, tutor_id, rating, comment) values ('${OLD}', '${L1}', '${S1}', '${TA}', 4, 'old review');
  `)
  if (applyIt) await db.exec(readMigration(FILE))
  return db
}
async function as<T>(db: PGlite, role: 'anon' | 'authenticated' | 'service_role', userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId ?? ''}', false); set role ${role}`)
  try { return await fn() } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`) }
}
const denied = async (p: Promise<unknown>) => { await assert.rejects(p, /permission denied|row-level security|violates/i) }
const insertFlow = (db: PGlite, o: { lesson?: string; student?: string; tutor?: string; tags?: string; comment?: string; rating?: number; createdAgo?: string; isPublic?: boolean } = {}) =>
  db.query(`insert into public.reviews (lesson_id, student_id, tutor_id, rating, tags, comment, flow, is_public, created_at)
    values ($1, $2, $3, $4, ${o.tags ?? `'{patient}'`}::text[], $5, true, $6, now() - ($7)::interval) returning id`,
  [o.lesson ?? L2, o.student ?? S1, o.tutor ?? TA, o.rating ?? 5, o.comment ?? 'great', o.isPublic ?? true, o.createdAgo ?? '0 seconds'])

test('the migration file exists once, as number 027', () => {
  assert.deepEqual(migrationFiles().filter(f => f.startsWith('027_')), [FILE])
})

test('it applies on top of the earlier files and twice in a row, and an old review is untouched (flow false, no tags, no answer)', async () => {
  const db = await freshDb(false)
  await db.exec(readMigration(FILE))
  await db.exec(readMigration(FILE))
  const old = (await db.query<Record<string, unknown>>(`select rating, comment, is_public, flow, tags, tutor_reply, edited_at from public.reviews where id = '${OLD}'`)).rows[0]
  assert.deepEqual(old, { rating: 4, comment: 'old review', is_public: true, flow: false, tags: [], tutor_reply: null, edited_at: null })
})

test('old reviews keep behaving as before: several by one student for one tutor, a long comment, and edits at any time', async () => {
  const db = await freshDb()
  await db.query(`insert into public.reviews (lesson_id, student_id, tutor_id, rating, comment) values ($1, $2, $3, 2, $4)`, [L2, S1, TA, 'x'.repeat(900)])
  await db.exec(`update public.reviews set rating = 5, comment = 'changed' where id = '${OLD}'`)
  assert.equal((await db.query(`select 1 from public.reviews where student_id = '${S1}' and tutor_id = '${TA}'`)).rows.length, 2)
})

test('one review per student per tutor in the new flow; another student, or another tutor, is a separate review', async () => {
  const db = await freshDb()
  // the student's old review is a different kind of row; a new-flow one for the same tutor is the first of its kind
  await insertFlow(db, { lesson: L2 })
  await assert.rejects(insertFlow(db, { lesson: L1 }), /reviews_one_per_student_tutor|duplicate key/)
  await insertFlow(db, { lesson: L3, student: S2 })
})

test('the database holds the shape: at most three tags, only the six known ones, 500 characters, an answer needs its time', async () => {
  const db = await freshDb()
  await assert.rejects(insertFlow(db, { tags: `'{patient,fun,friendly,good_value}'` }), /reviews_flow_shape/)
  await assert.rejects(insertFlow(db, { tags: `'{brilliant}'` }), /reviews_flow_shape/)
  await assert.rejects(insertFlow(db, { comment: 'x'.repeat(501) }), /reviews_flow_shape/)
  await assert.rejects(insertFlow(db, { rating: 6 }), /rating|check/i)
  const ok = await insertFlow(db, { tags: `'{patient,fun,friendly}'`, comment: 'x'.repeat(500) })
  assert.equal(ok.rows.length, 1)
  await assert.rejects(db.exec(`update public.reviews set tutor_reply = 'thanks' where id = '${ok.rows[0].id}'`), /reviews_flow_shape/)
})

test('a student edits for 7 days: the edit works and is dated; the eighth day it is refused, even for the server\'s own key', async () => {
  const db = await freshDb()
  const fresh = (await insertFlow(db, { lesson: L2, createdAgo: '6 days' })).rows[0].id as string
  await as(db, 'service_role', null, () => db.exec(`update public.reviews set rating = 3, comment = 'edited', tags = '{fun}' where id = '${fresh}'`))
  const after = (await db.query<{ rating: number; comment: string; edited_at: string | null }>(`select rating, comment, edited_at from public.reviews where id = '${fresh}'`)).rows[0]
  assert.deepEqual([after.rating, after.comment, after.edited_at !== null], [3, 'edited', true])

  await db.exec(`delete from public.reviews where id = '${fresh}'`)
  const stale = (await insertFlow(db, { lesson: L2, createdAgo: '8 days' })).rows[0].id as string
  await assert.rejects(as(db, 'service_role', null, () => db.exec(`update public.reviews set rating = 1 where id = '${stale}'`)), /edited for 7 days/)
  await assert.rejects(db.exec(`update public.reviews set comment = 'later' where id = '${stale}'`), /edited for 7 days/)
})

test('a review keeps its student, tutor, lesson, date and kind: none of them can be changed', async () => {
  const db = await freshDb()
  const id = (await insertFlow(db)).rows[0].id as string
  for (const set of [`student_id = '${S2}'`, `tutor_id = '${TB}'`, `lesson_id = '${L1}'`, `created_at = now() - interval '30 days'`, `flow = false`]) {
    await assert.rejects(as(db, 'service_role', null, () => db.exec(`update public.reviews set ${set} where id = '${id}'`)), /keeps its student/, set)
  }
})

test('the tutor answers once: the first answer is saved with its time; a second, an edit and a blank one are refused, whoever asks', async () => {
  const db = await freshDb()
  const id = (await insertFlow(db, { createdAgo: '30 days' })).rows[0].id as string // the answer is not limited to the 7 days
  await assert.rejects(as(db, 'service_role', null, () => db.exec(`update public.reviews set tutor_reply = '   ', replied_at = now() where id = '${id}'`)), /needs text/)
  await as(db, 'service_role', null, () => db.exec(`update public.reviews set tutor_reply = 'Thank you!', replied_at = now() where id = '${id}'`))
  await assert.rejects(as(db, 'service_role', null, () => db.exec(`update public.reviews set tutor_reply = 'Changed', replied_at = now() where id = '${id}'`)), /answers a review once/)
  await assert.rejects(as(db, 'service_role', null, () => db.exec(`update public.reviews set tutor_reply = null, replied_at = null where id = '${id}'`)), /answers a review once/)
  assert.equal((await db.query<{ tutor_reply: string }>(`select tutor_reply from public.reviews where id = '${id}'`)).rows[0].tutor_reply, 'Thank you!')
})

test('second person: a browser key reads but never writes; anon sees only public reviews; a tutor reads their own and nobody else\'s', async () => {
  const db = await freshDb()
  const pub = (await insertFlow(db, { lesson: L2 })).rows[0].id as string
  const hidden = (await insertFlow(db, { lesson: L3, student: S2, isPublic: false })).rows[0].id as string
  await db.exec(`insert into public.students (id, tutor_id, name, email) values ('66666666-6666-4666-8666-666666666666', '${TB}', 'Other Student', 'o@example.com')`)
  await db.exec(`insert into public.lessons (id, tutor_id, student_id, starts_at, ends_at, duration_minutes, status) values ('77777777-7777-4777-8777-777777777777', '${TB}', '66666666-6666-4666-8666-666666666666', now() - interval '2 days', now() - interval '2 days' + interval '1 hour', 60, 'completed')`)
  const hiddenB = (await db.query<{ id: string }>(`insert into public.reviews (lesson_id, student_id, tutor_id, rating, flow, is_public) values ('77777777-7777-4777-8777-777777777777', '66666666-6666-4666-8666-666666666666', '${TB}', 5, true, false) returning id`)).rows[0].id

  const anonSees = await as(db, 'anon', null, async () => (await db.query<{ id: string }>(`select id from public.reviews`)).rows.map(r => r.id))
  assert.ok(anonSees.includes(pub) && !anonSees.includes(hidden), 'anon: the public ones only')

  const aSees = await as(db, 'authenticated', TA, async () => (await db.query<{ id: string }>(`select id from public.reviews`)).rows.map(r => r.id))
  assert.ok(aSees.includes(hidden), 'a tutor reads their own review even when it is not public')
  assert.ok(!aSees.includes(hiddenB), 'and not another tutor\'s review that is not public')

  // nobody writes with a browser key
  for (const role of ['anon', 'authenticated'] as const) {
    await as(db, role, role === 'authenticated' ? TA : null, async () => {
      await denied(db.exec(`update public.reviews set rating = 1 where id = '${pub}'`))
      await denied(db.exec(`update public.reviews set is_public = false where id = '${pub}'`))
      await denied(db.exec(`update public.reviews set tutor_reply = 'mine', replied_at = now() where id = '${pub}'`))
      await denied(db.exec(`delete from public.reviews where id = '${pub}'`))
      await denied(db.exec(`insert into public.reviews (student_id, tutor_id, rating, flow) values ('${S1}', '${TA}', 5, false)`))
    })
  }
  assert.equal((await db.query<{ rating: number }>(`select rating from public.reviews where id = '${pub}'`)).rows[0].rating, 5)
})

test('a tutor reads only their own hidden reviews: tutor B sees none of tutor A\'s that are not public', async () => {
  const db = await freshDb()
  const hidden = (await insertFlow(db, { isPublic: false })).rows[0].id as string
  const bSees = await as(db, 'authenticated', TB, async () => (await db.query(`select id from public.reviews where id = '${hidden}'`)).rows.length)
  assert.equal(bSees, 0)
})

test('the invitations table: no browser key reads or writes it; the server\'s key does', async () => {
  const db = await freshDb()
  await db.exec(`insert into public.review_invites (student_id, tutor_id, lesson_id) values ('${S1}', '${TA}', '${L1}')`)
  for (const role of ['anon', 'authenticated'] as const) {
    await as(db, role, role === 'authenticated' ? TA : null, async () => {
      await denied(db.query(`select * from public.review_invites`))
      await denied(db.exec(`insert into public.review_invites (student_id, tutor_id) values ('${S2}', '${TA}')`))
      await denied(db.exec(`update public.review_invites set stopped_at = now()`))
    })
  }
  const rows = await as(db, 'service_role', null, async () => (await db.query(`select * from public.review_invites`)).rows)
  assert.equal(rows.length, 1)
  await assert.rejects(db.exec(`insert into public.review_invites (student_id, tutor_id) values ('${S1}', '${TA}')`), /duplicate key|primary key/i)
})
