// T-1166: the owner's rule for the traffic articles (W-3755): each is 3,500 to 4,000 words, counted by scripts/count-post-words.mjs.
// "body" is everything a reader reads except photo captions; "total" adds the captions and credit lines. Both must fall inside the range
// (body at least 3,500, body plus captions at most 4,000), so the article is long enough and no counting method puts it over.
import test from 'node:test'
import assert from 'node:assert/strict'
import { getPost } from '@/lib/blog'
import { count } from '../scripts/count-post-words.mjs'

const TRAFFIC_ARTICLES = ['how-to-write-a-tutor-bio', 'free-tutoring-invoice-template', 'online-whiteboard-for-tutoring', 'do-tutors-have-to-pay-taxes', 'online-tutoring-jobs', 'tutor-resume', 'ielts-speaking-part-2-topics']
TRAFFIC_ARTICLES.push('wyzant-fees-for-tutors', 'how-to-find-an-online-tutor') // T-1214, T-1215 (9 Nov 2026)
TRAFFIC_ARTICLES.push('reading-tutor-for-your-child', 'sat-and-act-tutor-online') // T-1242, T-1243 (16 Nov 2026)

for (const slug of TRAFFIC_ARTICLES) {
  test(`${slug}: 3,500 to 4,000 words`, () => {
    const post = getPost(slug)
    assert.ok(post, `${slug} is registered in src/lib/blog.ts`)
    const { body, total } = count(post)
    assert.ok(body >= 3500, `${body} words in the body, 3,500 needed`)
    assert.ok(total <= 4000, `${total} words with photo captions, 4,000 at most`)
  })
}

test('the counter counts what a reader sees and ignores what they do not', () => {
  const post = {
    content: [
      { type: 'p', text: 'one two three' },
      { type: 'image', src: '/x', alt: 'alt text that is never counted', caption: 'four five', credit: 'six' },
      { type: 'cta', title: 'seven', text: 'eight nine', button: 'button label never counted', href: '/r' },
      { type: 'faq', items: [{ q: 'ten eleven', a: 'twelve' }] },
    ],
  }
  assert.deepEqual(count(post), { body: 9, total: 12 })
})
