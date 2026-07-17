import type { MetadataRoute } from 'next'
import { POSTS } from '@/lib/blog'

const SITE = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.com').replace(/[﻿​\s]/g, '').replace(/\/+$/, '') || 'https://tutafy.com'

// Only public, indexable pages belong in the sitemap.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const pages: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '', priority: 1.0, freq: 'weekly' },
    { path: '/tutors', priority: 0.8, freq: 'daily' },
    { path: '/blog', priority: 0.7, freq: 'weekly' },
    { path: '/about', priority: 0.6, freq: 'monthly' },
    { path: '/customers', priority: 0.6, freq: 'monthly' },
    { path: '/contact', priority: 0.5, freq: 'monthly' },
    { path: '/privacy', priority: 0.3, freq: 'yearly' },
    { path: '/terms', priority: 0.3, freq: 'yearly' },
    { path: '/register', priority: 0.7, freq: 'monthly' },
    { path: '/login', priority: 0.5, freq: 'monthly' },
    { path: '/student/login', priority: 0.5, freq: 'monthly' },
  ]
  const staticUrls = pages.map(p => ({ url: `${SITE}${p.path}`, lastModified: now, changeFrequency: p.freq, priority: p.priority }))
  const postUrls = POSTS.map(p => ({ url: `${SITE}/blog/${p.slug}`, lastModified: new Date(p.date + 'T00:00:00'), changeFrequency: 'monthly' as const, priority: 0.6 }))
  return [...staticUrls, ...postUrls]
}
