// T-0723: the in-app Feedback box. The REAL code runs here, over an in-memory database (tests/support/fake-db.ts); nothing reaches a service:
//   - src/lib/feedback.ts: what a message may look like,
//   - the REAL POST /api/feedback: who is writing comes from the session or a valid student link (never from the body), only the kind and
//     the text are read, the sender's browser, address and page are not kept, the limits answer 429, a missing table answers 503,
//   - the REAL admin page /admin/feedback (both languages, the gate, the text shown as text, a failed read said out loud),
//   - the REAL tutor Header and student page, which carry the Feedback button.
// The limit numbers are proven by tests/rate-limits.test.ts (the shared check), the table by tests/feedback-migration.test.ts (PGlite).
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import { setAdminLang } from './support/admin-lang.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
process.env.STUDENT_AUTH_SECRET = 'test-only-secret-for-feedback-tests'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54399'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-not-a-key'

type User = { id: string; email: string }
let db: FakeDb
let session: User | null = null
/** What the feedback table answers to an insert when a test wants it to fail (the real answers of Postgres). */
let insertError: { code?: string; message: string } | null = null
/** What the feedback table answers to a read when a test wants it to fail. */
let readFails = false
const redirects: string[] = []

const adminClient = () => ({
  from: (t: string) => {
    if (t === 'feedback' && insertError) {
      const real = db.from(t) as Record<string, unknown>
      return { ...real, insert: async () => ({ error: insertError }) }
    }
    if (t === 'feedback' && readFails) {
      const failing: Record<string, unknown> = {}
      const chain = new Proxy(failing, { get: (_t, p) => (p === 'then' ? (res: (v: unknown) => void) => res({ data: null, count: null, error: { message: 'relation "feedback" does not exist' } }) : () => chain) })
      return chain
    }
    return db.from(t)
  },
})
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: adminClient,
    createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: session } }) } }),
  },
})
mock.module('@supabase/ssr', { namedExports: { createServerClient: () => ({ auth: {} }), createBrowserClient: () => ({ auth: {} }) } })
mock.module('next/navigation', {
  namedExports: {
    notFound: () => { throw new Error('NEXT_NOT_FOUND') },
    redirect: (to: string) => { redirects.push(to); throw new Error(`NEXT_REDIRECT ${to}`) },
    useRouter: () => ({ push() {}, replace() {}, refresh() {} }), usePathname: () => '/dashboard', useSearchParams: () => new URLSearchParams(),
  },
})

const lib = await import('@/lib/feedback.ts')
const route = await import('@/app/api/feedback/route.ts')
const { signStudentToken } = await import('@/lib/student-auth.ts')
const { ADMIN_EMAIL } = await import('@/lib/admin.ts')
const AdminFeedbackPage = (await import('@/app/(admin)/admin/feedback/page.tsx')).default as () => Promise<React.ReactElement>
const studentPage = (await import('@/app/student/dashboard/page.tsx')).default
const { Header } = await import('@/components/layout/Header.tsx')
const { feedbackErrorText } = await import('@/components/FeedbackButton.tsx')
const { ADMIN_NAV } = await import('@/components/admin/admin-nav.ts')
const { ADMIN_DICTIONARIES } = await import('@/lib/admin-i18n.ts')
const { NextRequest } = await import('next/server')

const ORIGIN = 'https://www.tutafy.test'
const TUTOR_ID = '30000000-0000-4000-8000-000000000001'
const OTHER_TUTOR_ID = '30000000-0000-4000-8000-000000000002'
const NOBODY_ID = '30000000-0000-4000-8000-000000000009'

// Each test that sends feedback uses its own account, so the in-memory limit of one test cannot touch another's
let n = 0
const account = () => { n++; return { id: `31000000-0000-4000-8000-${String(n).padStart(12, '0')}`, email: `Sender${n}@Example.com` } }

