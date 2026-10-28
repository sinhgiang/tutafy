// T-0708: the rules of the read-only "View as this tutor", run as plain functions and through the real database client with a pretend database:
// what the proxy lets through while a view is open, which reads a view may make (reads only, listed tables only, the viewed tutor's rows only),
// and what is scrubbed from every answer. Nothing is written anywhere, and the pretend database counts every request it is asked.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyMigrationsBefore, newDb } from './support/local-db.ts'
import {
  OWNER_COLUMN, SECRET_FIELD, TUTOR_SAFE_COLUMNS, VIEW_API_READ_PATHS, VIEW_EXIT_PATH, VIEW_REST_PREFIX, forwardedHeaders, proxyDecision, restRequest, scrub, viewUser,
} from '@/lib/view-as.ts'
import { performViewRest, type ViewFetch } from '@/lib/view-rest.ts'
import { createViewClient } from '@/lib/supabase/view-client.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const T = '22222222-2222-4222-8222-222222222222'
const OTHER = '99999999-9999-4999-8999-999999999999'
const KEY = 'service-key-for-tests'

// ---- the proxy: what may go on while a view is open ------------------------------------------------------------------------------

test('proxyDecision: every write is refused wherever it is aimed, pages and API alike; the Exit button is the one exception', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'post', 'delete']) {
    for (const p of ['/dashboard', '/students', '/lessons/abc/edit', '/settings', '/api/stripe/connect/onboard', '/api/lessons/bulk', '/api/invoices/send', '/api/bookings', '/api/admin/view', VIEW_REST_PREFIX + '/rest/v1/students', '/api/nav-counts', '/', '/admin/buyers']) {
      assert.equal(proxyDecision(method, p), 'deny', `${method} ${p}`)
    }
  }
  assert.equal(proxyDecision('POST', VIEW_EXIT_PATH), 'allow')
  assert.equal(proxyDecision('GET', VIEW_EXIT_PATH), 'deny', 'only the POST of the button is open; the address is not a page')
  assert.equal(proxyDecision('PUT', VIEW_EXIT_PATH), 'deny')
})

test('proxyDecision: pages may be read, but of the API only the two read-only routes and the database reader answer', () => {
  for (const p of ['/dashboard', '/students', '/students/abc', '/lessons', '/calendar', '/payments', '/settings', '/reports', '/admin/tutors']) {
    assert.equal(proxyDecision('GET', p), 'allow', p)
    assert.equal(proxyDecision('HEAD', p), 'allow', p)
  }
  assert.deepEqual(VIEW_API_READ_PATHS, ['/api/nav-counts', '/api/notifications'])
  for (const p of [...VIEW_API_READ_PATHS, VIEW_REST_PREFIX + '/rest/v1/lessons', VIEW_REST_PREFIX + '/auth/v1/user']) assert.equal(proxyDecision('GET', p), 'allow', p)
  for (const p of ['/api/stripe/connect/onboard', '/api/auth/google-calendar/callback', '/api/payments/export', '/api/keys', '/api/team', '/api/cron/reminders', '/api', '/api/nav-counts-evil', '/api/notifications/x', '/api/admin/view-rest-evil']) {
    assert.equal(proxyDecision('GET', p), 'deny', `a read of ${p} would start something or show a secret`)
  }
})

// ---- which reads a view may make ---------------------------------------------------------------------------------------------------

test('restRequest: a read of a listed table gets the owner filter ADDED to whatever the page asked, so a page that forgot it, or asked for another tutor, still sees only this one', () => {
  const r = restRequest('GET', '/rest/v1/students', '?select=*&order=created_at.desc', T)
  assert.deepEqual(r, { ok: true, table: 'students', search: `?select=*&order=created_at.desc&tutor_id=eq.${T}` })
  const mine = restRequest('GET', '/rest/v1/lessons', `?select=*&tutor_id=eq.${OTHER}`, T)
  assert.equal(mine.ok && mine.search, `?select=*&tutor_id=eq.${OTHER}&tutor_id=eq.${T}`, 'both must hold: asking for another tutor gives an empty list')
  const or = restRequest('GET', '/rest/v1/lessons', `?or=(tutor_id.eq.${OTHER},status.eq.scheduled)`, T)
  assert.ok(or.ok && or.search.endsWith(`&tutor_id=eq.${T}`), 'an or() cannot widen it: the owner filter is a separate condition')
  assert.deepEqual(restRequest('HEAD', '/rest/v1/messages', '?select=*', T), { ok: true, table: 'messages', search: `?select=*&tutor_id=eq.${T}` })
  assert.equal(restRequest('GET', '/rest/v1/tutors', '?select=*', T).ok && (restRequest('GET', '/rest/v1/tutors', '?select=*', T) as { search: string }).search, `?select=*&id=eq.${T}`)
  assert.equal(restRequest('GET', '/rest/v1/team_members', '?select=*', T).ok && (restRequest('GET', '/rest/v1/team_members', '?select=*', T) as { search: string }).search, `?select=*&owner_id=eq.${T}`)
})

