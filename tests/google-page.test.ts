// T-0637: the Google tag must never report an access code, an id or a query string.
// gtag.js reports the real address of the page (document.location) unless told otherwise,
// and /portal/<student access code> opens a student's portal. These tests run the real
// start-up script of the tag in a fake browser (node:vm) on real-looking addresses and read
// everything that lands in dataLayer.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8')

const tag = await import('@/lib/google-tag.ts')
const gp = await import('@/lib/google-page.ts')

const ORIGIN = 'https://www.tutafy.com'
const GA4 = 'G-QYDSQ8W6TX'
const ADS = 'AW-18335043737'
const UUID = '3f2b8c1e-9a4d-4e57-8b6a-0c1d2e3f4a5b'
const SECRET = 'abc123secret'

// a fake browser window is loosely typed on purpose: the tag script reads and writes whatever it likes on it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fake = Record<string, any>

/** A fake browser showing `url`, with the real tag start-up script run in it (the page params are built the way Analytics.tsx builds them). */
function browser(url: string, opts: { referrer?: string; title?: string; start?: boolean } = {}) {
  const listeners: Record<string, Array<() => void>> = {}
  const ctx: Fake = {}
  ctx.window = ctx
  ctx.URL = URL
  const go = (to: string) => {
    const u = new URL(to, ctx.location?.href ?? ORIGIN)
    ctx.location = { href: u.href, origin: u.origin, pathname: u.pathname, search: u.search }
  }
  go(url)
  ctx.document = { referrer: opts.referrer ?? '', title: opts.title ?? 'A page title' }
  ctx.history = { pushState: (_s: unknown, _t: unknown, to: string) => go(to), replaceState: (_s: unknown, _t: unknown, to: string) => go(to) }
  ctx.addEventListener = (name: string, fn: () => void) => { (listeners[name] ??= []).push(fn) }
  const l = ctx.location
  const page = gp.googlePageParams({ origin: l.origin, pathname: l.pathname, search: l.search, referrer: ctx.document.referrer, title: ctx.document.title })
  vm.runInNewContext(tag.googleTagBootstrapScript([GA4, ADS], page), ctx)
  /** What the address bar does: a link inside the app (pushState) or the back button (popstate). */
  return {
    ctx,
    push: (to: string) => ctx.history.pushState(null, '', to),
    back: (to: string) => { go(to); for (const f of listeners.popstate ?? []) f() },
    layer: () => Array.from(ctx.dataLayer as ArrayLike<ArrayLike<unknown>>).map(a => Array.from(a)) as unknown[][],
    text: () => JSON.stringify(Array.from(ctx.dataLayer as ArrayLike<ArrayLike<unknown>>).map(a => Array.from(a))),
  }
}

/** What a visitor who accepted cookies makes the tag send on this address: the start-up, the page view, the two events and the Ads conversion. */
function everythingSentOn(url: string, referrer = '') {
  const b = browser(url, { referrer })
  tag.sendGooglePageView(b.ctx, 'accepted')
  tag.sendGaEvent(b.ctx, 'accepted', 'sign_up')
  tag.sendGaEvent(b.ctx, 'accepted', 'begin_checkout', tag.beginCheckoutParams('pro'))
  tag.sendAdsSignupConversion(b.ctx, 'accepted')
  return b
}

// ---- the path Google may see ------------------------------------------------------------------

