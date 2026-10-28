// T-1032: the frame for tutor stories on /customers. The REAL code runs here:
//   - the rule (src/lib/testimonials.ts): an entry is drawn only with the tutor's written consent and clean text; anything else is left out, never repaired;
//   - the real page: honest and empty while the list is empty (no invented story), cards when it holds entries that pass the rule;
//   - the real list in the repository, which must be empty or hold only entries that pass the rule.
// The names, quotes and photos below are made up for the test and are NOT in the repository's list. Nothing here reaches a service.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { MAX_TESTIMONIALS, QUOTE_MAX, QUOTE_MIN, TESTIMONIALS, problemWith, publishable, type Testimonial } from '@/lib/testimonials.ts'
import { TestimonialCards } from '@/components/customers/TestimonialCards.tsx'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TODAY = new Date('2026-11-10T00:00:00Z')
const AT = '@' // joined into addresses below, so no line of this file reads as an email address (rule 4b)
const QUOTE = 'I used a notebook and three apps before. Now my students book themselves and I see my week in one place.'

const entry = (o: Partial<Testimonial> = {}): Testimonial => ({
  id: 'ana-example', name: 'Ana Example', role: 'English tutor, Lagos', quote: QUOTE,
  consent: { given: true, on: '2026-11-03', how: 'email reply kept by the owner' }, ...o,
})

// ---- the rule ----------------------------------------------------------------------------------------------------------------------------------

test('a complete entry with consent passes; the shape of a good one is the one docs/testimonials.md shows', () => {
  assert.equal(problemWith(entry(), TODAY), null)
  assert.equal(problemWith(entry({ tutorSlug: 'ana-example-ab12', photo: 'https://cdn.example.com/ana.jpg', facts: [{ label: 'Students', value: '14' }] }), TODAY), null)
})

test('NO CONSENT, NO CARD: a missing, false, undated, future-dated or unexplained consent is refused', () => {
  const noConsent = { ...entry() } as Partial<Testimonial>
  delete noConsent.consent
  assert.equal(problemWith(noConsent as Testimonial, TODAY), 'no consent')
  assert.equal(problemWith(entry({ consent: { given: false as never, on: '2026-11-03', how: 'email reply kept by the owner' } }), TODAY), 'no consent')
  assert.equal(problemWith(entry({ consent: { given: 'yes' as never, on: '2026-11-03', how: 'email reply kept by the owner' } }), TODAY), 'no consent')
  for (const on of ['', 'yesterday', '2026-13-45', '2026-11-11', '3 Nov 2026', undefined as never]) assert.equal(problemWith(entry({ consent: { given: true, on, how: 'email reply kept by the owner' } }), TODAY), 'consent date', String(on))
  for (const how of ['', 'ok', '   short  ', undefined as never]) assert.equal(problemWith(entry({ consent: { given: true, on: '2026-11-03', how } }), TODAY), 'consent how', String(how))
})

test('the name, the role and the quote must be plain text of a sensible size: an address, a phone number, a link, markup tricks or a quote that is too short or too long are refused', () => {
  for (const name of ['', 'A', 'x'.repeat(61), `Ana${AT}example.com`, 'Ana 0900 000 000']) assert.equal(problemWith(entry({ name }), TODAY), 'name', name)
  for (const role of ['', 'Tutr', 'x'.repeat(81), `write to me${AT}example.com`]) assert.equal(problemWith(entry({ role }), TODAY), 'role', role)
  const bad = ['', 'Too short.', 'x'.repeat(QUOTE_MAX + 1), `${QUOTE} Write to me at ana${AT}example.com`, `${QUOTE} Call 0900 000 000 now`, `${QUOTE} See https://evil.example`, `${QUOTE} See www.evil.example`]
  for (const quote of bad) assert.equal(problemWith(entry({ quote }), TODAY), 'quote', quote.slice(0, 40))
  assert.equal(problemWith(entry({ quote: 'x'.repeat(QUOTE_MIN) }), TODAY), null, 'the shortest allowed quote')
  assert.equal(problemWith(entry({ quote: 'x'.repeat(QUOTE_MIN - 1) }), TODAY), 'quote')
  assert.equal(problemWith(entry({ quote: 'x'.repeat(QUOTE_MAX) }), TODAY), null, 'the longest allowed quote')
})

