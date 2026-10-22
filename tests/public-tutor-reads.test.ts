// T-0774: the public pages read a tutor on the SERVER, with only the public columns, so the database can stop answering a visitor.
//
// The proof is built on a throwaway Postgres (PGlite) made from EVERY migration file, with the proposed fix (docs/tutors-rls/025_tutors_not_public_proposal.sql)
// ALREADY APPLIED: in that database a visitor's key (role "anon") cannot read the tutors table or the blocked days at all. The REAL pages are rendered
// over it, with the visitor's client and the server's client each running as its own database role. If any page still read `tutors` or
// `availability_exceptions` with the visitor's key, it would get "permission denied" here and the page would break; and whatever a page hands to the
// browser (the markup AND the props of every component) is searched for the private values of the made-up tutors.
// Nothing here reaches a service, uses a real key or a real address (every address is example.com).
import { test, mock, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigrationsBefore, newDb } from './support/local-db.ts'
import { pgliteClient } from './support/pglite-client.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const PROPOSAL = path.join(ROOT, 'docs', 'tutors-rls', '025_tutors_not_public_proposal.sql')

// ---- the database: every migration, then the fix --------------------------------------------------------------------------------------

const A = '11111111-1111-4111-8111-111111111111' // a tutor whose booking page is on (with an Academy member)
const B = '22222222-2222-4222-8222-222222222222' // another tutor, page on
const H = '33333333-3333-4333-8333-333333333333' // a tutor whose booking page is OFF
const MEMBER = '44444444-4444-4444-8444-444444444444'
const STUDENT = '55555555-5555-4555-8555-555555555555'
const STUDENT_EMAIL = 'student.one@example.com'

/** Private columns of `tutors` with made-up values that can be told apart. None of these may reach a visitor. */
const SECRET: Record<string, string> = {
  email: 'a.private@example.com',
  stripe_account_id: 'acct_example_0001',
  polar_subscription_id: 'sub_example_0001',
  polar_checkout_id: 'chk_example_0001',
  google_calendar_refresh_token: 'refresh-token-example-0001',
  google_calendar_id: 'calendar-example-0001',
  custom_domain: 'tutor.example.com',
  push_subscription: '{"endpoint":"https://push.example.com/a","keys":{"auth":"AUTHKEY","p256dh":"P256KEY"}}',
}
/** Shown on the booking pages ON PURPOSE (where the student pays, the contract the student signs); in no other page. */
const PAYMENT: Record<string, string> = {
  paypal_link: 'https://paypal.example.com/a',
  paddle_checkout_link: 'https://pay.example.com/a',
  contract_template: 'CONTRACT-TEXT-OF-TUTOR-A',
}
const REASON = 'Private reason: a medical appointment'
const PRIVATE_NOTE = 'Private note about the student'
const BLOCKED_DAY = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)

let pg: PGlite

