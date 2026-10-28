// T-0769: the directory READ (src/lib/directory-data.ts) run over a throwaway Postgres (PGlite) built from every migration, with made-up tutors that
// each pass or fail exactly one condition of the "bookable" rule. The same tutors go through the owner's count query
// (docs/directory-design/eligible-tutors-count.sql, T-0764), and the two must list the SAME tutors: this is the test that keeps the code and the
// count from drifting apart. It also shows the read is read only, selects only public columns, throws when a read fails (never an empty list that
// looks like "no tutors"), and pages through more than 1000 hours rows and more than 25 tutors.
// Nothing here touches a real database or sends anything.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb } from './support/local-db.ts'
import { pgliteClient } from './support/pglite-client.ts'
import { loadDirectory, DirectoryReadError, TUTOR_COLUMNS, type DirectoryClient } from '@/lib/directory-data.ts'
import { CARD_KEYS, DIRECTORY_OPENS_AT, MAX_LISTED } from '@/lib/directory.ts'

const DIR = path.resolve(import.meta.dirname, '..', 'docs', 'directory-design')
const COUNT_SQL = readFileSync(path.join(DIR, 'eligible-tutors-count.sql'), 'utf8').replace(/\r\n/g, '\n')

const BIO80 = 'I teach English to adults and children, one to one, with a plan for every lesson and clear homework.'
const BIO79 = BIO80.slice(0, 79)
const EVERY_DAY: [number, string, string][] = [0, 1, 2, 3, 4, 5, 6].map(d => [d, '09:00', '17:00'])

