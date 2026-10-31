// T-1155: every real photo in the four pain-point articles has a credit with a source link, a licence on record, alt text,
// both image files, and each file is under 200 KB (the owner's rule for article photos).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { REAL_HOURLY_RATE_CONTENT } from '@/lib/blog-posts/real-hourly-rate-for-tutors'
import { RESCHEDULE_REQUESTS_CONTENT } from '@/lib/blog-posts/how-to-handle-tutoring-reschedule-requests'
import { ASK_FOR_PAYMENT_CONTENT } from '@/lib/blog-posts/how-to-ask-for-tutoring-payment'
import { TECH_STACK_CONTENT } from '@/lib/blog-posts/tutoring-tech-stack-for-online-tutors'
import type { PostBlock } from '@/lib/blog'

type Photo = Extract<PostBlock, { type: 'image' }>
const credits: Record<string, { licence?: string; source?: string; checked?: string }> =
  JSON.parse(readFileSync('public/blog/inline/credits.json', 'utf8'))
const ARTICLES: Record<string, PostBlock[]> = {
  'real-hourly-rate-for-tutors': REAL_HOURLY_RATE_CONTENT,
  'how-to-handle-tutoring-reschedule-requests': RESCHEDULE_REQUESTS_CONTENT,
  'how-to-ask-for-tutoring-payment': ASK_FOR_PAYMENT_CONTENT,
  'tutoring-tech-stack-for-online-tutors': TECH_STACK_CONTENT,
}

for (const [slug, blocks] of Object.entries(ARTICLES)) {
  const photos = blocks.filter((b): b is Photo => b.type === 'image' && b.src.includes('/pain-'))
  test(`${slug}: 2 to 3 real photos, each credited with a source link and a recorded licence`, () => {
    assert.ok(photos.length >= 2 && photos.length <= 3, `${photos.length} photos`)
    for (const p of photos) {
      const name = p.src.split('/').pop()!
      assert.ok(p.alt.length > 20, `${name}: alt text`)
      assert.match(p.credit ?? '', /^Photo: .+\((CC0|CC BY[^)]*|public domain)\)/, `${name}: credit names the author and the licence`)
      assert.match(p.creditHref ?? '', /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/, `${name}: credit links to the photo page`)
      assert.ok(credits[name]?.licence && credits[name]?.source === p.creditHref,`${name}: licence and source are on record in credits.json`)
      for (const ext of ['webp', 'avif']) assert.ok(statSync(`public${p.src}.${ext}`).size < 200 * 1024, `${name}.${ext} is under 200 KB`)
    }
  })
}
