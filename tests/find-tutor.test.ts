// T-0897: "Find me a tutor" (/find-a-tutor), design option A of T-0864. The REAL page and the real picking code run here over an in-memory database that
// holds made-up tutors (some with an email, a phone number and a payment link in their row):
//   - the pick: at most three tutors, only tutors that fit every answer, in the directory's "Recommended" order; fewer than three says what to drop; none is an
//     explained state, never a blank page;
//   - the reasons printed for a tutor are true of that tutor (a language, a level, a time of day, a price range or a trial lesson is named only when it holds);
//   - only the public cards of the directory reach the page: nothing private, and a failed read is an error (noindex), never an empty list;
//   - the form is a plain GET form (it works without scripts), every answer is a real radio button or switch with a visible name, and the address is checked
//     like the directory's (an unknown value never gives a state, "Any" next to a chosen language does not hide the choice);
//   - the page tells search engines and assistants what it is (title, description, canonical, FAQPage data drawn from the printed questions).
// Nothing here reaches a service. All names, prices and times are made up.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const SRC = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'src')

let db: FakeDb
let adminFails = false
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => {
      if (adminFails) throw new Error('Supabase admin client is not configured')
      return { from: (table: string) => db.from(table) }
    },
    createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: null } }) } }),
  },
})
mock.module('next/cache', { namedExports: { unstable_cache: (fn: (...a: unknown[]) => unknown) => fn } })
mock.module('next/navigation', { namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, useRouter: () => ({ push() {}, replace() {} }), useSearchParams: () => new URLSearchParams() } })

const page = (await import('@/app/find-a-tutor/page.tsx')).default as (p: { searchParams: Promise<Record<string, string | string[] | undefined>> }) => Promise<React.ReactElement>
const find = await import('@/lib/find-tutor.ts')
const dir = await import('@/lib/directory.ts')
const { FIND_TUTOR_FAQ } = await import('@/lib/site-content.ts')
const { PAGE_SEO } = await import('@/lib/page-meta.ts')

const BIO = 'I teach English to adults and children, one to one, with a plan for every lesson and clear homework.'
let seq = 0

function tutor(o: Record<string, unknown> = {}) {
  const n = ++seq
  const id = `t-${n}`
  const row = {
    id, slug: `tutor-${n}`, name: `Tutor Number${n}`, bio: BIO, avatar_url: null, languages: ['English'], timezone: 'UTC', booking_url_active: true,
    average_rating: 0, review_count: 0, default_lesson_price: 20, currency: 'USD', trial_enabled: false, trial_price: null, buffer_minutes: 0,
    email: `private.tutor${n}@example.com`, phone: '0900 000 000', stripe_account_id: `acct_${n}`, payment_link: `https://pay.example.com/${n}`, paypal_link: 'paypal.me/someone', ...o,
  }
  const avail = [0, 1, 2, 3, 4, 5, 6].map(d => ({ id: `a-${n}-${d}`, tutor_id: id, day_of_week: d, start_time: '00:00', end_time: '23:30' }))
  return { row, avail }
}

function seed(tutors: ReturnType<typeof tutor>[]) {
  db = createFakeDb({ tutors: tutors.map(t => t.row), availability: tutors.flatMap(t => t.avail), availability_exceptions: [], lessons: [] })
}

/** Eight tutors: four Spanish (two with a trial lesson, one for beginners), three English, one French. */
function market() {
  seed([
    tutor({ name: 'Ana Torres', languages: ['Spanish'], default_lesson_price: 12, trial_enabled: true, trial_price: 5, average_rating: 4.9, review_count: 41, levels_taught: ['beginner'] }),
    tutor({ name: 'Ben Carter', languages: ['spanish', 'English'], default_lesson_price: 22, review_count: 3, average_rating: 4.5 }),
    tutor({ name: 'Chloe Martin', languages: ['Spanish'], default_lesson_price: 24, trial_enabled: true, trial_price: 8, levels_taught: ['beginner', 'intermediate'] }),
    tutor({ name: 'Daniel Weber', languages: ['Spanish'], default_lesson_price: 60 }),
    tutor({ name: 'Elena Rossi', languages: ['English'], default_lesson_price: 18 }),
    tutor({ name: 'Felix Braun', languages: ['English'], default_lesson_price: 28 }),
    tutor({ name: 'Grace Liu', languages: ['English'], default_lesson_price: 35 }),
    tutor({ name: 'Hugo Lambert', languages: ['French'], default_lesson_price: 30 }),
  ])
}

beforeEach(() => { adminFails = false; seq = 0 })

