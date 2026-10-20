import type { MetadataRoute } from 'next'
import { SITE_URL as SITE } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Private / non-indexable areas (auth-gated or per-user data).
      // /login, /register and /student/login are NOT listed: they say noindex in the
      // page itself, and a crawler blocked here could never read that tag.
      disallow: ['/api/', '/admin', '/portal/', '/settings', '/onboarding'],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
