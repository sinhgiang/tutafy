// T-1032: which tutor profiles search engines are asked to index. The REAL code runs here:
//   - the rule (src/lib/profile-index.ts): a name, an introduction of at least 80 characters, not a test account, one profile for each name;
//   - the rule over a set shaped like the live site on 28 Oct 2026 (723 profiles: 691 with no introduction at all, 8 too short, 24 real);
//   - the real profile page's `robots` tag and the real sitemap list over the same made-up tutors in an in-memory database, which must always agree;
//   - a failed read of the list, which falls back to the rules that look at one row.
// Nothing here reaches a service. All names are made up.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'
import { isTestAccount, nameKey, ownReason, pickIndexable, type IndexFacts } from '@/lib/profile-index.ts'
import { listIndexableTutorSlugs, type TutorSlugClient } from '@/lib/tutor-sitemap.ts'
import { MIN_INTRO_CHARS } from '@/lib/directory.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

let db: FakeDb
let adminFails = false
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => {
      if (adminFails) throw new Error('Supabase admin client is not configured')
      return { from: (t: string) => db.from(t) }
    },
    createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: null } }) } }),
  },
})
mock.module('next/cache', { namedExports: { unstable_cache: (fn: (...a: unknown[]) => unknown) => fn } })
mock.module('next/navigation', { namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, useRouter: () => ({ push() {}, replace() {} }), useSearchParams: () => new URLSearchParams() } })

const profile = (await import('@/app/tutors/[slug]/page.tsx')) as { generateMetadata: (p: { params: Promise<{ slug: string }> }) => Promise<{ robots?: { index?: boolean; follow?: boolean } | string }> }
const robotsOf = async (slug: string) => (await profile.generateMetadata({ params: Promise.resolve({ slug }) })).robots as { index?: boolean } | undefined

const INTRO = 'I teach languages to adults and children, one to one, with a plan for every lesson and clear homework.'
const row = (slug: string, name: string, bio: string, o: Record<string, unknown> = {}): IndexFacts => ({ slug, name, bio, avatar_url: null, created_at: '2026-10-01T00:00:00Z', ...o })

// ---- the rule for one profile --------------------------------------------------------------------------------------------------------------

test('the introduction must be 80 characters, the same minimum as the directory: 79 is out, 80 is in, spaces around do not count, an emoji counts once', () => {
  assert.equal(MIN_INTRO_CHARS, 80, 'the sitemap and the directory ask for the same thing')
  assert.equal(ownReason(row('a-lee', 'Ana Lee', 'x'.repeat(79))), 'short-intro')
  assert.equal(ownReason(row('a-lee', 'Ana Lee', 'x'.repeat(80))), null)
  assert.equal(ownReason(row('a-lee', 'Ana Lee', `   ${'x'.repeat(79)}   `)), 'short-intro')
  assert.equal(ownReason(row('a-lee', 'Ana Lee', '🎨'.repeat(80))), null, 'counted by characters, not by bytes')
  for (const bad of [null, undefined, '', 42, {}, [], '          ']) assert.equal(ownReason(row('a-lee', 'Ana Lee', bad as never)), 'short-intro', String(bad))
})

test('a profile needs a name of two characters; a name that is not text is no name', () => {
  assert.equal(ownReason(row('x-1', 'A', INTRO)), 'no-name')
  assert.equal(ownReason(row('x-1', '  ', INTRO)), 'no-name')
  assert.equal(ownReason(row('x-1', null as never, INTRO)), 'no-name')
  assert.equal(ownReason(row('x-1', 'Al', INTRO)), null)
})

test('a test account is told by a whole test word in the name or the address, and not by letters that happen to sit inside a word', () => {
  for (const [name, slug] of [['Sarah Test', 'sarah-test-9xyz'], ['Maria Demo', 'maria-demo-a1b2'], ['Tutor Sample', 'tutor-sample-zz'], ['Anna', 'anna-trial-3k9p'], ['TESTING 123', 'testing-123-aaaa'], ['Dummy Account', 'dummy-account-k3j2'], ['Lorem Ipsum', 'lorem-ipsum-aaaa']]) {
    assert.ok(isTestAccount({ name, slug }), `${name} / ${slug}`)
    assert.equal(ownReason(row(slug, name, INTRO)), 'test-account', name)
  }
  for (const [name, slug] of [['Contest Winner', 'contest-winner-1abc'], ['Attestation Lopez', 'attestation-lopez-a1'], ['Testa Rossi', 'testa-rossi-9k2l'], ['Demoura Silva', 'demoura-silva-q8w2'], ['Sampler Jones', 'sampler-jones-x1y2'], ['María Pérez', 'maria-perez-l0p9']]) {
    assert.ok(!isTestAccount({ name, slug }), `${name} / ${slug} is a real name`)
    assert.equal(ownReason(row(slug, name, INTRO)), null, name)
  }
})