test('restRequest: every write, every unlisted table and everything that is not a plain table read is refused', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) assert.deepEqual(restRequest(method, '/rest/v1/students', '', T), { ok: false, status: 405, code: 'VIEW_READ_ONLY' }, method)
  for (const table of ['api_keys', 'webhook_subscriptions', 'push_subscriptions', 'lesson_card_payments', 'homework_submissions', 'lesson_students', 'visitors', 'visitor_events', 'admin_view_log', 'feedback', 'constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    const r = restRequest('GET', `/rest/v1/${table}`, '', T)
    assert.equal(r.ok, false, table) // names with capitals (toString) are not even table-shaped: refused as a path; the others as a table
    assert.deepEqual(r.ok ? null : r.code, /[A-Z]/.test(table) ? 'VIEW_PATH_DENIED' : 'VIEW_TABLE_DENIED', table)
  }
  for (const p of ['/rest/v1/rpc/delete_everything', '/rest/v1/students/extra', '/rest/v1/', '/rest/v1', '/storage/v1/object/x', '/auth/v1/token', '/auth/v1/logout', '/rest/v1/Students', '/rest/v1/students%2f..', '/graphql/v1', '']) {
    assert.equal(restRequest('GET', p, '', T).ok, false, p)
  }
  assert.equal(restRequest('GET', '/rest/v1/students', '', 'not-a-uuid').ok, false, 'a tutor id that is not a UUID narrows nothing, so nothing is read')
  assert.equal(restRequest('GET', '/rest/v1/students', '', `${T}' or true`).ok, false)
})

test('the list of readable tables is the one the dashboard needs: every table the dashboard code reads is either listed or knowingly left out', () => {
  const files: string[] = []
  const walk = (dir: string) => { for (const f of readdirSync(dir)) { const p = path.join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(f)) files.push(p) } }
  walk(path.join(SRC, 'app/(dashboard)')); walk(path.join(SRC, 'components/layout')); files.push(path.join(SRC, 'lib/guard.tsx'))
  const used = new Set<string>()
  for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/\.from\('([a-z_]+)'\)/g)) used.add(m[1])
  // left out ON PURPOSE (each read there shows "not available" in a view): no owner column to narrow by, so they cannot be read safely
  const LEFT_OUT: Record<string, string> = { homework_submissions: 'no owner column (reached through a lesson)', lesson_students: 'no owner column (reached through a lesson)' }
  const undecided = [...used].filter(t => !(t in OWNER_COLUMN) && !(t in LEFT_OUT))
  assert.deepEqual(undecided, [], 'a table the dashboard reads has neither an owner column in OWNER_COLUMN nor a reason to be left out')
  for (const t of Object.keys(LEFT_OUT)) assert.equal(t in OWNER_COLUMN, false, t)
})

test('every owner column named in OWNER_COLUMN is a real column of that table (on the tables the migrations create)', async () => {
  const db = await newDb()
  await applyMigrationsBefore(db, '999_none.sql')
  const cols = (await db.query<{ table_name: string; column_name: string }>(`select table_name, column_name from information_schema.columns where table_schema = 'public'`)).rows
  const known = new Set(cols.map(c => c.table_name))
  for (const [table, owner] of Object.entries(OWNER_COLUMN)) {
    if (!known.has(table)) continue // made by hand on the real database (waitlist, coupons, team_members ...): no copy here
    assert.ok(cols.some(c => c.table_name === table && c.column_name === owner), `${table}.${owner}`)
  }
  assert.ok(Object.keys(OWNER_COLUMN).filter(t => known.has(t)).length >= 10, 'most of the list is checked against a real schema')
})

