// T-0766: supabase/migrations/024_tutor_avatars.sql run on a throwaway Postgres (PGlite) that has a small stand-in of Supabase's storage tables
// (tests/support/local-db.ts). It makes ONE bucket, public, limited to 2 MB and three picture types, and it gives no browser a way to write:
// row level security is on for storage.objects and the file adds no policy, so only the server's own key can upload. Nothing here touches a real database.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb, readMigration } from './support/local-db.ts'
import { MAX_AVATAR_BYTES, AVATAR_TYPES } from '@/lib/avatar-image.ts'

const FILE = '024_tutor_avatars.sql'

async function fresh(): Promise<PGlite> {
  const db = await newDb()
  await applyMigrationsBefore(db, 'zzz_after_everything.sql')
  return db
}

test('the file makes one public bucket with the same size and type limits as the code that checks a photo', async () => {
  const db = await fresh()
  const rows = (await db.query<{ id: string; public: boolean; file_size_limit: string; allowed_mime_types: string[] }>(`select * from storage.buckets where id = 'tutor-avatars'`)).rows
  assert.equal(rows.length, 1)
  assert.equal(rows[0].public, true)
  assert.equal(Number(rows[0].file_size_limit), MAX_AVATAR_BYTES)
  assert.deepEqual([...rows[0].allowed_mime_types].sort(), Object.keys(AVATAR_TYPES).sort())
})

test('running it again changes nothing, and puts the limits back if someone loosened them', async () => {
  const db = await fresh()
  await db.exec(`update storage.buckets set public = false, file_size_limit = 99999999, allowed_mime_types = array['image/svg+xml'] where id = 'tutor-avatars'`)
  await db.exec(readMigration(FILE))
  await db.exec(readMigration(FILE))
  const rows = (await db.query<{ public: boolean; file_size_limit: string; allowed_mime_types: string[] }>(`select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'tutor-avatars'`)).rows
  assert.equal(rows.length, 1)
  assert.deepEqual([rows[0].public, Number(rows[0].file_size_limit), [...rows[0].allowed_mime_types].sort()], [true, MAX_AVATAR_BYTES, Object.keys(AVATAR_TYPES).sort()])
  assert.equal((await db.query(`select 1 from storage.buckets`)).rows.length, 1, 'no other bucket')
})

test('no browser can write to the bucket: no policy on storage.objects, so a signed-in tutor or a visitor is refused', async () => {
  const db = await fresh()
  assert.equal((await db.query(`select 1 from pg_policies where schemaname = 'storage'`)).rows.length, 0)
  assert.equal((await db.query<{ rowsecurity: boolean }>(`select relrowsecurity as rowsecurity from pg_class where oid = 'storage.objects'::regclass`)).rows[0].rowsecurity, true)
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`)
    try {
      await assert.rejects(() => db.query(`insert into storage.objects (bucket_id, name) values ('tutor-avatars', '11111111-1111-4111-8111-111111111111/x.jpg')`), /row-level security/i, `${role} cannot upload`)
      assert.deepEqual((await db.query(`update storage.objects set name = 'x' where bucket_id = 'tutor-avatars'`)).affectedRows, 0, `${role} cannot rename`)
      assert.deepEqual((await db.query(`delete from storage.objects where bucket_id = 'tutor-avatars'`)).affectedRows, 0, `${role} cannot delete`)
    } finally {
      await db.exec('reset role')
    }
  }
  // the server's own role is the one writer
  await db.exec(`set role service_role`)
  try {
    await db.query(`insert into storage.objects (bucket_id, name) values ('tutor-avatars', '11111111-1111-4111-8111-111111111111/x.jpg')`)
    assert.equal((await db.query(`select 1 from storage.objects`)).rows.length, 1)
  } finally {
    await db.exec('reset role')
  }
})

test('the file adds no policy, touches no table of ours, and says plainly that it is not applied', () => {
  const sql = readMigration(FILE)
  const code = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
  assert.ok(!/create\s+policy|alter\s+policy|grant\b|public\.tutors|drop\b|delete\b|truncate\b/i.test(code))
  assert.match(sql, /WRITTEN BUT NOT APPLIED/)
  assert.deepEqual([...code.matchAll(/\b(?:insert\s+into|alter\s+table|create\s+table)\s+([\w.]+)/gi)].map(m => m[1].toLowerCase()), ['storage.buckets'])
})
