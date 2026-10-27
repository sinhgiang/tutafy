// The two read-only queries in docs/directory-design (T-0764) count the tutors the directory would list under the proposed "bookable" rule.
// The owner runs them on the real database; here they are run on a throwaway in-memory Postgres (PGlite) built from every migration file,
// with made-up tutors that each fail (or pass) exactly one condition of the rule. Nothing here touches a real database or sends anything.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb } from './support/local-db.ts'

const DIR = path.resolve(import.meta.dirname, '..', 'docs', 'directory-design')
// A Windows checkout may turn line ends into CRLF while the tests cut the text at a newline, so read it with LF only.
const readSql = (name: string) => readFileSync(path.join(DIR, name), 'utf8').replace(/\r\n/g, '\n')
const COUNT_SQL = readSql('eligible-tutors-count.sql')
const LANG_SQL = readSql('eligible-tutors-by-language.sql')

const BIO80 = 'I teach English to adults and children, one to one, with a plan for every lesson and clear homework.' // 100 characters
const BIO79 = BIO80.slice(0, 79)
const BIO_EXACT_80 = BIO80.slice(0, 80)

let n = 0
const uid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`

type Opts = {
  name?: string; email?: string; bio?: string | null; on?: boolean; tz?: string; avatar?: string | null; price?: number | null
  langs?: string[]; dur?: number | null; buffer?: number | null; hours?: [number, string, string][] | 'none'
}
const EVERY_DAY: [number, string, string][] = [0, 1, 2, 3, 4, 5, 6].map(d => [d, '09:00', '17:00'])

async function addTutor(db: PGlite, o: Opts = {}): Promise<string> {
  const id = uid()
  const email = o.email ?? `tutor${n}@example.com`
  await db.exec(`insert into auth.users (id, email) values ('${id}', '${email}')`)
  await db.query(
    `insert into public.tutors (id, email, name, slug, bio, avatar_url, timezone, languages, booking_url_active, default_lesson_price, default_lesson_duration, buffer_minutes)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [id, email, o.name ?? `Tutor ${n}`, `tutor-${n}`, o.bio === undefined ? BIO80 : o.bio, o.avatar ?? null, o.tz ?? 'America/New_York',
      o.langs ?? ['English'], o.on ?? true, o.price ?? null, o.dur ?? null, o.buffer ?? 0])
  const hours = o.hours === 'none' ? [] : (o.hours ?? EVERY_DAY)
  for (const [d, s, e] of hours) await db.query(`insert into public.availability (tutor_id, day_of_week, start_time, end_time) values ($1, $2, $3, $4)`, [id, d, s, e])
  return id
}

async function freshDb(): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, 'zzz_after_everything.sql')
  return db
}

/** The ids the rule lists: the queries' own CTE text, ending in a different SELECT, so the real conditions are what is tested. */
async function eligibleIds(db: PGlite): Promise<Set<string>> {
  const cut = COUNT_SQL.indexOf('\nselect\n  count(*)')
  assert.ok(cut > 0, 'the count query ends in the final select the test expects')
  const sql = `${COUNT_SQL.slice(0, cut)}\nselect id from flags where page_on and named and intro_ok and free_time_14d`
  return new Set((await db.query<{ id: string }>(sql)).rows.map(r => r.id))
}

async function oneRow(db: PGlite, sql: string): Promise<Record<string, number>> {
  const r = (await db.query<Record<string, string | number>>(sql)).rows[0]
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v)]))
}