test('forwardedHeaders: only what a JSON read needs; a csv or other format, a custom profile or a write hint is never passed on', () => {
  const h = (o: Record<string, string>) => ({ get: (n: string) => o[n.toLowerCase()] ?? null })
  assert.deepEqual(forwardedHeaders(h({ accept: 'application/json', range: '0-99', 'range-unit': 'items', prefer: 'count=exact' })), { Accept: 'application/json', Range: '0-99', 'Range-Unit': 'items', Prefer: 'count=exact' })
  assert.deepEqual(forwardedHeaders(h({ accept: 'application/vnd.pgrst.object+json' })), { Accept: 'application/vnd.pgrst.object+json' })
  assert.deepEqual(forwardedHeaders(h({ accept: 'text/csv' })), {}, 'csv would skip the scrub')
  assert.deepEqual(forwardedHeaders(h({ accept: 'application/json, text/csv' })), {})
  assert.deepEqual(forwardedHeaders(h({ prefer: 'return=representation' })), {}, 'a write preference')
  assert.deepEqual(forwardedHeaders(h({ prefer: 'resolution=merge-duplicates', 'accept-profile': 'auth', authorization: 'Bearer x', apikey: 'y' })), {})
  assert.deepEqual(forwardedHeaders(h({ range: '0-99; drop table' })), {})
})

// ---- what never leaves the database -----------------------------------------------------------------------------------------------------

test('scrub: secrets are dropped wherever they are, tutors are cut down to the short list, and everything else is kept as it was', () => {
  const tutor = { id: T, name: 'Ann', email: 'ann@example.com', slug: 'ann', subscription_status: 'pro', stripe_account_id: 'acct_secret', polar_subscription_id: 'sub_secret', polar_checkout_id: 'c', google_calendar_refresh_token: 'rt_secret', push_subscription: { endpoint: 'e', keys: { p256dh: 'k', auth: 'a' } }, some_new_column: 'unlisted', referred_by: 'x', stripe_onboarding_complete: true }
  assert.deepEqual(scrub(tutor, 'tutors'), { id: T, name: 'Ann', email: 'ann@example.com', slug: 'ann', subscription_status: 'pro', stripe_onboarding_complete: true })
  const student = { id: 's', name: 'Kid', email: 'kid@example.com', portal_token: 'tok_secret', parent_token: 'p', password: 'x', api_key: 'k', card_number: '4242', notes: 'ok', tags: ['a'] }
  assert.deepEqual(scrub(student, 'students'), { id: 's', name: 'Kid', email: 'kid@example.com', notes: 'ok', tags: ['a'] })
  assert.deepEqual(scrub([student, student], 'students'), [{ id: 's', name: 'Kid', email: 'kid@example.com', notes: 'ok', tags: ['a'] }, { id: 's', name: 'Kid', email: 'kid@example.com', notes: 'ok', tags: ['a'] }])
  // embedded rows: a student inside a lesson, and a tutor inside anything
  const lesson = { id: 'l', price: 30, students: { name: 'Kid', portal_token: 'tok_secret' }, tutors: { name: 'Ann', stripe_account_id: 'acct_secret', email: 'ann@example.com' } }
  assert.deepEqual(scrub(lesson, 'lessons'), { id: 'l', price: 30, students: { name: 'Kid' }, tutors: { name: 'Ann', email: 'ann@example.com' } })
  assert.deepEqual([scrub(null), scrub(5), scrub('x'), scrub([])], [null, 5, 'x', []])
  assert.doesNotMatch(JSON.stringify(scrub([tutor, student, lesson], 'tutors')), /acct_secret|sub_secret|rt_secret|tok_secret|4242|p256dh/)
})

test('the short list of tutor columns holds no secret: nothing on it looks like one, and none of the real secret columns of the schema is on it', async () => {
  for (const c of TUTOR_SAFE_COLUMNS) assert.doesNotMatch(c, SECRET_FIELD, c)
  const db = await newDb()
  await applyMigrationsBefore(db, '999_none.sql')
  const cols = (await db.query<{ column_name: string }>(`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'tutors'`)).rows.map(r => r.column_name)
  const mustStayHidden = ['stripe_account_id', 'polar_subscription_id', 'polar_checkout_id', 'google_calendar_refresh_token', 'google_calendar_id', 'push_subscription', 'referred_by']
  for (const c of mustStayHidden) assert.equal((TUTOR_SAFE_COLUMNS as readonly string[]).includes(c), false, c)
  // every real column is either shown on purpose or hidden: print which, so a new column is a decision, not an accident
  const shown = cols.filter(c => (TUTOR_SAFE_COLUMNS as readonly string[]).includes(c))
  const hidden = cols.filter(c => !(TUTOR_SAFE_COLUMNS as readonly string[]).includes(c))
  assert.deepEqual(hidden.sort(), ['google_calendar_id', 'google_calendar_refresh_token', 'polar_checkout_id', 'polar_subscription_id', 'push_subscription', 'referred_by', 'stripe_account_id'], `hidden: ${hidden.join(', ')}`)
  assert.ok(shown.length >= 25)
})