const html = async (searchParams: Record<string, string | string[] | undefined> = {}) => renderToStaticMarkup(await page({ searchParams: Promise.resolve(searchParams) }))
const picksIn = (h: string) => [...h.matchAll(/data-testid="find-pick" data-slug="([^"]+)"/g)].map(m => m[1])
/** The inputs of the page as attribute maps (a bare attribute such as checked reads as ""). */
const inputsOf = (h: string) => (h.match(/<input [^>]*>/g) ?? []).map(t => Object.fromEntries([...t.matchAll(/([a-z-]+)(?:="([^"]*)")?/g)].map(m => [m[1], m[2] ?? ''])))
const isChecked = (h: string, name: string, value: string) => inputsOf(h).some(i => i.name === name && i.value === value && 'checked' in i)
const text = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ')

// ---- the pick -------------------------------------------------------------------------------------------------------------------------

function card(o: Partial<import('@/lib/directory.ts').DirectoryCard> = {}): import('@/lib/directory.ts').DirectoryCard {
  const now = Date.now()
  return { slug: 'x', name: 'X Y', photo: null, languages: ['Spanish'], headline: 'Hi', rating: null, reviews: 0, price: 20, currency: 'USD', trialPrice: null, tz: 'UTC', levels: [], complete: 1, slots: [Math.floor(now / 60000) + 600], ...o }
}
const NOW = new Date()
const CTX = { zone: 'UTC' as string | null, now: NOW }

test('findTutors shows at most three tutors, only those that fit every answer, best first', () => {
  const cards = ['a', 'b', 'c', 'd', 'e'].map((s, i) => card({ slug: s, languages: [i === 4 ? 'French' : 'Spanish'], complete: i }))
  const all = find.findTutors(cards, find.formFilters(dir.NO_FILTERS), CTX)
  assert.equal(all.picks.length, 3)
  assert.equal(all.total, 5)
  const spanish = find.findTutors(cards, find.formFilters({ ...dir.NO_FILTERS, lang: 'Spanish' }), CTX)
  assert.ok(spanish.picks.every(c => c.languages.includes('Spanish')))
  assert.equal(spanish.total, 4)
  const french = find.findTutors(cards, find.formFilters({ ...dir.NO_FILTERS, lang: 'French' }), CTX)
  assert.deepEqual(french.picks.map(c => c.slug), ['e'])
  assert.ok(french.relax.length > 0 && french.relax[0].count > 1, 'one tutor fits: it says what to drop to get more')
})

test('findTutors with nobody matching gives no picks and what to drop', () => {
  const cards = [card({ slug: 'a', languages: ['Spanish'] })]
  const none = find.findTutors(cards, find.formFilters({ ...dir.NO_FILTERS, lang: 'German', trial: true }), CTX)
  assert.equal(none.picks.length, 0)
  assert.equal(none.total, 0)
  assert.ok(none.relax.length === 0 || none.relax.every(r => r.count > 0))
})

test('formFilters keeps only what the form asks: a search word, a day, "near me" or a sort in the address never applies silently', () => {
  const f = find.formFilters({ ...dir.NO_FILTERS, q: 'zzz', when: 'today', near: true, sort: 'price-low', lang: 'Spanish', level: 'beginner', price: 'up15', tod: 'evening', trial: true, tz: 'Europe/Madrid' })
  assert.deepEqual(f, { ...dir.NO_FILTERS, lang: 'Spanish', level: 'beginner', price: 'up15', tod: 'evening', trial: true, tz: 'Europe/Madrid' })
})

test('whyThisTutor names only what is true of the tutor, at most three reasons', () => {
  const c = card({ languages: ['Spanish', 'English'], levels: ['beginner'], trialPrice: 8, price: 22, rating: 4.9, reviews: 41 })
  const plain = find.whyThisTutor(c, find.formFilters(dir.NO_FILTERS), CTX)
  assert.ok(plain.length >= 1 && plain.length <= 3)
  assert.ok(plain.includes('Teaches Spanish and English'))
  assert.ok(plain.includes('30-minute trial for $8'))
  const asked = find.whyThisTutor(c, find.formFilters({ ...dir.NO_FILTERS, lang: 'Spanish', level: 'beginner', price: '15-30' }), CTX)
  assert.deepEqual(asked.slice(0, 3), ['Teaches Spanish', 'Teaches beginner students', '$22 a lesson, in your $15 to $30 range'])
  // a level the tutor did not choose is never claimed
  assert.ok(!find.whyThisTutor(card({ levels: [] }), find.formFilters({ ...dir.NO_FILTERS, level: 'advanced' }), CTX).some(w => /advanced/.test(w)))
  // no trial lesson, no trial sentence; no reviews, no rating sentence
  const bare = find.whyThisTutor(card({ trialPrice: null, rating: null, reviews: 0 }), find.formFilters(dir.NO_FILTERS), CTX)
  assert.ok(!bare.some(w => /Trial|Rated/.test(w)))
  // a time of day is claimed only when a free time really falls in it, in the visitor's zone
  const evening = Math.floor(Date.parse('2026-10-20T19:00:00Z') / 60000)
  const ctx = { zone: 'UTC', now: new Date('2026-10-20T08:00:00Z') }
  assert.ok(find.whyThisTutor(card({ slots: [evening] }), find.formFilters({ ...dir.NO_FILTERS, tod: 'evening' }), ctx).includes('Free this evening in your time'))
  assert.ok(!find.whyThisTutor(card({ slots: [evening] }), find.formFilters({ ...dir.NO_FILTERS, tod: 'morning' }), ctx).some(w => /Free this/.test(w)))
  assert.ok(!find.whyThisTutor(card({ slots: [evening] }), find.formFilters({ ...dir.NO_FILTERS, tod: 'evening' }), { zone: null, now: ctx.now }).some(w => /Free this/.test(w)), 'no zone known, no claim about "your time"')
})

// ---- the page -------------------------------------------------------------------------------------------------------------------------

test('the page shows the three best tutors for an empty form, each with reasons, a next free time, a price and a Book link', async () => {
  market()
  const h = await html()
  assert.equal(picksIn(h).length, 3)
  assert.match(h, /3 tutors you can book today/)
  for (const slug of picksIn(h)) {
    assert.match(h, new RegExp(`href="/book/${slug}"`))
    assert.match(h, new RegExp(`href="/tutors/${slug}"`))
  }
  assert.equal((h.match(/Why this tutor/g) ?? []).length, 3)
  assert.equal((h.match(/data-testid="find-next"/g) ?? []).length, 3)
  assert.match(h, /href="\/tutors"[^>]*data-testid="find-all"|data-testid="find-all"/)
})

test('an answer in the address narrows the tutors: Spanish, a beginner, up to $30', async () => {
  market()
  const h = await html({ lang: 'spanish', level: 'beginner', price: '15-30' })
  const slugs = picksIn(h)
  assert.deepEqual(slugs.length, 1, 'only Chloe Martin teaches Spanish to beginners at $24; Ana Torres is $12, under the range')
  assert.match(text(h), /Chloe Martin/)
  assert.match(h, /1 tutor you can book today/)
  assert.match(h, /data-testid="find-relax"/, 'fewer than three: it says what to drop')
  assert.match(text(h), /Teaches Spanish/)
  assert.match(text(h), /Teaches beginner students/)
  assert.ok(isChecked(h, 'lang', 'spanish'))
  assert.ok(isChecked(h, 'level', 'beginner'))
})

test('nobody fits: an explained state with a way back, not a blank page', async () => {
  market()
  const h = await html({ lang: 'french', trial: '1' })
  assert.deepEqual(picksIn(h), [])
  assert.match(h, /data-testid="find-nomatch"/)
  assert.match(text(h), /No tutor fits all your answers yet/)
  assert.match(text(h), /Start again/)
  assert.match(h, /href="\/tutors"/)
  assert.match(text(h), /removing/, 'it suggests what to drop')
})

test('under six listed tutors the finder is closed with a plain explanation and a link to the list; no tutor is drawn', async () => {
  seed([tutor({ name: 'Ana Torres' }), tutor({ name: 'Ben Carter' })])
  const h = await html()
  assert.deepEqual(picksIn(h), [])
  assert.match(h, /data-testid="find-closed"/)
  assert.match(text(h), /The tutor finder opens soon/)
  assert.doesNotMatch(h, /data-testid="find-form"/)
  assert.match(h, /href="\/tutors"/)
})

test('a failed read is an error with a retry link and noindex, never an empty finder', async () => {
  market()
  adminFails = true
  const h = await html({ lang: 'spanish' })
  assert.match(h, /data-testid="find-error"/)
  assert.match(h, /role="alert"/)
  assert.match(h, /<meta name="robots" content="noindex"\/>/)
  assert.match(h, /href="\/find-a-tutor\?lang=spanish"/, 'the answers are kept in the retry link')
  assert.deepEqual(picksIn(h), [])
})

test('nothing private reaches the page: no email, phone, payment or account value from the tutor rows', async () => {
  market()
  const h = await html()
  for (const leak of ['private.tutor', '@example.com', '0900 000 000', 'acct_', 'pay.example.com', 'paypal', 'stripe', '"email"', '"phone"']) assert.ok(!h.includes(leak), `the page must not carry "${leak}"`)
})

test('the form is a plain GET form with a real radio button for each answer, a name for every group and a switch for the trial lesson', async () => {
  market()
  const h = await html()
  assert.match(h, /<form [^>]*action="\/find-a-tutor"[^>]*method="get"/)
  for (const legend of ['I want to learn', 'My level', 'Price per lesson', 'When I can have lessons']) assert.match(h, new RegExp(`<legend[^>]*>${legend}</legend>`), legend)
  assert.equal((h.match(/<fieldset/g) ?? []).length, 4)
  // every input sits inside a label that has visible text, and the switch says what it is
  assert.ok(inputsOf(h).length >= 12)
  assert.ok(inputsOf(h).some(i => i.type === 'checkbox' && i.role === 'switch' && i.name === 'trial' && i.value === '1'))
  assert.equal(inputsOf(h).filter(i => i.type === 'radio').every(i => ['lang', 'level', 'price', 'tod'].includes(i.name)), true)
  assert.match(h, /Only tutors with a trial lesson/)
  assert.match(h, /<select [^>]*id="find-tz"[^>]*name="tz"|<select [^>]*name="tz"[^>]*id="find-tz"/)
  assert.match(h, /<label [^>]*for="find-tz"[^>]*>Show times in<\/label>/)
  assert.match(h, /data-testid="find-submit"[^>]*>Show my 3 tutors/)
  assert.equal((h.match(/<h1/g) ?? []).length, 1)
})

test('the address is read like the directory\'s: an unknown value gives no state; "Any" next to a chosen language does not hide the choice; search words are ignored', async () => {
  market()
  const odd = await html({ level: 'expert', price: 'free', tod: 'midnight', trial: 'yes', q: 'Ana', sort: 'rating', when: 'today', near: '1' })
  assert.equal(picksIn(odd).length, 3, 'a search word, a day, "near me" and a sort are not asked here, so they change nothing')
  assert.ok(isChecked(odd, 'lang', '') && isChecked(odd, 'level', '') && isChecked(odd, 'price', '') && isChecked(odd, 'tod', ''), 'an unknown level, price or time of day is "Any"')
  assert.ok(!inputsOf(odd).some(i => i.name === 'trial' && 'checked' in i), 'trial is on only for 1')
  // a language nobody teaches is a plain "no tutor fits", and what was typed is never written into the page as markup
  const alien = await html({ lang: '<script>alert(1)</script>' })
  assert.deepEqual(picksIn(alien), [])
  assert.match(alien, /data-testid="find-nomatch"/)
  assert.doesNotMatch(alien, /<script>alert/)
  const both = await html({ lang: ['', 'french'] })
  assert.deepEqual(picksIn(both).length, 1)
  assert.match(text(both), /Hugo Lambert/)
})

test('the page says what it is: title, description, canonical, structured data and a real FAQ drawn from one list', async () => {
  market()
  const h = await html()
  const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1].replace(/\\u003c/g, '<')))
  const faq = ld.find(d => d['@type'] === 'FAQPage')
  assert.ok(faq, 'FAQPage data')
  assert.deepEqual(faq.mainEntity.map((q: { name: string }) => q.name), FIND_TUTOR_FAQ.map(f => f.q))
  for (const f of FIND_TUTOR_FAQ) assert.ok(text(h).includes(f.q.replace(/’/g, "'")), f.q)
  assert.ok(ld.some(d => d['@type'] === 'CollectionPage' && d.url === 'https://www.tutafy.com/find-a-tutor'))
  assert.ok(ld.some(d => d['@type'] === 'BreadcrumbList'))
  assert.equal(PAGE_SEO.findTutor.path, '/find-a-tutor')
  assert.ok(PAGE_SEO.findTutor.title.length >= 20 && PAGE_SEO.findTutor.title.length <= 60)
  assert.ok(PAGE_SEO.findTutor.description.length >= 70 && PAGE_SEO.findTutor.description.length <= 155)
  assert.match(text(h), /Answer a few questions and we show you the 3 tutors who fit best/)
})

