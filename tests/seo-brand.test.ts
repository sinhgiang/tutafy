// T-0850: the name Tutafy, the titles, the answers and the share picture of the public pages.
//   - every title names Tutafy, in one pattern ("Topic | Tutafy"; the home page and the two posts about Tutafy start with it), within 60 characters;
//   - the share picture is a real 1200 x 630 PNG that carries the name, and every page points to it;
//   - the short answers an assistant needs (what Tutafy is, who it is for, how it differs from a marketplace) are in the FAQ the
//     home page prints, in /llms.txt and on /about, and the FAQ data is exactly what the page prints;
//   - the directory page prints its own questions with FAQPage data built from the same list;
//   - the number of AI tools the public pages state is the number the app has;
//   - a tutor's profile data holds the lesson price only when the price and currency are real, and never a rating of its own;
//   - the footers carry the link to the tutor directory; every image on a public page has a text alternative.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { PAGE_SEO, BLOG_SEO, pageMetadata, blogPostMetadata, TITLE_MAX, TITLE_MIN } from '@/lib/page-meta'
import { tutorSeoText, tutorJsonLd, lessonOffer } from '@/lib/tutor-seo'
import { FAQ, TUTORS_FAQ, PLANS } from '@/lib/site-content'
import { buildLlmsTxt, buildLlmsFullTxt, IN_SHORT_COUNT } from '@/lib/llms'
import { faqPageJsonLd } from '@/lib/seo'
import { FOOTER_LINKS } from '@/components/SiteFooter.tsx'
import { TutorsFaq } from '@/components/directory/TutorsFaq.tsx'
import { GET as ogImage } from '@/app/og/route.tsx'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

// ---- the name and the title pattern ---------------------------------------------------------------------------------

/** "Tutafy ..." (the home page, a post about Tutafy) or "Topic | Tutafy" or "Topic | Tutafy Section". */
export function titleProblem(title: string): string | null {
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) return `${title.length} characters`
  if (!(title.startsWith('Tutafy') || /\| Tutafy( [A-Z][a-z]+)?$/.test(title))) return 'the name Tutafy is not at the start or after a "|" at the end'
  if ((title.match(/Tutafy/g) ?? []).length > 2) return 'the name is repeated'
  return null
}

test('every title of a fixed page names Tutafy in the one pattern and fits in 60 characters', () => {
  const bad = Object.entries(PAGE_SEO).map(([k, p]) => [k, titleProblem(p.title)] as const).filter(([, p]) => p)
  assert.deepEqual(bad, [])
})

test('every blog post title names Tutafy in the same pattern and fits in 60 characters', () => {
  const rows = Object.entries(BLOG_SEO)
  assert.ok(rows.length >= 25, `only ${rows.length} posts`)
  assert.deepEqual(rows.map(([slug, p]) => [slug, titleProblem(p.title)] as const).filter(([, p]) => p), [])
})

test('a tutor profile title is "Name: Languages Tutor | Tutafy", also for a long name or many languages', () => {
  for (const t of [
    { name: 'Sarah Test', languages: ['English', 'Spanish'] },
    { name: 'A Very Long Name That Goes On And On And On And On And On And On', languages: ['English', 'Spanish', 'French'] },
    { name: null, languages: [] },
  ]) assert.equal(titleProblem(tutorSeoText(t).title), null, JSON.stringify(t))
})

test('the title rule catches what it should (self-check on bad titles)', () => {
  assert.ok(titleProblem('How to Get Your First 10 Tutoring Clients'), 'no brand')
  assert.ok(titleProblem('Tutafy'), 'too short')
  assert.ok(titleProblem('A'.repeat(55) + ' | Tutafy'), 'too long')
  assert.ok(titleProblem('Tutafy Blog | Tutafy | Tutafy'), 'repeated')
  assert.equal(titleProblem('Tips & Guides for Online Tutors | Tutafy Blog'), null)
})

test('the metadata of every page and post carries the same title in the page, the open-graph card and the twitter card', () => {
  for (const key of Object.keys(PAGE_SEO) as (keyof typeof PAGE_SEO)[]) {
    const m = pageMetadata(key) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
    assert.equal(m.title.absolute, PAGE_SEO[key].title, key)
    assert.equal(m.openGraph.title, PAGE_SEO[key].title, key)
    assert.equal(m.twitter.title, PAGE_SEO[key].title, key)
    assert.equal(m.openGraph.siteName, 'Tutafy', key)
  }
  const post = blogPostMetadata('stop-tutoring-no-shows') as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  assert.match(post.title.absolute, /\| Tutafy$/)
})

