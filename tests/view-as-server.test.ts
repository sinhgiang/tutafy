// T-0708: "View as this tutor" end to end on the server, with the REAL code and a pretend database that answers the real REST addresses:
// the client every page gets (createClient in src/lib/supabase/server.ts), the proxy that makes the whole app read-only while a view is open,
// the start, exit and database-reader routes, and the strip on the tutor's dashboard. Only the places that must be pretended are pretended: who
// is signed in (the Supabase session), the cookie jar, and the database (a function that answers GET, POST and PATCH on /rest/v1/<table>).
// Nothing is sent anywhere: the global fetch is replaced for every test and every request is written down.
import { test, mock, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { setAdminLang, cookieJar as jar } from './support/admin-lang.ts'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')
const read = (rel: string) => readFileSync(path.join(SRC, rel), 'utf8').replace(/\r\n/g, '\n')
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://db.example.invalid'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-for-tests'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key-for-tests'

// ---- the pretend session, cookie jar and database ----------------------------------------------------------------------------------
type User = { id: string; email: string } | null
let user: User = null
mock.module('@supabase/ssr', { exports: { createServerClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }), createBrowserClient: () => ({}) } })

type Row = Record<string, unknown>
let tables: Record<string, Row[]> = {}
const calls: { method: string; url: string; headers: Record<string, string> }[] = []
const realFetch = globalThis.fetch
function installDatabase() {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    const method = (init?.method ?? 'GET').toUpperCase()
    const headers = Object.fromEntries(new Headers(init?.headers).entries())
    calls.push({ method, url: url.toString(), headers })
    const m = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname)
    if (url.hostname !== 'db.example.invalid' || !m) return Response.json({ message: 'not here' }, { status: 404 })
    const rows = (tables[m[1]] ??= [])
    const wantsOne = (headers.accept ?? '').includes('vnd.pgrst.object+json')
    const match = (r: Row) => [...url.searchParams].every(([k, v]) => ['select', 'order', 'limit', 'offset'].includes(k) || (v.startsWith('eq.') ? String(r[k]) === v.slice(3) : v === 'is.null' ? r[k] == null : true))
    const answer = (list: Row[]) => (wantsOne ? (list.length === 1 ? Response.json(list[0]) : Response.json({ code: 'PGRST116', message: 'no rows', details: null, hint: null }, { status: 406 })) : Response.json(list))
    if (method === 'GET' || method === 'HEAD') return method === 'HEAD' ? new Response(null, { headers: { 'content-range': `*/${rows.filter(match).length}`, 'content-type': 'application/json' } }) : answer(rows.filter(match))
    if (method === 'POST') {
      const body = JSON.parse(String(init?.body))
      const added = (Array.isArray(body) ? body : [body]).map((r: Row) => ({ id: crypto.randomUUID(), ...r }))
      rows.push(...added)
      return answer(added)
    }
    if (method === 'PATCH') { const body = JSON.parse(String(init?.body)); for (const r of rows.filter(match)) Object.assign(r, body); return new Response(null, { status: 204 }) }
    return new Response(null, { status: 405 })
  }) as typeof fetch
}

const { ADMIN_EMAIL } = await import('@/lib/admin.ts')
const server = await import('@/lib/supabase/server.ts')
const { requireAdminPage, adminApiGate } = await import('@/lib/admin-guard.ts')
const view = await import('@/lib/view-as.ts')
const startRoute = await import('@/app/api/admin/view/route.ts')
const exitRoute = await import('@/app/api/admin/view/exit/route.ts')
const restRoute = await import('@/app/api/admin/view-rest/[...path]/route.ts')
const { proxy, config } = await import('@/proxy.ts')
const { ViewAsBanner } = await import('@/components/admin/ViewAsBanner.tsx')
const { NextRequest } = await import('next/server')

const ADMIN = { id: '11111111-1111-4111-8111-111111111111', email: ADMIN_EMAIL }
const OTHER_ADMIN_ID = '33333333-3333-4333-8333-333333333333'
const ANN = '22222222-2222-4222-8222-222222222222'
const BO = '44444444-4444-4444-8444-444444444444'
const SESSION = '55555555-5555-4555-8555-555555555555'
const TUTOR_USER = { id: BO, email: 'bo@example.com' }
const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString()

