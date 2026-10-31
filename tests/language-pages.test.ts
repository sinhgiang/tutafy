// T-0875: the language pages /learn/<language>. The REAL code runs here:
//   - the rule (src/lib/language-pages.ts): a page exists only for a language with a guide AND at least 3 tutors who can be booked, the 3 with most tutors;
//   - the guides themselves: own text for each language (no paragraph shared, compared by word groups), titles and descriptions within the search limits,
//     none of the words the brand voice bans, no address or number of a person;
//   - the real page over an in-memory database that holds made-up tutors with private fields in their rows: content, only that language's tutors, the
//     structured data, the 404 for a language with too few tutors, the error state, nothing private in the HTML;
//   - the sitemap, /llms-languages.txt and the links on /tutors, which all list the same pages.
// Nothing here reaches a service. All names, prices and times are made up.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import { LANGUAGE_GUIDES, NICHE_MAX_PAGES, NICHE_MIN_TUTORS, guideFor, guideByName, pickLanguagePages, tutorsOf } from '@/lib/language-pages.ts'
import { buildLlmsLanguagesTxt } from '@/lib/llms-languages.ts'
import { languagePageMetadata, DESCRIPTION_MAX, DESCRIPTION_MIN, TITLE_MAX, TITLE_MIN } from '@/lib/page-meta.ts'
import type { DirectoryCard } from '@/lib/directory.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

let db: FakeDb
let adminFails = false
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => {
      if (adminFails) throw new Error('Supabase admin client is not configured')
      return { from: (table: string) => { const q = db.from(table); return { select: (cols: string, o?: { head?: boolean }) => q.select(cols, o) } } }
    },
    createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: null } }) } }),
  },
})
mock.module('next/cache', { namedExports: { unstable_cache: (fn: (...a: unknown[]) => unknown) => fn } })
mock.module('next/navigation', { namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, useRouter: () => ({ push() {}, replace() {} }), useSearchParams: () => new URLSearchParams() } })

type PageProps = { params: Promise<{ language: string }> }
const langPage = (await import('@/app/learn/[language]/page.tsx')) as { default: (p: PageProps) => Promise<React.ReactElement>; generateMetadata: (p: PageProps) => Promise<Record<string, unknown>> }
const { resetDirectoryFallback } = await import('@/lib/directory-cache.ts') // the last good list stands in for a failed read (T-1144); each test starts without one
const directoryPage = (await import('@/app/tutors/(directory)/page.tsx')).default as (p: { searchParams: Promise<Record<string, string | string[] | undefined>> }) => Promise<React.ReactElement>
const sitemap = (await import('@/app/sitemap.ts')).default as () => Promise<{ url: string }[]>
const llmsRoute = await import('@/app/llms-languages.txt/route.ts')

const BIO = 'I teach languages to adults and children, one to one, with a plan for every lesson and clear homework.'
let seq = 0
function tutor(languages: string[], o: Record<string, unknown> = {}) {
  const n = ++seq
  const id = `t-${n}`
  const row = {
    id, slug: `tutor-${n}`, name: `Tutor Number${n}`, bio: BIO, avatar_url: null, languages, timezone: 'UTC', booking_url_active: true,
    average_rating: 0, review_count: 0, default_lesson_price: 20, currency: 'USD', trial_enabled: false, trial_price: null, buffer_minutes: 0,
    email: `private.tutor${n}@example.com`, phone: '0900 000 000', stripe_account_id: `acct_${n}`, payment_link: `https://pay.example.com/${n}`, ...o,
  }
  const avail = [0, 1, 2, 3, 4, 5, 6].map(d => ({ id: `a-${n}-${d}`, tutor_id: id, day_of_week: d, start_time: '00:00', end_time: '23:30' }))
  return { row, avail }
}
function seed(tutors: ReturnType<typeof tutor>[]) {
  db = createFakeDb({ tutors: tutors.map(t => t.row), availability: tutors.flatMap(t => t.avail), availability_exceptions: [], lessons: [] })
}
beforeEach(() => { seq = 0; adminFails = false; resetDirectoryFallback() })
const render = async (language: string) => renderToStaticMarkup(await langPage.default({ params: Promise.resolve({ language }) }))
const cardsIn = (h: string) => [...h.matchAll(/data-testid="tutor-card" data-slug="([^"]+)"/g)].map(m => m[1])
const jsonLd = (h: string) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1].replace(/\\u003c/g, '<')))

