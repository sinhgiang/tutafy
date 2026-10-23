// T-0623: one main address (www) everywhere a crawler looks, a title and description of
// its own for every public page, sign-in and sign-up pages out of search results.
//
// Pages and layouts are .tsx files the test runner cannot load, so the metadata they
// publish is built in src/lib/page-meta.ts (run here for real) and the .tsx files are
// checked by reading their source to prove they use it. The real built pages were also
// fetched from `next start` (see the Helme report).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Metadata } from 'next'

import sitemap from '@/app/sitemap'
import robots from '@/app/robots'
import { SITE_URL, absoluteUrl } from '@/lib/site-url'
import { SITE_URL as SITE_URL_FROM_CONTENT } from '@/lib/site-content'
import {
  PAGE_SEO, BLOG_SEO, ROOT_METADATA, pageMetadata, blogPostMetadata, noindexPaths,
  TITLE_MAX, TITLE_MIN, DESCRIPTION_MAX, DESCRIPTION_MIN, type PageKey,
} from '@/lib/page-meta'
import { homeJsonLd } from '@/lib/seo'
import { buildLlmsTxt, buildLlmsFullTxt } from '@/lib/llms'
import { originFromRequest } from '@/lib/app-url'
import { POSTS, heroFor } from '@/lib/blog'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8')
const KEYS = Object.keys(PAGE_SEO) as PageKey[]

const titleOf = (m: Metadata) => (m.title as { absolute: string }).absolute
const canonicalOf = (m: Metadata) => String(m.alternates?.canonical)

interface Entry { name: string; title: string; description: string }

// The rules, written once so the self-check below can run them on bad data.
function metaProblems(entries: Entry[]): string[] {
  const problems: string[] = []
  const seen = (what: 'title' | 'description') => {
    const owner = new Map<string, string>()
    for (const e of entries) {
      const prior = owner.get(e[what].toLowerCase())
      if (prior) problems.push(`${e.name}: ${what} repeats ${prior}`)
      else owner.set(e[what].toLowerCase(), e.name)
    }
  }
  for (const e of entries) {
    if (e.title.length > TITLE_MAX || e.title.length < TITLE_MIN) problems.push(`${e.name}: title is ${e.title.length} characters`)
    if (e.description.length > DESCRIPTION_MAX || e.description.length < DESCRIPTION_MIN) problems.push(`${e.name}: description is ${e.description.length} characters`)
  }
  seen('title')
  seen('description')
  return problems
}

const allEntries = (): Entry[] => [
  ...KEYS.map(k => ({ name: k, title: PAGE_SEO[k].title, description: PAGE_SEO[k].description })),
  ...POSTS.map(p => ({ name: `blog/${p.slug}`, title: BLOG_SEO[p.slug]?.title ?? '', description: BLOG_SEO[p.slug]?.description ?? '' })),
]

// ---- (a) one main address, www, from one constant -----------------------------

test('the main address is the www address, written once', () => {
  assert.equal(SITE_URL, 'https://www.tutafy.com')
  assert.equal(SITE_URL_FROM_CONTENT, SITE_URL)
  assert.equal(absoluteUrl('/'), SITE_URL)
  assert.equal(absoluteUrl('/blog'), `${SITE_URL}/blog`)
  assert.equal(absoluteUrl('blog'), `${SITE_URL}/blog`)
})

