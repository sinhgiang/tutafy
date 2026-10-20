// T-0619: the price the booking page shows a student after booking is the amount Stripe charges. A lesson is
// created through the REAL /api/bookings (trial price, coupon, plain price), the page's label is made from
// that answer with the page's own formatter, and the real /api/stripe/checkout is asked for the session.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

let db: FakeDb
type Call = { params: { line_items: { price_data: { unit_amount: number; currency: string } }[] }; options: { stripeAccount?: string } | undefined }
const sessions: Call[] = []
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: { createAdminClient: () => db, createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) },
})
class FakeStripe {
  checkout = { sessions: {
    retrieve: async () => ({ status: 'open' }),
    expire: async () => ({}),
    create: async (params: Call['params'], options?: Call['options']) => { sessions.push({ params, options }); return { id: `cs_test_${sessions.length}`, url: 'https://checkout.stripe.example/session' } },
  } }
}
mock.module('stripe', { defaultExport: FakeStripe })

const bookings = await import('@/app/api/bookings/route.ts')
const checkout = await import('@/app/api/stripe/checkout/route.ts')
const { formatMoney } = await import('@/lib/currency.ts')
const { stripeMinorUnits } = await import('@/lib/stripe/amount.ts')
const { showBuiltInCardCheckout } = await import('@/lib/payment-methods.ts')

const T_EUR = '10000000-0000-4000-8000-0000000000e1' // 40.00 EUR, trial 15.50
const T_VND = '10000000-0000-4000-8000-0000000000d1' // 500000 VND
const T_USD = '10000000-0000-4000-8000-0000000000a1' // 25 USD, never chose a currency
const connected = { subscription_status: 'pro', stripe_onboarding_complete: true }

beforeEach(() => {
  db = createFakeDb({
    tutors: [
      { id: T_EUR, name: 'Tutor Euro', currency: 'EUR', default_lesson_price: 40, trial_enabled: true, trial_price: 15.5, stripe_account_id: 'acct_eur', ...connected },
      { id: T_VND, name: 'Tutor Dong', currency: 'VND', default_lesson_price: 500000, stripe_account_id: 'acct_vnd', ...connected },
      { id: T_USD, name: 'Tutor Dollar', currency: null, default_lesson_price: 25, stripe_account_id: 'acct_usd', ...connected },
    ],
    coupons: [
      { id: 'c1', tutor_id: T_EUR, code: 'HALF', discount_type: 'percent', discount_value: 50, max_uses: null, uses_count: 0, expires_at: null, active: true },
      { id: 'c2', tutor_id: T_VND, code: 'OFF100K', discount_type: 'fixed', discount_value: 100000, max_uses: null, uses_count: 0, expires_at: null, active: true },
      { id: 'c3', tutor_id: T_EUR, code: 'FREE', discount_type: 'percent', discount_value: 100, max_uses: null, uses_count: 0, expires_at: null, active: true },
    ],
  }, { lessons: { currency: 'USD' }, students: { portal_token: () => `portal-${randomUUID()}` } })
  sessions.length = 0
  delete process.env.RESEND_API_KEY
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_tests'
})

let n = 0
async function book(tutorId: string, extra: Record<string, unknown> = {}) {
  n++
  const res = await bookings.POST(new Request('https://www.tutafy.test/api/bookings', {
    method: 'POST', headers: { host: 'www.tutafy.test', 'x-forwarded-proto': 'https' },
    body: JSON.stringify({ tutorId, date: '2030-01-07', time: `${String(7 + (n % 12)).padStart(2, '0')}:00`, duration: 60, name: `Student ${n}`, email: `student${n}@example.com`, ...extra }),
  }))
  assert.equal(res.status, 200)
  return res.json() as Promise<{ portal_token: string; lesson_id: string; price: number | null; currency: string }>
}
const pay = (b: { portal_token: string; lesson_id: string }) => checkout.POST(new Request('https://www.tutafy.test/api/stripe/checkout', {
  method: 'POST', headers: { host: 'www.tutafy.test', 'x-forwarded-proto': 'https' }, body: JSON.stringify({ lessonId: b.lesson_id, portalToken: b.portal_token }),
}))

/** The amount in the label, in Stripe's smallest unit: what the student reads is what Stripe takes. */
function labelInMinorUnits(label: string, currency: string) {
  const major = Number(label.replace(/[^0-9.]/g, ''))
  return stripeMinorUnits(major, currency)
}

