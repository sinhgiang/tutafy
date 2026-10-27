// T-0766: the profile-photo route /api/tutors/avatar. The REAL route runs over an in-memory database and a recording stand-in for the storage bucket:
// who may write (only the signed-in tutor, only their own photo, never somebody else's), which files are refused (wrong type, too big, not a
// picture), what is stored (the real type, no hidden notes, the tutor's own folder), what happens when something fails, and that nothing is
// created at run time. Nothing here reaches a service. All names and addresses are made up.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { NextRequest } from 'next/server.js'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import { GPS_NOTE, contains, gif, html, jpeg, png, svg, toBase64, webp } from './support/avatar-files.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const BASE = 'https://abc.supabase.test/storage/v1/object/public/tutor-avatars/'
const ORIGIN = 'https://www.tutafy.test'

let db: FakeDb
let session: { id: string; email: string } | null = null
type Stored = { path: string; type: string; bytes: Uint8Array }
let files: Stored[] = []
let removed: string[] = []
let bucketMissing = false
let createBucketCalls = 0
let failRowUpdate = false

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createClient: async () => ({
      auth: { getUser: async () => ({ data: { user: session } }) },
      // the tutor's own session: it can only change a row that is its own (what row level security does on the real database)
      from: (table: string) => {
        const q = db.from(table) as unknown as Record<string, (...a: unknown[]) => unknown>
        if (table !== 'tutors') return q
        return new Proxy(q, {
          get(target, prop) {
            if (prop === 'update') return (patch: Record<string, unknown>) => {
              if (failRowUpdate) return { eq: () => ({ select: async () => ({ data: null, error: { message: 'boom' } }) }) }
              const u = (target.update as (p: unknown) => Record<string, (...a: unknown[]) => unknown>)(patch)
              return { eq: (col: string, v: unknown) => (u.eq as (c: string, v: unknown) => unknown)(col, col === 'id' && v !== session?.id ? '__nobody__' : v) }
            }
            return Reflect.get(target, prop)
          },
        })
      },
    }),
    createAdminClient: () => ({
      storage: {
        createBucket: async () => { createBucketCalls++; return { data: null, error: null } },
        from: (bucket: string) => ({
          getPublicUrl: (p: string) => ({ data: { publicUrl: `${BASE}${p}` } }),
          upload: async (p: string, bytes: Uint8Array, opts: { contentType: string }) => {
            assert.equal(bucket, 'tutor-avatars')
            if (bucketMissing) return { data: null, error: { message: 'Bucket not found' } }
            files.push({ path: p, type: opts.contentType, bytes })
            return { data: { path: p }, error: null }
          },
          remove: async (paths: string[]) => { removed.push(...paths); files = files.filter(f => !paths.includes(f.path)); return { data: [], error: null } },
        }),
      },
    }),
  },
})

// The route keeps its limit in memory, per tutor, for 10 minutes: each test starts a day later, so one test never uses up the next one's uploads.
let fakeNow = Date.parse('2026-10-22T12:00:00Z')
mock.method(Date, 'now', () => fakeNow)

const route = await import('@/app/api/tutors/avatar/route.ts')

beforeEach(() => {
  fakeNow += 24 * 60 * 60 * 1000
  db = createFakeDb({ tutors: [{ id: A, email: 'a@example.com', name: 'Ana', slug: 'ana', avatar_url: null }, { id: B, email: 'b@example.com', name: 'Ben', slug: 'ben', avatar_url: null }] })
  session = { id: A, email: 'a@example.com' }
  files = []; removed = []; bucketMissing = false; createBucketCalls = 0; failRowUpdate = false
})

const row = (id: string) => db.tables.tutors.find(t => t.id === id)!
const post = (b: unknown, headers: Record<string, string> = { origin: ORIGIN, host: 'www.tutafy.test' }) =>
  route.POST(new NextRequest(`${ORIGIN}/api/tutors/avatar`, { method: 'POST', headers, body: typeof b === 'string' ? b : JSON.stringify(b) }))
const upload = (file: Uint8Array, extra: Record<string, unknown> = {}) => post({ image: toBase64(file), ...extra })
const del = (headers: Record<string, string> = { origin: ORIGIN, host: 'www.tutafy.test' }) => route.DELETE(new NextRequest(`${ORIGIN}/api/tutors/avatar`, { method: 'DELETE', headers }))

