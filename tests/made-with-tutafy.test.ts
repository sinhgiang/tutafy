// T-0717: the small "Made with Tutafy" line on a tutor's public booking pages. The REAL code runs here:
//   - src/lib/branding.ts: who sees the line (every Free tutor always; a paid tutor until they turn it off), where the link goes,
//   - the REAL pages /book/<slug>, /book/<slug>/<member> and /embed/<slug> rendered to HTML over an in-memory database,
//   - the Settings page source (the switch, the plan gate, the separate write).
// The column (migration 021) is tried on a throwaway Postgres in tests/hide-branding-migration.test.ts. Nothing here reaches a service.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createFakeDb, type FakeDb } from './support/fake-db.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

let db: FakeDb | { from: (t: string) => unknown }
mock.module(pathToFileURL(path.join(SRC, 'lib/supabase/server.ts')).href, {
  namedExports: {
    createAdminClient: () => db,
    createClient: async () => ({ from: (t: string) => db.from(t), auth: { getUser: async () => ({ data: { user: null } }) } }),
  },
})
mock.module('next/navigation', {
  namedExports: { notFound: () => { throw new Error('NEXT_NOT_FOUND') }, useRouter: () => ({ push() {}, replace() {} }), useSearchParams: () => new URLSearchParams() },
})

const branding = await import('@/lib/branding.ts')
const bookPage = (await import('@/app/book/[slug]/page.tsx')).default
const memberPage = (await import('@/app/book/[slug]/[member]/page.tsx')).default
const embedPage = (await import('@/app/embed/[slug]/page.tsx')).default
const { MadeWithTutafy } = await import('@/components/MadeWithTutafy.tsx')

// ---- the rule ---------------------------------------------------------------------------------------------------------------------

test('who sees the line: a Free tutor always (whatever the column says), a paid tutor unless they turned it off', () => {
  const show = (plan: string | null | undefined, hideBranding: boolean | null | undefined) => branding.showMadeWithBadge({ plan, hideBranding })
  for (const hide of [false, true, null, undefined]) {
    assert.equal(show('free', hide), true, `free, column ${hide}: shown`)
    assert.equal(show(null, hide), true, `no plan, column ${hide}: shown`)
    assert.equal(show('cancelled', hide), true, `an unknown plan counts as Free, column ${hide}`)
  }
  for (const plan of ['pro', 'academy']) {
    assert.equal(show(plan, false), true, `${plan} who did not turn it off: shown`)
    assert.equal(show(plan, null), true)
    assert.equal(show(plan, undefined), true)
    assert.equal(show(plan, true), false, `${plan} who turned it off: hidden`)
  }
})

test('the link: the home page of the main site, a new tab, a source for each place, and the same source as utm so the visitor tracking counts it', () => {
  const page = new URL(branding.madeWithHref('booking-page'))
  assert.equal(`${page.origin}${page.pathname}`, 'https://www.tutafy.com/')
  assert.equal(page.searchParams.get('ref'), 'booking-page')
  assert.equal(page.searchParams.get('utm_source'), 'made-with-tutafy')
  assert.equal(page.searchParams.get('utm_medium'), 'booking-page')
  assert.equal(page.searchParams.get('utm_campaign'), 'tutor-badge')
  const embed = new URL(branding.madeWithHref('booking-embed'))
  assert.equal(embed.searchParams.get('ref'), 'booking-embed')
  assert.equal(embed.searchParams.get('utm_medium'), 'booking-embed')
  assert.equal(branding.MADE_WITH_TEXT, 'Made with Tutafy')
  // what the visitor tracking keeps of a utm value: plain letters, digits and dashes
  for (const v of ['made-with-tutafy', 'booking-page', 'booking-embed', 'tutor-badge']) assert.match(v, /^[A-Za-z0-9._\-+ ]+$/)
})

test('loadShowMadeWith: reads the plan and the column apart; a missing column or a failed read keeps the line', async () => {
  const ok = (row: Record<string, unknown>) => createFakeDb({ tutors: [{ id: 'T', ...row }] })
  assert.equal(await branding.loadShowMadeWith(ok({ subscription_status: 'free' }), 'T'), true)
  assert.equal(await branding.loadShowMadeWith(ok({ subscription_status: 'free', hide_branding: true }), 'T'), true, 'a Free tutor cannot turn it off')
  assert.equal(await branding.loadShowMadeWith(ok({ subscription_status: 'pro' }), 'T'), true)
  assert.equal(await branding.loadShowMadeWith(ok({ subscription_status: 'pro', hide_branding: true }), 'T'), false)
  assert.equal(await branding.loadShowMadeWith(ok({ subscription_status: 'academy', hide_branding: true }), 'T'), false)
  // the database has no such column yet: only that read answers an error
  const noColumn = { from: (t: string) => ({ select: (cols: string) => ({ eq: () => ({ single: async () => (cols === 'hide_branding' ? { data: null, error: { code: '42703' } } : { data: { subscription_status: 'pro' }, error: null }) }) }) }) }
  assert.equal(await branding.loadShowMadeWith(noColumn, 'T'), true, 'column missing: the line stays even for a paid tutor')
  assert.equal(await branding.loadShowMadeWith({ from: () => { throw new Error('network down') } }, 'T'), true)
  assert.equal(await branding.loadShowMadeWith(ok({ subscription_status: 'pro', hide_branding: 'true' }), 'T'), true, 'only a real true turns it off')
})