before(async () => {
  pg = await newDb()
  await applyMigrationsBefore(pg, 'zzz_after_everything.sql')
  // what the real database has and the migration files do not make (the admin migrate route, and the team tables made by hand)
  await pg.exec(`
    alter table public.tutors add column if not exists trial_enabled boolean default false;
    alter table public.tutors add column if not exists trial_price decimal(10,2);
    create table public.team_members (id uuid primary key, owner_id uuid references public.tutors(id), name text, slug text, bio text, avatar_url text, timezone text, active boolean default true, booking_url_active boolean default true, email text, pay_rate numeric);
    alter table public.availability add column if not exists team_member_id uuid references public.team_members(id);
    alter table public.lessons add column if not exists assigned_to uuid;`)
  const cols = [...Object.keys(SECRET), ...Object.keys(PAYMENT)]
  const vals = [...Object.values(SECRET), ...Object.values(PAYMENT)]
  const add = async (id: string, slug: string, name: string, on: boolean, email: string, extra: Record<string, unknown> = {}) => {
    await pg.query(`insert into auth.users (id, email) values ($1, $2)`, [id, email])
    const base: Record<string, unknown> = { id, slug, name, booking_url_active: on, bio: `About ${name}`, timezone: 'UTC', languages: ['English'], cancellation_hours: 24, default_lesson_price: 30, currency: 'USD', ...extra }
    const keys = [...Object.keys(base), ...cols.filter(c => !(c in base))]
    const values = [...Object.values(base), ...cols.filter(c => !(c in base)).map(c => cols.indexOf(c)).map(i => (cols[i] === 'email' ? email : vals[i]))]
    await pg.query(`insert into public.tutors (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')})`, values)
  }
  await add(A, 'tutor-a', 'Tutor Alpha', true, 'a.private@example.com', { subscription_status: 'academy' })
  await add(B, 'tutor-b', 'Tutor Beta', true, 'b.private@example.com', { subscription_status: 'free' })
  await add(H, 'tutor-hidden', 'Tutor Hidden', false, 'hidden.private@example.com', { subscription_status: 'free' })
  await pg.query(`insert into public.team_members (id, owner_id, name, slug, bio, timezone, email, pay_rate) values ($1, $2, 'Member Mia', 'mia', 'About Mia', 'UTC', 'mia.private@example.com', 12)`, [MEMBER, A])
  for (const t of [A, B, H]) for (const d of [0, 1, 2, 3, 4, 5, 6]) await pg.query(`insert into public.availability (tutor_id, day_of_week, start_time, end_time) values ($1, $2, '09:00', '17:00')`, [t, d])
  await pg.query(`insert into public.availability (tutor_id, day_of_week, start_time, end_time, team_member_id) values ($1, 2, '10:00', '12:00', $2)`, [A, MEMBER])
  await pg.query(`insert into public.availability_exceptions (tutor_id, date, reason) values ($1, $2, $3)`, [A, BLOCKED_DAY, REASON])
  await pg.query(`insert into public.packages (tutor_id, name, lessons_count, price) values ($1, 'Pack of five', 5, 120)`, [A])
  await pg.query(`insert into public.students (id, tutor_id, name, email, phone, notes, status) values ($1, $2, 'Student One', $3, '0900 000 000', $4, 'active')`, [STUDENT, A, STUDENT_EMAIL, PRIVATE_NOTE])
  await pg.query(`insert into public.lessons (tutor_id, student_id, starts_at, ends_at, status, meet_link) values ($1, $2, now() + interval '2 days', now() + interval '2 days 1 hour', 'scheduled', 'https://meet.example.com/x')`, [A, STUDENT])
  // the fix is applied: this is the database after the owner has run docs/tutors-rls/025_tutors_not_public_proposal.sql
  await pg.exec(readFileSync(PROPOSAL, 'utf8'))
})

// ---- the clients the pages get ----------------------------------------------------------------------------------------------------------

let viewer: string | null = null // the signed-in account that opens the page (null: a visitor)
/** What the server's client was asked to read from `tutors` and `availability_exceptions`, by every page. */
const adminReads: { table: string; cols: string }[] = []
/** What the visitor's client was asked to read from those two tables (it must be nothing). */
const visitorReads: { table: string; cols: string }[] = []

const watch = (client: ReturnType<typeof pgliteClient>, log: { table: string; cols: string }[]) => ({
  from: (table: string) => {
    const q = client.from(table)
    if (table !== 'tutors' && table !== 'availability_exceptions') return q
    const select = q.select.bind(q)
    ;(q as unknown as { select: (c?: string) => unknown }).select = (cols = '*') => { log.push({ table, cols }); return select(cols) }
    return q
  },
})

mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => watch(pgliteClient(pg, { role: 'service_role', restStyle: true }), adminReads),
    createClient: async () => ({ ...watch(pgliteClient(pg, { role: 'anon', restStyle: true }), visitorReads), auth: { getUser: async () => ({ data: { user: viewer ? { id: viewer, email: null } : null } }) } }),
  },
})
mock.module('next/navigation', {
  namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, useRouter: () => ({ push() {}, replace() {} }), useSearchParams: () => new URLSearchParams() },
})
process.env.STUDENT_AUTH_SECRET = 'student-auth-secret-for-this-test-only'

const columns = await import('@/lib/public-tutor-columns.ts')
const bookPage = (await import('@/app/book/[slug]/page.tsx')).default
const memberPage = (await import('@/app/book/[slug]/[member]/page.tsx')).default
const embedPage = (await import('@/app/embed/[slug]/page.tsx')).default
const profilePage = (await import('@/app/tutors/[slug]/page.tsx')).default
const studentPage = (await import('@/app/student/dashboard/page.tsx')).default
const { signStudentToken } = await import('@/lib/student-auth.ts')
const { listPublicTutorSlugs } = await import('@/lib/tutor-sitemap.ts')

type Props = { params?: Promise<Record<string, string>>; searchParams?: Promise<Record<string, string>> }
type Page = (props: Props) => Promise<unknown>

/** Everything a page hands on: the markup, and the props of every element (the props of a client component go to the browser). */
async function output(page: unknown, props: Props): Promise<{ html: string; tree: string; element: unknown }> {
  adminReads.length = 0
  visitorReads.length = 0
  const element = await (page as Page)(props)
  return { html: renderToStaticMarkup(element as never), tree: dump(element), element }
}