test('the first rule that fails is the one named: no name, then test account, then a short introduction', () => {
  assert.equal(ownReason(row('demo-1', 'A', '')), 'no-name')
  assert.equal(ownReason(row('demo-1', 'Demo Dana', '')), 'test-account')
  assert.equal(ownReason(row('dana-1', 'Dana Cole', '')), 'short-intro')
})

// ---- one profile for each name -------------------------------------------------------------------------------------------------------------

test('names are compared without capitals and extra spaces', () => {
  assert.equal(nameKey('  Jared   CRAWFORD '), 'jared crawford')
  assert.equal(nameKey('Jared Crawford'), nameKey('jared crawford'))
  assert.notEqual(nameKey('Jared Crawford'), nameKey('Jared Crawford Jr'))
  assert.equal(nameKey(null), '')
})

test('when several tutors share a name, only the best profile is kept: the longest introduction, then a photo, then the oldest, then the address', () => {
  const longer = row('jared-b', 'Jared Crawford', INTRO + ' I also prepare students for exams every term.')
  const same = row('jared-a', 'jared  CRAWFORD', INTRO)
  const r = pickIndexable([same, longer])
  assert.deepEqual(r.indexable, ['jared-b'])
  assert.deepEqual(r.excluded, [{ slug: 'jared-a', reason: 'same-name' }])
  // equal introductions: the photo decides
  const photo = row('p-2', 'Pia Moss', INTRO, { avatar_url: 'https://cdn.example.com/p.jpg' })
  const noPhoto = row('p-1', 'Pia Moss', INTRO)
  assert.deepEqual(pickIndexable([noPhoto, photo]).indexable, ['p-2'])
  assert.deepEqual(pickIndexable([noPhoto, row('p-3', 'Pia Moss', INTRO, { avatar_url: 'http://insecure.example.com/p.jpg' })]).indexable, ['p-1'], 'a photo must be https to count')
  // equal again: the oldest, then the first address
  const old = row('o-2', 'Omar Dal', INTRO, { created_at: '2026-08-01T00:00:00Z' })
  const young = row('o-1', 'Omar Dal', INTRO, { created_at: '2026-10-01T00:00:00Z' })
  assert.deepEqual(pickIndexable([young, old]).indexable, ['o-2'])
  assert.deepEqual(pickIndexable([row('z-9', 'Zed Ng', INTRO), row('z-1', 'Zed Ng', INTRO)]).indexable, ['z-1'])
  // the order the rows arrive in changes nothing
  assert.deepEqual(pickIndexable([longer, same]), pickIndexable([same, longer]))
})

test('a thin copy never takes the place of a real profile, and an empty profile with the same name as a real one is left out for its own reason', () => {
  const real = row('maya-real', 'Maya Ortiz', INTRO)
  const empty = row('maya-empty', 'Maya Ortiz', '')
  const r = pickIndexable([empty, real])
  assert.deepEqual(r.indexable, ['maya-real'])
  assert.deepEqual(r.excluded, [{ slug: 'maya-empty', reason: 'short-intro' }])
})

test('the same address twice counts once; the answer is sorted by address; different names are all kept', () => {
  const r = pickIndexable([row('b-1', 'Bea One', INTRO), row('a-1', 'Ana Two', INTRO), row('b-1', 'Bea One', INTRO)])
  assert.deepEqual(r.indexable, ['a-1', 'b-1'])
  assert.deepEqual(r.excluded, [])
  assert.deepEqual(pickIndexable([]), { indexable: [], excluded: [] })
})

// ---- a set shaped like the live site -------------------------------------------------------------------------------------------------------

test('a set shaped like the live site on 28 Oct 2026: 723 profiles with 691 empty ones go down to the few that have a real introduction', () => {
  const rows: IndexFacts[] = []
  for (let i = 0; i < 691; i++) rows.push(row(`randomletters${i}-x${String(i).padStart(3, '0')}`, `QwErTyUiOpAsDf${i}`, ''))
  for (let i = 0; i < 8; i++) rows.push(row(`short-${i}-ab12`, `Short Person ${i}`, 'x'.repeat(20 + i * 8)))   // 20 to 76 characters
  for (let i = 0; i < 22; i++) rows.push(row(`real-${i}-cd34`, `Real Tutor ${i}`, INTRO))
  rows.push(row('jared-crawford-0l8g', 'Jared Crawford', 'Déjame ayudarte a aprender inglés a tu propio ritmo'))
  rows.push(row('jared-crawford-zz11', 'Jared Crawford', ''))
  rows.push(row('a-sinh-giang-9mdo', 'A Sinh Giang', ''))
  rows.push(row('a-sinh-giang-v9xn', 'A Sinh Giang', ''))
  rows.push(row('sarah-johnson-demo', 'Sarah Johnson', 'English tutor with 5 years experience'))
  assert.equal(rows.length, 691 + 8 + 22 + 5)
  const r = pickIndexable(rows)
  assert.equal(r.indexable.length, 22, 'only the 22 real introductions (the live site has 24)')
  const count = (reason: string) => r.excluded.filter(e => e.reason === reason).length
  assert.equal(count('short-intro'), 691 + 8 + 1 + 1 + 2 + 0, 'empty and too-short profiles')
  assert.equal(count('test-account'), 1)
  assert.equal(r.indexable.length + r.excluded.length, rows.length, 'every profile is either kept or has a reason')
})

