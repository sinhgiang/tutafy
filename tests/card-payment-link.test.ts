// The tutor's own card payment link (Stripe Payment Link, stored in the existing
// paddle_checkout_link column): what Settings accepts and what the booking page shows.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { safeHttpsUrl, checkCardPaymentLink, cardLinkForSave, CARD_LINK_ERROR, CARD_LINK_MAX_LENGTH } =
  await import('@/lib/payment-link.ts')
const { buildPaymentMethods, showBuiltInCardCheckout, paypalUrl } = await import('@/lib/payment-methods.ts')

const STRIPE_LINK = 'https://buy.stripe.com/test_abc123'
const read = (rel: string) =>
  readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', rel), 'utf8')

// ---- what is accepted ------------------------------------------------------

test('safeHttpsUrl: accepts a normal https Payment Link', () => {
  assert.equal(safeHttpsUrl(STRIPE_LINK), STRIPE_LINK)
  assert.equal(safeHttpsUrl(`  ${STRIPE_LINK}  `), STRIPE_LINK)
  assert.equal(safeHttpsUrl('HTTPS://buy.stripe.com/x'), 'https://buy.stripe.com/x')
  assert.equal(safeHttpsUrl('https://buy.stripe.com/x?prefilled_email=ten%40example.com'), 'https://buy.stripe.com/x?prefilled_email=ten%40example.com')
})

test('safeHttpsUrl: refuses everything that is not a plain https link', () => {
  const bad = [
    'http://buy.stripe.com/x',
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'ftp://example.com/x',
    '//buy.stripe.com/x',
    'buy.stripe.com/x',
    'https://',
    'https:///x',
    'https://user:pass@buy.stripe.com/x',
    'https://buy.stripe.com/x y',
    'https://buy.stripe.com/x\nHost: evil.example',
    'https://buy.stripe.com/\tx',
    'ten@example.com',
    '',
    '   ',
  ]
  for (const b of bad) assert.equal(safeHttpsUrl(b), null, JSON.stringify(b))
  assert.equal(safeHttpsUrl(null), null)
  assert.equal(safeHttpsUrl(undefined), null)
  assert.equal(safeHttpsUrl(`https://buy.stripe.com/${'a'.repeat(CARD_LINK_MAX_LENGTH)}`), null)
})

