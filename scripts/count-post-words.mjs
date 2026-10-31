// Counts the words a reader sees in a blog post (T-1166): the owner wants 3,500 to 4,000 words per article.
// Run: node --experimental-test-module-mocks --disable-warning=ExperimentalWarning --import ./tests/register.mjs scripts/count-post-words.mjs <slug> [<slug> ...]
// Two numbers per post:
//   body  = headings, paragraphs, lists, takeaways, callouts, stat cards, table captions, headers and cells, pros and cons, call-to-action text,
//           related-guide lines, source notes, and every FAQ question and answer (the answers are folded on the page but are still text).
//   total = body + the captions and credit lines under photos (alt text and button labels are never counted).
import { getPost } from '../src/lib/blog.ts'

const words = s => String(s ?? '').trim().split(/\s+/).filter(Boolean).length

export function count(post) {
  let body = 0, extra = 0
  for (const b of post.content) {
    switch (b.type) {
      case 'p': case 'h2': case 'h3': body += words(b.text); break
      case 'ul': case 'takeaways': body += b.items.reduce((n, s) => n + words(s), 0); break
      case 'callout': body += words(b.title) + words(b.text); break
      case 'statCards': body += b.cards.reduce((n, c) => n + words(c.value) + words(c.label), 0); break
      case 'compare': body += words(b.caption) + b.headers.reduce((n, s) => n + words(s), 0) +
        b.rows.reduce((n, r) => n + r.reduce((m, c) => m + (typeof c === 'string' ? words(c) : 0), 0), 0); break
      case 'prosCons': body += words(b.title) + [...b.pros, ...b.cons].reduce((n, s) => n + words(s), 0); break
      case 'cta': body += words(b.title) + words(b.text); break
      case 'links': body += words(b.title) + b.items.reduce((n, i) => n + words(i.label) + words(i.text), 0); break
      case 'source': body += words(b.text) + b.links.reduce((n, l) => n + words(l.label), 0); break
      case 'faq': body += b.items.reduce((n, i) => n + words(i.q) + words(i.a), 0); break
      case 'image': extra += words(b.caption) + words(b.credit); break
      default: break
    }
  }
  return { body, total: body + extra }
}

if (process.argv[1]?.endsWith('count-post-words.mjs')) main()

// With --sections, also print the words of each part of the post (the text before the first heading, then one line for every h2), to see where to cut.
function main() {
const sections = process.argv.includes('--sections')
for (const slug of process.argv.slice(2).filter(a => !a.startsWith('--'))) {
  const post = getPost(slug)
  if (!post) { console.log(`${slug}: no such post`); continue }
  if (sections) {
    let title = '(start)', from = 0
    const flush = end => { const n = count({ content: post.content.slice(from, end) }).body; console.log(`  ${String(n).padStart(5)}  ${title}`) }
    post.content.forEach((b, i) => { if (b.type === 'h2') { flush(i); title = b.text; from = i } })
    flush(post.content.length)
  }
  const { body, total } = count(post)
  const ok = body >= 3500 && total <= 4000
  console.log(`${slug}: body ${body} words, with photo captions ${total} words ${ok ? '(inside 3,500 to 4,000)' : '(OUTSIDE 3,500 to 4,000)'}`)
}
}
