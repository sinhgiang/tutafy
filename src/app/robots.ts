import type { MetadataRoute } from 'next'

const SITE = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.com').replace(/[﻿​\s]/g, '').replace(/\/+$/, '') || 'https://tutafy.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Private / non-indexable areas (auth-gated or per-user data).
      disallow: ['/api/', '/admin', '/portal/', '/settings', '/onboarding'],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