test('googlePagePath: a code or an id never survives; a public page keeps its path', () => {
  const cases: Array<[string, string]> = [
    [`/portal/${SECRET}`, '/portal/[token]'],
    [`/portal/${SECRET}/messages`, '/portal/[token]/messages'],
    [`/portal/${SECRET}/lessons/${UUID}`, '/portal/[token]/lessons/[id]'],
    [`/portal/${SECRET}/lessons/${UUID}/quiz`, '/portal/[token]/lessons/[id]/quiz'],
    [`/portal/${SECRET}/lessons/${UUID}/room`, '/portal/[token]/lessons/[id]/room'],
    [`/portal/${SECRET}/certificate/${UUID}`, '/portal/[token]/certificate/[id]'],
    [`/portal/parent/${SECRET}`, '/portal/parent/[token]'],
    [`/students/${UUID}`, '/students'],
    [`/students/${UUID}/edit`, '/students'],
    [`/lessons/${UUID}/room`, '/lessons'],
    [`/messages/${UUID}`, '/messages'],
    ['/book/sarah-test?x=1', '/book/[slug]'],
    ['/book/sarah-test/some-member', '/book/[slug]/[member]'],
    ['/embed/sarah-test', '/embed/[slug]'],
    [`/super-admin/people/${UUID}`, '/super-admin'],
    ['/admin/tutors', '/admin'],
    ['/student/dashboard?token=hmac.value', '/student/[page]'],
    ['/student/login', '/student/login'],
    ['/', '/'],
    ['/blog', '/blog'],
    ['/blog/tutafy-review', '/blog/tutafy-review'],
    ['/about', '/about'],
    ['/register?ref=SARAH10', '/register'],
    ['/tutors/sarah-test', '/tutors'],
    ['/dashboard', '/dashboard'],
    ['/settings?tab=payments#x', '/settings'],
    ['/never/heard/of/it/abc123', '/[other]'],
    ['//evil.example.com/portal/x', '/[other]'],
    ['portal/abc', '/[other]'],
  ]
  for (const [input, want] of cases) assert.equal(gp.googlePagePath(input), want, input)
  for (const input of [`/portal/${SECRET}`, `/students/${UUID}`, `/portal/parent/${SECRET}/lessons/${UUID}`]) {
    const out = gp.googlePagePath(input)
    assert.ok(!out.includes(SECRET) && !out.includes(UUID), `${input} -> ${out}`)
  }
  for (const nothing of [null, undefined, '', 42 as unknown as string]) assert.equal(gp.googlePagePath(nothing), '/[other]')
})

test('only campaign parameters survive, and only on a page that is not private', () => {
  assert.equal(gp.googleCampaignQuery('/blog/x', '?x=1'), '')
  assert.equal(gp.googleCampaignQuery('/blog/x', '?utm_source=google&utm_medium=cpc&gclid=Cj0KCQ&token=zzz&x=1'), '?utm_source=google&utm_medium=cpc&gclid=Cj0KCQ')
  assert.equal(gp.googleCampaignQuery('/', '?utm_source=a b'), '', 'a value with a space or a symbol is dropped')
  assert.equal(gp.googleCampaignQuery('/', `?utm_source=${'a'.repeat(101)}`), '', 'a long value is dropped')
  assert.equal(gp.googleCampaignQuery(`/portal/${SECRET}`, '?utm_source=google&gclid=x'), '', 'a private page keeps no parameter at all')
  assert.equal(gp.googleCampaignQuery('/students/' + UUID, '?gclid=x'), '')
})

test('the title is sent only for a public page; the referrer from one of our own pages is written like a page', () => {
  const home = gp.googlePageParams({ origin: ORIGIN, pathname: '/', title: 'Tutafy' })
  assert.equal(home.page_title, 'Tutafy')
  const student = gp.googlePageParams({ origin: ORIGIN, pathname: `/students/${UUID}`, title: 'Maria Santos - Tutafy' })
  assert.equal(student.page_title, '/students', 'a student name in a title is not sent')
  const fromPortal = gp.googlePageParams({ origin: ORIGIN, pathname: '/blog/x', referrer: `${ORIGIN}/portal/${SECRET}/messages?x=1`, title: 't' })
  assert.equal(fromPortal.page_referrer, `${ORIGIN}/portal/[token]/messages`)
  assert.equal(gp.googleReferrer('https://www.google.com/search?q=tutafy+secret', ORIGIN), 'https://www.google.com/search', 'an outside site keeps no query')
  assert.equal(gp.googleReferrer('not a url', ORIGIN), '')
  assert.equal(gp.googleReferrer('', ORIGIN), '')
})

// ---- what really reaches dataLayer -----------------------------------------------------------

const BAD_ADDRESSES: Array<{ url: string; mustNotAppear: string[] }> = [
  { url: `/portal/${SECRET}`, mustNotAppear: [SECRET] },
  { url: `/portal/${SECRET}/lessons/${UUID}/quiz?answer=1`, mustNotAppear: [SECRET, UUID, 'answer'] },
  { url: `/portal/parent/${SECRET}`, mustNotAppear: [SECRET] },
  { url: `/students/${UUID}`, mustNotAppear: [UUID] },
  { url: `/students/${UUID}/edit?tab=x`, mustNotAppear: [UUID, 'tab=x'] },
  { url: '/book/sarah-test?x=1', mustNotAppear: ['x=1', '?'] },
  { url: '/student/dashboard?token=hmac.value', mustNotAppear: ['hmac.value', 'token='] },
  { url: '/register?ref=SARAH10&email=a%40example.com', mustNotAppear: ['SARAH10', 'email', 'example.com'] },
  { url: '/upgrade/success?session_id=cs_test_123', mustNotAppear: ['cs_test_123', 'session_id'] },
  { url: '/blog/tutafy-review?utm_source=google&token=zzzsecret#frag', mustNotAppear: ['zzzsecret', 'token=', 'frag'] },
]

