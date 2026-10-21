// T-0638: three accessibility faults that Lighthouse (phone, T-0622) found on every page:
//   1. the viewport forbade pinch-zoom (meta-viewport);
//   2. public pages had no <main> landmark (landmark-one-main);
//   3. small grey text (text-gray-400, and the paler text-gray-300 and text-gray-200) was too pale on
//      white (color-contrast).
// Also on the blog calculator: its three sliders had no label (label).
// A unit test cannot open a browser, so this file keeps what makes the Lighthouse result hold,
// by reading the source, and fails when someone undoes one of them. The scores, before and after,
// were measured in a real browser (see the status file of the project).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${name}`
    if (statSync(path.join(ROOT, rel)).isDirectory()) sourceFiles(rel, out)
    else if (/\.tsx?$/.test(name)) out.push(rel)
  }
  return out
}

// ---- the scanners (their own checks are at the end of the file) -------------------------------

/** The source without block comments and without whole-line `//` comments (a comment may say "<main>"). */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

/** How many <main> elements a source file opens. `</main>`, `<mainFoo` and a comment do not count. */
export function countMain(source: string): number {
  return (withoutComments(source).match(/<main(?=[\s>])/g) ?? []).length
}

/**
 * Bare `text-gray-200`, `text-gray-300` and `text-gray-400` class tokens (about 1.2:1, 1.5:1 and 2.5:1 on white;
 * the next shade, text-gray-500, is 4.8:1). `hover:text-gray-400`, `placeholder:text-gray-400` and longer names do not count.
 * A line that holds one of the `exemptLines` snippets is skipped: those are icons and disabled controls, which the
 * contrast rule does not judge as text; each one is listed with its reason in GREY_EXEMPT below.
 */
export function paleGreyTokens(source: string, exemptLines: string[] = []): number {
  let n = 0
  for (const line of source.split('\n')) {
    if (exemptLines.some(snippet => line.includes(snippet))) continue
    n += (line.match(/(?<![:\w-])text-gray-(?:200|300|400)(?![\w-])/g) ?? []).length
  }
  return n
}

/** Does the source limit zoom, as a viewport field or as a meta tag? */
export function limitsZoom(source: string): boolean {
  return /\b(maximumScale|userScalable|minimumScale)\b|maximum-scale|user-scalable|minimum-scale/.test(source)
}

// ---- 1. zoom ----------------------------------------------------------------------------------