/** Eight English tutors (4 also Spanish), 3 French, 2 German: English and Spanish and French get a page, German does not. */
function standardSeed() {
  const ts = [
    ...Array.from({ length: 4 }, () => tutor(['English', 'Spanish'])),
    ...Array.from({ length: 4 }, () => tutor(['english'])),
    ...Array.from({ length: 3 }, () => tutor(['French'])),
    ...Array.from({ length: 2 }, () => tutor(['German'])),
  ]
  seed(ts)
  return ts
}

// ---- the rule --------------------------------------------------------------------------------------------------------------------------

function card(slug: string, languages: string[]): DirectoryCard {
  return { slug, name: slug, photo: null, languages, headline: 'A tutor.', rating: null, reviews: 0, price: 20, currency: 'USD', trialPrice: null, tz: 'UTC', levels: [], groups: [], complete: 0, slots: [1] }
}
const many = (n: number, languages: string[], prefix: string) => Array.from({ length: n }, (_, i) => card(`${prefix}${i}`, languages))

test('a language gets a page at 3 tutors and not at 2; the 3 with most tutors win, ties by name; a language with no guide never does', () => {
  assert.equal(NICHE_MIN_TUTORS, 3)
  assert.equal(NICHE_MAX_PAGES, 3)
  assert.deepEqual(pickLanguagePages(many(2, ['Spanish'], 's')), [], '2 is too few')
  assert.deepEqual(pickLanguagePages(many(3, ['Spanish'], 's')).map(p => p.guide.slug), ['spanish'])
  const cards = [...many(5, ['Spanish'], 'a'), ...many(4, ['French'], 'b'), ...many(4, ['German'], 'c'), ...many(4, ['Italian'], 'd'), ...many(9, ['Klingon'], 'e')]
  assert.deepEqual(pickLanguagePages(cards).map(p => `${p.guide.name}:${p.count}`), ['Spanish:5', 'French:4', 'German:4'], 'Italian ties with French and German and loses on the name; Klingon has no guide')
  assert.deepEqual(pickLanguagePages([]), [])
})

test('a tutor who lists a language twice or in another letter case counts once for it, and a tutor with two languages counts for both', () => {
  const cards = [card('a', ['Spanish', 'spanish', 'SPANISH', 'French']), card('b', ['spanish']), card('c', ['Spanish']), card('d', ['French']), card('e', ['French'])]
  const p = pickLanguagePages(cards)
  assert.deepEqual(p.map(x => `${x.guide.name}:${x.count}`), ['French:3', 'Spanish:3'])
  assert.deepEqual(tutorsOf(cards, guideByName('French')!).map(c => c.slug), ['a', 'd', 'e'])
})

// ---- the guides ------------------------------------------------------------------------------------------------------------------------