// ---- who may write -----------------------------------------------------------------------------------------------------------------

test('a good photo is saved in the tutor\'s own folder with its real type, the address is saved on their own row, and the notes in it are gone', async () => {
  const res = await upload(jpeg())
  assert.equal(res.status, 200)
  const { url } = await res.json() as { url: string }
  assert.equal(files.length, 1)
  assert.ok(files[0].path.startsWith(`${A}/`) && files[0].path.endsWith('.jpg'))
  assert.equal(files[0].type, 'image/jpeg')
  assert.equal(url, `${BASE}${files[0].path}`)
  assert.equal(row(A).avatar_url, url)
  assert.equal(row(B).avatar_url, null)
  assert.ok(!contains(files[0].bytes, GPS_NOTE), 'the stored file holds no location or camera note')
})

test('PNG and WebP are saved too, each with its own type and ending (the second replaces the first)', async () => {
  assert.equal((await upload(png())).status, 200)
  assert.deepEqual(files.map(f => [f.type, f.path.split('.').pop()]), [['image/png', 'png']])
  assert.equal((await upload(webp())).status, 200)
  assert.deepEqual(files.map(f => [f.type, f.path.split('.').pop()]), [['image/webp', 'webp']])
  assert.equal(removed.length, 1)
})

test('SECOND TUTOR: tutor B cannot write tutor A\'s photo, however the body is worded; the photo goes in B\'s folder and only B\'s row changes', async () => {
  session = { id: B, email: 'b@example.com' }
  const res = await upload(jpeg(), { tutorId: A, tutor_id: A, id: A, path: `${A}/mine.jpg`, avatar_url: 'https://evil.example.com/x.jpg', userId: A })
  assert.equal(res.status, 200)
  assert.ok(files[0].path.startsWith(`${B}/`) && !files[0].path.includes(A))
  assert.equal(row(B).avatar_url, `${BASE}${files[0].path}`)
  assert.equal(row(A).avatar_url, null, 'A\'s row is untouched')
  const d = await del()
  assert.equal(d.status, 200)
  assert.equal(row(A).avatar_url, null)
})

test('nobody signed in: 401 and nothing stored; a call from another site: 403 and nothing stored', async () => {
  session = null
  assert.equal((await upload(jpeg())).status, 401)
  assert.equal((await del()).status, 401)
  session = { id: A, email: 'a@example.com' }
  assert.equal((await post({ image: toBase64(jpeg()) }, { origin: 'https://evil.example.com', host: 'www.tutafy.test' })).status, 403)
  assert.equal((await post({ image: toBase64(jpeg()) }, { host: 'www.tutafy.test' })).status, 403, 'no Origin header at all')
  assert.equal((await del({ origin: 'https://evil.example.com', host: 'www.tutafy.test' })).status, 403)
  assert.deepEqual([files.length, row(A).avatar_url], [0, null])
})

test('a signed-in account that has no tutor row cannot save anything: the file is taken back and the answer is 500', async () => {
  session = { id: '33333333-3333-4333-8333-333333333333', email: 'nobody@example.com' }
  const res = await upload(jpeg())
  assert.equal(res.status, 500)
  assert.deepEqual([files.length, removed.length], [0, 1], 'the file that nothing points at is removed')
})

// ---- what is refused ------------------------------------------------------------------------------------------------------------------

test('the wrong kind of file is refused with 415 and nothing is stored: SVG, GIF, HTML, text', async () => {
  for (const file of [svg(), gif(), html(), new TextEncoder().encode('words')]) {
    const res = await upload(file)
    assert.equal(res.status, 415)
    assert.match((await res.json() as { error: string }).error, /JPG, PNG or WebP/)
  }
  assert.deepEqual([files.length, row(A).avatar_url], [0, null])
})

test('a file that says it is a photo but is not one is refused, and so is one that is too big, empty, or not base64', async () => {
  assert.equal((await upload(html(), { type: 'image/png', name: 'me.png' })).status, 415)
  const big = new Uint8Array(2 * 1024 * 1024 + 1); big.set(jpeg(false))
  assert.equal((await upload(big)).status, 413)
  assert.equal((await post({ image: '' })).status, 400)
  assert.equal((await post({})).status, 400)
  assert.equal((await post('not json at all')).status, 400)
  assert.equal((await post({ image: 'data:image/png;base64,AAAA' })).status, 400)
  assert.deepEqual([files.length, row(A).avatar_url], [0, null])
})