test('robots.txt, the sitemap, the llms files and the home JSON-LD all use the main address', async () => {
  const r = robots()
  assert.equal(r.host, SITE_URL)
  assert.equal(r.sitemap, `${SITE_URL}/sitemap.xml`)

  const urls = (await sitemap()).map(e => e.url)
  assert.ok(urls.length > 0)
  for (const u of urls) assert.ok(u === SITE_URL || u.startsWith(`${SITE_URL}/`), `sitemap URL off the main address: ${u}`)

  for (const body of [buildLlmsTxt(), buildLlmsFullTxt()]) {
    const links = [...body.matchAll(/https?:\/\/[^\s)]+/g)].map(m => m[0])
    assert.ok(links.length > 0)
    for (const l of links) assert.ok(l === SITE_URL || l.startsWith(`${SITE_URL}/`), `llms link off the main address: ${l}`)
  }

  const json = JSON.stringify(homeJsonLd())
  const hosts = [...json.matchAll(/https?:\/\/[^"\\/]+/g)].map(m => m[0])
  assert.ok(hosts.length > 0)
  for (const h of hosts) assert.ok(h === 'https://schema.org' || h === SITE_URL, `JSON-LD host: ${h}`)
})

test('the address does not depend on NEXT_PUBLIC_APP_URL (empty, BOM, non-www, a preview address)', () => {
  const script = `
    import sitemap from '@/app/sitemap'
    import robots from '@/app/robots'
    import { SITE_URL } from '@/lib/site-content'
    import { ROOT_METADATA } from '@/lib/page-meta'
    import { homeJsonLd } from '@/lib/seo'
    console.log(JSON.stringify({
      site: SITE_URL,
      first: (await sitemap())[0].url,
      host: robots().host,
      base: String(ROOT_METADATA.metadataBase),
      ogUrl: ROOT_METADATA.openGraph.url,
      ld: homeJsonLd()[1].url,
    }))`
  for (const value of ['', '﻿', 'https://tutafy.com', 'https://tutafy.com/', 'https://tutafy-git-branch.vercel.app', 'http://localhost:3000']) {
    const res = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', '--import', './tests/register.mjs', '--input-type=module', '-e', script], {
      cwd: ROOT, encoding: 'utf8', env: { ...process.env, NEXT_PUBLIC_APP_URL: value },
    })
    assert.equal(res.status, 0, res.stderr)
    const out = JSON.parse(res.stdout.trim().split('\n').pop() as string)
    assert.deepEqual(out, {
      site: SITE_URL, first: SITE_URL, host: SITE_URL, base: `${SITE_URL}/`, ogUrl: SITE_URL, ld: SITE_URL,
    }, `NEXT_PUBLIC_APP_URL=${JSON.stringify(value)}`)
  }
})

test('no SEO file reads the environment for the address or types the non-www address', () => {
  const files = [
    'src/app/robots.ts', 'src/app/sitemap.ts', 'src/app/layout.tsx', 'src/app/blog/[slug]/page.tsx',
    'src/lib/site-content.ts', 'src/lib/site-url.ts', 'src/lib/page-meta.ts', 'src/lib/seo.ts', 'src/lib/llms.ts',
  ]
  for (const f of files) {
    const src = read(f)
    assert.doesNotMatch(src, /process\.env\.NEXT_PUBLIC_APP_URL/, `${f} reads NEXT_PUBLIC_APP_URL`)
    assert.doesNotMatch(src, /https?:\/\/tutafy\.com/, `${f} types the non-www address`)
  }
  // The fallback of the request-origin helper (no Host header) is the main address too.
  assert.doesNotMatch(read('src/lib/app-url.ts'), /'https?:\/\/tutafy\.com'/)
  assert.match(read('src/lib/app-url.ts'), /return env \|\| SITE_URL/)
  // With a Host header the helper still answers with that host (OAuth redirects, previews).
  assert.equal(originFromRequest(new Request('http://x.invalid/', { headers: { host: 'preview.example.com' } })), 'https://preview.example.com')
})

test('og:url and the canonical of every page are on the main address and agree', () => {
  assert.equal(String(ROOT_METADATA.metadataBase), `${SITE_URL}/`)
  assert.equal((ROOT_METADATA.openGraph as { url: string }).url, SITE_URL)
  for (const k of KEYS) {
    const m = pageMetadata(k)
    const expected = absoluteUrl(PAGE_SEO[k].path)
    assert.equal(canonicalOf(m), expected, k)
    assert.equal((m.openGraph as { url: string }).url, expected, k)
  }
  for (const p of POSTS) {
    const m = blogPostMetadata(p.slug, heroFor(p.slug))
    assert.equal(canonicalOf(m), `${SITE_URL}/blog/${p.slug}`, p.slug)
    assert.equal((m.openGraph as { url: string }).url, `${SITE_URL}/blog/${p.slug}`, p.slug)
  }
})

test('the root layout sets no canonical, so no page inherits the home page address', () => {
  assert.equal(ROOT_METADATA.alternates, undefined)
  const layout = read('src/app/layout.tsx')
  assert.match(layout, /export const metadata: Metadata = ROOT_METADATA/)
  assert.doesNotMatch(layout, /canonical:|alternates:/)
})

