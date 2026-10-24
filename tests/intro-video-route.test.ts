// T-0915: the route /api/tutors/intro-video. The REAL route runs over an in-memory database: who may write (only the signed-in tutor, only their own row, a
// second tutor never), which links are refused (the server side of "only YouTube and Vimeo"), what is stored (the rebuilt address, not the typed text),
// what happens when the database is not ready or refuses. Nothing here reaches a service. All names are made up.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { NextRequest } from 'next/server.js'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const ORIGIN = 'https://www.tutafy.test'
const YT = 'dQw4w9WgXcQ'
const AT = '@' // joined into addresses below, so no line of this file reads as an email address (rule 4b)

let db: FakeDb
let session: { id: string; email: string } | null = null
let dbError: { code?: string; message: string } | null = null

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
              if (dbError) return { eq: () => ({ select: async () => ({ data: null, error: dbError }) }) }
              const u = (target.update as (p: unknown) => Record<string, (...a: unknown[]) => unknown>)(patch)
              return { eq: (col: string, v: unknown) => (u.eq as (c: string, v: unknown) => unknown)(col, col === 'id' && v !== session?.id ? '__nobody__' : v) }
            }
            return Reflect.get(target, prop)
          },
        })
      },
    }),
    createAdminClient: () => { throw new Error('the intro video route never needs the server key') },
  },
})

// The limit is kept in memory per tutor for 10 minutes: each test starts a day later, so one test never uses up the next one's calls.
let fakeNow = Date.parse('2026-10-24T12:00:00Z')
mock.method(Date, 'now', () => fakeNow)

const route = await import('@/app/api/tutors/intro-video/route.ts')

beforeEach(() => {
  fakeNow += 24 * 60 * 60 * 1000
  db = createFakeDb({ tutors: [{ id: A, email: 'a@example.com', name: 'Ana', slug: 'ana', intro_video_url: null }, { id: B, email: 'b@example.com', name: 'Ben', slug: 'ben', intro_video_url: 'https://vimeo.com/123456789' }] })
  session = { id: A, email: 'a@example.com' }
  dbError = null
})

const row = (id: string) => db.tables.tutors.find(t => t.id === id)!
const HEADERS = { origin: ORIGIN, host: 'www.tutafy.test' }
const post = (b: unknown, headers: Record<string, string> = HEADERS) =>
  route.POST(new NextRequest(`${ORIGIN}/api/tutors/intro-video`, { method: 'POST', headers, body: typeof b === 'string' ? b : JSON.stringify(b) }))
const del = (headers: Record<string, string> = HEADERS) => route.DELETE(new NextRequest(`${ORIGIN}/api/tutors/intro-video`, { method: 'DELETE', headers }))

test('a YouTube or Vimeo link is saved on the signed-in tutor\'s own row, as the rebuilt address and not the typed text', async () => {
  const res = await post({ url: `https://youtu.be/${YT}?si=tracking&t=9` })
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { url: `https://www.youtube.com/watch?v=${YT}`, provider: 'youtube' })
  assert.equal(row(A).intro_video_url, `https://www.youtube.com/watch?v=${YT}`)
  assert.equal(row(B).intro_video_url, 'https://vimeo.com/123456789', 'the other tutor is untouched')
  assert.equal((await post({ url: 'https://vimeo.com/987654321?h=abcdef0123456789' })).status, 200)
  assert.equal(row(A).intro_video_url, 'https://vimeo.com/987654321/abcdef0123456789')
})

test('SERVER SIDE: every other link is refused with a sentence and nothing is stored', async () => {
  row(A).intro_video_url = `https://www.youtube.com/watch?v=${YT}`
  const bad = [
    'https://evil.example/watch?v=' + YT, `https://youtube.com.evil.example/watch?v=${YT}`, `http://www.youtube.com/watch?v=${YT}`, 'javascript:alert(1)', 'data:text/html,x',
    `https://user:pass${AT}www.youtube.com/watch?v=${YT}`, 'https://www.youtube.com/@channel', 'https://vimeo.com/12', 'https://www.youtube.com/watch?v=<script>', 'not a link', '', '   ',
    'https://www.youtube-nocookie.com/embed/' + YT, `https://youtu.be/${YT} https://evil.example`,
  ]
  for (const url of bad) {
    const res = await post({ url })
    assert.equal(res.status, 400, url)
    const body = await res.json() as { error: string }
    assert.ok(body.error.length > 10 && !/undefined|null/.test(body.error), url)
    assert.equal(row(A).intro_video_url, `https://www.youtube.com/watch?v=${YT}`, `${url}: the saved video did not change`)
  }
  for (const body of [{}, { url: 5 }, { url: null }, { url: [`https://youtu.be/${YT}`] }, { link: `https://youtu.be/${YT}` }, [], 'x', null]) {
    assert.equal((await post(body as never)).status, 400, JSON.stringify(body))
  }
  assert.equal((await post('{not json')).status, 400)
})

