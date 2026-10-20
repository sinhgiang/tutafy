// Which pages the journey records, and how a path is shortened first. Only a
// fixed list of public pages and of the tutor's own sections is kept; every
// other path (student portal, booking pages, admin, API, ids, tokens) gives
// null and is never sent or stored. Query strings and fragments are dropped.
// No imports, so the node tests can load it.

export const PUBLIC_PAGES = ['/', '/about', '/contact', '/privacy', '/terms', '/customers', '/tutors', '/login', '/register', '/onboarding'] as const

// First path segment of the signed-in tutor area; the rest of the path (ids) is cut off.
export const APP_SECTIONS = [
  'dashboard', 'students', 'lessons', 'calendar', 'messages', 'reports', 'team', 'payments',
  'packages', 'coupons', 'subscriptions', 'waitlist', 'availability', 'ai', 'import',
  'referral', 'developers', 'settings', 'upgrade',
] as const

const BLOG_SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/

export function normalizeTrackedPath(input: string | null | undefined): string | null {
  if (typeof input !== 'string' || input.length === 0 || input.length > 300) return null
  if (!input.startsWith('/') || input.startsWith('//')) return null
  const pathname = input.split(/[?#]/)[0]
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (/[^A-Za-z0-9\-._~/]/.test(clean)) return null

  if ((PUBLIC_PAGES as readonly string[]).includes(clean)) return clean

  const parts = clean.split('/').filter(Boolean)
  if (parts[0] === 'blog') {
    if (parts.length === 1) return '/blog'
    return parts.length === 2 && BLOG_SLUG.test(parts[1]) ? `/blog/${parts[1]}` : null
  }
  if (parts[0] === 'tutors') return '/tutors'
  if ((APP_SECTIONS as readonly string[]).includes(parts[0])) return `/${parts[0]}`
  return null
}

/** The signed-in areas: where the page asks the server to link this visitor to the tutor account. */
export function isAppPath(path: string | null): boolean {
  if (!path) return false
  return path === '/onboarding' || (APP_SECTIONS as readonly string[]).includes(path.slice(1))
}
