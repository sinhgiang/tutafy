// T-1033: "Learning for" (the kinds of student a tutor likes to teach), the price range, and the niche pages /learn/<language>/<group>. The REAL code runs here:
//   - the rules (src/lib/tutor-groups.ts, src/lib/directory.ts): what an address may carry, the round trip address <-> filters, the group and the range as filters;
//   - the niche rule (src/lib/niche-pages.ts): a page needs a guide written for the pair AND 3 tutors who can be booked, who teach the language and ticked the group;
//   - the guides themselves: own text for each pair, titles and descriptions within the search limits, none of the words the brand voice bans;
//   - the real page over an in-memory database that holds made-up tutors with private fields in their rows: content, only that pair's tutors, the structured
//     data, the 404 for a pair with too few tutors / no guide / a closed directory, the error state, nothing private in the HTML;
//   - the sitemap, /llms-languages.txt and the language page, which all list the same niche pages;
//   - the real /tutors page filtered by group and range, and the Settings save of the groups;
//   - migration 029 on a throwaway Postgres (PGlite): applies twice, one column, the check, a second tutor cannot write the first one's row;
//   - the directory read on a database WITHOUT the column (the code goes live before the migration).
// Nothing here reaches a service. All names, prices and times are made up.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import type { PGlite } from '@electric-sql/pglite'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import { applyMigrationsBefore, newDb, readMigration, migrationFiles } from './support/local-db.ts'
import { pgliteClient } from './support/pglite-client.ts'
import { saveTutorSettings, GROUPS_NOT_AVAILABLE, LEVELS_AND_GROUPS_NOT_AVAILABLE, type SettingsForm } from '@/lib/settings-save.ts'
import { loadDirectory } from '@/lib/directory-data.ts'
import { GROUP_OPTIONS, cleanGroups, groupOfSlug } from '@/lib/tutor-groups.ts'
import {
  CARD_KEYS, NO_FILTERS, MAX_RANGE_USD, activeFilters, applyFilters, buildCard, filterLabel, filtersToQuery, groupCounts, parseDollars, parseFilters, relaxations,
  withoutFilter, type DirectoryCard, type Filters,
} from '@/lib/directory.ts'
import {
  PAIR_GUIDES, PAIR_MAX_PAGES, PAIR_MIN_TUTORS, groupLabelOf, pairGuideFor, pairGuidePath, pickPairPages, tutorsOfPair,
} from '@/lib/niche-pages.ts'
import { buildLlmsLanguagesTxt } from '@/lib/llms-languages.ts'
import { pairPageMetadata, DESCRIPTION_MAX, DESCRIPTION_MIN, TITLE_MAX, TITLE_MIN } from '@/lib/page-meta.ts'

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

type PairProps = { params: Promise<{ language: string; group: string }> }
const nichePage = (await import('@/app/learn/[language]/[group]/page.tsx')) as { default: (p: PairProps) => Promise<React.ReactElement>; generateMetadata: (p: PairProps) => Promise<Record<string, unknown>> }
const { resetDirectoryFallback } = await import('@/lib/directory-cache.ts') // the last good list stands in for a failed read (T-1144); each test starts without one
const langPage = (await import('@/app/learn/[language]/page.tsx')).default as (p: { params: Promise<{ language: string }> }) => Promise<React.ReactElement>
const directoryPage = (await import('@/app/tutors/(directory)/page.tsx')).default as (p: { searchParams: Promise<Record<string, string | string[] | undefined>> }) => Promise<React.ReactElement>
const sitemap = (await import('@/app/sitemap.ts')).default as () => Promise<{ url: string }[]>
const llmsRoute = await import('@/app/llms-languages.txt/route.ts')

const BIO = 'I teach languages to adults and children, one to one, with a plan for every lesson and clear homework.'
let seq = 0
function tutor(languages: string[], groups: string[], o: Record<string, unknown> = {}) {
  const n = ++seq
  const id = `t-${n}`
  const row = {
    id, slug: `tutor-${n}`, name: `Tutor Number${n}`, bio: BIO, avatar_url: null, languages, timezone: 'UTC', booking_url_active: true,
    average_rating: 0, review_count: 0, default_lesson_price: 20, currency: 'USD', trial_enabled: false, trial_price: null, buffer_minutes: 0,
    learning_groups: groups,
    email: `private.tutor${n}@example.com`, phone: '0900 000 000', stripe_account_id: `acct_${n}`, payment_link: `https://pay.example.com/${n}`, ...o,
  }
  const avail = [0, 1, 2, 3, 4, 5, 6].map(d => ({ id: `a-${n}-${d}`, tutor_id: id, day_of_week: d, start_time: '00:00', end_time: '23:30' }))
  return { row, avail }
}
function seed(tutors: ReturnType<typeof tutor>[]) {
  db = createFakeDb({ tutors: tutors.map(t => t.row), availability: tutors.flatMap(t => t.avail), availability_exceptions: [], lessons: [] })
}
beforeEach(() => { seq = 0; adminFails = false; resetDirectoryFallback() })
const render = async (language: string, group: string) => renderToStaticMarkup(await nichePage.default({ params: Promise.resolve({ language, group }) }))
const cardsIn = (h: string) => [...h.matchAll(/data-testid="tutor-card" data-slug="([^"]+)"/g)].map(m => m[1])
const jsonLd = (h: string) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1].replace(/\\u003c/g, '<')))

/**
 * 4 tutors teach English for work (2 of them also Spanish for travel), 3 teach English for exams, 2 teach Spanish for travel, 3 teach French for work
 * (French has no guide for work), and 2 have ticked nothing. English for work and English for exams get a page; Spanish for travel has 2 + 2 = 4 tutors: it does too.
 */