test('SECOND TUTOR: B cannot write A\'s video, however the body is worded; only the session\'s own row changes', async () => {
  session = { id: B, email: 'b@example.com' }
  const res = await post({ url: `https://youtu.be/${YT}`, tutorId: A, tutor_id: A, id: A, userId: A, user_id: A })
  assert.equal(res.status, 200)
  assert.equal(row(B).intro_video_url, `https://www.youtube.com/watch?v=${YT}`)
  assert.equal(row(A).intro_video_url, null, 'A\'s row is untouched')
  assert.equal((await del()).status, 200)
  assert.equal(row(B).intro_video_url, null)
  assert.equal(row(A).intro_video_url, null)
})

test('a visitor who is not signed in is refused (401) and nothing is stored', async () => {
  session = null
  assert.equal((await post({ url: `https://youtu.be/${YT}` })).status, 401)
  assert.equal((await del()).status, 401)
  assert.equal(row(A).intro_video_url, null)
  assert.equal(row(B).intro_video_url, 'https://vimeo.com/123456789')
})

test('a call from another site is refused (403): the Origin must name this host', async () => {
  for (const headers of [{ origin: 'https://evil.example', host: 'www.tutafy.test' }, { host: 'www.tutafy.test' }, { origin: ORIGIN }, {}]) {
    assert.equal((await post({ url: `https://youtu.be/${YT}` }, headers)).status, 403, JSON.stringify(headers))
    assert.equal((await del(headers)).status, 403)
  }
  assert.equal(row(A).intro_video_url, null)
})

test('removing the video clears it on the tutor\'s own row', async () => {
  row(A).intro_video_url = `https://www.youtube.com/watch?v=${YT}`
  const res = await del()
  assert.equal(res.status, 200)
  assert.equal(row(A).intro_video_url, null)
})

test('a database without the column answers 503 "not available yet"; a refused value answers 400; any other failure answers 500, none shows database text', async () => {
  dbError = { code: '42703', message: 'column "intro_video_url" of relation "tutors" does not exist' }
  for (const res of [await post({ url: `https://youtu.be/${YT}` }), await del()]) {
    assert.equal(res.status, 503)
    const text = JSON.stringify(await res.json())
    assert.match(text, /not available yet/)
    assert.doesNotMatch(text, /column|relation|tutors/)
  }
  dbError = { code: '23514', message: 'new row violates check constraint "tutors_intro_video_url_valid"' }
  const refused = await post({ url: `https://youtu.be/${YT}` })
  assert.equal(refused.status, 400)
  assert.doesNotMatch(JSON.stringify(await refused.json()), /constraint|tutors_/)
  dbError = { code: 'XX000', message: 'boom with a secret detail' }
  for (const res of [await post({ url: `https://youtu.be/${YT}` }), await del()]) {
    assert.equal(res.status, 500)
    assert.doesNotMatch(JSON.stringify(await res.json()), /boom|secret/)
  }
})

test('a signed-in account with no tutor row cannot save (500, nothing is created)', async () => {
  session = { id: '33333333-3333-4333-8333-333333333333', email: 'c@example.com' }
  assert.equal((await post({ url: `https://youtu.be/${YT}` })).status, 500)
  assert.equal(db.tables.tutors.length, 2)
})

test('a body over 4 KB is refused before it is read, and the calls of one tutor are limited', async () => {
  assert.equal((await post({ url: 'x'.repeat(5000) }, { ...HEADERS, 'content-length': '5000' })).status, 413)
  let last = 200
  for (let i = 0; i < 40 && last !== 429; i++) last = (await post({ url: `https://youtu.be/${YT}` })).status
  assert.equal(last, 429, 'the 31st call in ten minutes is refused')
  session = { id: B, email: 'b@example.com' }
  assert.equal((await post({ url: `https://youtu.be/${YT}` })).status, 200, 'the limit is per tutor')
})
