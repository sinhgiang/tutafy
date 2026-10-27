// T-0614: no secret is written in the code. Without its variable, every route that depends on a
// secret refuses (student sign-in links, the two scheduled jobs, the migration runner); with the
// right value it works; with a wrong one it refuses. The log never holds a secret's value.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import crypto from 'node:crypto'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

let db: FakeDb
let adminCalls = 0
let sessionUser: { id: string; email: string } | null = null

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createAdminClient: () => { adminCalls++; return db },
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: sessionUser } }) } }),
  },
})
mock.module('next/navigation', { exports: { redirect: (to: string) => { throw new Error(`NEXT_REDIRECT:${to}`) } } })

const secrets = await import('@/lib/secrets.ts')
const studentAuth = await import('@/lib/student-auth.ts')
const sendLink = await import('@/app/api/student/send-link/route.ts')
const reminders = await import('@/app/api/cron/reminders/route.ts')
const reports = await import('@/app/api/cron/progress-reports/route.ts')
const migrate = await import('@/app/api/admin/migrate/route.ts')
const { ADMIN_EMAIL } = await import('./support/admin-account.ts')
const { NextRequest } = await import('next/server.js')

const GOOD = 'a-long-random-test-secret-0123456789'
const OTHER = 'another-long-random-test-secret-987654'
const OLD_CONSTANT = 'tutafy-student-auth-secret' // the value that used to be written in the code
const ENV_NAMES = ['CRON_SECRET', 'STUDENT_AUTH_SECRET', 'RESEND_API_KEY', 'SUPABASE_ACCESS_TOKEN', 'DATABASE_URL']

let logged: string[] = []
beforeEach(() => {
  for (const n of ENV_NAMES) delete process.env[n]
  secrets.resetSecretLog()
  logged = []
  mock.method(console, 'error', (...a: unknown[]) => { logged.push(a.join(' ')) })
  db = createFakeDb({ students: [{ id: 's1', name: 'Sam Student', email: 'sam@example.com', status: 'active' }] })
  adminCalls = 0
  sessionUser = null
})

const noSecretValuesIn = (lines: string[]) => {
  for (const v of [GOOD, OTHER, OLD_CONSTANT]) assert.ok(!lines.join('\n').includes(v), 'a secret value reached the log')
}

// ---- the helpers ------------------------------------------------------------------------------------

test('readSecret: missing, blank and too-short values are "not configured", with one log line that names the variable only', () => {
  assert.equal(secrets.readSecret('CRON_SECRET'), null)
  assert.equal(secrets.readSecret('CRON_SECRET', { CRON_SECRET: '   ' }), null)
  assert.equal(secrets.readSecret('CRON_SECRET', { CRON_SECRET: 'short' }), null)
  assert.equal(secrets.readSecret('CRON_SECRET', { CRON_SECRET: ` ${GOOD} ` }), GOOD)
  assert.equal(logged.length, 2) // "not set" once (the second call repeats it), "too short" once
  assert.ok(logged.every(l => l.includes('CRON_SECRET')))
  assert.ok(!logged.join('\n').includes('short\n'))
  noSecretValuesIn(logged)
})

test('safeEqual: equal strings only', () => {
  assert.equal(secrets.safeEqual('abc', 'abc'), true)
  assert.equal(secrets.safeEqual('abc', 'abd'), false)
  assert.equal(secrets.safeEqual('abc', 'abcd'), false)
  assert.equal(secrets.safeEqual('', ''), true)
})

test('studentAuthSecret: its own variable first, CRON_SECRET only while moving over, nothing otherwise', () => {
  assert.equal(secrets.studentAuthSecret({}), null)
  assert.equal(secrets.studentAuthSecret({ CRON_SECRET: GOOD }), GOOD)
  assert.ok(logged.some(l => l.includes('STUDENT_AUTH_SECRET is not set')))
  assert.equal(secrets.studentAuthSecret({ STUDENT_AUTH_SECRET: OTHER, CRON_SECRET: GOOD }), OTHER)
  // a set-but-unusable own variable does NOT silently fall back to the cron secret
  assert.equal(secrets.studentAuthSecret({ STUDENT_AUTH_SECRET: 'tiny', CRON_SECRET: GOOD }), null)
  noSecretValuesIn(logged)
})

// ---- (1) student sign-in links ----------------------------------------------------------------------

