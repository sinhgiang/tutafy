// T-1155 and T-1166: every real photo in the pain-point articles and the later traffic articles has a credit with a source link, a licence on record, alt text,
// both image files, and each file is under 200 KB (the owner's rule for article photos).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { REAL_HOURLY_RATE_CONTENT } from '@/lib/blog-posts/real-hourly-rate-for-tutors'
import { RESCHEDULE_REQUESTS_CONTENT } from '@/lib/blog-posts/how-to-handle-tutoring-reschedule-requests'
import { ASK_FOR_PAYMENT_CONTENT } from '@/lib/blog-posts/how-to-ask-for-tutoring-payment'
import { TECH_STACK_CONTENT } from '@/lib/blog-posts/tutoring-tech-stack-for-online-tutors'
import { TUTOR_BIO_CONTENT } from '@/lib/blog-posts/how-to-write-a-tutor-bio'
import { INVOICE_TEMPLATE_CONTENT } from '@/lib/blog-posts/free-tutoring-invoice-template'
import { WHITEBOARD_CONTENT } from '@/lib/blog-posts/online-whiteboard-for-tutoring'
import { TUTOR_TAXES_CONTENT } from '@/lib/blog-posts/do-tutors-have-to-pay-taxes'
import { ONLINE_TUTORING_JOBS_CONTENT } from '@/lib/blog-posts/online-tutoring-jobs'
import { TUTOR_RESUME_CONTENT } from '@/lib/blog-posts/tutor-resume'
import { IELTS_PART2_CONTENT } from '@/lib/blog-posts/ielts-speaking-part-2-topics'
import { WYZANT_FEES_CONTENT } from '@/lib/blog-posts/wyzant-fees-for-tutors'
import { FIND_ONLINE_TUTOR_CONTENT } from '@/lib/blog-posts/how-to-find-an-online-tutor'
import { READING_TUTOR_CONTENT } from '@/lib/blog-posts/reading-tutor-for-your-child'
import { SAT_ACT_TUTOR_CONTENT } from '@/lib/blog-posts/sat-and-act-tutor-online'
import type { PostBlock } from '@/lib/blog'

type Photo = Extract<PostBlock, { type: 'image' }>
const credits: Record<string, { licence?: string; source?: string; checked?: string }> =
  JSON.parse(readFileSync('public/blog/inline/credits.json', 'utf8'))
// The four pain-point articles were written under the rule of 2 to 3 photos; articles written after the owner's change of 31 Oct 2026 (W-3755) have 3 to 4.
const ARTICLES: Record<string, { blocks: PostBlock[]; min: number; max: number }> = {
  'real-hourly-rate-for-tutors': { blocks: REAL_HOURLY_RATE_CONTENT, min: 2, max: 3 },
  'how-to-handle-tutoring-reschedule-requests': { blocks: RESCHEDULE_REQUESTS_CONTENT, min: 2, max: 3 },
  'how-to-ask-for-tutoring-payment': { blocks: ASK_FOR_PAYMENT_CONTENT, min: 2, max: 3 },
  'tutoring-tech-stack-for-online-tutors': { blocks: TECH_STACK_CONTENT, min: 2, max: 3 },
  'how-to-write-a-tutor-bio': { blocks: TUTOR_BIO_CONTENT, min: 3, max: 4 },
  'free-tutoring-invoice-template': { blocks: INVOICE_TEMPLATE_CONTENT, min: 3, max: 4 },
  'online-whiteboard-for-tutoring': { blocks: WHITEBOARD_CONTENT, min: 3, max: 4 },
  'do-tutors-have-to-pay-taxes': { blocks: TUTOR_TAXES_CONTENT, min: 3, max: 4 },
  'online-tutoring-jobs': { blocks: ONLINE_TUTORING_JOBS_CONTENT, min: 3, max: 4 },
  'tutor-resume': { blocks: TUTOR_RESUME_CONTENT, min: 3, max: 4 },
  'ielts-speaking-part-2-topics': { blocks: IELTS_PART2_CONTENT, min: 3, max: 4 },
  'wyzant-fees-for-tutors': { blocks: WYZANT_FEES_CONTENT, min: 3, max: 4 },
  'how-to-find-an-online-tutor': { blocks: FIND_ONLINE_TUTOR_CONTENT, min: 3, max: 4 },
  'reading-tutor-for-your-child': { blocks: READING_TUTOR_CONTENT, min: 3, max: 4 },
  'sat-and-act-tutor-online': { blocks: SAT_ACT_TUTOR_CONTENT, min: 3, max: 4 },
}

for (const [slug, { blocks, min, max }] of Object.entries(ARTICLES)) {
  // A photo is an image block with a credit line; the diagrams drawn for the articles have none.
  const photos = blocks.filter((b): b is Photo => b.type === 'image' && !!b.credit)
  test(`${slug}: ${min} to ${max} real photos, each credited with a source link and a recorded licence`, () => {
    assert.ok(photos.length >= min && photos.length <= max, `${photos.length} photos`)
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
