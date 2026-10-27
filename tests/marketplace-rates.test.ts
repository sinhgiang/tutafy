// T-0962: what the site says Preply and iTalki take from a tutor must be one set of numbers, with the day it was checked and the official
// links. The words live in src/lib/marketplace-rates.ts. These tests run the real home page and the real blog page, read every post and
// every source file, and fail when a page goes back to an iTalki "flat 15%", to a "20–33%" range, or states a platform's own rate
// without the "Rates checked" note.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import type React from 'react'

import { POSTS, getFaq, type Post, type PostBlock } from '@/lib/blog'
import { blogPostJsonLd } from '@/lib/blog-seo'
import {
  HOME_MARKETPLACE_SENTENCE, ITALKI_RANGE, ITALKI_RATES_URL, MARKETPLACE_RANGE, PREPLY_RANGE, PREPLY_RATES_URL, RATES_CHECKED, RATES_SOURCE,
} from '@/lib/marketplace-rates'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const Home = (await import('@/app/page.tsx')).default as (p: { searchParams: Promise<Record<string, string>> }) => Promise<React.ReactElement>
const BlogPost = (await import('@/app/blog/[slug]/page.tsx')).default as (p: { params: Promise<{ slug: string }> }) => Promise<React.ReactElement>

/** The four posts the owner named, plus the two other posts that state a platform's own rate. */
const NAMED = ['preply-alternatives-for-tutors', 'how-much-does-preply-take', 'marketplace-vs-independent-the-real-math', 'tutafy-vs-alternatives']
const OTHER = ['how-to-teach-english-online', 'how-to-write-a-tutoring-business-plan']

/** A line that ties "flat" or a plain 15% to iTalki's commission. */
const IT_FLAT = /i[tT]alki[^.]{0,90}(flat|~\s?15\s?%|around 15\s?%|roughly 15\s?%)/
const post = (slug: string): Post => POSTS.find(p => p.slug === slug)!
const textOf = (b: PostBlock): string => JSON.stringify(b)
const postText = (p: Post) => p.content.map(textOf).join('\n')

test('the numbers: one set, written once', () => {
  assert.equal(RATES_CHECKED, '25 Oct 2026')
  assert.equal(PREPLY_RANGE, '18–33%')
  assert.equal(ITALKI_RANGE, '15–21%')
  assert.equal(MARKETPLACE_RANGE, '15–33%')
  assert.match(PREPLY_RATES_URL, /^https:\/\/help\.preply\.com\/en\/articles\/4171383/)
  assert.match(ITALKI_RATES_URL, /^https:\/\/support\.italki\.com\/hc\/en-us\/articles\/206352068/)
  assert.deepEqual(RATES_SOURCE.links.map(l => l.href), [PREPLY_RATES_URL, ITALKI_RATES_URL])
  assert.ok(RATES_SOURCE.text.includes(RATES_CHECKED))
})

test('the home page says it: both platforms take 15–33%, Preply alone keeps the first trial, the table says 15–33%, and the note has the date and both links', async () => {
  const html = renderToStaticMarkup(await Home({ searchParams: Promise.resolve({}) }))
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ')
  assert.ok(text.includes('Marketplaces like Preply and iTalki take 15–33% of every lesson'), 'the pain sentence')
  assert.ok(text.includes('Preply also keeps 100% of your first trial lesson (iTalki takes 0% of trials)'))
  assert.ok(text.includes(HOME_MARKETPLACE_SENTENCE))
  // the comparison table, Marketplaces column, row "Commission on your income"
  assert.match(html, /Commission on your income<\/span>[\s\S]{0,300}>0%<\/span>[\s\S]{0,200}>15–33%<\/span>/)
  assert.ok(!/20[–-]33/.test(text), 'no 20–33% on the home page')
  assert.ok(!/skim/i.test(text), 'the old "skim" sentence is gone')
  assert.ok((html.match(/data-testid="rates-note"/g) ?? []).length >= 2, 'a note under the sentences and under the table')
  assert.ok(html.includes(`Rates checked ${RATES_CHECKED}.`))
  assert.ok(html.includes(`href="${PREPLY_RATES_URL}"`) && html.includes(`href="${ITALKI_RATES_URL}"`))
  assert.ok(/<a [^>]*href="https:\/\/help\.preply\.com[^"]*"[^>]*rel="noopener noreferrer"/.test(html) || /rel="noopener noreferrer"[^>]*href="https:\/\/help\.preply\.com/.test(html), 'official links open safely')
})

