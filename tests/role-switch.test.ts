// T-0676: a person who is a tutor AND a student of another tutor can switch sides. The REAL code runs here:
//   - src/lib/role-switch.ts (who counts as verified, who is an enrolled student elsewhere, who may go back),
//   - the REAL GET /api/student/view-as (the redirect that carries the signed link),
//   - the REAL student dashboard page, the tutor Header and the tutor login page rendered to HTML,
//   - the REAL /auth/callback, to show the rule that a student never becomes a tutor is still there.
// The database is an in-memory fake (tests/support/fake-db.ts); nothing reaches a real service.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')
process.env.STUDENT_AUTH_SECRET = 'test-only-secret-for-role-switch-tests'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54399'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-not-a-key'

type User = { id: string; email: string; email_confirmed_at?: string | null; confirmation_sent_at?: string | null; identities?: { provider: string; identity_data?: { email_verified?: boolean } }[] }
let db: FakeDb
let session: User | null = null
let exchanged: User | null = null // what the Google code is exchanged for, in the callback tests
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => db,
    createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: session } }) } }),
  },
})
mock.module('@supabase/ssr', {
  namedExports: { createServerClient: () => ({ auth: { exchangeCodeForSession: async () => (exchanged ? { data: { user: exchanged }, error: null } : { data: { user: null }, error: { message: 'bad' } }) } }), createBrowserClient: () => ({ auth: {} }) },
})
mock.module('next/headers', { namedExports: { cookies: async () => ({ getAll: () => [], set: () => {} }) } })
mock.module('next/navigation', {
  namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, redirect: (to: string) => { throw new Error(`NEXT_REDIRECT ${to}`) }, useRouter: () => ({ push() {}, replace() {}, refresh() {} }), usePathname: () => '/dashboard', useSearchParams: () => new URLSearchParams() },
})

const lib = await import('@/lib/role-switch.ts')
const viewAs = await import('@/app/api/student/view-as/route.ts')
const callback = await import('@/app/auth/callback/route.ts')
const { verifyStudentToken } = await import('@/lib/student-auth.ts')
const studentPage = (await import('@/app/student/dashboard/page.tsx')).default
const { Header } = await import('@/components/layout/Header.tsx')
const LoginPage = (await import('@/app/(auth)/login/page.tsx')).default
const { NextRequest } = await import('next/server')

const SARAH = '20000000-0000-4000-8000-000000000001' // a tutor, and a student of Diego
const DIEGO = '20000000-0000-4000-8000-000000000002' // another tutor
const PLAIN = '20000000-0000-4000-8000-000000000003' // a tutor who is nobody's student
const NINA = '20000000-0000-4000-8000-000000000004' // only a student (no tutor profile)
const SOLO = '20000000-0000-4000-8000-000000000005' // a tutor whose only student row is themselves
const confirmed = { email_confirmed_at: '2026-01-01T00:00:00Z', confirmation_sent_at: '2026-01-01T00:00:00Z' }
const sarah: User = { id: SARAH, email: 'sarah@example.com', ...confirmed }
const FUTURE = new Date(Date.now() + 3 * 86400_000).toISOString()

beforeEach(() => {
  session = null; exchanged = null
  db = createFakeDb({
    tutors: [
      { id: SARAH, name: 'Sarah Both', email: 'sarah@example.com', slug: 'sarah' },
      { id: DIEGO, name: 'Diego Tutor', email: 'diego@example.com', slug: 'diego' },
      { id: PLAIN, name: 'Plain Tutor', email: 'plain@example.com', slug: 'plain' },
      { id: SOLO, name: 'Solo Tutor', email: 'solo@example.com', slug: 'solo' },
    ],
    students: [
      { id: 's1', tutor_id: DIEGO, name: 'Sarah Both', email: 'Sarah@Example.com', status: 'active', portal_token: 'p1' },
      { id: 's2', tutor_id: DIEGO, name: 'Other One', email: 'other_one@example.com', status: 'active', portal_token: 'p2' },
      { id: 's3', tutor_id: DIEGO, name: 'Zed Two', email: 'otherxone@example.com', status: 'active', portal_token: 'p3' },
      { id: 's4', tutor_id: SOLO, name: 'Solo Tutor', email: 'solo@example.com', status: 'active', portal_token: 'p4' }, // a tutor who added themselves as their own student
      { id: 's5', tutor_id: DIEGO, name: 'Gone Student', email: 'gone@example.com', status: 'inactive', portal_token: 'p5' },
      { id: 's6', tutor_id: DIEGO, name: 'Nina Pupil', email: 'nina@example.com', status: 'active', portal_token: 'p6' },
    ],
    lessons: [
      { id: 'l1', tutor_id: DIEGO, student_id: 's1', starts_at: FUTURE, duration_minutes: 45, status: 'scheduled' },
      { id: 'l2', tutor_id: DIEGO, student_id: 's2', starts_at: FUTURE, duration_minutes: 90, status: 'scheduled' },
      { id: 'l3', tutor_id: DIEGO, student_id: 's3', starts_at: FUTURE, duration_minutes: 60, status: 'scheduled' },
    ],
  })
})

