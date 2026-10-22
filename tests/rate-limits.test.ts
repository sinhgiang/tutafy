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
const feedback = await import('@/app/api/feedback/route.ts')
const avatar = await import('@/app/api/tutors/avatar/route.ts')
const { signStudentToken } = await import('@/lib/student-auth.ts')
const { createLimiter } = await import('@/lib/rate-limit-memory.ts')
const { NextRequest } = await import('next/server.js')

process.env.STUDENT_AUTH_SECRET = 'test-only-secret-for-rate-limit-tests'
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

// ---- /api/feedback -----------------------------------------------------------------------------------------

const feedbackFixed = [
  { kind: 'header', name: 'origin', reason: 'the route refuses any Origin that is not its own host, so it cannot change' },
  { kind: 'header', name: 'host', reason: 'the host the request is for; it must match the Origin' },
  { kind: 'header', name: 'x-forwarded-host', reason: 'when a proxy sets it, it must match the Origin; the call leaves it out' },
] as const

const feedbackRequest = (v: Parameters<Parameters<typeof assertRateLimitHolds>[0]['call']>[0], token: string) => v.request({
  url: `${ORIGIN}/api/feedback`,
  headers: { origin: ORIGIN, host: 'www.tutafy.test' },
  body: { kind: v.pick(['bug', 'idea', 'question']), message: v.text(), token },
})

test('/api/feedback: at most 5 messages in 10 minutes for one signed-in tutor, whatever kind or text the body carries', async () => {
  db = createFakeDb({ tutors: [{ id: A_SESSION, email: 'a@example.com', name: 'A', slug: 'a' }], feedback: [] })
  sessionUser = { id: A_SESSION, email: 'a@example.com' }
  const r = await assertRateLimitHolds({
    routeFile: 'app/api/feedback/route.ts',
    limiter: 'perAccount',
    fixed: [...feedbackFixed, { kind: 'body', name: 'token', reason: 'an empty token means "the signed-in tutor"; the limit is counted on the account of the session, not on the token' }],
    call: v => feedback.POST(feedbackRequest(v, '')),
  })
  assert.equal(r.limit, 5)
  sessionUser = null
})

test('/api/feedback: at most 5 messages in 10 minutes for one student link, whatever kind or text the body carries', async () => {
  db = createFakeDb({ tutors: [], feedback: [] })
  sessionUser = null
  const token = signStudentToken('student@example.com')
  const r = await assertRateLimitHolds({
    routeFile: 'app/api/feedback/route.ts',
    limiter: 'perAccount',
    fixed: [...feedbackFixed, { kind: 'body', name: 'token', reason: 'a signed student link is the identity this limit counts (a made-up one is refused with 401 before the limit)' }],
    call: v => feedback.POST(feedbackRequest(v, token)),
  })
  assert.equal(r.limit, 5)
})

test('/api/feedback: at most 120 calls a minute overall, whatever kind, text or link an unknown caller makes up', async () => {
  db = createFakeDb({ tutors: [], feedback: [] })
  sessionUser = null
  const r = await assertRateLimitHolds({
    routeFile: 'app/api/feedback/route.ts',
    limiter: 'overall',
    fixed: [...feedbackFixed],
    call: v => feedback.POST(v.request({
      url: `${ORIGIN}/api/feedback`,
      headers: { origin: ORIGIN, host: 'www.tutafy.test' },
      body: { kind: v.pick(['bug', 'idea', 'question']), message: v.text(), token: v.text() },
    })),
  })
  assert.equal(r.limit, 120)
})

// ---- the check itself must fail on the mistakes it exists to catch ------------------------------------------------

type Handler = (req: InstanceType<typeof NextRequest>) => Promise<Response> | Response