test('the user a page sees in a view is who the tutor is and nothing else: no session, no token, no password', () => {
  const u = viewUser({ id: T, email: 'ann@example.com' })
  assert.deepEqual(Object.keys(u).sort(), ['app_metadata', 'aud', 'created_at', 'email', 'id', 'role', 'user_metadata'])
  assert.doesNotMatch(JSON.stringify(u), SECRET_FIELD)
})

// ---- the one function that reads for a view ------------------------------------------------------------------------------------------------

type Seen = { url: string; method: string; headers: Record<string, string> }
function pretendDatabase(answer: (url: URL) => { status?: number; body: unknown; headers?: Record<string, string> }) {
  const seen: Seen[] = []
  const fetchImpl: ViewFetch = async (url, init) => {
    seen.push({ url, method: init.method, headers: init.headers })
    const a = answer(new URL(url))
    // like the real service: a request for ONE object (.single()) is answered with the object, not a list
    const body = Array.isArray(a.body) && (init.headers.Accept ?? '').includes('vnd.pgrst.object+json') ? a.body[0] : a.body
    return new Response(init.method === 'HEAD' ? null : typeof body === 'string' ? body : JSON.stringify(body), { status: a.status ?? 200, headers: { 'content-type': 'application/json', ...(a.headers ?? {}) } })
  }
  return { seen, fetchImpl }
}
const hdr = (o: Record<string, string> = {}) => ({ get: (n: string) => o[n.toLowerCase()] ?? null })
const viewRead = (fetchImpl: ViewFetch, method: string, pathname: string, search = '', headers = hdr()) =>
  performViewRest({ fetchImpl, baseUrl: 'https://db.example.invalid/', serviceKey: KEY, method, pathname, search, headers, tutorId: T })

test('performViewRest: a read goes to the database as a GET with the server key, narrowed to the tutor, and comes back scrubbed with its count header', async () => {
  const db = pretendDatabase(() => ({ body: [{ id: 's1', name: 'Kid', portal_token: 'tok_secret' }], headers: { 'content-range': '0-0/41' } }))
  const res = await viewRead(db.fetchImpl, 'GET', '/rest/v1/students', '?select=*', hdr({ accept: 'application/json', prefer: 'count=exact' }))
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), [{ id: 's1', name: 'Kid' }])
  assert.equal(res.headers.get('content-range'), '0-0/41')
  assert.equal(db.seen.length, 1)
  assert.equal(db.seen[0].method, 'GET')
  assert.equal(db.seen[0].url, `https://db.example.invalid/rest/v1/students?select=*&tutor_id=eq.${T}`)
  assert.deepEqual(db.seen[0].headers, { Accept: 'application/json', Prefer: 'count=exact', apikey: KEY, Authorization: `Bearer ${KEY}` })
})

test('performViewRest: a HEAD count asks with HEAD and has no body; a tutor row loses its Stripe and Polar fields', async () => {
  const db = pretendDatabase(() => ({ body: [], headers: { 'content-range': '*/7' } }))
  const head = await viewRead(db.fetchImpl, 'HEAD', '/rest/v1/lessons', '?select=*', hdr({ prefer: 'count=exact' }))
  assert.equal(head.headers.get('content-range'), '*/7')
  assert.equal(await head.text(), '')
  assert.equal(db.seen[0].method, 'HEAD')
  const t = pretendDatabase(() => ({ body: [{ id: T, name: 'Ann', stripe_account_id: 'acct_secret', polar_subscription_id: 'sub_secret' }] }))
  const res = await viewRead(t.fetchImpl, 'GET', '/rest/v1/tutors', `?select=*&id=eq.${T}`)
  assert.deepEqual(await res.json(), [{ id: T, name: 'Ann' }])
})