test('no page says iTalki is a flat ~15% or that marketplaces take 20–33%', () => {
  const files = execFileSync('git', ['ls-files', '-z', 'src', 'content-playbook.md'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean)
    .filter(f => /\.(tsx?|md|txt)$/.test(f) && f !== 'src/lib/marketplace-rates.ts')
  const found: string[] = []
  for (const f of files) {
    const lines = readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/)
    lines.forEach((line, i) => {
      if (/20\s?[–-]\s?33\s?%/.test(line)) found.push(`${f}:${i + 1} says 20–33%`)
      if (IT_FLAT.test(line)) found.push(`${f}:${i + 1} gives iTalki a flat 15%`)
    })
  }
  assert.deepEqual(found, [])
})

test('in every post that compares platforms, the iTalki column never says a flat 15% and the trial row says 0% for iTalki', () => {
  for (const p of POSTS) {
    for (const b of p.content) {
      if (b.type !== 'compare') continue
      const col = b.headers.findIndex(h => /i[tT]alki/.test(h))
      if (col < 0) continue
      for (const row of b.rows) {
        const cell = String(row[col])
        assert.ok(!/^~?\s?15\s?%( flat)?$/.test(cell), `${p.slug}: iTalki cell "${cell}"`)
        assert.ok(!/reduced/i.test(cell), `${p.slug}: iTalki trial cell "${cell}"`)
        if (/commission/i.test(String(row[0]))) assert.ok(cell.startsWith(ITALKI_RANGE), `${p.slug}: iTalki commission cell "${cell}"`)
        // a yes/no row ("Keeps your trial": the platform keeps it, false for iTalki) is a boolean; a text row says what iTalki takes
        if (/trial lesson/i.test(String(row[0])) && typeof row[col] === 'string') assert.match(cell, /^0%/, `${p.slug}: iTalki trial cell "${cell}"`)
      }
    }
  }
  // the table of the platforms in "how much does Preply take": Platform | Commission model | Trial lesson | ...
  const t = post('how-much-does-preply-take').content.find(b => b.type === 'compare' && b.headers[0] === 'Platform') as Extract<PostBlock, { type: 'compare' }>
  const it = t.rows.find(r => r[0] === 'iTalki')!
  assert.deepEqual(it.slice(1, 3), [`${ITALKI_RANGE} by lesson type`, '0% commission'])
  assert.deepEqual(t.rows.find(r => r[0] === 'Preply')!.slice(1, 3), ['~18–33% sliding', 'Keeps 100%'])
})

test('every post that states a platform\'s own rate has the "Rates checked" note with both official links (the six that were found)', () => {
  const stating = POSTS.filter(p => /15–21%|18–33%/.test(postText(p)))
  for (const slug of [...NAMED, ...OTHER]) assert.ok(stating.some(p => p.slug === slug), `${slug} states a platform rate`)
  for (const p of stating) {
    const notes = p.content.filter((b): b is Extract<PostBlock, { type: 'source' }> => b.type === 'source')
    assert.ok(notes.length >= 1, `${p.slug} has no rates note`)
    for (const n of notes) {
      assert.ok(n.text.includes(`Rates checked ${RATES_CHECKED}`), p.slug)
      assert.deepEqual(n.links.map(l => l.href), [PREPLY_RATES_URL, ITALKI_RATES_URL], p.slug)
    }
    assert.equal(p.updated, '2026-10-25', `${p.slug}: a post whose numbers changed carries the day it was changed`)
  }
})