beforeEach(() => {
  user = ADMIN; jar.clear(); calls.length = 0; setAdminLang(null)
  tables = {
    tutors: [
      { id: ANN, email: 'ann@example.com', name: 'Ann Tutor', slug: 'ann', subscription_status: 'pro', stripe_account_id: 'acct_secret_ann', polar_subscription_id: 'sub_secret_ann', google_calendar_refresh_token: 'rt_secret_ann' },
      { id: BO, email: 'bo@example.com', name: 'Bo Tutor', slug: 'bo', subscription_status: 'free', stripe_account_id: 'acct_secret_bo' },
    ],
    students: [
      { id: 's1', tutor_id: ANN, name: 'Ann Kid', email: 'annkid@example.com', portal_token: 'tok_secret_1' },
      { id: 's2', tutor_id: BO, name: 'Bo Kid', email: 'bokid@example.com', portal_token: 'tok_secret_2' },
    ],
    lessons: [{ id: 'l1', tutor_id: ANN, status: 'scheduled' }, { id: 'l2', tutor_id: BO, status: 'scheduled' }],
    api_keys: [{ id: 'k1', tutor_id: ANN, key_hash: 'hash_secret' }],
    admin_view_log: [{ id: SESSION, admin_id: ADMIN.id, tutor_id: ANN, opened_at: inMinutes(-5), expires_at: inMinutes(25), closed_at: null }],
  }
  installDatabase()
})
afterEach(() => { globalThis.fetch = realFetch })

const openView = () => jar.set(view.VIEW_COOKIE, SESSION)

// ---- the client every page gets ------------------------------------------------------------------------------------------------------

test('without a view cookie nothing changes: the page gets the signed-in account\'s own client and nothing is asked of the database', async () => {
  const supabase = await server.createClient()
  assert.deepEqual((await supabase.auth.getUser()).data.user, ADMIN, 'the real session answers')
  assert.equal(calls.length, 0)
  assert.equal(await server.activeViewTutor(), null)
})

test('with a valid view the client is the read-only view of that tutor: the user is the tutor, reads are narrowed and scrubbed, writes never reach the database', async () => {
  openView()
  const supabase = await server.createClient()
  const { data: { user: seen } } = await supabase.auth.getUser()
  assert.deepEqual([seen?.id, seen?.email], [ANN, 'ann@example.com'])

  const students = await supabase.from('students').select('*')
  assert.deepEqual(students.data, [{ id: 's1', tutor_id: ANN, name: 'Ann Kid', email: 'annkid@example.com' }], 'only Ann\'s student, and no portal token')
  const tutor = await supabase.from('tutors').select('*').eq('id', seen!.id).single()
  assert.deepEqual(tutor.data, { id: ANN, email: 'ann@example.com', name: 'Ann Tutor', slug: 'ann', subscription_status: 'pro' })
  assert.deepEqual(((await supabase.from('lessons').select('id')).data ?? []).map(r => r.id), ['l1'], 'a page that forgot the tutor filter still sees only this tutor')
  assert.equal((await supabase.from('api_keys').select('*')).error !== null, true, 'a table that is not listed cannot be read')

  const dataCalls = calls.filter(c => !c.url.includes('admin_view_log') && !(c.url.includes('/rest/v1/tutors') && c.headers.accept?.includes('object')))
  const writesBefore = calls.filter(c => c.method !== 'GET' && c.method !== 'HEAD').length
  for (const attempt of [
    supabase.from('students').insert({ name: 'New', tutor_id: ANN }), supabase.from('students').update({ name: 'X' }).eq('id', 's1'),
    supabase.from('lessons').delete().eq('id', 'l1'), supabase.from('tutors').update({ subscription_status: 'academy' }).eq('id', ANN), supabase.rpc('anything', {}),
  ]) assert.ok((await attempt).error)
  assert.equal(calls.filter(c => c.method !== 'GET' && c.method !== 'HEAD').length, writesBefore, 'no write request was sent')
  assert.equal(tables.students.length, 2)
  assert.ok(dataCalls.every(c => c.method === 'GET' || c.method === 'HEAD'))
  assert.equal(tables.tutors[0].subscription_status, 'pro')
  // the tutor's own Bo data never came near
  assert.ok(!JSON.stringify(students.data).includes('Bo Kid'))
})

