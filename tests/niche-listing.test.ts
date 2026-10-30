// T-1006 (the two small pieces left after T-1033): /tutors lists the niche pages, and /find-a-tutor asks "What it is for" with the directory's own ?for= filter.
// The REAL pages and the real picking code run here over an in-memory database of made-up tutors (some with an email, a phone number and a payment link in their
// row, to prove none of it reaches a page). They prove:
//   - /tutors links exactly the niche pages that exist right now (the same rule as the sitemap and the language pages), each link opens a real page, and nothing
//     is linked while no pair has enough tutors;
//   - /find-a-tutor asks the new question only when a tutor who can be booked has said who they like to teach (or the address already carries it), reads ?for=
//     from the fixed list (anything else is "Any"), picks only tutors who ticked that group, says why in a true sentence, and offers to drop the answer when
//     too few fit;
//   - what the form did before is unchanged (the other answers, the way an address is read, no private field).
// Nothing here reaches a service. All names, prices and times are made up.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const SRC = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'src')

let db: FakeDb
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => ({ from: (table: string) => db.from(table) }),
    createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: null } }) } }),
  },
})
mock.module('next/cache', { namedExports: { unstable_cache: (fn: (...a: unknown[]) => unknown) => fn } })
mock.module('next/navigation', { namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, useRouter: () => ({ push() {}, replace() {} }), useSearchParams: () => new URLSearchParams() } })

type Params = Record<string, string | string[] | undefined>
const tutorsPage = (await import('@/app/tutors/(directory)/page.tsx')).default as (p: { searchParams: Promise<Params> }) => Promise<React.ReactElement>
const findPage = (await import('@/app/find-a-tutor/page.tsx')).default as (p: { searchParams: Promise<Params> }) => Promise<React.ReactElement>
const nichePage = (await import('@/app/learn/[language]/[group]/page.tsx')).default as (p: { params: Promise<{ language: string; group: string }> }) => Promise<React.ReactElement>
const find = await import('@/lib/find-tutor.ts')
const dir = await import('@/lib/directory.ts')
const { FIND_TUTOR_FAQ } = await import('@/lib/site-content.ts')
const { GROUP_OPTIONS } = await import('@/lib/tutor-groups.ts')

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
beforeEach(() => { seq = 0 })

/** 4 tutors teach English for work (2 of them also Spanish for travel), 3 English for exams, 2 Spanish for travel, 3 French for work (no guide), 2 ticked nothing. */
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

