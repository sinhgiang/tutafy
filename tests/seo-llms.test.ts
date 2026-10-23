// T-0620: /llms.txt and /llms-full.txt, the landing page's structured data
// (Organization, WebSite, FAQPage next to SoftwareApplication), a sitemap that no
// longer stamps "today" on static pages, and a robots.txt that stays open to every
// crawler. The landing page is a .tsx file node cannot import, so the page is
// checked by reading its source; the builders it calls are run for real.
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { GET as getLlms } from '@/app/llms.txt/route'
import { GET as getLlmsFull } from '@/app/llms-full.txt/route'
import sitemap from '@/app/sitemap'
import robots from '@/app/robots'
import { buildLlmsTxt, buildLlmsFullTxt } from '@/lib/llms'
import { homeJsonLd, jsonLdScript, type JsonLd } from '@/lib/seo'
import { SITE_URL, PLANS, FAQ, FEATURES, KEY_PAGES } from '@/lib/site-content'
import { PAGE_SEO, pageMetadata } from '@/lib/page-meta'
import { PLAN_PRICE } from '@/lib/plans'
import { POSTS } from '@/lib/blog'
import { loadUpdates } from '@/lib/updates'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8')

// A route has a page file in src/app, or inside one of its route groups such as (auth).
function hasPage(route: string): boolean {
  const walk = (dir: string, segments: string[]): boolean => {
    if (segments.length === 0) {
      return existsSync(path.join(dir, 'page.tsx')) ||
        readdirSync(dir, { withFileTypes: true }).some(d => d.isDirectory() && /^\(.+\)$/.test(d.name) && existsSync(path.join(dir, d.name, 'page.tsx')))
    }
    if (existsSync(path.join(dir, segments[0])) && walk(path.join(dir, segments[0]), segments.slice(1))) return true
    return readdirSync(dir, { withFileTypes: true }).some(d => d.isDirectory() && /^\(.+\)$/.test(d.name) && walk(path.join(dir, d.name), segments))
  }
  return walk(path.join(ROOT, 'src/app'), route.split('/').filter(Boolean))
}

// ---- /llms.txt -------------------------------------------------------------