/** Every value a page puts into the props of any element, as text (the type of an element is left out: it is code, not data). */
function dump(v: unknown, seen = new Set<unknown>()): string {
  if (v === null || v === undefined || typeof v === 'function') return ''
  if (typeof v !== 'object') return JSON.stringify(v)
  if (seen.has(v)) return ''
  seen.add(v)
  if (Array.isArray(v)) return `[${v.map(x => dump(x, seen)).join(',')}]`
  const o = v as Record<string, unknown>
  const entries = '$$typeof' in o ? [['key', o.key], ['props', o.props]] : Object.entries(o)
  return `{${entries.filter(([k]) => !String(k).startsWith('_')).map(([k, x]) => `${JSON.stringify(k)}:${dump(x, seen)}`).join(',')}}`
}
const params = (p: Record<string, string>): Props => ({ params: Promise.resolve(p) })
const everyPage: { name: string; page: unknown; props: () => Props; shows: string }[] = [
  { name: '/book/<slug>', page: bookPage, props: () => params({ slug: 'tutor-a' }), shows: 'Tutor Alpha' },
  { name: '/book/<slug>/<member>', page: memberPage, props: () => params({ slug: 'tutor-a', member: 'mia' }), shows: 'Member Mia' },
  { name: '/embed/<slug>', page: embedPage, props: () => params({ slug: 'tutor-a' }), shows: 'Tutor Alpha' },
  { name: '/tutors/<slug>', page: profilePage, props: () => params({ slug: 'tutor-a' }), shows: 'Tutor Alpha' },
  { name: '/student/dashboard', page: studentPage, props: () => ({ searchParams: Promise.resolve({ token: signStudentToken(STUDENT_EMAIL) }) }), shows: 'Tutor Alpha' },
]

// ---- the database really is closed -------------------------------------------------------------------------------------------------------

test('the database under test is the CLOSED one: a visitor\'s key reads nothing from tutors or availability_exceptions, the server\'s key reads everything', async () => {
  const visitor = pgliteClient(pg, { role: 'anon' })
  const server = pgliteClient(pg, { role: 'service_role' })
  for (const table of ['tutors', 'availability_exceptions']) {
    const closed = await visitor.from(table).select('*')
    assert.equal(closed.data, null, `${table}: nothing for a visitor`)
    assert.match(String(closed.error?.message), /permission denied/i, `${table}: the visitor is refused`)
  }
  assert.equal((await server.from('tutors').select('id')).data?.length, 3)
  // the tables that stay public are still readable, so the pages can use them
  assert.ok(((await visitor.from('availability').select('tutor_id')).data ?? []).length > 0, 'the weekly hours stay public')
  assert.equal(((await visitor.from('packages').select('name')).data ?? []).length, 1, 'active packages stay public')
})

// ---- the real pages over it -------------------------------------------------------------------------------------------------------------

for (const p of everyPage) {
  test(`${p.name}: opens over the closed database, reads tutors and blocked days only on the server, and no private value reaches the browser`, async () => {
    viewer = null
    const { html, tree } = await output(p.page, p.props())
    assert.ok((html + tree).includes(p.shows), `the page shows ${p.shows}`)
    assert.deepEqual(visitorReads, [], 'the visitor\'s client was never asked for the tutors table or the blocked days')
    assert.ok(adminReads.some(r => r.table === 'tutors'), 'the tutor was read by the server')
    for (const [column, value] of Object.entries(SECRET)) {
      for (const [where, text] of [['markup', html], ['props', tree]] as const) assert.equal(text.includes(value), false, `${p.name}: ${column} reached the ${where}`)
    }
    assert.equal((html + tree).includes(REASON), false, 'the tutor\'s note for a blocked day')
    assert.equal((html + tree).includes(PRIVATE_NOTE), false, 'a private note about a student')
    assert.equal((html + tree).includes('0900 000 000'), false)
    assert.equal((html + tree).includes('mia.private@example.com'), false, 'a team member\'s address')
    // the payment/contract columns: on the booking pages (the student pays and signs there), nowhere else
    const booking = ['/book/<slug>', '/book/<slug>/<member>', '/embed/<slug>'].includes(p.name)
    for (const [column, value] of Object.entries(PAYMENT)) {
      assert.equal((html + tree).includes(value), booking, `${p.name}: ${column} ${booking ? 'is shown where the student pays and signs' : 'must not be on this page'}`)
    }
  })

  test(`${p.name}: every column the server was asked for is on the public list of that page; never *`, async () => {
    viewer = null
    await output(p.page, p.props())
    const allowed = new Set<string>(columns.PUBLIC_TUTOR_COLUMNS)
    const lists = new Set([columns.BOOKING_PAGE_COLUMNS, columns.MEMBER_PAGE_COLUMNS, columns.EMBED_PAGE_COLUMNS, columns.PROFILE_PAGE_COLUMNS, columns.STUDENT_PAGE_COLUMNS])
    // the plan and the two choices of the booking line are read apart and turned into a yes/no or a list of lengths before they leave
    const apart = new Set(['subscription_status', 'hide_branding', 'lesson_durations, default_lesson_duration'])
    for (const r of adminReads) {
      if (r.table === 'availability_exceptions') { assert.equal(r.cols, 'date', 'blocked days: the date only'); continue }
      assert.notEqual(r.cols, '*', 'tutors is never read with *')
      if (apart.has(r.cols)) continue
      assert.ok(lists.has(r.cols), `${p.name}: tutors read with an unlisted set of columns: ${r.cols}`)
      for (const c of columns.splitColumns(r.cols)) assert.ok(allowed.has(c) || (columns.PAYMENT_COLUMNS as readonly string[]).includes(c), `${p.name}: ${c} is not a public column`)
    }
  })
}

