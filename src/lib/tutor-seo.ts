// What search engines and AI assistants are told about a public tutor profile
// (/tutors/<slug>): its own title and description, and its structured data (a
// ProfilePage whose main entity is a Person). Built only from fields the public page
// already shows and the public database policy already lets anyone read (name, bio,
// photo, languages), never from an email or a phone number: those are not read here,
// and the free text is cleaned of anything that looks like one.
// Plain .ts with no browser or React imports, so the node tests can run it.
import { absoluteUrl, SITE_URL } from '@/lib/site-url'

/** Search results cut a title after about 60 characters and a description after about 155 (the same limits as src/lib/page-meta.ts, which a test compares). */
export const TUTOR_TITLE_MAX = 60
export const TUTOR_DESCRIPTION_MAX = 155

/** The fields of a tutor row this file looks at. Nothing else of the row is ever read. */
export interface TutorSeoInput {
  slug: string
  name: string | null
  bio?: string | null
  avatar_url?: string | null
  languages?: string[] | null
  /** Set by the tutor in Settings. Only a tutor who turned the public page on is indexed. */
  booking_url_active?: boolean | null
  /** The tutor's PUBLIC reviews (is_public), newest first. Only these ever become Review markup, and only when there are some. */
  reviews?: { rating: unknown; comment?: string | null; created_at?: string | null }[] | null
}

// Slugs Tutafy makes are lower-case letters, digits and hyphens; anything else is not put in a sitemap or a link.
const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/
export function isPublicSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && SLUG.test(slug)
}

const EMAIL = /[^\s@<>()[\]"',;:]+@[^\s@<>()[\]"',;]+\.[^\s@<>()[\]"',;]+/g
const PHONE = /(?:\+?\d[\d\s().-]{5,}\d)/g
// control characters and the two Unicode line separators, built from code points so this file holds none of them
const CONTROL = new RegExp(`[${String.fromCharCode(0)}-${String.fromCharCode(0x1f)}${String.fromCharCode(0x7f)}${String.fromCharCode(0x2028)}${String.fromCharCode(0x2029)}]`, 'g')

/** Free text of a tutor made safe for a page title, a description or markup: no control characters, no email address, no phone-like number, one line. */
export function cleanText(input: string | null | undefined, max: number): string {
  if (typeof input !== 'string') return ''
  const text = input.replace(CONTROL, ' ').replace(EMAIL, ' ').replace(PHONE, ' ').replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ') > max * 0.6 ? cut.lastIndexOf(' ') : cut.length).trimEnd()}…`
}

function cleanLanguages(languages: string[] | null | undefined): string[] {
  const out: string[] = []
  for (const raw of Array.isArray(languages) ? languages : []) {
    const l = cleanText(raw, 30)
    if (l && !out.some(o => o.toLowerCase() === l.toLowerCase())) out.push(l)
    if (out.length === 3) break
  }
  return out
}

function joinLanguages(langs: string[]): string {
  if (langs.length <= 1) return langs[0] ?? ''
  return `${langs.slice(0, -1).join(', ')} & ${langs[langs.length - 1]}`
}

export interface TutorSeoText {
  title: string
  description: string
}

/** The title and description of a profile, from the tutor's name and languages. */
export function tutorSeoText(t: Pick<TutorSeoInput, 'name' | 'languages'>): TutorSeoText {
  const name = cleanText(t.name, 60) || 'Tutafy tutor'
  const langs = cleanLanguages(t.languages)

  const titles = [
    langs.length > 1 ? `${name}: ${joinLanguages(langs)} Tutor | Tutafy` : '',
    langs.length > 0 ? `${name}: ${langs[0]} Tutor | Tutafy` : '',
    `${name}: Online Tutor | Tutafy`,
  ].filter(Boolean)
  let title = titles.find(x => x.length <= TUTOR_TITLE_MAX)
  if (!title) {
    const suffix = ': Online Tutor | Tutafy'
    title = `${name.slice(0, TUTOR_TITLE_MAX - suffix.length - 1).trimEnd()}…${suffix}`
  }

  const lessons = langs.length ? `online ${joinLanguages(langs)} lessons` : 'online lessons'
  const tail = ' See availability and book a time that suits you, no account needed.'
  let description = `Book 1-on-1 ${lessons} with ${name} on Tutafy.${tail}`
  if (description.length > TUTOR_DESCRIPTION_MAX) description = `Book 1-on-1 ${lessons} with ${name} on Tutafy.${tail.replace(', no account needed', '')}`
  if (description.length > TUTOR_DESCRIPTION_MAX) {
    const short = name.slice(0, 30).trimEnd()
    description = `Book 1-on-1 online lessons with ${short}… on Tutafy.${tail}`
  }
  return { title, description }
}

/** The address of a profile on the main site. */
export function tutorProfileUrl(slug: string): string {
  return absoluteUrl(`/tutors/${slug}`)
}

/** A photo address safe to put in a page: https only, no user or password in it, not absurdly long. Anything else is undefined. */
export function httpsImage(url: string | null | undefined): string | undefined {
  if (typeof url !== 'string' || url.length > 500) return undefined
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && !u.username && !u.password ? u.href : undefined
  } catch { return undefined }
}

type JsonLd = Record<string, unknown>

/** Review markup for the tutor's real public reviews: a whole rating of 1 to 5 each, at most 10, cleaned text, no student name (the page shows none). */
function reviewMarkup(reviews: TutorSeoInput['reviews']): JsonLd[] {
  const out: JsonLd[] = []
  for (const r of Array.isArray(reviews) ? reviews : []) {
    const rating = r.rating
    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) continue
    const body = cleanText(r.comment, 500)
    const when = typeof r.created_at === 'string' && Number.isFinite(Date.parse(r.created_at)) ? new Date(r.created_at).toISOString().slice(0, 10) : ''
    out.push({
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: rating, bestRating: 5, worstRating: 1 },
      author: { '@type': 'Person', name: 'Tutafy student' },
      ...(when ? { datePublished: when } : {}),
      ...(body ? { reviewBody: body } : {}),
    })
    if (out.length === 10) break
  }
  return out
}

/**
 * ProfilePage + Person + BreadcrumbList for a profile. The Person has a name, an address, the languages
 * the tutor teaches, the photo and the cleaned bio; no email, no telephone, and no aggregate rating (a rating
 * the business shows about itself is not valid markup for a person). Only when the tutor has real public
 * reviews does the Person carry them, as Review items (T-0765); with none there is no review key at all.
 */
export function tutorJsonLd(t: TutorSeoInput): JsonLd[] {
  const url = tutorProfileUrl(t.slug)
  const name = cleanText(t.name, 80) || 'Tutafy tutor'
  const langs = cleanLanguages(t.languages)
  const bio = cleanText(t.bio, 300)
  const image = httpsImage(t.avatar_url)
  const reviews = reviewMarkup(t.reviews)
  const person: JsonLd = {
    '@type': 'Person',
    '@id': `${url}#person`,
    name,
    url,
    jobTitle: 'Online tutor',
    ...(langs.length ? { knowsLanguage: langs } : {}),
    ...(bio ? { description: bio } : {}),
    ...(image ? { image } : {}),
    ...(reviews.length ? { review: reviews } : {}),
  }
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      '@id': `${url}#profile`,
      url,
      name: `${name} on Tutafy`,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      mainEntity: person,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Tutors', item: `${SITE_URL}/tutors` },
        { '@type': 'ListItem', position: 3, name, item: url },
      ],
    },
  ]
}