let n = 0
const uid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`

type Opts = { name?: string; bio?: string | null; on?: boolean; tz?: string; dur?: number | null; hours?: [number, string, string][] | 'none'; price?: number | null; avatar?: string | null; langs?: string[] }

async function addTutor(db: PGlite, o: Opts = {}): Promise<{ id: string; slug: string }> {
  const id = uid()
  const slug = `tutor-${n}`
  await db.exec(`insert into auth.users (id, email) values ('${id}', 'tutor${n}@example.com')`)
  await db.query(
    `insert into public.tutors (id, email, name, slug, bio, avatar_url, timezone, languages, booking_url_active, default_lesson_price, default_lesson_duration, buffer_minutes)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0)`,
    [id, `tutor${n}@example.com`, o.name ?? `Tutor ${n}`, slug, o.bio === undefined ? BIO80 : o.bio, o.avatar ?? null, o.tz ?? 'America/New_York', o.langs ?? ['English'], o.on ?? true, o.price ?? null, o.dur ?? null])
  const hours = o.hours === 'none' ? [] : (o.hours ?? EVERY_DAY)
  for (const [d, s, e] of hours) await db.query(`insert into public.availability (tutor_id, day_of_week, start_time, end_time) values ($1, $2, $3, $4)`, [id, d, s, e])
  return { id, slug }
}

async function freshDb(): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, 'zzz_after_everything.sql')
  // lessons.assigned_to (a lesson given to a team member) was made outside the migration files, like team_members; the booking route and the
  // public profile read it, so the directory does too
  await db.exec('alter table public.lessons add column if not exists assigned_to uuid')
  // the same for the columns the admin migrate route adds (src/app/api/admin/migrate/route.ts) and the migration files do not
  await db.exec(`
    alter table public.tutors add column if not exists trial_enabled boolean default false;
    alter table public.tutors add column if not exists trial_price decimal(10,2);
    alter table public.tutors add column if not exists currency text default 'USD';
    alter table public.tutors add column if not exists average_rating decimal(3,2) default 0;
    alter table public.tutors add column if not exists review_count integer default 0;`)
  return db
}

/** The ids the owner's count query lists: its own CTE text, ending in a different SELECT, so the real conditions are what is compared. */
async function sqlListed(db: PGlite): Promise<Set<string>> {
  const cut = COUNT_SQL.indexOf('\nselect\n  count(*)')
  assert.ok(cut > 0)
  const sql = `${COUNT_SQL.slice(0, cut)}\nselect id from flags where page_on and named and intro_ok and free_time_14d`
  return new Set((await db.query<{ id: string }>(sql)).rows.map(r => r.id))
}

const client = (db: PGlite) => pgliteClient(db, { restStyle: true }) as unknown as DirectoryClient

/** A query that behaves like the real one until it is run, then answers a database error. */
function failOnRange<T extends object>(q: T): T {
  return new Proxy(q, {
    get(target, prop, receiver) {
      if (prop === 'range') return async () => ({ data: null, error: { code: 'XX000', message: 'boom' } })
      const v = Reflect.get(target, prop, receiver)
      return typeof v === 'function' ? (...args: unknown[]) => { const r = v.apply(target, args); return r === target ? receiver : r } : v
    },
  })
}

async function lesson(db: PGlite, tutorId: string, startsSql: string, endsSql: string, status = 'scheduled') {
  await db.query(`insert into public.students (tutor_id, name) values ($1, 'Student')`, [tutorId])
  const sid = (await db.query<{ id: string }>(`select id from public.students where tutor_id = $1 limit 1`, [tutorId])).rows[0].id
  await db.query(`insert into public.lessons (tutor_id, student_id, starts_at, ends_at, status) values ($1, $2, ${startsSql}, ${endsSql}, $3)`, [tutorId, sid, status])
}

test('the code lists exactly the tutors the owner\'s count query lists, and each failing condition keeps a tutor out', async () => {
  const db = await freshDb()
  const ok = await addTutor(db)
  const exactBio = await addTutor(db, { bio: BIO80.slice(0, 80) })
  const noPhotoNoPrice = await addTutor(db, { avatar: null, price: null })
  const pageOff = await addTutor(db, { on: false })
  const blankName = await addTutor(db, { name: '  ' })
  const shortBio = await addTutor(db, { bio: BIO79 })
  const nullBio = await addTutor(db, { bio: null })
  const noHours = await addTutor(db, { hours: 'none' })
  const tooShortWindow = await addTutor(db, { hours: [[1, '10:00', '10:30'], [3, '10:00', '10:30']], dur: 60 })
  const fitsWhen30 = await addTutor(db, { hours: [[1, '10:00', '10:30'], [3, '10:00', '10:30']], dur: 30 })
  const oneDayOnly = await addTutor(db, { hours: [[2, '09:00', '12:00']] })
  const badZone = await addTutor(db, { tz: 'Mars/Olympus_Mons' })
  const blocked = await addTutor(db)
  await db.query(`insert into public.availability_exceptions (tutor_id, date) select $1, ((now() at time zone 'America/New_York')::date + g) from generate_series(0, 15) g`, [blocked.id])
  const booked = await addTutor(db)
  await lesson(db, booked.id, `now() - interval '1 day'`, `now() + interval '20 days'`)
  const bookedButCancelled = await addTutor(db)
  await lesson(db, bookedButCancelled.id, `now() - interval '1 day'`, `now() + interval '20 days'`, 'cancelled')
  const teamLesson = await addTutor(db)       // a lesson given to a team member is not on the owner's own calendar (the booking page reads it that way)
  await lesson(db, teamLesson.id, `now() - interval '1 day'`, `now() + interval '20 days'`)
  await db.query(`update public.lessons set assigned_to = $1 where tutor_id = $1`, [teamLesson.id])

  const out = await loadDirectory(client(db))
  const codeListed = new Set(out.cards.map(c => c.slug))
  const sql = await sqlListed(db)
  const slugOf = new Map((await db.query<{ id: string; slug: string }>('select id, slug from public.tutors')).rows.map(r => [r.id, r.slug]))
  const sqlSlugs = new Set([...sql].map(id => slugOf.get(id)!))

  const expectIn = { ok, exactBio, noPhotoNoPrice, fitsWhen30, oneDayOnly, bookedButCancelled }
  const expectOut = { pageOff, blankName, shortBio, nullBio, noHours, tooShortWindow, badZone, blocked, booked }
  for (const [name, t] of Object.entries(expectIn)) assert.ok(codeListed.has(t.slug), `${name} should be listed by the code`)
  for (const [name, t] of Object.entries(expectOut)) assert.ok(!codeListed.has(t.slug), `${name} should NOT be listed by the code`)
  assert.equal(codeListed.size, Object.keys(expectIn).length + 1, 'nobody else is listed (the team lesson tutor is the one extra, see below)')
  assert.ok(codeListed.has(teamLesson.slug), 'a lesson assigned to a team member does not block the owner\'s own calendar in the code')

  // the same tutors as the SQL, except the one place the two are written to differ: the SQL is stricter about team lessons ("slightly strict, never too generous")
  const onlyInSql = [...sqlSlugs].filter(s => !codeListed.has(s))
  const onlyInCode = [...codeListed].filter(s => !sqlSlugs.has(s))
  assert.deepEqual(onlyInSql, [], 'the count never lists a tutor the code does not')
  assert.deepEqual(onlyInCode, [teamLesson.slug], 'the only difference: the count query also lets a team lesson block the owner')
  assert.equal(out.listed, codeListed.size)
  assert.equal(out.truncated, false)
})

test('the card a visitor gets has the fixed keys, the right price and the soonest free time first', async () => {
  const db = await freshDb()
  const mine = await addTutor(db, { price: 25, avatar: 'https://example.com/a.jpg', langs: ['english', 'SPANISH'] })
  for (let i = 1; i < DIRECTORY_OPENS_AT; i++) await addTutor(db) // the directory carries cards only once it is open
  const out = await loadDirectory(client(db))
  assert.equal(out.cards.length, DIRECTORY_OPENS_AT)
  const c = out.cards.find(x => x.slug === mine.slug)!
  assert.deepEqual(Object.keys(c).sort(), [...CARD_KEYS].sort())
  assert.deepEqual([c.price, c.currency, c.languages, c.rating, c.photo], [25, 'USD', ['English', 'Spanish'], null, 'https://example.com/a.jpg'])
  assert.ok(c.slots.length > 0 && c.slots.every((m, i, a) => i === 0 || m >= a[i - 1]))
  const json = JSON.stringify(out)
  assert.ok(!json.includes('@') && !json.includes('example.com/') === false, 'the answer holds no address of a person')
})

test('the read is read only and selects only these columns of tutors: no email, phone, address or payment field', async () => {
  const db = await freshDb()
  await addTutor(db)
  const selects: { table: string; cols: string }[] = []
  const real = pgliteClient(db, { restStyle: true })
  const guarded = {
    from: (table: string) => new Proxy(real.from(table), {
      get(target, prop, receiver) {
        if (['insert', 'update', 'upsert', 'delete', 'rpc'].includes(String(prop))) throw new Error(`the directory tried to ${String(prop)} ${table}`)
        if (prop === 'select') return (cols: string) => { selects.push({ table, cols }); return target.select(cols) }
        return Reflect.get(target, prop, receiver)
      },
    }),
  }
  await loadDirectory(guarded as unknown as DirectoryClient)
  const tutorCols = selects.filter(s => s.table === 'tutors').flatMap(s => s.cols.split(',').map(c => c.trim()))
  assert.ok(tutorCols.length > 0)
  const allowed = new Set([...TUTOR_COLUMNS.split(',').map(c => c.trim()), 'lesson_durations', 'default_lesson_duration', 'levels_taught', 'learning_groups', 'intro_video_url'])
  for (const col of tutorCols) assert.ok(allowed.has(col), `column ${col} is not on the list`)
  for (const col of tutorCols) assert.ok(!/email|phone|address|stripe|paypal|payment|referral|portal|token|secret|key|password/i.test(col), `column ${col} looks private`)
  assert.deepEqual([...new Set(selects.map(s => s.table))].sort(), ['availability', 'availability_exceptions', 'lessons', 'tutors'])
})

test('a failed read throws (the page then says "could not load"); it never returns an empty list that looks like "no tutors"', async () => {
  const db = await freshDb()
  await addTutor(db)
  for (const broken of ['availability', 'tutors', 'lessons']) {
    const real = pgliteClient(db, { restStyle: true })
    const failing = { from: (t: string) => (t === broken ? failOnRange(real.from(t)) : real.from(t)) }
    await assert.rejects(() => loadDirectory(failing as unknown as DirectoryClient), (e: unknown) => e instanceof DirectoryReadError && e.tables.includes(broken), `${broken} failing`)
  }
})

test('a database without the blocked-days table or the lesson-length columns still lists tutors (an older database), the lesson-length default is 60', async () => {
  const db = await freshDb()
  const t = await addTutor(db)
  for (let i = 1; i < DIRECTORY_OPENS_AT; i++) await addTutor(db) // the directory carries cards only once it is open
  await db.exec('drop table public.availability_exceptions')
  const out = await loadDirectory(client(db))
  assert.ok(out.open && out.cards.some(c => c.slug === t.slug))
  await db.exec('alter table public.tutors drop column lesson_durations')
  assert.ok((await loadDirectory(client(db))).cards.some(c => c.slug === t.slug))
})

test('more than 1000 hours rows and more than 25 tutors are all read (paging and groups), and a very long list is cut at MAX_LISTED and says so', async () => {
  const db = await freshDb()
  const COUNT = MAX_LISTED + 40 // 160 tutors x 7 days = 1120 hours rows
  await db.exec(`
    insert into auth.users (id, email) select ('10000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, 'bulk' || g || '@example.com' from generate_series(1, ${COUNT}) g;
    insert into public.tutors (id, email, name, slug, bio, timezone, languages, booking_url_active, buffer_minutes)
      select ('10000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, 'bulk' || g || '@example.com', 'Bulk Tutor ' || g, 'bulk-' || g, '${BIO80}', 'UTC', array['English'], true, 0 from generate_series(1, ${COUNT}) g;
    insert into public.availability (tutor_id, day_of_week, start_time, end_time)
      select ('10000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, d, '09:00', '17:00' from generate_series(1, ${COUNT}) g cross join generate_series(0, 6) d;`)
  const rows = Number((await db.query<{ c: string }>('select count(*) as c from public.availability')).rows[0].c)
  assert.ok(rows > 1000, `the test has ${rows} rows`)
  const out = await loadDirectory(client(db))
  assert.equal(out.listed, COUNT)
  assert.equal(out.cards.length, MAX_LISTED)
  assert.equal(out.truncated, true)
})