const CASES: { name: string; tutor: string; extra?: Record<string, unknown>; label: string; unit: number; currency: string }[] = [
  { name: 'EUR, plain price', tutor: T_EUR, label: '€40.00', unit: 4000, currency: 'eur' },
  { name: 'EUR, trial price (15.50, not the 40 default)', tutor: T_EUR, extra: { isTrial: true }, label: '€15.50', unit: 1550, currency: 'eur' },
  { name: 'EUR, 50% coupon', tutor: T_EUR, extra: { couponCode: 'HALF' }, label: '€20.00', unit: 2000, currency: 'eur' },
  { name: 'EUR, trial price with a coupon', tutor: T_EUR, extra: { isTrial: true, couponCode: 'HALF' }, label: '€7.75', unit: 775, currency: 'eur' },
  { name: 'VND, plain price (dong, no cents)', tutor: T_VND, label: '₫500,000', unit: 500000, currency: 'vnd' },
  { name: 'VND, fixed coupon', tutor: T_VND, extra: { couponCode: 'OFF100K' }, label: '₫400,000', unit: 400000, currency: 'vnd' },
  { name: 'USD (no currency chosen), plain price', tutor: T_USD, label: '$25.00', unit: 2500, currency: 'usd' },
]

for (const c of CASES) {
  test(`the price shown after booking is the price Stripe charges: ${c.name}`, async () => {
    const booked = await book(c.tutor, c.extra)
    const label = formatMoney(booked.price, booked.currency) // what BookingForm's payment panel prints
    assert.equal(label, c.label)
    const res = await pay(booked)
    assert.equal(res.status, 200)
    const item = sessions[0].params.line_items[0].price_data
    assert.equal(item.unit_amount, c.unit)
    assert.equal(item.currency, c.currency)
    assert.equal(labelInMinorUnits(label, booked.currency), item.unit_amount, 'the label and the session say the same amount')
    assert.equal(booked.currency.toLowerCase(), item.currency, 'and the same currency')
  })
}

test('the trial and coupon prices are NOT the tutor\'s default price: the page must not show the default', async () => {
  const trial = await book(T_EUR, { isTrial: true })
  const tutor = db.tables.tutors.find(t => t.id === T_EUR)!
  assert.notEqual(trial.price, tutor.default_lesson_price)
  assert.equal(trial.price, 15.5)
})

test('a free lesson (100% coupon): price 0, no card button, and the checkout refuses it', async () => {
  const booked = await book(T_EUR, { couponCode: 'FREE' })
  assert.equal(booked.price, 0)
  assert.equal(showBuiltInCardCheckout({}, booked.lesson_id, booked.price, true), false)
  assert.equal(db.tables.lessons.find(l => l.id === booked.lesson_id)!.payment_status, 'free')
  assert.equal((await pay(booked)).status, 409)
  assert.equal(sessions.length, 0)
})

test('a tutor with no price set: price null, no card button', async () => {
  db.tables.tutors.find(t => t.id === T_USD)!.default_lesson_price = null
  const booked = await book(T_USD)
  assert.equal(booked.price, null)
  assert.equal(showBuiltInCardCheckout({}, booked.lesson_id, booked.price, true), false)
})

test('BookingForm prints the booked price, not the tutor default, and formats every amount with the tutor\'s currency', () => {
  const form = readFileSync(path.join(SRC, 'app/book/[slug]/BookingForm.tsx'), 'utf8')
  const panel = form.slice(form.indexOf('function PaymentPanel'), form.indexOf('interface SubscriptionPlan')).replace(/\/\/.*$/gm, '')
  assert.ok(panel.includes('const price = booked.price'))
  assert.ok(!panel.includes('default_lesson_price'), 'the payment panel does not read the default price')
  assert.ok(panel.includes('formatMoney(price, booked.currency)'))
  assert.ok(form.includes('<PaymentPanel tutor={tutor} booked={booked}'))
  assert.ok(form.includes('setBooked({ price: typeof d.price'))
  // the trial price is not rounded to whole units any more (15.50 was shown as 16)
  assert.ok(form.includes('formatMoney(trialPrice, tutor.currency)'))
  assert.ok(!/\$\$\{|>\$\{/.test(form.replace(/\/\/.*$/gm, '')), 'no literal dollar sign before an amount')
})
