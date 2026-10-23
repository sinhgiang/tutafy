// T-0863: the directory filters added to /tutors: student level, the visitor's time zone and "within 3 hours of me" (language, price, free times and
// trial already existed, T-0769). The REAL code runs here:
//   - the rules (src/lib/directory.ts, src/lib/tutor-levels.ts) with every edge: what an address may carry, the round trip address <-> filters,
//     daylight saving in the "near me" test, the day/time-of-day filters read in the zone chosen in the address;
//   - the real /tutors page rendered to HTML over an in-memory database: the filtered list is in the HTML itself (search engines read it),
//     the empty result says so, a made-up address gives a valid state, nothing private is in the page;
//   - migration 026 on a throwaway Postgres (PGlite): applies twice, one column, the check, and a second tutor cannot write the first one's row;
//   - the directory read on a database WITHOUT the column (the code goes live before the migration), and the Settings save of the levels.
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
import { saveTutorSettings, LEVELS_NOT_AVAILABLE, type SettingsForm } from '@/lib/settings-save.ts'
import { loadDirectory } from '@/lib/directory-data.ts'
import { cleanLevels, LEVEL_OPTIONS } from '@/lib/tutor-levels.ts'
import {
  CARD_KEYS, NEAR_HOURS, NO_FILTERS, ZONE_CHOICES, activeFilters, applyFilters, buildCard, clearedFilters, filterLabel, filtersToQuery, isNear, levelCounts,
  parseFilters, parseZone, relaxations, withoutFilter, zoneOffsetMinutes, type DirectoryCard, type Filters,
} from '@/lib/directory.ts'
import { pageMetadata } from '@/lib/page-meta.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

let db: FakeDb
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => ({ from: (table: string) => { const q = db.from(table); return { select: (cols: string, o?: { head?: boolean }) => q.select(cols, o) } } }),
    createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: null } }) } }),
  },
})
mock.module('next/cache', { namedExports: { unstable_cache: (fn: (...a: unknown[]) => unknown) => fn } })
mock.module('next/navigation', { namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, useRouter: () => ({ push() {}, replace() {} }), useSearchParams: () => new URLSearchParams() } })
const page = (await import('@/app/tutors/(directory)/page.tsx')).default as (p: { searchParams: Promise<Record<string, string | string[] | undefined>> }) => Promise<React.ReactElement>

const NOW = new Date('2026-10-22T12:00:00Z') // a Thursday
const min = (iso: string) => Date.parse(iso) / 60000
const BIO = 'I teach English to adults and children, one to one, with a plan for every lesson and clear homework.'

// ---- the rules -------------------------------------------------------------------------------------------------------------------------

test('levels: only the three known ids are kept, once each, in a fixed order', () => {
  assert.deepEqual(LEVEL_OPTIONS.map(o => o.id), ['beginner', 'intermediate', 'advanced'])
  assert.deepEqual(cleanLevels(['advanced', 'Beginner ', 'beginner', 'expert', '', null, 5]), ['beginner', 'advanced'])
  for (const v of [null, undefined, 'beginner', 7, {}, '{beginner}']) assert.deepEqual(cleanLevels(v), [], `value ${String(v)}`)
})

test('a card carries the levels as ids only, and CARD_KEYS names them (nothing else of a tutor row goes out)', () => {
  const source = {
    slug: 'maya', name: 'Maya Reyes', bio: BIO, avatar_url: null, languages: ['English'], timezone: 'UTC', average_rating: 0, review_count: 0,
    default_lesson_price: 20, currency: 'USD', trial_enabled: false, trial_price: null, levels_taught: ['advanced', 'wizard', 'beginner'],
    email: 'private@example.com', stripe_account_id: 'acct_1',
  }
  const c = buildCard(source, [{ at: '2026-10-23T14:00:00Z', label: '', zone: 'UTC' } as never])!
  assert.deepEqual(c.levels, ['beginner', 'advanced'])
  assert.deepEqual(Object.keys(c).sort(), [...CARD_KEYS].sort())
  assert.ok(!JSON.stringify(c).includes('private@') && !JSON.stringify(c).includes('acct_'))
  assert.deepEqual(buildCard({ ...source, levels_taught: undefined }, [{ at: '2026-10-23T14:00:00Z', label: '', zone: 'UTC' } as never])!.levels, [], 'a database without the column: said nothing')
})

