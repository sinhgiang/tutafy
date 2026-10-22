// T-0774: the proxy (src/proxy.ts) runs before every page and used to read the tutors table with the PUBLIC key in two places:
//   - the custom domain of a tutor (white-label booking page): which slug belongs to this host;
//   - "is this signed-in account a tutor?", before it opens the dashboard.
// Once docs/tutors-rls/025_tutors_not_public_proposal.sql has run, the public key reads nothing from that table, so the first would stop serving
// every custom domain and the second would answer "not a tutor" for EVERY tutor and send them all to the student sign-in. Both are proven here on a
// throwaway Postgres (PGlite) made from every migration WITH the fix applied, with the proxy's own requests answered by that database as the role
// its key stands for. Nothing here reaches a service; every address is example.com.
import { test, mock, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb } from './support/local-db.ts'
import { pgliteClient } from './support/pglite-client.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PROPOSAL = path.join(ROOT, 'docs', 'tutors-rls', '025_tutors_not_public_proposal.sql')

const ON = '11111111-1111-4111-8111-111111111111' // a tutor, booking page on, with a custom domain
const OFF = '22222222-2222-4222-8222-222222222222' // a tutor, booking page OFF, with a custom domain
const STUDENT = '33333333-3333-4333-8333-333333333333' // signed in, not a tutor
const ANON_KEY = 'anon-key-for-this-test'
const SERVER_KEY = 'server-key-for-this-test'

let pg: PGlite
let signedIn: { id: string; email: string } | null = null
const requests: { url: string; key: string }[] = []

before(async () => {
  pg = await newDb()
  await applyMigrationsBefore(pg, 'zzz_after_everything.sql')
  await pg.exec(`alter table public.tutors add column if not exists trial_enabled boolean default false; alter table public.tutors add column if not exists trial_price decimal(10,2);`)
  for (const [id, slug, domain, on] of [[ON, 'tutor-on', 'lessons.example.com', true], [OFF, 'tutor-off', 'private.example.com', false]] as const) {
    await pg.query(`insert into auth.users (id, email) values ($1, $2)`, [id, `${slug}@example.com`])
    await pg.query(`insert into public.tutors (id, name, slug, email, custom_domain, booking_url_active) values ($1, $2, $3, $4, $5, $6)`, [id, slug, slug, `${slug}@example.com`, domain, on])
  }
  await pg.query(`insert into auth.users (id, email) values ($1, 'student@example.com')`, [STUDENT])
  await pg.exec(readFileSync(PROPOSAL, 'utf8')) // the database after the owner has run the fix
})

// what the proxy gets from the world: the signed-in account's own client, and fetch answered by the database as the role the key stands for
mock.module('@supabase/ssr', {
  exports: {
    createServerClient: () => ({
      auth: { getUser: async () => ({ data: { user: signedIn } }) },
      from: (table: string) => pgliteClient(pg, { role: 'authenticated', userId: signedIn?.id, restStyle: true }).from(table),
    }),
  },
})
const realFetch = globalThis.fetch
globalThis.fetch = (async (input: unknown, init?: { headers?: Record<string, string> }) => {
  const url = String(input)
  const key = init?.headers?.apikey ?? ''
  requests.push({ url, key })
  const q = new URL(url).searchParams
  const role = key === SERVER_KEY ? 'service_role' : 'anon'
  const client = pgliteClient(pg, { role, restStyle: true })
  let query = client.from('tutors').select(q.get('select') ?? '*')
  const domain = q.get('custom_domain')
  if (domain) query = query.eq('custom_domain', domain.replace(/^eq\./, ''))
  if (q.get('booking_url_active') === 'eq.true') query = query.eq('booking_url_active', true)
  const answer = await query.limit(1)
  // like the REST service: the rows, or an error object
  return new Response(JSON.stringify(answer.error ? { code: answer.error.code, message: answer.error.message } : answer.data), { headers: { 'content-type': 'application/json' } })
}) as typeof fetch

const { proxy } = await import('@/proxy.ts')
const { NextRequest } = await import('next/server.js')

beforeEach(() => {
  signedIn = null
  requests.length = 0
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.invalid'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON_KEY
  process.env.SUPABASE_SERVICE_ROLE_KEY = SERVER_KEY
})

