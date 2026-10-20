// T-0638: three accessibility faults that Lighthouse (phone, T-0622) found on every page:
//   1. the viewport forbade pinch-zoom (meta-viewport);
//   2. public pages had no <main> landmark (landmark-one-main);
//   3. small grey text (text-gray-400) was too pale on white (color-contrast).
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

/** Bare `text-gray-400` class tokens. `hover:text-gray-400`, `placeholder:text-gray-400` and longer names do not count. */
export function paleGreyTokens(source: string): number {
  return (source.match(/(?<![:\w-])text-gray-400(?![\w-])/g) ?? []).length
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

test('no page of the whole app ends up with two <main> (a nested main is also a Lighthouse fault)', () => {
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
]

/**
 * Public files that still hold pale grey and are NOT fixed in T-0638 on purpose: they were being
 * edited by another agent at the same time (merge conflict). Each entry must still hold some, so
 * the list shrinks to nothing once they are fixed: the test then fails and says to remove the entry.
 * Fix = replace the bare `text-gray-400` with `text-gray-500` (about 4.8:1 on white).
 */
const PALE_GREY_PENDING = [
  'src/app/blog/[slug]/page.tsx',
  'src/app/tutors/[slug]/page.tsx',
]

test('public pages hold no pale grey (text-gray-400) text: the next shade, text-gray-500, passes 4.5:1 on white', () => {
  for (const f of PUBLIC_TEXT_FILES) {
    assert.ok(existsSync(path.join(ROOT, f)), `${f} is gone: update PUBLIC_TEXT_FILES`)
    assert.equal(paleGreyTokens(read(f)), 0, `${f} still has text-gray-400`)
  }
})

test('the files left for later still hold pale grey; when one is fixed, take it off PALE_GREY_PENDING', () => {
  for (const f of PALE_GREY_PENDING) {
    assert.ok(paleGreyTokens(read(f)) > 0, `${f} is fixed now: move it from PALE_GREY_PENDING to PUBLIC_TEXT_FILES`)
  }
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
  assert.equal(paleGreyTokens('text-gray-500 text-gray-300 bg-gray-400 border-gray-400'), 0)

  assert.equal(limitsZoom('maximumScale: 1'), true)
  assert.equal(limitsZoom('userScalable: false'), true)
  assert.equal(limitsZoom('<meta name="viewport" content="width=device-width, user-scalable=no">'), true)
  assert.equal(limitsZoom('content="width=device-width, maximum-scale=1"'), true)
  assert.equal(limitsZoom("width: 'device-width', initialScale: 1"), false)
})