beforeEach(() => {
  session = null; insertError = null; readFails = false; redirects.length = 0
  setAdminLang(null)
  db = createFakeDb({
    tutors: [
      { id: TUTOR_ID, name: 'Tutor Tina', email: 'tina@example.com', slug: 'tina' },
      { id: OTHER_TUTOR_ID, name: 'Tutor Tom', email: 'tom@example.com', slug: 'tom' },
    ],
    students: [{ id: 's1', tutor_id: TUTOR_ID, name: 'Sam Student', email: 'sam@example.com', status: 'active', portal_token: 'p1' }],
    lessons: [],
    feedback: [],
  })
})

const post = (body: unknown, opts: { origin?: string | null; raw?: string } = {}) => {
  const headers: Record<string, string> = { host: 'www.tutafy.test', 'content-type': 'application/json' }
  if (opts.origin !== null) headers.origin = opts.origin ?? ORIGIN
  return route.POST(new NextRequest(`${ORIGIN}/api/feedback`, { method: 'POST', headers, body: opts.raw ?? JSON.stringify(body) }))
}
// the fake database numbers a row on insert, as the real one does (id); the test looks at what the route wrote, so the number is left out
const feedbackRows = async () => ((await (db.from('feedback') as unknown as { select(): PromiseLike<{ data: Record<string, unknown>[] }> }).select()).data)
  .map(r => Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'id')))

// ---- what a message may look like -------------------------------------------------------------------------------------------------

test('parseFeedbackBody: the three kinds, a text of 1 to 2000 characters, control characters taken out, line breaks kept', () => {
  const ok = (v: unknown) => lib.parseFeedbackBody(v)
  assert.deepEqual(ok({ kind: 'bug', message: '  It crashed  ' }), { ok: true, data: { kind: 'bug', message: 'It crashed', token: null } })
  for (const kind of ['bug', 'idea', 'question']) assert.equal(ok({ kind, message: 'x' }).ok, true, kind)
  assert.equal(ok({ kind: 'idea', message: 'x'.repeat(2000) }).ok, true, 'exactly 2000 is allowed')
  assert.equal(ok({ kind: 'idea', message: 'a\r\nb\u0000c\u0007d\te' }).ok && (ok({ kind: 'idea', message: 'a\r\nb\u0000c\u0007d\te' }) as { data: { message: string } }).data.message, 'a\nbcd\te')
  assert.deepEqual(ok({ kind: 'question', message: 'x', token: 'abc' }), { ok: true, data: { kind: 'question', message: 'x', token: 'abc' } })
  assert.equal((ok({ kind: 'question', message: 'x', token: '' }) as { data: { token: unknown } }).data.token, null, 'an empty token means no token')
})

test('parseFeedbackBody refuses what the box refuses: another kind, no text, a text of spaces, a text over 2000 characters, a body that is not an object', () => {
  const bad = (v: unknown) => lib.parseFeedbackBody(v).ok
  assert.equal(bad({ kind: 'complaint', message: 'x' }), false)
  assert.equal(bad({ message: 'x' }), false)
  assert.equal(bad({ kind: 'bug' }), false)
  assert.equal(bad({ kind: 'bug', message: '' }), false)
  assert.equal(bad({ kind: 'bug', message: ' \n\t ' }), false)
  assert.equal(bad({ kind: 'bug', message: 'x'.repeat(2001) }), false)
  assert.equal(bad({ kind: 'bug', message: 'x'.repeat(10_001) }), false)
  assert.equal(bad({ kind: 'bug', message: 42 }), false)
  assert.equal(bad({ kind: ['bug'], message: 'x' }), false)
  assert.equal(bad({ kind: 'bug', message: 'x', token: 5 }), false)
  assert.equal(bad({ kind: 'bug', message: 'x', token: 't'.repeat(2001) }), false)
  for (const body of [null, 'text', 7, [], [{ kind: 'bug', message: 'x' }]]) assert.equal(bad(body), false, JSON.stringify(body))
})

// ---- the route: who is writing -----------------------------------------------------------------------------------------------------