test('a time zone in an address must be a real one in a safe shape; anything else is dropped', () => {
  assert.equal(parseZone('America/New_York'), 'America/New_York')
  assert.equal(parseZone(' Asia/Ho_Chi_Minh '), 'Asia/Ho_Chi_Minh')
  assert.equal(parseZone('UTC'), 'UTC')
  for (const bad of ['', 'Mars/Olympus_Mons', '<script>alert(1)</script>', '../../etc/passwd', 'America/New_York/../x', 'x'.repeat(80), 'GMT+5', 'America/', '/Tokyo', 'javascript:alert(1)', 'America/New York']) {
    assert.equal(parseZone(bad), null, `"${bad}"`)
  }
  assert.ok(ZONE_CHOICES.every(z => parseZone(z) === z), 'every zone offered in the list is accepted back from the address')
})

test('the address and the filters are one thing, with level, near and time zone too', () => {
  const f: Filters = { ...NO_FILTERS, lang: 'Spanish', level: 'beginner', near: true, tz: 'Asia/Tokyo', trial: true, sort: 'rating' }
  const query = filtersToQuery(f)
  assert.match(query, /level=beginner/)
  assert.match(query, /near=1/)
  assert.match(query, /tz=Asia%2FTokyo/)
  assert.deepEqual(parseFilters(Object.fromEntries(new URLSearchParams(query))), f)
  assert.equal(filtersToQuery(NO_FILTERS), '')
  assert.deepEqual(parseFilters({ level: 'expert', near: 'yes', tz: 'Nowhere/Land' }), NO_FILTERS, 'made-up values give the plain state')
  assert.deepEqual(parseFilters({ level: ['advanced', 'beginner'] }).level, 'advanced', 'the first of a repeated key')
})

test('the time zone is a setting, not a filter: it is not counted, not a chip, and "Clear all" keeps it and the sort', () => {
  const f: Filters = { ...NO_FILTERS, level: 'advanced', near: true, tz: 'Europe/London', sort: 'soonest' }
  assert.deepEqual(activeFilters(f), ['level', 'near'])
  assert.deepEqual(activeFilters({ ...NO_FILTERS, tz: 'Europe/London' }), [])
  assert.deepEqual(clearedFilters(f), { ...NO_FILTERS, tz: 'Europe/London', sort: 'soonest' })
  assert.deepEqual(withoutFilter(f, 'near'), { ...f, near: false })
  assert.deepEqual(withoutFilter(f, 'level'), { ...f, level: null })
  assert.equal(filterLabel(f, 'level'), 'Advanced')
  assert.equal(filterLabel(f, 'near'), `Within ${NEAR_HOURS} hours of you`)
})

function card(o: Partial<DirectoryCard> & { slug: string }): DirectoryCard {
  return { name: o.slug, photo: null, languages: ['English'], headline: 'A tutor.', rating: null, reviews: 0, price: 20, currency: 'USD', trialPrice: null, tz: 'UTC', levels: [], complete: 0, slots: [min('2026-10-22T20:00:00Z')], ...o }
}
const slugs = (cs: DirectoryCard[]) => cs.map(c => c.slug)
const ctx = { zone: 'UTC', now: NOW }

