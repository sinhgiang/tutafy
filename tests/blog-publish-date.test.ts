// T-1222: a blog post is public only from the day in its `date`, read in Vietnam time. Before that day it is in no list
// (/blog, the sitemap, llms.txt, "Keep reading"), its page answers 404 and no structured data is written for it.
// The page files are .tsx and node cannot import them, so each page is checked in two ways: the functions it calls are run
// for real on a moved clock, and its source is read to prove it calls them and never the raw POSTS list.
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sitemap from '@/app/sitemap'
import { buildLlmsTxt, buildLlmsFullTxt } from '@/lib/llms'
import { blogPostJsonLd } from '@/lib/blog-seo'
import { pageJsonLd } from '@/lib/seo'
import { PAGE_SEO } from '@/lib/page-meta'
import {
  POSTS, todayInVietnam, isPublished, publishedPosts, getPublishedPost, relatedPosts, blogIndexCards,
} from '@/lib/blog'
import { SITE_URL } from '@/lib/site-url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8')

// Posts that sit on a known day, so the test says what it means: 3 Nov is `online-tutoring-jobs`, 4 Nov `ielts-speaking-part-2-topics`.
const JOBS = 'online-tutoring-jobs'
const IELTS = 'ielts-speaking-part-2-topics'
const dateOf = (slug: string) => POSTS.find(p => p.slug === slug)!.date
/** The moment 10:00 in Vietnam (UTC+7) on a YYYY-MM-DD day. */
const noonish = (day: string) => new Date(`${day}T10:00:00+07:00`)
const dayBefore = (day: string) => new Date(new Date(`${day}T12:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10)

test('the two posts of the ticket are dated 3 and 4 November, so the test below talks about the right posts', () => {
  assert.equal(dateOf(JOBS), '2026-11-03')
  assert.equal(dateOf(IELTS), '2026-11-04')
})

// ---- the day, in Vietnam time -----------------------------------------------

test('the day is read in Vietnam time: it turns at 17:00 UTC, not at midnight UTC', () => {
  assert.equal(todayInVietnam(new Date('2026-11-02T16:59:59Z')), '2026-11-02')
  assert.equal(todayInVietnam(new Date('2026-11-02T17:00:00Z')), '2026-11-03')
  assert.equal(todayInVietnam(new Date('2026-12-31T17:00:00Z')), '2027-01-01')
  assert.equal(todayInVietnam(new Date('2026-03-01T00:00:00Z')), '2026-03-01')
})

test('a post is public on its own day (from 00:00 in Vietnam) and not the second before', () => {
  const post = { date: '2026-11-03' }
  assert.equal(isPublished(post, new Date('2026-11-02T16:59:59Z')), false)
  assert.equal(isPublished(post, new Date('2026-11-02T17:00:00Z')), true)
  assert.equal(isPublished(post, new Date('2026-11-03T12:00:00Z')), true)
  assert.equal(isPublished(post, new Date('2027-05-01T00:00:00Z')), true)
})

// ---- every list, on the day before and on the day ---------------------------

function everywhere(now: Date) {
  mock.timers.enable({ apis: ['Date'], now: now.getTime() })
  try {
    return {
      list: publishedPosts().map(p => p.slug),
      cards: blogIndexCards().map(c => c.slug),
      // the page builds this from the same cards (checked in the source scan below)
      indexLd: JSON.stringify(pageJsonLd(PAGE_SEO.blog, 'Blog', 'CollectionPage', blogIndexCards().map(c => ({ name: c.title, path: `/blog/${c.slug}` })))),
      llms: buildLlmsTxt(),
      llmsFull: buildLlmsFullTxt(),
    }
  } finally { mock.timers.reset() }
}

async function sitemapUrlsAt(now: Date): Promise<string[]> {
  mock.timers.enable({ apis: ['Date'], now: now.getTime() })
  try { return (await sitemap()).map(e => e.url) } finally { mock.timers.reset() }
}

for (const slug of [JOBS, IELTS]) {
  const day = dateOf(slug)

  test(`${slug} (${day}) is in no list the day before`, async () => {
    const now = noonish(dayBefore(day))
    const r = everywhere(now)
    const url = `${SITE_URL}/blog/${slug}`
    assert.ok(!r.list.includes(slug), 'publishedPosts')
    assert.ok(!r.cards.includes(slug), '/blog cards')
    assert.ok(!r.indexLd.includes(`/blog/${slug}`), '/blog structured data (the CollectionPage list)')
    assert.ok(!r.llms.includes(url), 'llms.txt')
    assert.ok(!r.llmsFull.includes(url), 'llms-full.txt')
    assert.ok(!(await sitemapUrlsAt(now)).includes(url), 'sitemap.xml')
    assert.equal(getPublishedPost(slug, now), undefined, 'the post page answers 404')
    for (const other of POSTS) assert.ok(!relatedPosts(other.slug, now).some(p => p.slug === slug), `related to ${other.slug}`)
  })

  test(`${slug} (${day}) is in every list on its day`, async () => {
    const now = noonish(day)
    const r = everywhere(now)
    const url = `${SITE_URL}/blog/${slug}`
    assert.ok(r.list.includes(slug))
    assert.ok(r.cards.includes(slug))
    assert.ok(r.indexLd.includes(`/blog/${slug}`))
    assert.ok(r.llms.includes(url))
    assert.ok(r.llmsFull.includes(url))
    assert.ok((await sitemapUrlsAt(now)).includes(url))
    const post = getPublishedPost(slug, now)
    assert.ok(post, 'the post page opens')
    assert.ok(blogPostJsonLd(post).some(d => d['@type'] === 'BlogPosting'), 'its structured data is written')
  })
}

test('the sitemap and the /blog index take their newest date from the public posts only, not from a post that is still waiting', async () => {
  const now = noonish('2026-11-02')
  mock.timers.enable({ apis: ['Date'], now: now.getTime() })
  let entries
  try { entries = await sitemap() } finally { mock.timers.reset() }
  const blog = entries.find(e => e.url === `${SITE_URL}/blog`)
  const newest = publishedPosts(now).map(p => p.updated && p.updated > p.date ? p.updated : p.date).sort().at(-1)!
  assert.equal(new Date(blog!.lastModified as Date).getTime(), new Date(newest + 'T00:00:00').getTime())
  assert.ok(newest <= '2026-11-02')
})

// ---- "Keep reading" and the guide boxes inside a post -----------------------

test('"Keep reading" offers only public posts and never the post itself', () => {
  const now = noonish('2026-11-02')
  for (const post of POSTS) {
    const related = relatedPosts(post.slug, now)
    assert.ok(related.length <= 2)
    for (const r of related) {
      assert.notEqual(r.slug, post.slug)
      assert.ok(isPublished(r, now), `${post.slug} offers ${r.slug}, dated ${r.date}`)
    }
  }
})

test('the guide boxes inside a post drop the links to posts that are not public yet, and keep the others', () => {
  // ielts-speaking-part-2-topics (4 Nov) links to online-tutoring-jobs (3 Nov): on 2 Nov that link points at a 404, so it must go.
  const hrefs = (now: Date) => getPublishedPost(IELTS, now)?.content.flatMap(b => b.type === 'links' ? b.items.map(i => i.href) : []) ?? []
  assert.ok(POSTS.find(p => p.slug === IELTS)!.content.some(b => b.type === 'links' && b.items.some(i => i.href === `/blog/${JOBS}`)), 'the raw post links to the jobs post')
  const early = hrefs(noonish('2026-11-04'))   // the jobs post is already public on 4 Nov
  assert.ok(early.includes(`/blog/${JOBS}`))
  // a post published on 3 Nov, seen on 3 Nov, must not link a post of 4 Nov
  const jobsOnItsDay = getPublishedPost(JOBS, noonish('2026-11-03'))!
  const jobsLinks = jobsOnItsDay.content.flatMap(b => b.type === 'links' ? b.items.map(i => i.href) : [])
  assert.ok(!jobsLinks.includes(`/blog/${IELTS}`))
  for (const href of jobsLinks.filter(h => h.startsWith('/blog/'))) {
    const slug = href.slice('/blog/'.length)
    const target = POSTS.find(p => p.slug === slug)
    if (target) assert.ok(isPublished(target, noonish('2026-11-03')), href)
  }
})

test('for every post and every day in a window, no internal blog link in a public post leads to a post that is not public', () => {
  const start = new Date('2026-10-30T10:00:00+07:00').getTime()
  for (let i = 0; i < 14; i++) {
    const now = new Date(start + i * 86_400_000)
    for (const p of publishedPosts(now)) {
      const post = getPublishedPost(p.slug, now)!
      for (const b of post.content) {
        if (b.type !== 'links') continue
        for (const it of b.items) {
          const t = POSTS.find(x => `/blog/${x.slug}` === it.href)
          if (t) assert.ok(isPublished(t, now), `${todayInVietnam(now)}: ${p.slug} links ${it.href} (${t.date})`)
        }
      }
    }
  }
})

// ---- the page files call the filter and never the raw list ------------------

test('no public file reads the raw POSTS list: the pages, the sitemap and llms use the filtered functions', () => {
  for (const file of ['src/app/blog/page.tsx', 'src/app/blog/[slug]/page.tsx', 'src/app/sitemap.ts', 'src/lib/llms.ts', 'src/lib/blog-seo.ts']) {
    const code = read(file).split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    assert.doesNotMatch(code, /\bPOSTS\b/, `${file} reads POSTS`)
    assert.doesNotMatch(code, /\bgetPost\(/, `${file} calls getPost`)
  }
  assert.match(read('src/app/blog/page.tsx'), /blogIndexCards\(\)/)
  assert.match(read('src/app/blog/page.tsx'), /pageJsonLd\(PAGE_SEO\.blog, 'Blog', 'CollectionPage', cards\.map/)
  assert.match(read('src/app/blog/[slug]/page.tsx'), /getPublishedPost\(slug\)/)
  assert.match(read('src/app/blog/[slug]/page.tsx'), /relatedPosts\(post\.slug\)/)
  assert.match(read('src/app/blog/[slug]/page.tsx'), /publishedPosts\(\)\.map\(p => \(\{ slug: p\.slug \}\)\)/)
  assert.match(read('src/app/sitemap.ts'), /publishedPosts\(\)/)
  assert.match(read('src/lib/llms.ts'), /publishedPosts\(\)/)
})

test('every page that lists posts is rebuilt about every hour, so a post appears on its day without a daily deploy', () => {
  for (const file of ['src/app/blog/page.tsx', 'src/app/blog/[slug]/page.tsx', 'src/app/sitemap.ts', 'src/app/llms.txt/route.ts', 'src/app/llms-full.txt/route.ts']) {
    assert.match(read(file), /export const revalidate = 3600\b/, file)
  }
})

test('a link box drops a link to a post dated later, keeps the live ones, and disappears when nothing is left (made-up posts)', () => {
  const base = POSTS.find(p => p.slug === IELTS)!
  const later = { ...base, slug: 'zz-test-later', date: '2099-01-01', content: [] }
  const keeper = { ...base, slug: 'zz-test-keeper', date: '2026-11-04', content: [
    { type: 'links' as const, title: 'Mixed', items: [
      { label: 'Live', href: `/blog/${JOBS}`, text: 'live' },
      { label: 'Later', href: '/blog/zz-test-later', text: 'later' },
      { label: 'Outside', href: 'https://example.com/blog/zz-test-later', text: 'external' },
    ] },
    { type: 'links' as const, title: 'Only later', items: [{ label: 'Later', href: '/blog/zz-test-later', text: 'later' }] },
  ] }
  POSTS.push(later, keeper)
  try {
    const post = getPublishedPost('zz-test-keeper', noonish('2026-11-04'))!
    const boxes = post.content.filter(b => b.type === 'links')
    assert.equal(boxes.length, 1, 'the box with only a later link is gone')
    const hrefs = boxes[0].type === 'links' ? boxes[0].items.map(i => i.href) : []
    assert.deepEqual(hrefs, [`/blog/${JOBS}`, 'https://example.com/blog/zz-test-later'])
    assert.equal(getPublishedPost('zz-test-later', noonish('2026-11-04')), undefined)
    assert.ok(!relatedPosts('zz-test-keeper', noonish('2026-11-04')).some(p => p.slug === 'zz-test-later'))
  } finally {
    POSTS.splice(POSTS.indexOf(later), 1)
    POSTS.splice(POSTS.indexOf(keeper), 1)
  }
})