test('student links: with no variable at all, nothing can be signed and nothing is accepted', () => {
  assert.throws(() => studentAuth.signStudentToken('sam@example.com'), studentAuth.StudentAuthUnavailable)
  assert.deepEqual(studentAuth.verifyStudentToken('anything'), { email: '', valid: false })
  assert.equal(studentAuth.isStudentAuthConfigured(), false)
  assert.ok(logged.length >= 1 && logged.every(l => l.startsWith('[secrets]')))
  noSecretValuesIn(logged)
})

test('student links: a link signed with the old value that was written in the code is refused', () => {
  process.env.STUDENT_AUTH_SECRET = GOOD
  const forged = (email: string) => {
    const ts = Date.now()
    const sig = crypto.createHmac('sha256', OLD_CONSTANT).update(`${email}:${ts}`).digest('hex')
    return Buffer.from(`${email}:${ts}:${sig}`).toString('base64url')
  }
  assert.equal(studentAuth.verifyStudentToken(forged('sam@example.com')).valid, false)
  // and with no variable set, the old value never becomes the key
  delete process.env.STUDENT_AUTH_SECRET
  assert.equal(studentAuth.verifyStudentToken(forged('sam@example.com')).valid, false)
})

test('student links: right secret signs and verifies; wrong secret, edited link and old or future links are refused', () => {
  process.env.STUDENT_AUTH_SECRET = GOOD
  const token = studentAuth.signStudentToken(' Sam@Example.com ')
  assert.deepEqual(studentAuth.verifyStudentToken(token), { email: 'sam@example.com', valid: true })

  const decoded = Buffer.from(token, 'base64url').toString()
  const edited = Buffer.from(decoded.replace('sam@example.com', 'boss@example.com')).toString('base64url')
  assert.equal(studentAuth.verifyStudentToken(edited).valid, false)
  assert.equal(studentAuth.verifyStudentToken('not-a-token').valid, false)
  assert.equal(studentAuth.verifyStudentToken('').valid, false)

  process.env.STUDENT_AUTH_SECRET = OTHER // the key changed: old links stop working
  assert.equal(studentAuth.verifyStudentToken(token).valid, false)

  process.env.STUDENT_AUTH_SECRET = GOOD
  const realNow = Date.now
  mock.method(Date, 'now', () => realNow() + 8 * 24 * 60 * 60 * 1000)
  assert.equal(studentAuth.verifyStudentToken(token).valid, false) // older than 7 days
  mock.method(Date, 'now', () => realNow() - 60 * 1000)
  assert.equal(studentAuth.verifyStudentToken(token).valid, false) // dated in the future
  mock.method(Date, 'now', realNow)
  assert.equal(studentAuth.verifyStudentToken(token).valid, true)
})

test('student links: during the move, a link signed with CRON_SECRET still works; once STUDENT_AUTH_SECRET is set it does not', () => {
  process.env.CRON_SECRET = GOOD
  const token = studentAuth.signStudentToken('sam@example.com')
  assert.equal(studentAuth.verifyStudentToken(token).valid, true)
  process.env.STUDENT_AUTH_SECRET = OTHER
  assert.equal(studentAuth.verifyStudentToken(token).valid, false)
})

test('send-link route: no key means 503 for everyone and nothing is looked up; a key means the usual quiet 200', async () => {
  const call = (body: unknown) => sendLink.POST(new Request('https://tutafy.test/api/student/send-link', { method: 'POST', body: JSON.stringify(body) }))
  const closed = await call({ email: 'sam@example.com' })
  assert.equal(closed.status, 503)
  assert.deepEqual(await closed.json(), { error: 'Unavailable' })
  assert.equal(adminCalls, 0)
  noSecretValuesIn(logged)

  process.env.STUDENT_AUTH_SECRET = GOOD
  assert.equal((await call({ email: 'sam@example.com' })).status, 200)
  assert.deepEqual(await (await call({ email: 'nobody@example.com' })).json(), { ok: true }) // same answer: no hint who exists
  assert.equal((await call({})).status, 400)
})

// ---- (2) the two scheduled jobs ---------------------------------------------------------------------------

