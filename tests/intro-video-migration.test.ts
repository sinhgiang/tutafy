// T-0915: supabase/migrations/028_intro_video_and_established.sql run on a throwaway Postgres (PGlite, tests/support/local-db.ts). It adds the intro video
// link (a CHECK that accepts only the two rebuilt YouTube and Vimeo forms) and the function that gives the facts behind the "Established" badge (callable
// by the server's own key only). Nothing here touches a real database.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb, readMigration } from './support/local-db.ts'
import { parseIntroVideo } from '@/lib/intro-video.ts'

const FILE = '028_intro_video_and_established.sql'

async function fresh(): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, 'zzz_after_everything.sql')
  return db
}

async function tutor(db: PGlite, confirmed: string | null = '2026-03-03T10:00:00Z'): Promise<string> {
  const id = randomUUID()
  await db.query(`insert into auth.users (id, email, email_confirmed_at) values ($1, $2, $3)`, [id, `${id.slice(0, 8)}@example.com`, confirmed])
  await db.query(`insert into public.tutors (id, email, name, slug) values ($1, $2, 'Test Tutor', $3)`, [id, `${id.slice(0, 8)}@example.com`, `t-${id.slice(0, 8)}`])
  return id
}

async function lessons(db: PGlite, tutorId: string, n: number, status = 'completed', startDaysAgo = 100) {
  const student = (await db.query<{ id: string }>(`insert into public.students (tutor_id, name) values ($1, 'S') returning id`, [tutorId])).rows[0].id
  for (let i = 0; i < n; i++) {
    await db.query(
      `insert into public.lessons (tutor_id, student_id, starts_at, ends_at, status) values ($1, $2, now() - ($3 || ' days')::interval, now() - ($3 || ' days')::interval + interval '1 hour', $4)`,
      [tutorId, student, String(startDaysAgo - i), status],
    )
  }
}

test('the column accepts the two rebuilt forms and nothing else (the same forms the code makes)', async () => {
  const db = await fresh()
  const id = await tutor(db)
  const good = ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://vimeo.com/123456789', 'https://vimeo.com/123456789/abcdef0123456789', null]
  for (const url of good) {
    await db.query(`update public.tutors set intro_video_url = $1 where id = $2`, [url, id])
  }
  // what the code rebuilds from a pasted link is exactly what the database accepts
  for (const pasted of ['https://youtu.be/dQw4w9WgXcQ', 'https://youtube.com/shorts/dQw4w9WgXcQ', 'https://vimeo.com/123456789?h=abcdef0123456789']) {
    const parsed = parseIntroVideo(pasted)
    assert.ok(parsed.ok, pasted)
    if (parsed.ok) await db.query(`update public.tutors set intro_video_url = $1 where id = $2`, [parsed.video.canonical, id])
  }
  const bad = [
    'http://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&autoplay=1', 'https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ', 'https://evil.example/https://vimeo.com/123456789',
    'javascript:alert(1)', 'https://vimeo.com/12345', 'https://vimeo.com/123456789/ZZZZ', 'https://vimeo.com/123456789/abcdef0123456789/extra', '',
    `https://vimeo.com/${'1'.repeat(301)}`, 'https://vimeo.com/123456789\n<script>',
  ]
  for (const url of bad) {
    await assert.rejects(() => db.query(`update public.tutors set intro_video_url = $1 where id = $2`, [url, id]), /tutors_intro_video_url_valid/, JSON.stringify(url).slice(0, 60))
  }
})

test('a tutor can set the column only on their own row (the existing policy), and a visitor cannot read it', async () => {
  const db = await fresh()
  const mine = await tutor(db)
  const other = await tutor(db)
  await db.exec(`set role authenticated`)
  try {
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [mine])
    assert.equal((await db.query(`update public.tutors set intro_video_url = 'https://vimeo.com/123456789' where id = $1`, [mine])).affectedRows, 1)
    assert.equal((await db.query(`update public.tutors set intro_video_url = 'https://vimeo.com/123456789' where id = $1`, [other])).affectedRows, 0, 'not the other tutor\'s row')
  } finally {
    await db.exec('reset role')
  }
  await db.exec(`set role anon`)
  try {
    await assert.rejects(() => db.query(`select intro_video_url from public.tutors`), /permission denied/, 'a visitor reads no tutor column (025)')
  } finally {
    await db.exec('reset role')
  }
})

