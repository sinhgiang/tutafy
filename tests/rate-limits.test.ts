// T-0616: every request limit in the code is checked with the shared check
// (tests/support/rate-limit-check.ts): call it limit + 1 times, change every field the caller
// controls on every call, and the limit must still hold. Plus a scan so a new limit cannot ship
// without such a check. Runs in `npm test`; no GitHub Actions needed.
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import { assertRateLimitHolds, limiterMax } from './support/rate-limit-check.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

let db: FakeDb = createFakeDb({ tutors: [] })
let sessionUser: { id: string; email: string } | null = null

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createAdminClient: () => ({
      from: (t: string) => db.from(t),
      auth: { admin: { getUserById: async () => ({ data: { user: null }, error: null }) } },
    }),
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: sessionUser } }) } }),
  },
})
mock.module('resend', { exports: { Resend: class { emails = { send: async () => {} } } } })

const track = await import('@/app/api/track/route.ts')
const register = await import('@/app/api/auth/register/route.ts')
const { createLimiter } = await import('@/lib/rate-limit-memory.ts')
const { NextRequest } = await import('next/server.js')

const ORIGIN = 'https://www.tutafy.test'
const A_SESSION = '11111111-1111-4111-8111-111111111111'
const A_VISITOR = '5b0f2a52-2f3a-4d65-9c1f-0a2b3c4d5e6f'

// ---- /api/track -----------------------------------------------------------------------------------------

const trackFixed = [
  { kind: 'header', name: 'origin', reason: 'the route refuses any Origin that is not its own host, so it cannot change' },
  { kind: 'header', name: 'host', reason: 'the host the request is for; it must match the Origin' },
  { kind: 'header', name: 'x-forwarded-host', reason: 'when a proxy sets it, it must match the Origin; the call leaves it out' },
  { kind: 'body', name: 'consent', reason: 'the route refuses anything but "accepted" (no consent, nothing is recorded)' },
  { kind: 'body', name: 'kind', reason: 'a page view is the call that creates visitors; other kinds are refused by the schema' },
  { kind: 'body', name: 'path', reason: 'a recorded page; any other path is dropped before a visitor is created' },
] as const

function trackRequest(v: Parameters<Parameters<typeof assertRateLimitHolds>[0]['call']>[0], cookie: unknown) {
  return v.request({
    url: `${ORIGIN}/api/track`,
    cookies: { tutafy_vid: cookie as string },
    headers: { origin: ORIGIN, host: 'www.tutafy.test', 'x-forwarded-for': v.ip() as unknown as string, 'x-vercel-ip-country': v.text() as unknown as string, 'user-agent': v.text() as unknown as string },
    body: {
      consent: 'accepted', kind: 'page_view', path: '/',
      referrer: v.text(), utm: { source: v.text(), medium: v.text(), campaign: v.text() },
      gclid: v.flip(), plan: v.pick(['pro', 'academy']), identify: v.flip(),
    },
  })
}

test('/api/track: at most 60 NEW visitors a minute, whatever cookie, address or body the caller makes up', async () => {
  db = createFakeDb({})
  sessionUser = null
  const r = await assertRateLimitHolds({
    routeFile: 'app/api/track/route.ts',
    limiter: 'newVisitors',
    fixed: [...trackFixed],
    call: v => track.POST(trackRequest(v, v.uuid())),
  })
  assert.equal(r.limit, 60)
  assert.ok(r.reads.includes('cookie:tutafy_vid'), 'the made-up cookie was in play on every call')
})

test('/api/track: at most 120 events in 10 minutes for ONE visitor, whatever else the caller changes', async () => {
  db = createFakeDb({})
  const r = await assertRateLimitHolds({
    routeFile: 'app/api/track/route.ts',
    limiter: 'perVisitor',
    fixed: [...trackFixed, { kind: 'cookie', name: 'tutafy_vid', reason: 'the visitor identity this limit counts; a fresh cookie is a new visitor, which newVisitors limits' }],
    call: v => track.POST(trackRequest(v, A_VISITOR)),
  })
  assert.equal(r.limit, 120)
})

// ---- /api/auth/register ----------------------------------------------------------------------------------

test('/api/auth/register: at most 5 tries in 10 minutes for one account, whatever email, name or code the body carries', async () => {
  db = createFakeDb({ tutors: [] })
  sessionUser = { id: A_SESSION, email: 'a@example.com' }
  const r = await assertRateLimitHolds({
    routeFile: 'app/api/auth/register/route.ts',
    limiter: 'perAccount',
    fixed: [{ kind: 'body', name: 'userId', reason: 'it must be the signed-in account or the route answers 403 before the limit counts' }],
    call: v => register.POST(v.request({
      url: `${ORIGIN}/api/auth/register`,
      body: { userId: A_SESSION, email: v.email(), name: v.text(), refCode: v.text() },
    })),
  })
  assert.equal(r.limit, 5)
  sessionUser = null
})