function standardSeed() {
  const ts = [
    tutor(['English', 'Spanish'], ['work', 'travel']), tutor(['english', 'Spanish'], ['work', 'travel']), tutor(['English'], ['work']), tutor(['English'], ['work', 'exams']),
    tutor(['English'], ['exams']), tutor(['English'], ['exams']),
    tutor(['Spanish'], ['travel']), tutor(['Spanish'], ['travel']),
    tutor(['French'], ['work']), tutor(['French'], ['work']), tutor(['French'], ['work']),
    tutor(['English'], []), tutor(['Spanish'], []),
  ]
  seed(ts)
  return ts
}

// ---- the groups and the filters ---------------------------------------------------------------------------------------------------------

test('the six groups: ids, labels and address parts are fixed, each once; cleanGroups keeps known ids in order and drops everything else', () => {
  assert.deepEqual(GROUP_OPTIONS.map(o => o.id), ['work', 'exams', 'kids', 'travel', 'university', 'conversation'])
  assert.equal(new Set(GROUP_OPTIONS.map(o => o.slug)).size, 6)
  for (const o of GROUP_OPTIONS) assert.match(o.slug, /^[a-z]+(-[a-z]+)*$/, o.slug)
  assert.deepEqual(cleanGroups(['travel', 'WORK', 'wizard', 'work', 3, null, ' exams ']), ['work', 'exams', 'travel'])
  assert.deepEqual(cleanGroups('work'), [])
  assert.deepEqual(cleanGroups(undefined), [])
  assert.equal(groupOfSlug('working-professionals'), 'work')
  assert.equal(groupOfSlug('work'), null, 'the address uses the slug, not the id')
})

test('the group and the price range in the address: only fixed values or whole dollars are accepted, the order of a swapped range is fixed, nothing else gets in', () => {
  assert.equal(parseFilters({ for: 'work' }).group, 'work')
  assert.equal(parseFilters({ for: 'wizard' }).group, null)
  assert.equal(parseFilters({ for: ['exams', 'work'] }).group, 'exams', 'the first value of a repeated key')
  assert.deepEqual([parseFilters({ min: '10', max: '40' }).min, parseFilters({ min: '10', max: '40' }).max], [10, 40])
  assert.deepEqual([parseFilters({ min: '40', max: '10' }).min, parseFilters({ min: '40', max: '10' }).max], [10, 40], 'a swapped range is put right')
  for (const bad of ['-5', '3.5', '1e3', 'abc', '', ' ', '0x10', '10; drop', '99999', '<script>']) {
    const f = parseFilters({ min: bad })
    assert.ok(f.min === null || (Number.isInteger(f.min) && f.min >= 0 && f.min <= MAX_RANGE_USD), `min=${bad} gave ${f.min}`)
  }
  assert.equal(parseDollars('99999'), null, 'five digits are not a price')
  assert.equal(parseDollars('9999'), MAX_RANGE_USD, 'a very high price is cut to the highest one')
  assert.equal(parseDollars('0'), 0)
  assert.equal(parseDollars(' 25 '), 25)
  assert.deepEqual(parseFilters({ for: 'work', min: '5' }), { ...NO_FILTERS, group: 'work', min: 5 })
})

test('the address and the filters are one thing for the new filters too: filtersToQuery then parseFilters gives the same filters back', () => {
  const f: Filters = { ...NO_FILTERS, lang: 'English', group: 'exams', min: 10, max: 30, level: 'advanced', trial: true }
  const query = filtersToQuery(f)
  assert.match(query, /for=exams/)
  assert.match(query, /min=10/)
  assert.match(query, /max=30/)
  const back = parseFilters(Object.fromEntries(new URLSearchParams(query)))
  assert.deepEqual(back, f)
  assert.equal(filtersToQuery(NO_FILTERS), '')
  assert.equal(filtersToQuery({ ...NO_FILTERS, max: 0 }), '?max=0', 'a ceiling of zero dollars is still a filter')
})

function cards(): DirectoryCard[] {
  const base = { photo: null, headline: 'A tutor.', rating: null, reviews: 0, currency: 'USD', trialPrice: null, tz: 'UTC', levels: [], complete: 0, slots: [Math.floor(Date.parse('2026-11-02T10:00:00Z') / 60000)], established: false, video: false }
  return [
    { ...base, slug: 'a', name: 'A', languages: ['English'], price: 10, groups: ['work'] },
    { ...base, slug: 'b', name: 'B', languages: ['English'], price: 25, groups: ['work', 'exams'] },
    { ...base, slug: 'c', name: 'C', languages: ['Spanish'], price: 40, groups: ['travel'] },
    { ...base, slug: 'd', name: 'D', languages: ['Spanish'], price: null, groups: [] },
    { ...base, slug: 'e', name: 'E', languages: ['French'], price: 2000, currency: 'JPY', groups: ['exams'] },
  ] as DirectoryCard[]
}
const ctx = { zone: 'UTC', now: new Date('2026-11-01T00:00:00Z') }
const slugsOf = (f: Partial<Filters>) => applyFilters(cards(), { ...NO_FILTERS, ...f }, ctx).map(c => c.slug)

test('"Learning for" keeps the tutors who ticked the group; a tutor who ticked nothing is never matched', () => {
  assert.deepEqual(slugsOf({ group: 'work' }), ['a', 'b'])
  assert.deepEqual(slugsOf({ group: 'exams' }), ['b', 'e'])
  assert.deepEqual(slugsOf({ group: 'travel' }), ['c'])
  assert.deepEqual(slugsOf({ group: 'kids' }), [])
  assert.deepEqual(slugsOf({ group: 'work', lang: 'English', min: 20 }), ['b'], 'it combines with language and range')
  assert.deepEqual(groupCounts(cards()).map(g => `${g.group}:${g.count}`), ['work:2', 'exams:2', 'travel:1'], 'only groups somebody ticked, with how many')
})