test('a body that says it is far too big is refused before it is read (413)', async () => {
  const res = await route.POST(new NextRequest(`${ORIGIN}/api/tutors/avatar`, {
    method: 'POST', headers: { origin: ORIGIN, host: 'www.tutafy.test', 'content-length': String(50 * 1024 * 1024) }, body: JSON.stringify({ image: toBase64(jpeg()) }),
  }))
  assert.equal(res.status, 413)
  assert.equal(files.length, 0)
})

test('at most 10 uploads in 10 minutes for one tutor; another tutor is not held back by it', async () => {
  const codes: number[] = []
  for (let i = 0; i < 11; i++) codes.push((await upload(jpeg())).status)
  assert.deepEqual(codes.slice(0, 10), Array(10).fill(200))
  assert.equal(codes[10], 429)
  session = { id: B, email: 'b@example.com' }
  assert.equal((await upload(jpeg())).status, 200)
})

// ---- replacing, removing and failing ---------------------------------------------------------------------------------------------

test('a new photo replaces the old one: the old file is removed once the new one is saved', async () => {
  const first = await (await upload(jpeg())).json() as { url: string }
  const second = await (await upload(png())).json() as { url: string }
  assert.notEqual(first.url, second.url, 'a new name every time')
  assert.equal(row(A).avatar_url, second.url)
  assert.deepEqual(files.map(f => `${BASE}${f.path}`), [second.url])
  assert.equal(removed.length, 1)
})

test('only the tutor\'s own old file is ever removed: a photo address in another tutor\'s folder, or on another site, is left alone', async () => {
  files.push({ path: `${B}/theirs.jpg`, type: 'image/jpeg', bytes: jpeg() })
  row(A).avatar_url = `${BASE}${B}/theirs.jpg` // an address a tutor wrote by hand
  await upload(jpeg())
  assert.ok(files.some(f => f.path === `${B}/theirs.jpg`), 'B\'s file is still there')
  assert.deepEqual(removed, [])
  row(A).avatar_url = 'https://elsewhere.example.com/me.jpg'
  await upload(jpeg())
  assert.deepEqual(removed, [])
  row(A).avatar_url = `${BASE}${B}/theirs.jpg`
  const d = await del()
  assert.equal(d.status, 200)
  assert.equal(row(A).avatar_url, null)
  assert.deepEqual(removed, [], 'removing a photo address that is not in the own folder deletes no file')
  assert.ok(files.some(f => f.path === `${B}/theirs.jpg`))
})

test('removing the photo clears the address and deletes the tutor\'s own file', async () => {
  await upload(jpeg())
  const mine = files[0].path
  const res = await del()
  assert.equal(res.status, 200)
  assert.equal(row(A).avatar_url, null)
  assert.deepEqual(removed, [mine])
  assert.equal(files.length, 0)
})

test('if the address cannot be saved, the new file is taken back and the old photo stays', async () => {
  const first = await (await upload(jpeg())).json() as { url: string }
  failRowUpdate = true
  const res = await upload(png())
  assert.equal(res.status, 500)
  assert.deepEqual(files.map(f => `${BASE}${f.path}`), [first.url], 'only the first file is left')
  assert.equal(row(A).avatar_url, first.url)
})

test('if the bucket has not been made yet the answer is 503 and nothing is created at run time', async () => {
  bucketMissing = true
  const res = await upload(jpeg())
  assert.equal(res.status, 503)
  assert.match((await res.json() as { error: string }).error, /not set up yet/)
  assert.equal(createBucketCalls, 0, 'the route never makes a bucket')
  assert.equal(row(A).avatar_url, null)
  const src = readFileSync(path.join(SRC, 'app/api/tutors/avatar/route.ts'), 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
  assert.ok(!/createBucket|updateBucket/.test(src))
})

test('the route file names no file type of its own and trusts no name, label or id from the body', () => {
  const src = readFileSync(path.join(SRC, 'app/api/tutors/avatar/route.ts'), 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
  assert.ok(!/formData|file\.name|file\.type|body\.(tutor|id|path|userId|avatar)/i.test(src))
  assert.match(src, /const path = `\$\{user\.id\}\//, 'the folder is the session\'s tutor id')
  assert.match(src, /\.eq\('id', user\.id\)/, 'the row is the session\'s tutor id')
})
