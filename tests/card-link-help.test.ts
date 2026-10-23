// T-0664: the help under the Card payment link field in Settings (Payments tab) has three links
// (Stripe's Payment links page, our step-by-step post, Stripe's official guide), and the post they
// point to is a real, listed, honest post. The Settings page is a .tsx file node cannot import,
// so its source is read; the constants and the post data are the real ones.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { CARD_LINK_HELP_LINKS, STRIPE_GUIDE_SLUG } from '@/lib/card-link-help'
import { POSTS, heroFor, type Post, type PostBlock } from '@/lib/blog'
import { BLOG_SEO } from '@/lib/page-meta'
import { SITE_URL } from '@/lib/site-url'
import { buildLlmsTxt, buildLlmsFullTxt } from '@/lib/llms'
import sitemap from '@/app/sitemap'
import { settingsSource } from './support/settings-source.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8')
const SETTINGS = 'src/app/(dashboard)/settings/page.tsx'

const post = POSTS.find(p => p.slug === STRIPE_GUIDE_SLUG)

// ---- the three links in Settings ------------------------------------------------

/** What is wrong with the help block of the Card payment link field in this source (empty = fine). */
export function helpLinkProblems(source: string): string[] {
  const problems: string[] = []
  const field = source.indexOf('Card payment link (Stripe Payment Link)')
  const end = field === -1 ? -1 : source.indexOf('card-link-saved-warning', field)
  if (field === -1 || end === -1) return ['the Card payment link field was not found']
  const block = source.slice(field, end)
  for (const [name, expr] of [
    ['Payment links (Stripe)', 'CARD_LINK_HELP_LINKS.stripePaymentLinks'],
    ['Step-by-step guide', 'CARD_LINK_HELP_LINKS.stepByStepGuide'],
    ["Stripe's official guide", 'CARD_LINK_HELP_LINKS.stripeOfficialGuide'],
  ] as const) {
    const anchors = [...block.matchAll(/<a\b[^>]*>/g)].map(m => m[0]).filter(a => a.includes(`href={${expr}}`))
    if (anchors.length !== 1) { problems.push(`${name}: expected one link, found ${anchors.length}`); continue }
    if (!anchors[0].includes('target="_blank"')) problems.push(`${name}: does not open a new tab`)
    if (!/rel="[^"]*noopener[^"]*"/.test(anchors[0])) problems.push(`${name}: no rel noopener`)
  }
  if (!block.includes('>Step-by-step guide</a>')) problems.push('the label "Step-by-step guide" is missing')
  if (!/Stripe(&apos;|')s official guide<\/a>/.test(block)) problems.push('the label "Stripe\'s official guide" is missing')
  if (!block.includes('>Payment links</a>')) problems.push('the label "Payment links" is missing')
  return problems
}

test('Settings: the field shows Stripe Payment links, the step-by-step guide and Stripe\'s official guide, each in a new tab', () => {
  assert.deepEqual(helpLinkProblems(settingsSource()), [])
})

test('Settings self-check: removing any one of the three links, or its new-tab or noopener, is reported', () => {
  const src = settingsSource()
  for (const expr of ['stripePaymentLinks', 'stepByStepGuide', 'stripeOfficialGuide']) {
    const gone = src.replace(`href={CARD_LINK_HELP_LINKS.${expr}}`, 'href="#"')
    assert.notEqual(gone, src, expr)
    assert.ok(helpLinkProblems(gone).length > 0, `${expr} removed was not reported`)
  }
  const noTab = src.replace(/(href=\{CARD_LINK_HELP_LINKS\.stepByStepGuide\}) target="_blank"/, '$1')
  assert.notEqual(noTab, src)
  assert.ok(helpLinkProblems(noTab).some(p => p.includes('new tab')))
  const noRel = src.replace(/(href=\{CARD_LINK_HELP_LINKS\.stripeOfficialGuide\} target="_blank") rel="noopener noreferrer"/, '$1')
  assert.notEqual(noRel, src)
  assert.ok(helpLinkProblems(noRel).some(p => p.includes('noopener')))
})

test('the three addresses are the real ones, and the post address is on the main site', () => {
  assert.equal(CARD_LINK_HELP_LINKS.stripePaymentLinks, 'https://dashboard.stripe.com/payment-links')
  assert.equal(CARD_LINK_HELP_LINKS.stripeOfficialGuide, 'https://docs.stripe.com/payment-links/create')
  assert.equal(CARD_LINK_HELP_LINKS.stepByStepGuide, `${SITE_URL}/blog/${STRIPE_GUIDE_SLUG}`)
  assert.equal(CARD_LINK_HELP_LINKS.stepByStepGuide, 'https://www.tutafy.com/blog/how-to-take-card-payments-with-a-stripe-payment-link')
})

test('Settings still validates the link before saving (the help change touched nothing else)', () => {
  const src = settingsSource()
  assert.match(src, /cardLinkForSave\(form\.paddle_checkout_link, savedLink\)/)
  assert.match(src, /data-testid="card-link-error"/)
})

// ---- the post ---------------------------------------------------------------------

function blockText(b: PostBlock): string[] {
  switch (b.type) {
    case 'p': case 'h2': case 'h3': return [b.text]
    case 'ul': case 'takeaways': return b.items
    case 'callout': return [b.title ?? '', b.text]
    case 'statCards': return b.cards.flatMap(c => [c.value, c.label])
    case 'compare': return [b.caption ?? '', ...b.headers, ...b.rows.flat().map(String)]
    case 'prosCons': return [b.title ?? '', ...b.pros, ...b.cons]
    case 'cta': return [b.title, b.text ?? '', b.button]
    case 'faq': return b.items.flatMap(i => [i.q, i.a])
    case 'image': return [b.alt, b.caption ?? '']
    default: return []
  }
}
const postText = (p: Post) => [p.title, p.description, ...p.content.flatMap(blockText)].join('\n')

test('the post exists, is dated, and has a hero image on disk', () => {
  assert.ok(post, 'post missing')
  assert.match(post!.date, /^\d{4}-\d{2}-\d{2}$/)
  const hero = heroFor(STRIPE_GUIDE_SLUG)
  assert.ok(hero, 'no hero entry')
  for (const file of [hero!.avif, hero!.webp]) assert.ok(existsSync(path.join(ROOT, 'public', file)), file)
  for (const b of post!.content) if (b.type === 'image') {
    for (const ext of ['avif', 'webp']) assert.ok(existsSync(path.join(ROOT, 'public', `${b.src}.${ext}`)), `${b.src}.${ext}`)
  }
})

test('the post is in the sitemap, in /llms.txt and in /llms-full.txt', async () => {
  const urls = new Set((await sitemap()).map(e => e.url))
  assert.ok(urls.has(CARD_LINK_HELP_LINKS.stepByStepGuide), 'sitemap')
  assert.ok(buildLlmsTxt().includes(`](${CARD_LINK_HELP_LINKS.stepByStepGuide})`), 'llms.txt')
  const full = buildLlmsFullTxt()
  assert.ok(full.includes(`](${CARD_LINK_HELP_LINKS.stepByStepGuide})`), 'llms-full link')
  assert.ok(full.includes(post!.description), 'llms-full description')
})

test('the post has a title and description of its own, in the post and in the page metadata', () => {
  const others = POSTS.filter(p => p.slug !== STRIPE_GUIDE_SLUG)
  for (const o of others) {
    assert.notEqual(o.title.toLowerCase(), post!.title.toLowerCase(), `title repeats ${o.slug}`)
    assert.notEqual(o.description.toLowerCase(), post!.description.toLowerCase(), `description repeats ${o.slug}`)
    assert.notEqual(BLOG_SEO[o.slug]?.title.toLowerCase(), BLOG_SEO[STRIPE_GUIDE_SLUG]?.title.toLowerCase(), `meta title repeats ${o.slug}`)
    assert.notEqual(BLOG_SEO[o.slug]?.description.toLowerCase(), BLOG_SEO[STRIPE_GUIDE_SLUG]?.description.toLowerCase(), `meta description repeats ${o.slug}`)
  }
  assert.ok(BLOG_SEO[STRIPE_GUIDE_SLUG], 'no BLOG_SEO entry')
})

test('the post walks through every step, with the names of the buttons, and points to Stripe\'s own guide', () => {
  const text = postText(post!)
  for (const must of [
    'https://dashboard.stripe.com/payment-links/create/standard-pricing',
    'Add a new product', 'Create link', 'https://buy.stripe.com/',
    'Settings', 'Payments', 'Card payment link', 'Save', 'Pay by card',
    CARD_LINK_HELP_LINKS.stripeOfficialGuide,
  ]) assert.ok(text.includes(must), `missing: ${must}`)
  const steps = post!.content.filter(b => b.type === 'h2').map(b => (b as { text: string }).text).filter(t => /^Step \d/.test(t))
  assert.deepEqual(steps.map(s => s.slice(0, 6)), ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5'])
})

test('the post says the limits plainly: one price per link, no automatic "paid", the Payments tab is Pro', () => {
  const text = postText(post!)
  assert.match(text, /one fixed product and price|One link, one price/i)
  assert.match(text, /does not mark the lesson as paid/i)
  assert.match(text, /Pro and Academy/)
  assert.match(text, /Customers choose what to pay/)
  assert.match(text, /Let customers adjust quantity/)
})

test('the post promises nothing about Stripe Connect, and has no variable name, secret or operator wording', () => {
  const text = postText(post!)
  assert.doesNotMatch(text, /connect/i, 'Stripe Connect is not switched on for everyone, so the post must not mention or promise it')
  assert.doesNotMatch(text, /STRIPE_[A-Z_]+|NEXT_PUBLIC|process\.env|paddle_checkout_link|\.env|service[ _-]role|supabase|webhook|migration|localhost/i)
  assert.doesNotMatch(text, /[\w.+-]+@[\w-]+\.[\w.]+/, 'email address')
  assert.doesNotMatch(text, /\b\d{3,4}[ .-]\d{3}[ .-]\d{3,4}\b/, 'phone number')
  assert.doesNotMatch(text, /\b(guarantee[ds]?|instantly|automatically marks)\b/i)
})

test('the post makes no invented proof (no customer count, rating or testimonial)', () => {
  const text = postText(post!)
  assert.doesNotMatch(text, /\b\d[\d,]*\+? (tutors|students|customers|reviews)\b/i)
  assert.doesNotMatch(text, /★|\bstars?\b|testimonial/i)
})