const go = async (host: string, pathname: string) => {
  const res = await proxy(new NextRequest(`https://${host}${pathname}`, { headers: { host } }))
  return { status: res.status, location: res.headers.get('location'), rewrite: res.headers.get('x-middleware-rewrite') }
}

test('the database under test refuses the public key and answers the server key', async () => {
  const visitor = await pgliteClient(pg, { role: 'anon' }).from('tutors').select('slug')
  assert.equal(visitor.data, null)
  assert.match(String(visitor.error?.message), /permission denied/)
  assert.equal(((await pgliteClient(pg, { role: 'service_role' }).from('tutors').select('slug')).data ?? []).length, 2)
})

test('a custom domain still reaches the tutor\'s booking page, asked with the server key and for a tutor whose page is on', async () => {
  const r = await go('lessons.example.com', '/')
  assert.equal(new URL(r.rewrite!).pathname, '/book/tutor-on')
  assert.equal(requests.length, 1)
  assert.equal(requests[0].key, SERVER_KEY, 'the server key, never the public one')
  assert.notEqual(requests[0].key, ANON_KEY)
  const q = new URL(requests[0].url).searchParams
  assert.equal(q.get('select'), 'slug', 'the slug and nothing else')
  assert.equal(q.get('booking_url_active'), 'eq.true')
})

test('a custom domain of a tutor whose page is off is not served; an unknown host is not served; no server key means no lookup, and the site stays up', async () => {
  const off = await go('private.example.com', '/')
  assert.equal(off.rewrite, null)
  const unknown = await go('nobody.example.com', '/')
  assert.equal(unknown.rewrite, null)
  assert.equal(unknown.status, 200)
  requests.length = 0
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  const noKey = await go('lessons.example.com', '/')
  assert.equal(noKey.rewrite, null)
  assert.equal(requests.length, 0, 'no request is made with the public key instead')
})

test('a signed-in tutor whose booking page is OFF still opens the dashboard (their own row, read with their own session)', async () => {
  signedIn = { id: OFF, email: 'tutor-off@example.com' }
  const r = await go('www.tutafy.com', '/dashboard')
  assert.equal(r.status, 200, `redirected to ${r.location}`)
  assert.equal(r.location, null)
  assert.deepEqual(requests, [], 'no request with the public key')
})

test('a signed-in tutor whose booking page is on opens the dashboard, and is sent from /login to it', async () => {
  signedIn = { id: ON, email: 'tutor-on@example.com' }
  assert.equal((await go('www.tutafy.com', '/dashboard')).status, 200)
  const login = await go('www.tutafy.com', '/login')
  assert.equal(new URL(login.location!).pathname, '/dashboard')
})

test('a signed-in account that is not a tutor is sent to the student sign-in, not into the tutor area', async () => {
  signedIn = { id: STUDENT, email: 'student@example.com' }
  const r = await go('www.tutafy.com', '/dashboard')
  assert.equal(new URL(r.location!).pathname, '/student/login')
  assert.equal((await go('www.tutafy.com', '/login')).status, 200, 'and is not bounced away from the login page')
})

test('the old way is shown to fail: the same question asked with the public key gets no tutor, for a tutor whose page is on and one whose page is off', async () => {
  const asked = await pgliteClient(pg, { role: 'anon', restStyle: true }).from('tutors').select('id').eq('id', ON).maybeSingle()
  assert.equal(asked.data, null)
  assert.ok(asked.error, 'refused, so the old check would have said "not a tutor" for every tutor')
})

test('the proxy source names no read of the tutors table made with the public key', () => {
  const source = readFileSync(path.join(ROOT, 'src', 'proxy.ts'), 'utf8').split('\r\n').join('\n').replace(/^\s*\/\/.*$/gm, '')
  for (const m of source.matchAll(/rest\/v1\/tutors[^`]*`,\s*\{ headers: \{([^}]*)\}/g)) {
    assert.doesNotMatch(m[1], /supabaseKey/, 'a REST read of tutors uses the server key')
  }
  assert.doesNotMatch(source, /rest\/v1\/tutors\?id=/, 'the "is this a tutor" question goes through the signed-in session client')
})

test('restore', () => { globalThis.fetch = realFetch })