test('/llms.txt answers 200 as plain text with the real prices and pages', async () => {
  const res = getLlms()
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type') ?? '', /^text\/plain; charset=utf-8/)
  const body = await res.text()
  assert.equal(body, buildLlmsTxt())
  assert.match(body, /^# Tutafy\n/)
  assert.match(body, /\n> .*0% commission/)
  assert.match(body, /Who it is for: .*tutors/i)

  // Prices: the plan list in lib/plans.ts (what the app charges) must agree with the text.
  assert.ok(body.includes(`- Free: ${PLAN_PRICE.free} `), 'Free price line')
  assert.ok(body.includes(`- Pro: ${PLAN_PRICE.pro}.`), 'Pro price line')
  assert.ok(body.includes(`- Academy: ${PLAN_PRICE.academy}.`), 'Academy price line')
  assert.ok(body.includes('$12/mo') && body.includes('$29/mo'))

  for (const f of FEATURES) assert.ok(body.includes(f.title), f.title)
})

test('/llms.txt links the six key pages and every blog post, and each link is a real route', async () => {
  const body = await getLlms().text()
  const urls = [...body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map(m => m[1])

  for (const p of KEY_PAGES) {
    const url = `${SITE_URL}${p.path === '/' ? '' : p.path}`
    assert.ok(urls.includes(url), `missing key page ${url}`)
  }
  for (const wanted of ['/', '/blog', '/tutors', '/about', '/customers', '/contact']) {
    assert.ok(KEY_PAGES.some(p => p.path === wanted), `KEY_PAGES lacks ${wanted}`)
  }
  assert.equal(POSTS.length > 0, true)
  for (const post of POSTS) assert.ok(urls.includes(`${SITE_URL}/blog/${post.slug}`), `missing post ${post.slug}`)

  const slugs = new Set(POSTS.map(p => p.slug))
  for (const url of urls) {
    assert.ok(url.startsWith(SITE_URL), `link off-site: ${url}`)
    const route = url.slice(SITE_URL.length) || '/'
    if (route.startsWith('/blog/')) {
      assert.ok(slugs.has(route.slice('/blog/'.length)), `no such post: ${route}`)
    } else {
      // a page file, or a route handler such as /llms-languages.txt (T-0875)
      assert.ok(hasPage(route) || existsSync(path.join(ROOT, 'src/app', route, 'route.ts')), `no page file for ${route}`)
    }
  }
})

test('/llms-full.txt carries the plan contents, the feature texts, the FAQ and every post summary', async () => {
  const res = getLlmsFull()
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type') ?? '', /^text\/plain; charset=utf-8/)
  const body = await res.text()
  assert.equal(body, buildLlmsFullTxt())
  const short = await getLlms().text()
  assert.ok(body.length > short.length)

  for (const p of PLANS) for (const feat of p.features) assert.ok(body.includes(feat), `${p.name}: ${feat}`)
  for (const f of FEATURES) assert.ok(body.includes(f.desc), f.title)
  for (const f of FAQ) assert.ok(body.includes(f.q) && body.includes(f.a), f.q)
  for (const post of POSTS) assert.ok(body.includes(post.description), post.slug)
})

test('the llms files contain no email address or phone number', async () => {
  for (const body of [await getLlms().text(), await getLlmsFull().text()]) {
    assert.doesNotMatch(body, /[\w.+-]+@[\w-]+\.[\w.]+/, 'email address')
    assert.doesNotMatch(body, /\b\d{3,4}[ .-]\d{3}[ .-]\d{3,4}\b/, 'phone number')
  }
})

test('KEY_PAGES descriptions repeat what the pages themselves say (the description in src/lib/page-meta.ts)', () => {
  const byPath = new Map(KEY_PAGES.map(p => [p.path, p.description]))
  for (const [path, key] of [['/', 'home'], ['/blog', 'blog'], ['/tutors', 'tutors'], ['/about', 'about'], ['/customers', 'customers'], ['/contact', 'contact']] as const) {
    assert.equal(byPath.get(path), PAGE_SEO[key].description, path)
    assert.equal(pageMetadata(key).description, PAGE_SEO[key].description, path)
  }
})

// ---- landing page structured data -------------------------------------------

test('the landing page structured data has SoftwareApplication, Organization, WebSite and FAQPage', () => {
  const blocks = homeJsonLd()
  const types = blocks.map(b => b['@type'])
  assert.deepEqual(types, ['SoftwareApplication', 'Organization', 'WebSite', 'FAQPage'])
  for (const b of blocks) assert.equal(b['@context'], 'https://schema.org')

  const app = blocks[0] as { offers: { name: string; price: string; priceCurrency: string }[]; url: string }
  assert.deepEqual(app.offers, [
    { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
    { '@type': 'Offer', name: 'Pro', price: '12', priceCurrency: 'USD' },
    { '@type': 'Offer', name: 'Academy', price: '29', priceCurrency: 'USD' },
  ])

  const org = blocks[1] as { '@id': string; name: string; url: string; logo: string }
  assert.equal(org.name, 'Tutafy')
  assert.equal(org.url, SITE_URL)
  assert.equal(org.logo, `${SITE_URL}/icon-512.png`)
  assert.ok(existsSync(path.join(ROOT, 'public/icon-512.png')), 'logo file exists')

  const site = blocks[2] as { url: string; publisher: { '@id': string } }
  assert.equal(site.url, SITE_URL)
  assert.equal(site.publisher['@id'], org['@id'], 'WebSite names the Organization as publisher')
})

test('the FAQPage is exactly the question and answer pairs the page shows, nothing added', () => {
  const faq = homeJsonLd().find(b => b['@type'] === 'FAQPage') as {
    mainEntity: { '@type': string; name: string; acceptedAnswer: { '@type': string; text: string } }[]
  }
  assert.equal(faq.mainEntity.length, FAQ.length)
  assert.equal(FAQ.length, 9)
  faq.mainEntity.forEach((item, i) => {
    assert.equal(item['@type'], 'Question')
    assert.equal(item.name, FAQ[i].q)
    assert.equal(item.acceptedAnswer['@type'], 'Answer')
    assert.equal(item.acceptedAnswer.text, FAQ[i].a)
  })
})

test('every block is valid JSON once written for a script tag, and cannot close the tag early', () => {
  for (const block of homeJsonLd()) {
    const script = jsonLdScript(block)
    assert.deepEqual(JSON.parse(script), block)
    assert.ok(!script.includes('<'))
  }
  const hostile: JsonLd = { text: 'a</script><script>alert(1)</script>' + String.fromCharCode(0x2028) }
  const script = jsonLdScript(hostile)
  assert.ok(!script.includes('<') && !script.includes(String.fromCharCode(0x2028)))
  assert.deepEqual(JSON.parse(script), hostile)
})

// What the page source has to look like so the markup and the visible page cannot drift.
function pageProblems(source: string): string[] {
  const problems: string[] = []
  if (!/import \{[^}]*\bFAQ\b[^}]*\} from '@\/lib\/site-content'/.test(source)) problems.push('FAQ is not imported from site-content')
  if (!/import \{[^}]*\bPLANS\b[^}]*\} from '@\/lib\/site-content'/.test(source)) problems.push('PLANS is not imported from site-content')
  if (!/\{FAQ\.map\(/.test(source)) problems.push('the FAQ list is not rendered from FAQ')
  if (!/\{PLANS\.map\(/.test(source)) problems.push('the pricing cards are not rendered from PLANS')
  if (!/\{homeJsonLd\(\)\.map\(/.test(source)) problems.push('the page does not print homeJsonLd()')
  if (/\bconst (FAQ|PLANS|FEATURES)\s*=/.test(source)) problems.push('FAQ, PLANS or FEATURES is declared again inside the page')
  for (const f of FAQ) if (source.includes(f.q)) problems.push(`question typed into the page: ${f.q}`)
  for (const p of PLANS) for (const price of [p.price + '/mo', `price: '${p.price}'`]) if (source.includes(price)) problems.push(`price typed into the page: ${price}`)
  return problems
}

test('the landing page prints its FAQ, prices and markup from the one shared source', () => {
  assert.deepEqual(pageProblems(read('src/app/page.tsx')), [])
})

test('the page check does catch a page that types its own FAQ or price', () => {
  const real = read('src/app/page.tsx')
  const withCopy = real + `\nconst FAQ = [{ q: '${FAQ[0].q}', a: 'x' }]\n`
  const problems = pageProblems(withCopy)
  assert.ok(problems.some(p => p.includes('declared again')))
  assert.ok(problems.some(p => p.includes('question typed')))
  assert.ok(pageProblems(real.replace('{homeJsonLd().map', '{null && homeJsonLd().map')).some(p => p.includes('homeJsonLd')))
  assert.ok(pageProblems(real.replace('{homeJsonLd().map', '{[].map')).some(p => p.includes('homeJsonLd')))
  assert.ok(pageProblems(real + "\n<span>$12/mo</span>\n").some(p => p.includes('price typed')))
})

// ---- sitemap ----------------------------------------------------------------

test('the sitemap puts no date on static pages and the posts keep their own dates', async () => {
  const entries = (await sitemap())
  const prefix = `${SITE_URL}/blog/`
  const postDates = new Map(POSTS.map(p => [`${prefix}${p.slug}`, new Date(p.date + 'T00:00:00').getTime()]))

  for (const e of entries) {
    if (postDates.has(e.url)) {
      assert.equal(new Date(e.lastModified as Date).getTime(), postDates.get(e.url), e.url)
    } else if (e.url === `${SITE_URL}/blog`) {
      const newest = Math.max(...postDates.values())
      assert.equal(new Date(e.lastModified as Date).getTime(), newest, 'blog index = newest post')
    } else if (e.url === `${SITE_URL}/updates`) {
      // the Updates page has a real date: the day of its newest entry (content/updates/, T-0683)
      assert.equal(new Date(e.lastModified as Date).toISOString().slice(0, 10), loadUpdates()[0].date, 'updates page = newest entry')
    } else {
      assert.equal(e.lastModified, undefined, `static page ${e.url} must not carry a date`)
    }
  }
  assert.equal(entries.filter(e => postDates.has(e.url)).length, POSTS.length)

  const urls = entries.map(e => e.url)
  for (const p of KEY_PAGES) assert.ok(urls.includes(`${SITE_URL}${p.path === '/' ? '' : p.path}`), p.path)
})

test('the sitemap does not change when the clock does', async () => {
  mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 0, 5) })
  const earlier = JSON.stringify((await sitemap()))
  mock.timers.setTime(Date.UTC(2027, 6, 20))
  const later = JSON.stringify((await sitemap()))
  mock.timers.reset()
  assert.equal(earlier, later)
})

// ---- robots -----------------------------------------------------------------

test('robots.txt stays open to every crawler, including the AI assistants', () => {
  const r = robots()
  assert.deepEqual(r, {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin', '/portal/', '/settings', '/onboarding'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  })

  const rules = Array.isArray(r.rules) ? r.rules : [r.rules]
  for (const rule of rules) {
    const agents = Array.isArray(rule.userAgent) ? rule.userAgent : [rule.userAgent]
    for (const agent of agents) {
      assert.ok(agent === '*', `no rule may single out a crawler, found ${agent}`)
      assert.ok(!/gptbot|claudebot|perplexity|google-extended|ccbot|oai-searchbot/i.test(String(agent)))
    }
    const disallow = ([] as (string | undefined)[]).concat(rule.disallow)
    for (const route of ['/', '/blog', '/blog/any-post', '/tutors', '/about', '/customers', '/contact', '/llms.txt', '/llms-full.txt', '/sitemap.xml']) {
      for (const d of disallow) {
        assert.ok(!d || !route.startsWith(d), `${route} is blocked by Disallow: ${d}`)
      }
    }
  }
})