test('every guide has a safe address, a title and description within the search limits that name Tutafy and the language, and the parts a page draws', () => {
  const slugs = new Set<string>()
  for (const g of LANGUAGE_GUIDES) {
    assert.match(g.slug, /^[a-z]+$/, g.name)
    assert.ok(!slugs.has(g.slug), `${g.slug} is used twice`)
    slugs.add(g.slug)
    assert.equal(g.slug, g.name.toLowerCase())
    assert.ok(g.title.length >= TITLE_MIN && g.title.length <= TITLE_MAX, `${g.name} title is ${g.title.length}`)
    assert.ok(g.title.includes('Tutafy') && g.title.includes(g.name), `${g.name} title names the language and the brand`)
    assert.ok(g.description.length >= DESCRIPTION_MIN && g.description.length <= DESCRIPTION_MAX, `${g.name} description is ${g.description.length}`)
    assert.equal(g.choose.length, 4, g.name)
    assert.equal(g.faq.length, 4, g.name)
    assert.equal(g.goals.length, 4, g.name)
    assert.equal(g.learn.length, 2, g.name)
    assert.ok(guideFor(g.slug) === g && guideByName(g.name.toUpperCase()) === g)
    // the answer comes first: one to three sentences
    assert.ok(g.answer.split(/(?<=[.!?])\s+/).length <= 3, `${g.name} answer is longer than three sentences`)
    assert.ok(g.answer.includes('open times in the next 14 days') || g.answer.includes('book'), `${g.name} answer says what to do`)
  }
  assert.ok(LANGUAGE_GUIDES.length >= 6)
  assert.equal(new Set(LANGUAGE_GUIDES.map(g => g.title)).size, LANGUAGE_GUIDES.length)
  assert.equal(new Set(LANGUAGE_GUIDES.map(g => g.description)).size, LANGUAGE_GUIDES.length, 'descriptions are different')
})

const textOf = (g: (typeof LANGUAGE_GUIDES)[number]) => [g.answer, ...g.learn, ...g.choose.map(c => c.text), ...g.faq.map(f => f.a)]
const groups = (s: string, n = 6) => { const w = s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean); return new Set(Array.from({ length: Math.max(0, w.length - n + 1) }, (_, i) => w.slice(i, i + n).join(' '))) }

test('each guide is its own text: no paragraph, question or answer is shared between two languages, and word groups barely overlap', () => {
  for (const a of LANGUAGE_GUIDES) {
    for (const b of LANGUAGE_GUIDES) {
      if (a.slug >= b.slug) continue
      const sameQ = a.faq.filter(f => b.faq.some(g => g.q === f.q))
      assert.deepEqual(sameQ, [], `${a.name} and ${b.name} share a question`)
      for (const pa of textOf(a)) for (const pb of textOf(b)) assert.notEqual(pa, pb, `${a.name} and ${b.name} share a paragraph`)
      const ga = new Set(textOf(a).flatMap(t => [...groups(t)])), gb = new Set(textOf(b).flatMap(t => [...groups(t)]))
      const shared = [...ga].filter(x => gb.has(x))
      assert.ok(shared.length / Math.min(ga.size, gb.size) < 0.06, `${a.name} and ${b.name} share ${shared.length} word groups: ${shared.slice(0, 3).join(' | ')}`)
    }
  }
})

test('guides keep to the brand voice: none of the banned words, no exclamation mark, no address, phone number or price promise', () => {
  const banned = /revolutionary|unleash|seamless|elevate|supercharge|game-changer|cutting-edge|leverage|empower|unlock|streamline|effortless|next-level|world-class|best-in-class|robust|delve|transform your/i
  for (const g of LANGUAGE_GUIDES) {
    const all = [g.title, g.description, g.answer, ...g.learn, ...g.goals, ...g.choose.flatMap(c => [c.title, c.text]), ...g.faq.flatMap(f => [f.q, f.a])].join('\n')
    assert.ok(!banned.test(all), `${g.name}: ${banned.exec(all)?.[0]}`)
    assert.ok(!all.includes('!'), `${g.name} has an exclamation mark`)
    assert.ok(!/@|https?:\/\/|\d{3}[ -]\d{3}/.test(all), `${g.name} holds an address or a number`)
    assert.ok(!/guarantee|guaranteed|fluent in \d|in \d+ (days|weeks)/i.test(all), `${g.name} promises a result`)
    assert.ok(!/\$\d/.test(all), `${g.name} states a price`)
  }
})

