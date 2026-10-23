// T-0619: a tutor's money is shown in the tutor's own currency (tutors.currency), never in lessons.currency,
// which nothing writes (every lesson says USD). Covers the helpers, the dashboard / payments / revenue
// loaders, and a scan of every page that shows tutor money.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createFakeDb } from './support/fake-db.ts'
import { currencySymbol, formatMoney, normalizeCurrency, totalsByCurrency } from '@/lib/currency.ts'
import { loadTutorCurrency } from '@/lib/tutor-currency.ts'
import { loadAdminRevenue } from '@/lib/admin-revenue.ts'
import './support/admin-lang.ts'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')
const read = (f: string) => readFileSync(path.join(SRC, f), 'utf8')

test('symbols and amounts: EUR, VND, USD, and a currency with no short symbol is never shown as dollars', () => {
  assert.equal(currencySymbol('EUR'), '€')
  assert.equal(currencySymbol('VND'), '₫')
  assert.equal(currencySymbol('USD'), '$')
  assert.equal(currencySymbol('eur'), '€', 'lower case is the same currency')
  assert.equal(currencySymbol('CHF'), 'CHF ')
  assert.equal(formatMoney(40, 'EUR'), '€40.00')
  assert.equal(formatMoney(500000, 'VND'), '₫500,000', 'dong has no cents')
  assert.equal(formatMoney(1234.5, 'USD'), '$1,234.50')
  assert.equal(formatMoney(4000, 'JPY'), '¥4,000')
  assert.equal(formatMoney(1234.56, 'EUR', true), '€1,235', 'whole drops the cents')
  assert.equal(formatMoney(12.5, 'CHF'), 'CHF 12.50')
  assert.equal(formatMoney(null, 'EUR'), '€0.00')
  assert.equal(formatMoney('abc', 'EUR'), '€0.00')
})

test('a tutor who never chose a currency is shown dollars, as on the booking page; a value that is not a code is too', () => {
  for (const v of [null, undefined, '', '  ', 'US$', 'euro', 5, {}]) assert.equal(normalizeCurrency(v), 'USD', String(v))
  assert.equal(normalizeCurrency(' vnd '), 'VND')
})

test('totals are one per currency: euros and dong are never added together', () => {
  const t = totalsByCurrency([
    { price: 40, currency: 'EUR' }, { price: 40, currency: 'eur' }, { price: 500000, currency: 'VND' }, { price: 25 }, { price: null, currency: 'EUR' },
  ])
  assert.deepEqual(t, [
    { currency: 'VND', total: 500000, count: 1 },
    { currency: 'EUR', total: 80, count: 3 },
    { currency: 'USD', total: 25, count: 1 },
  ])
})

const T_EUR = '10000000-0000-4000-8000-0000000000e1'
const T_VND = '10000000-0000-4000-8000-0000000000d1'
const T_USD = '10000000-0000-4000-8000-0000000000a1'
const T_NONE = '10000000-0000-4000-8000-0000000000b1'
const S = (n: number) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function seed(extraPaidLessons = 0) {
  // every lesson says currency 'USD', as in the real database
  const lessons: Record<string, unknown>[] = [
    { id: 'l1', tutor_id: T_EUR, student_id: S(1), price: 40, currency: 'USD', payment_status: 'paid', status: 'completed', starts_at: '2026-10-01T10:00:00Z' },
    { id: 'l2', tutor_id: T_EUR, student_id: S(1), price: 40, currency: 'USD', payment_status: 'paid', status: 'completed', starts_at: '2026-10-02T10:00:00Z' },
    { id: 'l3', tutor_id: T_VND, student_id: S(2), price: 500000, currency: 'USD', payment_status: 'paid', status: 'completed', starts_at: '2026-10-03T10:00:00Z' },
    { id: 'l4', tutor_id: T_USD, student_id: S(3), price: 25, currency: 'USD', payment_status: 'paid', status: 'completed', starts_at: '2026-10-04T10:00:00Z' },
    { id: 'l5', tutor_id: T_NONE, student_id: S(3), price: 10, currency: 'USD', payment_status: 'paid', status: 'completed', starts_at: '2026-10-05T10:00:00Z' },
    { id: 'l6', tutor_id: T_EUR, student_id: S(1), price: 40, currency: 'USD', payment_status: 'pending', starts_at: '2026-10-06T10:00:00Z' },
  ]
  for (let i = 0; i < extraPaidLessons; i++) {
    lessons.push({ id: `x${String(i).padStart(5, '0')}`, tutor_id: T_VND, student_id: S(2), price: 1000, currency: 'USD', payment_status: 'paid', status: 'completed', starts_at: '2026-09-01T10:00:00Z' })
  }
  return createFakeDb({
    tutors: [
      { id: T_EUR, name: 'Tutor Euro', currency: 'EUR' }, { id: T_VND, name: 'Tutor Dong', currency: 'VND' },
      { id: T_USD, name: 'Tutor Dollar', currency: 'USD' }, { id: T_NONE, name: 'Tutor None', currency: null },
    ],
    students: [{ id: S(1), name: 'Anh' }, { id: S(2), name: 'Binh' }, { id: S(3), name: 'Chi' }],
    lessons,
  })
}

test('the dashboard, payments, calendar and reports currency is the tutor\'s: EUR, VND, USD, none', async () => {
  const db = seed()
  assert.equal(await loadTutorCurrency(db, T_EUR), 'EUR')
  assert.equal(await loadTutorCurrency(db, T_VND), 'VND')
  assert.equal(await loadTutorCurrency(db, T_USD), 'USD')
  assert.equal(await loadTutorCurrency(db, T_NONE), 'USD')
  assert.equal(await loadTutorCurrency(db, 'no-such-tutor'), 'USD')
  // what the old dashboard did: every lesson says USD, so it showed "$" to the EUR and VND tutors
  assert.ok(db.tables.lessons.every(l => l.currency === 'USD'))
  assert.equal(currencySymbol(await loadTutorCurrency(db, T_EUR)), '€')
  assert.equal(currencySymbol(await loadTutorCurrency(db, T_VND)), '₫')
})