const call = (url = 'https://www.tutafy.test/api/student/view-as') => viewAs.GET(new Request(url))
const where = (res: Response) => res.headers.get('location') ?? ''
const tokenOf = (res: Response) => new URL(where(res)).searchParams.get('token')!
/** The signed link the route hands to this signed-in user. */
async function linkFor(user: User) { session = user; return tokenOf(await call()) }
const renderStudent = async (t: string) => renderToStaticMarkup(await studentPage({ searchParams: Promise.resolve({ token: t }) }))

// ---- who is verified ----------------------------------------------------------------------------

test('verifiedEmail: a Google-verified or a really-confirmed email counts; an unchecked one does not', () => {
  assert.equal(lib.verifiedEmail(sarah), 'sarah@example.com')
  assert.equal(lib.verifiedEmail({ id: 'x', email: 'G@Example.com', email_confirmed_at: 'now', identities: [{ provider: 'google', identity_data: { email_verified: true } }] }), 'g@example.com', 'Google, lower-cased')
  assert.equal(lib.verifiedEmail({ id: 'x', email: 'a@example.com' }), null, 'never confirmed')
  assert.equal(lib.verifiedEmail({ id: 'x', email: 'a@example.com', email_confirmed_at: 'now' }), null, 'confirmed automatically: no confirmation mail was sent, so nobody checked the address')
  assert.equal(lib.verifiedEmail({ id: 'x', email: 'a@example.com', confirmation_sent_at: 'now' }), null, 'mail sent but never confirmed')
  assert.equal(lib.verifiedEmail({ id: 'x', email: 'a@example.com', email_confirmed_at: 'now', identities: [{ provider: 'google', identity_data: { email_verified: false } }] }), null, 'Google said not verified')
  assert.equal(lib.verifiedEmail({ id: 'x', email: '', ...confirmed }), null)
  assert.equal(lib.verifiedEmail(null), null)
})

test('escapeLike: an address with _ or % matches only itself', async () => {
  assert.equal(lib.escapeLike('a_b%c\\d@example.com'), 'a\\_b\\%c\\\\d@example.com')
  assert.equal(await lib.isStudentOfAnotherTutor(db, 'other_one@example.com', SARAH), true)
  // "other_one" must not find "otherxone": a look-alike address is a different person
  const probe = createFakeDb({ students: [{ id: 'z', tutor_id: DIEGO, email: 'otherxone@example.com', status: 'active' }] })
  assert.equal(await lib.isStudentOfAnotherTutor(probe, 'other_one@example.com', SARAH), false)
})

// ---- the button (who sees it) -------------------------------------------------------------------

test('canViewAsStudent: yes for a verified tutor who is a student of ANOTHER tutor (stored address in any letter case)', async () => {
  assert.equal(await lib.canViewAsStudent(db, sarah), true)
})

test('canViewAsStudent: no for a tutor who is nobody’s student, no when the only match is their own student row, no for an inactive enrolment, no without a verified email', async () => {
  assert.equal(await lib.canViewAsStudent(db, { id: PLAIN, email: 'plain@example.com', ...confirmed }), false)
  assert.equal(await lib.canViewAsStudent(db, { id: SOLO, email: 'solo@example.com', ...confirmed }), false)
  assert.equal(await lib.canViewAsStudent(db, { id: 'g', email: 'gone@example.com', ...confirmed }), false)
  assert.equal(await lib.canViewAsStudent(db, { ...sarah, confirmation_sent_at: null }), false)
  assert.equal(await lib.canViewAsStudent(db, null), false)
})

test('canViewAsStudent: a database error means no button, never an exception', async () => {
  const broken = { from: () => { throw new Error('down') } }
  assert.equal(await lib.canViewAsStudent(broken, sarah), false)
})

// ---- the real redirect ---------------------------------------------------------------------------

test('GET /api/student/view-as: not signed in goes to the tutor login, and nothing is made', async () => {
  const res = await call()
  assert.equal(res.status, 307)
  assert.match(where(res), /\/login$/)
})