test('a cookie that does not pass the check is just ignored: a tutor, a signed-out visitor, another admin\'s cookie, an expired view, a closed one, a made-up id', async () => {
  const own = async () => (await (await server.createClient()).auth.getUser()).data.user
  openView()
  user = TUTOR_USER
  assert.deepEqual(await own(), TUTOR_USER, 'a tutor holding the cookie value is still only themselves')
  assert.equal(calls.length, 0, 'and the database was not even asked')
  user = null
  assert.equal(await own(), null)
  user = ADMIN
  tables.admin_view_log[0].admin_id = OTHER_ADMIN_ID
  assert.deepEqual(await own(), ADMIN, 'the view belongs to another admin')
  tables.admin_view_log[0].admin_id = ADMIN.id
  tables.admin_view_log[0].expires_at = inMinutes(-1)
  assert.deepEqual(await own(), ADMIN, 'it has run out')
  tables.admin_view_log[0].expires_at = inMinutes(25)
  tables.admin_view_log[0].closed_at = inMinutes(-2)
  assert.deepEqual(await own(), ADMIN, 'it was closed')
  tables.admin_view_log[0].closed_at = null
  jar.set(view.VIEW_COOKIE, '66666666-6666-4666-8666-666666666666')
  assert.deepEqual(await own(), ADMIN, 'no such row')
  jar.set(view.VIEW_COOKIE, "x' or '1'='1")
  assert.deepEqual(await own(), ADMIN)
})

test('the admin gates always see the real admin, even in a view; everything else sees the tutor', async () => {
  openView()
  assert.deepEqual((await (await server.createClient({ real: true })).auth.getUser()).data.user, ADMIN)
  await requireAdminPage() // would redirect if it saw the tutor
  assert.equal(await adminApiGate(), null)
  assert.match(read('lib/admin-guard.ts'), /createClient\(\{ real: true \}\)[\s\S]*createClient\(\{ real: true \}\)/, 'both gates ask for the real client')
  assert.equal((await (await server.createClient()).auth.getUser()).data.user?.id, ANN)
})

// ---- the proxy -----------------------------------------------------------------------------------------------------------------------------

const call = async (method: string, pathname: string, cookies: Record<string, string> = {}) => {
  const headers: Record<string, string> = { host: 'localhost:3000' }
  if (Object.keys(cookies).length) headers.cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
  return proxy(new NextRequest(`http://localhost:3000${pathname}`, { method, headers }))
}

test('proxy, no view cookie: a write to the API is not touched (the proxy adds nothing to requests it had no reason to look at)', async () => {
  for (const [m, p] of [['POST', '/api/lessons/bulk'], ['POST', '/api/webhooks/polar'], ['PUT', '/api/keys'], ['GET', '/api/team']] as const) {
    const res = await call(m, p)
    assert.notEqual(res.status, 403, `${m} ${p}`)
  }
  assert.equal(calls.length, 0)
})

test('proxy, valid view: every write to a page or to the API is refused with 403 before anything runs; the Exit button and plain reads go through', async () => {
  const cookies = { [view.VIEW_COOKIE]: SESSION }
  for (const [m, p] of [
    ['POST', '/students'], ['POST', '/lessons/abc/edit'], ['POST', '/api/lessons/bulk'], ['POST', '/api/stripe/connect/onboard'], ['POST', '/api/invoices/send'], ['POST', '/api/bookings'],
    ['PUT', '/api/keys'], ['PATCH', '/api/team'], ['DELETE', '/api/lessons/abc'], ['POST', '/api/subscriptions/upgrade'], ['POST', '/api/admin/view'], ['POST', '/api/admin/view-rest/rest/v1/students'],
    ['GET', '/api/stripe/connect/onboard'], ['GET', '/api/auth/google-calendar/callback'], ['GET', '/api/payments/export'], ['GET', '/api/keys'],
  ] as const) {
    const res = await call(m, p, cookies)
    assert.equal(res.status, 403, `${m} ${p}`)
    assert.equal((await res.json()).error, 'read_only_view')
  }
  for (const [m, p] of [['POST', view.VIEW_EXIT_PATH], ['GET', '/api/nav-counts'], ['GET', '/api/notifications'], ['GET', `${view.VIEW_REST_PREFIX}/rest/v1/students`], ['GET', '/dashboard'], ['GET', '/students']] as const) {
    const res = await call(m, p, cookies)
    assert.notEqual(res.status, 403, `${m} ${p}`)
  }
})

