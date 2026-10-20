// What the Google tag (GA4 + Google Ads) and the Meta pixel may know about the page a
// visitor is on. By default gtag.js reports the FULL address (document.location), and
// that address can carry a secret: /portal/<student access code> opens a student's
// portal, /students/<id> and /lessons/<id> are private records, and a query string can
// hold a login or payment code. So the tag is never allowed to read the address itself:
// every address that leaves the browser goes through this file first.
//   - the path is shortened to a fixed list of public pages and the first section of the
//     tutor area (src/lib/track-path.ts, the same rule as Tutafy's own journey tracking);
//     any other page that has a changing part is written with a placeholder
//     (/portal/[token], /book/[slug]) and anything unknown is /[other];
//   - the query string and the fragment are dropped, except a few campaign parameters on
//     a public page, so Google Ads and Analytics still know which ad brought the visitor;
//   - pages that open private data (SECRET_PATH_SOURCE) send nothing at all.
// No imports from the browser or React, so the node tests can load it.
import { APP_SECTIONS, normalizeTrackedPath, PUBLIC_PAGES } from '@/lib/track-path'

/**
 * Pages where the address itself is a secret or opens private data. The tag is not loaded
 * there, and a tag that is already loaded is switched off while the visitor is on one.
 * One source for the code and for the small script in the page (google-tag.ts), so the two
 * cannot drift apart. Matches a pathname.
 */
export const SECRET_PATH_SOURCE =
  `^/(?:portal(?:/|$)|(?:${APP_SECTIONS.join('|')})/[^/]|(?:super-admin|admin)(?:/|$)|student/dashboard|upgrade/success|auth/)`

const SECRET_PATH = new RegExp(SECRET_PATH_SOURCE)

export function isSecretPath(pathname: string | null | undefined): boolean {
  if (typeof pathname !== 'string') return false
  return SECRET_PATH.test(pathname.split(/[?#]/)[0])
}

/** Campaign parameters Google needs to credit an ad or a campaign. Opaque ids, never a login or a person. */
export const CAMPAIGN_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid'] as const
const CAMPAIGN_VALUE = /^[A-Za-z0-9._~-]{1,100}$/

const STATIC_PAGES = ['/student/login', '/switch', '/offline']

/** The path Google may see. Never contains a code, an id or a query string; never null. */
export function googlePagePath(input: string | null | undefined): string {
  if (typeof input !== 'string' || !input.startsWith('/') || input.startsWith('//')) return '/[other]'
  const pathname = input.split(/[?#]/)[0]
  const tracked = normalizeTrackedPath(pathname) // public pages, and only the first section of the tutor area (/students/<id> gives /students)
  if (tracked) return tracked
  const parts = pathname.split('/').filter(Boolean)
  if (STATIC_PAGES.includes('/' + parts.join('/'))) return '/' + parts.join('/')
  switch (parts[0]) {
    case 'portal': {
      if (parts[1] === 'parent') return '/portal/parent/[token]'
      if (parts[2] === 'messages') return '/portal/[token]/messages'
      if (parts[2] === 'lessons') {
        const sub = parts[4] === 'quiz' || parts[4] === 'room' ? `/${parts[4]}` : ''
        return `/portal/[token]/lessons/[id]${sub}`
      }
      if (parts[2] === 'certificate') return '/portal/[token]/certificate/[id]'
      return '/portal/[token]'
    }
    case 'book':
      return parts.length >= 3 ? '/book/[slug]/[member]' : parts.length === 2 ? '/book/[slug]' : '/[other]'
    case 'embed':
      return parts.length === 2 ? '/embed/[slug]' : '/[other]'
    case 'admin':
    case 'super-admin':
      return `/${parts[0]}`
    case 'student':
      return '/student/[page]'
    default:
      return '/[other]'
  }
}

/** The campaign parameters of a query string, only on a page that is not secret. */
export function googleCampaignQuery(pathname: string, search: string | null | undefined): string {
  if (isSecretPath(pathname) || typeof search !== 'string' || search.length > 2000) return ''
  let params: URLSearchParams
  try { params = new URLSearchParams(search) } catch { return '' }
  const keep: string[] = []
  for (const key of CAMPAIGN_PARAMS) {
    const value = params.get(key)
    if (value && CAMPAIGN_VALUE.test(value)) keep.push(`${key}=${value}`)
  }
  return keep.length ? `?${keep.join('&')}` : ''
}

/** A page whose title is safe to send as it is: the public pages and the blog. Every other page sends its safe path as the title. */
function titleIsPublic(path: string): boolean {
  return (PUBLIC_PAGES as readonly string[]).includes(path) || path === '/blog' || path.startsWith('/blog/') || path === '/tutors'
}

export type GooglePage = {
  page_location: string
  page_path: string
  page_title: string
  page_referrer: string
}

/**
 * What to tell Google about this page.
 * @param origin   window.location.origin (scheme and host, nothing else)
 * @param pathname window.location.pathname
 * @param search   window.location.search
 */
export function googlePageParams(opts: { origin: string; pathname: string; search?: string; referrer?: string; title?: string }): GooglePage {
  const path = googlePagePath(opts.pathname)
  const query = googleCampaignQuery(opts.pathname, opts.search)
  return {
    page_location: `${opts.origin}${path}${query}`,
    page_path: path,
    page_title: titleIsPublic(path) ? (opts.title ?? '').slice(0, 200) : path,
    page_referrer: googleReferrer(opts.referrer, opts.origin),
  }
}

/** The previous page: one of our own pages is written like any page above; an outside site keeps only its address without query. */
export function googleReferrer(referrer: string | null | undefined, origin: string): string {
  if (!referrer) return ''
  let ref: URL
  try { ref = new URL(referrer) } catch { return '' }
  if (ref.origin === origin) return `${origin}${googlePagePath(ref.pathname)}`
  return `${ref.origin}${ref.pathname}`
}