// ---- the share picture ----------------------------------------------------------------------------------------------

test('/og is a real 1200 x 630 PNG, and every page and post points to it as its share picture', async () => {
  const res = await ogImage()
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type') ?? '', /^image\/png/)
  const bytes = new Uint8Array(await res.arrayBuffer())
  assert.deepEqual([...bytes.slice(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'PNG signature')
  const view = new DataView(bytes.buffer, bytes.byteOffset)
  assert.equal(view.getUint32(16), 1200, 'width')
  assert.equal(view.getUint32(20), 630, 'height')
  assert.match(read('src/app/og/route.tsx'), /alt="Tutafy"/, 'the picture carries the name (T-0969: the horizontal logo, whose word is outlines)')
  // and the name really is in the picture: the top left of the drawn PNG holds the white word on the dark surface
  const sharp = (await import('sharp')).default
  const { data, info } = await sharp(Buffer.from(bytes)).extract({ left: 80, top: 64, width: 400, height: 100 }).raw().toBuffer({ resolveWithObject: true })
  let bright = 0
  for (let i = 0; i < data.length; i += info.channels) if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) bright++
  assert.ok(bright > 1500, `white pixels of the word in the logo area: ${bright}`)

  for (const key of Object.keys(PAGE_SEO) as (keyof typeof PAGE_SEO)[]) {
    const m = pageMetadata(key) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
    assert.deepEqual([m.openGraph.images[0].url, m.openGraph.images[0].width, m.openGraph.images[0].height], ['/og', 1200, 630], key)
    assert.equal(m.twitter.card, 'summary_large_image', key)
    assert.deepEqual(m.twitter.images, ['/og'], key)
  }
})

// ---- the short answers ------------------------------------------------------------------------------------------------

test('the first three questions of the FAQ are what Tutafy is, who it is for, and how it differs from a marketplace', () => {
  assert.equal(IN_SHORT_COUNT, 3)
  assert.deepEqual(FAQ.slice(0, 3).map(f => f.q), ['What is Tutafy?', 'Who is Tutafy for?', 'How is Tutafy different from Preply or iTalki?'])
  assert.match(FAQ[0].a, /^Tutafy is software for independent online tutors/)
  assert.match(FAQ[2].a, /not a marketplace/)
})

test('/llms.txt opens with those answers ("In short") and /llms-full.txt has the whole FAQ', () => {
  const short = buildLlmsTxt()
  assert.ok(short.indexOf('## In short') > 0 && short.indexOf('## In short') < short.indexOf('## Main features'))
  for (const f of FAQ.slice(0, 3)) assert.ok(short.includes(f.a), f.q)
  const full = buildLlmsFullTxt()
  for (const f of FAQ) assert.ok(full.includes(`### ${f.q}`), f.q)
})

test('the About page opens with the first answer, taken from the same list', () => {
  const src = read('src/app/about/page.tsx')
  assert.match(src, /import \{ FAQ \} from '@\/lib\/site-content'/)
  assert.ok(src.includes('{FAQ[0].a}'))
  assert.ok(src.indexOf('{FAQ[0].a}') < src.indexOf('Tutafy started with a frustration'), 'the answer comes before the story')
})

test('the home page FAQ is the shared list and its data is exactly the pairs it prints (no pair added or dropped)', () => {
  const data = faqPageJsonLd(FAQ) as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] }
  assert.deepEqual(data.mainEntity.map(e => [e.name, e.acceptedAnswer.text]), FAQ.map(f => [f.q, f.a]))
  assert.match(read('src/app/page.tsx'), /FAQ\.map\(/)
})

// ---- the directory page -----------------------------------------------------------------------------------------------