test('performViewRest: a write, an unlisted table, an rpc and a non-JSON answer never reach the page as they are, and a refused request is never sent to the database at all', async () => {
  const db = pretendDatabase(() => ({ body: 'id,name\n1,Kid', headers: { 'content-type': 'text/csv' } }))
  for (const [method, p] of [['POST', '/rest/v1/students'], ['PATCH', '/rest/v1/lessons'], ['DELETE', '/rest/v1/students'], ['PUT', '/rest/v1/tutors'], ['GET', '/rest/v1/api_keys'], ['GET', '/rest/v1/rpc/anything'], ['GET', '/auth/v1/admin/users']] as const) {
    const res = await viewRead(db.fetchImpl, method, p)
    assert.ok([403, 404, 405].includes(res.status), `${method} ${p} -> ${res.status}`)
    assert.match(JSON.stringify(await res.json()), /read-only view|VIEW_/)
  }
  assert.equal(db.seen.length, 0, 'none of them was sent to the database')
  const csv = await viewRead(db.fetchImpl, 'GET', '/rest/v1/students', '', hdr({ accept: 'text/csv' }))
  assert.equal(csv.status, 502, 'whatever came back that was not JSON is refused, not handed over unscrubbed')
  assert.equal(db.seen[0].headers.Accept, undefined, 'the csv request was not even passed on as csv')
})

// ---- the client a server page gets in a view ------------------------------------------------------------------------------------------------

test('the view client: the page runs unchanged (the user is the tutor), reads are narrowed and scrubbed, and every write comes back as an error without reaching the database', async () => {
  const db = pretendDatabase(url => (url.pathname.endsWith('/students') ? { body: [{ id: 's1', tutor_id: T, name: 'Kid', portal_token: 'tok_secret' }] } : { body: [] }))
  const supabase = createViewClient({ id: T, email: 'ann@example.com' }, { url: 'https://db.example.invalid', serviceKey: KEY, fetchImpl: db.fetchImpl })

  const { data: { user } } = await supabase.auth.getUser()
  assert.deepEqual([user?.id, user?.email], [T, 'ann@example.com'])
  assert.equal((await supabase.auth.getSession()).data.session, null, 'no session to read a token from')

  const read = await supabase.from('students').select('id, name').eq('tutor_id', user!.id).order('name')
  assert.deepEqual(read.data, [{ id: 's1', tutor_id: T, name: 'Kid' }])
  assert.equal(db.seen.length, 1)
  assert.match(db.seen[0].url, new RegExp(`/rest/v1/students\\?select=id%2Cname&tutor_id=eq\\.${T}&order=name\\.asc&tutor_id=eq\\.${T}$`))
  assert.equal(db.seen[0].method, 'GET')

  const before = db.seen.length
  const attempts = await Promise.all([
    supabase.from('students').insert({ name: 'New', tutor_id: T }),
    supabase.from('students').update({ name: 'Renamed' }).eq('id', 's1'),
    supabase.from('students').delete().eq('id', 's1'),
    supabase.from('students').upsert({ id: 's1', name: 'x' }),
    supabase.from('lessons').insert({ tutor_id: T }).select(),
    supabase.rpc('anything', {}),
    supabase.from('api_keys').select('*'),
    supabase.from('tutors').update({ subscription_status: 'academy' }).eq('id', T),
  ])
  for (const a of attempts) assert.ok(a.error, 'refused')
  assert.equal(db.seen.length, before, 'not one of the eight attempts reached the database')
})

test('the view client: a head count keeps its count, and a single tutor row has no secret in it', async () => {
  const db = pretendDatabase(url => (url.pathname.endsWith('/tutors')
    ? { body: [{ id: T, name: 'Ann', stripe_account_id: 'acct_secret', google_calendar_refresh_token: 'rt', subscription_status: 'pro' }] }
    : { body: [], headers: { 'content-range': '*/12' } }))
  const supabase = createViewClient({ id: T, email: 'ann@example.com' }, { url: 'https://db.example.invalid', serviceKey: KEY, fetchImpl: db.fetchImpl })
  const count = await supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('tutor_id', T)
  assert.equal(count.count, 12)
  const one = await supabase.from('tutors').select('*').eq('id', T).single()
  assert.deepEqual(one.data, { id: T, name: 'Ann', subscription_status: 'pro' })
})