test('dataLayer never holds an access code, an id or a query: start-up, page view, events and the Ads conversion on each kind of address', () => {
  for (const { url, mustNotAppear } of BAD_ADDRESSES) {
    const b = everythingSentOn(url, `${ORIGIN}/portal/${SECRET}/messages?from=${UUID}`)
    const text = b.text()
    for (const bad of mustNotAppear) assert.ok(!text.includes(bad), `${url}: dataLayer holds "${bad}"\n${text}`)
    assert.ok(!text.includes(UUID) && !text.includes(SECRET), `${url}: an id or a code is in dataLayer (the referrer was a portal page)`)
    assert.ok(!text.includes(encodeURIComponent(url)), url)
    // the real full address is nowhere: every page_location written is origin + safe path (+ campaign parameters)
    for (const e of b.layer().flatMap(c => c.filter(x => x && typeof x === 'object'))) {
      const loc = (e as { page_location?: string }).page_location
      if (loc) assert.ok(loc === `${ORIGIN}${gp.googlePagePath(new URL(url, ORIGIN).pathname)}` || loc.startsWith(`${ORIGIN}/`), loc)
    }
  }
})

test('a page that opens private data sends no page view and no event at all (and the tag is not told to load there)', () => {
  for (const url of [`/portal/${SECRET}`, `/portal/parent/${SECRET}`, `/students/${UUID}`, `/lessons/${UUID}`, '/student/dashboard?token=x', '/admin/tutors', `/super-admin/people/${UUID}`, '/upgrade/success?session_id=cs_1']) {
    const b = everythingSentOn(url)
    const names = b.layer().filter(c => c[0] === 'event').map(c => c[1])
    assert.deepEqual(names, [], `${url} sent ${names}`)
    assert.equal(tag.googleTagPlan({ consent: 'accepted', path: new URL(url, ORIGIN).pathname }).loaderId, null, `${url}: the tag must not load here`)
  }
  assert.equal(tag.googleTagPlan({ consent: 'accepted', path: '/blog/x' }).loaderId, tag.DEFAULT_GA4_ID)
  assert.equal(tag.googleTagPlan({ consent: 'accepted', path: '/dashboard' }).loaderId, tag.DEFAULT_GA4_ID, 'the tutor home page itself is not private')
  assert.equal(tag.googleTagPlan({ consent: 'accepted' }).loaderId, tag.DEFAULT_GA4_ID, 'no path given: as before')
})

test('every config call has send_page_view false, so gtag.js sends no page view of its own with the real address', () => {
  const b = browser(`/blog/tutafy-review?token=${SECRET}`)
  const configs = b.layer().filter(c => c[0] === 'config')
  assert.deepEqual(configs.map(c => c[1]), [GA4, ADS])
  for (const c of configs) {
    const params = c[2] as Record<string, unknown>
    assert.equal(params.send_page_view, false, String(c[1]))
    assert.equal(params.page_location, `${ORIGIN}/blog/tutafy-review`)
    assert.equal(params.page_path, '/blog/tutafy-review')
  }
  // the defaults for every later event (scroll, click, ...) are the safe address too
  const set = b.layer().find(c => c[0] === 'set')!
  assert.equal((set[1] as Record<string, unknown>).page_location, `${ORIGIN}/blog/tutafy-review`)
  assert.ok(!b.text().includes(SECRET))
  // the start-up script without a page (an old caller) is still safe: send_page_view is false
  const ctx: Fake = {}
  ctx.window = ctx
  vm.runInNewContext(tag.googleTagBootstrapScript([GA4]), ctx)
  const cfg = Array.from(ctx.dataLayer as ArrayLike<ArrayLike<unknown>>).map(a => Array.from(a)).find(c => c[0] === 'config')!
  assert.equal((cfg[2] as Record<string, unknown>).send_page_view, false)
})