test('the facts function: confirmed date, completed lessons that have started, and the date of the tenth', async () => {
  const db = await fresh()
  const nine = await tutor(db)
  const ten = await tutor(db)
  const noEmail = await tutor(db, null)
  await lessons(db, nine, 9)
  await lessons(db, ten, 12)
  await lessons(db, ten, 4, 'cancelled', 50) // cancelled lessons never count
  await lessons(db, ten, 3, 'scheduled', 20)
  await db.query(`insert into public.lessons (tutor_id, student_id, starts_at, ends_at, status) select $1, id, now() + interval '3 days', now() + interval '3 days 1 hour', 'completed' from public.students where tutor_id = $1 limit 1`, [ten]) // a "completed" lesson in the future is not held yet
  const rows = (await db.query<{ tutor_id: string; email_confirmed_at: string | null; completed_lessons: number; tenth_lesson_at: string | null }>(
    `select * from public.tutor_established_facts(array[$1, $2, $3]::uuid[])`, [nine, ten, noEmail])).rows
  const by = new Map(rows.map(r => [r.tutor_id, r]))
  assert.equal(by.get(nine)!.completed_lessons, 9)
  assert.equal(by.get(nine)!.tenth_lesson_at, null, 'nine lessons: no tenth')
  assert.ok(by.get(nine)!.email_confirmed_at)
  assert.equal(by.get(ten)!.completed_lessons, 12)
  assert.ok(by.get(ten)!.tenth_lesson_at, 'the tenth has a date')
  assert.equal(by.get(noEmail)!.email_confirmed_at, null)
  assert.equal(by.get(noEmail)!.completed_lessons, 0)
  // the tenth is the tenth by start time: 100 down to 89 days ago, so the tenth is 91 days ago
  const tenth = new Date(by.get(ten)!.tenth_lesson_at as string).getTime()
  const ninetyOneDaysAgo = Date.now() - 91 * 86400000
  assert.ok(Math.abs(tenth - ninetyOneDaysAgo) < 2 * 86400000, 'the date of the tenth lesson')
})

test('only the server\'s own key may call the facts function; a signed-in tutor and a visitor are refused', async () => {
  const db = await fresh()
  const id = await tutor(db)
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`)
    try {
      await assert.rejects(() => db.query(`select * from public.tutor_established_facts(array[$1]::uuid[])`, [id]), /permission denied for function/, role)
    } finally {
      await db.exec('reset role')
    }
  }
  await db.exec(`set role service_role`)
  try {
    assert.equal((await db.query(`select * from public.tutor_established_facts(array[$1]::uuid[])`, [id])).rows.length, 1)
  } finally {
    await db.exec('reset role')
  }
  // it returns a date and two numbers, never an address
  const cols = (await db.query<{ column_name: string }>(`select p.proargnames as n from pg_proc p where p.proname = 'tutor_established_facts'`)).rows
  assert.ok(cols.length === 1)
  const names = (await db.query<{ n: string[] }>(`select proargnames as n from pg_proc where proname = 'tutor_established_facts'`)).rows[0].n
  assert.ok(!names.some(n => /email$|name$|password|token/i.test(n) && n !== 'email_confirmed_at'), names.join(','))
})

test('running the file again changes nothing, and it is honest about not being applied', async () => {
  const db = await fresh()
  const id = await tutor(db)
  await db.query(`update public.tutors set intro_video_url = 'https://vimeo.com/123456789' where id = $1`, [id])
  await db.exec(readMigration(FILE))
  await db.exec(readMigration(FILE))
  assert.equal((await db.query<{ intro_video_url: string }>(`select intro_video_url from public.tutors where id = $1`, [id])).rows[0].intro_video_url, 'https://vimeo.com/123456789')
  const sql = readMigration(FILE)
  assert.match(sql, /WRITTEN BUT NOT APPLIED/)
  const code = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
  assert.ok(!/\bdrop\s+(table|column|policy|function)|delete\b|truncate\b|create\s+policy|update\s+public/i.test(code), 'it changes no row and no policy')
})