// ---- the page and the sitemap agree ----------------------------------------------------------------------------------------------------------

function tutor(slug: string, name: string, bio: string, o: Record<string, unknown> = {}) {
  return { id: `id-${slug}`, slug, name, bio, avatar_url: null, languages: ['English'], timezone: 'UTC', booking_url_active: true, average_rating: 0, review_count: 0,
    default_lesson_price: 20, currency: 'USD', trial_enabled: false, trial_price: null, buffer_minutes: 0, cancellation_hours: 24, created_at: '2026-10-01T00:00:00Z',
    email: `private.${slug}@example.com`, phone: '0900 000 000', stripe_account_id: 'acct_1', ...o }
}
const TUTORS = [
  tutor('real-rita', 'Rita Real', INTRO),
  tutor('empty-eli', 'Eli Empty', ''),
  tutor('short-sam', 'Sam Short', 'Teacher.'),
  tutor('demo-dora', 'Dora Demo', INTRO),
  tutor('twin-1', 'Tina Twin', INTRO),
  tutor('twin-2', 'tina twin', INTRO + ' I have taught for ten years.'),
  tutor('hidden-hal', 'Hal Hidden', INTRO, { booking_url_active: false }),
]
beforeEach(() => { adminFails = false; db = createFakeDb({ tutors: TUTORS, availability: [], availability_exceptions: [], lessons: [], reviews: [] }) })

test('the real profile page says "index" for a profile worth listing and "noindex" for every other one, and the real sitemap list is exactly the profiles that say "index"', async () => {
  const listed = await listIndexableTutorSlugs({ from: (t: string) => db.from(t) } as unknown as TutorSlugClient)
  assert.deepEqual(listed, ['real-rita', 'twin-2'])
  for (const t of TUTORS) {
    const robots = await robotsOf(t.slug)
    const index = robots?.index !== false
    assert.equal(index, listed.includes(t.slug), `${t.slug}: the page says ${index ? 'index' : 'noindex'}, the sitemap ${listed.includes(t.slug) ? 'lists' : 'leaves out'} it`)
  }
})

test('the profile of a tutor who turned the page off stays noindex, and a profile that does not exist is not found', async () => {
  assert.equal((await robotsOf('hidden-hal'))?.index, false)
  const none = await profile.generateMetadata({ params: Promise.resolve({ slug: 'nobody-here' }) })
  assert.equal((none.robots as { index?: boolean }).index, false)
})

test('when the list cannot be read the page falls back to the rules that look at its own row: a thin or test profile is noindex, a real one stays indexed, and the same-name rule waits', async () => {
  adminFails = true
  // the page itself needs the admin client to read the tutor, so the whole read fails: not found, kept out of search results
  assert.equal((await robotsOf('real-rita'))?.index, false)
  adminFails = false
  // list unreadable only for the cached list: simulate it with a database that fails the list query but not the single-profile read
  const base = createFakeDb({ tutors: TUTORS, availability: [], availability_exceptions: [], lessons: [], reviews: [] })
  db = { ...base, from: (t: string) => {
    const q = base.from(t)
    const orig = q.select.bind(q)
    ;(q as unknown as { select: (c: string, o?: unknown) => unknown }).select = (cols: string, o?: unknown) => {
      if (cols === 'slug, name, bio, avatar_url, created_at') throw new Error('list read failed')
      return orig(cols, o as never)
    }
    return q
  } } as unknown as FakeDb
  assert.equal((await robotsOf('real-rita'))?.index !== false, true, 'a real profile is still indexed')
  assert.equal((await robotsOf('empty-eli'))?.index, false)
  assert.equal((await robotsOf('demo-dora'))?.index, false)
  assert.equal((await robotsOf('twin-1'))?.index !== false, true, 'only the other rules apply: the copy is not found out without the list')
})
