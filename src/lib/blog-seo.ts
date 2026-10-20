// Structured data (JSON-LD) of a blog post: BlogPosting with its author and the real
// dates (published and last updated), the breadcrumb and, when the post has one, the FAQ.
// Built here, not in the page file, so a test can read it. The same dates are shown on the
// page (src/app/blog/[slug]/page.tsx) and listed in the sitemap (src/app/sitemap.ts).
import { getFaq, postDates, type Post } from '@/lib/blog'
import { SITE_URL as SITE } from '@/lib/site-url'

type JsonLd = Record<string, unknown>

export function blogPostJsonLd(post: Post): JsonLd[] {
  const { published, modified } = postDates(post)
  const faq = getFaq(post)
  const data: JsonLd[] = [
    {
      '@context': 'https://schema.org', '@type': 'BlogPosting',
      headline: post.title, description: post.description,
      datePublished: published, dateModified: modified,
      author: { '@type': 'Person', name: post.author, url: `${SITE}/about` },
      publisher: { '@type': 'Organization', name: 'Tutafy' },
      mainEntityOfPage: `${SITE}/blog/${post.slug}`,
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE}/blog/${post.slug}` },
      ],
    },
  ]
  if (faq.length > 0) {
    data.push({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    })
  }
  return data
}

/** "July 7, 2026" from a YYYY-MM-DD post date (the same wording the page already used). */
export function formatPostDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