test('the level filter keeps tutors who said they teach that level; a tutor who said nothing is not matched', () => {
  const cs = [card({ slug: 'a', levels: ['beginner', 'intermediate'] }), card({ slug: 'b', levels: ['advanced'] }), card({ slug: 'c', levels: [] })]
  assert.deepEqual(slugs(applyFilters(cs, { ...NO_FILTERS, level: 'beginner' }, ctx)), ['a'])
  assert.deepEqual(slugs(applyFilters(cs, { ...NO_FILTERS, level: 'advanced' }, ctx)), ['b'])
  assert.deepEqual(slugs(applyFilters(cs, { ...NO_FILTERS, level: 'intermediate' }, ctx)), ['a'])
  assert.deepEqual(slugs(applyFilters(cs, NO_FILTERS, ctx)), ['a', 'b', 'c'])
  assert.deepEqual(levelCounts(cs), [
    { level: 'beginner', label: 'Beginner', hint: 'A1 to A2', count: 1 },
    { level: 'intermediate', label: 'Intermediate', hint: 'B1 to B2', count: 1 },
    { level: 'advanced', label: 'Advanced', hint: 'C1 to C2', count: 1 },
  ])
  assert.deepEqual(levelCounts([card({ slug: 'c' })]), [], 'no tutor chose a level: no level is offered')
})

test('the clock of a zone is read with daylight saving: New York is 5 hours behind London in the last week of October, 4 hours the week before', () => {
  const before = Date.parse('2026-10-22T12:00:00Z') // the US is still on summer time, the UK also on summer time until 25 Oct
  const after = Date.parse('2026-10-27T12:00:00Z') // the UK is back on winter time, the US not yet (1 Nov)
  assert.equal(zoneOffsetMinutes('UTC', before), 0)
  assert.equal(zoneOffsetMinutes('Asia/Kolkata', before), 330)
  assert.equal(zoneOffsetMinutes('America/New_York', before), -240)
  assert.equal(zoneOffsetMinutes('America/New_York', after), -240)
  assert.equal(zoneOffsetMinutes('Europe/London', before), 60)
  assert.equal(zoneOffsetMinutes('Europe/London', after), 0)
  assert.equal(zoneOffsetMinutes('Asia/Ho_Chi_Minh', after), 420)
})

test('"within 3 hours of me": exactly 3 hours is in, 3 hours 30 minutes is out, and a made-up zone is never near', () => {
  // on 22 Oct 2026 London is on summer time (UTC+1), Dubai is UTC+4, Tehran UTC+3:30, Kolkata UTC+5:30, New York UTC-4
  assert.equal(isNear('Europe/Paris', 'Europe/London', NOW), true, '1 hour')
  assert.equal(isNear('Asia/Dubai', 'Europe/London', NOW), true, 'exactly 3 hours')
  assert.equal(isNear('Asia/Tehran', 'UTC', NOW), false, '3 hours 30 minutes')
  assert.equal(isNear('Asia/Kolkata', 'Asia/Dubai', NOW), true, '1 hour 30 minutes')
  assert.equal(isNear('Asia/Kolkata', 'Europe/London', NOW), false, '4 hours 30 minutes')
  assert.equal(isNear('America/New_York', 'Europe/London', NOW), false, '5 hours')
  assert.equal(isNear('Mars/Olympus_Mons', 'UTC', NOW), false)
  assert.equal(isNear('UTC', 'Nowhere/Land', NOW), false)
})

test('the near filter compares each tutor\'s zone with the zone the visitor reads times in; without a zone it is left out, like the day filters', () => {
  const cs = [card({ slug: 'ny', tz: 'America/New_York' }), card({ slug: 'paris', tz: 'Europe/Paris' }), card({ slug: 'tokyo', tz: 'Asia/Tokyo' })]
  const near = { ...NO_FILTERS, near: true }
  assert.deepEqual(slugs(applyFilters(cs, near, { zone: 'Europe/London', now: NOW })), ['paris'])
  assert.deepEqual(slugs(applyFilters(cs, near, { zone: 'America/Chicago', now: NOW })), ['ny'])
  assert.deepEqual(slugs(applyFilters(cs, near, { zone: 'Asia/Singapore', now: NOW })), ['tokyo'])
  assert.deepEqual(slugs(applyFilters(cs, near, { zone: null, now: NOW })), ['ny', 'paris', 'tokyo'], 'the zone is not known yet: nothing is guessed')
})