test('proxy, a view that does not pass the check is ignored: the same writes are not refused, and the cookie of a tutor or of an expired view grants nothing', async () => {
  const cookies = { [view.VIEW_COOKIE]: SESSION }
  user = TUTOR_USER
  assert.notEqual((await call('POST', '/api/lessons/bulk', cookies)).status, 403)
  user = ADMIN
  tables.admin_view_log[0].expires_at = inMinutes(-1)
  assert.notEqual((await call('POST', '/api/lessons/bulk', cookies)).status, 403)
  tables.admin_view_log[0].expires_at = inMinutes(25)
  tables.admin_view_log[0].admin_id = OTHER_ADMIN_ID
  assert.notEqual((await call('POST', '/api/lessons/bulk', cookies)).status, 403)
  assert.equal((await call('POST', '/api/lessons/bulk', { [view.VIEW_COOKIE]: 'not-a-uuid' })).status === 403, false)
})

test('proxy, a plain read of a page while a view is open asks the database for nothing (the page\'s own client checks the view)', async () => {
  await call('GET', '/dashboard', { [view.VIEW_COOKIE]: SESSION })
  assert.equal(calls.filter(c => c.url.includes('admin_view_log')).length, 0)
})

test('proxy matcher: the API is in it (for the check above) and the old exclusions are unchanged', () => {
  assert.ok(config.matcher.includes('/api/:path*'))
  assert.match(config.matcher[0], /book\|api\|portal\|onboarding/)
})

// ---- start, exit, and the database reader -----------------------------------------------------------------------------------------------------

const post = (pathname: string, body: Record<string, string> = {}, headers: Record<string, string> = {}, cookies: Record<string, string> = {}) => {
  const form = new URLSearchParams(body)
  const cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
  return new NextRequest(`http://localhost:3000${pathname}`, { method: 'POST', headers: { host: 'localhost:3000', 'content-type': 'application/x-www-form-urlencoded', ...(cookie ? { cookie } : {}), ...headers }, body: form.toString() })
}

test('start: the admin opens a view: a log row is written FIRST, then two cookies (one httpOnly, 30 minutes) and a redirect to the dashboard', async () => {
  jar.clear(); tables.admin_view_log = []
  const res = await startRoute.POST(post(view.VIEW_START_PATH, { tutor_id: ANN }, { origin: 'http://localhost:3000' }))
  assert.equal(res.status, 303)
  assert.equal(new URL(res.headers.get('location')!).pathname, '/dashboard')
  assert.equal(tables.admin_view_log.length, 1)
  const row = tables.admin_view_log[0]
  assert.deepEqual([row.admin_id, row.tutor_id], [ADMIN.id, ANN])
  assert.equal(Math.round((Date.parse(String(row.expires_at)) - Date.parse(String(row.opened_at))) / 60_000), 30)
  const session = res.cookies.get(view.VIEW_COOKIE)
  assert.equal(session?.value, row.id)
  assert.deepEqual([session?.httpOnly, session?.sameSite, session?.maxAge, session?.path], [true, 'lax', 1800, '/'])
  const flag = res.cookies.get(view.VIEW_FLAG_COOKIE)
  assert.deepEqual([flag?.value, flag?.httpOnly], ['1', false])
  assert.doesNotMatch(JSON.stringify([...res.cookies.getAll()]), /secret|password|token|acct_|rt_/)
})