test('the canonical of every indexable page is the address the sitemap lists', async () => {
  const inSitemap = new Set((await sitemap()).map(e => new URL(e.url).href))
  for (const k of KEYS) {
    const href = new URL(canonicalOf(pageMetadata(k))).href
    if (PAGE_SEO[k].noindex) assert.ok(!inSitemap.has(href), `${k} is noindex but is in the sitemap`)
    else assert.ok(inSitemap.has(href), `${k}: canonical ${href} is not in the sitemap`)
  }
  for (const p of POSTS) {
    assert.ok(inSitemap.has(new URL(canonicalOf(blogPostMetadata(p.slug))).href), p.slug)
  }
})

// ---- (b) a title and description of its own ----------------------------------

test('every public page and blog post has its own title and description, in length, none repeated', () => {
  assert.deepEqual(metaProblems(allEntries()), [])
})

test('every blog post has search metadata, and none is left over for a post that is gone', () => {
  assert.deepEqual(POSTS.map(p => p.slug).filter(s => !BLOG_SEO[s]), [])
  assert.deepEqual(Object.keys(BLOG_SEO).filter(s => !POSTS.some(p => p.slug === s)), [])
  assert.equal(allEntries().length, KEYS.length + POSTS.length)
})

test('the rules catch what the audit found (a self-check on bad data)', () => {
  const ok: Entry = { name: 'a', title: 'A good page title that fits', description: 'A description of a page that is long enough to be useful but still short enough to display in full.' }
  assert.deepEqual(metaProblems([ok]), [])
  assert.ok(metaProblems([ok, { ...ok, name: 'b' }]).some(p => p.includes('title repeats')), 'duplicate title')
  assert.ok(metaProblems([ok, { ...ok, name: 'b', title: 'Another good page title here' }]).some(p => p.includes('description repeats')), 'duplicate description')
  assert.ok(metaProblems([{ ...ok, title: 'x'.repeat(61) }]).some(p => p.includes('title is 61')), 'title too long (a 70-97 character blog title)')
  assert.ok(metaProblems([{ ...ok, title: 'Contact' }]).some(p => p.includes('title is 7')), 'title too short')
  assert.ok(metaProblems([{ ...ok, description: 'y'.repeat(244) }]).some(p => p.includes('description is 244')), 'the 244 character home description')
  assert.ok(metaProblems([{ ...ok, description: 'The terms for using Tutafy.' }]).some(p => p.includes('description is 27')), 'description too short')
})

test('the pages that shared one title and description now differ', () => {
  const group = (['home', 'tutors', 'register', 'login', 'studentLogin'] as const).map(k => PAGE_SEO[k])
  assert.equal(new Set(group.map(p => p.title)).size, group.length)
  assert.equal(new Set(group.map(p => p.description)).size, group.length)
  for (const k of ['about', 'contact', 'customers', 'privacy', 'terms'] as const) {
    assert.ok(PAGE_SEO[k].title.length >= 30, `${k} title`)
    assert.ok(PAGE_SEO[k].description.length >= 90, `${k} description`)
  }
})

test('og and twitter texts follow the page, not the home page', () => {
  for (const k of KEYS) {
    const m = pageMetadata(k)
    assert.equal(titleOf(m), PAGE_SEO[k].title)
    assert.equal(m.description, PAGE_SEO[k].description)
    assert.equal((m.openGraph as { title: string }).title, PAGE_SEO[k].title)
    assert.equal((m.openGraph as { description: string }).description, PAGE_SEO[k].description)
    assert.equal((m.twitter as { title: string }).title, PAGE_SEO[k].title)
  }
})

// ---- (c) sign-in and sign-up pages: noindex, not in the sitemap, one h1 -------

test('/login, /register and /student/login are noindex and not in the sitemap; the other pages stay indexable', async () => {
  assert.deepEqual(noindexPaths().sort(), ['/login', '/register', '/student/login'])
  const listed = (await sitemap()).map(e => e.url)
  for (const p of ['/login', '/register', '/student/login']) {
    assert.deepEqual(pageMetadata(p === '/login' ? 'login' : p === '/register' ? 'register' : 'studentLogin').robots, { index: false, follow: false }, p)
    assert.ok(!listed.includes(`${SITE_URL}${p}`), `${p} is in the sitemap`)
  }
  for (const k of KEYS.filter(k => !PAGE_SEO[k].noindex)) {
    assert.equal(pageMetadata(k).robots, undefined, `${k} must stay indexable`)
    assert.ok(listed.includes(absoluteUrl(PAGE_SEO[k].path)), `${k} should be in the sitemap`)
  }
  for (const p of POSTS) assert.equal(blogPostMetadata(p.slug).robots, undefined, p.slug)
})