test('a signed-in tutor: the message is kept with THEIR account and the email the database has for them, whatever the body claims', async () => {
  session = { id: TUTOR_ID, email: 'someone-else@example.com' }
  const res = await post({ kind: 'bug', message: 'The calendar will not load', token: '', author_email: 'boss@example.com', author_role: 'admin', tutor_id: OTHER_TUTOR_ID, id: 'x', created_at: '2020-01-01', ip: '203.0.113.9', userAgent: 'Mozilla', page: '/dashboard' })
  assert.equal(res.status, 201)
  assert.deepEqual(await res.json(), { ok: true })
  const rows = await feedbackRows()
  assert.equal(rows.length, 1)
  assert.deepEqual(Object.keys(rows[0]).sort(), ['author_email', 'author_role', 'kind', 'message', 'tutor_id'], 'only these five fields are written; the rest is the database\'s (id, time)')
  assert.deepEqual({ ...rows[0] }, { author_role: 'tutor', tutor_id: TUTOR_ID, author_email: 'tina@example.com', kind: 'bug', message: 'The calendar will not load' })
})

test('a student with a valid link: the message is kept as a student, with the email of the LINK in lower case and no account id', async () => {
  const token = signStudentToken('Sam@Example.com')
  const res = await post({ kind: 'question', message: 'Where do I find my homework?', token, author_email: 'boss@example.com', tutor_id: TUTOR_ID })
  assert.equal(res.status, 201)
  assert.deepEqual({ ...(await feedbackRows())[0] }, { author_role: 'student', tutor_id: null, author_email: 'sam@example.com', kind: 'question', message: 'Where do I find my homework?' })
})

test('a valid student link wins over a signed-in session: the message is the student\'s, never the tutor\'s', async () => {
  session = { id: TUTOR_ID, email: 'tina@example.com' }
  const res = await post({ kind: 'idea', message: 'Dark mode please', token: signStudentToken('sam@example.com') })
  assert.equal(res.status, 201)
  assert.equal((await feedbackRows())[0].author_role, 'student')
  assert.equal((await feedbackRows())[0].tutor_id, null)
})

test('the second-person test: nobody is let in on someone else\'s name: no session and no link, a forged, altered or expired link, a signed-in account that is not a tutor', async () => {
  // not signed in, no link
  let res = await post({ kind: 'bug', message: 'hello' })
  assert.equal(res.status, 401)
  // a link nobody signed
  res = await post({ kind: 'bug', message: 'hello', token: Buffer.from('sam@example.com:1:deadbeef').toString('base64url') })
  assert.equal(res.status, 401)
  // a real link with its address changed
  const real = Buffer.from(signStudentToken('sam@example.com'), 'base64url').toString()
  res = await post({ kind: 'bug', message: 'hello', token: Buffer.from(real.replace('sam@', 'pat@')).toString('base64url') })
  assert.equal(res.status, 401)
  // a link past its seven days
  const realNow = Date.now()
  const m = mock.method(Date, 'now', () => realNow - 8 * 86_400_000)
  const old = signStudentToken('sam@example.com')
  m.mock.restore()
  res = await post({ kind: 'bug', message: 'hello', token: old })
  assert.equal(res.status, 401)
  // a bad link is not rescued by a good session
  session = { id: TUTOR_ID, email: 'tina@example.com' }
  res = await post({ kind: 'bug', message: 'hello', token: 'garbage' })
  assert.equal(res.status, 401)
  // signed in, but with no tutor profile (the table answers nothing for this account)
  session = { id: NOBODY_ID, email: 'nobody@example.com' }
  res = await post({ kind: 'bug', message: 'hello' })
  assert.equal(res.status, 403)
  assert.equal((await feedbackRows()).length, 0, 'none of those left a row')
})

test('only calls from our own pages: no Origin, or an Origin of another site, is refused before anything is read', async () => {
  session = { id: TUTOR_ID, email: 'tina@example.com' }
  assert.equal((await post({ kind: 'bug', message: 'hi' }, { origin: null })).status, 403)
  assert.equal((await post({ kind: 'bug', message: 'hi' }, { origin: 'https://evil.example.org' })).status, 403)
  assert.equal((await post({ kind: 'bug', message: 'hi' }, { origin: 'not a url' })).status, 403)
  assert.equal((await feedbackRows()).length, 0)
})

