// T-0818: the Tutafy logo is a real link to the home page on every public page. The owner pressed the logo of the booking page and
// nothing happened: the page before the redesign (T-0810) drew the logo as a picture and a word with no link around them. Two checks:
// 1. SiteLogo (the one component the public pages share) renders a real link to "/" with a name, a big enough area and a hand cursor.
// 2. Every public page file must draw its logo through SiteLogo (or an explicit link to "/"), and a file that draws a logo word
//    (a bold "Tutafy" label) outside such a link fails the test. The list of pages is read from the folder, not typed by hand,
//    so a new public page that forgets the link is found too. Taking the link away from any page makes this test fail.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { SiteLogo } from '@/components/SiteLogo.tsx'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const APP = path.join(ROOT, 'src/app')

// Private areas have their own home (the tutor dashboard, the admin) and are not public pages; api and auth callback draw no page.
const NOT_PUBLIC = [/^\(dashboard\)/, /^\(admin\)/, /^api\//, /^auth\//, /^settings\//, /^embed\//]
// A page that draws a logo word on purpose without a link to "/" (each with its reason).
const NO_LINK_ON_PURPOSE: Record<string, string> = {
  'page.tsx': 'the dark sidebar in the home page is a picture of the product (the real logo of that page is the SiteLogo in its top bar and footer)',
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
}
const publicPages = walk(APP)
  .map(f => path.relative(APP, f).replace(/\\/g, '/'))
  .filter(rel => /(^|\/)(page|layout)\.tsx$/.test(rel) && !NOT_PUBLIC.some(re => re.test(rel)))

test('SiteLogo is a real link to the home page: name, a big enough area, hand cursor, keyboard focus', () => {
  for (const size of ['lg', 'md', 'sm'] as const) {
    const html = renderToStaticMarkup(SiteLogo({ size }))
    assert.match(html, /^<a [^>]*href="\/"/, `${size}: the logo must be an <a href="/">`)
    assert.match(html, /aria-label="Tutafy home"/, 'it has a name for a screen reader')
    assert.match(html, /min-h-11/, 'the area is at least 44px high')
    assert.match(html, /cursor-pointer/, 'the pointer is a hand')
    assert.match(html, /focus-visible:ring-2/, 'keyboard focus shows')
    // T-0969: the logo is the horizontal logo D2, a picture of the name; the link carries the name for a screen reader
    assert.match(html, /<svg[^>]*data-brand="logo"[^>]*aria-hidden="true"/)
  }
})

test('the folder walk finds the public pages (it is not an empty loop)', () => {
  for (const must of ['page.tsx', 'about/page.tsx', 'book/[slug]/page.tsx', 'tutors/[slug]/page.tsx', '(auth)/login/page.tsx', 'switch/page.tsx']) {
    assert.ok(publicPages.includes(must), `${must} is expected among the public pages`)
  }
})

// A bold "Tutafy" word (or the big title of the sign-in pages) is a logo. It must sit inside a link whose href is "/".
function unlinkedLogoWords(src: string): number[] {
  const bad: number[] = []
  const re = /<(span|h1|p) className="[^"]*(?:font-bold|font-semibold)[^"]*">(?:<Link[^>]*>)?Tutafy(?:<\/Link>)?<\/\1>/g
  for (let m = re.exec(src); m; m = re.exec(src)) {
    const before = src.slice(Math.max(0, m.index - 900), m.index + m[0].length)
    const inner = m[0].includes('<Link href="/"')
    const open = before.lastIndexOf('<Link href="/"')
    const closed = open === -1 ? -1 : before.indexOf('</Link>', open)
    const wrapped = open !== -1 && closed === -1
    if (!inner && !wrapped) bad.push(src.slice(0, m.index).split('\n').length)
  }
  return bad
}

test('no public page draws a logo word outside a link to the home page', () => {
  const files = [...publicPages.map(rel => path.join(APP, rel)), path.join(ROOT, 'src/components/SiteFooter.tsx')]
  const found: string[] = []
  for (const f of files) {
    const rel = path.relative(APP, f).replace(/\\/g, '/')
    if (NO_LINK_ON_PURPOSE[rel]) continue
    const lines = unlinkedLogoWords(fs.readFileSync(f, 'utf8'))
    if (lines.length) found.push(`${rel}:${lines.join(',')}`)
  }
  assert.deepEqual(found, [], `a logo word with no link to "/": ${found.join('; ')}`)
})

test('the self-check of the scan: it catches a logo with no link and passes the shared one', () => {
  const noLink = '<div><span className="text-[15px] font-bold text-gray-900">Tutafy</span></div>'
  assert.equal(unlinkedLogoWords(noLink).length, 1)
  const linked = '<Link href="/" className="x"><span className="font-bold">Tutafy</span></Link>'
  assert.equal(unlinkedLogoWords(linked).length, 0)
  const closedBefore = '<Link href="/">Home</Link><span className="font-bold">Tutafy</span>'
  assert.equal(unlinkedLogoWords(closedBefore).length, 1, 'a link that was already closed does not cover the word after it')
  const title = '<h1 className="text-3xl font-bold"><Link href="/" aria-label="Tutafy home">Tutafy</Link></h1>'
  assert.equal(unlinkedLogoWords(title).length, 0)
})

test('every public page that has a top bar or a sign-in title draws the logo through SiteLogo or a link to "/"', () => {
  const MUST = [
    'page.tsx', 'about/page.tsx', 'blog/page.tsx', 'blog/[slug]/page.tsx', 'contact/page.tsx', 'customers/page.tsx', 'privacy/page.tsx',
    'terms/page.tsx', 'updates/page.tsx', 'switch/page.tsx', 'unsubscribe/page.tsx', 'book/[slug]/page.tsx', 'book/[slug]/[member]/page.tsx',
    'tutors/[slug]/page.tsx', 'tutors/(directory)/page.tsx', 'portal/[token]/layout.tsx', '(auth)/login/page.tsx', '(auth)/register/page.tsx',
  ]
  const missing = MUST.filter(rel => {
    const src = fs.readFileSync(path.join(APP, rel), 'utf8')
    return !/<SiteLogo\b/.test(src) && !/<Link href="\/"[^>]*>\s*(?:<BrandLogo\b|(?:\s|<[^>]*>)*Tutafy)/.test(src)
  })
  assert.deepEqual(missing, [], `no logo link in: ${missing.join(', ')}`)
  assert.ok(/<SiteLogo\b/.test(fs.readFileSync(path.join(ROOT, 'src/components/SiteFooter.tsx'), 'utf8')), 'the shared footer')
})