test('the price range is in approximate dollars, both ends included, either end optional; a tutor with no price is never matched by a range', () => {
  // prices in dollars: a 10, b 25, c 40, d none, e 2000 yen (about 13.4)
  assert.deepEqual(slugsOf({ min: 10, max: 25 }), ['a', 'b', 'e'], 'the end points count, and yen are converted')
  assert.deepEqual(slugsOf({ min: 26 }), ['c'])
  assert.deepEqual(slugsOf({ max: 12 }), ['a'])
  assert.deepEqual(slugsOf({ max: 0 }), [], 'nobody teaches for nothing, and "Ask for price" is not zero')
  assert.deepEqual(slugsOf({ min: 0 }), ['a', 'b', 'c', 'e'], 'a tutor with no price is left out of any range')
  assert.deepEqual(slugsOf({ min: 10, max: 25, price: 'up15' }), ['a', 'e'], 'the ready-made price groups still work beside it, and both apply')
})

test('the new filters are labelled, listed as active, removable one at a time, and offered back when they empty the list', () => {
  const f: Filters = { ...NO_FILTERS, group: 'work', min: 20 }
  assert.deepEqual(activeFilters(f), ['group', 'range'])
  assert.equal(filterLabel(f, 'group'), 'Work and career')
  assert.equal(filterLabel(f, 'range'), 'From $20')
  assert.equal(filterLabel({ ...NO_FILTERS, max: 30 }, 'range'), 'Up to $30')
  assert.equal(filterLabel({ ...NO_FILTERS, min: 10, max: 30 }, 'range'), '$10 to $30')
  assert.deepEqual(withoutFilter(f, 'range'), { ...NO_FILTERS, group: 'work' })
  assert.deepEqual(withoutFilter(f, 'group'), { ...NO_FILTERS, min: 20 })
  assert.deepEqual(slugsOf(f), ['b'])
  const relax = relaxations(cards(), f, ctx)
  assert.deepEqual(relax.map(r => `${r.key}:${r.count}`), ['group:2', 'range:2'], 'one tutor matches now; dropping either filter gives two')
})

// ---- the rule for a niche page --------------------------------------------------------------------------------------------------------------

function card(slug: string, languages: string[], groups: DirectoryCard['groups']): DirectoryCard {
  return { slug, name: slug, photo: null, languages, headline: 'A tutor.', rating: null, reviews: 0, price: 20, currency: 'USD', trialPrice: null, tz: 'UTC', levels: [], groups, complete: 0, slots: [1], established: false, video: false }
}
const many = (n: number, languages: string[], groups: DirectoryCard['groups'], prefix: string) => Array.from({ length: n }, (_, i) => card(`${prefix}${i}`, languages, groups))

test('a niche page needs 3 tutors who teach the language AND ticked the group, and a guide written for that pair; the 3 with most tutors win', () => {
  assert.equal(PAIR_MIN_TUTORS, 3)
  assert.equal(PAIR_MAX_PAGES, 3)
  assert.deepEqual(pickPairPages(many(2, ['English'], ['work'], 'a')), [], '2 is too few')
  assert.deepEqual(pickPairPages(many(3, ['English'], ['work'], 'a')).map(p => pairGuidePath(p.guide)), ['/learn/english/working-professionals'])
  assert.deepEqual(pickPairPages([...many(5, ['English'], [], 'n'), ...many(5, ['Spanish'], [], 'm')]), [], 'a language alone, without a ticked group, makes no niche page')
  assert.deepEqual(pickPairPages(many(9, ['French'], ['work'], 'f')), [], 'French for work has no guide: however many tutors, no page')
  assert.deepEqual(pickPairPages(many(4, ['English'], ['kids'], 'k')), [], 'English for kids has no guide')
  assert.deepEqual(pickPairPages([...many(2, ['English'], ['work'], 'w'), ...many(2, ['Spanish'], ['work'], 's')]), [], 'tutors are counted per pair, not added across')
  const three = pickPairPages([...many(4, ['English'], ['work'], 'w'), ...many(3, ['English'], ['exams'], 'e'), ...many(5, ['Spanish'], ['travel'], 's')])
  assert.deepEqual(three.map(p => `${p.guide.language}:${p.guide.group}:${p.count}`), ['Spanish:travel:5', 'English:work:4', 'English:exams:3'])
  assert.deepEqual(pickPairPages([]), [])
})

test('a tutor counts once for a pair however the language is spelt or the group listed, and a tutor with two languages and two groups counts for each pair', () => {
  const cs = [card('a', ['English', 'english', 'ENGLISH', 'Spanish'], ['work', 'travel']), card('b', ['english'], ['work']), card('c', ['English'], ['work']), card('d', ['Spanish'], ['travel']), card('e', ['spanish'], ['travel'])]
  const pages = pickPairPages(cs)
  assert.deepEqual(pages.map(p => `${p.guide.language}:${p.guide.group}:${p.count}`), ['English:work:3', 'Spanish:travel:3'])
  assert.deepEqual(tutorsOfPair(cs, pairGuideFor('spanish', 'travel')!).map(c => c.slug), ['a', 'd', 'e'])
})

// ---- the guides ---------------------------------------------------------------------------------------------------------------------------

