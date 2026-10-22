// T-0769: the tutor directory page /tutors, its public list /api/tutors/public, and the "Your listing" card on the dashboard. The REAL code runs here:
//   - the real route and the real page rendered to HTML over an in-memory database that holds made-up tutors, some with an email, a phone number and
//     a payment link in their row, to show a visitor who is not signed in receives ONLY the public card keys;
//   - the states: many, few (under 6), empty, no match, a failed read (an error, never an empty list), and the filters read from the address;
//   - the dashboard card for the signed-in tutor (and that a second tutor never sees the first one's rows).
// Nothing here reaches a service. All names, prices and times are made up.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(SRC, rel), 'utf8').replace(/\r\n/g, '\n')

let db: FakeDb
let adminFails = false
let currentUser: { id: string; email: string } | null = null
const adminReads: { table: string; cols: string }[] = []
let sessionCalls = 0
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => {
      if (adminFails) throw new Error('Supabase admin client is not configured')
      return { from: (table: string) => { const q = db.from(table); return { select: (cols: string, o?: { head?: boolean }) => { adminReads.push({ table, cols }); return q.select(cols, o) } } } }
    },
    createClient: async () => { sessionCalls++; return { from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: currentUser } }) } } },
  },
})
// The list is kept a few minutes by Next's cache; here every call runs the real function, so each test sees its own database.
mock.module('next/cache', { namedExports: { unstable_cache: (fn: (...a: unknown[]) => unknown) => fn } })
mock.module('next/navigation', { namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, useRouter: () => ({ push() {}, replace() {} }), useSearchParams: () => new URLSearchParams() } })

const route = await import('@/app/api/tutors/public/route.ts')
const page = (await import('@/app/tutors/(directory)/page.tsx')).default as (p: { searchParams: Promise<Record<string, string | string[] | undefined>> }) => Promise<React.ReactElement>
const dir = await import('@/lib/directory.ts')
const listing = await import('@/lib/listing-status.ts')
const { ListingCardView } = await import('@/components/dashboard/ListingCard.tsx')
const DashboardPage = (await import('@/app/(dashboard)/dashboard/page.tsx')).default as () => Promise<{ props: { data: { listing: ReturnType<typeof listing.buildListingCard> | null; tutorId: string } } }>

const BIO = 'I teach English to adults and children, one to one, with a plan for every lesson and clear homework.'
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]
let seq = 0

/** A made-up tutor row with the private fields a real row holds, plus hours on every day. */
function tutor(o: Record<string, unknown> = {}, hours = true) {
  const n = ++seq
  const id = `t-${n}`
  const row = {
    id, slug: `tutor-${n}`, name: `Tutor Number${n}`, bio: BIO, avatar_url: null, languages: ['English'], timezone: 'UTC', booking_url_active: true,
    average_rating: 0, review_count: 0, default_lesson_price: 20, currency: 'USD', trial_enabled: false, trial_price: null, buffer_minutes: 0,
    // the private fields the visitor must never receive
    email: `private.tutor${n}@example.com`, phone: '0900 000 000', stripe_account_id: `acct_${n}`, payment_link: `https://pay.example.com/${n}`, paypal_link: 'paypal.me/someone', ...o,
  }
  const avail = hours ? EVERY_DAY.map(d => ({ id: `a-${n}-${d}`, tutor_id: id, day_of_week: d, start_time: '00:00', end_time: '23:30' })) : []
  return { row, avail }
}

function seed(tutors: ReturnType<typeof tutor>[], extra: Record<string, Record<string, unknown>[]> = {}) {
  db = createFakeDb({ tutors: tutors.map(t => t.row), availability: tutors.flatMap(t => t.avail), availability_exceptions: [], lessons: [], ...extra })
}

beforeEach(() => { adminFails = false; currentUser = null; adminReads.length = 0; sessionCalls = 0 })

const html = async (searchParams: Record<string, string | string[] | undefined> = {}) => renderToStaticMarkup(await page({ searchParams: Promise.resolve(searchParams) }))
const cardsIn = (h: string) => [...h.matchAll(/data-testid="tutor-card" data-slug="([^"]+)"/g)].map(m => m[1])

// ---- the public list ------------------------------------------------------------------------------------------------------------------