test('the metadata is the guide\'s own and the canonical address is the page itself on the main site', () => {
  for (const g of LANGUAGE_GUIDES) {
    const m = languagePageMetadata(g) as { title: { absolute: string }; description: string; alternates: { canonical: string }; robots?: unknown }
    assert.equal(m.title.absolute, g.title)
    assert.equal(m.description, g.description)
    assert.equal(m.alternates.canonical, `https://www.tutafy.com/learn/${g.slug}`)
    assert.equal(m.robots, undefined, 'indexable')
  }
})

// ---- the page --------------------------------------------------------------------------------------------------------------------------

test('a language with enough tutors has its page: the answer first, only that language\'s tutors, a link to the filtered list, the guide in full', async () => {
  const ts = standardSeed()
  const h = await render('spanish')
  assert.match(h, /<h1[^>]*>Spanish tutors you can book today<\/h1>/)
  assert.ok(h.indexOf('data-testid="language-answer"') < h.indexOf('data-testid="language-grid"'), 'the answer comes before the list')
  assert.match(h, /To find a Spanish tutor/)
  assert.match(h, /4 tutors teach Spanish and have open times in the next 14 days/)
  assert.deepEqual(cardsIn(h).sort(), ts.slice(0, 4).map(t => t.row.slug as string).sort(), 'only the four tutors who teach Spanish')
  assert.match(h, /href="\/tutors\?lang=Spanish"/)
  assert.match(h, /href="\/tutors\?lang=Spanish&amp;level=beginner"/)
  assert.match(h, /How learning Spanish with a tutor works/)
  assert.match(h, /How to choose a Spanish tutor/)
  assert.match(h, /Questions about learning Spanish online/)
  assert.ok(h.includes('dir-page'), 'dark colours apply')
  const english = await render('english')
  assert.equal(cardsIn(english).length, 8, 'English: the 4 who also teach Spanish and the 4 who only teach English (any letter case)')
})

test('another language of the same site links across: the other languages that have a page, never one that does not', async () => {
  standardSeed()
  const h = await render('spanish')
  assert.match(h, /href="\/learn\/english"/)
  assert.match(h, /href="\/learn\/french"/)
  assert.ok(!h.includes('/learn/german'), 'German has 2 tutors: no page, no link')
})

test('a language with too few tutors, an unknown language and a closed directory are all a 404: no empty page', async () => {
  standardSeed()
  await assert.rejects(() => render('german'), /NEXT_NOT_FOUND/, '2 tutors')
  await assert.rejects(() => render('klingon'), /NEXT_NOT_FOUND/)
  await assert.rejects(() => render('..%2Fadmin'), /NEXT_NOT_FOUND/)
  await assert.rejects(() => render('Spanish'), /NEXT_NOT_FOUND/, 'the address is lower case')
  seed(Array.from({ length: 5 }, () => tutor(['Spanish'])))
  await assert.rejects(() => render('spanish'), /NEXT_NOT_FOUND/, 'under 6 listed tutors the directory is closed, so nothing is shown')
})

test('a tutor who cannot be booked (page off, no hours, short introduction) is never on a language page', async () => {
  const ts = [
    ...Array.from({ length: 6 }, () => tutor(['Spanish'])),
    tutor(['Spanish'], { name: 'PageOff Person', booking_url_active: false }), tutor(['Spanish'], { name: 'ShortBio Person', bio: 'Too short.' }),
  ]
  seed(ts)
  const h = await render('spanish')
  assert.equal(cardsIn(h).length, 6)
  assert.ok(!h.includes('PageOff') && !h.includes('ShortBio'))
})

test('a failed read is an error page kept out of search results, not a 404 and not an empty list', async () => {
  standardSeed()
  adminFails = true
  const h = await render('spanish')
  assert.match(h, /We could not load the Spanish tutors/)
  assert.match(h, /<meta name="robots" content="noindex"\/>/)
  assert.equal(cardsIn(h).length, 0)
})