test('a body that is not JSON, or not a message, is a 400 and keeps nothing', async () => {
  session = { id: TUTOR_ID, email: 'tina@example.com' }
  assert.equal((await post(null, { raw: 'not json' })).status, 400)
  const wrong = await post({ kind: 'complaint', message: 'hi' })
  assert.equal(wrong.status, 400)
  assert.match(((await wrong.json()) as { error: string }).error, /bug, idea or question/)
  assert.equal((await post({ kind: 'bug', message: '   ' })).status, 400)
  assert.equal((await post({ kind: 'bug', message: 'x'.repeat(2001) })).status, 400)
  assert.equal((await feedbackRows()).length, 0)
})

// ---- the limits ---------------------------------------------------------------------------------------------------------------------

test('one account may send 5 messages in 10 minutes; the 6th is a 429 and is not kept; another account is not slowed', async () => {
  const a = account(); const b = account()
  db = createFakeDb({ tutors: [{ id: a.id, name: 'A', email: a.email, slug: 'a' }, { id: b.id, name: 'B', email: b.email, slug: 'b' }], feedback: [] })
  session = a
  for (let i = 0; i < 5; i++) assert.equal((await post({ kind: 'idea', message: `idea ${i}` })).status, 201, `message ${i + 1}`)
  assert.equal((await post({ kind: 'idea', message: 'the sixth' })).status, 429)
  assert.equal((await feedbackRows()).length, 5)
  session = b
  assert.equal((await post({ kind: 'idea', message: 'someone else' })).status, 201)
})

test('the table\'s own limit (10 an hour, TF429) is an answer of 429 too; a missing table is a 503 that shows no database text', async () => {
  const a = account()
  db = createFakeDb({ tutors: [{ id: a.id, name: 'A', email: a.email, slug: 'a' }], feedback: [] })
  session = a
  insertError = { code: 'TF429', message: 'feedback_rate_limited' }
  assert.equal((await post({ kind: 'bug', message: 'again' })).status, 429)
  insertError = { code: '42P01', message: 'relation "public.feedback" does not exist' }
  const quiet = mock.method(console, 'error', () => {})
  const res = await post({ kind: 'bug', message: 'hello' })
  quiet.mock.restore()
  assert.equal(res.status, 503)
  const text = JSON.stringify(await res.json())
  assert.doesNotMatch(text, /relation|public\.feedback|42P01/)
  assert.match(text, /not available right now/)
})

// ---- the admin page --------------------------------------------------------------------------------------------------------------

const feedbackFixture = [
  { id: 'f1', created_at: '2026-10-21T10:00:00Z', author_role: 'tutor', tutor_id: TUTOR_ID, author_email: 'tina@example.com', kind: 'bug', message: 'The calendar will not load\nsecond line <script>alert(1)</script>' },
  { id: 'f2', created_at: '2026-10-20T09:00:00Z', author_role: 'student', tutor_id: null, author_email: 'sam@example.com', kind: 'question', message: 'Where is my homework?' },
  { id: 'f3', created_at: '2026-10-19T09:00:00Z', author_role: 'tutor', tutor_id: OTHER_TUTOR_ID, author_email: 'tom@example.com', kind: 'idea', message: 'Please add dark mode' },
]
const renderAdmin = async () => renderToStaticMarkup(await AdminFeedbackPage())