test('the public list answers 200 with only the card keys, a short cache, and nothing private from the tutor row', async () => {
  seed([tutor({ name: 'Maya Reyes', languages: ['english', 'Spanish'], trial_enabled: true, trial_price: 10, average_rating: 4.9, review_count: 38 }), tutor()])
  const res = await route.GET()
  assert.equal(res.status, 200)
  assert.match(res.headers.get('cache-control') ?? '', /s-maxage=300/)
  const body = await res.json() as { tutors: Record<string, unknown>[]; listed: number; truncated: boolean }
  assert.equal(body.listed, 2)
  assert.equal(body.truncated, false)
  for (const t of body.tutors) assert.deepEqual(Object.keys(t).sort(), [...dir.CARD_KEYS].sort())
  const text = JSON.stringify(body)
  for (const leak of ['private.tutor', '@example.com', '0900 000 000', 'acct_', 'pay.example.com', 'paypal', 'stripe', '"email"', '"phone"', '"id"']) assert.ok(!text.includes(leak), `the list must not carry "${leak}"`)
  assert.equal(sessionCalls, 0, 'a visitor needs no session: the list is read with the server\'s own client, never with a visitor\'s')
})

test('the public list reads only the public columns of tutors and never writes', async () => {
  seed([tutor()])
  await route.GET()
  const cols = adminReads.filter(r => r.table === 'tutors').flatMap(r => r.cols.split(',').map(c => c.trim()))
  assert.ok(cols.length > 0)
  for (const c of cols) assert.ok(!/email|phone|address|stripe|paypal|payment|referral|token|secret|password|portal/i.test(c), `column ${c}`)
  assert.deepEqual(db.log.filter(l => l.op !== 'select'), [], 'no insert, update, upsert or delete')
})

test('a failed read answers 503 with a plain sentence and no list (not an empty list that looks like "no tutors")', async () => {
  seed([tutor()])
  adminFails = true
  const res = await route.GET()
  assert.equal(res.status, 503)
  const body = await res.json() as Record<string, unknown>
  assert.equal(typeof body.error, 'string')
  assert.ok(!('tutors' in body))
  assert.equal(res.headers.get('cache-control'), 'no-store')
})

// ---- the page --------------------------------------------------------------------------------------------------------------------------

test('the page lists only tutors who can be booked: each of the four conditions failing keeps a tutor out', async () => {
  const listed = Array.from({ length: 6 }, (_, i) => tutor({ name: `Listed Number${i}` }))
  const off = tutor({ name: 'PageOff Person', booking_url_active: false })
  const noHours = tutor({ name: 'NoHours Person' }, false)
  const shortBio = tutor({ name: 'ShortBio Person', bio: 'Too short.' })
  const noName = tutor({ name: ' ' })
  const badZone = tutor({ name: 'BadZone Person', timezone: 'Mars/Olympus_Mons' })
  seed([...listed, off, noHours, shortBio, noName, badZone])
  const h = await html()
  assert.deepEqual(cardsIn(h).sort(), listed.map(t => t.row.slug as string).sort())
  for (const n of ['PageOff', 'NoHours', 'ShortBio', 'BadZone']) assert.ok(!h.includes(n), `${n} must not appear`)
  assert.match(h, /data-testid="directory-count"[^>]*>.*?<b[^>]*>6 tutors<\/b>/s)
  assert.ok(!h.includes('data-testid="directory-few"') && !h.includes('data-testid="directory-empty"'))
  assert.ok(h.includes('data-testid="directory-band"'), 'with many tutors the invitation to tutors is the band at the bottom')
})

test('a tutor without a photo or a price is still listed: a coloured tile with initials, and "Ask for price"', async () => {
  seed([...Array.from({ length: 5 }, () => tutor()), tutor({ name: 'Priya Nair', default_lesson_price: null, avatar_url: null })])
  const h = await html()
  assert.equal(cardsIn(h).length, 6)
  assert.match(h, /data-testid="card-monogram"/)
  assert.match(h, /Ask for price/)
  assert.match(h, /data-testid="card-new"/)
})

test('a photo is drawn only when it is an https address; anything else gives the initials tile', async () => {
  seed([
    tutor({ name: 'Has Photo', avatar_url: 'https://example.com/photo.jpg' }), tutor({ name: 'Http Photo', avatar_url: 'http://example.com/photo.jpg' }),
    tutor({ name: 'Script Photo', avatar_url: 'javascript:alert(1)' }), ...Array.from({ length: 3 }, () => tutor()),
  ])
  const h = await html()
  assert.equal([...h.matchAll(/<img /g)].length, 1)
  assert.match(h, /<img src="https:\/\/example\.com\/photo\.jpg" alt="Photo of Has Photo"/)
  assert.ok(!h.includes('javascript:') && !h.includes('http://example.com/photo.jpg'))
  assert.equal([...h.matchAll(/data-testid="card-monogram"/g)].length, 5)
})