test('the time-of-day filter follows the zone the visitor chose: the same free time is evening in Tokyo and morning in London', () => {
  const c = card({ slug: 'a', slots: [min('2026-10-23T09:00:00Z')] }) // 9 AM London (summer time: 10), 6 PM Tokyo
  const evening = { ...NO_FILTERS, tod: 'evening' as const }
  assert.deepEqual(slugs(applyFilters([c], evening, { zone: 'Asia/Tokyo', now: NOW })), ['a'])
  assert.deepEqual(slugs(applyFilters([c], evening, { zone: 'Europe/London', now: NOW })), [])
})

test('when levels leave nobody, the page offers to remove the level and counts the tutors that brings back', () => {
  const cs = [card({ slug: 'a', levels: ['advanced'] }), card({ slug: 'b' }), card({ slug: 'c' })]
  const f = { ...NO_FILTERS, level: 'beginner' as const }
  assert.equal(applyFilters(cs, f, ctx).length, 0)
  assert.deepEqual(relaxations(cs, f, ctx), [{ key: 'level', label: 'Beginner', count: 3 }])
})

// ---- the page ---------------------------------------------------------------------------------------------------------------------------

let seq = 0
function tutor(o: Record<string, unknown> = {}) {
  const n = ++seq
  const id = `t-${n}`
  const row = {
    id, slug: `tutor-${n}`, name: `Tutor Number${n}`, bio: BIO, avatar_url: null, languages: ['English'], timezone: 'UTC', booking_url_active: true,
    average_rating: 0, review_count: 0, default_lesson_price: 20, currency: 'USD', trial_enabled: false, trial_price: null, buffer_minutes: 0, levels_taught: [],
    email: `private.tutor${n}@example.com`, phone: '0900 000 000', stripe_account_id: `acct_${n}`, payment_link: `https://pay.example.com/${n}`, ...o,
  }
  const avail = [0, 1, 2, 3, 4, 5, 6].map(d => ({ id: `a-${n}-${d}`, tutor_id: id, day_of_week: d, start_time: '00:00', end_time: '23:30' }))
  return { row, avail }
}
function seed(tutors: ReturnType<typeof tutor>[]) {
  db = createFakeDb({ tutors: tutors.map(t => t.row), availability: tutors.flatMap(t => t.avail), availability_exceptions: [], lessons: [] })
}
beforeEach(() => { seq = 0 })
const html = async (searchParams: Record<string, string | string[] | undefined> = {}) => renderToStaticMarkup(await page({ searchParams: Promise.resolve(searchParams) }))
const cardsIn = (h: string) => [...h.matchAll(/data-testid="tutor-card" data-slug="([^"]+)"/g)].map(m => m[1])

function sixWithLevels() {
  return [
    tutor({ name: 'Beginner Teacher', levels_taught: ['beginner'] }), tutor({ name: 'Both Teacher', levels_taught: ['beginner', 'advanced'] }),
    tutor({ name: 'Advanced Teacher', levels_taught: ['advanced'] }), tutor({ name: 'Silent One' }), tutor({ name: 'Silent Two' }), tutor({ name: 'Silent Three' }),
  ]
}

test('the page draws the filtered list in the HTML itself: ?level=beginner keeps the two beginner tutors', async () => {
  const ts = sixWithLevels()
  seed(ts)
  const all = await html()
  assert.equal(cardsIn(all).length, 6)
  const h = await html({ level: 'beginner' })
  assert.deepEqual(cardsIn(h).sort(), [ts[0].row.slug, ts[1].row.slug].sort())
  assert.match(h, /data-testid="directory-count"[^>]*>.*?<b[^>]*>2 tutors<\/b>.* of 6/s)
  assert.match(h, /data-testid="applied-filters"/)
  assert.match(h, /Remove filter Beginner/)
  assert.match(h, /data-testid="card-levels"/, 'the card says which levels the tutor teaches')
  assert.match(h, /Beginner · Advanced/)
})