test('every guide has a safe address, a title and description within the search limits that name Tutafy and the language, and the parts a page draws', () => {
  const addresses = new Set<string>()
  for (const g of PAIR_GUIDES) {
    const where = `${g.language}/${g.group}`
    assert.match(pairGuidePath(g), /^\/learn\/[a-z]+\/[a-z]+(-[a-z]+)*$/, where)
    assert.ok(!addresses.has(pairGuidePath(g)), `${where} is used twice`)
    addresses.add(pairGuidePath(g))
    assert.equal(g.languageSlug, g.language.toLowerCase())
    assert.ok(GROUP_OPTIONS.some(o => o.id === g.group), where)
    assert.ok(pairGuideFor(g.languageSlug, GROUP_OPTIONS.find(o => o.id === g.group)!.slug) === g)
    assert.ok(g.title.length >= TITLE_MIN && g.title.length <= TITLE_MAX, `${where} title is ${g.title.length}`)
    assert.ok(g.title.includes('Tutafy') && g.title.includes(g.language), `${where} title names the language and the brand`)
    assert.ok(g.description.length >= DESCRIPTION_MIN && g.description.length <= DESCRIPTION_MAX, `${where} description is ${g.description.length}`)
    assert.equal(g.situations.length, 4, where)
    assert.equal(g.plan.length, 4, where)
    assert.equal(g.choose.length, 4, where)
    assert.equal(g.faq.length, 4, where)
    for (const s of g.situations) assert.ok(s.sample.length >= 15 && s.text.length >= 80, `${where}: ${s.title} is thin`)
    assert.ok(g.answer.split(/(?<=[.!?])\s+/).length <= 3, `${where} answer is longer than three sentences`)
    assert.ok(g.answer.includes('open times in the next 14 days') && g.answer.includes('book'), `${where} answer says what to do`)
  }
  assert.ok(PAIR_GUIDES.length >= 3)
  assert.equal(new Set(PAIR_GUIDES.map(g => g.title)).size, PAIR_GUIDES.length)
  assert.equal(new Set(PAIR_GUIDES.map(g => g.description)).size, PAIR_GUIDES.length, 'descriptions are different')
  assert.equal(pairGuideFor('english', 'work'), undefined, 'the address uses the slug of the group, not its id')
  assert.equal(pairGuideFor('french', 'working-professionals'), undefined)
})

const textOf = (g: (typeof PAIR_GUIDES)[number]) => [g.answer, ...g.situations.flatMap(s => [s.text, s.sample]), ...g.plan.map(p => p.text), ...g.choose.map(c => c.text), ...g.faq.map(f => f.a)]
const groupsOfWords = (s: string, n = 6) => { const w = s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean); return new Set(Array.from({ length: Math.max(0, w.length - n + 1) }, (_, i) => w.slice(i, i + n).join(' '))) }

test('each guide is its own text: no paragraph, question or answer is shared between two pages, and word groups barely overlap', () => {
  for (const a of PAIR_GUIDES) {
    for (const b of PAIR_GUIDES) {
      if (pairGuidePath(a) >= pairGuidePath(b)) continue
      const names = `${pairGuidePath(a)} and ${pairGuidePath(b)}`
      assert.deepEqual(a.faq.filter(f => b.faq.some(g => g.q === f.q)), [], `${names} share a question`)
      assert.deepEqual(a.choose.filter(c => b.choose.some(d => d.title === c.title)), [], `${names} share a step title`)
      for (const pa of textOf(a)) for (const pb of textOf(b)) assert.notEqual(pa, pb, `${names} share a paragraph`)
      const ga = new Set(textOf(a).flatMap(t => [...groupsOfWords(t)])), gb = new Set(textOf(b).flatMap(t => [...groupsOfWords(t)]))
      const shared = [...ga].filter(x => gb.has(x))
      assert.ok(shared.length / Math.min(ga.size, gb.size) < 0.06, `${names} share ${shared.length} word groups: ${shared.slice(0, 3).join(' | ')}`)
    }
  }
})

test('guides keep to the brand voice: none of the banned words, no exclamation mark, no address, phone number, price or promise of a result', () => {
  const banned = /revolutionary|unleash|seamless|elevate|supercharge|game-changer|cutting-edge|leverage|empower|unlock|streamline|effortless|next-level|world-class|best-in-class|robust|delve|transform your/i
  for (const g of PAIR_GUIDES) {
    const all = [g.title, g.description, g.answer, ...g.situations.flatMap(s => [s.title, s.text, s.sample]), ...g.plan.flatMap(p => [p.weeks, p.text]), ...g.choose.flatMap(c => [c.title, c.text]), ...g.faq.flatMap(f => [f.q, f.a])].join('\n')
    const where = `${g.language}/${g.group}`
    assert.ok(!banned.test(all), `${where}: ${banned.exec(all)?.[0]}`)
    assert.ok(!all.includes('!'), `${where} has an exclamation mark`)
    assert.ok(!/@|https?:\/\/|\d{3}[ -]\d{3}/.test(all), `${where} holds an address or a number`)
    assert.ok(!/guarantee|guaranteed|fluent in \d|in \d+ (days|weeks)|band \d|score of \d/i.test(all), `${where} promises a result`)
    assert.ok(!/\$\d/.test(all), `${where} states a price`)
  }
})

test('the metadata is the guide\'s own and the canonical address is the page itself on the main site', async () => {
  for (const g of PAIR_GUIDES) {
    const m = pairPageMetadata(g) as { title: { absolute: string }; description: string; alternates: { canonical: string }; robots?: unknown }
    assert.equal(m.title.absolute, g.title)
    assert.equal(m.description, g.description)
    assert.equal(m.alternates.canonical, `https://www.tutafy.com${pairGuidePath(g)}`)
    assert.equal(m.robots, undefined, 'indexable')
  }
  const real = await nichePage.generateMetadata({ params: Promise.resolve({ language: 'english', group: 'working-professionals' }) }) as { title: { absolute: string } }
  assert.equal(real.title.absolute, pairGuideFor('english', 'working-professionals')!.title)
  const none = await nichePage.generateMetadata({ params: Promise.resolve({ language: 'english', group: 'nothing' }) }) as { robots: { index: boolean } }
  assert.equal(none.robots.index, false, 'an unknown pair is kept out of search results')
})

// ---- the page --------------------------------------------------------------------------------------------------------------------------