test('no page, layout or component limits pinch-zoom (no maximum scale, no user-scalable=no)', () => {
  const files = [...sourceFiles('src/app'), ...sourceFiles('src/components')]
  const offenders = files.filter(f => limitsZoom(read(f)))
  assert.deepEqual(offenders, [], 'a scale limit stops a visitor from zooming in on a phone')
  const layout = read('src/app/layout.tsx')
  assert.match(layout, /export const viewport: Viewport = \{/)
  assert.match(layout, /width: 'device-width'/)
  assert.match(layout, /initialScale: 1/)
})

// ---- 2. one <main> ----------------------------------------------------------------------------

/** The pages that anyone can open without signing in. */
const PUBLIC_PAGES = [
  'src/app/page.tsx',
  'src/app/about/page.tsx',
  'src/app/blog/page.tsx',
  'src/app/blog/[slug]/page.tsx',
  'src/app/book/[slug]/page.tsx',
  'src/app/book/[slug]/[member]/page.tsx',
  'src/app/contact/page.tsx',
  'src/app/customers/page.tsx',
  'src/app/embed/[slug]/page.tsx',
  'src/app/offline/page.tsx',
  'src/app/privacy/page.tsx',
  'src/app/terms/page.tsx',
  'src/app/updates/page.tsx',
  'src/app/tutors/(directory)/page.tsx',
  'src/app/tutors/[slug]/page.tsx',
  'src/app/(auth)/login/page.tsx',
  'src/app/(auth)/register/page.tsx',
  'src/app/student/login/page.tsx',
]

/** The page file and every layout above it, root layout first. */
function chainOf(pageRel: string): string[] {
  const parts = path.posix.dirname(pageRel).split('/') // ['src','app',...]
  const chain: string[] = []
  for (let i = 2; i <= parts.length; i++) {
    const layout = `${parts.slice(0, i).join('/')}/layout.tsx`
    if (existsSync(path.join(ROOT, layout))) chain.push(layout)
  }
  return [...chain, pageRel]
}

const mainsOf = (pageRel: string) => chainOf(pageRel).reduce((n, f) => n + countMain(read(f)), 0)

test('the root layout has no <main>: every page below it adds its own, and two would nest', () => {
  assert.equal(countMain(read('src/app/layout.tsx')), 0)
})

test('every public page has exactly one <main> (in the page or in a layout above it)', () => {
  for (const page of PUBLIC_PAGES) {
    assert.ok(existsSync(path.join(ROOT, page)), `${page} is gone: update PUBLIC_PAGES`)
    assert.equal(mainsOf(page), 1, `${page}: ${chainOf(page).filter(f => countMain(read(f)) > 0).join(', ') || 'no <main> at all'}`)
  }
})

// Counts the page file and the layouts above it. A <main> inside a component is not counted: today only the unused
// src/components/ui/sidebar.tsx (SidebarInset) has one.
test('no page, with the layouts above it, ends up with two <main> (a nested main is also a Lighthouse fault)', () => {
  const pages = sourceFiles('src/app').filter(f => f.endsWith('/page.tsx'))
  assert.ok(pages.length >= PUBLIC_PAGES.length)
  for (const page of pages) assert.ok(mainsOf(page) <= 1, `${page} has ${mainsOf(page)} <main>`)
})

test('the public page list is complete: a page outside it is behind a sign-in, or holds a secret link code', () => {
  const pages = sourceFiles('src/app').filter(f => f.endsWith('/page.tsx'))
  const SIGNED_IN_OR_PRIVATE = /^src\/app\/(\(dashboard\)|\(admin\)|portal|onboarding|switch|settings|student\/dashboard)\//
  const unknown = pages.filter(p => !PUBLIC_PAGES.includes(p) && !SIGNED_IN_OR_PRIVATE.test(p))
  assert.deepEqual(unknown, [], 'a new page: add it to PUBLIC_PAGES (it must then have one <main>) or to the private list')
})

// ---- 3. grey text ------------------------------------------------------------------------------

/** Files whose text is read on a white or pale background by people who are not signed in. */
const PUBLIC_TEXT_FILES = [
  'src/app/page.tsx',
  'src/app/blog/page.tsx',
  'src/components/blog/BlogList.tsx',
  'src/components/blog/CommissionCalculator.tsx',
  'src/app/(auth)/login/page.tsx',
  'src/app/(auth)/register/page.tsx',
  'src/app/customers/page.tsx',
  'src/app/privacy/page.tsx',
  'src/app/terms/page.tsx',
  'src/app/about/page.tsx',
  'src/app/contact/page.tsx',
  'src/app/tutors/(directory)/page.tsx',
  'src/app/student/login/page.tsx',
  'src/app/book/[slug]/page.tsx',
  'src/app/book/[slug]/BookingForm.tsx',
  'src/app/book/[slug]/[member]/page.tsx',
  'src/app/embed/[slug]/page.tsx',
  'src/app/offline/page.tsx',
  'src/app/blog/[slug]/page.tsx',
  'src/app/tutors/[slug]/page.tsx',
  'src/app/updates/page.tsx',
  'src/components/SiteFooter.tsx',
]

/**
 * Pale grey that is allowed to stay, by file: the line must contain `line`. Only things the contrast rule does not
 * judge as text: a drawn icon (no words in it), and a control that is `disabled`.
 */
const GREY_EXEMPT: Record<string, { line: string; why: string }[]> = {
  'src/app/page.tsx': [{ line: '<X className=', why: 'the "no" cross in the comparison table is an icon; the row label carries the meaning' }],
  'src/app/blog/[slug]/page.tsx': [{ line: '<X className=', why: 'the "no" cross in the comparison table is an icon; the row label carries the meaning' }],
  'src/app/tutors/(directory)/page.tsx': [{ line: '<Star key={s}', why: 'an empty rating star is an icon; the rating number is printed beside it' }],
  'src/app/tutors/[slug]/page.tsx': [{ line: '<Star key={s}', why: 'an empty rating star is an icon; the rating number is printed beside it' }],
  'src/app/book/[slug]/page.tsx': [{ line: '<Star key={s}', why: 'an empty rating star is an icon; the rating number is printed beside it' }],
  'src/app/book/[slug]/BookingForm.tsx': [{ line: "isPast ? 'text-gray-200 cursor-default'", why: 'a past day of the calendar is a disabled button (disabled={isPast || isBlocked}); WCAG exempts disabled controls' }],
}

/** Every layout above a public page (the root layout included): their text is on every page below them. */
function layoutsAbovePublicPages(): string[] {
  const out = new Set<string>()
  for (const page of PUBLIC_PAGES) for (const f of chainOf(page)) if (f !== page) out.add(f)
  return [...out]
}

/** The files whose class names are checked for pale grey: the page files, the shared parts, and the layouts above the pages. */
const greyFiles = () => [...new Set([...PUBLIC_TEXT_FILES, ...layoutsAbovePublicPages()])]

/** "file: n" for every file that still has pale grey text. `readFile` is a parameter so the self-check can feed a changed file. */
export function greyOffenders(files: string[], readFile: (rel: string) => string): string[] {
  const out: string[] = []
  for (const f of files) {
    const n = paleGreyTokens(readFile(f), (GREY_EXEMPT[f] ?? []).map(e => e.line))
    if (n > 0) out.push(`${f}: ${n}`)
  }
  return out
}

/** Exemptions that match no grey line any more: the icon or the disabled button is gone, so the exemption must go too. */
export function staleGreyExemptions(readFile: (rel: string) => string): string[] {
  const out: string[] = []
  for (const [f, list] of Object.entries(GREY_EXEMPT)) {
    for (const e of list) {
      if (!readFile(f).split('\n').some(l => l.includes(e.line) && /text-gray-(?:200|300|400)(?![\w-])/.test(l))) out.push(`${f}: ${e.line}`)
    }
  }
  return out
}

test('public pages and the layouts above them hold no pale grey text (text-gray-200, -300, -400): text-gray-500 passes 4.5:1 on white', () => {
  const files = greyFiles()
  for (const f of files) assert.ok(existsSync(path.join(ROOT, f)), `${f} is gone: update PUBLIC_TEXT_FILES`)
  assert.deepEqual(greyOffenders(files, read), [], 'use text-gray-500; an icon or a disabled control goes in GREY_EXEMPT with its reason')
})

test('the layouts that wrap a public page are scanned too (the student layout wraps /student/login)', () => {
  const files = greyFiles()
  for (const layout of ['src/app/layout.tsx', 'src/app/student/layout.tsx', 'src/app/blog/layout.tsx', 'src/app/tutors/[slug]/layout.tsx']) {
    assert.ok(files.includes(layout), `${layout} is not scanned`)
  }
})

test('every grey exemption still matches a line, and the past-day button of the calendar is really disabled', () => {
  assert.deepEqual(staleGreyExemptions(read), [])
  assert.match(read('src/app/book/[slug]/BookingForm.tsx'), /disabled=\{isPast \|\| isBlocked\}/)
})

// ---- the blog post: comparison table and in-sentence link ------------------------------------------

test('blog post: the first cell of each comparison row is a row header (th scope=row), and the About link is underlined', () => {
  const src = read('src/app/blog/[slug]/page.tsx')
  assert.match(src, /const Cell = c === 0 \? 'th' : 'td'/)
  assert.match(src, /<Cell key=\{c\} scope=\{c === 0 \? 'row' : undefined\}/)
  assert.match(src, /<Link href="\/about" className="[^"]*\bunderline\b[^"]*">About Tutafy/)
  assert.doesNotMatch(src, /<Link href="\/about" className="[^"]*hover:underline/)
})

