// T-0612 (review): the currency a student is charged in. The lesson is created through the REAL booking
// route (`/api/bookings`), exactly as a student does it, and then paid through `/api/stripe/checkout`.
// Nothing here writes a currency onto the lesson: the schema gives every lesson 'USD', so the only
// right answer is the tutor's own currency, the one the booking page shows.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

let db: FakeDb
type Call = {
  params: { line_items: { price_data: { unit_amount: number; currency: string } }[] }
  options: { stripeAccount?: string } | undefined
}
const sessions: Call[] = []

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: { createAdminClient: () => db, createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) },
})
class FakeStripe {
  checkout = { sessions: { create: async (params: Call['params'], options?: Call['options']) => { sessions.push({ params, options }); return { url: 'https://checkout.stripe.example/session' } } } }
}
mock.module('stripe', { defaultExport: FakeStripe })

const bookings = await import('@/app/api/bookings/route.ts')
const checkout = await import('@/app/api/stripe/checkout/route.ts')

const T_EUR = '10000000-0000-4000-8000-0000000000e1'
const T_VND = '10000000-0000-4000-8000-0000000000d1'
const T_USD = '10000000-0000-4000-8000-0000000000a1' // chose nothing: the booking page shows dollars
const T_JPY = '10000000-0000-4000-8000-0000000000f1'

// What the schema fills in on insert (001_schema.sql: lessons.currency default 'USD'; a student's
// portal_token is made by the database).
const DEFAULTS = {
  lessons: { currency: 'USD' },
  students: { portal_token: () => `portal-${randomUUID()}` },
}

function seed() {
  const connected = { subscription_status: 'pro', stripe_onboarding_complete: true }
  return createFakeDb({
    tutors: [
      { id: T_EUR, name: 'Tutor Euro', currency: 'EUR', default_lesson_price: 40, trial_enabled: true, trial_price: 15.5, stripe_account_id: 'acct_eur', ...connected },
      { id: T_VND, name: 'Tutor Dong', currency: 'VND', default_lesson_price: 500000, stripe_account_id: 'acct_vnd', ...connected },
      { id: T_USD, name: 'Tutor Dollar', currency: null, default_lesson_price: 25, stripe_account_id: 'acct_usd', ...connected },
      { id: T_JPY, name: 'Tutor Yen', currency: 'JPY', default_lesson_price: 4000, stripe_account_id: 'acct_jpy', ...connected },
    ],
  }, DEFAULTS)
}

beforeEach(() => {
  db = seed()
  sessions.length = 0
  delete process.env.RESEND_API_KEY // no email is sent from a test
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_tests'
})

let slot = 0
// A student books through the real route, then pays the lesson that booking created.
async function bookAndPay(tutorId: string, extra: Record<string, unknown> = {}) {
  const email = `student${++slot}@example.com`
  const booked = await bookings.POST(new Request('https://www.tutafy.test/api/bookings', {
    method: 'POST',
    headers: { host: 'www.tutafy.test', 'x-forwarded-proto': 'https' },
    body: JSON.stringify({ tutorId, date: '2030-01-07', time: `${String(8 + slot).padStart(2, '0')}:00`, duration: 60, name: `Student ${slot}`, email, ...extra }),
  }))
  assert.equal(booked.status, 200)
  const { portal_token, lesson_id } = await booked.json()
  const lesson = db.tables.lessons.find(l => l.id === lesson_id)!
  const res = await checkout.POST(new Request('https://www.tutafy.test/api/stripe/checkout', {
    method: 'POST',
    headers: { host: 'www.tutafy.test', 'x-forwarded-proto': 'https' },
    body: JSON.stringify({ lessonId: lesson_id, portalToken: portal_token }),
  }))
  return { res, lesson, session: sessions.at(-1) }
}

test('the fake database gives a booked lesson the schema default, so these tests start from the real shape', async () => {
  const { lesson } = await bookAndPay(T_EUR)
  assert.equal(lesson.currency, 'USD', 'the booking route never writes a currency: the column keeps its default')
  assert.equal(lesson.price, 40)
})

test('a EUR tutor\'s student booked through /api/bookings is charged 40.00 EUR, not 40 USD', async () => {
  const { res, session } = await bookAndPay(T_EUR)
  assert.equal(res.status, 200)
  assert.equal(session!.params.line_items[0].price_data.currency, 'eur')
  assert.equal(session!.params.line_items[0].price_data.unit_amount, 4000)
  assert.deepEqual(session!.options, { stripeAccount: 'acct_eur' })
})

test('a VND tutor\'s student is charged 500000 dong (whole units), not 500000 dollars', async () => {
  const { res, session } = await bookAndPay(T_VND)
  assert.equal(res.status, 200)
  assert.equal(session!.params.line_items[0].price_data.currency, 'vnd')
  assert.equal(session!.params.line_items[0].price_data.unit_amount, 500000)
  assert.deepEqual(session!.options, { stripeAccount: 'acct_vnd' })
})

test('a JPY tutor is charged in whole yen; a tutor with no currency chosen is charged dollars', async () => {
  const yen = await bookAndPay(T_JPY)
  assert.equal(yen.session!.params.line_items[0].price_data.currency, 'jpy')
  assert.equal(yen.session!.params.line_items[0].price_data.unit_amount, 4000)
  const usd = await bookAndPay(T_USD)
  assert.equal(usd.session!.params.line_items[0].price_data.currency, 'usd')
  assert.equal(usd.session!.params.line_items[0].price_data.unit_amount, 2500)
})

test('the trial price of a EUR tutor is charged in euros too', async () => {
  const { session } = await bookAndPay(T_EUR, { isTrial: true })
  assert.equal(session!.params.line_items[0].price_data.currency, 'eur')
  assert.equal(session!.params.line_items[0].price_data.unit_amount, 1550)
})

test('the same lesson is charged in the tutor\'s currency even if the lesson row is changed to say otherwise', async () => {
  // A lesson row that carries some other currency (a manual edit, an import) must not decide the charge.
  const booked = await bookAndPay(T_VND)
  assert.equal(booked.session!.params.line_items[0].price_data.currency, 'vnd')
  db.tables.lessons.find(l => l.id === booked.lesson.id)!.currency = 'EUR'
  const portalToken = db.tables.students.find(s => s.id === booked.lesson.student_id)!.portal_token
  const again = await checkout.POST(new Request('https://www.tutafy.test/api/stripe/checkout', {
    method: 'POST', body: JSON.stringify({ lessonId: booked.lesson.id, portalToken }),
  }))
  assert.equal(again.status, 200)
  assert.equal(sessions.at(-1)!.params.line_items[0].price_data.currency, 'vnd')
})