/** A throw-away route with one limiter, counted on whatever `keyOf` returns. */
function fakeRoute(keyOf: (req: InstanceType<typeof NextRequest>) => string | Promise<string>, max = 4) {
  const lim = createLimiter({ max, windowMs: 60_000 })
  const source = `const guard = createLimiter({ max: ${max}, windowMs: 60 * 1000 })`
  const handler: Handler = async req => (lim.hit(await keyOf(req)) ? new Response('ok') : new Response('slow down', { status: 429 }))
  return { handler, source, max }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a throw-away body of unknown shape, in a self-test
const jsonOf = async (req: InstanceType<typeof NextRequest>) => (await req.json()) as Record<string, any>

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
  const byBody = fakeRoute(async req => String((await jsonOf(req)).email ?? 'none'))
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

// Every way a route can read the request must either be followed by the check or make it fail. One test per way,
// each in two forms: the limit counted on a value the caller changes (the check goes red because the limit does
// not hold) and the call leaving that value the same on every call (red: "same value every time").

test('query parameters: nextUrl.searchParams.get is followed', async () => {
  const route = () => fakeRoute(req => req.nextUrl.searchParams.get('email') ?? 'none')
  await assert.rejects(check(route(), v => v.request({ query: { email: v.email() } })), /does not hold when the caller changes url:email/)
  await assert.rejects(check(route(), v => v.request({ query: { email: 'a@example.com' } })), /url:email is read by the route and the call sets it to the same value every time/)
  // declared fixed with a reason, and really read, it is accepted
  await check(fakeRoute(req => (req.nextUrl.searchParams.get('email') ? 'everyone' : 'everyone')), v => v.request({ query: { email: 'a@example.com' } }),
    [{ kind: 'url', name: 'email', reason: 'the limit here is on the whole route, so this value is only a label' }])
})

test('query parameters: the whole URL, as request.url or nextUrl.href, counts as every parameter', async () => {
  const byUrl = () => fakeRoute(req => new URL(req.url).searchParams.get('email') ?? 'none')
  await assert.rejects(check(byUrl(), v => v.request({ query: { email: v.email() } })), /does not hold/)
  await assert.rejects(check(byUrl(), v => v.request({ query: { email: 'a@example.com' } })), /url:email is read by the route and the call sets it to the same value every time/)
  await assert.rejects(check(byUrl(), v => v.request({})), /url:\* is read by the route .* sets no query parameter/)
  const byHref = fakeRoute(req => req.nextUrl.href)
  await assert.rejects(check(byHref, v => v.request({ query: { q: 'same' } })), /url:q is read by the route and the call sets it to the same value every time/)
  // a route that only looks at the path may say so, once, with a reason
  await check(fakeRoute(req => new URL(req.url).pathname), v => v.request({}), [{ kind: 'url', name: '*', reason: 'the route only looks at the path, which does not change' }])
})

test('query parameters: a loop over them, and getAll, are followed', async () => {
  const loop = () => fakeRoute(req => [...req.nextUrl.searchParams.entries()].map(([k, x]) => k + x).join('&'))
  await assert.rejects(check(loop(), v => v.request({ query: { email: v.email() } })), /does not hold/)
  await assert.rejects(check(loop(), v => v.request({ query: { email: 'a@example.com' } })), /same value every time/)
  const all = () => fakeRoute(req => req.nextUrl.searchParams.getAll('tag').join(','))
  await assert.rejects(check(all(), v => v.request({ query: { tag: 'same' } })), /url:tag is read by the route and the call sets it to the same value every time/)
})

test('cookies: getAll() and a loop over the cookies are followed', async () => {
  const getAll = () => fakeRoute(req => req.cookies.getAll().map(c => c.value).join('|'))
  await assert.rejects(check(getAll(), v => v.request({ cookies: { sid: v.uuid() } })), /does not hold/)
  await assert.rejects(check(getAll(), v => v.request({ cookies: { sid: 'same' } })), /cookie:sid is read by the route and the call sets it to the same value every time/)
  const named = () => fakeRoute(req => req.cookies.getAll('sid').map(c => c.value).join('|'))
  await assert.rejects(check(named(), v => v.request({ cookies: { sid: 'same' } })), /cookie:sid is read/)
  const loop = fakeRoute(req => { let out = ''; for (const c of req.cookies) out += c[1].value; return out })
  await assert.rejects(check(loop, v => v.request({ cookies: { sid: 'same' } })), /cookie:sid is read/)
})

test('headers: entries, forEach and for...of are followed', async () => {
  const entries = () => fakeRoute(req => [...req.headers.entries()].filter(([k]) => k === 'x-user').map(([, x]) => x).join(''))
  await assert.rejects(check(entries(), v => v.request({ headers: { 'x-user': v.text() } })), /does not hold/)
  await assert.rejects(check(entries(), v => v.request({ headers: { 'x-user': 'same' } })), /header:x-user is read by the route and the call sets it to the same value every time/)
  const forEach = fakeRoute(req => { let out = ''; req.headers.forEach((x, k) => { if (k === 'x-user') out = x }); return out })
  await assert.rejects(check(forEach, v => v.request({ headers: { 'x-user': 'same' } })), /header:x-user is read/)
  const forOf = fakeRoute(req => { let out = ''; for (const [k, x] of req.headers) if (k === 'x-user') out = x; return out })
  await assert.rejects(check(forOf, v => v.request({ headers: { 'x-user': 'same' } })), /header:x-user is read/)
})

test('body: text() then JSON.parse is followed (every field of the body counts as read)', async () => {
  const route = () => fakeRoute(async req => String(JSON.parse(await req.text()).email ?? 'none'))
  await assert.rejects(check(route(), v => v.request({ body: { email: v.email() } })), /does not hold/)
  await assert.rejects(check(route(), v => v.request({ body: { email: 'a@example.com' } })), /body:email is read by the route and the call sets it to the same value every time/)
})

test('body: fields nested at any depth, and Object.keys / JSON.stringify of the body, are followed', async () => {
  const nested = () => fakeRoute(async req => String((await jsonOf(req)).user?.contact?.email ?? 'none'))
  await assert.rejects(check(nested(), v => v.request({ body: { user: { contact: { email: v.email() } } } })), /does not hold when the caller changes body:user, body:user.contact, body:user.contact.email/)
  await assert.rejects(check(nested(), v => v.request({ body: { user: { contact: { email: 'a@example.com' } } } })), /body:user.contact.email is read by the route and the call sets it to the same value every time/)
  // a fresh sibling does not excuse the fixed field the route really reads
  await assert.rejects(check(nested(), v => v.request({ body: { user: { contact: { email: 'a@example.com' }, other: v.text() } } })), /body:user.contact.email is read by the route and the call sets it to the same value every time/)
  const stringify = () => fakeRoute(async req => JSON.stringify(await jsonOf(req)))
  await assert.rejects(check(stringify(), v => v.request({ body: { a: v.text(), b: 'same' } })), /body:b is read by the route and the call sets it to the same value every time/)
  const keys = fakeRoute(async req => Object.keys(await jsonOf(req)).join(','))
  await assert.rejects(check(keys, v => v.request({ body: { a: 'same' } })), /body:a is read by the route and the call sets it to the same value every time/)
})

test('reads the check cannot follow make it fail instead of passing blind', async () => {
  type Req = InstanceType<typeof NextRequest>
  const readers: [string, (req: Req) => unknown][] = [
    ['formData()', req => req.formData()],
    ['blob()', req => req.blob()],
    ['arrayBuffer()', req => req.arrayBuffer()],
    ['clone()', req => req.clone()],
    ['body', req => req.body],
  ]
  for (const [name, read] of readers) {
    const route = fakeRoute(async req => { await read(req); return 'everyone' })
    await assert.rejects(check(route, v => v.request({ body: { a: v.text() } })), (err: Error) => err.message.includes(`cannot follow "${name}"`), name)
  }
})

test('a part the route reads only from a later call on is still checked', async () => {
  let calls = 0
  // like a branch for a visitor that already exists: the first call does not look at the header, the next ones do
  const route = () => { calls = 0; return fakeRoute(req => (calls++ > 0 ? (req.headers.get('x-late') ?? 'none') : 'first')) }
  await assert.rejects(check(route(), v => v.request({ headers: { 'x-late': 'same' } })), /header:x-late is read by the route and the call sets it to the same value every time/)
  await assert.rejects(check(route(), v => v.request({ body: { a: v.text() } })), /header:x-late is read by the route but the call does not set it/)
  await assert.rejects(check(route(), v => v.request({ headers: { 'x-late': v.text() } })), /does not hold when the caller changes header:x-late/)
})

test('the check puts the clock back when it is done', async () => {
  const before = Date.now
  await check(fakeRoute(() => 'everyone'), v => v.request({ body: { a: v.text() } }))
  assert.equal(Date.now, before)
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

/**
 * The checks the tests really run: a call of the shared check with `routeFile: '<path>', limiter: '<name>'` inside it.
 * A mention in a comment, or in a call wrapped in `assert.rejects(` (a self-test that expects the check to fail),
 * is not a check.
 */
export function checksIn(testSource: string): { routeFile: string; limiter: string }[] {
  const out: { routeFile: string; limiter: string }[] = []
  const needle = 'assertRateLimitHolds({'
  let from = 0
  for (;;) {
    const at = testSource.indexOf(needle, from)
    if (at < 0) break
    from = at + needle.length
    const lineStart = testSource.lastIndexOf('\n', at) + 1
    if (/^\s*(\/\/|\*|\/\*)/.test(testSource.slice(lineStart, at))) continue // on a comment line
    if (/assert\.rejects\(\s*$/.test(testSource.slice(Math.max(0, at - 40), at))) continue // expects the check to fail
    const open = at + needle.length - 1
    let depth = 0
    let end = open
    for (let i = open; i < testSource.length; i++) {
      if (testSource[i] === '{') depth++
      else if (testSource[i] === '}' && --depth === 0) { end = i; break }
    }
    const m = /routeFile:\s*'([^']+)',\s*limiter:\s*'([^']+)'/.exec(testSource.slice(open, end + 1))
    if (m) out.push({ routeFile: m[1], limiter: m[2] })
  }
  return out
}

test('scanner self-check', () => {
  assert.deepEqual(limitersIn(`const a = createLimiter({ max: 1 })\nconst b = createLimiter({ max: 2 })\nconst c = other()`), ['a', 'b'])
  assert.equal(hasOtherLimitSignal(`return NextResponse.json({}, { status: 429 })`), true)
  assert.equal(hasOtherLimitSignal(`const x = createLimiter({ max: 1 })\nstatus: 429`), false)
  assert.equal(hasOtherLimitSignal(`// the page size limit is 100`), false)
  // the call is written in two pieces so this very file does not hold a call of its own for the scan to count
  const call = (body: string) => 'await assertRateLimitHolds' + '({\n' + body + '\n  })'
  const real = call("    routeFile: 'app/api/x/route.ts',\n    limiter: 'perUser',\n    call: v => go({ a: v.text() }),")
  assert.deepEqual(checksIn(real), [{ routeFile: 'app/api/x/route.ts', limiter: 'perUser' }])
  // only a real call is a check: not a comment, not a call that expects a failure, not a bare mention
  assert.deepEqual(checksIn('// ' + real), [])
  assert.deepEqual(checksIn('/**\n * ' + real.replace(/\n/g, '\n * ') + '\n */'), [])
  assert.deepEqual(checksIn('await assert.rejects(' + real.replace('await ', '') + ', /x/)'), [])
  assert.deepEqual(checksIn("routeFile: 'app/api/x/route.ts',\n    limiter: 'perUser',"), [])
  assert.deepEqual(checksIn("const note = \"limiter: 'perUser'\""), [])
  // a call whose block holds braces of its own (an object, a template string) is read to its end
  assert.deepEqual(checksIn(call("    routeFile: 'app/api/y/route.ts', limiter: 'second', fixed: [{ kind: 'body', name: 'a', reason: 'r' }],\n    call: v => go({ url: `${v.n}` }),")), [{ routeFile: 'app/api/y/route.ts', limiter: 'second' }])
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

// ---- /api/tutors/avatar --------------------------------------------------------------------------------------

test('/api/tutors/avatar: at most 10 photo uploads in 10 minutes for one signed-in tutor, whatever the body carries', async () => {
  db = createFakeDb({ tutors: [{ id: A_SESSION, email: 'a@example.com', name: 'A', slug: 'a', avatar_url: null }] })
  sessionUser = { id: A_SESSION, email: 'a@example.com' }
  const r = await assertRateLimitHolds({
    routeFile: 'app/api/tutors/avatar/route.ts',
    limiter: 'perTutor',
    fixed: [
      ...feedbackFixed,
      { kind: 'header', name: 'content-length', reason: 'only a ceiling on the size of the body; the limit is counted on the account of the session, not on a size' },
    ],
    call: v => avatar.POST(v.request({
      url: `${ORIGIN}/api/tutors/avatar`,
      headers: { origin: ORIGIN, host: 'www.tutafy.test' },
      body: { image: v.text() },
    })),
  })
  assert.equal(r.limit, 10)
  sessionUser = null
})