test('an id, a profile address, a photo and the facts are checked too: only plain addresses, https photos, at most three short facts', () => {
  for (const id of ['', 'Ana', 'a b', '../x', 'x'.repeat(61), '-x']) assert.equal(problemWith(entry({ id }), TODAY), 'id', id)
  for (const tutorSlug of ['Ana Example', '../admin', 'a?x=1', 'ANA', '']) assert.equal(problemWith(entry({ tutorSlug }), TODAY), 'profile address', tutorSlug)
  for (const photo of ['http://cdn.example.com/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'https://user:pass@cdn.example.com/a.jpg', 'not a link', '']) assert.equal(problemWith(entry({ photo }), TODAY), 'photo', photo)
  assert.equal(problemWith(entry({ facts: [1, 2, 3, 4].map(n => ({ label: `L${n}`, value: `${n}` })) }), TODAY), 'facts')
  assert.equal(problemWith(entry({ facts: [{ label: '', value: '1' }] }), TODAY), 'facts')
  assert.equal(problemWith(entry({ facts: [{ label: 'x'.repeat(31), value: '1' }] }), TODAY), 'facts')
  assert.equal(problemWith(entry({ facts: 'Students: 14' as never }), TODAY), 'facts')
})

test('publishable() keeps the passing entries in order, once each, at most three, and drops every failing one instead of repairing it', () => {
  const good = (n: number) => entry({ id: `tutor-${n}`, name: `Tutor Number${n}` })
  const list = [good(1), entry({ id: 'no-consent', consent: undefined as never }), good(2), good(2), entry({ id: 'bad-quote', quote: 'short' }), good(3), good(4), good(5)]
  const out = publishable(list, TODAY)
  assert.deepEqual(out.map(t => t.id), ['tutor-1', 'tutor-2', 'tutor-3'])
  assert.equal(out.length, MAX_TESTIMONIALS)
  assert.deepEqual(publishable([], TODAY), [])
  assert.equal(publishable([entry({ name: '  Ana Example ', quote: `  ${QUOTE}  ` })], TODAY)[0].name, 'Ana Example', 'only spaces around the text are tidied')
})

// ---- the page ----------------------------------------------------------------------------------------------------------------------------------

test('the real list in the repository is empty or holds only entries that pass the rule: nothing slips onto the page without consent', () => {
  const problems = TESTIMONIALS.map(t => `${t.id}: ${problemWith(t)}`).filter(p => !p.endsWith(': null'))
  assert.deepEqual(problems, [])
  assert.ok(TESTIMONIALS.length <= MAX_TESTIMONIALS, 'at most three stories')
  assert.ok(TESTIMONIALS.every(t => t.consent.given === true))
})

test('the real /customers page says honestly that there are no stories yet while the list is empty, and invents none', async () => {
  const page = (await import('@/app/customers/page.tsx')).default as () => React.ReactElement
  const h = renderToStaticMarkup(page())
  if (TESTIMONIALS.length === 0) {
    assert.match(h, /data-testid="customers-empty"/)
    assert.match(h, /Your story could be the first/)
    assert.ok(!h.includes('data-testid="testimonials"'), 'no card at all')
    assert.ok(!h.includes('<blockquote'), 'no quotation')
  }
  assert.match(h, /<h1[^>]*>Tutors growing with Tutafy<\/h1>/)
  assert.match(h, /<main/)
})

test('cards draw name, role, quote, photo or initials, the facts and the date of the permission; the profile link only for a public address; everything as text', () => {
  const items = publishable([
    entry({ tutorSlug: 'ana-example-ab12', photo: 'https://cdn.example.com/ana.jpg', facts: [{ label: 'Students', value: '14' }, { label: 'Years teaching', value: '6' }] }),
    entry({ id: 'ben-no-photo', name: 'Ben Sample', role: 'Math tutor, Manila', quote: QUOTE.replace('notebook', 'spreadsheet') }),
  ], TODAY)
  const h = renderToStaticMarkup(TestimonialCards({ items }))
  assert.equal((h.match(/data-testid="testimonial"/g) ?? []).length, 2)
  assert.match(h, /Ana Example/)
  assert.match(h, /English tutor, Lagos/)
  assert.match(h, /src="https:\/\/cdn\.example\.com\/ana\.jpg"/)
  assert.match(h, /alt="Photo of Ana Example"/)
  assert.match(h, />BS</, 'a tutor with no photo gets initials')
  assert.match(h, /href="\/tutors\/ana-example-ab12"/)
  assert.equal((h.match(/data-testid="testimonial-profile"/g) ?? []).length, 1, 'only the tutor with a public profile is linked')
  assert.match(h, /Students/)
  assert.match(h, /Shared with Ana&#x27;s permission, November 3, 2026\./)
  assert.match(h, /id="ana-example"/)
  // text stays text
  const tricky = TestimonialCards({ items: [{ ...items[0], role: 'Tutor <b>bold</b> in Lagos', name: 'Ana <i>Example</i>' }] })
  const t = renderToStaticMarkup(tricky)
  assert.ok(!t.includes('<b>bold</b>') && !t.includes('<i>Example</i>'), 'markup in text is escaped')
})

test('no star rating and no Review markup on this page: a company\'s quotes about itself are not independent reviews', () => {
  const src = readFileSync(path.join(ROOT, 'src/app/customers/page.tsx'), 'utf8') + readFileSync(path.join(ROOT, 'src/components/customers/TestimonialCards.tsx'), 'utf8')
  assert.doesNotMatch(src, /"@type":\s*"Review"|'@type':\s*'Review'|aggregateRating|ratingValue|Star\b/)
  const doc = readFileSync(path.join(ROOT, 'docs/testimonials.md'), 'utf8')
  assert.match(doc, /No star ratings and no `Review` markup/)
})