test('every card says when the tutor is next free, and the page never draws a card without a free time', async () => {
  seed([...Array.from({ length: 6 }, () => tutor())])
  const h = await html()
  const cards = h.split('data-testid="tutor-card"').slice(1)
  assert.equal(cards.length, 6)
  for (const c of cards) assert.match(c, /Next available<\/b> · <span data-testid="card-next-time">(Today|Tomorrow|[A-Z][a-z]{2}) \d{1,2}:\d{2} (AM|PM)<\/span>/)
})

test('the "few tutors" state: fewer than 6 shows the honest note and the invitation card, not the band', async () => {
  seed([tutor(), tutor(), tutor()])
  const h = await html()
  assert.equal(cardsIn(h).length, 3)
  assert.match(h, /We are just getting started/)
  assert.match(h, /there are 3 today/)
  assert.ok(h.includes('data-testid="directory-invite"'))
  assert.ok(!h.includes('data-testid="directory-band"'))
  seed([tutor()])
  assert.match(await html(), /there is 1 today/)
})

test('the empty state: nobody can be booked, so no cards, a plain sentence and a way for tutors to join', async () => {
  seed([tutor({}, false), tutor({ booking_url_active: false })])
  const h = await html()
  assert.deepEqual(cardsIn(h), [])
  assert.match(h, /data-testid="directory-empty"/)
  assert.match(h, /No tutors have open times right now/)
  assert.match(h, /href="\/register"/)
  assert.ok(!h.includes('data-testid="directory-error"'))
})

test('a failed read draws the error state with "Try again" and the filters kept, never the empty state', async () => {
  seed([tutor()])
  adminFails = true
  const h = await html({ lang: 'french' })
  assert.match(h, /data-testid="directory-error"/)
  assert.match(h, /We could not load the tutors/)
  assert.match(h, /href="\/tutors\?lang=french"[^>]*>Try again/)
  assert.ok(!h.includes('data-testid="directory-empty"') && !h.includes('No tutors have open times'))
  assert.deepEqual(cardsIn(h), [])
  assert.match(h, /<meta name="robots" content="noindex"\/>/, 'an error page is not indexed')
  seed([tutor()])
  adminFails = false
  assert.ok(!(await html()).includes('name="robots"'), 'a page with the list is left to the layout\'s own robots setting')
})