test('/tutors prints its questions and the FAQPage data holds exactly the same pairs', () => {
  const html = renderToStaticMarkup(createElement(TutorsFaq))
  for (const f of TUTORS_FAQ) {
    assert.ok(html.includes(f.q.replace(/'/g, '&#x27;')) || html.includes(f.q), f.q)
    assert.ok(html.includes(f.a), f.a)
  }
  const ld = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)
  assert.ok(ld, 'the data is in the page')
  const data = JSON.parse(ld![1])
  assert.equal(data['@type'], 'FAQPage')
  assert.deepEqual(data.mainEntity.map((e: { name: string; acceptedAnswer: { text: string } }) => [e.name, e.acceptedAnswer.text]), TUTORS_FAQ.map(f => [f.q, f.a]))
  assert.equal((html.match(/<h2\b/g) ?? []).length, 1)
  assert.match(read('src/app/tutors/(directory)/page.tsx'), /cards\.length > 0 && <TutorsFaq \/>/) // only when tutors are listed: the answers say "every tutor you see"
  assert.doesNotMatch(JSON.stringify(TUTORS_FAQ) + JSON.stringify(FAQ), /[A-Za-z0-9._-]+@[A-Za-z0-9-]+\.[a-z]{2,}/, 'no e-mail address')
})

// ---- facts: no number that is not true ---------------------------------------------------------------------------------

test('the number of AI tools the public pages state is the number of tools the app has', () => {
  const tools = (read('src/app/(dashboard)/ai/AiToolsClient.tsx').match(/^\s+id: '[a-z-]+',$/gm) ?? []).length
  assert.ok(tools >= 5, `found ${tools} tools in the app`)
  const files = ['src/app/page.tsx', 'src/app/switch/page.tsx', 'src/lib/site-content.ts', 'src/lib/blog.ts', 'src/components/plan/LockedFeature.tsx']
  const claims = files.flatMap(f => [...read(f).matchAll(/\b(\d+) (?:AI teaching tools|AI tools|AI-powered tools)/g)].map(m => `${f}: ${m[0]}`))
  assert.ok(claims.length >= 4, `the claims were not found: ${claims.length}`)
  assert.deepEqual(claims.filter(c => !c.includes(`: ${tools} `)), [])
  assert.ok(PLANS.some(p => p.features.some(x => x.includes(`${tools} AI teaching tools`))))
})

test('a profile holds a lesson price only when the price and the currency are real; no tutor gets a rating of its own', () => {
  assert.deepEqual(lessonOffer(40, 'USD'), { '@type': 'Offer', itemOffered: { '@type': 'Service', name: '1-on-1 online lesson' }, price: '40', priceCurrency: 'USD' })
  assert.equal(lessonOffer('25.5', 'EUR')!.price, '25.5')
  for (const [p, c] of [[null, 'USD'], [0, 'USD'], [-5, 'USD'], ['abc', 'USD'], [NaN, 'USD'], [40, null], [40, 'usd'], [40, 'DOLLARS'], [9e9, 'USD']] as const) assert.equal(lessonOffer(p, c), null, `${p} ${c}`)
  const withPrice = JSON.stringify(tutorJsonLd({ slug: 'sarah-test', name: 'Sarah Test', languages: ['English'], default_lesson_price: 40, currency: 'USD', reviews: [] }))
  assert.match(withPrice, /"makesOffer":\{"@type":"Offer"/)
  const without = JSON.stringify(tutorJsonLd({ slug: 'sarah-test', name: 'Sarah Test', languages: ['English'], reviews: [] }))
  assert.doesNotMatch(without, /makesOffer|review|aggregateRating|ratingValue/)
  assert.doesNotMatch(withPrice, /aggregateRating/)
})

// ---- links and pictures -------------------------------------------------------------------------------------------------

test('the footers link to the tutor directory (shared footer, home page, blog index)', () => {
  assert.ok(FOOTER_LINKS.some(l => l.href === '/tutors'))
  for (const f of ['src/app/page.tsx', 'src/app/blog/page.tsx']) assert.match(read(f), /href="\/tutors"[^>]*>Find tutors</, f)
})

test('every image on a public page has a text alternative', () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap(n => {
    const p = path.join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : /\.tsx$/.test(n) ? [p] : []
  })
  const skip = /[\\/]\((dashboard|admin)\)[\\/]|[\\/]portal[\\/]|[\\/]api[\\/]|[\\/]og[\\/]/
  const files = [...walk(path.join(ROOT, 'src/app')).filter(f => !skip.test(f)), ...walk(path.join(ROOT, 'src/components/blog')), ...walk(path.join(ROOT, 'src/components/directory')), ...walk(path.join(ROOT, 'src/components/updates'))]
  const bad = files.flatMap(f => [...readFileSync(f, 'utf8').matchAll(/<(?:img|Image)\b[^>]*?>/gs)].filter(m => !/\balt=/.test(m[0]) && !/\{\.\.\./.test(m[0])).map(m => `${path.relative(ROOT, f)}: ${m[0].slice(0, 60)}`))
  assert.deepEqual(bad, [])
  assert.ok(files.length > 15)
  assert.equal(/<img\b[^>]*?>/s.test('<img src="a.png" />') && !/\balt=/.test('<img src="a.png" />'), true, 'the check really sees a missing alt')
})