test('start: only the admin, only from this site, only for a real tutor; and no log table means no view and no cookie', async () => {
  tables.admin_view_log = []
  user = TUTOR_USER
  assert.equal((await startRoute.POST(post(view.VIEW_START_PATH, { tutor_id: ANN }))).status, 403)
  user = null
  assert.equal((await startRoute.POST(post(view.VIEW_START_PATH, { tutor_id: ANN }))).status, 401)
  user = ADMIN
  assert.equal((await startRoute.POST(post(view.VIEW_START_PATH, { tutor_id: ANN }, { origin: 'https://evil.example' }))).status, 403)
  assert.equal((await startRoute.POST(post(view.VIEW_START_PATH, { tutor_id: ANN }, { origin: 'not a url' }))).status, 403)
  const bad = await startRoute.POST(post(view.VIEW_START_PATH, { tutor_id: 'nope' }))
  assert.equal(new URL(bad.headers.get('location')!).pathname, '/admin/tutors')
  const ghost = await startRoute.POST(post(view.VIEW_START_PATH, { tutor_id: '77777777-7777-4777-8777-777777777777' }))
  assert.equal(new URL(ghost.headers.get('location')!).search, '?view=no_such_tutor')
  assert.equal(tables.admin_view_log.length, 0, 'none of these wrote a row')
  for (const r of [bad, ghost]) assert.equal(r.cookies.get(view.VIEW_COOKIE), undefined)

  // the log table is not there yet (migration 022 not applied): the database answers an error for it
  const before = globalThis.fetch
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => (String(input instanceof Request ? input.url : input).includes('admin_view_log') ? Response.json({ code: '42P01', message: 'relation "public.admin_view_log" does not exist' }, { status: 404 }) : before(input, init))) as typeof fetch
  const none = await startRoute.POST(post(view.VIEW_START_PATH, { tutor_id: ANN }))
  assert.equal(new URL(none.headers.get('location')!).pathname, `/admin/tutors/${ANN}`)
  assert.equal(new URL(none.headers.get('location')!).search, '?view=unavailable')
  assert.equal(none.cookies.get(view.VIEW_COOKIE), undefined, 'no log line, no view')
})

test('exit: closes the admin\'s own view, clears both cookies and goes back to that tutor\'s page; twice is harmless; a stranger closes nothing', async () => {
  openView()
  const res = await exitRoute.POST(post(view.VIEW_EXIT_PATH, {}, {}, { [view.VIEW_COOKIE]: SESSION }))
  assert.equal(res.status, 303)
  assert.equal(new URL(res.headers.get('location')!).pathname, `/admin/tutors/${ANN}`)
  assert.ok(tables.admin_view_log[0].closed_at, 'the closing time is written')
  for (const name of [view.VIEW_COOKIE, view.VIEW_FLAG_COOKIE]) assert.deepEqual([res.cookies.get(name)?.value, res.cookies.get(name)?.maxAge], ['', 0])
  assert.equal(await server.activeViewTutor(), null, 'and the view is over')
  const again = await exitRoute.POST(post(view.VIEW_EXIT_PATH, {}, {}, { [view.VIEW_COOKIE]: SESSION }))
  assert.equal(again.status, 303)

  tables.admin_view_log[0].closed_at = null
  user = TUTOR_USER
  assert.equal((await exitRoute.POST(post(view.VIEW_EXIT_PATH, {}, {}, { [view.VIEW_COOKIE]: SESSION }))).status, 403)
  assert.equal(tables.admin_view_log[0].closed_at, null, 'a tutor cannot close the admin\'s view')
})

test('the database reader the browser pages use: reads for the viewed tutor only, the user is the tutor, a write is refused; and nothing without a valid view or for a non-admin', async () => {
  const get = (p: string, search = '') => restRoute.GET(new NextRequest(`http://localhost:3000${view.VIEW_REST_PREFIX}${p}${search}`, { headers: { accept: 'application/json' } }), { params: Promise.resolve({ path: p.split('/').filter(Boolean) }) })

  assert.equal((await get('/rest/v1/students')).status, 403, 'no view open')
  openView()
  const students = await get('/rest/v1/students', '?select=*')
  assert.deepEqual(await students.json(), [{ id: 's1', tutor_id: ANN, name: 'Ann Kid', email: 'annkid@example.com' }])
  const who = await (await get('/auth/v1/user')).json()
  assert.deepEqual([who.id, who.email, Object.keys(who).some(k => /token|session|password/.test(k))], [ANN, 'ann@example.com', false])
  assert.equal((await get('/rest/v1/api_keys')).status, 403)
  assert.equal((await get('/storage/v1/object/anything')).status, 404)
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE'] as const) {
    const handler = restRoute[method]
    const res = await handler(new NextRequest(`http://localhost:3000${view.VIEW_REST_PREFIX}/rest/v1/students`, { method, body: '{}' }), { params: Promise.resolve({ path: ['rest', 'v1', 'students'] }) })
    assert.equal(res.status, 405, method)
  }
  assert.equal(tables.students.length, 2)
  user = TUTOR_USER
  assert.equal((await get('/rest/v1/students')).status, 403, 'a tutor cannot use the reader')
})