test('/api/auth/register: at most 120 calls a minute overall, whatever id, email or name an unknown caller makes up', async () => {
  db = createFakeDb({ tutors: [] })
  sessionUser = null
  const r = await assertRateLimitHolds({
    routeFile: 'app/api/auth/register/route.ts',
    limiter: 'overall',
    call: v => register.POST(v.request({
      url: `${ORIGIN}/api/auth/register`,
      body: { userId: v.uuid(), email: v.email(), name: v.text(), refCode: v.text() },
    })),
  })
  assert.equal(r.limit, 120)
})

// ---- the check itself must fail on the mistakes it exists to catch ------------------------------------------------

type Handler = (req: InstanceType<typeof NextRequest>) => Promise<Response> | Response

/** A throw-away route with one limiter, counted on whatever `keyOf` returns. */
function fakeRoute(keyOf: (req: InstanceType<typeof NextRequest>, body: Record<string, unknown>) => string, max = 4) {
  const lim = createLimiter({ max, windowMs: 60_000 })
  const source = `const guard = createLimiter({ max: ${max}, windowMs: 60 * 1000 })`
  const handler: Handler = async req => {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    return lim.hit(keyOf(req, body)) ? new Response('ok') : new Response('slow down', { status: 429 })
  }
  return { handler, source, max }
}

const callWith = (handler: Handler, make: (v: Parameters<Parameters<typeof assertRateLimitHolds>[0]['call']>[0]) => ReturnType<Parameters<Parameters<typeof assertRateLimitHolds>[0]['call']>[0]['request']>) =>
  (v: Parameters<Parameters<typeof assertRateLimitHolds>[0]['call']>[0]) => Promise.resolve(handler(make(v)))

const check = (route: ReturnType<typeof fakeRoute>, make: Parameters<typeof callWith>[1], fixed: Parameters<typeof assertRateLimitHolds>[0]['fixed'] = []) =>
  assertRateLimitHolds({ routeFile: 'fake/route.ts', limiter: 'guard', fixed, call: callWith(route.handler, make), override: { source: route.source, limit: route.max } })

test('the check passes for a limit counted on something the caller cannot change', async () => {
  const route = fakeRoute(() => 'everyone')
  await check(route, v => v.request({ body: { email: v.email() } }))
})

test('the check FAILS when the limit is counted on a cookie the caller makes up', async () => {
  const route = fakeRoute(req => req.cookies.get('sid')?.value ?? 'none')
  await assert.rejects(check(route, v => v.request({ cookies: { sid: v.uuid() } })), /does not hold when the caller changes cookie:sid/)
})

test('the check FAILS when the limit is counted on a header, or on a field of the body', async () => {
  const byHeader = fakeRoute(req => req.headers.get('x-forwarded-for') ?? 'none')
  await assert.rejects(check(byHeader, v => v.request({ headers: { 'x-forwarded-for': v.ip() } })), /does not hold/)
  const byBody = fakeRoute((_, body) => String(body.email ?? 'none'))
  await assert.rejects(check(byBody, v => v.request({ body: { email: v.email() } })), /does not hold/)
})

test('the check FAILS when the limit is gone (never says no)', async () => {
  const none: ReturnType<typeof fakeRoute> = { handler: async () => new Response('ok'), source: 'const guard = createLimiter({ max: 4, windowMs: 1000 })', max: 4 }
  await assert.rejects(check(none, v => v.request({ body: { a: v.text() } })), /was let through/)
})

test('the check FAILS when the limit says no too early, or is not the number in the code', async () => {
  const early = fakeRoute(() => 'everyone', 2)
  await assert.rejects(assertRateLimitHolds({
    routeFile: 'fake/route.ts', limiter: 'guard',
    call: callWith(early.handler, v => v.request({ body: { a: v.text() } })),
    override: { source: 'const guard = createLimiter({ max: 4, windowMs: 1000 })', limit: 4 }, // claims 4, the route allows 2
  }), /was refused/)
  await assert.rejects(assertRateLimitHolds({ routeFile: 'app/api/track/route.ts', limiter: 'noSuchLimiter', call: async () => new Response('ok') }), /no "const noSuchLimiter/)
})

test('the check FAILS when the call leaves a field the route reads at the same value every time', async () => {
  const route = fakeRoute(req => req.headers.get('user-agent') ? 'x' : 'y')
  await assert.rejects(check(route, v => v.request({ headers: { 'user-agent': 'always-the-same' } })), /same value every time/)
  // ...unless it is listed as fixed with a real reason, and then it must really be read
  await check(fakeRoute(req => (req.headers.get('user-agent') ? 'x' : 'y')), v => v.request({ headers: { 'user-agent': 'always-the-same' } }),
    [{ kind: 'header', name: 'user-agent', reason: 'a fixed value on purpose, for this self-test only' }])
  await assert.rejects(check(fakeRoute(() => 'x'), v => v.request({ body: { a: v.text() } }),
    [{ kind: 'header', name: 'x-never-read', reason: 'this header is not read by the route at all' }]), /never reads it/)
  await assert.rejects(check(fakeRoute(() => 'x'), v => v.request({ body: { a: v.text() } }),
    [{ kind: 'header', name: 'x-whatever', reason: 'short' }]), /needs a real reason/)
})

test('the check FAILS when the route reads a field the call never sets', async () => {
  const route = fakeRoute(req => req.headers.get('x-api-client') ?? 'none-but-everyone')
  await assert.rejects(check(route, v => v.request({ body: { a: v.text() } })), /is read by the route but the call does not set it/)
})

// ---- the scan: no limit without a check ---------------------------------------------------------------------------

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) return routeFiles(full)
    return e.name === 'route.ts' ? [full] : []
  })
}