test('each condition of the rule decides on its own: a tutor who passes all of them is listed, one who fails any single one is not', async () => {
  const db = await freshDb()
  const ok = await addTutor(db)
  const pageOff = await addTutor(db, { on: false })
  const blankName = await addTutor(db, { name: '  ' })
  const shortBio = await addTutor(db, { bio: BIO79 })
  const exactBio = await addTutor(db, { bio: BIO_EXACT_80 })
  const nullBio = await addTutor(db, { bio: null })
  const noHours = await addTutor(db, { hours: 'none' })
  const tooShortWindow = await addTutor(db, { hours: [[1, '10:00', '10:30'], [3, '10:00', '10:30']], dur: 60 })   // a 60 minute lesson does not fit in 30 minutes
  const fitsWhen30 = await addTutor(db, { hours: [[1, '10:00', '10:30'], [3, '10:00', '10:30']], dur: 30 })
  const oneDayOnly = await addTutor(db, { hours: [[2, '09:00', '12:00']] })                                          // any weekday comes round inside 14 days
  const badZone = await addTutor(db, { tz: 'Mars/Olympus_Mons' })
  const blocked = await addTutor(db)
  await db.query(`insert into public.availability_exceptions (tutor_id, date)
                  select $1, ((now() at time zone 'America/New_York')::date + g) from generate_series(0, 15) g`, [blocked])
  const booked = await addTutor(db)
  await db.query(`insert into public.students (tutor_id, name) values ($1, 'Student') `, [booked])
  const student = (await db.query<{ id: string }>(`select id from public.students where tutor_id = $1`, [booked])).rows[0].id
  await db.query(`insert into public.lessons (tutor_id, student_id, starts_at, ends_at, status) values ($1, $2, now() - interval '1 day', now() + interval '20 days', 'scheduled')`, [booked, student])
  const bookedButCancelled = await addTutor(db)
  await db.query(`insert into public.students (tutor_id, name) values ($1, 'Student')`, [bookedButCancelled])
  const student2 = (await db.query<{ id: string }>(`select id from public.students where tutor_id = $1`, [bookedButCancelled])).rows[0].id
  await db.query(`insert into public.lessons (tutor_id, student_id, starts_at, ends_at, status) values ($1, $2, now() - interval '1 day', now() + interval '20 days', 'cancelled')`, [bookedButCancelled, student2])

  const listed = await eligibleIds(db)
  const expectIn = { ok, exactBio, fitsWhen30, oneDayOnly, bookedButCancelled }
  const expectOut = { pageOff, blankName, shortBio, nullBio, noHours, tooShortWindow, badZone, blocked, booked }
  for (const [name, id] of Object.entries(expectIn)) assert.ok(listed.has(id), `${name} should be listed`)
  for (const [name, id] of Object.entries(expectOut)) assert.ok(!listed.has(id), `${name} should NOT be listed`)
  assert.equal(listed.size, Object.keys(expectIn).length, 'nobody else is listed')
})

test('the buffer between lessons and the 1-hour lead time both count, the way the booking page counts slots', async () => {
  const db = await freshDb()
  // Hours 09:00-11:30 every day, 60-minute lessons, 30-minute buffer: the slots are 09:00 and 10:30. A lesson 09:00-10:30 every day takes the
  // first one, and 10:30 is free only because the step is lesson + buffer (without the buffer the second slot would be 10:00, inside the lesson).
  const buffered = await addTutor(db, { hours: EVERY_DAY.map(([d]) => [d, '09:00', '11:30'] as [number, string, string]), dur: 60, buffer: 30 })
  await db.query(`insert into public.students (tutor_id, name) values ($1, 'Student')`, [buffered])
  const st = (await db.query<{ id: string }>(`select id from public.students where tutor_id = $1`, [buffered])).rows[0].id
  await db.query(
    `insert into public.lessons (tutor_id, student_id, starts_at, ends_at, status)
     select $1, $2, ((now() at time zone 'America/New_York')::date + g + time '09:00') at time zone 'America/New_York',
            ((now() at time zone 'America/New_York')::date + g + time '10:30') at time zone 'America/New_York', 'scheduled'
     from generate_series(-1, 16) g`, [buffered, st])
  // One weekly slot at 00:00 on today's weekday (New York), every other day blocked: today's 00:00 is already past, so nothing can be booked.
  const dow = Number((await db.query<{ d: string }>(`select extract(dow from now() at time zone 'America/New_York')::int as d`)).rows[0].d)
  const pastOnly = await addTutor(db, { hours: [[dow, '00:00', '00:30']], dur: 30 })
  await db.query(
    `insert into public.availability_exceptions (tutor_id, date)
     select $1, ((now() at time zone 'America/New_York')::date + g) from generate_series(1, 15) g`, [pastOnly])
  const listed = await eligibleIds(db)
  assert.ok(listed.has(buffered), 'the slot after the buffer is free, so the tutor is listed')
  assert.ok(!listed.has(pastOnly), 'a slot that has already started does not count')
})