test('the posts say the same thing about each platform: Preply 18–33% and the first trial 100%; iTalki 15–21% by lesson type and 0% on trials', () => {
  for (const slug of [...NAMED, ...OTHER]) {
    const t = postText(post(slug))
    assert.match(t, /15–21%/, `${slug} names iTalki's range`)
  }
  for (const slug of NAMED) {
    const p = post(slug)
    const t = postText(p)
    assert.ok(/0% (on|of) trial|0% commission|takes 0% of trial/i.test(t), `${slug} says iTalki takes nothing on trials`)
    if (slug !== 'tutafy-vs-alternatives') assert.ok(/18[–-]33%/.test(t), `${slug} keeps Preply's 18–33%`)
  }
  // no post claims Preply keeps the trial of "every" lesson, or that iTalki keeps the trial
  for (const p of POSTS) assert.ok(!/100% of every trial lesson/.test(postText(p)), `${p.slug}: Preply keeps the FIRST trial lesson with each new student`)
})

test('the FAQ markup of the four posts is the visible FAQ, and it carries the new iTalki numbers', () => {
  for (const slug of NAMED) {
    const p = post(slug)
    const faq = getFaq(p)
    const ld = blogPostJsonLd(p).find(d => d['@type'] === 'FAQPage') as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] } | undefined
    assert.ok(ld, `${slug} has FAQ markup`)
    assert.deepEqual(ld!.mainEntity.map(e => [e.name, e.acceptedAnswer.text]), faq.map(f => [f.q, f.a]), `${slug}: markup = page`)
    const italkiAnswers = faq.filter(f => /i[tT]alki/.test(f.q + f.a) && /%/.test(f.a))
    for (const f of italkiAnswers) {
      assert.ok(!/flat/i.test(f.a.replace(/flat (tool|monthly)/gi, '')) || !/i[tT]alki[^.]{0,80}flat/i.test(f.a), `${slug}: "${f.q}" calls iTalki flat`)
      if (/i[tT]alki (takes|charges|uses)/.test(f.a) || /iTalki is a marketplace that finds/.test(f.a)) assert.ok(/15–21%/.test(f.a) && f.a.includes('rates checked 25 Oct 2026'), `${slug}: "${f.q}" has the range and the date`)
    }
  }
})

test('a blog post page prints the note with both links, and a post without a platform rate has none', async () => {
  const html = renderToStaticMarkup(await BlogPost({ params: Promise.resolve({ slug: 'how-much-does-preply-take' }) }))
  assert.ok(html.includes('data-testid="rates-note"'))
  assert.ok(html.includes(`Rates checked ${RATES_CHECKED}.`))
  assert.ok(html.includes(`href="${PREPLY_RATES_URL}"`) && html.includes(`href="${ITALKI_RATES_URL}"`))
  const other = renderToStaticMarkup(await BlogPost({ params: Promise.resolve({ slug: 'how-to-take-card-payments-with-a-stripe-payment-link' }) }))
  assert.ok(!other.includes('data-testid="rates-note"'))
})

test('self-check: the scan catches the old wording', () => {
  const bad = ['iTalki charges a flatter ~15%.', 'iTalki (~15% flat), Wyzant', "iTalki's roughly 15% flat cut", 'taking 20–33% off']
  const hit = (line: string) => /20\s?[–-]\s?33\s?%/.test(line) || /i[tT]alki[^.]{0,90}(flat(ter)? (commission|fee|rate|~)|flat|~\s?15\s?%|around 15\s?%|roughly 15\s?%)/.test(line)
  for (const b of bad) assert.ok(hit(b), b)
  const fine = ['iTalki charges 15–21% depending on the lesson type, and 0% on trial lessons.', 'a flat tool like Tutafy costs the same, while iTalki takes a cut', 'Marketplaces take 15–33% of every lesson.']
  for (const f of fine) assert.ok(!hit(f), f)
})