const tutorsHtml = async (searchParams: Params = {}) => renderToStaticMarkup(await tutorsPage({ searchParams: Promise.resolve(searchParams) }))
const findHtml = async (searchParams: Params = {}) => renderToStaticMarkup(await findPage({ searchParams: Promise.resolve(searchParams) }))
const picksIn = (h: string) => [...h.matchAll(/data-testid="find-pick" data-slug="([^"]+)"/g)].map(m => m[1])
const inputsOf = (h: string) => (h.match(/<input [^>]*>/g) ?? []).map(t => Object.fromEntries([...t.matchAll(/([a-z-]+)(?:="([^"]*)")?/g)].map(m => [m[1], m[2] ?? ''])))
const isChecked = (h: string, name: string, value: string) => inputsOf(h).some(i => i.name === name && i.value === value && 'checked' in i)
const nicheNav = (h: string) => /<nav[^>]*data-testid="niche-links"[\s\S]*?<\/nav>/.exec(h)?.[0] ?? ''
const hrefsIn = (h: string) => [...h.matchAll(/href="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&'))

// ---- 1. /tutors lists the niche pages --------------------------------------------------------------------------------------------------------

test('/tutors links the niche pages that exist, most tutors first, with the tutor count; each link opens a real page and a pair without a page is not linked', async () => {
  standardSeed()
  const nav = nicheNav(await tutorsHtml())
  assert.ok(nav, 'the list is there')
  assert.match(nav, /<h2[^>]*>Browse tutors by reason for learning<\/h2>/)
  assert.deepEqual(hrefsIn(nav), ['/learn/english/working-professionals', '/learn/spanish/travel', '/learn/english/exam-preparation'], 'English for work 4, Spanish for travel 4, English for exams 3')
  assert.match(nav, />English for work and career <span[^>]*>4</)
  assert.match(nav, />Spanish for travel <span[^>]*>4</)
  assert.match(nav, />English for exams <span[^>]*>3</)
  assert.doesNotMatch(nav, /French/, 'three French tutors ticked work, but no guide is written for that pair')
  // every linked address is a page, not a 404
  for (const href of hrefsIn(nav)) {
    const [, , language, group] = href.split('/')
    const h = renderToStaticMarkup(await nichePage({ params: Promise.resolve({ language, group }) }))
    assert.match(h, /<h1/, href)
  }
  // the language list is still there beside it
  assert.match(await tutorsHtml(), /data-testid="language-links"/)
})

test('/tutors links no niche page while no pair has three tutors, and none while nobody ticked a group; the page itself still works', async () => {
  seed([tutor(['English'], ['work']), tutor(['English'], ['work']), tutor(['English'], []), tutor(['Spanish'], []), tutor(['Spanish'], []), tutor(['French'], [])])
  let h = await tutorsHtml()
  assert.equal(nicheNav(h), '', 'two tutors for English for work is not enough')
  await assert.rejects(nichePage({ params: Promise.resolve({ language: 'english', group: 'working-professionals' }) }), /NEXT_NOT_FOUND/, 'and that page is a 404, so it is right not to link it')
  seed([tutor(['English'], []), tutor(['English'], []), tutor(['English'], []), tutor(['Spanish'], []), tutor(['Spanish'], []), tutor(['French'], [])])
  h = await tutorsHtml()
  assert.equal(nicheNav(h), '')
  assert.match(h, /data-testid="language-links"/)
})

test('/tutors with the niche list shows no private field of any tutor, and an unfiltered and a filtered address both carry the list', async () => {
  standardSeed()
  for (const params of [{}, { for: 'work' }, { lang: 'English' }]) {
    const h = await tutorsHtml(params)
    assert.ok(nicheNav(h), JSON.stringify(params))
    assert.doesNotMatch(h, /private\.tutor|0900 000 000|acct_|pay\.example\.com|learning_groups/)
  }
})

// ---- 2. /find-a-tutor asks what it is for -----------------------------------------------------------------------------------------------------

test('the finder asks "What it is for" once a tutor has said who they like to teach: Any and the six groups as real radio buttons named for; five questions in all', async () => {
  standardSeed()
  const h = await findHtml()
  assert.match(h, /<legend[^>]*>What it is for<\/legend>/)
  assert.equal((h.match(/<fieldset/g) ?? []).length, 5)
  const radios = inputsOf(h).filter(i => i.type === 'radio' && i.name === 'for')
  assert.deepEqual(radios.map(i => i.value), ['', ...GROUP_OPTIONS.map(o => o.id)])
  assert.ok(isChecked(h, 'for', ''), 'Any is the answer until the visitor chooses')
  for (const o of GROUP_OPTIONS) assert.ok(h.includes(`>${o.label}<`), o.label)
  assert.match(h, /<form [^>]*action="\/find-a-tutor"[^>]*method="get"/, 'still a plain GET form')
  assert.match(h, /A few quick answers\./)
  assert.doesNotMatch(h, /Five quick answers/)
  assert.equal(picksIn(h).length, 3)
})

test('the question is not asked while no tutor who can be booked has ticked a group (the same rule as the directory\'s own filter): four questions, as before', async () => {
  seed(Array.from({ length: 7 }, () => tutor(['English'], [])))
  const h = await findHtml()
  assert.equal((h.match(/<fieldset/g) ?? []).length, 4)
  assert.ok(!inputsOf(h).some(i => i.name === 'for'))
  // a made-up address cannot switch it on by itself with a value that is not a group
  assert.equal((await findHtml({ for: 'nonsense' })).includes('What it is for'), false)
})

test('?for=work gives the tutors who ticked work, in the finder\'s order, each with a true reason; a tutor who did not tick it is never picked or described that way', async () => {
  const ts = standardSeed()
  const h = await findHtml({ for: 'work' })
  assert.ok(isChecked(h, 'for', 'work'))
  assert.ok(!isChecked(h, 'for', ''))
  const forWork = ts.filter(t => (t.row.learning_groups as string[]).includes('work')).map(t => t.row.slug as string)
  const picks = picksIn(h)
  assert.equal(picks.length, 3)
  assert.ok(picks.every(s => forWork.includes(s)), 'only tutors who ticked work')
  assert.equal((h.match(/Teaches students learning for work and career/g) ?? []).length, 3, 'each of the three is described that way, and it is true of each')
  // every reason list stays at most three long
  for (const block of h.split('data-testid="find-why"').slice(1)) assert.ok((block.split('</ul>')[0].match(/<li/g) ?? []).length <= 3)
  // the count line reads from all who fit, and "See all tutors" keeps the answer
  assert.match(h, /data-testid="find-count"[^>]*>3 tutors you can book today/)
  assert.ok(hrefsIn(h).includes('/tutors?for=work'), 'See all tutors carries for=work')
  // combined with a language: English and work is four tutors (the French ones ticked work too, but teach French)
  const both = await findHtml({ for: 'work', lang: 'english' })
  assert.ok(picksIn(both).every(s => ts.some(t => t.row.slug === s && (t.row.languages as string[]).some(l => l.toLowerCase() === 'english'))))
  assert.match(both, /Teaches English/)
})

test('?for= is read from the fixed list: an unknown value, another case or a list of values is "Any" or the first filled one; what was typed never becomes markup', async () => {
  standardSeed()
  for (const bad of ['Work', 'work ', 'everything', '<script>alert(1)</script>', '', 'kids,work']) {
    const h = await findHtml({ for: bad })
    assert.ok(isChecked(h, 'for', '') || isChecked(h, 'for', 'work'), JSON.stringify(bad))
    assert.doesNotMatch(h, /<script>alert/)
  }
  const unknown = await findHtml({ for: 'everything' })
  assert.ok(isChecked(unknown, 'for', ''), 'an unknown group is Any')
  assert.equal(picksIn(unknown).length, 3)
  const both = await findHtml({ for: ['', 'exams'] })
  assert.ok(isChecked(both, 'for', 'exams'), '"Any" next to a chosen group does not hide the choice')
})

test('a group few tutors teach gives fewer picks and offers to drop the answer with the number it would give; a group nobody teaches is an explained state, never a blank page', async () => {
  const ts = standardSeed()
  const exams = await findHtml({ for: 'exams' })
  assert.equal(picksIn(exams).length, 3, 'three tutors ticked exams')
  const travel = await findHtml({ for: 'travel', lang: 'english' })
  assert.equal(picksIn(travel).length, 2, 'two English tutors ticked travel')
  assert.match(travel, /data-testid="find-relax"[^>]*>Only 2 tutors fit all your answers\. For more, try /)
  assert.match(travel, /removing Travel \(/)
  // nobody for kids: explained, with a way back
  const none = await findHtml({ for: 'kids' })
  assert.deepEqual(picksIn(none), [])
  assert.match(none, /data-testid="find-nomatch"/)
  assert.match(none, /Nobody with open times fits kids and teens|Nobody with open times fits Kids and teens/)
  assert.match(none, /removing (Kids and teens|kids and teens) \(13 tutors\)/)
  assert.ok(isChecked(none, 'for', 'kids'), 'the question stays on screen, answered, so the visitor can change it')
  void ts
})

test('formFilters keeps the group and still drops what the form never asks (a search word, a day, a price range, "near me", a sort)', () => {
  const f = find.formFilters({ ...dir.NO_FILTERS, group: 'work', min: 10, max: 30, q: 'zzz', when: 'today', near: true, sort: 'price-low', lang: 'Spanish' })
  assert.deepEqual(f, { ...dir.NO_FILTERS, group: 'work', lang: 'Spanish' })
  assert.equal(find.formFilters(dir.parseFilters({ for: 'travel' })).group, 'travel')
  assert.equal(find.formFilters(dir.parseFilters({ for: 'nope' })).group, null)
})

test('the reason for a group is printed only when the tutor really ticked it', () => {
  const base = { slug: 'x', name: 'X Y', photo: null, languages: ['Spanish'], headline: 'Hi', rating: null, reviews: 0, price: 20, currency: 'USD', trialPrice: null, tz: 'UTC', levels: [], complete: 1, slots: [Math.floor(Date.now() / 60000) + 600], established: false, video: null }
  const ctx = { zone: 'UTC' as string | null, now: new Date() }
  const asked = find.formFilters({ ...dir.NO_FILTERS, group: 'travel' })
  const yes = find.whyThisTutor({ ...base, groups: ['travel', 'work'] } as unknown as import('@/lib/directory.ts').DirectoryCard, asked, ctx)
  assert.ok(yes.includes('Teaches students learning for travel'))
  const no = find.whyThisTutor({ ...base, groups: ['work'] } as unknown as import('@/lib/directory.ts').DirectoryCard, asked, ctx)
  assert.ok(!no.some(w => /learning for/.test(w)))
  assert.ok(!find.whyThisTutor({ ...base, groups: ['travel'] } as unknown as import('@/lib/directory.ts').DirectoryCard, find.formFilters(dir.NO_FILTERS), ctx).some(w => /learning for/.test(w)), 'not asked, not claimed')
})

test('nothing private reaches the finder with the new question, and the FAQ names the new answer in the same words the page uses', async () => {
  standardSeed()
  for (const params of [{}, { for: 'work' }, { for: 'exams', lang: 'english' }]) {
    const h = await findHtml(params)
    assert.doesNotMatch(h, /private\.tutor|0900 000 000|acct_|pay\.example\.com|learning_groups/, JSON.stringify(params))
  }
  assert.ok(FIND_TUTOR_FAQ[0].a.includes('what you are learning it for'))
  const h = await findHtml()
  assert.ok(h.includes('How does Tutafy pick the three tutors?'))
})