test('a photo and a price are not needed to be listed; they only change the extra counts', async () => {
  const db = await freshDb()
  await addTutor(db)                                                       // no photo, no price
  await addTutor(db, { avatar: 'https://example.com/a.jpg', price: 25 })   // both
  await addTutor(db, { price: 0 })                                         // a price of 0 is not a price
  const r = await oneRow(db, COUNT_SQL)
  assert.equal(r.eligible, 3)
  assert.equal(r.eligible_and_photo, 1)
  assert.equal(r.eligible_and_priced, 1)
})

test('the count query returns one row of counts that add up, and counts test addresses and unknown time zones apart', async () => {
  const db = await freshDb()
  await addTutor(db, { email: 'someone@example.com' })                     // test-like address, eligible
  await addTutor(db, { email: 'real.person@mail.example.com' })                   // eligible
  await addTutor(db, { on: false })
  await addTutor(db, { bio: BIO79 })
  await addTutor(db, { hours: 'none' })
  await addTutor(db, { tz: 'Nowhere/Land' })
  const rows = (await db.query(COUNT_SQL)).rows
  assert.equal(rows.length, 1, 'exactly one row')
  const r = await oneRow(db, COUNT_SQL)
  assert.deepEqual(r, {
    tutors_total: 6, page_on: 5, page_on_named: 5, page_on_intro_ok: 4, page_on_free_time_14d: 3, eligible: 2,
    eligible_and_priced: 0, eligible_and_photo: 0, eligible_test_like_accounts: 1, page_on_unknown_time_zone: 1,
  })
  // the funnel only goes down
  assert.ok(r.tutors_total >= r.page_on && r.page_on >= r.page_on_free_time_14d && r.page_on_free_time_14d >= r.eligible)
})

test('the language query counts each eligible tutor once per language they teach, and ignores everybody else', async () => {
  const db = await freshDb()
  await addTutor(db, { langs: ['english', 'Spanish'] })
  await addTutor(db, { langs: ['English'] })
  await addTutor(db, { langs: [' german '] })
  await addTutor(db, { langs: ['English'], on: false })        // page off: not counted
  await addTutor(db, { langs: ['French'], hours: 'none' })     // no hours: not counted
  await addTutor(db, { langs: [] })
  const rows = (await db.query<{ language: string; eligible_tutors: string }>(LANG_SQL)).rows.map(r => [r.language, Number(r.eligible_tutors)])
  assert.deepEqual(rows, [['English', 2], ['German', 1], ['Spanish', 1]])
})

test('the two queries share one rule: the text from "with" down to the end of "flags" is identical', () => {
  const block = (s: string) => s.slice(s.indexOf('\nwith\n'), s.indexOf('\nselect', s.indexOf('flags as (')))
  assert.ok(block(COUNT_SQL).length > 1000, 'the shared block is really there')
  assert.equal(block(LANG_SQL), block(COUNT_SQL))
})

test('both queries are read only: no write keyword outside comments, and they run inside a read-only transaction', async () => {
  const strip = (s: string) => s.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
  const forbidden = /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|vacuum|call|do)\b/i
  for (const [name, sql] of [['count', COUNT_SQL], ['language', LANG_SQL]] as const) {
    assert.ok(!forbidden.test(strip(sql)), `${name} query has a write keyword`)
    assert.equal(strip(sql).split(';').filter(x => x.trim()).length, 1, `${name} query is a single statement`)
  }
  const db = await freshDb()
  await addTutor(db)
  await db.exec('begin transaction read only')
  try {
    await db.query(COUNT_SQL)
    await db.query(LANG_SQL)
    // the proof method itself works: a write in the same kind of transaction is refused
    await assert.rejects(() => db.query(`update public.tutors set name = 'x'`), /read-only/i)
  } finally {
    await db.exec('rollback')
  }
})

test('the queries read only these tables: tutors, availability, availability_exceptions, lessons (and the time zone list)', () => {
  const tables = [...(COUNT_SQL + LANG_SQL).matchAll(/\b(?:from|join)\s+(public\.\w+|pg_timezone_names)/gi)].map(m => m[1].toLowerCase())
  assert.deepEqual([...new Set(tables)].sort(), ['pg_timezone_names', 'public.availability', 'public.availability_exceptions', 'public.lessons', 'public.tutors'])
})