test('GET /api/student/view-as: a verified tutor who is a student elsewhere gets a link for THEIR OWN email', async () => {
  session = sarah
  const res = await call()
  assert.match(where(res), /\/student\/dashboard\?token=/)
  assert.equal(res.headers.get('cache-control'), 'no-store')
  assert.deepEqual(verifyStudentToken(tokenOf(res)), { email: 'sarah@example.com', valid: true })
})

test('GET /api/student/view-as: nothing in the request chooses the email: a victim’s address, a token or a user id in the query is ignored', async () => {
  session = sarah
  const res = await call('https://www.tutafy.test/api/student/view-as?email=other_one@example.com&userId=' + DIEGO + '&token=abc')
  assert.equal(verifyStudentToken(tokenOf(res)).email, 'sarah@example.com')
})

test('GET /api/student/view-as: no link for a tutor who is nobody’s student, for their own student row, for an inactive enrolment, or for an email nobody checked', async () => {
  const cases: [string, User][] = [
    ['plain', { id: PLAIN, email: 'plain@example.com', ...confirmed }],
    ['own row only', { id: SOLO, email: 'solo@example.com', ...confirmed }],
    ['inactive', { id: 'g', email: 'gone@example.com', ...confirmed }],
    ['auto-confirmed (no confirmation mail)', { id: SARAH, email: 'sarah@example.com', email_confirmed_at: 'now', confirmation_sent_at: null }],
    ['never confirmed', { id: SARAH, email: 'sarah@example.com' }],
  ]
  for (const [name, user] of cases) {
    session = user
    const res = await call()
    assert.doesNotMatch(where(res), /token=/, name)
    assert.match(where(res), /\/student\/login$/, name)
  }
})

test('GET /api/student/view-as: a student who is not a tutor gets only their own link, and nothing is written (no tutor profile appears)', async () => {
  session = { id: NINA, email: 'nina@example.com', ...confirmed }
  const res = await call()
  assert.equal(verifyStudentToken(tokenOf(res)).email, 'nina@example.com')
  assert.equal(db.log.filter(l => l.op !== 'select').length, 0, 'the route writes nothing at all')
  assert.equal((db.tables.tutors ?? []).some(t => t.id === NINA), false)
})

test('GET /api/student/view-as: without a signing key on the server nobody gets a link', async () => {
  session = sarah
  const saved = process.env.STUDENT_AUTH_SECRET
  delete process.env.STUDENT_AUTH_SECRET
  try {
    assert.match(where(await call()), /\/student\/login\?error=unavailable$/)
  } finally {
    process.env.STUDENT_AUTH_SECRET = saved
  }
})

// ---- the student page: what it shows, and "Back to tutor" ----------------------------------------

test('the student page shows "Back to tutor" to the tutor whose own email the link is for, and only that tutor’s lesson', async () => {
  const html = await renderStudent(await linkFor(sarah))
  assert.match(html, /data-testid="back-to-tutor"/)
  assert.match(html, /<a [^>]*href="\/dashboard"[^>]*>Back to tutor<\/a>/)
  assert.match(html, /45 min/, 'her own lesson')
  assert.doesNotMatch(html, /90 min|60 min|Other One|Zed/, 'nobody else’s lesson')
})

test('"Back to tutor" is not shown to a student who only holds the link, to another signed-in account, to an unverified one, or to a non-tutor', async () => {
  const t = await linkFor(sarah)
  session = null
  assert.doesNotMatch(await renderStudent(t), /back-to-tutor/, 'link only')
  session = { id: DIEGO, email: 'diego@example.com', ...confirmed }
  assert.doesNotMatch(await renderStudent(t), /back-to-tutor/, 'someone else signed in on the same browser')
  session = { id: SARAH, email: 'sarah@example.com' }
  assert.doesNotMatch(await renderStudent(t), /back-to-tutor/, 'email never verified')
  const ninaToken = await linkFor({ id: NINA, email: 'nina@example.com', ...confirmed })
  assert.doesNotMatch(await renderStudent(ninaToken), /back-to-tutor/, 'a student with no tutor profile')
})

test('the student page matches the exact email: an address with _ does not pull in a look-alike student’s lessons', async () => {
  // a signed link for other_one@ (as the emailed link or the Google login would make it)
  const { signStudentToken } = await import('@/lib/student-auth.ts')
  const html = await renderStudent(signStudentToken('other_one@example.com'))
  assert.match(html, /90 min/, 'Other One’s own lesson')
  assert.doesNotMatch(html, /60 min/, 'otherxone@ is a different person')
  assert.doesNotMatch(html, /Zed/)
})

