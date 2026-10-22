// T-0741: the owner's page about lesson payments counts only what is real enough to count, and says what it left out.
// The report that asked for it (the real database, 22 Oct 2026): the page showed 1,020 USD, but 4 cancelled lessons marked paid (120),
// one lesson past its day and never completed (300), and only 600 from two completed lessons of one tutor. Every "paid" was typed by a
// tutor, and the card payments table (migration 017) is not on the real database.
// These tests run the REAL loader and the REAL page over an in-memory database holding exactly those seven lessons (made-up names, made-up
// amounts: no real tutor, student or address), in English and in Vietnamese. Nothing is written anywhere.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import { setAdminLang } from './support/admin-lang.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

let currentUser: { id: string; email: string } | null = null
let db: { from(table: string): unknown } = createFakeDb({})
const redirects: string[] = []

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  exports: {
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }),
    createAdminClient: () => db,
  },
})
mock.module('next/navigation', {
  exports: { redirect: (to: string) => { redirects.push(to); throw new Error(`NEXT_REDIRECT:${to}`) }, usePathname: () => '/admin' },
})

const { ADMIN_EMAIL } = await import('@/lib/admin.ts')
const { loadAdminRevenue } = await import('@/lib/admin-revenue.ts')
const RevenuePage = (await import('@/app/(admin)/admin/revenue/page.tsx')).default as () => Promise<React.ReactElement>

const ADMIN = { id: 'u-0', email: ADMIN_EMAIL }
const DAY = 86_400_000
const NOW = new Date('2026-10-22T12:00:00Z')
const days = (n: number, from: Date = NOW) => new Date(from.getTime() + n * DAY).toISOString()
const T_PAID = 'tutor-alpha'
const T_OTHER = 'tutor-beta'

// The seven lessons, placed relative to `from` so the page (which reads the real clock) and the loader (given NOW) see the same thing.
function lessons(from: Date) {
  const base = { payment_status: 'paid', tutor_id: T_OTHER, student_id: 'st-beta' }
  return [
    { ...base, id: 'c1', price: 30, status: 'cancelled', starts_at: days(6, from), ends_at: days(6.04, from) }, // cancelled, not yet due
    { ...base, id: 'c2', price: 30, status: 'cancelled', starts_at: days(6.1, from), ends_at: days(6.14, from) },
    { ...base, id: 'c3', price: 30, status: 'cancelled', starts_at: days(-1, from), ends_at: days(-0.96, from) }, // cancelled, already past
    { ...base, id: 'c4', price: 30, status: 'cancelled', starts_at: days(-1.1, from), ends_at: days(-1.06, from) },
    { ...base, tutor_id: T_PAID, student_id: 'st-1', id: 's1', price: 300, status: 'scheduled', starts_at: days(-43, from), ends_at: days(-42.96, from) }, // past its day, never completed
    { ...base, tutor_id: T_PAID, student_id: 'st-1', id: 'd1', price: 300, status: 'completed', starts_at: days(-45, from), ends_at: days(-44.96, from) },
    { ...base, tutor_id: T_PAID, student_id: 'st-2', id: 'd2', price: 300, status: 'completed', starts_at: days(-46, from), ends_at: days(-45.96, from) },
  ]
}
const people = {
  tutors: [{ id: T_PAID, name: 'Tutor Alpha', currency: 'USD' }, { id: T_OTHER, name: 'Tutor Beta', currency: 'USD' }],
  students: [{ id: 'st-1', name: 'Student One' }, { id: 'st-2', name: 'Student Two' }, { id: 'st-beta', name: 'Student Beta' }],
}
const seven = (from: Date = NOW, extra: Record<string, Record<string, unknown>[]> = {}) => createFakeDb({ ...people, lessons: lessons(from), ...extra })

/** The card payments table as the real database has it today: not there. */
const withoutCardTable = (inner: FakeDb, error: { code?: string; message: string } = { code: '42P01', message: 'relation "public.lesson_card_payments" does not exist' }) =>
  ({ from: (t: string) => t === 'lesson_card_payments' ? { select: () => ({ eq: () => ({ order: () => ({ range: async () => ({ data: null, error }) }) }) }) } : inner.from(t) })