test('public pages are still measured with their real path: home, blog, a post, the register page', () => {
  const want: Array<[string, string, string]> = [
    ['/', '/', `${ORIGIN}/`],
    ['/blog', '/blog', `${ORIGIN}/blog`],
    ['/blog/how-to-price-tutoring-lessons', '/blog/how-to-price-tutoring-lessons', `${ORIGIN}/blog/how-to-price-tutoring-lessons`],
    ['/register?x=1', '/register', `${ORIGIN}/register`],
    ['/about', '/about', `${ORIGIN}/about`],
  ]
  for (const [url, pagePath, location] of want) {
    const b = browser(url)
    tag.sendGooglePageView(b.ctx, 'accepted')
    const views = b.layer().filter(c => c[0] === 'event' && c[1] === 'page_view')
    assert.equal(views.length, 1, url)
    const params = views[0][2] as Record<string, string>
    assert.equal(params.page_path, pagePath, url)
    assert.equal(params.page_location, location, url)
  }
})

test('an ad click still counts: utm_* and gclid on a public page go through, a code beside them does not', () => {
  const b = browser(`/?utm_source=google&utm_medium=cpc&utm_campaign=spring&gclid=Cj0KCQiA&access=${SECRET}`)
  tag.sendGooglePageView(b.ctx, 'accepted')
  const view = b.layer().find(c => c[0] === 'event' && c[1] === 'page_view')![2] as Record<string, string>
  assert.equal(view.page_location, `${ORIGIN}/?utm_source=google&utm_medium=cpc&utm_campaign=spring&gclid=Cj0KCQiA`)
  assert.ok(!b.text().includes(SECRET))
})

test('page changes inside the app: each page view names the new safe page, the referrer is the previous safe page', () => {
  const b = browser('/blog/how-to-price-tutoring-lessons')
  tag.sendGooglePageView(b.ctx, 'accepted')
  b.push(`/students/${UUID}`) // a tutor opens a student: nothing is sent
  tag.sendGooglePageView(b.ctx, 'accepted')
  b.push('/dashboard')
  tag.sendGooglePageView(b.ctx, 'accepted')
  const views = b.layer().filter(c => c[0] === 'event' && c[1] === 'page_view').map(c => c[2] as Record<string, string>)
  assert.deepEqual(views.map(v => v.page_path), ['/blog/how-to-price-tutoring-lessons', '/dashboard'])
  assert.equal(views[1].page_referrer, `${ORIGIN}/students`, 'the private page is only ever a placeholder')
  assert.ok(!b.text().includes(UUID))
})

test('the tag that is already loaded is switched off on a private page by the documented ga-disable switch, and back on elsewhere', () => {
  const b = browser('/blog/x')
  for (const id of [GA4, ADS]) assert.equal(b.ctx[`ga-disable-${id}`], false, 'on a public page')
  b.push(`/portal/${SECRET}`) // a link inside the app, before React has even rendered: gtag.js would send its own page view now
  for (const id of [GA4, ADS]) assert.equal(b.ctx[`ga-disable-${id}`], true, `${id} on the portal`)
  b.push('/book/sarah-test?x=1')
  for (const id of [GA4, ADS]) assert.equal(b.ctx[`ga-disable-${id}`], false)
  b.back(`/students/${UUID}`) // the back button
  for (const id of [GA4, ADS]) assert.equal(b.ctx[`ga-disable-${id}`], true, 'popstate to a record')
  b.push('/dashboard')
  assert.equal(b.ctx[`ga-disable-${GA4}`], false)
  const first = browser(`/portal/${SECRET}`)
  assert.equal(first.ctx[`ga-disable-${GA4}`], true, 'a first load on a private page')
})

test('the small script in the page and isSecretPath answer the same on every address (one source)', () => {
  const addresses = ['/', '/blog', '/blog/x', '/dashboard', '/students', `/students/${UUID}`, '/lessons', `/lessons/${UUID}/edit`, '/messages', `/messages/${UUID}`, '/portal', `/portal/${SECRET}`, '/portal/parent/x', '/book/s', '/book/s/m', '/admin', '/admin/tutors', '/super-admin', '/super-admin/people/x', '/student/login', '/student/dashboard', '/upgrade', '/upgrade/success', '/auth/callback', '/onboarding', '/settings', '/register']
  for (const a of addresses) {
    const b = browser(a)
    assert.equal(b.ctx[`ga-disable-${GA4}`], gp.isSecretPath(a), a)
  }
})