// ---- the strip on the dashboard ---------------------------------------------------------------------------------------------------------------

test('the strip says who is being viewed, that it is read-only, and has an Exit that posts to the one open write, in English and in Vietnamese', async () => {
  const en = renderToStaticMarkup(await ViewAsBanner({ tutorName: 'Ann Tutor' }))
  assert.match(en, /data-testid="view-as-label">Viewing as admin: Ann Tutor · read-only</)
  assert.match(en, new RegExp(`<form [^>]*action="${view.VIEW_EXIT_PATH}"`))
  assert.match(en, /<form [^>]*method="POST"/)
  assert.match(en, /data-testid="view-as-exit"[^>]*>Exit</)
  assert.match(en, /sticky top-0/)
  setAdminLang('vi')
  const vi = renderToStaticMarkup(await ViewAsBanner({ tutorName: 'Ann Tutor' }))
  assert.match(vi, /Đang xem với tư cách quản trị: Ann Tutor · chỉ đọc/)
  assert.match(vi, /Thoát</)
  const nasty = renderToStaticMarkup(await ViewAsBanner({ tutorName: '<img src=x onerror=alert(1)>' }))
  assert.doesNotMatch(nasty, /<img/, 'a tutor\'s name is text, never markup')
})

test('the dashboard layout draws the strip only while a view is open, and the rest of the layout is untouched', () => {
  const layout = read('app/(dashboard)/layout.tsx')
  assert.match(layout, /const view = await activeViewTutor\(\)/)
  assert.match(layout, /\{view && <ViewAsBanner tutorName=\{view\.name \|\| view\.email\} \/>\}/)
  assert.match(layout, /<Sidebar plan=\{plan\}/)
  assert.ok(layout.indexOf('<ViewAsBanner') < layout.indexOf('<Sidebar'), 'the strip is above everything else')
})

// ---- the seams ---------------------------------------------------------------------------------------------------------------------------------

test('nothing builds its own database client around the seam: only the files that are the seam, the login callback and the proxy do', () => {
  const files = ['app/auth/callback/route.ts', 'lib/supabase/client.ts', 'lib/supabase/server.ts', 'proxy.ts']
  const found = (dir: string): string[] => []
  void found
  const SKIP = new Set(files)
  const offenders: string[] = []
  const walk = (dir: string) => {
    for (const f of readdirSyncSafe(dir)) {
      const p = path.join(dir, f)
      if (statSafe(p)) { walk(p); continue }
      const rel = path.relative(SRC, p).split(path.sep).join('/')
      if (!/\.(ts|tsx)$/.test(rel) || SKIP.has(rel)) continue
      if (/createServerClient\(|createBrowserClient\(/.test(readFileSync(p, 'utf8'))) offenders.push(rel)
    }
  }
  walk(SRC)
  assert.deepEqual(offenders, [])
  // and the files that are allowed to are the ones this ticket reasoned about
  for (const f of files) assert.ok(read(f).length > 0)
})

test('the sign-out of the admin frame uses the admin\'s own client, and the browser client reads through the server only while the flag cookie is set and never grants anything by itself', () => {
  assert.match(read('components/admin/SignOutButton.tsx'), /createRealClient\(\)\.auth\.signOut\(\)/)
  const client = read('lib/supabase/client.ts')
  assert.match(client, /if \(viewFlagOn\(\)\) return createBrowserClient\(url, key, \{ global: \{ fetch: viewFetch\(url\) \} \}\)/)
  assert.match(client, /\/rest\/v1\//)
  assert.doesNotMatch(client, /service|SERVICE/i, 'the browser never holds the server key')
})

import { readdirSync, statSync } from 'node:fs'
function readdirSyncSafe(dir: string): string[] { try { return readdirSync(dir) } catch { return [] } }
function statSafe(p: string): boolean { try { return statSync(p).isDirectory() } catch { return false } }
void createElement
