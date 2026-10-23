// T-0843: what the review of the public pages found and fixed, kept so it does not come back:
//   - the index pages (about, contact, customers, updates, blog, tutors) carry structured data that says what kind of page they are,
//     with a breadcrumb back to the home page, and never an e-mail address or phone number;
//   - an address that does not exist has its own title, says "noindex" and links back to real pages (it used to carry the home page's title);
//   - the small upper-case label above a heading is indigo-600, not indigo-500 (4.4 to 1 on white; Lighthouse "color-contrast").
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { pageJsonLd, jsonLdScript } from '@/lib/seo'
import { PAGE_SEO } from '@/lib/page-meta'
import { SITE_URL } from '@/lib/site-url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// the JSON-LD a test reads has no fixed shape, so the reading helpers below take it as loose JSON
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

const INDEX_PAGES: { file: string; key: keyof typeof PAGE_SEO; type: string }[] = [
  { file: 'src/app/about/page.tsx', key: 'about', type: 'AboutPage' },
  { file: 'src/app/contact/page.tsx', key: 'contact', type: 'ContactPage' },
  { file: 'src/app/customers/page.tsx', key: 'customers', type: 'CollectionPage' },
  { file: 'src/app/updates/page.tsx', key: 'updates', type: 'CollectionPage' },
  { file: 'src/app/blog/page.tsx', key: 'blog', type: 'CollectionPage' },
  { file: 'src/app/tutors/(directory)/page.tsx', key: 'tutors', type: 'CollectionPage' },
]

test('pageJsonLd: a page of the right type with its own title and description, and a breadcrumb back to the home page', () => {
  const [page, crumbs] = pageJsonLd(PAGE_SEO.about, 'About', 'AboutPage') as Record<string, Json>[]
  assert.equal(page['@type'], 'AboutPage')
  assert.equal(page.name, PAGE_SEO.about.title)
  assert.equal(page.description, PAGE_SEO.about.description)
  assert.equal(page.url, `${SITE_URL}/about`)
  assert.equal(page.isPartOf['@id'], `${SITE_URL}/#website`)
  assert.equal(page.mainEntity, undefined, 'no list when the page draws none')
  assert.equal(crumbs['@type'], 'BreadcrumbList')
  assert.deepEqual(crumbs.itemListElement.map((c: Json) => [c.position, c.name, c.item]), [[1, 'Home', SITE_URL], [2, 'About', `${SITE_URL}/about`]])
})

test('pageJsonLd: a list page names the items it draws, with absolute addresses', () => {
  const [page] = pageJsonLd(PAGE_SEO.blog, 'Blog', 'CollectionPage', [{ name: 'One', path: '/blog/one' }, { name: 'Two', path: '/blog/two' }]) as Record<string, Json>[]
  assert.equal(page.mainEntity['@type'], 'ItemList')
  assert.equal(page.mainEntity.numberOfItems, 2)
  assert.deepEqual(page.mainEntity.itemListElement.map((i: Json) => [i.position, i.name, i.url]), [[1, 'One', `${SITE_URL}/blog/one`], [2, 'Two', `${SITE_URL}/blog/two`]])
})

test('pageJsonLd never carries an e-mail address or a phone number, and survives a "</script>" in a name', () => {
  for (const key of ['about', 'contact', 'customers', 'updates', 'blog', 'tutors'] as const) {
    const text = JSON.stringify(pageJsonLd(PAGE_SEO[key], key, 'CollectionPage'))
    assert.doesNotMatch(text, /[A-Za-z0-9._-]+@[A-Za-z0-9-]+\.[a-z]{2,}/, key)
    assert.doesNotMatch(text, /\+?\d[\d ()-]{8,}\d/, key)
  }
  const out = jsonLdScript(pageJsonLd(PAGE_SEO.blog, 'Blog', 'CollectionPage', [{ name: '</script><b>', path: '/blog/x' }])[0])
  assert.doesNotMatch(out, /<\/script>/i)
})

test('every index page draws its structured data from its own PAGE_SEO entry (mutation: a page without it is caught)', () => {
  const missing = (src: string, key: string, type: string) => !new RegExp(`pageJsonLd\\(PAGE_SEO\\.${key}, '[^']+', '${type}'`).test(src)
  for (const p of INDEX_PAGES) {
    const src = read(p.file)
    assert.equal(missing(src, p.key, p.type), false, `${p.file} does not draw ${p.type} structured data`)
    assert.match(src, /type="application\/ld\+json"/, p.file)
  }
  assert.equal(missing(read('src/app/about/page.tsx').replace('pageJsonLd(', 'somethingElse('), 'about', 'AboutPage'), true)
})

test('an address that does not exist has its own title, is noindex and links back to real pages', () => {
  const src = read('src/app/not-found.tsx')
  assert.ok(src.includes("title: { absolute: 'Page not found | Tutafy' }"), 'the title must be absolute: the site template would add a second "Tutafy"')
  assert.match(src, /robots: \{ index: false/)
  for (const href of ['/', '/tutors', '/blog', '/contact']) assert.ok(src.includes(`href: '${href}'`), href)
  assert.equal((src.match(/<h1\b/g) ?? []).length, 1)
  const title = /absolute: '([^']+)'/.exec(src)![1]
  assert.ok(title.length >= 20 && title.length <= 60, title)
  assert.notEqual(title, PAGE_SEO.home.title)
})

test('the small upper-case label above a heading is indigo-600 on every public page (indigo-500 is 4.4 to 1 on white)', () => {
  const files = ['src/app/page.tsx', 'src/app/about/page.tsx', 'src/app/customers/page.tsx', 'src/app/updates/page.tsx', 'src/app/blog/page.tsx', 'src/app/switch/page.tsx', 'src/components/blog/BlogList.tsx', 'src/app/not-found.tsx']
  const bad = files.filter(f => /text-indigo-500 uppercase/.test(read(f)))
  assert.deepEqual(bad, [])
  // white text on indigo-500 is 4.47 to 1, just under the 4.5 the rule asks: the buttons and bands that carry it are indigo-600
  const pale = files.filter(f => /bg-indigo-500 hover:bg-indigo-600|bg-indigo-500 rounded-3xl|bg-indigo-500 border-indigo-500/.test(read(f)))
  assert.deepEqual(pale, [])
  assert.ok(/text-indigo-600 uppercase/.test(read('src/app/page.tsx')))
  assert.ok(/text-indigo-500 uppercase/.test('<p className="text-[12px] text-indigo-500 uppercase">'), 'the pattern really matches the old class')
})