test('the structured data says what the page says: a collection with the tutors drawn, a breadcrumb, and the same four questions as the page', async () => {
  standardSeed()
  const h = await render('spanish')
  const data = jsonLd(h)
  const types = data.map(d => d['@type']).sort()
  assert.deepEqual(types, ['BreadcrumbList', 'CollectionPage', 'FAQPage'])
  const collection = data.find(d => d['@type'] === 'CollectionPage')
  assert.equal(collection.url, 'https://www.tutafy.com/learn/spanish')
  assert.equal(collection.mainEntity.itemListElement.length, 4)
  const faq = data.find(d => d['@type'] === 'FAQPage')
  const guide = guideFor('spanish')!
  assert.deepEqual(faq.mainEntity.map((q: { name: string }) => q.name), guide.faq.map(f => f.q))
  for (const f of guide.faq) assert.ok(h.includes(f.q) && h.includes(f.a.replace(/'/g, '&#x27;')), `the page prints "${f.q}" and its answer`)
  assert.ok(!/[w.+-]+@[w-]+.[a-z]{2,}/i.test(JSON.stringify(data)), 'no email address in the data')
})

test('a visitor receives nothing private on a language page: no email, phone, payment field or tutor id', async () => {
  standardSeed()
  const h = await render('english')
  for (const leak of ['private.tutor', '@example.com', '0900 000 000', 'acct_', 'pay.example.com', 'levels_taught', 'booking_url_active', '"t-1"']) assert.ok(!h.includes(leak), `the page must not carry "${leak}"`)
})

test('the page reads the directory only: no write of any kind reaches the database', async () => {
  standardSeed()
  await render('spanish')
  assert.deepEqual(db.log.filter(l => l.op !== 'select'), [])
})

// ---- the other places that list the pages ------------------------------------------------------------------------------------------------

test('the sitemap lists exactly the pages that exist: the 3 languages with enough tutors, and not German', async () => {
  standardSeed()
  const urls = (await sitemap()).map(e => e.url).filter(u => u.includes('/learn/')).sort()
  assert.deepEqual(urls, ['https://www.tutafy.com/learn/english', 'https://www.tutafy.com/learn/french', 'https://www.tutafy.com/learn/spanish'])
  seed(Array.from({ length: 5 }, () => tutor(['Spanish'])))
  assert.deepEqual((await sitemap()).filter(e => e.url.includes('/learn/')), [], 'a closed directory lists no language page')
  adminFails = true
  assert.ok((await sitemap()).length > 5, 'a failed read leaves the other entries in place')
})

test('/llms-languages.txt lists the same pages, with their tutors by name and profile address only', async () => {
  const ts = standardSeed()
  const res = await llmsRoute.GET()
  assert.match(res.headers.get('content-type') ?? '', /text\/plain/)
  const body = await res.text()
  for (const slug of ['english', 'french', 'spanish']) assert.ok(body.includes(`https://www.tutafy.com/learn/${slug}`), slug)
  assert.ok(!body.includes('/learn/german'))
  assert.ok(body.includes(`https://www.tutafy.com/tutors/${ts[0].row.slug as string}`))
  for (const leak of ['private.tutor', '@', '0900 000 000', 'acct_']) assert.ok(!body.includes(leak), leak)
  seed(Array.from({ length: 5 }, () => tutor(['Spanish'])))
  assert.match(await (await llmsRoute.GET()).text(), /no language guide right now/)
  assert.match(buildLlmsLanguagesTxt([], [], null), /no language guide right now/)
})

test('/tutors links to the language pages that exist and to no other', async () => {
  standardSeed()
  const h = renderToStaticMarkup(await directoryPage({ searchParams: Promise.resolve({}) }))
  assert.match(h, /data-testid="language-links"/)
  assert.deepEqual([...h.matchAll(/href="\/learn\/([a-z]+)"/g)].map(m => m[1]).sort(), ['english', 'french', 'spanish'])
  seed(Array.from({ length: 5 }, () => tutor(['Spanish'])))
  assert.ok(!renderToStaticMarkup(await directoryPage({ searchParams: Promise.resolve({}) })).includes('/learn/'))
})