test('the admin sees every message, newest first, with the counts, who wrote it, and a mailto link to answer; the text is shown as text', async () => {
  session = { id: 'admin-id', email: ADMIN_EMAIL }
  db = createFakeDb({ feedback: feedbackFixture })
  const html = await renderAdmin()
  assert.match(html, /<h1[^>]*>Feedback<\/h1>/)
  assert.equal((html.match(/data-testid="feedback-row"/g) ?? []).length, 3)
  assert.equal((html.match(/data-testid="feedback-card"/g) ?? []).length, 3, 'a phone gets one card per message (no sideways scroll to read the text)')
  assert.match(html, /<ul class="md:hidden/)
  assert.match(html, /<div class="hidden md:block overflow-x-auto"/)
  assert.ok(html.indexOf('The calendar will not load') < html.indexOf('Where is my homework?') && html.indexOf('Where is my homework?') < html.indexOf('Please add dark mode'), 'newest first')
  assert.match(html, /data-testid="feedback-total"[^>]*>3</)
  for (const [kind, count] of [['bug', 1], ['idea', 1], ['question', 1]] as const) assert.match(html, new RegExp(`data-testid="feedback-count-${kind}"[^>]*>${count}<`))
  assert.match(html, /href="mailto:sam@example\.com"/)
  assert.ok(html.includes('Student') && html.includes('Tutor'))
  assert.ok(!html.includes('<script>alert(1)</script>') && html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'a stranger\'s text is escaped')
  assert.match(html, /whitespace-pre-wrap/, 'line breaks are kept')
  assert.doesNotMatch(html, /data-testid="feedback-error"/)
})

test('the admin page speaks English by default and Vietnamese with the switch; the table headings come from the translation table', async () => {
  session = { id: 'admin-id', email: ADMIN_EMAIL }
  db = createFakeDb({ feedback: feedbackFixture })
  const en = await renderAdmin()
  for (const w of ['Feedback', 'When', 'From', 'Type', 'Message', 'Bug', 'Idea', 'Question']) assert.ok(en.includes(`>${w}<`), `EN ${w}`)
  setAdminLang('vi')
  const vi = await renderAdmin()
  for (const w of ['Góp ý', 'Lúc', 'Từ', 'Loại', 'Nội dung', 'Lỗi', 'Ý tưởng', 'Câu hỏi', 'Gia sư', 'Học sinh']) assert.ok(vi.includes(w), `VI ${w}`)
  assert.ok(!vi.includes('>When<') && !vi.includes('>Message<'), 'no English heading is left over')
  const keys = Object.keys(ADMIN_DICTIONARIES.en).filter(k => k.startsWith('feedback.') || k === 'nav.feedback')
  assert.ok(keys.length >= 17, `the page has its keys (${keys.length})`)
  for (const k of keys) assert.ok(ADMIN_DICTIONARIES.vi[k as keyof typeof ADMIN_DICTIONARIES.vi], `VI has ${k}`)
})

test('an empty list says so; a failed read says so instead of showing zeros; the list is capped and says it', async () => {
  session = { id: 'admin-id', email: ADMIN_EMAIL }
  db = createFakeDb({ feedback: [] })
  const empty = await renderAdmin()
  assert.match(empty, /No feedback yet/)
  readFails = true
  const failed = await renderAdmin()
  assert.match(failed, /data-testid="feedback-error"/)
  assert.match(failed, /migration 020/)
  assert.doesNotMatch(failed, /No feedback yet/, 'a failed read is not "nobody wrote"')
  assert.match(failed, /data-testid="feedback-total"[^>]*>—</)
  readFails = false
  db = createFakeDb({ feedback: Array.from({ length: 230 }, (_, i) => ({ id: `r${i}`, created_at: new Date(Date.UTC(2026, 9, 1) + i * 60_000).toISOString(), author_role: 'student', tutor_id: null, author_email: 's@example.com', kind: 'idea', message: `m${i}` })) })
  const long = await renderAdmin()
  assert.equal((long.match(/data-testid="feedback-row"/g) ?? []).length, 200)
  assert.match(long, /Showing the newest 200 of 230 messages\./)
})

test('the second-person test for the page: signed out goes to /login, a tutor (or anyone but the admin) goes to /dashboard, and no row is read', async () => {
  db = createFakeDb({ feedback: feedbackFixture })
  session = null
  await assert.rejects(renderAdmin(), /NEXT_REDIRECT \/login/)
  session = { id: TUTOR_ID, email: 'tina@example.com' }
  await assert.rejects(renderAdmin(), /NEXT_REDIRECT \/dashboard/)
  assert.deepEqual(redirects, ['/login', '/dashboard'])
})

test('the admin menu has Feedback, and Sign out is still in the sidebar and in the phone bar', () => {
  assert.ok(ADMIN_NAV.some(i => i.href === '/admin/feedback' && i.labelKey === 'nav.feedback'))
  const files = ['src/components/admin/AdminSidebar.tsx', 'src/components/admin/AdminMobileNav.tsx']
  for (const f of files) assert.match(read(f), /SignOutButton/, `${f} keeps Sign out`)
})

// ---- the button ---------------------------------------------------------------------------------------------------------------------

test('the tutor header carries a small Feedback button (icon only on a phone), and the student page carries it with the student link', async () => {
  const tutor = { id: TUTOR_ID, name: 'Tutor Tina', email: 'tina@example.com', avatar_url: null } as never
  const header = renderToStaticMarkup(createElement(Header, { tutor }))
  assert.match(header, /data-testid="feedback-button"/)
  assert.match(header, /aria-label="Send feedback"/)
  assert.match(header, /<span class="hidden sm:inline">Feedback<\/span>/, 'the word shows from tablet width up; a phone shows the icon')
  const page = renderToStaticMarkup(await studentPage({ searchParams: Promise.resolve({ token: signStudentToken('sam@example.com') }) }))
  assert.match(page, /data-testid="feedback-button"/)
  const gone = renderToStaticMarkup(await studentPage({ searchParams: Promise.resolve({ token: 'garbage' }) }))
  assert.doesNotMatch(gone, /data-testid="feedback-button"/, 'a visitor with an expired link cannot write: no button')
})

test('what the person is told for each answer of the server', () => {
  assert.match(feedbackErrorText(429), /a lot of feedback/)
  assert.match(feedbackErrorText(401), /sign in again/)
  assert.match(feedbackErrorText(403), /sign in again/)
  assert.equal(feedbackErrorText(400, 'Pick bug, idea or question.'), 'Pick bug, idea or question.')
  assert.match(feedbackErrorText(503), /not available right now/)
  assert.match(feedbackErrorText(null), /connection/)
  assert.match(feedbackErrorText(500), /connection/)
})

test('the box collects nothing but the kind, the text and (students) the link: its source sends exactly those and never reads the browser or the page', () => {
  const src = read('src/components/FeedbackButton.tsx')
  assert.match(src, /JSON\.stringify\(\{ kind, message, \.\.\.\(token \? \{ token \} : \{\}\) \}\)/)
  for (const word of ['navigator', 'userAgent', 'location', 'document.', 'window.', 'screen.', 'localStorage', 'sessionStorage', 'document.cookie', 'referrer']) {
    assert.ok(!src.includes(word), `the box does not read ${word}`)
  }
  assert.equal((src.match(/fetch\(/g) ?? []).length, 1)
  assert.match(src, /\/api\/feedback/)
  assert.match(src, /maxLength=\{FEEDBACK_MAX_LENGTH\}/)
})

test('the route reads only what the box sends, and the table gets only five fields', () => {
  const src = read('src/app/api/feedback/route.ts')
  assert.match(src, /insert\(\{ author_role: role, tutor_id: tutorId, author_email: email, kind, message \}\)/)
  for (const word of ['x-forwarded-for', 'user-agent', 'referer', 'x-real-ip', 'x-vercel-ip', 'headers.get(\'cookie\')']) assert.ok(!src.includes(word), `the route does not read ${word}`)
  assert.equal((src.match(/headers\.get\(/g) ?? []).length, 3, 'origin, x-forwarded-host and host only')
})

test('every page of the product that shows the box is English only: no Vietnamese in the new files', () => {
  const files = ['src/components/FeedbackButton.tsx', 'src/lib/feedback.ts', 'src/app/api/feedback/route.ts', 'src/lib/feedback-data.ts']
  for (const f of files) assert.doesNotMatch(read(f), /[ạảãàáâậầấẩẫăắằặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i, f)
})

// a file list sanity check so the scan above does not go stale
test('the new files are where the test looks for them', () => {
  for (const f of ['src/components/FeedbackButton.tsx', 'src/lib/feedback.ts', 'src/app/api/feedback/route.ts', 'src/lib/feedback-data.ts', 'src/app/(admin)/admin/feedback/page.tsx', 'supabase/migrations/020_feedback.sql']) {
    assert.ok(statSync(path.join(ROOT, f)).isFile(), f)
  }
  assert.ok(readdirSync(path.join(ROOT, 'supabase/migrations')).includes('020_feedback.sql'))
})