test('a pair with enough tutors has its page: the answer first, only that pair\'s tutors, a link to the filtered list, the whole guide', async () => {
  const ts = standardSeed()
  const h = await render('english', 'working-professionals')
  const guide = pairGuideFor('english', 'working-professionals')!
  assert.match(h, /<h1[^>]*>English Tutors for Working Professionals<\/h1>/)
  assert.ok(h.indexOf('data-testid="niche-answer"') < h.indexOf('data-testid="niche-grid"'), 'the answer comes before the list')
  assert.ok(h.includes(guide.answer))
  assert.match(h, /4 tutors teach English for work and career and have open times in the next 14 days/)
  assert.deepEqual(cardsIn(h).sort(), ts.slice(0, 4).map(t => t.row.slug as string).sort(), 'only the four tutors who teach English and ticked work: not the exams-only ones, not French, not those who ticked nothing')
  assert.match(h, /href="\/tutors\?lang=English&amp;for=work"/)
  assert.match(h, /href="\/tutors\?lang=English&amp;for=work&amp;level=beginner"/)
  for (const s of guide.situations) assert.ok(h.includes(s.title) && h.includes(s.sample), `the situation "${s.title}" is printed with its sentence`)
  for (const p of guide.plan) assert.ok(h.includes(p.weeks), p.weeks)
  for (const c of guide.choose) assert.ok(h.includes(c.title), c.title)
  assert.match(h, /What you actually practise/)
  assert.match(h, /A plan you can follow with your tutor/)
  assert.ok(h.includes('dir-page'), 'dark colours apply')
  assert.match(h, /<main/)
})

test('the breadcrumb and the related links go to the pages that exist and to no other', async () => {
  standardSeed()
  const h = await render('english', 'working-professionals')
  assert.match(h, /href="\/learn\/english"/, 'the language page of the pair exists, so it is linked')
  assert.match(h, /href="\/learn\/english\/exam-preparation"/)
  assert.match(h, /href="\/learn\/spanish\/travel"/)
  assert.ok(!h.includes('/learn/french'), 'French has 3 tutors but no guide for work: no link')
})

test('a pair with too few tutors, a pair with no guide, an unknown address and a closed directory are all a 404: no empty page', async () => {
  standardSeed()
  await assert.rejects(() => render('french', 'working-professionals'), /NEXT_NOT_FOUND/, 'French for work has 3 tutors but no guide')
  await assert.rejects(() => render('english', 'kids-and-teens'), /NEXT_NOT_FOUND/, 'a real group, no guide')
  await assert.rejects(() => render('english', 'work'), /NEXT_NOT_FOUND/, 'the address uses the slug')
  await assert.rejects(() => render('klingon', 'travel'), /NEXT_NOT_FOUND/)
  await assert.rejects(() => render('english', '..%2Fadmin'), /NEXT_NOT_FOUND/)
  await assert.rejects(() => render('English', 'working-professionals'), /NEXT_NOT_FOUND/, 'the address is lower case')
  seed([...Array.from({ length: 2 }, () => tutor(['English'], ['work'])), ...Array.from({ length: 5 }, () => tutor(['English'], []))])
  await assert.rejects(() => render('english', 'working-professionals'), /NEXT_NOT_FOUND/, 'only 2 tutors ticked work')
  seed(Array.from({ length: 5 }, () => tutor(['English'], ['work'])))
  await assert.rejects(() => render('english', 'working-professionals'), /NEXT_NOT_FOUND/, 'under 6 listed tutors the directory is closed, so nothing is shown')
})

test('a tutor who cannot be booked (page off, short introduction) is never on a niche page, even with the group ticked', async () => {
  seed([
    ...Array.from({ length: 6 }, () => tutor(['English'], ['work'])),
    tutor(['English'], ['work'], { name: 'PageOff Person', booking_url_active: false }), tutor(['English'], ['work'], { name: 'ShortBio Person', bio: 'Too short.' }),
  ])
  const h = await render('english', 'working-professionals')
  assert.equal(cardsIn(h).length, 6)
  assert.ok(!h.includes('PageOff') && !h.includes('ShortBio'))
})

test('a failed read is an error page kept out of search results, not a 404 and not an empty list', async () => {
  standardSeed()
  adminFails = true
  const h = await render('english', 'working-professionals')
  assert.match(h, /We could not load these tutors/)
  assert.match(h, /<meta name="robots" content="noindex"\/>/)
  assert.equal(cardsIn(h).length, 0)
})