for (const [name, handler] of [['reminders', reminders.GET], ['progress-reports', reports.GET]] as const) {
  test(`cron ${name}: no CRON_SECRET closes it, a wrong header is refused, the right one runs`, async () => {
    const get = (auth?: string) => handler(new Request(`https://tutafy.test/api/cron/${name}`, { headers: auth ? { authorization: auth } : {} }))

    // no variable: closed, even for a caller that sends no header (the old code let that through)
    assert.equal((await get()).status, 503)
    assert.equal((await get(`Bearer ${GOOD}`)).status, 503)
    assert.equal((await get('Bearer ')).status, 503)
    assert.equal(adminCalls, 0)
    assert.ok(logged.some(l => l.includes('CRON_SECRET is not set')))
    noSecretValuesIn(logged)

    // a variable that is too short is not a secret either
    process.env.CRON_SECRET = 'short'
    assert.equal((await get('Bearer short')).status, 503)

    process.env.CRON_SECRET = GOOD
    assert.equal((await get()).status, 401)
    assert.equal((await get('Bearer wrong-secret-value-0123456789')).status, 401)
    assert.equal((await get(GOOD)).status, 401) // not in Bearer form
    assert.equal((await get(`Bearer ${GOOD}x`)).status, 401)
    assert.equal(adminCalls, 0)

    // the right value gets past the gate (here it stops at "no email key", before touching the database)
    const ok = await get(`Bearer ${GOOD}`)
    assert.equal(ok.status, 200)
    assert.match(JSON.stringify(await ok.json()), /RESEND_API_KEY not configured/)
    noSecretValuesIn(logged)
  })
}

test('cronGate on its own: 503 without a usable secret, 401 for a wrong header, null for the right one', () => {
  const req = (h?: string) => new Request('https://tutafy.test/x', { headers: h ? { authorization: h } : {} })
  assert.equal(secrets.cronGate(req(), {})?.status, 503)
  assert.equal(secrets.cronGate(req(`Bearer ${GOOD}`), {})?.status, 503)
  assert.equal(secrets.cronGate(req(), { CRON_SECRET: GOOD })?.status, 401)
  assert.equal(secrets.cronGate(req('Bearer nope'), { CRON_SECRET: GOOD })?.status, 401)
  assert.equal(secrets.cronGate(req(`Bearer ${GOOD}`), { CRON_SECRET: GOOD }), null)
})

// ---- (3) the migration runner -------------------------------------------------------------------------------

function migrateRequest(query: string, opts: { method?: string; origin?: string | null } = {}) {
  const headers: Record<string, string> = { host: 'www.tutafy.test' }
  if (opts.origin !== null) headers.origin = opts.origin ?? 'https://www.tutafy.test'
  return new NextRequest(`https://www.tutafy.test/api/admin/migrate${query}`, { method: opts.method ?? 'POST', headers })
}

test('migrate: a link (GET) does nothing, whatever it carries', async () => {
  for (const q of ['', '?secret=tutafy-migrate-008', '?run=all', `?secret=${GOOD}`]) {
    const res = await migrate.GET()
    assert.equal(res.status, 405, q)
    assert.equal(res.headers.get('allow'), 'POST')
  }
})

test('migrate: the old secrets written in the code open nothing; signed-out is 401, a tutor is 403, other sites are 403', async () => {
  const realFetch = globalThis.fetch
  let fetched = 0
  globalThis.fetch = (async () => { fetched++; throw new Error('no network in tests') }) as typeof fetch
  try {
    for (const old of ['tutafy-migrate-007', 'tutafy-migrate-008', 'tutafy-migrate-012', 'tutafy-migrate-013', 'tutafy-migrate-016']) {
      sessionUser = null
      assert.equal((await migrate.POST(migrateRequest(`?secret=${old}`))).status, 401, `${old} signed out`)
      sessionUser = { id: 't1', email: 'ten@example.com' }
      assert.equal((await migrate.POST(migrateRequest(`?secret=${old}`))).status, 403, `${old} as a tutor`)
    }
    process.env.CRON_SECRET = GOOD // even the cron secret is not a way in
    sessionUser = null
    assert.equal((await migrate.POST(migrateRequest(`?secret=${GOOD}&run=all`))).status, 401)
    // another site, or no Origin at all
    sessionUser = { id: 'a', email: ADMIN_EMAIL }
    assert.equal((await migrate.POST(migrateRequest('?run=all', { origin: 'https://evil.example' }))).status, 403)
    assert.equal((await migrate.POST(migrateRequest('?run=all', { origin: null }))).status, 403)
    assert.equal(fetched, 0, 'nothing was sent to the database service')
  } finally {
    globalThis.fetch = realFetch
  }
})