// ---- the sliders of the blog calculator -----------------------------------------------------------

test('each slider of the commission calculator is named by its label (htmlFor = id)', () => {
  const src = read('src/components/blog/CommissionCalculator.tsx')
  assert.match(src, /const id = useId\(\)/)
  assert.match(src, /<label htmlFor=\{id\}/)
  assert.match(src, /<input id=\{id\} type="range"/)
})

// ---- the scanners themselves --------------------------------------------------------------------------

test('scanner checks: the three scanners find what they claim and nothing near it', () => {
  assert.equal(countMain('<main>'), 1)
  assert.equal(countMain('<main className="x">'), 1)
  assert.equal(countMain('<main\n  className="x">'), 1)
  assert.equal(countMain('</main>'), 0)
  assert.equal(countMain('<mainContent />'), 0)
  assert.equal(countMain('<main><main>'), 2)
  assert.equal(countMain('// a <main> in a comment\n{/* and <main> here */}\n<main>'), 1)

  assert.equal(paleGreyTokens('className="text-[12px] text-gray-400 mt-4"'), 1)
  assert.equal(paleGreyTokens("p.highlight ? 'text-indigo-200' : 'text-gray-400'"), 1)
  assert.equal(paleGreyTokens('hover:text-gray-400'), 0)
  assert.equal(paleGreyTokens('placeholder:text-gray-400'), 0)
  assert.equal(paleGreyTokens('text-gray-500 bg-gray-400 border-gray-400 bg-gray-300 text-gray-600'), 0)

  // the paler shades are caught too, as bare text colours
  assert.equal(paleGreyTokens('<p className="text-center text-[11px] font-bold text-gray-300 py-1">'), 1)
  assert.equal(paleGreyTokens("isPast ? 'text-gray-200 cursor-default' : x"), 1)
  assert.equal(paleGreyTokens('text-gray-300 text-gray-200 text-gray-400'), 3)
  assert.equal(paleGreyTokens('hover:text-gray-300 group-hover:text-gray-200 placeholder:text-gray-300'), 0)
  assert.equal(paleGreyTokens('text-gray-3000 text-gray-300-x text-gray-2'), 0)
  // a clean line above does not hide a pale one below
  assert.equal(paleGreyTokens('<p className="text-gray-500">a</p>\n<p className="text-gray-300">b</p>'), 1)
  // an exempt line is skipped; the line next to it is not
  const icon = '<X className="h-5 w-5 text-gray-300 mx-auto" />'
  assert.equal(paleGreyTokens(icon, ['<X className=']), 0)
  assert.equal(paleGreyTokens(`${icon}\n<p className="text-gray-300">b</p>`, ['<X className=']), 1)

  assert.equal(limitsZoom('maximumScale: 1'), true)
  assert.equal(limitsZoom('userScalable: false'), true)
  assert.equal(limitsZoom('<meta name="viewport" content="width=device-width, user-scalable=no">'), true)
  assert.equal(limitsZoom('content="width=device-width, maximum-scale=1"'), true)
  assert.equal(limitsZoom("width: 'device-width', initialScale: 1"), false)
})