test('the structured data says what the page says: a collection with the tutors drawn, a breadcrumb, and the same four questions as the page', async () => {
  standardSeed()
  const h = await render('english', 'exam-preparation')
  const data = jsonLd(h)
  assert.deepEqual(data.map(d => d['@type']).sort(), ['BreadcrumbList', 'CollectionPage', 'FAQPage'])
  const collection = data.find(d => d['@type'] === 'CollectionPage')
  assert.equal(collection.url, 'https://www.tutafy.com/learn/english/exam-preparation')
  assert.equal(collection.mainEntity.itemListElement.length, 3)
  const faq = data.find(d => d['@type'] === 'FAQPage')
  const guide = pairGuideFor('english', 'exam-preparation')!
  assert.deepEqual(faq.mainEntity.map((q: { name: string }) => q.name), guide.faq.map(f => f.q))
  for (const f of guide.faq) assert.ok(h.includes(f.q) && h.includes(f.a.replace(/'/g, '&#x27;')), `the page prints "${f.q}" and its answer`)
  assert.ok(!/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(JSON.stringify(data)), 'no email address in the data')
})

test('a visitor receives nothing private on a niche page: no email, phone, payment field, tutor id or the stored list of groups', async () => {
  standardSeed()
  const h = await render('english', 'working-professionals')
  for (const leak of ['private.tutor', '@example.com', '0900 000 000', 'acct_', 'pay.example.com', 'learning_groups', 'levels_taught', 'booking_url_active', '"t-1"']) assert.ok(!h.includes(leak), `the page must not carry "${leak}"`)
})

test('the page reads the directory only: no write of any kind reaches the database', async () => {
  standardSeed()
  await render('english', 'working-professionals')
  await langPage({ params: Promise.resolve({ language: 'english' }) })
  assert.deepEqual(db.log.filter(l => l.op !== 'select'), [])
})

// ---- the other places that list the pages ------------------------------------------------------------------------------------------------

test('the language page links to its own niche pages and to no other', async () => {
  standardSeed()
  const english = renderToStaticMarkup(await langPage({ params: Promise.resolve({ language: 'english' }) }))
  assert.match(english, /data-testid="language-niches"/)
  assert.deepEqual([...english.matchAll(/href="\/learn\/english\/([a-z-]+)"/g)].map(m => m[1]).sort(), ['exam-preparation', 'working-professionals'])
  const spanish = renderToStaticMarkup(await langPage({ params: Promise.resolve({ language: 'spanish' }) }))
  assert.deepEqual([...spanish.matchAll(/href="\/learn\/spanish\/([a-z-]+)"/g)].map(m => m[1]), ['travel'])
  seed(Array.from({ length: 6 }, () => tutor(['English'], [])))
  assert.ok(!renderToStaticMarkup(await langPage({ params: Promise.resolve({ language: 'english' }) })).includes('language-niches'), 'no tutor ticked a group: no section')
})

test('the sitemap lists exactly the niche pages that exist, and /llms-languages.txt lists the same ones with their tutors by name and profile address only', async () => {
  const ts = standardSeed()
  const urls = (await sitemap()).map(e => e.url).filter(u => /\/learn\/[a-z]+\/[a-z-]+$/.test(u)).sort()
  assert.deepEqual(urls, ['https://www.tutafy.com/learn/english/exam-preparation', 'https://www.tutafy.com/learn/english/working-professionals', 'https://www.tutafy.com/learn/spanish/travel'])
  const body = await (await llmsRoute.GET()).text()
  for (const u of urls) assert.ok(body.includes(u), u)
  assert.ok(body.includes('## Guides for a specific reason'))
  assert.ok(!body.includes('/learn/french/'), 'French has a language page but no niche page: 3 tutors ticked work, and there is no guide for that pair')
  assert.ok(body.includes(`https://www.tutafy.com/tutors/${ts[0].row.slug as string}`))
  for (const leak of ['private.tutor', '@', '0900 000 000', 'acct_']) assert.ok(!body.includes(leak), leak)
  seed(Array.from({ length: 5 }, () => tutor(['English'], ['work'])))
  assert.deepEqual((await sitemap()).filter(e => /\/learn\/[a-z]+\/[a-z-]+$/.test(e.url)), [], 'a closed directory lists no niche page')
  assert.match(buildLlmsLanguagesTxt([], [], null), /no language guide right now/)
  assert.ok(!buildLlmsLanguagesTxt([{ guide: { name: 'English', slug: 'english', description: 'd', answer: 'a' } as never, count: 3 }], many(3, ['English'], ['work'], 'x'), null).includes('specific reason'), 'no niche section without niche pages')
})

// ---- the directory filtered by group and range ------------------------------------------------------------------------------------------

const cardSlugs = (h: string) => [...h.matchAll(/data-slug="([^"]+)"/g)].map(m => m[1])

test('/tutors with ?for= and ?min=&max= shows the filtered list in the HTML itself, the kind of student on each card, and the chips for the active filters', async () => {
  const ts = [
    ...Array.from({ length: 3 }, (_, i) => tutor(['English'], ['work'], { name: `Work Teacher ${i}`, default_lesson_price: 10 + i * 5 })),
    ...Array.from({ length: 3 }, (_, i) => tutor(['English'], ['exams', 'travel'], { name: `Exam Teacher ${i}`, default_lesson_price: 30 + i * 10 })),
    tutor(['Spanish'], [], { name: 'Silent One', default_lesson_price: 20 }),
  ]
  seed(ts)
  const all = renderToStaticMarkup(await directoryPage({ searchParams: Promise.resolve({}) }))
  assert.equal(cardSlugs(all).length, 7)
  const work = renderToStaticMarkup(await directoryPage({ searchParams: Promise.resolve({ for: 'work' }) }))
  assert.deepEqual(cardSlugs(work).sort(), ts.slice(0, 3).map(t => t.row.slug as string).sort())
  assert.match(work, /data-testid="card-groups"/)
  assert.match(work, /Work and career/)
  const ranged = renderToStaticMarkup(await directoryPage({ searchParams: Promise.resolve({ min: '15', max: '30' }) }))
  assert.deepEqual(cardSlugs(ranged).sort(), [ts[1], ts[2], ts[3], ts[6]].map(t => t.row.slug as string).sort(), '15 to 30 dollars: the 15 and 20 and the 30 teachers, and the Spanish one at 20')
  const both = renderToStaticMarkup(await directoryPage({ searchParams: Promise.resolve({ for: 'exams', min: '35' }) }))
  assert.deepEqual(cardSlugs(both).sort(), [ts[4], ts[5]].map(t => t.row.slug as string).sort())
  const none = renderToStaticMarkup(await directoryPage({ searchParams: Promise.resolve({ for: 'kids' }) }))
  assert.equal(cardSlugs(none).length, 0)
  assert.match(none, /No tutors match these filters/)
  const made = renderToStaticMarkup(await directoryPage({ searchParams: Promise.resolve({ for: '<script>', min: 'abc', max: '-4' }) }))
  assert.equal(cardSlugs(made).length, 7, 'a made-up address gives the plain list')
  assert.ok(!made.includes('<script>alert'))
})

test('a visitor to /tutors receives no private field with the new filters either', async () => {
  standardSeed()
  const h = renderToStaticMarkup(await directoryPage({ searchParams: Promise.resolve({ for: 'work', min: '5' }) }))
  for (const leak of ['private.tutor', '@example.com', '0900 000 000', 'acct_', 'pay.example.com', 'learning_groups', 'booking_url_active']) assert.ok(!h.includes(leak), `the page must not carry "${leak}"`)
})

// ---- the card ---------------------------------------------------------------------------------------------------------------------------

const SOURCE = {
  slug: 'maya', name: 'Maya', bio: BIO, avatar_url: null, languages: ['English'], timezone: 'UTC', average_rating: 0, review_count: 0,
  default_lesson_price: 20, currency: 'USD', trial_enabled: false, trial_price: null, learning_groups: ['travel', 'wizard', 'work', 'work'],
}
const SLOT = [{ at: '2026-11-02T14:00:00Z', label: '', zone: 'UTC' } as never]

test('the card carries the groups as ids from the fixed list, each once, in the list\'s order, and nothing else of the row; a source without the field means "said nothing"', () => {
  const c = buildCard(SOURCE as never, SLOT)!
  assert.deepEqual(c.groups, ['work', 'travel'])
  assert.deepEqual(Object.keys(c).sort(), [...CARD_KEYS].sort())
  assert.ok(CARD_KEYS.includes('groups' as never))
  assert.deepEqual(buildCard({ ...SOURCE, learning_groups: undefined } as never, SLOT)!.groups, [])
  assert.deepEqual(buildCard({ ...SOURCE, learning_groups: 'work' } as never, SLOT)!.groups, [])
  assert.equal(groupLabelOf('exams'), 'Exams')
})

// ---- the database ----------------------------------------------------------------------------------------------------------------------

const FILE = '029_tutor_learning_groups.sql'
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

async function freshDb(applyIt = true): Promise<PGlite> {
  const d = await newDb()
  await applyMigrationsBefore(d, FILE)
  await d.exec(`
    insert into auth.users (id, email) values ('${A}', 'a@example.com'), ('${B}', 'b@example.com');
    insert into public.tutors (id, email, name, slug, bio, timezone, languages, booking_url_active, buffer_minutes) values
      ('${A}', 'a@example.com', 'Tutor A', 'tutor-a', '${BIO}', 'UTC', array['English'], true, 0), ('${B}', 'b@example.com', 'Tutor B', 'tutor-b', '${BIO}', 'UTC', array['English'], true, 0);
    insert into public.availability (tutor_id, day_of_week, start_time, end_time) select t.id, d, '00:00', '23:30' from public.tutors t cross join generate_series(0, 6) d;
  `)
  if (applyIt) await d.exec(readMigration(FILE))
  return d
}
async function asUser<T>(d: PGlite, userId: string | null, role: 'authenticated' | 'anon', fn: () => Promise<T>): Promise<T> {
  await d.exec(`select set_config('request.jwt.claim.sub', '${userId ?? ''}', false); set role ${role}`)
  try { return await fn() } finally { await d.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`) }
}
const groupsOf = async (d: PGlite, id: string) => (await d.query<{ learning_groups: string[] }>(`select learning_groups from public.tutors where id = '${id}'`)).rows[0].learning_groups

test('migration 029 exists once, applies twice, adds one column that starts empty for every tutor, and changes nothing else', async () => {
  assert.deepEqual(migrationFiles().filter(f => f.startsWith('029_')), [FILE])
  const d = await freshDb(false)
  const cols = async () => (await d.query(`select table_name, column_name from information_schema.columns where table_schema = 'public' order by 1, 2`)).rows
  const before = await cols()
  await d.exec(readMigration(FILE))
  await d.exec(readMigration(FILE))
  const added = (await cols()).filter(c => !before.some(b => JSON.stringify(b) === JSON.stringify(c)))
  assert.deepEqual(added, [{ table_name: 'tutors', column_name: 'learning_groups' }])
  assert.deepEqual(await groupsOf(d, A), [])
  assert.ok((await d.query(`select policyname from pg_policies where tablename = 'tutors'`)).rows.length > 0)
})

test('the database refuses a group that is not one of the six, a repeat, a null, a different letter case and a seventh entry', async () => {
  const d = await freshDb()
  await d.exec(`update public.tutors set learning_groups = array['work','travel'] where id = '${A}'`)
  assert.deepEqual(await groupsOf(d, A), ['work', 'travel'])
  await d.exec(`update public.tutors set learning_groups = array['work','exams','kids','travel','university','conversation'] where id = '${A}'`)
  assert.equal((await groupsOf(d, A)).length, 6, 'all six together are allowed')
  await d.exec(`update public.tutors set learning_groups = array['work','travel'] where id = '${A}'`)
  for (const bad of [`array['business']`, `array['work','work']`, `array['work','exams','kids','travel','university','conversation','work']`, `array['Work']`, 'null', `array[null]::text[]`]) {
    await assert.rejects(d.exec(`update public.tutors set learning_groups = ${bad} where id = '${A}'`), (e: unknown) => (e as { code?: string }).code === '23514' || (e as { code?: string }).code === '23502', bad)
  }
  assert.deepEqual(await groupsOf(d, A), ['work', 'travel'], 'a refused write changed nothing')
})

test('the second-person test: a tutor writes the groups on their own row, never on another tutor\'s; a signed-out caller writes and reads nothing', async () => {
  const d = await freshDb()
  await asUser(d, A, 'authenticated', () => d.exec(`update public.tutors set learning_groups = array['work'] where id = '${A}'`))
  assert.deepEqual(await groupsOf(d, A), ['work'])
  await asUser(d, A, 'authenticated', () => d.exec(`update public.tutors set learning_groups = array['exams'] where id = '${B}'`))
  assert.deepEqual(await groupsOf(d, B), [], 'A could not touch B\'s row')
  await asUser(d, B, 'authenticated', () => d.exec(`update public.tutors set learning_groups = array['exams'] where id = '${A}'`))
  assert.deepEqual(await groupsOf(d, A), ['work'], 'and B cannot write A\'s row either')
  const denied = (e: unknown) => (e as { code?: string }).code === '42501'
  await assert.rejects(asUser(d, null, 'anon', () => d.exec(`update public.tutors set learning_groups = array['exams'] where id = '${B}'`)), denied, 'a signed-out caller may not write')
  assert.deepEqual(await groupsOf(d, B), [], 'a signed-out caller changed nothing')
  await assert.rejects(asUser(d, null, 'anon', () => d.query(`select learning_groups from public.tutors`)), denied, 'and reads no tutor row (migration 025 stays closed)')
})

test('the directory reads the groups on its own and carries only the ids; on a database without the column it lists the same tutors with no groups', async () => {
  const d = await freshDb()
  await d.exec(`alter table public.lessons add column if not exists assigned_to uuid;
    alter table public.tutors add column if not exists trial_enabled boolean default false;
    alter table public.tutors add column if not exists trial_price decimal(10,2);
    alter table public.tutors add column if not exists currency text default 'USD';
    alter table public.tutors add column if not exists average_rating decimal(3,2) default 0;
    alter table public.tutors add column if not exists review_count integer default 0;`)
  for (let i = 0; i < 5; i++) {
    const id = `3000000${i}-0000-4000-8000-000000000000`
    await d.exec(`insert into auth.users (id, email) values ('${id}', 'x${i}@example.com');
      insert into public.tutors (id, email, name, slug, bio, timezone, languages, booking_url_active, buffer_minutes) values ('${id}', 'x${i}@example.com', 'Extra ${i}', 'extra-${i}', '${BIO}', 'UTC', array['English'], true, 0);
      insert into public.availability (tutor_id, day_of_week, start_time, end_time) select '${id}', d, '00:00', '23:30' from generate_series(0, 6) d;`)
  }
  await d.exec(`update public.tutors set learning_groups = array['travel','work'] where id = '${A}'`)
  const client = () => pgliteClient(d, { restStyle: true }) as never
  const withColumn = await loadDirectory(client(), new Date())
  assert.equal(withColumn.cards.find(c => c.slug === 'tutor-a')?.groups.join(), 'work,travel')
  assert.deepEqual(withColumn.cards.find(c => c.slug === 'tutor-b')?.groups, [])
  for (const c of withColumn.cards) assert.deepEqual(Object.keys(c).sort(), [...CARD_KEYS].sort())
  await d.exec('alter table public.tutors drop column learning_groups')
  const without = await loadDirectory(client(), new Date())
  assert.equal(without.cards.length, withColumn.cards.length, 'the directory still lists everybody')
  assert.ok(without.cards.every(c => c.groups.length === 0))
})

// ---- Settings: the tutor ticks the kinds of student -------------------------------------------------------------------------------------

const FORM: SettingsForm = {
  name: 'Maya', bio: BIO, timezone: 'UTC', cancellation_hours: 24, booking_url_active: true, buffer_minutes: 15, paypal_link: '', paddle_checkout_link: '',
  default_lesson_price: '20', contract_template: '', trial_enabled: false, trial_price: '', currency: 'USD', lesson_durations: [30, 60], default_lesson_duration: 60,
  hide_branding: false, levels_taught: [], learning_groups: [],
}
type Write = { values: Record<string, unknown>; id: string }
function settingsDb(failOn: string[] = []) {
  const writes: Write[] = []
  return {
    writes,
    db: { from: () => ({ update: (values: Record<string, unknown>) => ({ eq: async (_c: string, id: string) => {
      writes.push({ values, id })
      const bad = failOn.find(k => k in values)
      return { error: bad ? { message: `column "${bad}" does not exist`, code: '42703' } : null }
    } }) }) },
  }
}

test('Settings saves the groups apart from the main update, only when they changed, cleaned, on the signed-in tutor\'s own row', async () => {
  const s = settingsDb()
  const saved = JSON.stringify(FORM)
  const res = await saveTutorSettings(s.db, 'tutor-1', { ...FORM, learning_groups: ['travel', 'business', 'work', 'work'] }, saved, '')
  assert.equal(res.ok, true)
  assert.ok(!('learning_groups' in s.writes[0].values), 'the main update does not carry it (its column may not exist yet)')
  const gw = s.writes.filter(w => 'learning_groups' in w.values)
  assert.equal(gw.length, 1)
  assert.deepEqual(gw[0].values, { learning_groups: ['work', 'travel'] }, 'only known ids, in the list\'s order, none twice, and nothing else in the same update')
  assert.equal(gw[0].id, 'tutor-1')
  const again = settingsDb()
  await saveTutorSettings(again.db, 'tutor-1', { ...FORM, learning_groups: ['work'] }, JSON.stringify({ ...FORM, learning_groups: ['work'] }), '')
  assert.ok(!again.writes.some(w => 'learning_groups' in w.values), 'unchanged groups are not written again')
})

test('a database without the column loses nothing else: the other settings are saved and the message says only the groups did not go in', async () => {
  const s = settingsDb(['learning_groups'])
  const res = await saveTutorSettings(s.db, 'tutor-1', { ...FORM, name: 'New Name', learning_groups: ['work'] }, JSON.stringify(FORM), '')
  assert.equal(res.ok, false)
  assert.ok(!res.ok && res.stage === 'optional')
  assert.ok(!res.ok && res.message === GROUPS_NOT_AVAILABLE)
  assert.equal(s.writes[0].values.name, 'New Name', 'the main update went through')
  assert.deepEqual(JSON.parse(res.snapshot).learning_groups, [], 'the unsaved-changes bar stays: nothing was written')
  const both = settingsDb(['learning_groups', 'levels_taught'])
  const r2 = await saveTutorSettings(both.db, 'tutor-1', { ...FORM, learning_groups: ['work'], levels_taught: ['beginner'] }, JSON.stringify(FORM), '')
  assert.ok(!r2.ok && r2.message === LEVELS_AND_GROUPS_NOT_AVAILABLE)
})