test('migrate: the admin account can call it from this site; an unknown migration name is refused', async () => {
  const realFetch = globalThis.fetch
  let fetched = 0
  globalThis.fetch = (async () => { fetched++; throw new Error('no network in tests') }) as typeof fetch
  try {
    sessionUser = { id: 'a', email: ADMIN_EMAIL }
    // no database access variables on the server: it gets past the gate, finds nothing to run with, and says so
    for (const run of ['all', '013', '014', '015', '016']) {
      const res = await migrate.POST(migrateRequest(`?run=${run}`))
      assert.equal(res.status, 503, run)
      const body = await res.json()
      assert.match(JSON.stringify(body), /not set|not possible|failed/i)
    }
    assert.equal((await migrate.POST(migrateRequest('?run=drop-everything'))).status, 400)
    assert.equal((await migrate.POST(migrateRequest('?run=999'))).status, 400)
    assert.equal(fetched, 0)
  } finally {
    globalThis.fetch = realFetch
  }
})

// ---- the code holds no secret and no fallback --------------------------------------------------------------------

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(e.name) ? [full] : []
  })
}

/** Lines that write a secret or a way in into the code. */
export function hardCodedSecrets(source: string): string[] {
  return source.split('\n').filter(l =>
    /tutafy-student-auth-secret/.test(l)
    || /tutafy-migrate-\d+/.test(l)
    || /process\.env\.[A-Z_]*SECRET[A-Z_]*\s*(\?\?|\|\|)\s*['"`]/.test(l) // a fallback value for a secret
    || /process\.env\.CRON_SECRET\s*&&/.test(l), // "only check when it is set" = open when it is not
  )
}

test('scanner self-check', () => {
  assert.equal(hardCodedSecrets(`const s = process.env.CRON_SECRET ?? 'tutafy-student-auth-secret'`).length, 1)
  assert.equal(hardCodedSecrets(`if (secret === 'tutafy-migrate-015') {`).length, 1)
  assert.equal(hardCodedSecrets(`if (process.env.CRON_SECRET && h !== x) {`).length, 1)
  assert.equal(hardCodedSecrets(`const s = process.env.OTHER_SECRET || "abc"`).length, 1)
  assert.equal(hardCodedSecrets(`const s = readSecret('CRON_SECRET')`).length, 0)
  assert.equal(hardCodedSecrets(`// the migration was applied`).length, 0)
})

test('no file in src holds a secret, a fallback value or a "check only if set" gate', () => {
  const hits: string[] = []
  for (const file of sourceFiles(SRC)) {
    for (const line of hardCodedSecrets(readFileSync(file, 'utf8'))) hits.push(`${path.relative(ROOT, file)}: ${line.trim()}`)
  }
  assert.deepEqual(hits, [])
})

test('CRON_SECRET and STUDENT_AUTH_SECRET are read in one place only (secrets.ts), and only student-auth.ts signs links', () => {
  const readers: string[] = []
  const signers: string[] = []
  for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, 'utf8')
    const rel = path.relative(SRC, file).replace(/\\/g, '/')
    if (/process\.env\.(CRON_SECRET|STUDENT_AUTH_SECRET)|env\.(CRON_SECRET|STUDENT_AUTH_SECRET)/.test(text)) readers.push(rel)
    if (text.includes('createHmac')) signers.push(rel)
  }
  assert.deepEqual(readers, ['lib/secrets.ts'])
  assert.ok(signers.includes('lib/student-auth.ts'))
  assert.ok(!signers.includes('app/student/dashboard/page.tsx') && !signers.includes('app/api/student/send-link/route.ts'))
})

test('the student dashboard and the Google hand-off use the shared functions, and the admin page presses a POST button', () => {
  const dash = readFileSync(path.join(SRC, 'app/student/dashboard/page.tsx'), 'utf8')
  assert.ok(dash.includes("import { verifyStudentToken } from '@/lib/student-auth'") && dash.includes('verifyStudentToken(token)'))
  const callback = readFileSync(path.join(SRC, 'app/auth/callback/route.ts'), 'utf8')
  assert.equal((callback.match(/catch \{[\s\S]{0,160}?student\/login\?error=unavailable/g) ?? []).length, 2)
  const page = readFileSync(path.join(SRC, 'app/(admin)/admin/migrate/page.tsx'), 'utf8')
  assert.ok(page.includes("fetch('/api/admin/migrate?run=all', { method: 'POST' })"))
  const cron = ['app/api/cron/reminders/route.ts', 'app/api/cron/progress-reports/route.ts'].map(f => readFileSync(path.join(SRC, f), 'utf8'))
  for (const c of cron) assert.ok(c.includes('const denied = cronGate(request)'))
})