// ---- the real pages -----------------------------------------------------------------------------------------------------------------

const T_FREE = '40000000-0000-4000-8000-0000000000a1'
const T_FREE_HIDE = '40000000-0000-4000-8000-0000000000a2' // Free, but the column says true
const T_PRO = '40000000-0000-4000-8000-0000000000b1'
const T_PRO_OFF = '40000000-0000-4000-8000-0000000000b2'
const T_ACADEMY_OFF = '40000000-0000-4000-8000-0000000000c1'
const base = { booking_url_active: true, currency: 'USD', default_lesson_price: 25, timezone: 'UTC', languages: [], cancellation_hours: 24, buffer_minutes: 0 }

beforeEach(() => {
  db = createFakeDb({
    tutors: [
      { id: T_FREE, name: 'Tutor Free', slug: 'tutor-free', subscription_status: 'free', ...base },
      { id: T_FREE_HIDE, name: 'Tutor Free Hide', slug: 'tutor-free-hide', subscription_status: 'free', hide_branding: true, ...base },
      { id: T_PRO, name: 'Tutor Pro', slug: 'tutor-pro', subscription_status: 'pro', ...base },
      { id: T_PRO_OFF, name: 'Tutor Pro Off', slug: 'tutor-pro-off', subscription_status: 'pro', hide_branding: true, ...base },
      { id: T_ACADEMY_OFF, name: 'Tutor Academy Off', slug: 'tutor-academy-off', subscription_status: 'academy', hide_branding: true, ...base },
    ],
    team_members: [{ id: 'm1', owner_id: T_ACADEMY_OFF, name: 'Member Mia', slug: 'mia', bio: null, avatar_url: null, timezone: 'UTC', active: true, booking_url_active: true },
      { id: 'm2', owner_id: T_FREE, name: 'Member Max', slug: 'max', bio: null, avatar_url: null, timezone: 'UTC', active: true, booking_url_active: true }],
    availability: [T_FREE, T_FREE_HIDE, T_PRO, T_PRO_OFF, T_ACADEMY_OFF].map((tutor_id, i) => ({ id: 'a' + i, tutor_id, team_member_id: null, day_of_week: 1, start_time: '09:00', end_time: '17:00' })),
  })
})

