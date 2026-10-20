// Text for /llms.txt and /llms-full.txt (https://llmstxt.org): a plain Markdown
// summary of Tutafy for AI assistants. Prices, features, FAQ and the page list come
// from src/lib/site-content.ts and the blog list from src/lib/blog.ts, the same
// sources the pages use, so nothing here is typed in twice.
import { POSTS } from '@/lib/blog'
import {
  SITE_URL, SITE_NAME, SITE_DESCRIPTION, AUDIENCE, FEATURES, FAQ, PLANS, KEY_PAGES, LEGAL_PAGES,
} from '@/lib/site-content'

function header(): string[] {
  return [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    `Who it is for: ${AUDIENCE}`,
    '',
  ]
}

function pricing(withFeatures: boolean): string[] {
  const lines = ['## Pricing', '', 'Prices are in US dollars per month. Tutafy takes 0% commission on every plan and you can cancel anytime.', '']
  for (const p of PLANS) {
    const price = p.monthlyUsd === 0 ? '$0 (free forever, no card required)' : `${p.price}${p.per}`
    lines.push(`- ${p.name}: ${price}. ${p.tagline}.${withFeatures ? ` Includes: ${p.features.join('; ')}.` : ''}`)
  }
  lines.push('')
  return lines
}

function features(withDescriptions: boolean): string[] {
  const lines = ['## Main features', '']
  for (const f of FEATURES) lines.push(withDescriptions ? `- ${f.title}: ${f.desc}` : `- ${f.title}`)
  lines.push('')
  return lines
}

function pages(): string[] {
  const lines = ['## Key pages', '']
  for (const p of KEY_PAGES) lines.push(`- [${p.title}](${SITE_URL}${p.path === '/' ? '' : p.path}): ${p.description}`)
  lines.push(`- [Sign up](${SITE_URL}/register): Create a free tutor account.`)
  lines.push('')
  return lines
}

function blog(withDetails: boolean): string[] {
  const lines = ['## Blog posts', '']
  for (const post of POSTS) {
    lines.push(withDetails
      ? `- [${post.title}](${SITE_URL}/blog/${post.slug}) (${post.category}, ${post.date}): ${post.description}`
      : `- [${post.title}](${SITE_URL}/blog/${post.slug})`)
  }
  lines.push('')
  return lines
}

function legal(): string[] {
  return ['## Optional', '', ...LEGAL_PAGES.map(p => `- [${p.title}](${SITE_URL}${p.path})`), '']
}

/** Short version: what Tutafy is, for whom, main features, prices and the pages that matter. */
export function buildLlmsTxt(): string {
  return [...header(), ...features(false), ...pricing(false), ...pages(), ...blog(false), ...legal()].join('\n')
}

/** Long version: the same plus plan contents, feature descriptions, the FAQ and each post's summary. */
export function buildLlmsFullTxt(): string {
  const faq = ['## Frequently asked questions', '']
  for (const f of FAQ) faq.push(`### ${f.q}`, '', f.a, '')
  return [...header(), ...features(true), ...pricing(true), ...faq, ...pages(), ...blog(true), ...legal()].join('\n')
}
