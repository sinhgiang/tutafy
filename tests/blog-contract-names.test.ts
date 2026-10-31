// T-1199 and T-1201: the two traffic articles dated 6 Nov 2026, /blog/tutoring-contract-template and /blog/tutoring-business-names.
// Kept in a file of its own so that two pull requests that each add an article never edit the same line of tests/blog-length.test.ts or tests/blog-photos.test.ts.
// Checks the owner's rules for a traffic article (3,500 to 4,000 words, 3 to 4 credited real photos), the calendar date, the hero image, that every
// "related guide" link points to a post that exists, and the honesty lines each article must keep (not legal advice; Tutafy's gaps named; invented examples said to be unchecked).
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { POSTS, getPost, heroFor, type PostBlock } from '@/lib/blog'
import { BLOG_SEO, TITLE_MAX, DESCRIPTION_MAX, DESCRIPTION_MIN } from '@/lib/page-meta'
import { count } from '../scripts/count-post-words.mjs'

type Photo = Extract<PostBlock, { type: 'image' }>
const credits: Record<string, { licence?: string; source?: string }> = JSON.parse(readFileSync('public/blog/inline/credits.json', 'utf8'))
const SLUGS = ['tutoring-contract-template', 'tutoring-business-names']
const textOf = (blocks: PostBlock[]) => JSON.stringify(blocks)

for (const slug of SLUGS) {
  const post = getPost(slug)

  test(`${slug}: is registered and dated for the calendar day 2026-11-06`, () => {
    assert.ok(post, `${slug} is registered in src/lib/blog.ts`)
    assert.equal(post.date, '2026-11-06')
    assert.equal(POSTS.filter(p => p.slug === slug).length, 1, 'registered once')
  })

  test(`${slug}: 3,500 to 4,000 words`, () => {
    const { body, total } = count(post)
    assert.ok(body >= 3500, `${body} words in the body, 3,500 needed`)
    assert.ok(total <= 4000, `${total} words with photo captions, 4,000 at most`)
  })

  test(`${slug}: 3 to 4 real photos, each credited with a source link and a recorded licence, files under 200 KB`, () => {
    const photos = post!.content.filter((b): b is Photo => b.type === 'image' && !!b.credit)
    assert.ok(photos.length >= 3 && photos.length <= 4, `${photos.length} photos`)
    for (const p of photos) {
      const name = p.src.split('/').pop()!
      assert.ok(p.alt.length > 20, `${name}: alt text`)
      assert.match(p.credit ?? '', /^Photo: .+\((CC0|CC BY[^)]*|public domain)\)/, `${name}: credit names the author and the licence`)
      assert.match(p.creditHref ?? '', /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/, `${name}: credit links to the photo page`)
      assert.ok(credits[name]?.licence && credits[name]?.source === p.creditHref, `${name}: licence and source are on record in credits.json`)
      assert.ok(p.caption && /^Illustrative photo/.test(p.caption), `${name}: caption says it is an illustrative photo`)
      for (const ext of ['webp', 'avif']) assert.ok(statSync(`public${p.src}.${ext}`).size < 200 * 1024, `${name}.${ext} is under 200 KB`)
    }
  })

  test(`${slug}: has a hero image, search-result text inside the limits, a source note with links, a FAQ and a call to action`, () => {
    const hero = heroFor(slug)
    assert.ok(hero, 'hero alt text is registered')
    for (const f of [hero.avif, hero.webp]) assert.ok(existsSync(`public${f}`), `${f} exists`)
    const seo = BLOG_SEO[slug]
    assert.ok(seo, 'page-meta entry')
    assert.ok(seo.title.length <= TITLE_MAX, `title is ${seo.title.length} characters`)
    assert.ok(seo.description.length >= DESCRIPTION_MIN && seo.description.length <= DESCRIPTION_MAX, `description is ${seo.description.length} characters`)
    const types = new Set(post!.content.map(b => b.type))
    for (const t of ['takeaways', 'source', 'links', 'faq', 'cta'] as const) assert.ok(types.has(t), `has a ${t} block`)
    const source = post!.content.find((b): b is Extract<PostBlock, { type: 'source' }> => b.type === 'source')!
    assert.ok(source.links.length >= 4 && source.links.every(l => /^https:\/\//.test(l.href)), 'source note has at least four https links')
    assert.match(source.text, /31 Oct 2026/, 'the source note carries the day the sources were checked')
  })

  test(`${slug}: every related-guide link points to a post that exists`, () => {
    const links = post!.content.find((b): b is Extract<PostBlock, { type: 'links' }> => b.type === 'links')!
    assert.ok(links.items.length >= 4)
    for (const i of links.items) {
      assert.match(i.href, /^\/blog\/[a-z0-9-]+$/)
      assert.ok(getPost(i.href.replace('/blog/', '')), `${i.href} exists`)
    }
  })
}

test('the contract article is not legal advice, says what Tutafy does not store, and marks its numbers as examples', () => {
  const t = textOf(getPost('tutoring-contract-template')!.content)
  assert.match(t, /Not legal advice/)
  assert.match(t, /not legal advice/i)
  assert.match(t, /No\. Only the time is saved/, 'says Tutafy keeps no copy of the contract text with the lesson')
  assert.match(t, /No: one name field/, 'says Tutafy has no parent signature')
  assert.match(t, /examples of ours/, 'says the hours and percentages are our examples')
  assert.match(t, /solely because it is in electronic form/, 'quotes the E-SIGN rule')
  assert.match(t, /per a search summary/i, 'marks the UK regulation text as not read directly')
})

test('the contract article does not say Tutafy charges late fees; it says the opposite', () => {
  const t = textOf(getPost('tutoring-contract-template')!.content)
  assert.doesNotMatch(t, /Tutafy (applies|charges|collects) (a )?(late|cancellation) fees? (automatically|for you)/i)
  assert.match(t, /A late-cancellation or no-show fee charged for you/)
})

test('the names article says every example is invented and unchecked, buys nothing, and names what Tutafy lacks', () => {
  const t = textOf(getPost('tutoring-business-names')!.content)
  assert.match(t, /invented/)
  assert.match(t, /unchecked|not been searched|have not searched/)
  assert.match(t, /Not legal advice/)
  assert.match(t, /A name or trademark checker/)
  assert.match(t, /does not sell domains/)
  assert.match(t, /every check is a lookup|All five are lookups/)
})