type Page = (props: { params: Promise<Record<string, string>> }) => Promise<React.ReactElement>
const render = async (page: unknown, params: Record<string, string>) => renderToStaticMarkup(await (page as Page)({ params: Promise.resolve(params) }))
const LINK = /<a href="([^"]*)" target="_blank" rel="noopener" data-testid="made-with-tutafy" class="[^"]*">Made with Tutafy<\/a>/
const lines = (html: string) => (html.match(/data-testid="made-with-tutafy"/g) ?? []).length

test('/book/<slug> of a Free tutor shows "Made with Tutafy": one link, to the home page, in a new tab, with the source', async () => {
  const html = await render(bookPage, { slug: 'tutor-free' })
  assert.equal(lines(html), 1)
  const m = LINK.exec(html)!
  assert.ok(m, 'the link has the exact shape: a new tab, rel noopener')
  const href = new URL(m[1].replace(/&amp;/g, '&'))
  assert.equal(`${href.origin}${href.pathname}`, 'https://www.tutafy.com/')
  assert.equal(href.searchParams.get('ref'), 'booking-page')
  assert.equal(href.searchParams.get('utm_source'), 'made-with-tutafy')
  assert.doesNotMatch(m[0], /noreferrer/, 'the referrer is kept, so the visit can be attributed')
})

test('/embed/<slug> of a Free tutor shows it too, with its own source; the old unlinked "Powered by Tutafy" is gone', async () => {
  const html = await render(embedPage, { slug: 'tutor-free' })
  assert.equal(lines(html), 1)
  assert.equal(new URL(LINK.exec(html)![1].replace(/&amp;/g, '&')).searchParams.get('ref'), 'booking-embed')
  assert.doesNotMatch(html, /Powered by Tutafy/)
  assert.equal(lines(await render(embedPage, { slug: 'tutor-pro' })), 1, 'a paid tutor who did not turn it off keeps it')
})

test('a team member\'s page /book/<slug>/<member> shows it by the owning tutor\'s plan', async () => {
  assert.equal(lines(await render(memberPage, { slug: 'tutor-free', member: 'max' })), 1)
  assert.equal(lines(await render(memberPage, { slug: 'tutor-academy-off', member: 'mia' })), 0)
})

test('a Free tutor shows it even if their column says true: the plan decides first', async () => {
  assert.equal(lines(await render(bookPage, { slug: 'tutor-free-hide' })), 1)
  assert.equal(lines(await render(embedPage, { slug: 'tutor-free-hide' })), 1)
})

test('a paid tutor shows it until they turn it off; once off, the page, the embed window and the team page show none', async () => {
  assert.equal(lines(await render(bookPage, { slug: 'tutor-pro' })), 1, 'Pro, not turned off')
  for (const slug of ['tutor-pro-off', 'tutor-academy-off']) {
    assert.equal(lines(await render(bookPage, { slug })), 0, `${slug} page`)
    assert.equal(lines(await render(embedPage, { slug })), 0, `${slug} embed`)
  }
})

test('turning it off moves nothing: the page is identical except for the link itself, on the booking page and on the embed window', async () => {
  // the same tutor twice, once with the line, once without: the HTML differs only by the anchor
  const strip = (html: string) => html.replace(LINK, '')
  for (const [page, params, slug] of [[bookPage, { slug: 'tutor-pro' }, 'tutor-pro'], [embedPage, { slug: 'tutor-pro' }, 'tutor-pro']] as const) {
    const shown = await render(page, params)
    const row = (db as FakeDb).tables.tutors.find(t => t.slug === slug)!
    row.hide_branding = true
    const hidden = await render(page, params)
    row.hide_branding = false
    assert.equal(lines(shown), 1)
    assert.equal(lines(hidden), 0)
    assert.equal(strip(shown), hidden, 'the strip keeps its height and place; only the link is gone')
    assert.match(hidden, /data-testid="made-with-strip"/, 'the empty strip is still there')
  }
})

test('the line cannot cover the booking button: it comes after the booking form, in the normal flow, never fixed, floating or sticky', async () => {
  for (const [page, params] of [[bookPage, { slug: 'tutor-free' }], [embedPage, { slug: 'tutor-free' }]] as const) {
    const html = await render(page, params)
    const form = html.indexOf('Session length')
    const strip = html.indexOf('data-testid="made-with-strip"')
    assert.ok(form >= 0 && strip > form, 'the booking form comes first')
    // nothing after the form can reach back over it: the strip is a plain block with a fixed height
    const stripTag = html.slice(html.lastIndexOf('<div', strip), html.indexOf('>', strip) + 1)
    assert.match(stripTag, /class="h-14 flex items-center justify-center"/)
  }
  const src = read('src/components/MadeWithTutafy.tsx').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n') // the code, not its comments
  for (const word of ['fixed', 'absolute', 'sticky', 'z-', 'translate', 'transform']) assert.ok(!src.includes(word), `the line does not use ${word}`)
})

test('a page does not hand the plan or the column to the browser', async () => {
  const html = await render(bookPage, { slug: 'tutor-pro' })
  assert.doesNotMatch(html, /subscription_status|hide_branding/)
})

test('the component: with show true it is a small link, with show false an empty strip of the same size', () => {
  const on = renderToStaticMarkup(MadeWithTutafy({ show: true, surface: 'booking-page' }))
  const off = renderToStaticMarkup(MadeWithTutafy({ show: false, surface: 'booking-page' }))
  assert.match(on, /Made with Tutafy/)
  assert.equal(on.replace(LINK, ''), off)
  assert.equal(off, '<div data-testid="made-with-strip" class="h-14 flex items-center justify-center"></div>')
})

test('no text in the page-facing files is in another language, and no address is typed there', () => {
  for (const f of ['src/lib/branding.ts', 'src/components/MadeWithTutafy.tsx']) {
    const src = read(f)
    assert.doesNotMatch(src, /[ạảãàáâậầấẩẫăắằặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i, f)
    assert.doesNotMatch(src, /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/, `${f} types no address`)
  }
})

// ---- Settings ----------------------------------------------------------------------------------------------------------------------

test('Settings: a switch in the Booking page tab, switchable only on a paid plan, written apart and only when changed, with a plain message if the column is missing', () => {
  const src = read('src/app/(dashboard)/settings/page.tsx')
  assert.match(src, /Show &quot;Made with Tutafy&quot; on my booking page/)
  assert.match(src, /const paid = hasPlan\(subscriptionStatus, 'pro'\)/)
  assert.match(src, /disabled=\{!paid\}/, 'a Free tutor sees the switch on and cannot change it')
  assert.match(src, /const shown = !\(paid && form\.hide_branding\)/, 'shown unless a PAID tutor turned it off')
  assert.match(src, /Pro and Academy plans can turn it off/)
  assert.match(src, /hide_branding: \(data as any\)\.hide_branding === true/, 'read from the loaded row; a missing column reads as false')
  assert.match(src, /const \{ currency, lesson_durations, default_lesson_duration, hide_branding, \.\.\.rest \} = form/, 'left out of the main update, because its column may not exist yet')
  assert.match(src, /if \(hide_branding !== savedBranding\) \{\s*const \{ error: brandingError \} = await supabase\.from\('tutors'\)\.update\(\{ hide_branding \}\)\.eq\('id', user\.id\)/, 'written alone, only when changed, on the signed-in tutor\'s own row')
  assert.match(src, /This option is not available yet\. Your other settings are saved\./)
})