/** Limiters a route creates: `const <name> = createLimiter(` */
export function limitersIn(source: string): string[] {
  return [...source.matchAll(/const\s+(\w+)\s*=\s*createLimiter\(/g)].map(m => m[1])
}

/** Does a route talk about request limits without using the shared limiter? */
export function hasOtherLimitSignal(source: string): boolean {
  return /\b429\b|too many requests|rate[-_ ]?limit/i.test(source) && !/createLimiter\(/.test(source)
}

/** The checks the tests make: `routeFile: '<path>'` followed by `limiter: '<name>'`. */
export function checksIn(testSource: string): { routeFile: string; limiter: string }[] {
  return [...testSource.matchAll(/routeFile:\s*'([^']+)',\s*limiter:\s*'([^']+)'/g)].map(m => ({ routeFile: m[1], limiter: m[2] }))
}

test('scanner self-check', () => {
  assert.deepEqual(limitersIn(`const a = createLimiter({ max: 1 })\nconst b = createLimiter({ max: 2 })\nconst c = other()`), ['a', 'b'])
  assert.equal(hasOtherLimitSignal(`return NextResponse.json({}, { status: 429 })`), true)
  assert.equal(hasOtherLimitSignal(`const x = createLimiter({ max: 1 })\nstatus: 429`), false)
  assert.equal(hasOtherLimitSignal(`// the page size limit is 100`), false)
  assert.deepEqual(checksIn(`routeFile: 'app/api/x/route.ts',\n    limiter: 'perUser',`), [{ routeFile: 'app/api/x/route.ts', limiter: 'perUser' }])
  assert.equal(limiterMax(`const guard = createLimiter({ max: 7, windowMs: 1 })`, 'guard'), 7)
  assert.equal(limiterMax(`const guard = createLimiter({ windowMs: 1, max: 7 })`, 'guard'), 7)
})

test('every limiter in a route has a check in tests/ that names its route file and its limiter', () => {
  const testsDir = path.join(ROOT, 'tests')
  const checks = readdirSync(testsDir).filter(f => f.endsWith('.test.ts'))
    .flatMap(f => checksIn(readFileSync(path.join(testsDir, f), 'utf8')))
  const missing: string[] = []
  let limiters = 0
  for (const file of routeFiles(path.join(SRC, 'app'))) {
    const rel = path.relative(SRC, file).replace(/\\/g, '/')
    for (const name of limitersIn(readFileSync(file, 'utf8'))) {
      limiters++
      if (!checks.some(c => c.routeFile === rel && c.limiter === name)) missing.push(`${rel}: limiter "${name}" has no assertRateLimitHolds check`)
    }
  }
  assert.ok(limiters >= 4, `expected the known limiters, found ${limiters}`)
  assert.deepEqual(missing, [])
})

test('no route has its own kind of limit (429, "too many requests", "rate limit") outside the shared limiter', () => {
  const own = routeFiles(path.join(SRC, 'app')).filter(f => hasOtherLimitSignal(readFileSync(f, 'utf8')))
  assert.deepEqual(own.map(f => path.relative(SRC, f).replace(/\\/g, '/')), [])
})

test('the limiter module is only used by routes that are checked (no limiter hidden in a lib file)', () => {
  const lib: string[] = []
  const walk = (dir: string) => readdirSync(dir, { withFileTypes: true }).forEach(e => {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) return walk(full)
    if (/\.(ts|tsx)$/.test(e.name) && e.name !== 'route.ts' && !full.endsWith('rate-limit-memory.ts') && /createLimiter\(/.test(readFileSync(full, 'utf8'))) lib.push(path.relative(SRC, full))
  })
  walk(SRC)
  assert.deepEqual(lib, [])
})