test('the revenue page: one total per currency, each tutor in their own, recent payments in the tutor\'s', async () => {
  const r = await loadAdminRevenue(seed())
  assert.equal(r.paidCount, 5, 'pending lessons are not revenue')
  assert.deepEqual(r.totals, [
    { currency: 'VND', total: 500000, count: 1 },
    { currency: 'EUR', total: 80, count: 2 },
    { currency: 'USD', total: 35, count: 2 }, // the dollar tutor and the tutor who never chose a currency
  ])
  assert.deepEqual(r.byTutor.map(t => [t.name, t.currency, t.total, t.count]), [
    ['Tutor Euro', 'EUR', 80, 2], ['Tutor Dollar', 'USD', 25, 1], ['Tutor None', 'USD', 10, 1], ['Tutor Dong', 'VND', 500000, 1],
  ])
  assert.deepEqual(r.recent.map(p => formatMoney(p.price, p.currency)), ['$10.00', '$25.00', '₫500,000', '€40.00', '€40.00'])
  assert.equal(r.recent[0].tutor, 'Tutor None')
  assert.equal(r.recent[0].student, 'Chi')
  assert.equal(r.truncated, false)
})

test('the revenue page counts every paid lesson, not the 20 newest, and reads past the 1000-row page', async () => {
  const r = await loadAdminRevenue(seed(1500))
  assert.equal(r.paidCount, 1505)
  assert.equal(r.recent.length, 20)
  assert.deepEqual(r.totals.find(t => t.currency === 'VND'), { currency: 'VND', total: 500000 + 1500 * 1000, count: 1501 })
})

test('a read error is an error, not an empty revenue page', async () => {
  const db = seed()
  const broken = { from: (t: string) => t === 'lessons' ? { select: () => ({ eq: () => ({ order: () => ({ order: () => ({ range: async () => ({ data: null, error: { message: 'boom' } }) }) }) }) }) } : db.from(t) }
  await assert.rejects(loadAdminRevenue(broken), /Could not read/)
})

// ---- every page that shows tutor money -------------------------------------------------------------------------

const PAGES = [
  'app/(dashboard)/dashboard/page.tsx', 'app/(dashboard)/earnings/page.tsx',
  'app/(dashboard)/calendar/page.tsx', 'app/(dashboard)/calendar/CalendarView.tsx', 'app/(admin)/admin/revenue/page.tsx',
  'lib/admin-revenue.ts', 'lib/tutor-currency.ts', 'app/book/[slug]/BookingForm.tsx',
]

test('no page reads lessons.currency or invoices.currency (nothing writes them), and none hard-codes a dollar sign on a tutor\'s money', () => {
  for (const f of PAGES) {
    const src = read(f).replace(/\/\/.*$/gm, '')
    assert.ok(!/from\('(lessons|invoices)'\)[\s\S]{0,200}?select\([^)]*\bcurrency\b/.test(src), `${f} reads a currency column that is never written`)
    assert.ok(!/\?\.currency\b[^\n]*(lessons|invoices)|(lessons|invoices)\w*\)?\[0\]\??\.currency/.test(src), `${f} takes the currency from a lesson or invoice row`)
    assert.ok(!/`\$\$\{|>\$\{|\{`\$`}|'\$'/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), `${f} writes a literal dollar sign before an amount`)
  }
  assert.ok(read('app/(dashboard)/dashboard/page.tsx').includes('symbolOf(tutor?.currency)'))
  assert.ok(read('app/(dashboard)/earnings/page.tsx').includes('loadTutorCurrency(supabase, user.id)'))
  assert.ok(read('app/(dashboard)/calendar/page.tsx').includes('loadTutorCurrency(supabase, user.id)'))
  assert.ok(read('app/(admin)/admin/revenue/page.tsx').includes('loadAdminRevenue('))
})

test('the revenue page checks the admin itself before it creates the service-key client (a layout is not a gate)', () => {
  const page = read('app/(admin)/admin/revenue/page.tsx')
  const guard = page.indexOf('await requireAdminPage()')
  assert.ok(guard > 0)
  assert.ok(guard < page.indexOf('createAdminClient()', guard), 'the guard comes first')
  assert.ok(page.indexOf('createAdminClient()') > guard, 'no service-key client before the guard')
  assert.ok(read('proxy.ts').includes("path.startsWith('/admin')"), 'and the proxy treats /admin as an admin page')
})

test('the embedded booking widget gets the tutor\'s currency too', () => {
  // the pages read the tutor with the lists of src/lib/public-tutor-columns.ts (T-0774); the currency is in each of them
  const cols = read('lib/public-tutor-columns.ts')
  assert.ok(/EMBED_PAGE_COLUMNS = list\(\[[^\]]*'default_lesson_price', 'currency'/.test(cols), 'the embed list has the currency')
  assert.ok(/BOOKING_PAGE_COLUMNS = list\(\[[^\]]*'currency'/.test(cols) && /MEMBER_PAGE_COLUMNS = list\(\[[^\]]*'currency'/.test(cols))
  assert.ok(read('app/embed/[slug]/page.tsx').includes('EMBED_PAGE_COLUMNS') && read('app/book/[slug]/page.tsx').includes('BOOKING_PAGE_COLUMNS') && read('app/book/[slug]/[member]/page.tsx').includes('MEMBER_PAGE_COLUMNS'))
})