test('filters in the address: language, price, trial and search narrow the list; a state with nobody says why and how to widen it', async () => {
  seed([
    tutor({ name: 'Ana Silva', languages: ['Spanish'], default_lesson_price: 12, trial_enabled: true, trial_price: 5 }),
    tutor({ name: 'Ben Cole', languages: ['English'], default_lesson_price: 28 }),
    tutor({ name: 'Cara Diaz', languages: ['Spanish', 'English'], default_lesson_price: 27, currency: 'EUR' }),
    tutor({ name: 'Dan Poe', languages: ['German'], default_lesson_price: 60 }),
    tutor({ name: 'Eve Ray', languages: ['English'], default_lesson_price: null }),
    tutor({ name: 'Fay Kim', languages: ['French'], default_lesson_price: 90, currency: 'USD' }),
  ])
  const names = (h: string) => [...h.matchAll(/<h2 class="[^"]*">([^<]+)<\/h2>/g)].map(m => m[1]).filter(n => /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(n)).sort()
  assert.deepEqual(names(await html({ lang: 'spanish' })), ['Ana Silva', 'Cara Diaz'])
  assert.deepEqual(names(await html({ lang: 'english', price: '15-30' })), ['Ben Cole'].concat(['Cara Diaz']).sort(), 'EUR 27 is about $29')
  assert.deepEqual(names(await html({ trial: '1' })), ['Ana Silva'])
  assert.deepEqual(names(await html({ q: 'poe' })), ['Dan Poe'])
  assert.deepEqual(names(await html({ price: '50plus' })), ['Dan Poe', 'Fay Kim'])
  const none = await html({ lang: 'french', price: 'up15' })
  assert.match(none, /data-testid="directory-nomatch"/)
  assert.match(none, /No tutors match these filters/)
  assert.match(none, /removing French \(1 tutor\)/)
  assert.ok(none.includes('Clear all filters'))
  // made-up values in the address are ignored, never an error
  assert.equal(names(await html({ price: '<script>', when: 'x', sort: 'nope' })).length, 6)
})

test('the sort order is in the address too; "Show more" waits until there are more than a page of tutors', async () => {
  seed(Array.from({ length: 30 }, () => tutor()))
  const h = await html()
  assert.equal(cardsIn(h).length, dir.PAGE_SIZE)
  assert.match(h, /Show more tutors/)
  assert.match(h, new RegExp(`Showing ${dir.PAGE_SIZE} of 30`))
  assert.match(await html({ sort: 'soonest' }), /<option value="soonest" selected="">Soonest available<\/option>/)
})

test('text a tutor typed is shown as text, never as markup', async () => {
  seed([...Array.from({ length: 5 }, () => tutor()), tutor({ name: 'Eve <script>alert(1)</script>', bio: `${BIO} <img src=x onerror=alert(1)>` })])
  const h = await html({ q: '<script>alert(2)</script>' })
  assert.ok(!/<script>alert/.test(h) && !/<img src=x/.test(h))
})

test('the page draws no private field of a tutor row', async () => {
  seed(Array.from({ length: 6 }, () => tutor()))
  const h = await html()
  for (const leak of ['private.tutor', '0900 000 000', 'acct_', 'pay.example.com', 'paypal.me']) assert.ok(!h.includes(leak), `the page must not carry "${leak}"`)
})

test('the page file and the list files hold no write call and no use of a visitor\'s session', () => {
  for (const f of ['lib/directory-data.ts', 'lib/directory-cache.ts', 'lib/directory.ts', 'app/api/tutors/public/route.ts', 'app/tutors/(directory)/page.tsx', 'lib/listing-status.ts']) {
    const src = read(f).split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
    assert.ok(!/\.(insert|update|upsert|delete|rpc)\(/.test(src), `${f} must only read`)
  }
  const route = read('app/api/tutors/public/route.ts')
  assert.ok(!/createClient\b/.test(route.replace(/\/\/.*$/gm, '')), 'the public list is not read with a visitor\'s session')
})

// ---- the card on the tutor's dashboard ----------------------------------------------------------------------------------------------

const mine = (o: Record<string, unknown> = {}, hours = true) => {
  const t = tutor({ name: 'Carlos Mendes', slug: 'carlos-mendes', ...o }, hours)
  return t
}

test('the dashboard card asks the same rule: a tutor the directory lists is "Listed", with the next free time and no task', async () => {
  const t = mine()
  seed([t, ...Array.from({ length: 5 }, () => tutor())])
  const card = await listing.loadListingCard(db as never, t.row.id as string, new Date())
  assert.ok(card)
  assert.equal(card!.listed, true)
  assert.ok(card!.nextFree)
  assert.deepEqual(card!.rows.map(r => [r.id, r.state]), [['page', 'ok'], ['name', 'ok'], ['times', 'ok'], ['intro', 'ok'], ['photo', 'optional']])
  const directoryHas = (await route.GET().then(r => r.json()) as { tutors: { slug: string }[] }).tutors.some(x => x.slug === 'carlos-mendes')
  assert.equal(directoryHas, true, 'the card says Listed exactly when the directory lists the tutor')
})

test('each failing condition shows its own task with a button, and the directory agrees the tutor is not listed', async () => {
  const cases: [string, Record<string, unknown>, boolean, string, string][] = [
    ['page off', { booking_url_active: false }, true, 'page', '/settings?tab=booking'],
    ['blank name', { name: '  ' }, true, 'name', '/settings?tab=profile'],
    ['short introduction', { bio: 'Just a few words about me.' }, true, 'intro', '/settings?tab=profile'],
    ['no hours', {}, false, 'times', '/availability'],
    ['unknown time zone', { timezone: 'Mars/Olympus_Mons' }, true, 'times', '/settings?tab=profile'],
  ]
  for (const [label, o, hours, rowId, href] of cases) {
    const t = mine(o, hours)
    seed([t])
    const card = (await listing.loadListingCard(db as never, t.row.id as string, new Date()))!
    assert.equal(card.listed, false, label)
    const row = card.rows.find(r => r.id === rowId)!
    assert.equal(row.state, 'todo', label)
    assert.equal(row.href, href, label)
    assert.ok(row.action, label)
    assert.equal(card.rows.filter(r => r.state === 'todo').length, 1, `${label}: only that one task`)
    const inDirectory = ((await route.GET().then(r => r.json())) as { tutors: unknown[] }).tutors.length
    assert.equal(inDirectory, 0, `${label}: the directory does not list the tutor either`)
  }
})

test('days all blocked or booked say so, and a short introduction says how many characters it has', async () => {
  const t = mine({ bio: 'x'.repeat(41) })
  const blocked = Array.from({ length: 16 }, (_, i) => ({ tutor_id: t.row.id, date: new Date(Date.now() + i * 86400000 - 86400000).toISOString().slice(0, 10) }))
  seed([t], { availability_exceptions: blocked })
  const card = (await listing.loadListingCard(db as never, t.row.id as string, new Date()))!
  assert.equal(card.rows.find(r => r.id === 'times')!.title, 'Your next 14 days are fully booked or blocked')
  assert.match(card.rows.find(r => r.id === 'intro')!.sub, /Yours is 41 characters\. Aim for at least 80/)
  assert.match(card.text, /2 things are missing/)
})

test('the card is drawn: Listed / Not listed yet, the tasks with buttons, no button on done rows, the next free time in a named zone', async () => {
  const t = mine()
  seed([t])
  const ok = (await listing.loadListingCard(db as never, t.row.id as string, new Date('2026-10-22T12:00:00Z')))!
  const yes = renderToStaticMarkup(createElement(ListingCardView, { card: ok, zone: 'Asia/Tokyo', now: new Date('2026-10-22T12:00:00Z') }))
  assert.match(yes, /data-listed="yes"/)
  assert.match(yes, />Listed</)
  assert.match(yes, /Next free time: (Today|Tomorrow|[A-Z][a-z]{2}) \d{1,2}:\d{2} (AM|PM) \(your time\)/)
  assert.ok(!/class="[^"]*"[^>]*href="\/(availability|settings)/.test(yes.replace(/View in the directory/g, '')), 'no task buttons when listed')
  const bad = mine({ bio: 'Short.' }, false)
  seed([bad])
  const no = renderToStaticMarkup(createElement(ListingCardView, { card: (await listing.loadListingCard(db as never, bad.row.id as string, new Date()))!, zone: null, now: new Date() }))
  assert.match(no, /data-listed="no"/)
  assert.match(no, /Not listed yet/)
  assert.match(no, /href="\/availability"[^>]*>Add free hours</)
  assert.match(no, /href="\/settings\?tab=profile"[^>]*>Write introduction</)
  assert.match(no, /Your booking link still works for the students you send there/)
})

test('a second tutor never sees the first one\'s rows on the dashboard: the card is built from the signed-in tutor\'s own id', async () => {
  const a = mine({ name: 'Alpha Tutor', slug: 'alpha-tutor' })
  const b = mine({ name: 'Beta Tutor', slug: 'beta-tutor', bio: 'Short.' }, false)
  seed([a, b], {
    students: [], invoices: [],
  })
  currentUser = { id: b.row.id as string, email: 'beta@example.com' }
  const out = await DashboardPage()
  const card = out.props.data.listing!
  assert.ok(card)
  assert.equal(out.props.data.tutorId, b.row.id)
  assert.equal(card.listed, false, 'Beta has no hours and a short introduction')
  const text = JSON.stringify(card)
  assert.ok(!text.includes('Alpha') && !text.includes('alpha-tutor'), 'nothing of the first tutor')
  assert.ok(text.includes('beta-tutor'))
  currentUser = { id: a.row.id as string, email: 'alpha@example.com' }
  assert.equal((await DashboardPage()).props.data.listing!.listed, true)
})

test('a failed read gives no card (null), never a wrong "Not listed yet"', async () => {
  const t = mine()
  seed([t])
  const broken = { from: (table: string) => (table === 'lessons' ? { select: () => ({ eq: () => ({ is: () => ({ neq: () => ({ gte: () => ({ lt: () => ({ limit: async () => ({ data: null, error: { code: 'XX000' } }) }) }) }) }) }) }) } : db.from(table)) }
  assert.equal(await listing.loadListingCard(broken as never, t.row.id as string, new Date()), null)
  assert.equal(await listing.loadListingCard(db as never, 'nobody', new Date()), null, 'a tutor id with no row')
})

test('the dashboard source asks for the card with the signed-in tutor\'s id and passes it on', () => {
  const src = read('app/(dashboard)/dashboard/page.tsx')
  assert.match(src, /loadListingCard\(supabase as unknown as ListingClient, user!\.id\)/)
  assert.match(src, /^\s+listing,$/m)
  assert.match(read('components/dashboard/DashboardHome.tsx'), /\{data\.listing && <ListingCard card=\{data\.listing\} \/>\}/)
})