test('robots.txt does not block the noindex pages (a blocked page could never show its noindex tag)', () => {
  const rule = (Array.isArray(robots().rules) ? robots().rules[0] : robots().rules) as { disallow: string[] }
  for (const p of ['/login', '/register', '/student/login']) {
    assert.ok(!rule.disallow.some(d => p.startsWith(d)), `${p} is disallowed in robots.txt`)
  }
})

test('/register has one h1 in the HTML the server sends, and the form no longer adds a second', () => {
  const layout = read('src/app/(auth)/register/layout.tsx')
  assert.equal((layout.match(/<h1 className/g) ?? []).length, 1)
  assert.match(layout, /<h1 className="sr-only">Create your free Tutafy account<\/h1>/)
  assert.match(layout, /\{children\}/)
  assert.equal((read('src/app/(auth)/register/page.tsx').match(/<h1 className/g) ?? []).length, 0)
  // The visible "Tutafy" heading keeps its look: same classes, now a paragraph holding the link to the home page (T-0818).
  assert.match(read('src/app/(auth)/register/page.tsx'), /<p className="text-3xl font-bold text-gray-900"><Link href="\/"[^>]*>Tutafy<\/Link><\/p>/)
})

// ---- the pages really use the shared metadata --------------------------------

test('each page file takes its metadata from page-meta and writes no title or canonical of its own', () => {
  const where: [string, string][] = [
    ['src/app/page.tsx', 'home'],
    ['src/app/about/page.tsx', 'about'],
    ['src/app/contact/page.tsx', 'contact'],
    ['src/app/customers/page.tsx', 'customers'],
    ['src/app/privacy/page.tsx', 'privacy'],
    ['src/app/terms/page.tsx', 'terms'],
    ['src/app/blog/page.tsx', 'blog'],
    ['src/app/updates/page.tsx', 'updates'],
    ['src/app/tutors/(directory)/layout.tsx', 'tutors'],
    ['src/app/(auth)/login/layout.tsx', 'login'],
    ['src/app/(auth)/register/layout.tsx', 'register'],
    ['src/app/student/login/layout.tsx', 'studentLogin'],
  ]
  for (const [file, key] of where) {
    assert.ok(existsSync(path.join(ROOT, file)), file)
    const src = read(file).replace(/^\s*\/\/.*$/gm, '') // comments may name the word "canonical"
    assert.match(src, new RegExp(`export const metadata = pageMetadata\\('${key}'\\)`), file)
    assert.doesNotMatch(src, /\bcanonical\b|\balternates\b/, `${file} sets its own canonical`)
    assert.doesNotMatch(src, /export const metadata[^=\n]*=\s*\{|generateMetadata/, `${file} writes its own metadata object`)
  }
  // Every key is used by exactly one file.
  assert.deepEqual(where.map(w => w[1]).sort(), [...KEYS].sort())

  const post = read('src/app/blog/[slug]/page.tsx')
  assert.match(post, /return blogPostMetadata\(post\.slug, heroFor\(post\.slug\) \?\? undefined\)/)
  assert.doesNotMatch(post, /alternates|canonical/)
  // the post's structured data is built in src/lib/blog-seo.ts, which writes no address by hand either
  assert.match(post, /import \{ blogPostJsonLd, formatPostDate \} from '@\/lib\/blog-seo'/)
  assert.match(read('src/lib/blog-seo.ts'), /import \{ SITE_URL as SITE \} from '@\/lib\/site-url'/)
})

test('the tutors page file moved into a route group, so a tutor profile does not inherit the directory title', () => {
  assert.ok(!existsSync(path.join(ROOT, 'src/app/tutors/page.tsx')))
  assert.ok(!existsSync(path.join(ROOT, 'src/app/tutors/layout.tsx')))
  assert.ok(existsSync(path.join(ROOT, 'src/app/tutors/(directory)/page.tsx')))
  assert.ok(existsSync(path.join(ROOT, 'src/app/tutors/[slug]/page.tsx')))
})

test('the sitemap lists exactly the indexable pages plus every blog post', async () => {
  const urls = (await sitemap()).map(e => e.url).sort()
  const expected = [
    ...KEYS.filter(k => !PAGE_SEO[k].noindex).map(k => absoluteUrl(PAGE_SEO[k].path)),
    ...POSTS.map(p => `${SITE_URL}/blog/${p.slug}`),
  ].sort()
  assert.deepEqual(urls, expected)
  assert.equal(new Set(urls).size, urls.length, 'a URL is listed twice')
})