test('no event helper puts an address in dataLayer by itself: begin_checkout and the Ads conversion carry the safe page only', () => {
  const b = browser(`/upgrade?token=${SECRET}`)
  tag.sendGaEvent(b.ctx, 'accepted', 'begin_checkout', tag.beginCheckoutParams('academy'))
  tag.sendAdsSignupConversion(b.ctx, 'accepted')
  const ev = b.layer().filter(c => c[0] === 'event')
  assert.equal(ev.length, 2)
  const checkout = ev[0][2] as Record<string, unknown>
  assert.deepEqual(checkout.items, [{ item_id: 'academy', item_name: 'Tutafy Academy' }])
  assert.equal(checkout.page_location, `${ORIGIN}/upgrade`)
  const conversion = ev[1][2] as Record<string, unknown>
  assert.equal(conversion.send_to, tag.ADS_SIGNUP_CONVERSION)
  assert.equal(conversion.page_location, `${ORIGIN}/upgrade`)
  assert.ok(!b.text().includes(SECRET))
})

test('nothing is sent without Accept, whatever the address', () => {
  for (const consent of [null, 'declined'] as const) {
    const b = browser('/blog/x')
    const before = b.layer().length
    tag.sendGooglePageView(b.ctx, consent)
    assert.equal(b.layer().length, before)
  }
})

// ---- the code that uses it --------------------------------------------------------------------

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${name}`
    if (statSync(path.join(ROOT, rel)).isDirectory()) sourceFiles(rel, out)
    else if (/\.tsx?$/.test(name)) out.push(rel)
  }
  return out
}

test('Analytics.tsx: sends the page view by hand, starts the tag with the safe page, never on a private page, and keeps the Meta pixel off private pages too', () => {
  const src = read('src/components/Analytics.tsx')
  assert.ok(src.includes("setTimeout(() => sendGooglePageView(window, 'accepted'), 250)"))
  assert.ok(src.includes('return () => clearTimeout(timer)'), 'a fast second page change cancels the first page view')
  assert.ok(src.includes('googlePageParams({ origin, pathname, search, referrer: document.referrer, title: document.title })'))
  assert.ok(src.includes('googleTagBootstrapScript(google.configIds, safePage())'), 'the tag starts with the safe page, never without one')
  assert.ok(/googleTagPlan\(\{[^}]*path: pathname \}\)/.test(src), 'the plan is told which page the visitor is on, so no tag starts on a private page')
  assert.ok(src.includes('fbq.disablePushState=true'), 'the pixel sends no page view of its own on a page change')
  assert.ok(/META_PIXEL && !isSecretPath\(pathname\)/.test(src), 'the pixel is not started on a private page')
  assert.ok(/if \(fbq && !isSecretPath\(pathname\)\) fbq\('track', 'PageView'\)/.test(src), 'its own page changes are sent only on pages that are not private')
  assert.ok(!/send_page_view/.test(src.replace(/\/\/.*$/gm, '')) || /send_page_view:\s*false/.test(src))
})

test('only google-tag.ts writes gtag calls and only google-page.ts builds an address for Google', () => {
  for (const f of [...sourceFiles('src/app'), ...sourceFiles('src/components'), ...sourceFiles('src/lib')]) {
    if (f === 'src/lib/google-tag.ts' || f === 'src/lib/google-page.ts') continue
    const code = read(f).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    assert.ok(!/gtag\(\s*['"`]/.test(code), `${f} calls gtag by hand`)
    assert.ok(!/page_location|page_referrer/.test(code), `${f} writes a page address for Google by hand`)
    assert.ok(!/document\.location|location\.href[^\n]*(gtag|dataLayer|fbq)/.test(code), f)
  }
})

test('Privacy page says what the code does with page addresses (and the code does it: the tests above)', () => {
  const src = read('src/app/privacy/page.tsx')
  assert.ok(/never include an access code, a record ID or anything after a question mark/.test(src))
  assert.ok(/[Pp]ages that open a student&apos;s portal or a private record send nothing to Google at all/.test(src))
})

test('self-check: a tag that sends the real address would be caught by the tests above', () => {
  // an unfiltered "page view": exactly what gtag.js does by default
  const b = browser(`/portal/${SECRET}`)
  b.ctx.gtag('event', 'page_view', { page_location: b.ctx.location.href })
  assert.ok(b.text().includes(SECRET), 'the checks read dataLayer in full, so a leak cannot hide from them')
  assert.ok(/page_view/.test(b.text()))
})