test('the level group is offered only when a listed tutor has chosen a level', async () => {
  seed(sixWithLevels())
  const h = await html()
  assert.match(h, />\s*Level\s*<svg/, 'the Level button is there')
  seed(Array.from({ length: 6 }, () => tutor()))
  const plain = await html()
  assert.ok(!/>\s*Level\s*<svg/.test(plain) && !plain.includes('data-testid="card-levels"'), 'nobody said anything: no level filter that would empty the list')
})

test('a level nobody teaches gives the "no tutors match" state with a way back, not a blank page', async () => {
  seed(Array.from({ length: 6 }, () => tutor()))
  const h = await html({ level: 'advanced' })
  assert.equal(cardsIn(h).length, 0)
  assert.match(h, /data-testid="directory-nomatch"/)
  assert.match(h, /No tutors match these filters/)
  assert.match(h, /removing Advanced \(6 tutors\)/)
  assert.match(h, /Clear all filters/)
})

test('?tz= sets the zone times are read in, already on the server: the line says so and the cards name no other zone', async () => {
  seed(Array.from({ length: 6 }, () => tutor()))
  const h = await html({ tz: 'Asia/Tokyo' })
  assert.match(h, /data-testid="tz-line"[^>]*>.*?Times shown in: Tokyo/s)
  assert.ok(h.includes('data-testid="tz-change"'))
  assert.match(h, /Your time/)
  const plain = await html()
  assert.ok(!plain.includes('Times shown in: '), 'with no zone in the address the line is the browser\'s own (or the tutor\'s until it is known)')
})

test('the day and time-of-day filters work on the server when the address names the zone, so a shared link opens on the same list', async () => {
  seed(Array.from({ length: 6 }, () => tutor()))
  // every tutor is free all day UTC; with the zone set the filter runs here instead of waiting for the browser
  const h = await html({ tz: 'Asia/Tokyo', tod: 'evening', when: '3days' })
  assert.equal(cardsIn(h).length, 6)
  const none = await html({ tz: 'Asia/Tokyo', when: 'today', tod: 'morning' })
  assert.ok(none.includes('data-testid="directory-count"'))
})

test('"within 3 hours of me" keeps the tutors whose clock is close to the zone in the address', async () => {
  const ts = [
    tutor({ name: 'Paris Tutor', timezone: 'Europe/Paris' }), tutor({ name: 'Athens Tutor', timezone: 'Europe/Athens' }), tutor({ name: 'Kolkata Tutor', timezone: 'Asia/Kolkata' }),
    tutor({ name: 'New York Tutor', timezone: 'America/New_York' }), tutor({ name: 'Tokyo Tutor', timezone: 'Asia/Tokyo' }), tutor({ name: 'Sydney Tutor', timezone: 'Australia/Sydney' }),
  ]
  seed(ts)
  const h = await html({ tz: 'Europe/London', near: '1' })
  const shown = cardsIn(h)
  for (const t of ts) assert.equal(shown.includes(t.row.slug as string), ['Paris Tutor', 'Athens Tutor'].includes(t.row.name as string), t.row.name as string)
  assert.match(h, /Remove filter Within 3 hours of you/)
})

test('a made-up address gives a valid page: bad values are dropped, nothing from the address is echoed as markup', async () => {
  seed(sixWithLevels())
  const evil = '<script>alert(1)</script>'
  const h = await html({ level: evil, tz: evil, near: evil, lang: evil, q: evil })
  assert.ok(!h.includes('<script>alert(1)'), 'no raw script from the address')
  assert.equal(cardsIn(await html({ level: 'expert', tz: 'Nowhere/Land', near: 'x' })).length, 6)
})