test('the blocked days reach the booking page as dates only: the date is there, the tutor\'s note is not', async () => {
  viewer = null
  for (const [page, props] of [[bookPage, params({ slug: 'tutor-a' })], [embedPage, params({ slug: 'tutor-a' })], [memberPage, params({ slug: 'tutor-a', member: 'mia' })]] as const) {
    const { tree } = await output(page, props)
    assert.ok(tree.includes(`"blockedDates":["${BLOCKED_DAY}"]`), 'the blocked date is passed to the booking form')
    assert.equal(tree.includes(REASON), false)
  }
})

test('the booking form is given only the public columns of the tutor, and the Stripe account id is not one of them', async () => {
  viewer = null
  const { element } = await output(bookPage, params({ slug: 'tutor-a' }))
  const found: Record<string, unknown>[] = []
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (node && typeof node === 'object') {
      const props = (node as { props?: Record<string, unknown> }).props
      if (props && props.tutor && typeof props.tutor === 'object') found.push(props.tutor as Record<string, unknown>)
      if (props) walk(props.children)
    }
  }
  walk(element)
  assert.equal(found.length, 1, 'one booking form')
  const allowed = new Set(columns.splitColumns(columns.BOOKING_PAGE_COLUMNS))
  assert.deepEqual(Object.keys(found[0]).filter(k => !allowed.has(k)), [], 'no column outside the booking list')
  for (const never of columns.PRIVATE_TUTOR_COLUMNS) assert.equal(never in found[0], false, never)
})

// ---- a tutor whose page is off ----------------------------------------------------------------------------------------------------------

test('a tutor whose booking page is off does not exist for a visitor, on every public page (the rule the database policy kept, now kept in code)', async () => {
  viewer = null
  for (const [name, page, props] of [
    ['book', bookPage, params({ slug: 'tutor-hidden' })], ['embed', embedPage, params({ slug: 'tutor-hidden' })], ['profile', profilePage, params({ slug: 'tutor-hidden' })],
    ['member', memberPage, params({ slug: 'tutor-hidden', member: 'mia' })],
  ] as const) await assert.rejects(() => output(page, props), /NEXT_NOT_FOUND/, name)
  viewer = B // another signed-in tutor
  await assert.rejects(() => output(profilePage, params({ slug: 'tutor-hidden' })), /NEXT_NOT_FOUND/, 'another tutor')
  viewer = H // the tutor themselves: their own preview of the profile
  const own = await output(profilePage, params({ slug: 'tutor-hidden' }))
  assert.ok(own.html.includes('Tutor Hidden'))
  assert.equal((own.html + own.tree).includes('hidden.private@example.com'), false)
  await assert.rejects(() => output(bookPage, params({ slug: 'tutor-hidden' })), /NEXT_NOT_FOUND/, 'the booking page is never shown for an off page, even to its tutor')
  viewer = null
})

test('a slug that does not exist is not found', async () => {
  for (const page of [bookPage, embedPage, profilePage]) await assert.rejects(() => output(page, params({ slug: 'nobody-here' })), /NEXT_NOT_FOUND/)
})

// ---- the sitemap -----------------------------------------------------------------------------------------------------------------------

test('the sitemap list: the server reads the slug column only, of the tutors whose page is on', async () => {
  adminReads.length = 0
  const client = watch(pgliteClient(pg, { role: 'service_role' }), adminReads) as never
  const slugs = await listPublicTutorSlugs(client)
  assert.deepEqual(slugs, ['tutor-a', 'tutor-b'], 'the hidden tutor is not listed')
  assert.deepEqual(adminReads, [{ table: 'tutors', cols: 'slug' }])
  // and a visitor's key gets nothing from the same read, so a sitemap built with it would be empty
  assert.deepEqual(await listPublicTutorSlugs(pgliteClient(pg, { role: 'anon' }) as never), [])
})
