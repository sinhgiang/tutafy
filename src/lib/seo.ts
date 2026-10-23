// Structured data (JSON-LD) for the landing page. Built from the same constants
// the page renders (src/lib/site-content.ts), so the markup never says anything
// the visible page does not.
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, PLANS, FAQ } from '@/lib/site-content'
import { absoluteUrl } from '@/lib/site-url'

export type JsonLd = Record<string, unknown>

/**
 * Serialise for an inline <script type="application/ld+json">. Escaping "<" keeps
 * a "</script>" inside a text value from closing the tag early.
 */
export function jsonLdScript(data: JsonLd): string {
  const escape = (text: string, char: string, code: string) => text.split(char).join(String.fromCharCode(92) + code)
  let json = JSON.stringify(data)
  json = escape(json, '<', 'u003c')
  json = escape(json, String.fromCharCode(0x2028), 'u2028')
  json = escape(json, String.fromCharCode(0x2029), 'u2029')
  return json
}

/**
 * Structured data of a public page that is not the home page or a post (T-0843): what kind of page it is, where it sits
 * (a breadcrumb back to the home page) and, for a list page, the items the page really draws. The name and description are
 * the page's own title and description from PAGE_SEO, so the markup says what the page says. It never carries an e-mail
 * address or a phone number.
 */
export function pageJsonLd(
  page: { path: string; title: string; description: string },
  crumb: string,
  type: 'AboutPage' | 'ContactPage' | 'CollectionPage',
  items: { name: string; path: string }[] = [],
): JsonLd[] {
  const url = absoluteUrl(page.path)
  const webPage: JsonLd = {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${url}#webpage`,
    name: page.title,
    description: page.description,
    url,
    inLanguage: 'en',
    isPartOf: { '@id': `${SITE_URL}/#website` },
  }
  if (items.length > 0) {
    webPage.mainEntity = {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, url: absoluteUrl(it.path) })),
    }
  }
  return [
    webPage,
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: crumb, item: url },
      ],
    },
  ]
}

export function homeJsonLd(): JsonLd[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      offers: PLANS.map(p => ({ '@type': 'Offer', name: p.name, price: String(p.monthlyUsd), priceCurrency: 'USD' })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
      description: SITE_DESCRIPTION,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: 'en',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ]
}

/** FAQPage data for a list of questions a page prints in full (T-0850): the same pairs, in the same order, nothing added. */
export function faqPageJsonLd(items: { q: string; a: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
}