test('a visitor receives nothing private on the filtered page either: no email, phone, payment field or tutor id', async () => {
  seed(sixWithLevels())
  for (const params of [{ level: 'beginner' }, { tz: 'Asia/Tokyo', near: '1' }, {}]) {
    const h = await html(params)
    for (const leak of ['private.tutor', '@example.com', '0900 000 000', 'acct_', 'pay.example.com', 'levels_taught', 'booking_url_active', '"t-1"']) assert.ok(!h.includes(leak), `the page must not carry "${leak}"`)
  }
})

test('every filtered address names the plain /tutors page as its canonical address (one page for search engines, no thin copies)', () => {
  const m = pageMetadata('tutors')
  assert.equal(m.alternates?.canonical?.toString().replace(/^https?:\/\/[^/]+/, ''), '/tutors')
  assert.notEqual((m.robots as { index?: boolean } | undefined)?.index, false, 'the directory itself stays indexable')
})

// ---- the database ----------------------------------------------------------------------------------------------------------------------

const FILE = '026_tutor_levels.sql'
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
const levelsOf = async (d: PGlite, id: string) => (await d.query<{ levels_taught: string[] }>(`select levels_taught from public.tutors where id = '${id}'`)).rows[0].levels_taught

test('migration 026 exists once, applies twice, adds one column that starts empty for every tutor, and changes nothing else', async () => {
  assert.deepEqual(migrationFiles().filter(f => f.startsWith('026_')), [FILE])
  const d = await freshDb(false)
  const cols = async () => (await d.query(`select table_name, column_name from information_schema.columns where table_schema = 'public' order by 1, 2`)).rows
  const before = await cols()
  await d.exec(readMigration(FILE))
  await d.exec(readMigration(FILE))
  const added = (await cols()).filter(c => !before.some(b => JSON.stringify(b) === JSON.stringify(c)))
  assert.deepEqual(added, [{ table_name: 'tutors', column_name: 'levels_taught' }])
  assert.deepEqual(await levelsOf(d, A), [])
  const policies = (await d.query(`select policyname from pg_policies where tablename = 'tutors' order by 1`)).rows
  assert.ok(policies.length > 0)
})

test('the database refuses a level that is not one of the three, a repeat, a null and a fourth entry', async () => {
  const d = await freshDb()
  await d.exec(`update public.tutors set levels_taught = array['beginner','advanced'] where id = '${A}'`)
  assert.deepEqual(await levelsOf(d, A), ['beginner', 'advanced'])
  for (const bad of [`array['expert']`, `array['beginner','beginner']`, `array['beginner','intermediate','advanced','beginner']`, `array['Beginner']`, 'null', `array[null]::text[]`]) {
    await assert.rejects(d.exec(`update public.tutors set levels_taught = ${bad} where id = '${A}'`), (e: unknown) => (e as { code?: string }).code === '23514' || (e as { code?: string }).code === '23502', bad)
  }
  assert.deepEqual(await levelsOf(d, A), ['beginner', 'advanced'], 'a refused write changed nothing')
})

test('the second-person test: a tutor writes the levels on their own row, never on another tutor\'s; a signed-out caller writes and reads nothing', async () => {
  const d = await freshDb()
  await asUser(d, A, 'authenticated', () => d.exec(`update public.tutors set levels_taught = array['beginner'] where id = '${A}'`))
  assert.deepEqual(await levelsOf(d, A), ['beginner'])
  await asUser(d, A, 'authenticated', () => d.exec(`update public.tutors set levels_taught = array['advanced'] where id = '${B}'`))
  assert.deepEqual(await levelsOf(d, B), [], 'A could not touch B\'s row')
  await asUser(d, B, 'authenticated', () => d.exec(`update public.tutors set levels_taught = array['advanced'] where id = '${A}'`))
  assert.deepEqual(await levelsOf(d, A), ['beginner'], 'and B cannot write A\'s row either')
  const denied = (e: unknown) => (e as { code?: string }).code === '42501'
  await assert.rejects(asUser(d, null, 'anon', () => d.exec(`update public.tutors set levels_taught = array['advanced'] where id = '${B}'`)), denied, 'a signed-out caller may not write')
  assert.deepEqual(await levelsOf(d, B), [], 'a signed-out caller changed nothing')
  await assert.rejects(asUser(d, null, 'anon', () => d.query(`select levels_taught from public.tutors`)), denied, 'and reads no tutor row (migration 025 stays closed)')
})