// ---- the two screens that carry the new words ----------------------------------------------------

const tutorView = { id: SARAH, email: 'sarah@example.com', name: 'Sarah Both', slug: 'sarah', avatar_url: undefined, languages: [], timezone: 'UTC', stripe_onboarding_complete: false, booking_url_active: true, cancellation_hours: 24, created_at: '', updated_at: '' }

test('the account menu of the tutor header holds "View as student" only when it is told to (T-0826: the menu is drawn when opened, so the source is read)', () => {
  const src = readFileSync(path.join(SRC, 'components/layout/Header.tsx'), 'utf8').replace(/\r\n/g, '\n')
  assert.match(src, /\{canViewAsStudent && \(\s*<DropdownMenuItem onClick=\{\(\) => window\.location\.assign\('\/api\/student\/view-as'\)\}[^>]*data-testid="view-as-student">\s*<Users[^>]*\/>\s*View as student/)
  // closed, the header draws no such words and no link
  assert.doesNotMatch(renderToStaticMarkup(createElement(Header, { tutor: tutorView, canViewAsStudent: true })), /View as student/)
})

test('the tutor login page has the line that points a student to /student/login', () => {
  const html = renderToStaticMarkup(createElement(LoginPage))
  assert.match(html, /Are you a student\?/)
  assert.match(html, /<a [^>]*href="\/student\/login"[^>]*>Log in here<\/a>/)
})

// ---- the rule that a student never becomes a tutor is still there --------------------------------

const login = (query: string) => callback.GET(new NextRequest(`https://www.tutafy.test/auth/callback?code=c${query}`))
const tutorIds = () => (db.tables.tutors ?? []).map(t => t.id)

test('auth callback: a Google student login never creates a tutor profile, with or without the role', async () => {
  exchanged = { id: NINA, email: 'nina@example.com', ...confirmed }
  for (const q of ['&role=student', '']) {
    const res = await login(q)
    assert.match(where(res), /\/student\/dashboard\?token=/, q)
    assert.equal(tutorIds().includes(NINA), false, q)
  }
})

test('auth callback: only an explicit tutor login creates a tutor profile', async () => {
  exchanged = { id: NINA, email: 'nina@example.com', ...confirmed }
  const res = await login('&role=tutor')
  assert.match(where(res), /\/onboarding\?signup=1$/)
  assert.equal(tutorIds().includes(NINA), true)
})

test('auth callback: a tutor who is also a student can pick either side from the two login pages', async () => {
  exchanged = sarah
  assert.match(where(await login('&role=student')), /\/student\/dashboard\?token=/, 'student login page')
  assert.match(where(await login('&role=tutor')), /\/dashboard$/, 'tutor login page')
  assert.equal(tutorIds().filter(id => id === SARAH).length, 1, 'no second profile')
})

// ---- the tutor pages really get the button -------------------------------------------------------

const DashboardLayout = (await import('@/app/(dashboard)/layout.tsx')).default
const renderLayout = async () => renderToStaticMarkup(await DashboardLayout({ children: createElement('p', null, 'page') }))

/** The props the layout hands to the Header (the account menu draws "View as student" from them). */
async function headerProp(): Promise<unknown> {
  const tree = await DashboardLayout({ children: createElement('p', null, 'page') })
  let found: unknown = 'not found'
  const walk = (n: unknown): void => {
    if (!n || typeof n !== 'object') return
    const el = n as { type?: unknown; props?: { canViewAsStudent?: unknown; children?: unknown } }
    if (el.type === Header) found = el.props?.canViewAsStudent
    const kids = el.props?.children
    if (Array.isArray(kids)) kids.forEach(walk); else walk(kids)
  }
  walk(tree)
  return found
}

test('the tutor dashboard layout offers "View as student" to a tutor who is a student elsewhere, and to nobody else', async () => {
  session = sarah
  assert.equal(await headerProp(), true)
  session = { id: PLAIN, email: 'plain@example.com', ...confirmed }
  assert.equal(await headerProp(), false)
  session = { id: SARAH, email: 'sarah@example.com', email_confirmed_at: 'now', confirmation_sent_at: null }
  assert.equal(await headerProp(), false, 'an address nobody checked')
})

test('verifiedEmail: a Google identity without a confirmed email is not enough', () => {
  assert.equal(lib.verifiedEmail({ id: 'x', email: 'a@example.com', identities: [{ provider: 'google', identity_data: { email_verified: true } }] }), null)
})