// ---- mutation: put a pale grey back into a layout or a page, and the real check goes red -------------------

test('scanner checks: pale grey put back into a layout or a page makes greyOffenders report it', () => {
  const files = greyFiles()
  assert.deepEqual(greyOffenders(files, read), [], 'the unchanged tree is clean')
  const mutated = (rel: string, from: RegExp, to: string) => {
    const before = read(rel)
    assert.match(before, from, `${rel}: the text to change is gone, update this self-check`)
    return (f: string) => (f === rel ? before.replace(from, to) : read(f))
  }
  const cases: [string, RegExp, string][] = [
    ['src/app/student/layout.tsx', /text-gray-500/, 'text-gray-400'],
    ['src/app/student/layout.tsx', /text-gray-500/, 'text-gray-300'],
    ['src/app/blog/layout.tsx', /<main/, '<main className="text-gray-300"'],
    ['src/app/book/[slug]/BookingForm.tsx', /text-gray-500 font-medium">← Pick a date/, 'text-gray-300 font-medium">← Pick a date'],
    ['src/app/embed/[slug]/page.tsx', /text-gray-500 mt-6">Powered/, 'text-gray-300 mt-6">Powered'],
    ['src/app/tutors/[slug]/page.tsx', /text-\[10px\] text-gray-500/, 'text-[10px] text-gray-300'],
    ['src/app/blog/[slug]/page.tsx', /<span className="text-gray-500">\{b\.credit\}/, '<span className="text-gray-300">{b.credit}'],
  ]
  for (const [rel, from, to] of cases) {
    const found = greyOffenders(files, mutated(rel, from, to))
    assert.ok(found.some(x => x.startsWith(`${rel}:`)), `${rel}: "${to}" was not caught (${found.join(', ') || 'nothing reported'})`)
  }
  // an exempt icon line does not excuse a text colour added to the same file
  const withText = (f: string) => (f === 'src/app/page.tsx' ? read(f) + '\n<p className="text-gray-300">x</p>' : read(f))
  assert.ok(greyOffenders(files, withText).some(x => x.startsWith('src/app/page.tsx:')))
  // an exemption whose line has gone is reported as stale
  const noIcons = (f: string) => (f === 'src/app/page.tsx' ? read(f).replace(/<X className=/g, '<Xmark className=') : read(f))
  assert.ok(staleGreyExemptions(noIcons).some(x => x.startsWith('src/app/page.tsx:')))
})