test('the directory reads the levels on its own and carries only the ids; on a database without the column it lists the same tutors with no levels', async () => {
  const d = await freshDb()
  // columns and tables the real database has that no migration file makes (the same two lines as tests/directory-rule.test.ts)
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
  await d.exec(`update public.tutors set levels_taught = array['advanced','beginner'] where id = '${A}'`)
  const client = () => pgliteClient(d, { restStyle: true }) as never
  const withColumn = await loadDirectory(client(), new Date())
  assert.equal(withColumn.cards.find(c => c.slug === 'tutor-a')?.levels.join(), 'beginner,advanced')
  assert.deepEqual(withColumn.cards.find(c => c.slug === 'tutor-b')?.levels, [])
  for (const c of withColumn.cards) assert.deepEqual(Object.keys(c).sort(), [...CARD_KEYS].sort())
  await d.exec('alter table public.tutors drop column levels_taught')
  const without = await loadDirectory(client(), new Date())
  assert.equal(without.cards.length, withColumn.cards.length, 'the directory still lists everybody')
  assert.ok(without.cards.every(c => c.levels.length === 0))
})

// ---- Settings: the tutor chooses their levels ------------------------------------------------------------------------------------------

const FORM: SettingsForm = {
  name: 'Maya', bio: BIO, timezone: 'UTC', cancellation_hours: 24, booking_url_active: true, buffer_minutes: 15, paypal_link: '', paddle_checkout_link: '',
  default_lesson_price: '20', contract_template: '', trial_enabled: false, trial_price: '', currency: 'USD', lesson_durations: [30, 60], default_lesson_duration: 60,
  hide_branding: false, levels_taught: [],
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

test('Settings saves the levels apart from the main update, only when they changed, cleaned, on the signed-in tutor\'s own row', async () => {
  const s = settingsDb()
  const saved = JSON.stringify(FORM)
  const res = await saveTutorSettings(s.db, 'tutor-1', { ...FORM, levels_taught: ['advanced', 'expert', 'beginner', 'beginner'] }, saved, '')
  assert.equal(res.ok, true)
  assert.ok(!s.writes.some(w => 'levels_taught' in w.values && Object.keys(w.values).length > 1), 'never mixed into another update')
  assert.ok(!('levels_taught' in s.writes[0].values), 'the main update does not carry it (its column may not exist yet)')
  const lw = s.writes.filter(w => 'levels_taught' in w.values)
  assert.equal(lw.length, 1)
  assert.deepEqual(lw[0].values, { levels_taught: ['beginner', 'advanced'] })
  assert.equal(lw[0].id, 'tutor-1')
  const again = settingsDb()
  await saveTutorSettings(again.db, 'tutor-1', { ...FORM, levels_taught: ['beginner'] }, JSON.stringify({ ...FORM, levels_taught: ['beginner'] }), '')
  assert.ok(!again.writes.some(w => 'levels_taught' in w.values), 'unchanged levels are not written again')
})

test('when the levels column is not there yet, the other settings are saved, the message says so, and the saved copy keeps the old levels', async () => {
  const s = settingsDb(['levels_taught'])
  const res = await saveTutorSettings(s.db, 'tutor-1', { ...FORM, name: 'New Name', levels_taught: ['beginner'] }, JSON.stringify(FORM), '')
  assert.equal(res.ok, false)
  if (res.ok) return
  assert.equal(res.stage, 'optional')
  assert.equal(res.message, LEVELS_NOT_AVAILABLE)
  assert.deepEqual(JSON.parse(res.snapshot).levels_taught, [], 'the unsaved-changes bar stays: nothing was written')
  assert.equal(JSON.parse(res.snapshot).name, 'New Name', 'the main columns were written')
})