beforeEach(() => { currentUser = ADMIN; redirects.length = 0; setAdminLang(null) })

const render = async () => renderToStaticMarkup(await RevenuePage())
const all = (html: string, re: RegExp) => [...html.matchAll(re)].map(m => m[1] ?? m[0])
const text = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]*>/g, ' ').replace(/&#x27;|&quot;|&amp;/g, ' ').replace(/\s+/g, ' ')

// ---- the numbers ------------------------------------------------------------------------------------------------------------------

test('the seven lessons: the main number is 600 (two completed lessons of one tutor), not 1,020; the gap is named, to the cent', async () => {
  const r = await loadAdminRevenue(seven(), NOW)
  assert.deepEqual(r.totals, [{ currency: 'USD', total: 600, count: 2 }])
  assert.equal(r.paidCount, 2)
  assert.deepEqual(r.byTutor.map(t => [t.name, t.total, t.count]), [['Tutor Alpha', 600, 2]])
  assert.deepEqual([r.notCounted.cancelled.count, r.notCounted.cancelled.totals], [4, [{ currency: 'USD', total: 120, count: 4 }]])
  assert.deepEqual([r.notCounted.overdue.count, r.notCounted.overdue.totals], [1, [{ currency: 'USD', total: 300, count: 1 }]])
  assert.equal(r.notCounted.other.count, 0)
  // nothing is lost: what the old page added up (1,020) is the counted money plus the money named as not counted
  const named = [r.notCounted.cancelled, r.notCounted.overdue, r.notCounted.other].reduce((n, x) => n + x.totals.reduce((m, t) => m + t.total, 0), 0)
  assert.equal(600 + named, 1020)
})

test('the flags: cancelled-but-marked-paid (4) and past-its-day-not-completed (1) are in the list, the completed ones are not flagged', async () => {
  const r = await loadAdminRevenue(seven(), NOW)
  assert.deepEqual(r.flagged.map(l => l.reason).sort(), ['cancelled', 'cancelled', 'cancelled', 'cancelled', 'overdue'])
  assert.ok(r.flagged.every(l => !l.counted))
  assert.deepEqual(r.recent.length, 7)
  assert.deepEqual(r.recent.filter(l => l.counted).map(l => l.price), [300, 300])
  assert.deepEqual(r.recent.filter(l => l.reason === null).length, 2)
  // newest first, so the cancelled lessons of the coming week lead the list
  assert.deepEqual(r.recent.map(l => l.startsAt), [...r.recent.map(l => l.startsAt)].sort().reverse())
})

test('what "past its day" means: a scheduled lesson that ended before now; one still to come, one in progress and a no-show are not flagged as overdue', async () => {
  const mk = (id: string, status: string, start: number, end: number) => ({ id, price: 50, payment_status: 'paid', status, tutor_id: T_PAID, student_id: 'st-1', starts_at: days(start), ends_at: days(end) })
  const r = await loadAdminRevenue(createFakeDb({ ...people, lessons: [
    mk('past', 'scheduled', -0.2, -0.1), mk('future', 'scheduled', 2, 2.04), mk('now', 'scheduled', -0.01, 0.02), mk('absent', 'no_show', -3, -2.96), mk('odd', 'unknown-status', -3, -2.96),
  ] }), NOW)
  assert.deepEqual(r.flagged.map(l => l.reason), ['overdue'])
  assert.deepEqual([r.notCounted.overdue.count, r.notCounted.other.count], [1, 4])
  assert.equal(r.paidCount, 0)
  assert.deepEqual(r.totals, [])
  // a lesson with no end time is judged by its start
  const noEnd = await loadAdminRevenue(createFakeDb({ ...people, lessons: [{ id: 'x', price: 10, payment_status: 'paid', status: 'scheduled', tutor_id: T_PAID, student_id: 'st-1', starts_at: days(-5) }] }), NOW)
  assert.deepEqual(noEnd.flagged.map(l => l.reason), ['overdue'])
})

test('a flagged lesson with no price is still flagged (and adds nothing to any amount)', async () => {
  const r = await loadAdminRevenue(createFakeDb({ ...people, lessons: [{ id: 'x', price: null, payment_status: 'paid', status: 'cancelled', tutor_id: T_PAID, student_id: 'st-1', starts_at: days(-5), ends_at: days(-4.9) }] }), NOW)
  assert.deepEqual([r.flagged.length, r.notCounted.cancelled.count, r.notCounted.cancelled.totals, r.totals], [1, 1, [], []])
})

test('lessons that are not marked paid are never in this page, whatever their status', async () => {
  const r = await loadAdminRevenue(createFakeDb({ ...people, lessons: [
    { id: 'p', price: 80, payment_status: 'pending', status: 'completed', tutor_id: T_PAID, student_id: 'st-1', starts_at: days(-5), ends_at: days(-4.9) },
    { id: 'u', price: 80, payment_status: 'unpaid', status: 'cancelled', tutor_id: T_PAID, student_id: 'st-1', starts_at: days(-5), ends_at: days(-4.9) },
  ] }), NOW)
  assert.deepEqual([r.paidCount, r.totals, r.recent, r.flagged], [0, [], [], []])
})

// ---- the card number ------------------------------------------------------------------------------------------------------------------

test('the card table is not there (as on the real database): the card number is 0 and nothing fails, for both ways a missing table is reported', async () => {
  for (const error of [{ code: '42P01', message: 'relation "public.lesson_card_payments" does not exist' }, { code: 'PGRST205', message: "Could not find the table 'public.lesson_card_payments' in the schema cache" }]) {
    const r = await loadAdminRevenue(withoutCardTable(seven(), error), NOW)
    assert.deepEqual(r.card, { ok: true, totals: [] }, error.code)
    assert.deepEqual(r.totals, [{ currency: 'USD', total: 600, count: 2 }], 'the main number does not depend on it')
  }
})

test('any other failure reading the card table is said as "could not be read", never as a zero, and the rest of the page still works', async () => {
  const r = await loadAdminRevenue(withoutCardTable(seven(), { code: '57014', message: 'canceling statement due to statement timeout' }), NOW)
  assert.deepEqual(r.card, { ok: false })
  assert.equal(r.paidCount, 2)
})

test('a lesson a card payment covers is counted by card only (never twice); unpaid card sessions count for nothing; amounts are read in the currency\'s own unit', async () => {
  const r = await loadAdminRevenue(seven(NOW, { lesson_card_payments: [
    { stripe_session_id: 'cs_1', lesson_id: 'd1', amount_minor: 30000, currency: 'usd', status: 'paid' },
    { stripe_session_id: 'cs_2', lesson_id: 'd2', amount_minor: 30000, currency: 'usd', status: 'created' },
    { stripe_session_id: 'cs_3', lesson_id: null, amount_minor: 500000, currency: 'vnd', status: 'paid' },
    { stripe_session_id: 'cs_4', lesson_id: null, amount_minor: 9999, currency: 'usd', status: 'expired' },
  ] }), NOW)
  assert.deepEqual(r.card, { ok: true, totals: [{ currency: 'VND', total: 500000, count: 1 }, { currency: 'USD', total: 300, count: 1 }] })
  assert.deepEqual(r.totals, [{ currency: 'USD', total: 300, count: 1 }], 'd1 is confirmed by card, so only d2 is "marked paid by tutors"')
  assert.equal(r.paidCount, 1)
})

// ---- the page, in English ------------------------------------------------------------------------------------------------------------

// The page reads the real clock, so the seven lessons are placed relative to the real now.
const realNow = new Date()
const seed = (extra: Record<string, Record<string, unknown>[]> = {}) => seven(realNow, extra)

test('the page (English): 600 as the main number with its honest label, 0 confirmed by card with the table missing, 1,020 nowhere', async () => {
  db = withoutCardTable(seed())
  const html = await render()
  assert.match(html, /data-testid="revenue-marked"[^>]*>[\s\S]*?Marked paid by tutors \(not verified\)/)
  assert.deepEqual(all(html, /data-testid="revenue-marked-value"[^>]*>(\$[\d,.]+)</g), ['$600.00'])
  assert.match(html, /data-testid="revenue-card"[^>]*>[\s\S]*?Confirmed by card/)
  assert.deepEqual(all(html, /data-testid="revenue-card-value"[^>]*>(\$[\d,.]+)</g), ['$0.00'])
  assert.deepEqual(all(html, /data-testid="revenue-counted-value"[^>]*>(\d+)</g), ['2'])
  assert.doesNotMatch(text(html), /1,020/)
  assert.doesNotMatch(html, />Total Revenue<|>Revenue<\/h1>|>Total paid by students</)
  assert.match(html, /<h1[^>]*>Lesson payments to tutors<\/h1>/)
  assert.doesNotMatch(html, /Could not be read<\/p><p[^>]*>The card payments/, 'a missing table is not an error')
})

test('the page (English): the gap is shown (4 cancelled for $120.00, 1 past its day for $300.00) and every flagged lesson carries its flag', async () => {
  db = withoutCardTable(seed())
  const html = await render()
  const summary = html.match(/data-testid="revenue-not-counted"[\s\S]*?<\/ul>/)?.[0] ?? ''
  assert.match(text(summary), /Marked paid, but not counted/)
  assert.match(text(summary), /Cancelled but marked paid Lessons: 4, \$120\.00/)
  assert.match(text(summary), /Past date, not completed Lessons: 1, \$300\.00/)
  const flagged = html.match(/data-testid="revenue-flagged"[\s\S]*?<div class="grid grid-cols-1 md:grid-cols-2/)?.[0] ?? ''
  assert.match(text(flagged), /Needs a look/)
  assert.equal(all(flagged, /data-testid="revenue-flag"[^>]*>(Cancelled but marked paid)</g).length, 4)
  assert.equal(all(flagged, /data-testid="revenue-flag"[^>]*>(Past date, not completed)</g).length, 1)
  assert.equal(all(flagged, /data-testid="revenue-row"/g).length, 5)
  // the recent list shows all seven; the two completed ones carry no flag, the other five say "not counted"
  const recent = html.match(/data-testid="revenue-recent"[\s\S]*$/)?.[0] ?? ''
  assert.equal(all(recent, /data-testid="revenue-row"/g).length, 7)
  assert.equal(all(recent, /data-reason="counted"/g).length, 2)
  assert.equal(all(recent, />not counted</g).length, 5)
  assert.ok(text(recent).includes('Tutor Alpha → Student One') && text(recent).includes('Tutor Beta → Student Beta'))
})

test('the page (English): with no flagged lesson there is no warning box and no "Needs a look" list', async () => {
  db = createFakeDb({ ...people, lessons: lessons(realNow).filter(l => l.status === 'completed') })
  const html = await render()
  assert.doesNotMatch(html, /revenue-not-counted|revenue-flagged|Needs a look/)
  assert.deepEqual(all(html, /data-testid="revenue-marked-value"[^>]*>(\$[\d,.]+)</g), ['$600.00'])
})

test('the page: a card table that cannot be read says "Could not be read" in the card box, not $0.00; the other numbers stay', async () => {
  db = withoutCardTable(seed(), { code: '57014', message: 'timeout' })
  const html = await render()
  const card = html.match(/data-testid="revenue-card"[\s\S]*?<\/div><div data-testid|data-testid="revenue-card"[\s\S]*?(?=<div class="bg-white rounded-xl p-5)/)?.[0] ?? ''
  assert.match(card, /data-testid="revenue-card-unreadable"[^>]*>Could not be read</)
  assert.doesNotMatch(card, /revenue-card-value/)
  assert.deepEqual(all(html, /data-testid="revenue-marked-value"[^>]*>(\$[\d,.]+)</g), ['$600.00'])
})

test('the page with a real card payment: the card number shows it and the first number drops it (no double counting)', async () => {
  db = seed({ lesson_card_payments: [{ stripe_session_id: 'cs_1', lesson_id: 'd1', amount_minor: 30000, currency: 'usd', status: 'paid' }] })
  const html = await render()
  assert.deepEqual(all(html, /data-testid="revenue-marked-value"[^>]*>(\$[\d,.]+)</g), ['$300.00'])
  assert.deepEqual(all(html, /data-testid="revenue-card-value"[^>]*>(\$[\d,.]+)</g), ['$300.00'])
})

// ---- the page, in Vietnamese (the EN | VI switch) ---------------------------------------------------------------------------------------

test('the page (Vietnamese): the same numbers and flags in Vietnamese words; English is the default and stays English', async () => {
  db = withoutCardTable(seed())
  const en = await render()
  setAdminLang('vi')
  const vi = await render()
  assert.match(vi, /Gia sư tự ghi đã trả \(chưa kiểm chứng\)/)
  assert.match(vi, /Đã xác nhận bằng thẻ/)
  assert.match(text(vi), /Đã huỷ nhưng ghi đã trả Số buổi: 4, \$120\.00/)
  assert.match(text(vi), /Quá ngày mà chưa hoàn thành Số buổi: 1, \$300\.00/)
  assert.match(vi, /Cần xem lại/)
  assert.deepEqual(all(vi, /data-testid="revenue-marked-value"[^>]*>(\$[\d,.]+)</g), ['$600.00'])
  assert.deepEqual(all(vi, /data-testid="revenue-card-value"[^>]*>(\$[\d,.]+)</g), ['$0.00'])
  assert.doesNotMatch(vi, /Marked paid by tutors|Confirmed by card|Cancelled but marked paid|Past date, not completed|Needs a look/)
  assert.doesNotMatch(en, /[ạảãàáâậầấẩẫăắằặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i, 'English has no Vietnamese letter')
  // the digits on the page do not change with the language
  const digits = (h: string) => (text(h).match(/\$[\d,.]+|\b\d+\b/g) ?? []).sort()
  assert.deepEqual(digits(vi).filter(x => x.startsWith('$')), digits(en).filter(x => x.startsWith('$')))
})

// ---- who may look, and that it only reads -----------------------------------------------------------------------------------------------

test('only the admin gets in, and nothing is read before that is checked', async () => {
  const touched: string[] = []
  db = { from: (t: string) => { touched.push(t); throw new Error('read before the admin check') } }
  currentUser = { id: 'u-1', email: 'ten@example.com' }
  await assert.rejects(RevenuePage(), /NEXT_REDIRECT:\/dashboard/)
  currentUser = null
  await assert.rejects(RevenuePage(), /NEXT_REDIRECT:\/login/)
  assert.deepEqual(touched, [])
})

test('the page and the loader only read: nothing is inserted, updated, upserted or deleted', async () => {
  const fake = seed()
  db = fake
  await render()
  assert.deepEqual(fake.log, [])
  const src = ['src/lib/admin-revenue.ts', 'src/app/(admin)/admin/revenue/page.tsx'].map(f => readFileSync(path.join(ROOT, f), 'utf8')).join('\n')
  assert.doesNotMatch(src, /\.(insert|update|upsert|delete)\(/)
})

test('the words come from the admin translation table (both languages), the page types none of them, and the sign-out and EN | VI controls are in the layout it sits in', () => {
  const page = readFileSync(path.join(SRC, 'app/(admin)/admin/revenue/page.tsx'), 'utf8')
  for (const phrase of ['Marked paid by tutors', 'Confirmed by card', 'Cancelled but marked paid', 'Past date, not completed', 'Needs a look']) assert.ok(!page.includes(phrase), `${phrase} is typed in the page`)
  for (const key of ['revenue.marked', 'revenue.card', 'revenue.flagCancelled', 'revenue.flagOverdue']) assert.ok(page.includes(key), key)
  const layout = readFileSync(path.join(SRC, 'app/(admin)/layout.tsx'), 'utf8') + readFileSync(path.join(SRC, 'components/admin/AdminSidebar.tsx'), 'utf8')
  assert.match(layout, /LangToggle/)
  assert.match(layout, /Sign out|admin\.signOut|signOut/)
})