// ---- the dark colour scheme -----------------------------------------------------------------------------------------------------------

test('in the dark scheme a chosen answer keeps its solid fill: white text on it is at least 4.5 to 1 and the fill stands out from the card by 3 to 1', async () => {
  const { readFileSync } = await import('node:fs')
  const css = readFileSync(path.join(SRC, 'styles/directory-dark.css'), 'utf8').replace(/\r\n/g, '\n')
  const v = (name: string) => css.split(`--${name}:`)[1].trim().slice(1, 7)
  const rgb = (hex: string) => [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16))
  const lum = (c: number[]) => { const f = (x: number) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]) }
  const ratio = (a: string, b: string) => { const [hi, lo] = [lum(rgb(a)), lum(rgb(b))].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
  assert.ok(ratio(v('dir-chosen-ink'), v('dir-chosen')) >= 4.5, `white on the chosen fill: ${ratio(v('dir-chosen-ink'), v('dir-chosen')).toFixed(2)}`)
  assert.ok(ratio(v('dir-chosen'), v('dir-surface')) >= 3, `the chosen fill on the card: ${ratio(v('dir-chosen'), v('dir-surface')).toFixed(2)}`)
  assert.match(css, /\.dir-page input\.peer:checked \+ span \{[^}]*var\(--dir-chosen\)/)
})
