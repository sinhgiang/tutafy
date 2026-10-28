// T-0707: the owner's page for ONE tutor (/admin/tutors/[id]): sign-up day, plan, real and self-added students, lessons, what they paid and
// when the plan renews (the same Polar reads as the Buyers page), and the journey (first source, pages, Free sign-up, upgrade).
// The REAL page is rendered over an in-memory database (Supabase and next/navigation are faked) and a PRETEND Polar; every figure is worked
// out by hand in the comments. Nothing is written anywhere.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import { setAdminLang } from './support/admin-lang.ts'
import { at, sub, order, reply, withPolar } from './support/pretend-polar.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(SRC, rel), 'utf8').replace(/\r\n/g, '\n')

let currentUser: { id: string; email: string } | null = null
let db: { from(table: string): unknown } = createFakeDb({})
let adminClients = 0
const redirects: string[] = []

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }),
    createAdminClient: () => { adminClients++; return db },
  },
})
mock.module('next/navigation', {
  exports: {
    redirect: (to: string) => { redirects.push(to); throw new Error(`NEXT_REDIRECT:${to}`) },
    notFound: () => { throw new Error('NEXT_NOT_FOUND') },
    usePathname: () => '/admin/tutors',
  },
})

const { ADMIN_EMAIL } = await import('./support/admin-account.ts')
const detail = await import('@/lib/tutor-detail-data.ts')
const TutorPage = (await import('@/app/(admin)/admin/tutors/[id]/page.tsx')).default as (p: { params: Promise<{ id: string }> }) => Promise<React.ReactElement>