test('checkCardPaymentLink: empty clears the link, http is refused with a plain sentence', () => {
  assert.deepEqual(checkCardPaymentLink(''), { ok: true, value: '' })
  assert.deepEqual(checkCardPaymentLink('   '), { ok: true, value: '' })
  assert.deepEqual(checkCardPaymentLink(` ${STRIPE_LINK} `), { ok: true, value: STRIPE_LINK })
  const r = checkCardPaymentLink('http://buy.stripe.com/x')
  assert.equal(r.ok, false)
  assert.equal(r.ok === false && r.message, CARD_LINK_ERROR)
  assert.match(CARD_LINK_ERROR, /https:\/\//)
  assert.doesNotMatch(CARD_LINK_ERROR, /STRIPE_|regex|invalid url|TypeError/i)
})

// ---- Save: a refused link never overwrites the saved one -------------------

test('cardLinkForSave: a changed link that is not https is refused and nothing is saved', () => {
  const r = cardLinkForSave('http://buy.stripe.com/new', STRIPE_LINK)
  assert.deepEqual(r, { save: false, message: CARD_LINK_ERROR })
})

test('cardLinkForSave: turning a good link into javascript: is refused too', () => {
  assert.equal(cardLinkForSave('javascript:alert(1)', STRIPE_LINK).save, false)
})

test('cardLinkForSave: a valid link is saved trimmed; empty clears it', () => {
  assert.deepEqual(cardLinkForSave(` ${STRIPE_LINK}\n`, ''), { save: true, value: STRIPE_LINK })
  assert.deepEqual(cardLinkForSave('', STRIPE_LINK), { save: true, value: '' })
})

test('cardLinkForSave: an older non-https value left alone passes through, so other settings still save', () => {
  const legacy = 'http://old.example.com/checkout'
  assert.deepEqual(cardLinkForSave(legacy, legacy), { save: true, value: legacy })
  // ...but editing it to another bad value is still refused
  assert.equal(cardLinkForSave('http://other.example.com', legacy).save, false)
})

// ---- the booking page buttons ---------------------------------------------

test('buttons: a tutor with both PayPal and a card link shows both, PayPal first', () => {
  const m = buildPaymentMethods({ paypal_link: 'https://paypal.me/ten', paddle_checkout_link: STRIPE_LINK })
  assert.deepEqual(m.map(x => [x.key, x.label, x.link]), [
    ['paypal', 'Pay via PayPal', 'https://paypal.me/ten'],
    ['card', 'Pay by card', STRIPE_LINK],
  ])
})

test('buttons: card link only, PayPal only, neither', () => {
  assert.deepEqual(buildPaymentMethods({ paddle_checkout_link: STRIPE_LINK }).map(x => x.label), ['Pay by card'])
  assert.deepEqual(buildPaymentMethods({ paypal_link: 'ten' }).map(x => x.label), ['Pay via PayPal'])
  assert.deepEqual(buildPaymentMethods({ paypal_link: '', paddle_checkout_link: '' }), [])
  assert.deepEqual(buildPaymentMethods({ paypal_link: null, paddle_checkout_link: null }), [])
})

test('buttons: PayPal still builds a paypal.me link from a plain name or email', () => {
  assert.equal(paypalUrl('ten@example.com'), 'https://www.paypal.com/paypalme/ten@example.com'.replace('@', ''))
  assert.equal(paypalUrl('https://paypal.me/ten'), 'https://paypal.me/ten')
})

test('buttons: a stored link that is not https never becomes a button (even if written straight to the database)', () => {
  for (const bad of ['http://buy.stripe.com/x', 'javascript:alert(1)', 'data:text/html,x', 'https://u:p@buy.stripe.com/x']) {
    const m = buildPaymentMethods({ paypal_link: 'https://paypal.me/ten', paddle_checkout_link: bad })
    assert.deepEqual(m.map(x => x.key), ['paypal'], bad)
  }
})

test('built-in "Pay by Card" checkout: hidden when the tutor has their own link', () => {
  assert.equal(showBuiltInCardCheckout({ paddle_checkout_link: STRIPE_LINK }, 'lesson-1', 25, true), false)
  assert.equal(showBuiltInCardCheckout({}, 'lesson-1', 25, true), true)
  assert.equal(showBuiltInCardCheckout({ paddle_checkout_link: 'http://bad' }, 'lesson-1', 25, true), true)
  assert.equal(showBuiltInCardCheckout({}, null, 25, true), false)
  assert.equal(showBuiltInCardCheckout({}, 'lesson-1', 0, true), false)
})

test('built-in "Pay by Card" checkout: hidden whenever the platform Stripe is off', () => {
  assert.equal(showBuiltInCardCheckout({}, 'lesson-1', 25, false), false)
  assert.equal(showBuiltInCardCheckout({ paypal_link: 'ten' }, 'lesson-1', 25, false), false)
  assert.equal(showBuiltInCardCheckout({ paddle_checkout_link: STRIPE_LINK }, 'lesson-1', 25, false), false)
})

// ---- wording and wiring (source checks; the browser run covers the rendering) ----

test('booking page: every payment button opens in a new tab with noopener noreferrer', () => {
  const src = read('app/book/[slug]/BookingForm.tsx')
  const anchor = src.slice(src.indexOf('{methods.map(m => ('), src.indexOf('{showStripeCard && ('))
  assert.match(anchor, /<a key=\{m\.key\} href=\{m\.link\} target="_blank" rel="noopener noreferrer"/)
  assert.ok(!src.includes('Pay via Paddle'))
})

test('settings: new label and placeholder, same stored column, https check on save', () => {
  const src = read('app/(dashboard)/settings/page.tsx')
  assert.match(src, /Card payment link \(Stripe Payment Link\)/)
  assert.match(src, /placeholder="https:\/\/buy\.stripe\.com\/\.\.\."/)
  assert.ok(!src.includes('Paddle checkout link'))
  assert.match(src, /cardLinkForSave\(form\.paddle_checkout_link, savedLink\)/)
  assert.match(src, /paddle_checkout_link: linkCheck\.value/)
  assert.match(src, /\(stripeConnected \|\| stripeEnabled === true\) &&/)
})

test('every page that draws the booking form tells it whether platform Stripe is on (server side)', () => {
  for (const page of ['app/book/[slug]/page.tsx', 'app/book/[slug]/[member]/page.tsx', 'app/embed/[slug]/page.tsx']) {
    assert.ok(read(page).includes('cardCheckoutEnabled={isStripeEnabled()}'), page)
  }
  const form = read('app/book/[slug]/BookingForm.tsx')
  assert.match(form, /cardCheckoutEnabled = false/) // no flag, no built-in card button
  assert.ok(form.includes('showBuiltInCardCheckout(tutor, lessonId, price, cardCheckoutEnabled)'))
})

test('settings: warns when the saved card link is not usable (not https), using the same check as the booking page', () => {
  const src = read('app/(dashboard)/settings/page.tsx')
  assert.ok(src.includes("savedCardLinkUnusable = savedCardLink.trim() !== '' && safeHttpsUrl(savedCardLink) === null"))
  assert.match(src, /data-testid="card-link-saved-warning"/)
})