const ADMIN = { id: 'u-0', email: ADMIN_EMAIL }
const TUTOR = { id: 'u-1', email: 'ten@example.com' }
const uid = (n: number) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`
const [ANN, BO, CY, DEE, GHOST] = [uid(1), uid(2), uid(3), uid(4), uid(9)]
const dayText = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

beforeEach(() => {
  currentUser = ADMIN; redirects.length = 0; adminClients = 0; setAdminLang(null)
  process.env.POLAR_ACCESS_TOKEN = 'polar_oat_secret_value_123'
  delete process.env.POLAR_API_BASE
  db = sample()
})

// ---- the people -------------------------------------------------------------------------------------------------------------------
// Ann: Pro (monthly $12), signed up 90 days ago. Four students: two real, one her own address (capitals and spaces: self-added), one with
//   no address (real) -> real 3, self-added 1. Lessons: 2 completed, 2 scheduled, 1 cancelled, 1 no show -> 6. A visitor who came from ChatGPT.
// Bo: Free, 10 days ago, one self-added student, no lessons, no visitor record.
// Cy: Academy cancelled at the end of the period. Dee: another tutor whose students and lessons must never leak into Ann's.
const tutors = [
  { id: ANN, name: 'Ann Pro', email: 'ann@example.com', slug: 'ann-pro', created_at: at(-90), subscription_status: 'pro', polar_subscription_id: 'sub_A' },
  { id: BO, name: 'Bo Free', email: 'bo@example.com', slug: 'bo-free', created_at: at(-10), subscription_status: 'free', polar_subscription_id: null },
  { id: CY, name: 'Cy Cancelled', email: 'cy@example.com', slug: 'cy-c', created_at: at(-60), subscription_status: 'academy', polar_subscription_id: 'sub_C' },
  { id: DEE, name: 'Dee Other', email: 'dee@example.com', slug: 'dee-o', created_at: at(-5), subscription_status: 'free', polar_subscription_id: null },
]
const students = [
  { id: 's1', tutor_id: ANN, email: 'kid1@example.com' }, { id: 's2', tutor_id: ANN, email: 'kid2@example.com' },
  { id: 's3', tutor_id: ANN, email: '  ANN@Example.com ' }, { id: 's4', tutor_id: ANN, email: null },
  { id: 's5', tutor_id: BO, email: 'bo@example.com' },
  { id: 's6', tutor_id: DEE, email: 'dee-kid@example.com' }, { id: 's7', tutor_id: DEE, email: 'dee-kid2@example.com' },
]
const lessons = [
  ...['completed', 'completed', 'scheduled', 'scheduled', 'cancelled', 'no_show'].map((status, i) => ({ id: `la${i}`, tutor_id: ANN, status })),
  ...['completed', 'scheduled', 'scheduled'].map((status, i) => ({ id: `ld${i}`, tutor_id: DEE, status })),
]
const visitors = [{ id: 'v-ann', tutor_id: ANN, first_seen_at: at(-95), country: 'DE', first_source: 'ai_chatgpt', first_path: '/', first_referrer_host: null, utm_source: null, utm_medium: null, utm_campaign: null }]
const events = [
  { id: 'e1', visitor_id: 'v-ann', kind: 'page_view', path: '/', plan: null, created_at: at(-95) },
  { id: 'e2', visitor_id: 'v-ann', kind: 'page_view', path: '/upgrade', plan: null, created_at: at(-94) },
  { id: 'e3', visitor_id: 'v-ann', kind: 'checkout_click', path: null, plan: 'pro', created_at: at(-91) },
  { id: 'e4', visitor_id: 'v-ann', kind: 'order_paid', path: null, plan: 'pro', created_at: at(-80) },
]
const sample = () => createFakeDb({ tutors, students, lessons, visitors, visitor_events: events })

const SUBS = [sub('sub_A', {}), sub('sub_C', { amount: 2900, cancel_at_period_end: true, ends_at: at(10), current_period_end: at(10) })]
const ORDERS = [order('sub_A', 1200), order('sub_A', 1200), order('sub_C', 2900)]

const render = async (id: string) => renderToStaticMarkup(await TutorPage({ params: Promise.resolve({ id }) }))
const val = (html: string, testid: string) => new RegExp(`data-testid="${testid}"[^>]*>(.*?)</dd>`, 's').exec(html)?.[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

// ---- the data -------------------------------------------------------------------------------------------------------------------------

test('loadTutorDetail: real and self-added students and the lessons by state, counted for THIS tutor only', async () => {
  const d = await detail.loadTutorDetail(db as never, ANN)
  assert.deepEqual(d?.students, { real: 3, selfAdded: 1 })
  assert.deepEqual(d?.lessons, { total: 6, completed: 2, scheduled: 2, cancelled: 1 })
  assert.deepEqual(d?.failedTables, [])
  const dee = await detail.loadTutorDetail(db as never, DEE)
  assert.deepEqual([dee?.students, dee?.lessons], [{ real: 2, selfAdded: 0 }, { total: 3, completed: 1, scheduled: 2, cancelled: 0 }])
  const bo = await detail.loadTutorDetail(db as never, BO)
  assert.deepEqual([bo?.students, bo?.lessons?.total], [{ real: 0, selfAdded: 1 }, 0])
})

test('loadTutorDetail: no such tutor is null, and a table that cannot be read is null (a dash on the page), never a zero', async () => {
  assert.equal(await detail.loadTutorDetail(db as never, GHOST), null)
  const broken = (...tables: string[]) => ({
    from: (table: string) => (tables.includes(table)
      ? Object.assign((db as unknown as FakeDb).from(table), { then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: { message: 'relation does not exist' }, count: null }) })
      : (db as unknown as FakeDb).from(table)),
  })
  const noStudents = await detail.loadTutorDetail(broken('students') as never, ANN)
  assert.equal(noStudents?.students, null)
  assert.deepEqual(noStudents?.lessons?.total, 6)
  assert.deepEqual(noStudents?.failedTables, ['students'])
  const noLessons = await detail.loadTutorDetail(broken('lessons') as never, ANN)
  assert.equal(noLessons?.lessons, null)
  assert.deepEqual(noLessons?.students, { real: 3, selfAdded: 1 })
  assert.deepEqual(noLessons?.failedTables, ['lessons'])
})

// ---- the page ---------------------------------------------------------------------------------------------------------------------------

test('page: a Pro tutor shows the account facts, what they paid, the plan and the journey, as worked out by hand', async () => {
  const p = withPolar(SUBS, ORDERS)
  try {
    const html = await render(ANN)
    assert.equal(val(html, 'tutor-signed-up'), dayText(at(-90)))
    assert.equal(val(html, 'tutor-plan'), 'Pro')
    assert.equal(val(html, 'tutor-real-students'), '3')
    assert.equal(val(html, 'tutor-self-students'), '1')
    assert.equal(val(html, 'tutor-lessons'), '6')
    assert.match(html, /2 completed · 2 scheduled · 1 cancelled/)
    // paid: two orders of $12
    assert.equal(val(html, 'tutor-paid'), '$24.00 USD')
    assert.equal(val(html, 'tutor-price'), '$12.00 per month · USD')
    assert.equal(val(html, 'tutor-started'), dayText(at(-80)))
    assert.equal(val(html, 'tutor-date'), dayText(at(5)))
    assert.match(html, /Next charge<\/dt>/)
    assert.equal(val(html, 'tutor-status'), 'Active')
    // the journey: from ChatGPT, in Germany, first saw the home page, signed up on the tutor's day, upgraded 80 days ago
    assert.equal(val(html, 'journey-source'), 'ChatGPT')
    assert.equal(val(html, 'journey-country'), 'Germany (DE)')
    assert.equal(val(html, 'journey-landing'), 'Home page')
    assert.equal(val(html, 'journey-signup'), dayText(at(-90)))
    assert.equal(val(html, 'journey-upgrade'), `${dayText(at(-80))} (Pro)`)
    assert.match(html, /data-testid="tutor-timeline"/)
    assert.match(html, /Pricing and upgrade page/)
    assert.doesNotMatch(html, /tutor-no-journey|tutor-free|tutor-error/)
    assert.match(html, /AI chat apps often send no referrer/)
    // the name of the page is the tutor's, and a link goes to the whole journey
    assert.equal(/data-testid="tutor-name"[^>]*>(.*?)<\/h1>/.exec(html)?.[1], 'Ann Pro')
    assert.match(html, new RegExp(`href="/super-admin/people/${ANN}"`))
    assert.match(html, /href="\/admin\/tutors"/)
  } finally { p.restore() }
})

test('page: a cancelled plan shows the day it ENDS, not a next charge', async () => {
  const p = withPolar(SUBS, ORDERS)
  try {
    const html = await render(CY)
    assert.match(html, /Ends<\/dt>/)
    assert.doesNotMatch(html, /Next charge<\/dt>/)
    assert.equal(val(html, 'tutor-date'), dayText(at(10)))
    assert.equal(val(html, 'tutor-status'), 'Cancelled')
    assert.equal(val(html, 'tutor-paid'), '$29.00 USD')
  } finally { p.restore() }
})

test('page: a Free tutor with no visit on record says so, shows no payment figure and costs Polar no request', async () => {
  const p = withPolar(SUBS, ORDERS)
  try {
    const html = await render(BO)
    assert.equal(p.calls.length, 0)
    assert.match(html, /data-testid="tutor-free"[^>]*>On the Free plan: nothing paid\./)
    assert.equal(val(html, 'tutor-self-students'), '1')
    assert.equal(val(html, 'tutor-real-students'), '0')
    assert.equal(val(html, 'tutor-lessons'), '0')
    assert.match(html, /data-testid="tutor-no-journey"[^>]*>Journey not recorded: this tutor signed up before visits were tracked, or did not accept cookies\./)
    assert.equal(val(html, 'journey-source'), '—')
    assert.equal(val(html, 'journey-country'), '—')
    assert.equal(val(html, 'journey-upgrade'), '—')
    assert.equal(val(html, 'journey-signup'), dayText(at(-10)), 'the Free sign-up day is still known: it is on the tutor row')
    assert.doesNotMatch(html, /tutor-timeline|tutor-paid/)
    assert.match(html, /AI chat apps often send no referrer/, 'the note is there for every tutor')
  } finally { p.restore() }
})

test('page: with no Polar key a paid tutor gets dashes and the reason, and no request is made', async () => {
  delete process.env.POLAR_ACCESS_TOKEN
  const p = withPolar(SUBS, ORDERS)
  try {
    const html = await render(ANN)
    assert.equal(p.calls.length, 0)
    assert.match(html, /data-testid="tutor-polar-unreadable"[^>]*>.*Polar · Prices, dates and statuses:<\/span> Could not be read: the server has no Polar read key/s)
    for (const id of ['tutor-paid', 'tutor-price', 'tutor-started', 'tutor-date', 'tutor-status']) assert.equal(val(html, id), '—', id)
    assert.equal(val(html, 'tutor-real-students'), '3', 'what our own database knows still shows')
  } finally { p.restore() }
})

test('page: when only the orders cannot be read the plan facts stay and the paid figure is a dash', async () => {
  const p = withPolar(SUBS, ORDERS, { ordersReply: () => reply(403) })
  try {
    const html = await render(ANN)
    assert.match(html, /Polar · Amounts paid:<\/span>/)
    assert.equal(val(html, 'tutor-paid'), '—')
    assert.equal(val(html, 'tutor-price'), '$12.00 per month · USD')
  } finally { p.restore() }
})

test('page: a tutor whose subscription id Polar does not know, and one with no id, each get their own reason', async () => {
  const p = withPolar([sub('sub_other', {})], ORDERS)
  try {
    const unknown = await render(ANN)
    assert.match(unknown, /data-testid="tutor-why"[^>]*>Polar has no readable subscription with this id/)
    assert.equal(val(unknown, 'tutor-price'), '—')
    db = createFakeDb({ tutors: [{ ...tutors[0], polar_subscription_id: null }], students: [], lessons: [], visitors: [], visitor_events: [] })
    const none = await render(ANN)
    assert.match(none, /data-testid="tutor-why"[^>]*>No Polar subscription on record for this buyer/)
  } finally { p.restore() }
})

test('page: a table that cannot be read is said out loud, and its figure is a dash, not a zero', async () => {
  const ok = db as unknown as FakeDb
  db = { from: (table: string) => (table === 'students' ? Object.assign(ok.from(table), { then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: { message: 'relation does not exist' }, count: null }) }) : ok.from(table)) }
  const p = withPolar(SUBS, ORDERS)
  try {
    const html = await render(ANN)
    assert.match(html, /data-testid="tutor-error"/)
    assert.equal(val(html, 'tutor-real-students'), '—')
    assert.equal(val(html, 'tutor-self-students'), '—')
    assert.equal(val(html, 'tutor-lessons'), '6')
  } finally { p.restore() }
})

test('page: in Vietnamese the same figures with the words from the table, and in English there is no Vietnamese', async () => {
  const p = withPolar(SUBS, ORDERS)
  try {
    const en = await render(ANN)
    assert.doesNotMatch(en, /[ăâđêôơưĂÂĐÊÔƠƯạảãấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/)
    setAdminLang('vi')
    const vi = await render(ANN)
    assert.match(vi, /Học sinh thật/)
    assert.match(vi, /2 đã dạy · 2 đã đặt · 1 đã huỷ/)
    assert.match(vi, /Đang hoạt động/)
    assert.match(vi, /Các ứng dụng chat AI thường không gửi nguồn giới thiệu/)
    assert.equal(val(vi, 'tutor-paid'), '$24.00 USD', 'the money is the same in both languages')
    assert.equal(val(vi, 'tutor-real-students'), '3')
    for (const phrase of ['Real students', 'Self-added', 'Journey', 'Next charge']) assert.ok(!vi.includes(phrase), phrase)
  } finally { p.restore() }
})

test('page: nothing Polar said about a customer, no key and no subscription id is shown', async () => {
  const p = withPolar(SUBS, ORDERS)
  try {
    const html = await render(ANN)
    assert.doesNotMatch(html, /polar_oat_secret_value_123|private-customer@example\.com|sub_A|api\.polar\.sh/)
  } finally { p.restore() }
})

test('page: an id that is not a tutor id, or a tutor that does not exist, is "not found"', async () => {
  await assert.rejects(render('not-an-id'), /NEXT_NOT_FOUND/)
  await assert.rejects(render('../../etc'), /NEXT_NOT_FOUND/)
  assert.equal(adminClients, 0, 'a malformed id never reaches the database')
  await assert.rejects(render(GHOST), /NEXT_NOT_FOUND/)
})

test('page: only the admin gets in, and for anyone else nothing is read from the database or from Polar', async () => {
  const p = withPolar(SUBS, ORDERS)
  try {
    currentUser = TUTOR
    await assert.rejects(render(ANN), /NEXT_REDIRECT:\/dashboard/)
    currentUser = null
    await assert.rejects(render(ANN), /NEXT_REDIRECT:\/login/)
    assert.equal(adminClients, 0)
    assert.equal(p.calls.length, 0)
  } finally { p.restore() }
})

test('page: it asks Polar for nothing but reads (two GET lists)', async () => {
  const p = withPolar(SUBS, ORDERS)
  try {
    await render(ANN)
    assert.deepEqual(p.calls.map(c => c.method), ['GET', 'GET'])
  } finally { p.restore() }
})

test('the page and its readers write nothing, and the page checks the admin before it creates the database client or asks Polar', () => {
  for (const f of ['app/(admin)/admin/tutors/[id]/page.tsx', 'lib/tutor-detail-data.ts', 'components/admin/JourneyStep.tsx']) {
    const src = read(f)
    assert.doesNotMatch(src, /\.(insert|update|delete|upsert|rpc)\(/, f)
    assert.doesNotMatch(src, /method: '(POST|PUT|PATCH|DELETE)'/, f)
  }
  const page = read('app/(admin)/admin/tutors/[id]/page.tsx')
  const gate = page.indexOf('await requireAdminPage()')
  assert.ok(gate > 0 && gate < page.indexOf('createAdminClient()') && gate < page.indexOf('readPolarBilling('))
})

test('a tutor\'s name links to their page from the All Tutors list and from the Buyers list', () => {
  assert.match(read('app/(admin)/admin/tutors/page.tsx'), /href=\{`\/admin\/tutors\/\$\{tu\.id\}`\}/)
  assert.match(read('app/(admin)/admin/buyers/page.tsx'), /href=\{`\/admin\/tutors\/\$\{b\.id\}`\}/)
})

test('the journey page draws its lines with the same component as this page (one place for the words of a step)', () => {
  assert.match(read('app/(admin)/super-admin/people/[id]/page.tsx'), /import \{ JourneyStep \} from '@\/components\/admin\/JourneyStep'/)
  assert.match(read('app/(admin)/admin/tutors/[id]/page.tsx'), /import \{ JourneyStep \} from '@\/components\/admin\/JourneyStep'/)
  assert.doesNotMatch(read('app/(admin)/super-admin/people/[id]/page.tsx'), /function stepTitle/)
})

// ---- "View as this tutor" (T-0708) ----------------------------------------------------------------------------------------------------

test('the tutor page has a View as this tutor button that is a form POST to the start route (opening a view writes a log line, so it is never a link)', async () => {
  const p = withPolar(SUBS, ORDERS)
  try {
    const html = await render(ANN)
    assert.match(html, /<form [^>]*action="\/api\/admin\/view"[^>]*>/)
    assert.match(html, /<form [^>]*method="POST"/)
    assert.match(html, new RegExp(`<input type="hidden" name="tutor_id" value="${ANN}"`))
    assert.match(html, /data-testid="view-as-start"[^>]*>.*View as this tutor/s)
    assert.match(html, /Opens their dashboard read-only for 30 minutes\. Nothing can be changed, and the visit is written to a log\./)
    assert.doesNotMatch(html, /data-testid="view-as-error"/)
    setAdminLang('vi')
    assert.match(await render(ANN), /Xem như gia sư này/)
  } finally { p.restore() }
})

test('the tutor page says why a view could not be opened, in words, for each reason the start route can give, and ignores any other value', async () => {
  const p = withPolar(SUBS, ORDERS)
  const renderWith = async (view: string | string[] | undefined) => renderToStaticMarkup(await TutorPage({ params: Promise.resolve({ id: ANN }), searchParams: Promise.resolve({ view }) }))
  try {
    assert.match(await renderWith('unavailable'), /data-testid="view-as-error"[^>]*>The view could not be opened: the log table does not exist yet, so no view is opened without a log line\. Run migration 022 first\./)
    assert.match(await renderWith('no_such_tutor'), /this tutor does not exist/)
    assert.match(await renderWith('bad_id'), /not a tutor id/)
    for (const odd of ['<script>', 'constructor', '__proto__', 'toString', ['unavailable'], undefined]) assert.doesNotMatch(await renderWith(odd as never), /data-testid="view-as-error"/, String(odd))
  } finally { p.restore() }
})

// ---- the way in from /super-admin (T-1030) ---------------------------------------------------------------------------------------------

test('on /super-admin a tutor\'s name opens the tutor page (account, payment, journey, View as this tutor); the journey stays one click away', async () => {
  const SuperAdmin = (await import('@/app/(admin)/super-admin/page.tsx')).default as (p: { searchParams: Promise<Record<string, string>> }) => Promise<React.ReactElement>
  const html = renderToStaticMarkup(await SuperAdmin({ searchParams: Promise.resolve({}) }))
  const row = (id: string) => new RegExp(`data-person="${id}"[\\s\\S]*?</tr>`).exec(html)?.[0] ?? ''
  const ann = row(ANN)
  assert.ok(ann.includes(`href="/admin/tutors/${ANN}"`), 'the name goes to the tutor page')
  assert.match(ann, /data-testid="person-link"/)
  assert.ok(ann.includes(`href="/super-admin/people/${ANN}"`), 'the journey is still one click away')
  assert.ok(!ann.includes(DEE), 'no other tutor is in her row')
  for (const id of [BO, CY, DEE]) assert.ok(row(id).includes(`href="/admin/tutors/${id}"`), id)
})

test('the journey page links to the tutor page, so the paying list of /admin reaches View as this tutor too', async () => {
  const Journey = (await import('@/app/(admin)/super-admin/people/[id]/page.tsx')).default as (p: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) => Promise<React.ReactElement>
  const html = renderToStaticMarkup(await Journey({ params: Promise.resolve({ id: ANN }), searchParams: Promise.resolve({}) }))
  assert.match(html, /data-testid="person-tutor-page"[^>]*>Tutor page and View as this tutor</)
  assert.ok(html.includes(`href="/admin/tutors/${ANN}"`))
})
